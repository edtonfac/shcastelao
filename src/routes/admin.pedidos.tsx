import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { usePedidos, useAtualizarStatus, type StatusPedido, type PedidoComDetalhes } from "@/hooks/usePedidos";
import { useRealtime } from "@/hooks/useRealtime";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  Receipt,
  Utensils,
  ArrowRight,
  TrendingUp,
  PackageCheck,
  RefreshCw,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/admin/pedidos")({
  head: () => ({ meta: [{ title: "Painel de Pedidos | Admin" }] }),
  component: AdminPedidosPage,
});

function AdminPedidosPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [expandedPedidoId, setExpandedPedidoId] = useState<string | null>(null);

  // Fetch orders
  const { data: pedidos = [], isLoading, refetch } = usePedidos();
  const updateStatusMutation = useAtualizarStatus();

  // Listen for real-time changes
  useRealtime({
    table: "pedidos",
    onData: () => {
      refetch();
      // Play notification sound
      try {
        const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-120.wav");
        audio.volume = 0.5;
        audio.play();
      } catch (e) {
        console.warn("Could not play notification sound:", e);
      }
      toast.info("Pedidos atualizados em tempo real!");
    },
  });

  const handleStatusChange = (id: string, newStatus: StatusPedido) => {
    updateStatusMutation.mutate(
      { id, status: newStatus },
      {
        onSuccess: () => {
          toast.success(`Pedido atualizado para: ${newStatus.replace("_", " ")}`);
        },
        onError: (err: any) => {
          toast.error("Erro ao atualizar pedido: " + err.message);
        },
      }
    );
  };

  const toggleExpand = (id: string) => {
    setExpandedPedidoId(expandedPedidoId === id ? null : id);
  };

  // Filter and search pedidos
  const filteredPedidos = pedidos.filter((p) => {
    const statusMatches = statusFilter === "todos" || p.status === statusFilter;
    const searchMatches =
      p.numero.toString().includes(searchTerm) ||
      `mesa ${p.mesa_numero}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.mesa_nome && p.mesa_nome.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return statusMatches && searchMatches;
  });

  // Calculate quick stats
  const totalHoje = pedidos.length;
  const emPreparo = pedidos.filter((p) => p.status === "em_preparo").length;
  const recebidos = pedidos.filter((p) => p.status === "recebido").length;
  const prontos = pedidos.filter((p) => p.status === "pronto").length;

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Pedidos</h1>
          <p className="text-muted-foreground">
            Acompanhe e gerencie todos os pedidos do estabelecimento em tempo real.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => refetch()} variant="outline" size="sm" className="gap-1">
            <RefreshCw className="h-4 w-4" /> Atualizar
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Pedidos</CardTitle>
            <Receipt className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalHoje}</div>
            <p className="text-xs text-muted-foreground">Registrados no sistema</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Novos / Recebidos</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recebidos}</div>
            <p className="text-xs text-muted-foreground">Aguardando preparo</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-white dark:from-orange-950/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Preparo</CardTitle>
            <Utensils className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{emPreparo}</div>
            <p className="text-xs text-muted-foreground">Cozinha trabalhando</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prontos p/ Entrega</CardTitle>
            <PackageCheck className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{prontos}</div>
            <p className="text-xs text-muted-foreground">Garçom acionado</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4 flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nº do pedido ou mesa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Status</SelectItem>
                <SelectItem value="recebido">Recebido</SelectItem>
                <SelectItem value="em_preparo">Em Preparo</SelectItem>
                <SelectItem value="pronto">Pronto</SelectItem>
                <SelectItem value="garcom_a_caminho">A Caminho</SelectItem>
                <SelectItem value="entregue">Entregue</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Orders List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex h-40 items-center justify-center">
            <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredPedidos.length === 0 ? (
          <Card className="text-center p-8">
            <CardDescription className="text-lg">Nenhum pedido encontrado com os filtros aplicados.</CardDescription>
          </Card>
        ) : (
          filteredPedidos.map((pedido) => {
            const isExpanded = expandedPedidoId === pedido.id;
            return (
              <Card
                key={pedido.id}
                className={`transition-all border-l-4 ${
                  pedido.status === "recebido"
                    ? "border-l-blue-500"
                    : pedido.status === "em_preparo"
                    ? "border-l-orange-500"
                    : pedido.status === "pronto"
                    ? "border-l-emerald-500"
                    : pedido.status === "garcom_a_caminho"
                    ? "border-l-indigo-500"
                    : pedido.status === "entregue"
                    ? "border-l-slate-300"
                    : "border-l-red-500"
                }`}
              >
                <div
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 cursor-pointer gap-4"
                  onClick={() => toggleExpand(pedido.id)}
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-extrabold text-lg">#{pedido.numero}</span>
                    <Badge variant="secondary" className="font-bold text-sm bg-secondary px-2.5 py-1">
                      Mesa {pedido.mesa_numero} {pedido.mesa_nome ? `(${pedido.mesa_nome})` : ""}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      há {formatDistanceToNow(new Date(pedido.created_at), { locale: ptBR })}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                    <span className="font-bold text-base">
                      {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(pedido.total)}
                    </span>
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <StatusBadge status={pedido.status} />
                      <Select
                        value={pedido.status}
                        onValueChange={(val) => handleStatusChange(pedido.id, val as StatusPedido)}
                      >
                        <SelectTrigger className="w-[140px] h-9">
                          <SelectValue placeholder="Mudar status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="recebido">Recebido</SelectItem>
                          <SelectItem value="em_preparo">Em Preparo</SelectItem>
                          <SelectItem value="pronto">Pronto</SelectItem>
                          <SelectItem value="garcom_a_caminho">A Caminho</SelectItem>
                          <SelectItem value="entregue">Entregue</SelectItem>
                          <SelectItem value="cancelado">Cancelado</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button variant="ghost" size="icon" className="h-9 w-9">
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <CardContent className="border-t bg-muted/20 px-6 py-4 space-y-4">
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                        Itens do Pedido
                      </h4>
                      <ul className="divide-y divide-border rounded-lg border bg-card">
                        {pedido.itens.map((item) => (
                          <li key={item.id} className="flex justify-between p-3 items-start">
                            <div className="space-y-1">
                              <p className="font-semibold text-sm">
                                <span className="text-primary font-bold mr-1.5">{item.quantidade}x</span>
                                {item.nome_produto}
                              </p>
                              {item.observacao && (
                                <p className="text-xs bg-amber-50 text-amber-800 dark:bg-amber-950/20 dark:text-amber-300 rounded px-2 py-1 italic font-medium inline-block">
                                  Obs: "{item.observacao}"
                                </p>
                              )}
                            </div>
                            <span className="text-sm font-semibold text-muted-foreground">
                              {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                                item.preco_unitario * item.quantidade
                              )}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pt-2 gap-4">
                      <div className="text-xs text-muted-foreground">
                        <p>ID do pedido: <span className="font-mono">{pedido.id}</span></p>
                        <p>Última atualização: {new Date(pedido.updated_at).toLocaleTimeString()}</p>
                      </div>

                      <div className="flex gap-2 justify-end">
                        {pedido.status === "recebido" && (
                          <Button
                            onClick={() => handleStatusChange(pedido.id, "em_preparo")}
                            size="sm"
                            className="gap-1 bg-orange-600 hover:bg-orange-700 text-white"
                          >
                            Iniciar Preparo <ArrowRight className="h-4 w-4" />
                          </Button>
                        )}
                        {pedido.status === "em_preparo" && (
                          <Button
                            onClick={() => handleStatusChange(pedido.id, "pronto")}
                            size="sm"
                            className="gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            Marcar como Pronto <CheckCircle2 className="h-4 w-4" />
                          </Button>
                        )}
                        {pedido.status !== "cancelado" && pedido.status !== "entregue" && (
                          <Button
                            onClick={() => handleStatusChange(pedido.id, "cancelado")}
                            size="sm"
                            variant="destructive"
                            className="gap-1"
                          >
                            Cancelar Pedido <XCircle className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
