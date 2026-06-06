import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type StatusPedido = Database["public"]["Enums"]["status_pedido"];
export type Pedido = Database["public"]["Tables"]["pedidos"]["Row"];
export type ItemPedido = Database["public"]["Tables"]["itens_pedido"]["Row"];

export interface PedidoComDetalhes extends Pedido {
  mesa_numero: number;
  mesa_nome: string | null;
  itens: ItemPedido[];
}

export function usePedidos(statusFilter?: StatusPedido | StatusPedido[]) {
  return useQuery({
    queryKey: ["pedidos", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("pedidos")
        .select("*, mesas(numero, nome), itens_pedido(*)")
        .order("created_at", { ascending: false });

      if (statusFilter) {
        if (Array.isArray(statusFilter)) {
          query = query.in("status", statusFilter);
        } else {
          query = query.eq("status", statusFilter);
        }
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data ?? []).map((p) => ({
        ...p,
        mesa_numero: (p.mesas as { numero: number; nome: string | null } | null)?.numero ?? 0,
        mesa_nome: (p.mesas as { numero: number; nome: string | null } | null)?.nome ?? null,
        itens: (p.itens_pedido ?? []) as ItemPedido[],
      })) as PedidoComDetalhes[];
    },
    staleTime: 5_000,
  });
}

export function useAtualizarStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, garcom_id }: { id: string; status: StatusPedido; garcom_id?: string }) => {
      const update: Database["public"]["Tables"]["pedidos"]["Update"] = { status };
      if (garcom_id !== undefined) update.garcom_id = garcom_id;
      const { error } = await supabase.from("pedidos").update(update).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pedidos"] });
    },
  });
}
