
-- ENUMS
CREATE TYPE public.app_role AS ENUM ('admin', 'cozinha', 'garcom');
CREATE TYPE public.status_pedido AS ENUM ('recebido', 'em_preparo', 'pronto', 'garcom_a_caminho', 'entregue', 'cancelado');

-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles self read" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles self update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- USER ROLES
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_roles self read" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

-- has_role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- handle new user: cria profile + primeiro usuário vira admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_count INT;
BEGIN
  INSERT INTO public.profiles (id, nome)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email,'@',1)));
  SELECT COUNT(*) INTO v_count FROM public.user_roles WHERE role = 'admin';
  IF v_count = 0 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ESTABELECIMENTO (singleton id=1)
CREATE TABLE public.estabelecimento (
  id INT PRIMARY KEY DEFAULT 1,
  nome TEXT NOT NULL DEFAULT 'Shalom Castelão',
  logo_url TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT singleton CHECK (id = 1)
);
INSERT INTO public.estabelecimento (id, nome) VALUES (1, 'Shalom Castelão');
GRANT SELECT ON public.estabelecimento TO anon;
GRANT SELECT, INSERT, UPDATE ON public.estabelecimento TO authenticated;
GRANT ALL ON public.estabelecimento TO service_role;
ALTER TABLE public.estabelecimento ENABLE ROW LEVEL SECURITY;
CREATE POLICY "estab public read" ON public.estabelecimento FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "estab admin update" ON public.estabelecimento FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "estab admin insert" ON public.estabelecimento FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));

-- CATEGORIAS
CREATE TABLE public.categorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  ordem INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.categorias TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categorias TO authenticated;
GRANT ALL ON public.categorias TO service_role;
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cat public read" ON public.categorias FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "cat admin all" ON public.categorias FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- PRODUTOS
CREATE TABLE public.produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria_id UUID REFERENCES public.categorias(id) ON DELETE SET NULL,
  nome TEXT NOT NULL,
  descricao TEXT,
  ingredientes TEXT,
  preco NUMERIC(10,2) NOT NULL DEFAULT 0,
  foto_url TEXT,
  permite_observacao BOOLEAN NOT NULL DEFAULT true,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.produtos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.produtos TO authenticated;
GRANT ALL ON public.produtos TO service_role;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prod public read" ON public.produtos FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "prod admin all" ON public.produtos FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- MESAS
CREATE TABLE public.mesas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero INT NOT NULL UNIQUE,
  nome TEXT,
  qr_token TEXT NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text,'-',''),
  ativa BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.mesas TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mesas TO authenticated;
GRANT ALL ON public.mesas TO service_role;
ALTER TABLE public.mesas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mesa public read" ON public.mesas FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "mesa admin all" ON public.mesas FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- PEDIDOS
CREATE SEQUENCE public.pedidos_numero_seq START 1;
CREATE TABLE public.pedidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero INT NOT NULL DEFAULT nextval('public.pedidos_numero_seq'),
  mesa_id UUID NOT NULL REFERENCES public.mesas(id),
  status public.status_pedido NOT NULL DEFAULT 'recebido',
  garcom_id UUID REFERENCES auth.users(id),
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.pedidos(status);
CREATE INDEX ON public.pedidos(mesa_id);
GRANT SELECT, INSERT ON public.pedidos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pedidos TO authenticated;
GRANT ALL ON public.pedidos TO service_role;
GRANT USAGE ON SEQUENCE public.pedidos_numero_seq TO anon, authenticated, service_role;
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;
-- anyone may insert and read (id is uuid; cliente acompanha pelo id local)
CREATE POLICY "pedidos public insert" ON public.pedidos FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "pedidos public read" ON public.pedidos FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "pedidos staff update" ON public.pedidos FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'cozinha') OR public.has_role(auth.uid(),'garcom')
);
CREATE POLICY "pedidos admin delete" ON public.pedidos FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- ITENS_PEDIDO
CREATE TABLE public.itens_pedido (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  produto_id UUID NOT NULL REFERENCES public.produtos(id),
  nome_produto TEXT NOT NULL,
  preco_unitario NUMERIC(10,2) NOT NULL,
  quantidade INT NOT NULL DEFAULT 1,
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.itens_pedido(pedido_id);
GRANT SELECT, INSERT ON public.itens_pedido TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.itens_pedido TO authenticated;
GRANT ALL ON public.itens_pedido TO service_role;
ALTER TABLE public.itens_pedido ENABLE ROW LEVEL SECURITY;
CREATE POLICY "itens public insert" ON public.itens_pedido FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "itens public read" ON public.itens_pedido FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "itens admin delete" ON public.itens_pedido FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER pedidos_updated BEFORE UPDATE ON public.pedidos FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.pedidos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.itens_pedido;
ALTER TABLE public.pedidos REPLICA IDENTITY FULL;
ALTER TABLE public.itens_pedido REPLICA IDENTITY FULL;
