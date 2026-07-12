import * as React from "react"
import { cn } from "@/lib/utils"
import {
  SelectTrigger,
  SelectContent,
} from "@/components/ui/select"

function AuthSelectTrigger({
  className,
  size = "default",
  ...props
}: React.ComponentProps<typeof SelectTrigger>) {
  return (
    <SelectTrigger
      size={size}
      className={cn(
        "h-12 bg-card border border-border text-foreground rounded-xl text-sm focus:ring-1 focus:ring-ring focus:border-ring transition-all",
        className
      )}
      {...props}
    />
  )
}

function AuthSelectContent({
  className,
  ...props
}: React.ComponentProps<typeof SelectContent>) {
  return (
    <SelectContent
      className={cn(
        "bg-card border-border text-foreground",
        className
      )}
      {...props}
    />
  )
}

export { AuthSelectTrigger, AuthSelectContent }
