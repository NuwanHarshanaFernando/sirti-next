"use client";

import { Toaster as Sonner } from "sonner";
import { CircleCheckBig, ShieldX } from "lucide-react";
import { cn } from "@/lib/utils";

const Toaster = ({ developmentMode = false, ...props }) => {
  return (
    <Sonner      className={cn("fixed bottom-4 right-4 z-50", props.className)}
      closeButton={true}
      dismissible={true}
      icons={{
        success: <CircleCheckBig className="text-amalfitanAzure" />,
        error: <ShieldX className="text-destructive" />,
      }}
      toastOptions={{
        classNames: {
          toast:
            cn("bg-black !text-amalfitanAzure border border-border shadow-lg rounded-md p-4 relative flex !gap-3"),
          title: cn("font-medium text-amalfitanAzure text-base !font-semibold"),
          description: cn("!text-black/65 text-sm -mt-1"),
          actionButton: cn("bg-primary text-primary-foreground"),
          cancelButton: cn("bg-muted text-muted-foreground"),
          closeButton:
            cn("absolute top-2 right-2 p-1 rounded-full opacity-70 hover:opacity-100 hover:bg-gray-100"),
        },
        duration: developmentMode ? Infinity : 5000,
      }}
      {...props}
    />
  );
};

export { Toaster };
