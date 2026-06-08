import { type ReactNode } from "react";
import { twMerge } from "tailwind-merge";

type Color = "gray" | "blue" | "green" | "yellow" | "red" | "purple" | "indigo";

const colorMap: Record<Color, string> = {
  gray: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
  blue: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  green: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  yellow: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
  red: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  purple: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  indigo: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300",
};

interface BadgeProps {
  children: ReactNode;
  color?: Color;
  className?: string;
}

export function Badge({ children, color = "gray", className }: BadgeProps) {
  return (
    <span
      className={twMerge(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        colorMap[color],
        className
      )}
    >
      {children}
    </span>
  );
}
