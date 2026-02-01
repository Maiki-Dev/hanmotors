import * as React from "react"
import { cn } from "../../lib/utils"
import { X } from "lucide-react"

const DialogContext = React.createContext({})

const Dialog = ({ open, onOpenChange, children }) => {
  if (!open) return null
  
  return (
    <DialogContext.Provider value={{ open, onOpenChange }}>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0">
          {children}
      </div>
    </DialogContext.Provider>
  )
}

const DialogContent = ({ className, children, onClose, ...props }) => {
  const { onOpenChange } = React.useContext(DialogContext)
  
  // Use provided onClose or fallback to context's onOpenChange
  const handleClose = () => {
    if (onClose) {
      onClose()
    } else if (onOpenChange) {
      onOpenChange(false)
    }
  }

  return (
    <div
      className={cn(
        "relative z-50 grid w-full max-w-lg gap-4 border bg-background p-6 shadow-lg duration-200 sm:rounded-lg md:w-full animate-in fade-in-0 zoom-in-95 slide-in-from-left-1/2 slide-in-from-top-[48%]",
        className
      )}
      {...props}
    >
      <button
        onClick={handleClose}
        className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
      >
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </button>
      {children}
    </div>
  )
}

const DialogHeader = ({ className, ...props }) => (
  <div
    className={cn("flex flex-col space-y-1.5 text-center sm:text-left", 