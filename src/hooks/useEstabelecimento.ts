import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Estabelecimento {
  id: number;
  nome: string;
  logo_url: string | null;
  updated_at: string;
  whatsapp?: string | null;
  endereco?: string | null;
  cor_primaria?: string | null;
  cor_secundaria?: string | null;
  horario?: string | null;
  onboarding_concluido?: boolean | null;
}

export function useEstabelecimento() {
  return useQuery({
    queryKey: ["estabelecimento"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("estabelecimento")
        .select("*")
        .eq("id", 1)
        .maybeSingle();
      if (error) throw error;
      return data as Estabelecimento | null;
    },
    staleTime: 60_000,
  });
}

export function useSalvarEstabelecimento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: Partial<Estabelecimento>) => {
      const { error } = await supabase
        .from("estabelecimento")
        .upsert({ id: 1, ...values, updated_at: new Date().toISOString() });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["estabelecimento"] });
    },
  });
}
