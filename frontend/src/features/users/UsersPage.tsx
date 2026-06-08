import { Users } from "lucide-react";
import { useWorkspaceMembers } from "@/features/workspace/hooks";

interface Props {
  workspaceId: string;
}

const ROLE_COLORS = {
  owner: "bg-purple-900 text-purple-300",
  admin: "bg-blue-900 text-blue-300",
  member: "bg-gray-700 text-gray-300",
  guest: "bg-yellow-900 text-yellow-300",
};

export default function UsersPage({ workspaceId }: Props) {
  const { data: members = [], isLoading } = useWorkspaceMembers(workspaceId);

  return (
    <div className="flex flex-col h-full bg-gray-950 text-white">
      <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-800">
        <Users className="h-5 w-5 text-brand-400" />
        <h1 className="text-lg font-semibold">Users</h1>
        <span className="text-xs text-gray-400 ml-1">({members.length})</span>
      </div>

      <div className="flex-1 overflow-auto px-6 py-4">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400 border-b border-gray-800">
                <th className="text-left py-2 font-medium">Member</th>
                <th className="text-left py-2 font-medium">Email</th>
                <th className="text-left py-2 font-medium">Role</th>
                <th className="text-left py-2 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.user.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-brand-700 flex items-center justify-center text-xs font-semibold shrink-0">
                        {m.user.full_name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-gray-100 font-medium">{m.user.full_name}</span>
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-gray-400">
                    {"email" in m.user ? (m.user as { email: string }).email : "—"}
                  </td>
                  <td className="py-3 pr-4">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${ROLE_COLORS[m.role]}`}>
                      {m.role}
                    </span>
                  </td>
                  <td className="py-3 text-gray-400">
                    {new Date(m.joined_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
