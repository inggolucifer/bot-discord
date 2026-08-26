import * as React from "react"
import { cn } from "@/lib/utils"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "rank"
  rank?: string
}

function Badge({ className, variant = "default", rank, ...props }: BadgeProps) {
  let rankVariant = variant;
  if (variant === "rank" && rank) {
      const lowerRank = rank.toLowerCase();
      if (lowerRank === 'mythical' || lowerRank === 'divine') rankVariant = "destructive";
      else if (lowerRank === 'legendary') rankVariant = "warning";
      else if (lowerRank === 'epic' || lowerRank === 'rare') rankVariant = "secondary";
      else rankVariant = "default"; // Common/Uncommon
  }

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        {
          "border-transparent bg-[#c5a880] text-[#1a1a1a]": rankVariant === "default",
          "border-transparent bg-[#1e3a5f] text-white": rankVariant === "secondary",
          "border-transparent bg-[#8b0000] text-white": rankVariant === "destructive",
          "border-transparent bg-[#1f402e] text-white": rankVariant === "success",
          "border-transparent bg-[#b8860b] text-white": rankVariant === "warning",
          "text-[#c5a880] border-[#c5a880]": rankVariant === "outline",
        },
        className
      )}
      {...props}
    />
  )
}

export { Badge }
