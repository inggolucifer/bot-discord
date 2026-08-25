import * as React from "react"
import { Card, CardContent } from "@/components/ui/Card"
import { cn } from "@/lib/utils"

interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  value: React.ReactNode
  icon?: React.ReactNode
  description?: string
  variant?: "default" | "gold" | "red" | "green" | "blue"
}

export function StatCard({ title, value, icon, description, variant = "default", className, ...props }: StatCardProps) {
  return (
    <Card variant={variant} className={cn("overflow-hidden", className)} {...props}>
      <CardContent className="p-4 sm:p-6 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-400 mb-1">{title}</p>
          <div className="text-xl sm:text-2xl font-bold text-[#c5a880]">{value}</div>
          {description && (
            <p className="text-xs text-gray-500 mt-1">{description}</p>
          )}
        </div>
        {icon && (
          <div className="text-3xl opacity-80">
            {icon}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
