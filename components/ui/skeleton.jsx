import { cn } from "@/lib/utils"

function Skeleton({
  className,
  shimmer = true,
  ...props
}) {
  return shimmer ? (
    <div
      data-slot="skeleton"
      className={cn(
        "relative overflow-hidden bg-gray-200 rounded-md",
        className
      )}
      {...props}
    >
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-gray-100 to-transparent" />
    </div>
  ) : (
    <div
      data-slot="skeleton"
      className={cn("bg-gray-200 animate-pulse rounded-md", className)}
      {...props}
    />
  );
}

export { Skeleton }
