import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Combobox } from "@/components/ui/combobox";
import { Label } from "@/components/ui/label";
import { ArrowDownFromLine, ArrowLeftRight } from "lucide-react";
import { useState } from "react";
import SecondaryInput from "../shared/secondary-input";
import { toast } from "sonner";
import TransferDetails from "@/app/(primary)/transfers/[id]/page";

const TransferAssetDialog = ({
  title = "Transfer the Asset to Another",
  description = "The request the party will be notified.",
  icon: Icon = ArrowDownFromLine,
  iconClassName = "stroke-amalfitanAzure",
  triggerClassName = "flex flex-row items-center justify-center w-12 h-12 p-3.5 rounded-lg cursor-pointer bg-amalfitanAzure/5 hover:bg-amalfitanAzure/10",
  holderLabel = "New Holder",
  holderPlaceholder = "Select new holder",
  transferReasonLabel = "Transfer Reason",
  transferReasonPlaceholder = "Enter reason for asset transfer",
  submitButtonText = "Transfer Asset",
  cancelButtonText = "Cancel",
  onSubmit,
  defaultSelectedHolder = "",
  defaultTransferReason = "",
  showHolderSelection = true,
  showTransferReason = true,
  transferReasonRows = 5,
  holders = [],
  setHolders,
  onTransferSuccess,
  asset,
}) => {
  const [selectedHolder, setSelectedHolder] = useState(defaultSelectedHolder);
  const [transferReason, setTransferReason] = useState(defaultTransferReason);
  const [open, setOpen] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const handleHolderChange = (value) => {
    setSelectedHolder(value?.toString() || "");
  };

  const fetchOtherHolders = async (asset) => {
    try {
      const response = await fetch(`/api/assets?id=${asset._id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch other holders");
      }
      const data = await response.json();

      setHolders(
        data.nonAssignedUsers.map((user) => ({
          _id: user.id?.toString() || user._id?.toString(),
          name: user.name,
          department: user.department,
        }))
      );
    } catch (error) {
      console.error("Error fetching other holders:", error);
      return [];
    }
  };

  const handleTransferReasonChange = (e) => {
    setTransferReason(e.target.value);
  };
  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSubmit) {
      onSubmit({
        selectedHolder: showHolderSelection ? selectedHolder : null,
        transferReason: showTransferReason ? transferReason : null,
      });
    }
  };

  const handleTransferAsset = async () => {
    if (!selectedHolder) {
      toast.error("Please select a holder.");
      return;
    }
    if (!transferReason) {
      toast.error("Please provide a reason for the transfer.");
      return;
    }
    setIsTransferring(true);
    try {
      const response = await fetch(`/api/assets/`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: asset._id,
          updateData: {
            assignedUser: selectedHolder,
            transferReason: transferReason,
          },
        }),
      });
      if (response.ok) {
        const recordResponse = await fetch(`/api/assets/assetTransfers`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: asset._id,
            fromUser: asset.assignedUser || null,
            toUser: selectedHolder,
            transferReason: transferReason || null,
            TransferDate: new Date(),
          }),
        });
        if (recordResponse.ok) {
          toast.success("Asset transferred successfully!");
          setOpen(false);
          if (onTransferSuccess) onTransferSuccess();
          if (typeof window !== "undefined") {
            setTimeout(() => window.location.reload(), 600);
          }
          return;
        } else {
          const err = await recordResponse.json().catch(() => ({}));
          toast.error(err.error || "Failed to record asset transfer.");
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast.error(errorData.error || "Failed to transfer asset.");
      }
    } catch (error) {
      console.error("Transfer failed:")
      toast.error(`Failed to transfer asset: ${error.message}`);
    } finally {
      setIsTransferring(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <form onSubmit={handleSubmit}>
        <DialogTrigger asChild>
          <Button
            variant="action"
            actionType="edit"
            size="actionBtn"
            onClick={() => {
              setOpen(true);
              fetchOtherHolders(asset);
            }}
          >
            <ArrowLeftRight />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[500px] px-10 bg-white">
          <DialogHeader>
            <div className="flex flex-row items-center justify-center">
              <div className="flex gap-1 px-3 py-1 text-sm uppercase rounded-lg bg-accentOrange/10 text-accentOrange">
                <p className="!text-sm">C5598:</p>
                <p className="!text-sm font-medium">{asset.assignedUserName}</p>
              </div>
            </div>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription className="text-center">
              {description}
            </DialogDescription>
          </DialogHeader>{" "}
          <div className="flex flex-col gap-4">
            {showHolderSelection && (
              <div className="relative w-full">
                <Label
                  htmlFor="holder-select"
                  className="absolute -top-1.5 left-3 z-30 px-1 bg-white text-start w-fit"
                >
                  {holderLabel}
                </Label>
                <Combobox
                  value={selectedHolder || ""}
                  onValueChange={handleHolderChange}
                  placeholder={holderPlaceholder}
                  searchPlaceholder="Search holders..."
                  className="w-full"
                  options={holders.map((holder) => ({
                    value: holder._id,
                    label: holder.name,
                  }))}
                />
              </div>
            )}
            {showTransferReason && (
              <SecondaryInput
                label={transferReasonLabel}
                type="textarea"
                rows={transferReasonRows}
                value={transferReason}
                onChange={handleTransferReasonChange}
                placeholder={transferReasonPlaceholder}
              />
            )}
          </div>
          <DialogFooter className="">
            <Button
              className="w-[calc(50%-4px)]"
              type="submit"
              onClick={handleTransferAsset}
              disabled={isTransferring}
            >
              {isTransferring && (
                <svg className="mr-3 -ml-1 text-white size-5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              )}
              {submitButtonText}
            </Button>
            <DialogClose asChild>
              <Button className="w-[calc(50%-4px)]" variant="outline">
                {cancelButtonText}
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </form>
    </Dialog>
  );
};

export default TransferAssetDialog;
