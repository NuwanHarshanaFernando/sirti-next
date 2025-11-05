import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Eye } from "lucide-react";
import SecondaryInput from "@/components/shared/secondary-input";
import { Button } from "../ui/button";

import { useState } from "react";
import SecondaryCalendar from "../shared/secondary-calendar";
import Calendar23 from "../calendar-23";

const ViewServiceDialog = ({ assetId, row, onView }) => {
  const [serviceDate, setServiceDate] = useState("");
  const [open, setOpen] = useState(false);

  const handleConfirm = async () => {

    
    if (onView && row && serviceDate) {
      await onView(row, serviceDate);
      setOpen(false);
    }
    else{
      console.error("onView, row, or serviceDate is not defined");
      // Optionally, you can show an error message to the user
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="flex items-center justify-center bg-andreaBlue/10 [&_svg]:stroke-andreaBlue w-9 h-9 [&_svg]:!w-4 [&_svg]:!h-4 rounded-full cursor-pointer">
        <Eye />
      </DialogTrigger>
      <DialogContent className="bg-white shadow-lgdark:bg-black/30">
        <DialogHeader>
          <DialogTitle>Mark Service as Completed</DialogTitle>
          <DialogDescription>
            Are you sure you want to approve the completion of this asset’s
            scheduled service? This action will update the service status in the
            system.
          </DialogDescription>
        </DialogHeader>
        {(!row || row.type !== "completed") && (
          <div className="flex flex-col gap-4">
            <Calendar23
              mode="single"
              value={serviceDate ? new Date(serviceDate) : undefined}
              onValueChange={(date) => {
                if (!date) {
                  setServiceDate("");
                } else if (date instanceof Date && !isNaN(date)) {
                  setServiceDate(date.toISOString().split("T")[0]);
                }
              }}
              placeholder="Service Date"
              className="!w-full"
            />

            <Button variant="secondary" onClick={handleConfirm} >
              Confirm & Mark Completed
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ViewServiceDialog;
