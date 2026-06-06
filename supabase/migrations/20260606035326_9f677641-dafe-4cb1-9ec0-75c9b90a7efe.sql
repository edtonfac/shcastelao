
-- Remove pedidos/itens_pedido from realtime publication to prevent any authenticated user from subscribing
ALTER PUBLICATION supabase_realtime DROP TABLE public.pedidos;
ALTER PUBLICATION supabase_realtime DROP TABLE public.itens_pedido;

-- Lock down SECURITY DEFINER functions: only anon + authenticated may call the customer entry points
REVOKE ALL ON FUNCTION public.get_mesa_by_token(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_pedido_status(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_pedido_from_token(text, jsonb) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_mesa_by_token(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_pedido_status(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_pedido_from_token(text, jsonb) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
