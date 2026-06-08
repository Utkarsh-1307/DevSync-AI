import { useEffect } from "react";
import { socket } from "@/lib/socket";
import { useWorkspaceStore } from "@/stores/workspaceStore";

export function useSocketConnection() {
  const activeWorkspace = useWorkspaceStore((s) => s.activeWorkspace);

  useEffect(() => {
    if (!activeWorkspace) return;
    socket.connect(activeWorkspace.id);
    return () => socket.disconnect();
  }, [activeWorkspace?.id]);
}

export function useSocketEvent<T>(event: string, handler: (data: T) => void) {
  useEffect(() => {
    const unsub = socket.on(event, handler as (data: unknown) => void);
    return unsub;
  }, [event, handler]);
}
