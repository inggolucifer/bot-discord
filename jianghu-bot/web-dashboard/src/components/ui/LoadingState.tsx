import * as React from "react"
import { cn } from "@/lib/utils"

interface LoadingStateProps extends React.HTMLAttributes<HTMLDivElement> {
  text?: string
}

export function LoadingState({ text = "Memuat...", className, ...props }: LoadingStateProps) {
  return (
    <div
      className={cn("flex flex-col items-center justify-center p-12 min-h-[300px]", className)}
      {...props}
    >
      <div className="w-12 h-12 border-4 border-[#333] border-t-[#c5a880] rounded-full animate-spin mb-4"></div>
      <p className="text-[#c5a880] font-serif animate-pulse">{text}</p>
    </div>
  )
}
