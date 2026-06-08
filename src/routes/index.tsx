import { createFileRoute, Navigate, Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/components/AuthProvider";
import { Logo } from "@/components/Logo";
import { Loader2, ChefHat, UtensilsCrossed, LayoutDashboard, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Shalom Castelão — Pedidos por QR Code" },
      { name: "description", content: "Sistema profissional de pedidos por mesa para Shalom Castelão." },
    ],
  }),
  component: Index,
});

function Index() {
  const { user, roles, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-primary/20 via-background to-background px-6 text-center">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_30%_20%,oklch(0.74_0.13_217/0.25),transparent_50%)]" />
        <Logo size={120} className="shadow-xl" />
        <h1 className="mt-8 text-4xl font-bold tracking-tight">Shalom Castelão</h1>
        <p className="mt-3 max-w-sm text-muted-foreground">
          Sistema de pedidos por QR Code. Os clientes acessam o cardápio escaneando o código da mesa.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <a href="/auth" className="inline-flex h-12 items-center justify-center rounded-full bg-primary px-8 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 hover:bg-primary/90">
            Entrar na operação
          </a>
        </div>
        <p className="mt-10 text-xs text-muted-foreground">Clientes não precisam de login — basta escanear o QR Code da mesa.</p>
      </div>
    );
  }

  // Conta usuário logado mas sem função
  if (roles.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6 text-center">
        <div className="max-w-sm">
          <Logo size={80} />
          <h1 className="mt-6 text-2xl font-semibold">Conta sem permissão</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Seu usuário ({user.email}) ainda não possui uma função atribuída. Peça ao administrador para liberar seu acesso em <strong>Equipe & Acessos</strong>.
          </p>
          <Button
            variant="outline"
            className="mt-6 rounded-full"
            onClick={async () => {
              await supabase.auth.signOut();
              toast.success("Sessão encerrada");
              navigate({ to: "/auth" });
            }}
          >
            <LogOut className="mr-2 h-4 w-4" /> Sair
          </Button>
        </div>
      </div>
    );
  }

  // Apenas uma função: redireciona direto
  if (roles.length === 1) {
    const r = roles[0];
    if (r === "admin") return <Navigate to="/admin" />;
    if (r === "cozinha") return <Navigate to="/cozinha" />;
    if (r === "garcom") return <Navigate to="/garcom" />;
  }

  // Múltiplas funções: hub de escolha
  const panels = [
    {
      role: "admin" as const,
      to: "/admin",
      label: "Administração",
      desc: "Cardápio, mesas, pedidos e equipe.",
      Icon: LayoutDashboard,
      tone: "from-primary/20 to-primary/5 text-primary",
    },
    {
      role: "cozinha" as const,
      to: "/cozinha",
      label: "Cozinha",
      desc: "Receber e preparar pedidos.",
      Icon: ChefHat,
      tone: "from-orange-500/20 to-orange-500/5 text-orange-600 dark:text-orange-400",
    },
    {
      role: "garcom" as const,
      to: "/garcom",
      label: "Garçom",
      desc: "Retirar e entregar pedidos prontos.",
      Icon: UtensilsCrossed,
      tone: "from-indigo-500/20 to-indigo-500/5 text-indigo-600 dark:text-indigo-400",
    },
  ].filter((p) => roles.includes(p.role));

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-primary/10 via-background to-background px-6 py-10">
      <div className="w-full max-w-2xl">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo size={72} />
          <h1 className="mt-5 text-2xl font-bold">Olá, {user.email?.split("@")[0]}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Você tem acesso a {panels.length} painéis. Escolha por onde começar.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {panels.map(({ to, label, desc, Icon, tone }) => (
            <Link
              key={to}
              to={to}
              className={`group relative overflow-hidden rounded-3xl border bg-gradient-to-br ${tone} p-6 transition-all hover:scale-[1.02] hover:shadow-xl`}
            >
              <Icon className="h-8 w-8" />
              <h2 className="mt-4 text-lg font-bold text-foreground">{label}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
            </Link>
          ))}
        </div>

        <div className="mt-8 flex justify-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              await supabase.auth.signOut();
              toast.success("Sessão encerrada");
              navigate({ to: "/auth" });
            }}
          >
            <LogOut className="mr-2 h-4 w-4" /> Sair
          </Button>
        </div>
      </div>
    </div>
  );
}
