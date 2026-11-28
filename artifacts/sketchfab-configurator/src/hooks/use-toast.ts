import * as React from "react"
import type { ToastProps } from "@radix-ui/react-toast"

export type ToasterToast = ToastProps & {
  id: string
  title?: React.ReactNode
  description?: string
  action?: React.ReactNode
}

export function useToast() {
  const [toasts] = React.useState<ToasterToast[]>([])
  return {
    toasts,
    toast: () => {},
    dismiss: () => {},
  }
}
