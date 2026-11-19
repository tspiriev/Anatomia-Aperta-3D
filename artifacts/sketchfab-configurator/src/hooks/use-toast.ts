import * as React from "react"

export function useToast() {
  const [toasts, setToasts] = React.useState([])
  return {
    toasts,
    toast: () => {},
    dismiss: () => {},
  }
}
