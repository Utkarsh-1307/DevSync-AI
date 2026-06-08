import { BarChart2 } from "lucide-react";

export default function ReportsPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full bg-gray-950 text-white">
      <BarChart2 className="h-16 w-16 text-brand-400 mb-4 opacity-60" />
      <h1 className="text-2xl font-semibold mb-2">Reports</h1>
      <p className="text-gray-400 text-sm">Advanced analytics and reports are coming soon.</p>
    </div>
  );
}
