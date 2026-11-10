import * as React from "react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui"

export interface AuthInputProps extends React.ComponentProps<typeof Input> {
  error?: string
  errorId?: string
}

const AuthInput = React.forwardRef<HTMLInputElement, AuthInputProps>(
  (
    {
      className,
      id,
      error,
      errorId,
      "aria-invalid": ariaInvalid,
      "aria-describedby": ariaDescribedBy,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId()
    const resolvedId = id ?? generatedId
    const resolvedErrorId = errorId ?? `${resolvedId}-error`
    const hasError = Boolean(error && error.trim().length > 0)
    const combinedDescribedBy = hasError
      ? [ariaDescribedBy, resolvedErrorId].filter(Boolean).join(" ")
      : ariaDescribedBy

    return (
      <>
        <Input
          ref={ref}
          id={resolvedId}
          aria-invalid={hasError ? true : ariaInvalid}
          aria-describedby={combinedDescribedBy}
          className={cn(
            "h-12 bg-card border border-border text-foreground placeholder:text-muted-foreground rounded-xl text-sm focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-ring transition-all",
            hasError && "border-destructive focus-visible:ring-destructive focus-visible:border-destructive",
            className
          )}
          {...props}
        />
        {hasError && (
          <p
            id={resolvedErrorId}
            role="alert"
            aria-live="polite"
            className="mt-1.5 text-xs text-destructive"
          >
            {error}
          </p>
        )}
      </>
    )
  }
)
AuthInput.displayName = "AuthInput"

export { AuthInput }
