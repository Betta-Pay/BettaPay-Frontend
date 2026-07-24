import * as React from "react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui"

const AuthInput = React.forwardRef<HTMLInputElement, React.ComponentProps<typeof Input>>(
  ({ className, ...props }, ref) => (
    <Input
      ref={ref}
      className={cn(
        "h-12 bg-card border border-border text-foreground placeholder:text-muted-foreground rounded-xl text-sm focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-ring transition-all",
        className
      )}
      {...props}
    />
  )
)
AuthInput.displayName = "AuthInput"

export { AuthInput }
