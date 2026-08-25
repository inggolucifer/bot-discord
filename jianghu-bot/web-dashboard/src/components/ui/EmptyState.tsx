import * as React from "react"
import { cn } from "@/lib/utils"

interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
}

export function EmptyState({ icon, title, description, action, className, ...props }: EmptyStateProps) {
  return (
    <div
      className={cn("flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-lg border border-dashed border-[#333] bg-black/30", className)}
      {...props}
    >
      {icon && (
        <div className="text-4xl sm:text-6xl text-gray-600 mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-lg sm:text-xl font-semibold text-[#c5a880] mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-gray-400 max-w-md mb-6">{description}</p>
      )}
      {action}
    </div>
  )
}
