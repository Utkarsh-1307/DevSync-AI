import { formatDistanceToNow } from "date-fns";
import { Bell, CheckCheck } from "lucide-react";
import { useNotifications, useMarkAllRead } from "./hooks";

interface Props {
  workspaceId: string;
}

export function NotificationsPage({ workspaceId }: Props) {
  const { data, isLoading } = useNotifications(workspaceId);
  const markAll = useMarkAllRead(workspaceId);
  const items = data?.items ?? [];

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-gray-400" />
          <h1 className="font-semibold text-gray-900 dark:text-gray-100">Notifications</h1>
        </div>
        {items.some((n) => !n.is_read) && (
          <button
            onClick={() => markAll.mutate()}
            disabled={markAll.isPending}
            className="flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700 disabled:opacity-50"
          >
            <CheckCheck className="h-4 w-4" />
            Mark all read
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="space-y-px pt-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex gap-3 px-6 py-3 animate-pulse">
                <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
                <div className="flex-1 space-y-2 pt-1">
                  <div className="h-3 w-3/4 rounded bg-gray-200 dark:bg-gray-700" />
                  <div className="h-3 w-1/2 rounded bg-gray-200 dark:bg-gray-700" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && items.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
            <Bell className="h-16 w-16 opacity-20" />
            <p className="text-sm">No notifications yet</p>
          </div>
        )}

        {items.map((n) => (
          <div
            key={n.id}
            className={`flex gap-3 px-6 py-3 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${
              !n.is_read ? "bg-brand-50 dark:bg-brand-900/10" : ""
            }`}
          >
            <div className="h-8 w-8 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center flex-shrink-0">
              <Bell className="h-4 w-4 text-brand-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                {n.title}
              </p>
              {n.body && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                  {n.body}
                </p>
              )}
              <p className="text-xs text-gray-400 mt-1">
                {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
              </p>
            </div>
            {!n.is_read && (
              <div className="h-2 w-2 rounded-full bg-brand-500 flex-shrink-0 mt-2" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
