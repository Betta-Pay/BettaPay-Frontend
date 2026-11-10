import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="skeleton"
      aria-busy="true"
      className={cn(
        "animate-pulse rounded-md bg-muted-foreground/10",
        "motion-reduce:animate-none motion-reduce:bg-muted-foreground/20 dark:motion-reduce:bg-muted-foreground/25",
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }
