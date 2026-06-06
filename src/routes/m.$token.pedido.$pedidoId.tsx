import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { Check, Loader2, ArrowLeft, RefreshCw, AlertTriangle, XCircle, ShoppingBag } from "lucide-react";
import { useRealtime } from "@/hooks/useRealtime";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatBRL } from "@/lib/cart";

export const Route = createFileRoute("/m/$token/pedido/$pedidoId")({
  head: () => ({ meta: [{ title: "Acompanhar Pedido | Shalom Castelão" }] }),
  component: AcompanharPedido,
});

const STEPS: { key: string; label: string; desc: string }[] = [
  { key: "recebido", label: "Recebido", desc: "Seu pedido foi registrado e aguarda a cozinha iniciar o preparo." },
  { key: "em_preparo", label: "Em Preparo", desc: "A cozinha já está preparando seus pratos com muito carinho!" },
  { key: "pronto", label: "Pronto", desc: "Sua refeição está pronta e o garçom foi acionado para levá-la." },
  { key: "garcom_a_caminho", label: "A Caminho", desc: "O garçom retirou seu pedido e está a caminho da sua mesa!" },
  { key: "entregue", label: "Entregue", desc: "Bom apetite! Se precisar de algo mais, basta chamar no cardápio." },
];

function AcompanharPedido() {
  const { token, pedidoId } = useParams({ from: "/m/$token/pedido/$pedidoId" });

  const { data: pedido, isLoading, refetch } = useQuery({
    queryKey: ["pedido-status", pedidoId],
    queryFn: async () => {
      // Fetch status & details
      const { data, error } = await supabase.rpc("get_pedido_status", { p_pedido_id: pedidoId });
      if (error) throw error;
      
      if (!data || data.length === 0) {
        // Try direct fetch if RPC has schema issues or returns empty
        const { data: directData } = await supabase
          .from("pedidos")
          .select("*, itens_pedido(*)")
          .eq("id", pedidoId)
          .maybeSingle();
        return directData;
      }
      return data[0];
    },
  });

  const { data: estab } = useQuery({
    queryKey: ["estabelecimento"],
    queryFn: async () => {
      const { data } = await supabase.from("estabelecimento").select("*").eq("id", 1).maybeSingle();
      return data;
    },
  });

  // Real-time listener for status changes
  useRealtime({
    table: "pedidos",
    filter: `id=eq.${pedidoId}`,
    onData: () => {
      refetch();
      // Play a quick subtle chime
      try {
        const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/1435/1435-120.wav");
        audio.volume = 0.4;
        audio.play();
      } catch (e) {
        console.warn(e);
      }
    },
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!pedido) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-center bg-background">
        <div className="max-w-xs space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400">
            <AlertTriangle className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Pedido não encontrado</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Não conseguimos encontrar esse código de pedido. Verifique seu histórico ou refaça o pedido.
            </p>
          </div>
          <Button asChild className="w-full">
            <Link to="/m/$token" params={{ token }}>
              Ir para o Cardápio
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const primaryColor = estab?.cor_primaria || "#1FB8DB";
  const secondaryColor = estab?.cor_secundaria || "#0EA5E9";

  const isCancelled = pedido.status === "cancelado";
  const currentIdx = STEPS.findIndex((s) => s.key === pedido.status);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-16">
      {/* Visual Premium Header */}
      <header
        className="text-white shadow-md transition-all py-6 px-4 text-center rounded-b-[2.5rem]"
        style={{
          background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
        }}
      >
        <div className="max-w-md mx-auto flex flex-col items-center">
          <Link
            to="/m/$token"
            params={{ token }}
            className="self-start text-white/90 hover:text-white flex items-center gap-1.5 text-xs font-semibold mb-4 bg-white/10 hover:bg-white/20 rounded-full px-3 py-1.5"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Voltar ao Cardápio
          </Link>

          {estab?.logo_url ? (
            <img
              src={estab.logo_url}
              alt={estab.nome}
              className="h-16 w-16 rounded-full border-4 border-white/40 bg-white object-cover shadow-md"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-white/40 bg-white/10 font-bold text-white text-xl">
              {estab?.nome ? estab.nome.substring(0, 2).toUpperCase() : "SH"}
            </div>
          )}
          <h1 className="mt-3 text-lg font-bold tracking-tight text-white/90">
            Acompanhe seu Pedido
          </h1>
          <p className="text-3xl font-black mt-1">
            #{String(pedido.numero).padStart(3, "0")}
          </p>
        </div>
      </header>

      {/* Timeline view */}
      <main className="max-w-md mx-auto px-4 mt-6">
        {isCancelled ? (
          <Card className="border-red-200 dark:border-red-950 bg-red-50/50 dark:bg-red-950/10 shadow-lg text-center p-6 space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-950/30 dark:text-red-400">
              <XCircle className="h-8 w-8" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-red-900 dark:text-red-400">Pedido Cancelado</h2>
              <p className="mt-1.5 text-sm text-red-700 dark:text-red-300">
                Lamentamos, mas este pedido foi cancelado pelo estabelecimento. Entre em contato com o garçom para saber o motivo.
              </p>
            </div>
            <Button asChild variant="outline" className="w-full border-red-200 hover:bg-red-100">
              <Link to="/m/$token" params={{ token }}>
                Fazer Outro Pedido
              </Link>
            </Button>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Steps Timeline Container */}
            <div className="relative pl-8 space-y-8 before:absolute before:left-[15px] before:top-2 before:bottom-2 before:w-[3px] before:bg-slate-200 dark:before:bg-slate-800">
              {STEPS.map((s, idx) => {
                const isCompleted = idx < currentIdx;
                const isActive = idx === currentIdx;
                const isPending = idx > currentIdx;

                return (
                  <div key={s.key} className="relative group">
                    {/* Circle Indicator */}
                    <div
                      className={`absolute -left-[32px] top-1 flex h-7 w-7 items-center justify-center rounded-full border-2 transition-all duration-300 z-10 ${
                        isCompleted
                          ? "bg-emerald-500 border-emerald-500 text-white"
                          : isActive
                          ? "bg-white dark:bg-slate-950 border-primary shadow-lg ring-4"
                          : "bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-muted-foreground"
                      }`}
                      style={{
                        borderColor: isActive ? primaryColor : undefined,
                        boxShadow: isActive ? `0 0 12px ${primaryColor}40` : undefined,
                        outlineColor: isActive ? `${primaryColor}20` : undefined,
                        color: isActive ? primaryColor : undefined,
                      }}
                    >
                      {isCompleted ? (
                        <Check className="h-4.5 w-4.5 stroke-[3]" />
                      ) : isActive ? (
                        <div
                          className="h-2.5 w-2.5 rounded-full animate-ping"
                          style={{ backgroundColor: primaryColor }}
                        />
                      ) : (
                        <span className="text-[10px] font-extrabold">{idx + 1}</span>
                      )}
                    </div>

                    {/* Step Content */}
                    <div
                      className={`rounded-2xl border bg-card p-4 transition-all duration-300 ${
                        isActive
                          ? "border-primary/50 shadow-md translate-x-1"
                          : "border-slate-200 dark:border-slate-800 opacity-60"
                      }`}
                      style={{
                        borderColor: isActive ? `${primaryColor}40` : undefined,
                      }}
                    >
                      <h3
                        className={`font-black text-sm transition-colors ${
                          isActive ? "text-slate-900 dark:text-white" : "text-muted-foreground"
                        }`}
                        style={{ color: isActive ? primaryColor : undefined }}
                      >
                        {s.label}
                      </h3>
                      <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                        {s.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Receipt Summary Card */}
            {pedido.total && (
              <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
                <CardHeader className="p-4 pb-2 border-b flex flex-row items-center justify-between">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Resumo do Pedido
                  </CardTitle>
                  <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Forma de Pagamento:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      Pagar na Entrega (Maquineta/Pix)
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-base font-black border-t pt-2.5">
                    <span>Total Pago:</span>
                    <span style={{ color: primaryColor }}>
                      {formatBRL(Number(pedido.total))}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
