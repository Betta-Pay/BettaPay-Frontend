import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const alertVariants = cva(
  "relative w-full rounded-xl border px-4 py-3 text-sm [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-3.5 [&>svg]:size-4 [&>svg~*]:pl-7",
  {
    variants: {
      variant: {
        default: "border-border bg-card text-foreground",
        info: "border-status-info-border bg-status-info-bg text-status-info",
        warning: "border-status-warn-border bg-status-warn-bg text-status-warn",
        success: "border-status-ok-border bg-status-ok-bg text-status-ok",
        destructive: "border-status-down-border bg-status-down-bg text-status-down",
      },
    },
    defaultVariants: { variant: "default" },
  }
)

function Alert({
  className,
  variant,
  role = "status",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>) {
  return (
    <div role={role} className={cn(alertVariants({ variant }), className)} {...props} />
  )
}

function AlertTitle({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("mb-1 font-semibold leading-none tracking-tight", className)} {...props} />
  )
}

function AlertDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return <div className={cn("text-sm [&_p]:leading-relaxed opacity-90", className)} {...props} />
}

export { Alert, AlertTitle, AlertDescription, alertVariants }
