import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

type RealtimeEvent = "INSERT" | "UPDATE" | "DELETE" | "*";

interface RealtimeOptions {
  table: string;
  schema?: string;
  event?: RealtimeEvent;
  filter?: string;
  onData: () => void;
}

export function useRealtime({ table, schema = "public", event = "*", filter, onData }: RealtimeOptions) {
  const onDataRef = useRef(onData);
  onDataRef.current = onData;

  useEffect(() => {
    const channelName = `realtime:${schema}:${table}:${filter ?? "all"}:${Date.now()}`;
    let channel: RealtimeChannel = supabase.channel(channelName);

    const config: Parameters<typeof channel.on>[1] = {
      event,
      schema,
      table,
      ...(filter ? { filter } : {}),
    };

    channel = channel.on("postgres_changes" as Parameters<typeof channel.on>[0], config, () => {
      onDataRef.current();
    });

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, schema, event, filter]);
}
