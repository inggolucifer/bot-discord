import * as React from "react"
import { cn } from "@/lib/utils"

interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  description?: string
  action?: React.ReactNode
}

export function PageHeader({ title, description, action, className, ...props }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8 gap-4", className)} {...props}>
      <div>
        <h1 className="text-3xl sm:text-4xl font-bold font-serif text-[#c5a880] tracking-wider mb-2">
          {title}
        </h1>
        {description && (
          <p className="text-sm sm:text-base text-gray-400 max-w-2xl">
            {description}
          </p>
        )}
      </div>
      {action && (
        <div className="shrink-0 w-full sm:w-auto">
          {action}
        </div>
      )}
    </div>
  )
}
