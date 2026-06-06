import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { cart, useCart, formatBRL } from "@/lib/cart";
import { ShoppingBag, Loader2 } from "lucide-react";

export const Route = createFileRoute("/m/$token")({
  head: () => ({ meta: [{ title: "Cardápio — Shalom Castelão" }] }),
  component: ClienteMenu,
});

function ClienteMenu() {
  const { token } = useParams({ from: "/m/$token" });
  const cartState = useCart();

  useEffect(() => { cart.setMesa(token); }, [token]);

  const mesaQ = useQuery({
    queryKey: ["mesa", token],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_mesa_by_token", { p_token: token });
      if (error) throw error;
      return (data?.[0] ?? null) as { id: string; numero: number; nome: string | null; ativa: boolean } | null;
    },
  });

  const dataQ = useQuery({
    queryKey: ["menu"],
    queryFn: async () => {
      const [cats, prods, estab] = await Promise.all([
        supabase.from("categorias").select("*").order("ordem"),
        supabase.from("produtos").select("*").eq("ativo", true),
        supabase.from("estabelecimento").select("*").eq("id", 1).maybeSingle(),
      ]);
      return {
        categorias: cats.data ?? [],
        produtos: prods.data ?? [],
        estab: estab.data,
      };
    },
  });

  if (mesaQ.isLoading || dataQ.isLoading) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  if (!mesaQ.data) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 text-center">
        <div>
          <Logo size={80} />
          <h1 className="mt-4 text-2xl font-semibold">Mesa não encontrada</h1>
          <p className="mt-2 text-sm text-muted-foreground">O QR Code escaneado parece inválido.</p>
        </div>
      </div>
    );
  }

  const mesa = mesaQ.data;
  const { categorias, produtos, estab } = dataQ.data!;
  const totalItens = cartState.items.reduce((s, i) => s + i.quantidade, 0);

  return (
    <div className="min-h-screen bg-background pb-32">
      <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <Logo size={42} />
          <div className="flex-1 min-w-0">
            <p className="truncate text-xs text-muted-foreground">{estab?.nome ?? "Shalom Castelão"}</p>
            <h1 className="truncate text-lg font-bold leading-tight">Mesa {mesa.numero}{mesa.nome ? ` · ${mesa.nome}` : ""}</h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 pt-4">
        {produtos.length === 0 ? (
          <div className="rounded-3xl border bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground">Cardápio em preparação. Volte em instantes.</p>
          </div>
        ) : (
          categorias
            .filter((c) => produtos.some((p) => p.categoria_id === c.id))
            .map((cat) => (
              <section key={cat.id} className="mb-8">
                <h2 className="mb-3 text-lg font-bold tracking-tight">{cat.nome}</h2>
                <div className="grid gap-3">
                  {produtos.filter((p) => p.categoria_id === cat.id).map((p) => (
                    <Link
                      key={p.id}
                      to="/m/$token/produto/$id"
                      params={{ token, id: p.id }}
                      className="group flex gap-4 rounded-2xl border bg-card p-3 transition hover:border-primary/50 hover:shadow-md"
                    >
                      {p.foto_url ? (
                        <img src={p.foto_url} alt={p.nome} className="h-24 w-24 flex-shrink-0 rounded-xl object-cover" />
                      ) : (
                        <div className="flex h-24 w-24 flex-shrink-0 items-center justify-center rounded-xl bg-muted text-3xl">🍽️</div>
                      )}
                      <div className="flex min-w-0 flex-1 flex-col">
                        <h3 className="font-semibold leading-tight">{p.nome}</h3>
                        {p.descricao && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{p.descricao}</p>}
                        <span className="mt-auto pt-2 font-bold text-primary">{formatBRL(Number(p.preco))}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            ))
        )}

        {/* uncategorized */}
        {produtos.filter((p) => !p.categoria_id || !categorias.some((c) => c.id === p.categoria_id)).length > 0 && (
          <section className="mb-8">
            <h2 className="mb-3 text-lg font-bold">Outros</h2>
            <div className="grid gap-3">
              {produtos.filter((p) => !p.categoria_id || !categorias.some((c) => c.id === p.categoria_id)).map((p) => (
                <Link key={p.id} to="/m/$token/produto/$id" params={{ token, id: p.id }} className="flex gap-4 rounded-2xl border bg-card p-3">
                  <div className="flex h-24 w-24 items-center justify-center rounded-xl bg-muted text-3xl">🍽️</div>
                  <div className="flex flex-1 flex-col">
                    <h3 className="font-semibold">{p.nome}</h3>
                    <span className="mt-auto font-bold text-primary">{formatBRL(Number(p.preco))}</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>

      {totalItens > 0 && (
        <Link
          to="/m/$token/carrinho"
          params={{ token }}
          className="fixed inset-x-0 bottom-4 z-30 mx-auto flex max-w-md items-center justify-between rounded-full bg-primary px-6 py-4 text-primary-foreground shadow-2xl shadow-primary/40"
        >
          <span className="flex items-center gap-2 font-semibold">
            <ShoppingBag className="h-5 w-5" />
            {totalItens} {totalItens === 1 ? "item" : "itens"}
          </span>
          <span className="font-bold">{formatBRL(cartState.items.reduce((s, i) => s + i.preco * i.quantidade, 0))}</span>
        </Link>
      )}
    </div>
  );
}
