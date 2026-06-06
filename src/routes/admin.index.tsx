import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEstabelecimento } from "@/hooks/useEstabelecimento";
import { useRealtime } from "@/hooks/useRealtime";
import { StatusBadge } from "@/components/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ClipboardList, ChefHat, CheckCircle2, TrendingUp,
  ArrowRight, Clock, Sparkles,
} from "lucide-react";
import { formatBRL } from "@/lib/cart";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Dashboard — Admin" }] }),
  component: AdminDashboard,
});

function AdminDashboard() {
  const { data: estab, isLoading: loadEstab } = useEstabelecimento();

  // Redirect to onboarding if not completed
  if (!loadEstab && estab && estab.onboarding_concluido === false) {
    return <Navigate to="/admin/onboarding" />;
  }

  const hoje = new Date().toISOString().split("T")[0];

  const { data: stats, isLoading, refetch } = useQuery({
    queryKey: ["admin-dashboard-stats"],
    queryFn: async () => {
      const [pedidosHoje, emPreparo, prontos, recebidos] = await Promise.all([
        supabase.from("pedidos").select("id, total, status").gte("created_at", hoje + "T00:00:00"),
        supabase.from("pedidos").select("id").eq("status", "em_preparo"),
        supabase.from("pedidos").select("id").eq("status", "pronto"),
        supabase.from("pedidos").select("id").eq("status", "recebido"),
      ]);
      const totalHoje = (pedidosHoje.data ?? []).reduce((s, p) => s + Number(p.total), 0);
      const qtdHoje = (pedidosHoje.data ?? []).length;
      return {
        totalHoje,
        qtdHoje,
        emPreparo: emPreparo.data?.length ?? 0,
        prontos: prontos.data?.length ?? 0,
        recebidos: recebidos.data?.length ?? 0,
      };
    },
  });

  useRealtime({ table: "pedidos", onData: () => refetch() });

  const { data: ultimosPedidos, refetch: refetchPedidos } = useQuery({
    queryKey: ["admin-ultimos-pedidos"],
    queryFn: async () => {
      const { data } = await supabase
        .from("pedidos")
        .select("*, mesas(numero, nome)")
        .order("created_at", { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });
  useRealtime({ table: "pedidos", onData: () => refetchPedidos() });

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
          {loadEstab ? <Skeleton className="h-8 w-48" /> : `Olá, ${estab?.nome ?? "Administrador"} 👋`}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
        </p>
      </div>

      {/* Stat cards */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))
        ) : (
          <>
            <StatCard
              label="Receita Hoje"
              value={formatBRL(stats?.totalHoje ?? 0)}
              icon={<TrendingUp className="h-5 w-5" />}
              color="from-emerald-500/20 to-emerald-500/5"
              iconColor="text-emerald-500"
            />
            <StatCard
              label="Pedidos Hoje"
              value={String(stats?.qtdHoje ?? 0)}
              icon={<ClipboardList className="h-5 w-5" />}
              color="from-blue-500/20 to-blue-500/5"
              iconColor="text-blue-500"
            />
            <StatCard
              label="Em Preparo"
              value={String(stats?.emPreparo ?? 0)}
              icon={<ChefHat className="h-5 w-5" />}
              color="from-amber-500/20 to-amber-500/5"
              iconColor="text-amber-500"
              pulse={!!stats?.emPreparo}
            />
            <StatCard
              label="Aguardando"
              value={String((stats?.recebidos ?? 0) + (stats?.prontos ?? 0))}
              icon={<Clock className="h-5 w-5" />}
              color="from-purple-500/20 to-purple-500/5"
              iconColor="text-purple-500"
              pulse={!!((stats?.recebidos ?? 0) + (stats?.prontos ?? 0))}
            />
          </>
        )}
      </div>

      {/* Quick actions */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Link
          to="/cozinha"
          className="group flex items-center gap-4 rounded-2xl border bg-card p-5 transition-all hover:border-amber-500/50 hover:shadow-lg"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
            <ChefHat className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <p className="font-semibold">Cozinha</p>
            <p className="text-xs text-muted-foreground">Gerenciar preparo</p>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
        </Link>
        <Link
          to="/garcom"
          className="group flex items-center gap-4 rounded-2xl border bg-card p-5 transition-all hover:border-purple-500/50 hover:shadow-lg"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/10 text-purple-500">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <p className="font-semibold">Garçom</p>
            <p className="text-xs text-muted-foreground">Entregar pedidos</p>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
        </Link>
        <Link
          to="/admin/pedidos"
          className="group flex items-center gap-4 rounded-2xl border bg-card p-5 transition-all hover:border-primary/50 hover:shadow-lg"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ClipboardList className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <p className="font-semibold">Todos Pedidos</p>
            <p className="text-xs text-muted-foreground">Histórico completo</p>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
        </Link>
      </div>

      {/* Últimos pedidos */}
      <div className="rounded-2xl border bg-card">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="font-semibold">Últimos pedidos</h2>
          <Link to="/admin/pedidos" className="text-xs text-primary hover:underline">
            Ver todos
          </Link>
        </div>
        {!ultimosPedidos?.length ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <Sparkles className="h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Nenhum pedido ainda hoje.</p>
          </div>
        ) : (
          <ul className="divide-y">
            {ultimosPedidos.map((p: any) => (
              <li key={p.id} className="flex items-center gap-4 px-5 py-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">
                  #{p.numero}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">
                    Mesa {p.mesas?.numero}{p.mesas?.nome ? ` · ${p.mesas.nome}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(p.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold">{formatBRL(Number(p.total))}</span>
                  <StatusBadge status={p.status} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label, value, icon, color, iconColor, pulse,
}: {
  label: string; value: string; icon: React.ReactNode;
  color: string; iconColor: string; pulse?: boolean;
}) {
  return (
    <div className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br ${color} p-5`}>
      <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-background/60 ${iconColor}`}>
        {icon}
      </div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      {pulse && (
        <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-current opacity-70">
          <span className="absolute inset-0 animate-ping rounded-full bg-current opacity-50" />
        </span>
      )}
    </div>
  );
}
