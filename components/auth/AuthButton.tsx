import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui"

function AuthButton({ className, ...props }: React.ComponentProps<typeof Button>) {
  return (
    <Button
      className={cn(
        "w-full h-12 bg-primary hover:bg-primary/90 text-white font-semibold text-sm rounded-xl border-0 transition-colors scroll-mb-52",
        className
      )}
      {...props}
    />
  )
}

export { AuthButton }
