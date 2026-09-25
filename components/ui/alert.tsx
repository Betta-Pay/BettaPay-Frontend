import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const alertVariants = cva(
  "relative w-full rounded-xl border px-4 py-3 text-sm [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-3.5 [&>svg]:size-4 [&>svg~*]:pl-7",
  {
    variants: {
      variant: {
        default: "border-border bg-card text-foreground",
        info: "border-info/30 bg-info/10 text-info dark:bg-info/20",
        warning: "border-warning/30 bg-warning/10 text-warning dark:bg-warning/20",
        success: "border-success/30 bg-success/10 text-success dark:bg-success/20",
        destructive: "border-destructive/30 bg-destructive/10 text-destructive dark:bg-destructive/20",
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
