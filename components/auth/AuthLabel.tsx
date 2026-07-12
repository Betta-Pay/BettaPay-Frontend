import * as React from "react"
import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"

function AuthLabel({ className, ...props }: React.ComponentProps<typeof Label>) {
  return (
    <Label
      className={cn(
        "text-xs font-semibold text-muted-foreground uppercase tracking-wider",
        className
      )}
      {...props}
    />
  )
}

export { AuthLabel }
