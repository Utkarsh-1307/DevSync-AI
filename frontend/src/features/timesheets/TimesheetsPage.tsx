import { useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { timesheetsApi } from "@/features/time-logs/api";

interface Props {
  workspaceId: string;
}

function getMondayOfWeek(d: Date) {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.getFullYear(), d.getMonth(), diff);
}

function formatDate(d: Date) {
  return d.toISOString().split("T")[0];
}

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function TimesheetsPage({ workspaceId }: Props) {
  const [weekOffset, setWeekOffset] = useState(0);

  const monday = getMondayOfWeek(new Date());
  monday.setDate(monday.getDate() + weekOffset * 7);
  const weekStart = formatDate(monday);

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    return formatDate(d);
  });

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["timesheets", workspaceId, weekStart],
    queryFn: () => timesheetsApi.get(workspaceId, weekStart),
    enabled: !!workspaceId,
  });

  const weekLabel = `${new Date(weekDays[0]).toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${new Date(weekDays[6]).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;

  return (
    <div className="flex flex-col h-full bg-gray-950 text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-brand-400" />
          <h1 className="text-lg font-semibold">Timesheets</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWeekOffset((w) => w - 1)}
            className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm text-gray-300 min-w-[200px] text-center">{weekLabel}</span>
          <button
            onClick={() => setWeekOffset((w) => w + 1)}
            className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          {weekOffset !== 0 && (
            <button
              onClick={() => setWeekOffset(0)}
              className="text-xs text-brand-400 hover:text-brand-300 transition-colors"
            >
              Today
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto px-6 py-4">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400 border-b border-gray-800">
                <th className="text-left py-2 font-medium pr-4">Member</th>
                {weekDays.map((day, i) => (
                  <th key={day} className="text-center py-2 font-medium px-3">
                    <div>{DAY_LABELS[i]}</div>
                    <div className="text-xs text-gray-500 font-normal">
                      {new Date(day).getDate()}
                    </div>
                  </th>
                ))}
                <th className="text-center py-2 font-medium px-3 text-brand-400">Total</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-24 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-3">
                      <CalendarDays className="h-12 w-12 opacity-30" />
                      <p>No time logged this week</p>
                    </div>
                  </td>
                </tr>
              ) : (
                entries.map((entry) => (
                  <tr key={entry.user.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    <td className="py-3 pr-4 text-gray-100 font-medium">{entry.user.full_name}</td>
                    {weekDays.map((day) => {
                      const hours = entry.daily_hours[day] ?? 0;
                      return (
                        <td key={day} className="py-3 px-3 text-center">
                          {hours > 0 ? (
                            <span className="font-semibold text-brand-400">{hours}h</span>
                          ) : (
                            <span className="text-gray-700">—</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="py-3 px-3 text-center font-semibold text-white">
                      {entry.total_hours}h
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {entries.length > 0 && (
              <tfoot>
                <tr className="border-t border-gray-700 font-semibold text-gray-300">
                  <td className="py-3 pr-4">Total</td>
                  {weekDays.map((day) => {
                    const total = entries.reduce((sum, e) => sum + (e.daily_hours[day] ?? 0), 0);
                    return (
                      <td key={day} className="py-3 px-3 text-center">
                        {total > 0 ? `${total}h` : "—"}
                      </td>
                    );
                  })}
                  <td className="py-3 px-3 text-center text-brand-400">
                    {entries.reduce((sum, e) => sum + e.total_hours, 0)}h
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        )}
      </div>
    </div>
  );
}
