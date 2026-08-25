import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" | "success" | "warning"
  size?: "default" | "sm" | "lg" | "icon"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          {
            "bg-[#c5a880] text-[#1a1a1a] hover:bg-[#b0926a]": variant === "default",
            "bg-[#8b0000] text-white hover:bg-[#6b0000]": variant === "destructive",
            "border border-[#c5a880] bg-transparent text-[#c5a880] hover:bg-[#c5a880]/10": variant === "outline",
            "bg-[#1e3a5f] text-white hover:bg-[#152e20]": variant === "secondary",
            "hover:bg-[#c5a880]/10 text-[#c5a880]": variant === "ghost",
            "text-[#c5a880] underline-offset-4 hover:underline": variant === "link",
            "bg-[#1f402e] text-white hover:bg-green-900": variant === "success",
            "bg-[#b8860b] text-white hover:bg-yellow-800": variant === "warning",
            "h-10 px-4 py-2": size === "default",
            "h-9 rounded-md px-3": size === "sm",
            "h-11 rounded-md px-8": size === "lg",
            "h-10 w-10": size === "icon",
          },
          className
        )}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
