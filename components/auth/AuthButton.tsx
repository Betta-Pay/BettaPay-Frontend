import * as React from "react"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui"

export interface AuthButtonProps extends React.ComponentProps<typeof Button> {
  isLoading?: boolean
}

function AuthButton({
  className,
  children,
  isLoading = false,
  disabled,
  ...props
}: AuthButtonProps) {
  return (
    <Button
      disabled={Boolean(disabled || isLoading)}
      aria-busy={isLoading ? "true" : undefined}
      className={cn(
        "relative w-full h-12 bg-primary hover:bg-primary/90 text-white font-semibold text-sm rounded-xl border-0 transition-colors scroll-mb-52",
        className
      )}
      {...props}
    >
      <span
        data-testid="auth-button-label"
        aria-hidden={isLoading ? "true" : undefined}
        className={cn(
          "inline-flex items-center justify-center gap-2",
          isLoading && "opacity-0"
        )}
      >
        {children}
      </span>
      {isLoading && (
        <span
          data-testid="auth-button-spinner"
          className="absolute inset-0 flex items-center justify-center"
        >
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        </span>
      )}
    </Button>
  )
}

export { AuthButton }
