import { createFileRoute, Link, useParams, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { cart, useCart, formatBRL } from "@/lib/cart";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Minus, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export const Route = createFileRoute("/m/$token/carrinho")({
  component: CarrinhoPage,
});

function CarrinhoPage() {
  const { token } = useParams({ from: "/m/$token/carrinho" });
  const nav = useNavigate();
  const state = useCart();
  const [sending, setSending] = useState(false);
  const total = state.items.reduce((s, i) => s + i.preco * i.quantidade, 0);

  async function enviar() {
    if (state.items.length === 0) return;
    setSending(true);
    const payload = state.items.map((i) => ({
      produto_id: i.produto_id,
      quantidade: i.quantidade,
      observacao: i.observacao ?? null,
    }));
    const { data, error } = await supabase.rpc("create_pedido_from_token", {
      p_token: token,
      p_items: payload,
    });
    if (error || !data?.[0]) {
      setSending(false);
      return toast.error(error?.message ?? "Erro ao enviar pedido");
    }
    const pedidoId = (data[0] as { pedido_id: string }).pedido_id;
    cart.clear();
    setSending(false);
    nav({ to: "/m/$token/pedido/$pedidoId", params: { token, pedidoId } });
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b bg-background/80 px-4 py-3 backdrop-blur">
        <Link to="/m/$token" params={{ token }} className="flex h-10 w-10 items-center justify-center rounded-full border"><ArrowLeft className="h-5 w-5" /></Link>
        <h1 className="text-lg font-bold">Seu pedido</h1>
      </header>

      <main className="mx-auto max-w-2xl px-4 pt-4">
        {state.items.length === 0 ? (
          <div className="rounded-3xl border bg-card p-8 text-center text-sm text-muted-foreground">Seu carrinho está vazio.</div>
        ) : (
          <ul className="space-y-3">
            {state.items.map((i) => (
              <li key={i.produto_id + (i.observacao ?? "")} className="rounded-2xl border bg-card p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="font-semibold">{i.nome}</p>
                    {i.observacao && <p className="mt-1 text-xs text-muted-foreground">{i.observacao}</p>}
                    <p className="mt-1 text-sm font-bold text-primary">{formatBRL(i.preco * i.quantidade)}</p>
                  </div>
                  <button onClick={() => cart.remove(i.produto_id, i.observacao)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <Button size="icon" variant="outline" className="h-9 w-9 rounded-full" onClick={() => cart.setQty(i.produto_id, i.observacao, i.quantidade - 1)}><Minus className="h-3 w-3" /></Button>
                  <span className="w-8 text-center font-semibold">{i.quantidade}</span>
                  <Button size="icon" variant="outline" className="h-9 w-9 rounded-full" onClick={() => cart.setQty(i.produto_id, i.observacao, i.quantidade + 1)}><Plus className="h-3 w-3" /></Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>

      {state.items.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 px-4 py-3 backdrop-blur">
          <div className="mx-auto flex max-w-2xl items-center justify-between gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-xl font-bold">{formatBRL(total)}</p>
            </div>
            <Button className="h-14 flex-1 rounded-full text-base" disabled={sending} onClick={enviar}>
              {sending ? "Enviando…" : "Enviar pedido"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
