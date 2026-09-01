"use client";
import { useEffect } from "react";
import { toast } from "./Toast";

// We just need a dummy component to ensure the ToastManager's client-side code can run.
export function ToastContainer() {
  useEffect(() => {
    // Just a placeholder to ensure the module is loaded on the client side
  }, []);
  return null;
}
