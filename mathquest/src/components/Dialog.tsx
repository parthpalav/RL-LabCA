import { useEffect, useRef, type ReactNode } from 'react'
export function Dialog({
  title,
  children,
  onClose,
}: {
  title: string
  children: ReactNode
  onClose: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const previous =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null
    const dialog = ref.current
    dialog?.showModal()
    return () => {
      dialog?.close()
      previous?.focus()
    }
  }, [])
  return (
    <dialog
      ref={ref}
      className="modal"
      aria-labelledby="dialog-title"
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
    >
      <h2 id="dialog-title">{title}</h2>
      {children}
    </dialog>
  )
}
