import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/components/AuthProvider";
import { usePedidos, useAtualizarStatus, type PedidoComDetalhes } from "@/hooks/usePedidos";
import { useRealtime } from "@/hooks/useRealtime";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Play, CheckCircle2, Clock, Volume2, VolumeX, LogOut } from "lucide-react";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/cozinha")({
  head: () => ({ meta: [{ title: "Painel da Cozinha | Sistema de Pedidos" }] }),
  component: CozinhaRouteGuard,
});

function CozinhaRouteGuard() {
  const { user, roles, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" />;
  
  const hasAccess = roles.includes("cozinha") || roles.includes("admin");
  if (!hasAccess) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 text-white p-6 text-center">
        <h1 className="text-3xl font-bold text-red-500">Acesso Negado</h1>
        <p className="mt-2 text-slate-400">Você não tem permissão para acessar a área da Cozinha.</p>
        <Button className="mt-6" onClick={() => window.location.href = "/"}>Voltar para o Início</Button>
      </div>
    );
  }

  return <CozinhaPage />;
}

function CozinhaPage() {
  const { data: pedidos = [], isLoading, refetch } = usePedidos();
  const updateStatusMutation = useAtualizarStatus();
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Real-time channel integration
  useRealtime({
    table: "pedidos",
    onData: () => {
      refetch();
      if (soundEnabled) {
        try {
          const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-120.wav");
          audio.volume = 0.8;
          audio.play();
        } catch (e) {
          console.warn("Could not play sound:", e);
        }
      }
      toast.info("Novo pedido ou atualização recebida!");
    },
  });

  const handleStartPreparo = (id: string) => {
    updateStatusMutation.mutate(
      { id, status: "em_preparo" },
      {
        onSuccess: () => {
          toast.success("Preparo iniciado!");
        },
        onError: (err: any) => {
          toast.error("Erro ao iniciar preparo: " + err.message);
        },
      }
    );
  };

  const handleFinishPreparo = (id: string) => {
    updateStatusMutation.mutate(
      { id, status: "pronto" },
      {
        onSuccess: () => {
          toast.success("Pedido pronto! Garçom notificado.");
        },
        onError: (err: any) => {
          toast.error("Erro ao finalizar preparo: " + err.message);
        },
      }
    );
  };

  // Filter orders for each column
  const novosPedidos = pedidos.filter((p) => p.status === "recebido");
  const emPreparoPedidos = pedidos.filter((p) => p.status === "em_preparo");
  const prontosPedidos = pedidos.filter((p) => p.status === "pronto");

  const renderOrderCard = (pedido: PedidoComDetalhes, type: "novo" | "preparo" | "pronto") => {
    const isLate = Date.now() - new Date(pedido.created_at).getTime() > 15 * 60 * 1000; // 15 mins delay alert

    return (
      <Card
        key={pedido.id}
        className={`shadow border-2 transition-all hover:scale-[1.01] ${
          isLate && type !== "pronto"
            ? "border-red-500 bg-red-50/50 dark:bg-red-950/10"
            : "border-slate-200 dark:border-slate-800"
        }`}
      >
        <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-xl text-slate-800 dark:text-slate-100">
              #{pedido.numero}
            </span>
            <Badge className="font-bold text-sm bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900">
              Mesa {pedido.mesa_numero}
            </Badge>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground font-semibold">
            <Clock className="h-3.5 w-3.5" />
            <span>
              {formatDistanceToNow(new Date(pedido.created_at), { locale: ptBR })}
            </span>
          </div>
        </CardHeader>

        <CardContent className="p-4 pt-1 space-y-4">
          {pedido.mesa_nome && (
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Setor: <span className="font-semibold text-slate-700 dark:text-slate-300">{pedido.mesa_nome}</span>
            </p>
          )}

          <ul className="space-y-2 rounded-lg border bg-slate-50 dark:bg-slate-900/40 p-3 divide-y divide-slate-100 dark:divide-slate-800">
            {pedido.itens.map((item, index) => (
              <li key={item.id} className={`pt-2 first:pt-0`}>
                <div className="flex items-start justify-between">
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    <span className="text-primary text-base mr-1.5">{item.quantidade}x</span>
                    {item.nome_produto}
                  </p>
                </div>
                {item.observacao && (
                  <p className="mt-1 text-xs font-semibold bg-amber-100/70 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 rounded-md px-2 py-1 italic">
                    Obs: "{item.observacao}"
                  </p>
                )}
              </li>
            ))}
          </ul>

          <div className="flex justify-end pt-1">
            {type === "novo" && (
              <Button
                onClick={() => handleStartPreparo(pedido.id)}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white gap-2 font-bold"
              >
                <Play className="h-4 w-4 fill-current" /> Iniciar Preparo
              </Button>
            )}
            {type === "preparo" && (
              <Button
                onClick={() => handleFinishPreparo(pedido.id)}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-bold"
              >
                <CheckCircle2 className="h-4 w-4" /> Pronto
              </Button>
            )}
            {type === "pronto" && (
              <Badge variant="outline" className="w-full py-1.5 flex justify-center bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400 font-bold border-indigo-200">
                Aguardando Garçom
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900 px-6 py-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <Logo size={40} />
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">KITCHEN BOARD</h1>
            <p className="text-xs text-slate-400">Monitor de Preparo e Pedidos</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="border-slate-700 hover:bg-slate-800 text-slate-300"
          >
            {soundEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              await supabase.auth.signOut();
              toast.success("Sessão encerrada");
              window.location.href = "/auth";
            }}
            className="text-slate-400 hover:text-white"
          >
            <LogOut className="mr-1.5 h-4 w-4" /> Sair
          </Button>
        </div>
      </header>

      {/* Kanban Board */}
      <main className="flex-1 p-6 grid grid-cols-1 md:grid-cols-3 gap-6 overflow-hidden">
        {/* Recebidos */}
        <div className="flex flex-col h-full bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden p-4 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h2 className="font-extrabold text-lg tracking-tight flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-blue-500" /> Recebidos
            </h2>
            <Badge variant="secondary" className="bg-slate-800 text-slate-300 font-bold">
              {novosPedidos.length}
            </Badge>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {isLoading ? (
              <div className="flex h-40 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            ) : novosPedidos.length === 0 ? (
              <div className="flex h-32 items-center justify-center text-slate-500 text-sm font-medium">
                Nenhum pedido na fila.
              </div>
            ) : (
              novosPedidos.map((p) => renderOrderCard(p, "novo"))
            )}
          </div>
        </div>

        {/* Em Preparo */}
        <div className="flex flex-col h-full bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden p-4 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h2 className="font-extrabold text-lg tracking-tight flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-orange-500" /> Em Preparo
            </h2>
            <Badge variant="secondary" className="bg-slate-800 text-slate-300 font-bold">
              {emPreparoPedidos.length}
            </Badge>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {isLoading ? (
              <div className="flex h-40 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            ) : emPreparoPedidos.length === 0 ? (
              <div className="flex h-32 items-center justify-center text-slate-500 text-sm font-medium">
                Nenhum prato em preparo.
              </div>
            ) : (
              emPreparoPedidos.map((p) => renderOrderCard(p, "preparo"))
            )}
          </div>
        </div>

        {/* Prontos */}
        <div className="flex flex-col h-full bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden p-4 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h2 className="font-extrabold text-lg tracking-tight flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-emerald-500" /> Prontos
            </h2>
            <Badge variant="secondary" className="bg-slate-800 text-slate-300 font-bold">
              {prontosPedidos.length}
            </Badge>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {isLoading ? (
              <div className="flex h-40 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            ) : prontosPedidos.length === 0 ? (
              <div className="flex h-32 items-center justify-center text-slate-500 text-sm font-medium">
                Nenhum pedido pronto ainda.
              </div>
            ) : (
              prontosPedidos.map((p) => renderOrderCard(p, "pronto"))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
