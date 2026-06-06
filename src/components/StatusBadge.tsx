import type { StatusPedido } from "@/hooks/usePedidos";
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<StatusPedido, { label: string; color: string; dot: string }> = {
  recebido: { label: "Recebido", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300", dot: "bg-blue-500" },
  em_preparo: { label: "Em preparo", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300", dot: "bg-amber-500" },
  pronto: { label: "Pronto", color: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300", dot: "bg-green-500" },
  garcom_a_caminho: { label: "A caminho", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300", dot: "bg-purple-500" },
  entregue: { label: "Entregue", color: "bg-muted text-muted-foreground", dot: "bg-gray-400" },
  cancelado: { label: "Cancelado", color: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300", dot: "bg-red-500" },
};

export function StatusBadge({ status, className }: { status: StatusPedido; className?: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.recebido;
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold", cfg.color, className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", cfg.dot)} />
      {cfg.label}
    </span>
  );
}
