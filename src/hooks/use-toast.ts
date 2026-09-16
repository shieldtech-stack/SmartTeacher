"use client";

import { toast as sonnerToast } from "sonner";

interface ToastOptions {
  title?: string;
  description?: string;
  variant?: "default" | "destructive" | "success";
}

export function useToast() {
  const toast = (opts: ToastOptions) => {
    if (opts.title) {
      sonnerToast(opts.title, { description: opts.description });
    } else {
      sonnerToast(opts.description || "");
    }
  };
  return { toast };
}