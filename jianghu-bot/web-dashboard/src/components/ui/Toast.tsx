import * as React from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { createRoot } from "react-dom/client";

interface ToastOptions {
  message: string;
  type?: "success" | "error" | "info";
  duration?: number;
}

export function Toast({ message, type = "info", onClose }: { message: string, type?: "success" | "error" | "info", onClose: () => void }) {
  React.useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor =
    type === "success" ? "bg-[#1f402e] border-green-800 text-white" :
    type === "error" ? "bg-[#8b0000] border-red-900 text-white" :
    "bg-[#111] border-[#c5a880]/30 text-[#c5a880]";

  return (
    <div className={cn(
      "pointer-events-auto flex w-full max-w-sm items-center justify-between space-x-4 overflow-hidden rounded-md border p-4 shadow-lg transition-all",
      "animate-in slide-in-from-top-full fade-in duration-300",
      bgColor
    )}>
      <div className="flex-1 text-sm font-medium">{message}</div>
      <button onClick={onClose} className="rounded-full p-1 hover:bg-black/20">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

class ToastManager {
  private container: HTMLDivElement | null = null;
  private root: any = null;
  private toasts: { id: number, options: ToastOptions }[] = [];
  private nextId = 0;

  private ensureContainer() {
    if (!this.container) {
      this.container = document.createElement("div");
      this.container.className = "fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none";
      document.body.appendChild(this.container);
      this.root = createRoot(this.container);
    }
  }

  private render() {
    this.ensureContainer();
    if (this.root) {
      this.root.render(
        <>
          {this.toasts.map(t => (
            <Toast key={t.id} message={t.options.message} type={t.options.type} onClose={() => this.remove(t.id)} />
          ))}
        </>
      );
    }
  }

  public show(options: ToastOptions) {
    const id = this.nextId++;
    this.toasts.push({ id, options });
    this.render();
  }

  public remove(id: number) {
    this.toasts = this.toasts.filter(t => t.id !== id);
    this.render();
  }
}

export const toast = new ToastManager();
