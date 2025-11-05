'use client';
import React from "react";
import ApproveTrackingLable from "./ApproveTrackingLable";
import { TrackingLine } from "../../icons/icons";

const ApproveTracker = ({ trackingItems = [] }) => {

  return (
    <div className="flex flex-col">
      {trackingItems.map((item, index) => (
        <React.Fragment key={index}>
          <ApproveTrackingLable
            status={item.status}
            dueDate={item.dueDate}
            icon={item.icon}
            iconColor={item.iconColor}
            showActionButton={!!item.actionButton}
            actionButtonProps={item.actionButton || {}}
          />
          {index < trackingItems.length - 1 && (
            <TrackingLine className="h-8 w-11" />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

export default ApproveTracker;
