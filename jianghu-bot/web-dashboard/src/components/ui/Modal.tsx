import * as React from "react"
import { cn } from "@/lib/utils"
import { X } from "lucide-react"
import { Button } from "./Button"

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  footer?: React.ReactNode
  maxWidth?: "sm" | "md" | "lg" | "xl" | "full"
}

export function Modal({ isOpen, onClose, title, children, footer, maxWidth = "md" }: ModalProps) {
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => { document.body.style.overflow = 'unset' }
  }, [isOpen])

  if (!isOpen) return null

  const maxWidthClass = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    full: "max-w-4xl"
  }[maxWidth]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 sm:p-6 animate-in fade-in duration-200">
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={cn(
          "relative w-full bg-[#111] border border-[#c5a880]/30 rounded-lg shadow-2xl flex flex-col max-h-[90vh]",
          maxWidthClass
        )}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-[#333]">
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#c5a880]">{title}</h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full w-8 h-8 -mr-2">
            <X className="w-5 h-5" />
            <span className="sr-only">Tutup</span>
          </Button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto">
          {children}
        </div>

        {footer && (
          <div className="p-4 sm:p-6 border-t border-[#333] bg-black/20 mt-auto rounded-b-lg">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
