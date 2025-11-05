"use client";

import { FolderDotIcon, Eye, CheckCheck, CircleX } from "lucide-react";
import React, { useEffect } from "react";
import { Button } from "@/components/ui/button";

const NotificationRow = ({
  iconColor,
  description,
  timestamp,
  actor,
  quantity,
  adjustmentType,
  onView,
  onCheck,
  onDelete,
  userRole, 
  canApprove = false, 
  canComplete = false,
  canView = true,
  read, 
}) => {
  const getQuantityText = () => {
    if (!quantity) return "";
    if (adjustmentType === "increment") return ` (+${quantity})`;
    if (adjustmentType === "decrement") return ` (-${quantity})`;
    return ` (${quantity})`;
  };

  useEffect(() => {
    
  }, [read]);

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
        </div>{" "}
        <div className="flex flex-col gap-1">
          <div className="flex flex-row items-center gap-1">
            <p className={`text-sm ${read ? "font-normal" : "font-medium"}`}>
              {description}
            </p>
            {quantity && (
              <span className="text-xs text-gray-600">{getQuantityText()}</span>
            )}
          </div>
        </div>
      </div>
      <div className="flex flex-row items-center justify-center gap-10">
        <p className="text-xs text-black/50">{timestamp}</p>{" "}
        <div className="flex items-center justify-center gap-1">
          {/* Show view/eye button only when a popup is available */}
          {canView && (
            <Button
              variant="action"
              actionType="view"
              size="actionBtn"
              onClick={onView}
              aria-label="View details"
            >
              <Eye />
            </Button>
          )}

          {/* Only show approve/reject buttons if user has permission and status is strictly pending */}
          {canApprove && (
            <>
              <Button
                variant="action"
                actionType="check"
                size="actionBtn"
                onClick={onCheck}
                aria-label="Approve"
              >
                <CheckCheck />
              </Button>
              <Button
                variant="action"
                actionType="delete"
                size="actionBtn"
                onClick={onDelete}
                aria-label="Reject"
              >
                <CircleX />
              </Button>
            </>
          )}
          {/* Only show complete/reject buttons if user can complete */}
          {canComplete && (
            <>
              <Button
                variant="action"
                actionType="check"
                size="actionBtn"
                onClick={onCheck}
              >
                <CheckCheck />
              </Button>
              <Button
                variant="action"
                actionType="delete"
                size="actionBtn"
                onClick={onDelete}
              >
                <CircleX />
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationRow;
