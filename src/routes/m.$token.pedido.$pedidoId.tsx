import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { Check, Loader2 } from "lucide-react";

export const Route = createFileRoute("/m/$token/pedido/$pedidoId")({
  component: AcompanharPedido,
});

const STEPS: { key: string; label: string }[] = [
  { key: "recebido", label: "Recebido" },
  { key: "em_preparo", label: "Em preparo" },
  { key: "pronto", label: "Preparação concluída" },
  { key: "garcom_a_caminho", label: "Garçom a caminho" },
  { key: "entregue", label: "Entregue" },
];

function AcompanharPedido() {
  const { token, pedidoId } = useParams({ from: "/m/$token/pedido/$pedidoId" });
  const [pedido, setPedido] = useState<{ id: string; numero: number; status: string } | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      const { data } = await supabase.from("pedidos").select("id, numero, status").eq("id", pedidoId).maybeSingle();
      if (active) setPedido(data as any);
    }
    load();
    const ch = supabase
      .channel("pedido-" + pedidoId)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "pedidos", filter: `id=eq.${pedidoId}` }, (payload) => {
        setPedido(payload.new as any);
      })
      .subscribe();
    return () => { active = false; supabase.removeChannel(ch); };
  }, [pedidoId]);

  if (!pedido) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const currentIdx = STEPS.findIndex((s) => s.key === pedido.status);

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/10 to-background px-4 pb-10 pt-10">
      <div className="mx-auto max-w-md text-center">
        <Logo size={72} className="mx-auto" />
        <p className="mt-4 text-sm text-muted-foreground">Seu pedido</p>
        <h1 className="text-4xl font-bold tracking-tight">#{String(pedido.numero).padStart(3, "0")}</h1>

        <ol className="mt-10 space-y-3 text-left">
          {STEPS.map((s, idx) => {
            const done = idx <= currentIdx;
            const current = idx === currentIdx;
            return (
              <li key={s.key} className={`flex items-center gap-4 rounded-2xl border bg-card p-4 transition ${current ? "ring-2 ring-primary shadow-lg" : ""}`}>
                <div className={`flex h-10 w-10 items-center justify-center rounded-full ${done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                  {done ? <Check className="h-5 w-5" /> : <span className="text-sm font-bold">{idx + 1}</span>}
                </div>
                <span className={`font-medium ${done ? "" : "text-muted-foreground"}`}>{s.label}</span>
              </li>
            );
          })}
        </ol>

        <Link to="/m/$token" params={{ token }} className="mt-8 inline-block text-sm text-primary underline">
          Voltar ao cardápio
        </Link>
      </div>
    </div>
  );
}
