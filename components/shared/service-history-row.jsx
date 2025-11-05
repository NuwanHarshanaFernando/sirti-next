"use client";

import { FolderDotIcon, Eye } from "lucide-react";
import React from "react";
import { Button } from "@/components/ui/button";
import ViewServiceDialog from "@/components/popups/ViewServiceDialog";

const ServiceHistoryRow = ({
  iconColor,
  projectName,
  actionText,
  itemName,
  timestamp,
  onView,
  assetId,
  row
}) => {
  return (
    <div
      className="flex items-center justify-between w-full gap-2 px-4 py-3 transition-colors bg-white rounded-lg"
      style={{ boxShadow: "0px 0px 5px 0px #0000000D" }}
    >
      <div className="flex items-center justify-center gap-2">
        <div
          className="flex flex-col items-center justify-center w-10 h-10 rounded-full"
          style={{ backgroundColor: `${iconColor}1A` }}
        >
          <FolderDotIcon className="w-5 h-5" style={{ stroke: iconColor }} />
        </div>
        <div className="flex flex-row gap-1">
          <p>
            {projectName} {actionText}
          </p>
          <p className="text-sm ">{itemName}</p>
        </div>
      </div>
      <div className="flex flex-row items-center justify-center gap-10">
        <p className="text-xs text-black/50">{timestamp}</p>
        <div className="flex items-center justify-center">
          {row && row.type === "due" && (
            <ViewServiceDialog assetId={assetId} row={row} onView={onView} />
          )}
        </div>
      </div>
    </div>
  );
};

export default ServiceHistoryRow;
