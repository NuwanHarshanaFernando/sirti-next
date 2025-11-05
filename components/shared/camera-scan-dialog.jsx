import React, { useState } from "react";
import { QrCode } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import Html5QrcodePlugin from "@/components/shared/html5-qrcode-plugin";

const CameraScanDialog = ({ className, onScan }) => {
  const [open, setOpen] = useState(false);

  const onNewScanResult = (decodedText, decodedResult) => {
    
    if (onScan) {
      onScan(decodedText);
    }
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={className}>
        <QrCode className="w-5 h-5" />
      </DialogTrigger>
      <DialogContent closeButtonVariant="subtle" className="p-4 bg-white rounded-lg shadow-md">
        <DialogHeader className="hidden">
          <DialogTitle></DialogTitle>
        </DialogHeader>
        {open && (
          <Html5QrcodePlugin
            fps={10}
            qrbox={250}
            disableFlip={false}
            qrCodeSuccessCallback={onNewScanResult}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CameraScanDialog;
