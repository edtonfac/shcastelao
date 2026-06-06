
-- 1) Tighten RLS: remove permissive anon access

DROP POLICY IF EXISTS "mesa public read" ON public.mesas;
DROP POLICY IF EXISTS "pedidos public read" ON public.pedidos;
DROP POLICY IF EXISTS "pedidos public insert" ON public.pedidos;
DROP POLICY IF EXISTS "itens public read" ON public.itens_pedido;
DROP POLICY IF EXISTS "itens public insert" ON public.itens_pedido;

-- Staff read access for mesas (admin policy already covers ALL for admin)
CREATE POLICY "mesa staff read" ON public.mesas
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'cozinha') OR public.has_role(auth.uid(), 'garcom'));

CREATE POLICY "pedidos staff read" ON public.pedidos
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'cozinha') OR public.has_role(auth.uid(), 'garcom'));

CREATE POLICY "itens staff read" ON public.itens_pedido
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'cozinha') OR public.has_role(auth.uid(), 'garcom'));

CREATE POLICY "itens staff insert" ON public.itens_pedido
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Revoke anon table grants (RPCs will be the only path)
REVOKE SELECT ON public.mesas FROM anon;
REVOKE SELECT, INSERT ON public.pedidos FROM anon;
REVOKE SELECT, INSERT ON public.itens_pedido FROM anon;

-- 2) Secure RPCs for the customer (anonymous) flow

-- Look up a mesa by its QR token (only safe public fields)
CREATE OR REPLACE FUNCTION public.get_mesa_by_token(p_token text)
RETURNS TABLE (id uuid, numero int, nome text, ativa boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT m.id, m.numero, m.nome, m.ativa
  FROM public.mesas m
  WHERE m.qr_token = p_token AND m.ativa = true
$$;

REVOKE ALL ON FUNCTION public.get_mesa_by_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_mesa_by_token(text) TO anon, authenticated;

-- Create a pedido + itens from a valid mesa token; validates products and prices server-side
CREATE OR REPLACE FUNCTION public.create_pedido_from_token(p_token text, p_items jsonb)
RETURNS TABLE (pedido_id uuid, numero int)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_mesa_id uuid;
  v_pedido_id uuid;
  v_numero int;
  v_total numeric := 0;
  v_item jsonb;
  v_prod record;
  v_qty int;
  v_obs text;
BEGIN
  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Pedido vazio';
  END IF;
  IF jsonb_array_length(p_items) > 100 THEN
    RAISE EXCEPTION 'Pedido muito grande';
  END IF;

  SELECT m.id INTO v_mesa_id FROM public.mesas m
    WHERE m.qr_token = p_token AND m.ativa = true;
  IF v_mesa_id IS NULL THEN
    RAISE EXCEPTION 'Mesa inválida';
  END IF;

  -- Compute total from authoritative product prices
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_qty := COALESCE((v_item->>'quantidade')::int, 0);
    IF v_qty <= 0 OR v_qty > 99 THEN
      RAISE EXCEPTION 'Quantidade inválida';
    END IF;
    SELECT p.id, p.nome, p.preco, p.ativo INTO v_prod
      FROM public.produtos p WHERE p.id = (v_item->>'produto_id')::uuid;
    IF v_prod.id IS NULL OR NOT v_prod.ativo THEN
      RAISE EXCEPTION 'Produto indisponível';
    END IF;
    v_total := v_total + (v_prod.preco * v_qty);
  END LOOP;

  INSERT INTO public.pedidos (mesa_id, total) VALUES (v_mesa_id, v_total)
    RETURNING id, pedidos.numero INTO v_pedido_id, v_numero;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_qty := COALESCE((v_item->>'quantidade')::int, 0);
    v_obs := NULLIF(v_item->>'observacao', '');
    IF v_obs IS NOT NULL AND length(v_obs) > 500 THEN
      v_obs := substring(v_obs, 1, 500);
    END IF;
    SELECT p.id, p.nome, p.preco INTO v_prod
      FROM public.produtos p WHERE p.id = (v_item->>'produto_id')::uuid;
    INSERT INTO public.itens_pedido (pedido_id, produto_id, nome_produto, preco_unitario, quantidade, observacao)
      VALUES (v_pedido_id, v_prod.id, v_prod.nome, v_prod.preco, v_qty, v_obs);
  END LOOP;

  RETURN QUERY SELECT v_pedido_id, v_numero;
END;
$$;

REVOKE ALL ON FUNCTION public.create_pedido_from_token(text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_pedido_from_token(text, jsonb) TO anon, authenticated;

-- Read a single pedido status (id acts as opaque capability)
CREATE OR REPLACE FUNCTION public.get_pedido_status(p_pedido_id uuid)
RETURNS TABLE (id uuid, numero int, status status_pedido, total numeric, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.numero, p.status, p.total, p.created_at
  FROM public.pedidos p WHERE p.id = p_pedido_id
$$;

REVOKE ALL ON FUNCTION public.get_pedido_status(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_pedido_status(uuid) TO anon, authenticated;
