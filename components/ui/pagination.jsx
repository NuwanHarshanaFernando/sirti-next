import * as React from "react"
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MoreHorizontalIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button";

function Pagination({
  className,
  ...props
}) {
  return (
    (<nav
      role="navigation"
      aria-label="pagination"
      data-slot="pagination"
      className={cn("mx-auto flex w-full justify-center", className)}
      {...props} />)
  );
}

function PaginationContent({
  className,
  ...props
}) {
  return (
    (<ul
      data-slot="pagination-content"
      className={cn("flex flex-row items-center gap-1", className)}
      {...props} />)
  );
}

function PaginationItem({
  ...props
}) {
  return <li data-slot="pagination-item" {...props} />;
}

function PaginationLink({
  className,
  isActive,
  size = "icon",
  ...props
}) {
  return (
    (<a
      aria-current={isActive ? "page" : undefined}
      data-slot="pagination-link"
      data-active={isActive}
      className={cn(buttonVariants({
        variant: isActive ? "paginationActive" : "pagination",
        size,
      }), className)}
      {...props} />)
  );
}

function PaginationPrevious({
  className,
  ...props
}) {
  return (
    (<PaginationLink
      aria-label="Go to previous page"
      size="default"
      className={cn("w-9 h-9 flex flex-row justify-center items-center border-2 rounded-lg border-orochimaru", className)}
      {...props}>
      <ChevronLeftIcon className="stroke-orochimaru" />
    </PaginationLink>)
  );
}

function PaginationNext({
  className,
  ...props
}) {
  return (
    (<PaginationLink
      aria-label="Go to next page"
      size="default"
      className={cn("w-9 h-9 flex flex-row justify-center items-center border-2 rounded-lg border-orochimaru", className)}
      {...props}>
      <ChevronRightIcon className="stroke-orochimaru" />
    </PaginationLink>)
  );
}

function PaginationEllipsis({
  className,
  ...props
}) {
  return (
    (<span
      aria-hidden
      data-slot="pagination-ellipsis"
      className={cn("flex size-9 items-center justify-center", className)}
      {...props}>
      <MoreHorizontalIcon className="size-4" />
      <span className="sr-only">More pages</span>
    </span>)
  );
}

export {
  Pagination,
  PaginationContent,
  PaginationLink,
  PaginationItem,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
}
