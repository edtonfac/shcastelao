import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/components/AuthProvider";
import { usePedidos, useAtualizarStatus, type PedidoComDetalhes } from "@/hooks/usePedidos";
import { useRealtime } from "@/hooks/useRealtime";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Navigation, CheckCircle2, Clock, Volume2, VolumeX, LogOut, MapPin } from "lucide-react";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/garcom")({
  head: () => ({ meta: [{ title: "Painel do Garçom | Sistema de Pedidos" }] }),
  component: GarcomRouteGuard,
});

function GarcomRouteGuard() {
  const { user, roles, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" />;

  const hasAccess = roles.includes("garcom") || roles.includes("admin");
  if (!hasAccess) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center bg-slate-50 dark:bg-slate-950">
        <h1 className="text-3xl font-bold text-red-500">Acesso Negado</h1>
        <p className="mt-2 text-muted-foreground">Você não tem permissão para acessar a área do Garçom.</p>
        <Button className="mt-6" onClick={() => window.location.href = "/"}>Voltar para o Início</Button>
      </div>
    );
  }

  return <GarcomPage />;
}

function GarcomPage() {
  const { user } = useAuth();
  const { data: pedidos = [], isLoading, refetch } = usePedidos();
  const updateStatusMutation = useAtualizarStatus();
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Real-time listener
  useRealtime({
    table: "pedidos",
    onData: () => {
      refetch();
      
      // Let's check if there is any new "pronto" order
      // If the last status change was to "pronto", play sound
      if (soundEnabled) {
        try {
          const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2019/2019-120.wav");
          audio.volume = 0.8;
          audio.play();
        } catch (e) {
          console.warn("Could not play sound:", e);
        }
      }
      toast.success("Pedidos atualizados!");
    },
  });

  const handleAssumirEntrega = (pedidoId: string) => {
    if (!user) return;
    updateStatusMutation.mutate(
      { id: pedidoId, status: "garcom_a_caminho", garcom_id: user.id },
      {
        onSuccess: () => {
          toast.success("Você assumiu esta entrega!");
        },
        onError: (err: any) => {
          toast.error("Erro ao assumir entrega: " + err.message);
        },
      }
    );
  };

  const handleMarcarEntregue = (pedidoId: string) => {
    updateStatusMutation.mutate(
      { id: pedidoId, status: "entregue" },
      {
        onSuccess: () => {
          toast.success("Pedido entregue com sucesso! Bom trabalho 🎉");
        },
        onError: (err: any) => {
          toast.error("Erro ao finalizar entrega: " + err.message);
        },
      }
    );
  };

  // Filter orders for the waiter
  // Waiters need to deliver orders that are "pronto" (not yet assigned or assigned to them)
  // or "garcom_a_caminho" assigned to them specifically.
  const pedidosProntos = pedidos.filter(
    (p) => p.status === "pronto"
  );
  
  const minhasEntregas = pedidos.filter(
    (p) => p.status === "garcom_a_caminho" && p.garcom_id === user?.id
  );

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
      {/* Header */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-3 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-2.5">
          <Logo size={34} />
          <div>
            <h1 className="text-lg font-black tracking-tight leading-none uppercase text-primary">GARÇOM PANEL</h1>
            <p className="text-[10px] text-muted-foreground font-semibold">Entregas de Pedidos</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="h-8 w-8 rounded-full border-slate-200 dark:border-slate-800"
          >
            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={async () => {
              await supabase.auth.signOut();
              toast.success("Sessão encerrada");
              window.location.href = "/auth";
            }}
            className="h-8 w-8 rounded-full text-muted-foreground"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Main content optimized for mobile-first scrolling */}
      <main className="flex-1 p-4 space-y-6 max-w-md mx-auto w-full">
        {/* Minhas Entregas (Em Andamento) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-indigo-500 animate-ping" /> Minhas Entregas
            </h2>
            <Badge className="bg-indigo-600 dark:bg-indigo-500 text-white font-bold text-xs px-2 py-0.5">
              {minhasEntregas.length}
            </Badge>
          </div>

          {isLoading ? (
            <div className="flex h-20 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
            </div>
          ) : minhasEntregas.length === 0 ? (
            <Card className="border-dashed border-2 bg-transparent text-center p-4">
              <CardDescription className="text-xs">Nenhum pedido em rota de entrega.</CardDescription>
            </Card>
          ) : (
            minhasEntregas.map((pedido) => (
              <Card key={pedido.id} className="border-indigo-200 dark:border-indigo-950 bg-indigo-50/20 dark:bg-indigo-950/5 shadow-md">
                <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-lg">#{pedido.numero}</span>
                    <Badge variant="outline" className="font-bold border-indigo-200 bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400">
                      Mesa {pedido.mesa_numero}
                    </Badge>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {formatDistanceToNow(new Date(pedido.created_at), { locale: ptBR })}
                  </span>
                </CardHeader>
                <CardContent className="p-4 pt-1 space-y-3">
                  {pedido.mesa_nome && (
                    <p className="text-xs text-indigo-700 dark:text-indigo-400 font-semibold flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" /> Setor: {pedido.mesa_nome}
                    </p>
                  )}
                  
                  <ul className="text-xs space-y-1 text-slate-700 dark:text-slate-300 bg-card border rounded p-2">
                    {pedido.itens.map((item) => (
                      <li key={item.id} className="font-bold flex items-start">
                        <span className="text-indigo-600 dark:text-indigo-400 mr-1.5">{item.quantidade}x</span>
                        <span className="flex-1">{item.nome_produto}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    onClick={() => handleMarcarEntregue(pedido.id)}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm h-11 gap-2 rounded-xl"
                  >
                    <CheckCircle2 className="h-4.5 w-4.5" /> Entregue à Mesa
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Prontos para retirar na Cozinha */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Retirar na Cozinha
            </h2>
            <Badge className="bg-emerald-600 dark:bg-emerald-500 text-white font-bold text-xs px-2 py-0.5">
              {pedidosProntos.length}
            </Badge>
          </div>

          {isLoading ? (
            <div className="flex h-20 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
            </div>
          ) : pedidosProntos.length === 0 ? (
            <Card className="border-dashed border-2 bg-transparent text-center p-4">
              <CardDescription className="text-xs">Nenhum pedido aguardando retirada na cozinha.</CardDescription>
            </Card>
          ) : (
            pedidosProntos.map((pedido) => (
              <Card key={pedido.id} className="border-emerald-200 dark:border-emerald-950 shadow">
                <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-lg">#{pedido.numero}</span>
                    <Badge className="font-bold bg-emerald-600 dark:bg-emerald-500 text-white">
                      Mesa {pedido.mesa_numero}
                    </Badge>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {formatDistanceToNow(new Date(pedido.created_at), { locale: ptBR })}
                  </span>
                </CardHeader>
                <CardContent className="p-4 pt-1 space-y-3">
                  {pedido.mesa_nome && (
                    <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-muted-foreground" /> Setor: {pedido.mesa_nome}
                    </p>
                  )}

                  <ul className="text-xs space-y-1 text-slate-700 dark:text-slate-300 bg-card border rounded p-2">
                    {pedido.itens.map((item) => (
                      <li key={item.id} className="font-bold flex items-start">
                        <span className="text-emerald-600 dark:text-emerald-400 mr-1.5">{item.quantidade}x</span>
                        <span className="flex-1">{item.nome_produto}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    onClick={() => handleAssumirEntrega(pedido.id)}
                    className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 dark:text-slate-950 text-white font-bold text-sm h-11 gap-2 rounded-xl"
                  >
                    <Navigation className="h-4 w-4 fill-current" /> Retirar & Entregar
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
