import * as React from "react"
import { cn } from "@/lib/utils"

const DropdownMenuContext = React.createContext<{
  isOpen: boolean
  setIsOpen: (isOpen: boolean) => void
}>({
  isOpen: false,
  setIsOpen: () => {}
})

export interface DropdownMenuProps {
  trigger: React.ReactNode
  children: React.ReactNode
  align?: "start" | "center" | "end"
}

export function DropdownMenu({ trigger, children, align = "end" }: DropdownMenuProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const dropdownRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const alignClasses = {
    start: "left-0",
    center: "left-1/2 -translate-x-1/2",
    end: "right-0"
  }

  return (
    <DropdownMenuContext.Provider value={{ isOpen, setIsOpen }}>
      <div className="relative" ref={dropdownRef}>
        <div onClick={() => setIsOpen(!isOpen)}>
          {trigger}
        </div>
        {isOpen && (
          <div className={cn(
            "absolute top-full mt-2 w-56 rounded-md border bg-white shadow-lg z-50",
            alignClasses[align]
          )}>
            <div className="py-1">
              {children}
            </div>
          </div>
        )}
      </div>
    </DropdownMenuContext.Provider>
  )
}

export function DropdownMenuItem({ 
  children, 
  onClick, 
  className 
}: { 
  children: React.ReactNode
  onClick?: () => void
  className?: string 
}) {
  const { setIsOpen } = React.useContext(DropdownMenuContext)
  
  return (
    <button
      onClick={() => {
        onClick?.()
        setIsOpen(false)
      }}
      className={cn(
        "w-full text-left px-4 py-2 text-sm hover:bg-slate-100",
        className
      )}
    >
      {children}
    </button>
  )
}

export function DropdownMenuSeparator() {
  return <div className="border-t my-1" />
}
