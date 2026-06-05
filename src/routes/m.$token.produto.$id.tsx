import { createFileRoute, Link, useParams, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cart, formatBRL } from "@/lib/cart";
import { ArrowLeft, Loader2, Minus, Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/m/$token/produto/$id")({
  component: ProdutoPage,
});

function ProdutoPage() {
  const { token, id } = useParams({ from: "/m/$token/produto/$id" });
  const nav = useNavigate();
  const [qty, setQty] = useState(1);
  const [obs, setObs] = useState("");

  const q = useQuery({
    queryKey: ["produto", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("produtos").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (q.isLoading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!q.data) return <div className="p-10 text-center">Produto não encontrado.</div>;
  const p = q.data;

  return (
    <div className="min-h-screen bg-background pb-32">
      <div className="relative">
        {p.foto_url ? (
          <img src={p.foto_url} alt={p.nome} className="h-72 w-full object-cover" />
        ) : (
          <div className="flex h-72 items-center justify-center bg-muted text-6xl">🍽️</div>
        )}
        <Link to="/m/$token" params={{ token }} className="absolute left-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-background/80 backdrop-blur">
          <ArrowLeft className="h-5 w-5" />
        </Link>
      </div>

      <div className="mx-auto max-w-2xl px-4 pt-6">
        <h1 className="text-2xl font-bold">{p.nome}</h1>
        <p className="mt-1 text-xl font-bold text-primary">{formatBRL(Number(p.preco))}</p>
        {p.descricao && <p className="mt-4 text-sm text-muted-foreground">{p.descricao}</p>}
        {p.ingredientes && (
          <div className="mt-4">
            <h3 className="text-sm font-semibold">Ingredientes</h3>
            <p className="mt-1 text-sm text-muted-foreground">{p.ingredientes}</p>
          </div>
        )}

        {p.permite_observacao && (
          <div className="mt-6">
            <label className="text-sm font-semibold">Observações</label>
            <Textarea value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Ex.: sem cebola, ponto da carne…" className="mt-2" maxLength={300} />
          </div>
        )}

        <div className="mt-6 flex items-center gap-3">
          <Button variant="outline" size="icon" className="h-12 w-12 rounded-full" onClick={() => setQty((q) => Math.max(1, q - 1))}><Minus className="h-4 w-4" /></Button>
          <span className="w-10 text-center text-lg font-bold">{qty}</span>
          <Button variant="outline" size="icon" className="h-12 w-12 rounded-full" onClick={() => setQty((q) => q + 1)}><Plus className="h-4 w-4" /></Button>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto max-w-2xl">
          <Button
            className="h-14 w-full rounded-full text-base"
            onClick={() => {
              cart.add({ produto_id: p.id, nome: p.nome, preco: Number(p.preco), quantidade: qty, observacao: obs.trim() || undefined, foto_url: p.foto_url });
              toast.success("Adicionado ao carrinho");
              nav({ to: "/m/$token", params: { token } });
            }}
          >
            Adicionar · {formatBRL(Number(p.preco) * qty)}
          </Button>
        </div>
      </div>
    </div>
  );
}
