import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { cart, useCart, formatBRL } from "@/lib/cart";
import { ShoppingBag, Search, Sparkles, AlertCircle, ShoppingCart } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useRealtime } from "@/hooks/useRealtime";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/m/$token")({
  head: () => ({ meta: [{ title: "Cardápio Digital | Shalom Castelão" }] }),
  component: ClienteMenu,
});

function SkeletonMenu() {
  return (
    <div className="min-h-screen bg-background pb-32">
      <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur px-4 py-3">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-4 pt-4 space-y-6">
        <Skeleton className="h-10 w-full rounded-xl" />
        <div className="flex gap-2 overflow-x-auto pb-2">
          <Skeleton className="h-8 w-20 rounded-full shrink-0" />
          <Skeleton className="h-8 w-24 rounded-full shrink-0" />
          <Skeleton className="h-8 w-20 rounded-full shrink-0" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-5 w-28 rounded" />
          <div className="space-y-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="flex gap-4 border rounded-2xl p-3">
                <Skeleton className="h-20 w-20 rounded-xl shrink-0" />
                <div className="flex-1 space-y-2 py-1">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3 w-5/6" />
                  <Skeleton className="h-4 w-12" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

function ClienteMenu() {
  const { token } = useParams({ from: "/m/$token" });
  const cartState = useCart();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  useEffect(() => {
    cart.setMesa(token);
  }, [token]);

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

  // Listen to menu changes (products and categories) in real-time
  useRealtime({
    table: "produtos",
    onData: () => dataQ.refetch(),
  });

  useRealtime({
    table: "categorias",
    onData: () => dataQ.refetch(),
  });

  useRealtime({
    table: "estabelecimento",
    onData: () => dataQ.refetch(),
  });

  if (mesaQ.isLoading || dataQ.isLoading) {
    return <SkeletonMenu />;
  }

  if (!mesaQ.data) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 text-center bg-background">
        <div className="max-w-xs space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-950/30 dark:text-red-400">
            <AlertCircle className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Mesa não encontrada</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              O código escaneado é inválido ou esta mesa foi desativada. Solicite assistência.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const mesa = mesaQ.data;
  const { categorias, produtos, estab } = dataQ.data!;
  const totalItens = cartState.items.reduce((s, i) => s + i.quantidade, 0);

  // Dynamic branding colors
  const primaryColor = estab?.cor_primaria || "#1FB8DB";
  const secondaryColor = estab?.cor_secundaria || "#0EA5E9";

  // Filter products by search
  const filteredProdutos = produtos.filter((p) => {
    const matchesSearch =
      p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.descricao && p.descricao.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = !activeCategory || p.categoria_id === activeCategory;
    
    return matchesSearch && matchesCategory;
  });

  const categoriesToShow = categorias.filter((c) =>
    produtos.some((p) => p.categoria_id === c.id)
  );

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Visual Premium Header */}
      <header
        className="sticky top-0 z-20 text-white shadow-md transition-all"
        style={{
          background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
        }}
      >
        <div className="mx-auto flex max-w-2xl items-center gap-3.5 px-4 py-4">
          {estab?.logo_url ? (
            <img
              src={estab.logo_url}
              alt={estab.nome}
              className="h-11 w-11 rounded-full border-2 border-white/60 bg-white object-cover shadow-sm"
            />
          ) : (
            <div className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-white/60 bg-white/10 font-bold text-white text-base">
              {estab?.nome ? estab.nome.substring(0, 2).toUpperCase() : "SH"}
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            <p className="truncate text-xs font-semibold text-white/80 uppercase tracking-wider">
              {estab?.nome || "Shalom Castelão"}
            </p>
            <h1 className="truncate text-xl font-black leading-tight flex items-center gap-1.5">
              Mesa #{mesa.numero}
              {mesa.nome && (
                <span className="text-xs font-bold bg-white/20 rounded-full px-2 py-0.5">
                  {mesa.nome}
                </span>
              )}
            </h1>
          </div>
        </div>
      </header>

      {/* Main cardapio content */}
      <main className="mx-auto max-w-2xl px-4 pt-4 space-y-4">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar prato, bebida ou sobremesa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-card h-11 rounded-xl border-border focus-visible:ring-primary"
            style={{
              "--ring": primaryColor,
            } as React.CSSProperties}
          />
        </div>

        {/* Categories Quick Bar */}
        {categoriesToShow.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-none">
            <button
              onClick={() => setActiveCategory(null)}
              className="px-4 py-1.5 text-xs font-bold rounded-full border shrink-0 transition-all cursor-pointer"
              style={{
                backgroundColor: activeCategory === null ? primaryColor : "transparent",
                color: activeCategory === null ? "#ffffff" : "inherit",
                borderColor: activeCategory === null ? primaryColor : "var(--border)",
              }}
            >
              Todos
            </button>
            {categoriesToShow.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className="px-4 py-1.5 text-xs font-bold rounded-full border shrink-0 transition-all cursor-pointer"
                style={{
                  backgroundColor: activeCategory === cat.id ? primaryColor : "transparent",
                  color: activeCategory === cat.id ? "#ffffff" : "inherit",
                  borderColor: activeCategory === cat.id ? primaryColor : "var(--border)",
                }}
              >
                {cat.nome}
              </button>
            ))}
          </div>
        )}

        {/* Products Grid */}
        {filteredProdutos.length === 0 ? (
          <div className="rounded-3xl border border-dashed bg-card p-12 text-center space-y-2">
            <ShoppingCart className="mx-auto h-8 w-8 text-muted-foreground/60" />
            <p className="text-sm text-muted-foreground font-semibold">Nenhum item disponível.</p>
            <p className="text-xs text-muted-foreground/60">Tente buscar por outro termo ou categoria.</p>
          </div>
        ) : (
          categoriesToShow
            .filter((c) => (!activeCategory || c.id === activeCategory) && filteredProdutos.some((p) => p.categoria_id === c.id))
            .map((cat) => (
              <section key={cat.id} className="space-y-3 pt-2">
                <h2 className="text-base font-extrabold tracking-tight text-slate-800 dark:text-slate-100 uppercase border-b pb-1">
                  {cat.nome}
                </h2>
                <div className="grid gap-3">
                  {filteredProdutos
                    .filter((p) => p.categoria_id === cat.id)
                    .map((p) => (
                      <Link
                        key={p.id}
                        to="/m/$token/produto/$id"
                        params={{ token, id: p.id }}
                        className="group flex gap-4 rounded-2xl border bg-card p-3 transition-all hover:border-primary/50 hover:shadow-md cursor-pointer"
                        style={{
                          "--hover-border": primaryColor,
                        } as React.CSSProperties}
                      >
                        {p.foto_url ? (
                          <img
                            src={p.foto_url}
                            alt={p.nome}
                            className="h-20 w-20 flex-shrink-0 rounded-xl object-cover border bg-muted"
                          />
                        ) : (
                          <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-3xl">
                            🍔
                          </div>
                        )}
                        <div className="flex min-w-0 flex-1 flex-col justify-between">
                          <div>
                            <h3 className="font-extrabold text-sm text-slate-950 dark:text-white leading-tight group-hover:text-primary transition-colors"
                              style={{
                                "--hover-color": primaryColor,
                              } as React.CSSProperties}>
                              {p.nome}
                            </h3>
                            {p.descricao && (
                              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                                {p.descricao}
                              </p>
                            )}
                          </div>
                          <span
                            className="font-black text-sm"
                            style={{ color: primaryColor }}
                          >
                            {formatBRL(Number(p.preco))}
                          </span>
                        </div>
                      </Link>
                    ))}
                </div>
              </section>
            ))
        )}

        {/* Uncategorized products if any */}
        {!activeCategory && filteredProdutos.filter((p) => !p.categoria_id || !categorias.some((c) => c.id === p.categoria_id)).length > 0 && (
          <section className="space-y-3 pt-2">
            <h2 className="text-base font-extrabold tracking-tight text-slate-800 dark:text-slate-100 uppercase border-b pb-1">
              Outros
            </h2>
            <div className="grid gap-3">
              {filteredProdutos
                .filter((p) => !p.categoria_id || !categorias.some((c) => c.id === p.categoria_id))
                .map((p) => (
                  <Link
                    key={p.id}
                    to="/m/$token/produto/$id"
                    params={{ token, id: p.id }}
                    className="flex gap-4 rounded-2xl border bg-card p-3 cursor-pointer"
                  >
                    <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-3xl">
                      🍽️
                    </div>
                    <div className="flex flex-1 flex-col justify-between">
                      <div>
                        <h3 className="font-extrabold text-sm">{p.nome}</h3>
                        {p.descricao && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{p.descricao}</p>}
                      </div>
                      <span
                        className="font-black text-sm"
                        style={{ color: primaryColor }}
                      >
                        {formatBRL(Number(p.preco))}
                      </span>
                    </div>
                  </Link>
                ))}
            </div>
          </section>
        )}
      </main>

      {/* Premium Floating Cart Button */}
      {totalItens > 0 && (
        <Link
          to="/m/$token/carrinho"
          params={{ token }}
          className="fixed inset-x-0 bottom-6 z-30 mx-auto flex max-w-md items-center justify-between rounded-2xl px-6 py-4 text-white shadow-2xl hover:scale-[1.02] transition-transform cursor-pointer"
          style={{
            background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
          }}
        >
          <span className="flex items-center gap-2 font-bold text-sm">
            <ShoppingBag className="h-5 w-5 animate-bounce" />
            Ver Carrinho ({totalItens} {totalItens === 1 ? "item" : "itens"})
          </span>
          <span className="font-black text-base">
            {formatBRL(cartState.items.reduce((s, i) => s + i.preco * i.quantidade, 0))}
          </span>
        </Link>
      )}
    </div>
  );
}
