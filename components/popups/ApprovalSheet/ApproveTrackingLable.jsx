'use client';
import { User } from "lucide-react";
import React from "react";
import { Button } from "@/components/ui/button";

const ApproveTrackingLable = ({
  status = "Pending Approval",
  dueDate = "Due Not Applicable",
  icon: Icon = User,
  iconColor = "#E27100",
  showActionButton = false,
  actionButtonProps = {}
}) => {
  return (
    <>
      <div className="flex flex-row items-center justify-between w-full gap-2">
        <div className="flex flex-row items-center justify-start gap-2">
          <div
            className="flex flex-row items-center justify-center gap-2 border rounded-full w-11 h-11 aspect-square"
            style={{
              backgroundColor: `${iconColor}10`,
              borderColor: `${iconColor}20`
            }}
          >
            <Icon className="w-6 h-6" style={{ stroke: iconColor }} />
          </div>
          <div className="flex flex-col items-start justify-center mt-1 leading-4">
            <p
              className="!text-base font-normal leading-4"
              style={{ color: iconColor }}
            >
              {status}
            </p>
            <p className="!text-[15px] text-black/50">{dueDate}</p>
          </div>
        </div>        {showActionButton && (
          <Button
            variant={actionButtonProps.variant || "action"}
            actionType={actionButtonProps.actionType || "edit"}
            size={actionButtonProps.size || "actionBtn"}
            onClick={actionButtonProps.onClick}
            className={actionButtonProps.className}
          >
            {actionButtonProps.icon && React.createElement(actionButtonProps.icon)}
            {actionButtonProps.children}
          </Button>
        )}
      </div>
    </>
  );
};

export default ApproveTrackingLable;
