import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-5 shrink-0 [&_svg]:shrink-0 outline-none aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "bg-amalfitanAzure text-white font-medium shadow-xs hover:bg-amalfitanAzure/90",
        destructive:
          "bg-destructive text-white shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "border-2 text-amalfitanAzure !border-amalfitanAzure bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
        secondary: "bg-amalfitanAzure text-white uppercase font-normal",
        secondaryOutline:
          "border-2 text-black/50 !border-black/10 bg-background uppercase font-normal",
        ghost:
          "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
        link: "!justify-start !text-sm font-medium text-amalfitanAzure",
        carousel: "text-fortressGrey w-10 h-10",
        action: "!rounded-full !p-2 flex items-center justify-center",
        pagination:
          "text-orochimaru w-9 h-9 flex items-center justify-center border-2 border-orochimaru hover:bg-orochimaru/10",
        paginationActive:
          "text-white bg-amalfitanAzure w-9 h-9 flex items-center justify-center",
        multiSelect:
          " h-12 placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30  flex w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
      },
      size: {
        default: "h-12 px-5 py-3 has-[>svg]:px-3 rounded-lg",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-12 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
        carousel: "size-10",
        actionBtn: "w-9 h-9 [&_svg]:!w-4 [&_svg]:!h-4",
        secondary: "h-10 px-6",
        link: "cursor-pointer",
      },
      actionType: {
        edit: "bg-pictureBookGreen/10 [&_svg]:stroke-pictureBookGreen",
        delete:
          "bg-aphrodisiac/10 [&_svg]:stroke-aphrodisiac",
        view: "bg-andreaBlue/10 [&_svg]:stroke-andreaBlue",
        check: "bg-pictureBookGreen/10 [&_svg]:stroke-pictureBookGreen",
        call: "bg-amalfitanAzure/10 [&_svg]:stroke-amalfitanAzure",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function Button({
  className,
  variant,
  size,
  actionType,
  asChild = false,
  ...props
}) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, actionType, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
