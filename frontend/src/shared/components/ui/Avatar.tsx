import { type UserSummary } from "@/types";
import { twMerge } from "tailwind-merge";

const COLORS = [
  "bg-purple-500", "bg-blue-500", "bg-green-500", "bg-yellow-500",
  "bg-pink-500", "bg-indigo-500", "bg-red-500", "bg-teal-500",
];

function getColor(name: string): string {
  let hash = 0;
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) & 0xffff;
  return COLORS[hash % COLORS.length];
}

interface AvatarProps {
  user: Pick<UserSummary, "full_name" | "avatar_url">;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}

const sizeMap = { xs: "h-5 w-5 text-xs", sm: "h-7 w-7 text-xs", md: "h-9 w-9 text-sm", lg: "h-11 w-11 text-base" };

export function Avatar({ user, size = "md", className }: AvatarProps) {
  const initials = user.full_name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  if (user.avatar_url) {
    return (
      <img
        src={user.avatar_url}
        alt={user.full_name}
        className={twMerge("rounded-full object-cover", sizeMap[size], className)}
      />
    );
  }

  return (
    <span
      className={twMerge(
        "rounded-full inline-flex items-center justify-center font-semibold text-white select-none",
        getColor(user.full_name),
        sizeMap[size],
        className
      )}
    >
      {initials}
    </span>
  );
}
