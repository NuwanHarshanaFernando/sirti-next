"use client";
import React, { useEffect } from "react";
import ApproveTracker from "@/components/popups/ApprovalSheet/ApproveTracker";
import { ArrowRightLeft, User, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { set } from "mongoose";
import TransferAssetDialog from "@/components/popups/TransferAssetDialog";

const AssetManagementHistory = ({ assetId }) => {
  const [currentAssetUser, setCurrentAssetUser] = React.useState();
  const [assetHistory, setAssetHistory] = React.useState([]);
  const [currentAsset, setCurrentAsset] = React.useState();
  const [holders, setHolders] = React.useState([]);
  const [assignedUserID, setAssignedUserID] = React.useState();

  const fetchAssetUser = async (assetId) => {
    if (!assetId) {
      console.error("Asset ID is required to fetch asset details.");
      return;
    }
    try {
      const response = await fetch(`/api/assets?id=${assetId}`);
      const data = await response.json();

      setCurrentAssetUser(data.asset.assignedUserName);
      setAssignedUserID(data.asset.assignedUser);
      if (!response.ok) {
        throw new Error("Failed to fetch asset details");
      }
    } catch (error) {
      console.error("Error fetching asset:", error);
    }
  };

  const fetchAssestHistory = async () => {
    if (!assetId) {
      console.error("Asset ID is required to fetch asset history.");
      return;
    }
    try {
      const response = await fetch(`/api/assets/assetTransfers?id=${assetId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch asset history");
      }
      const data = await response.json();
      setAssetHistory(data);
    } catch (error) {
      console.error("Error fetching asset history:", error);
    }
  };

  const fetchCurrentAsset = async (assetId) => {
    if (!assetId) {
      console.error("Asset ID is required to fetch current asset details.");
      return;
    }
    try {
      const response = await fetch(`/api/assets?id=${assetId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch current asset details");
      }
      const data = await response.json();
      setCurrentAsset(data.asset);
    } catch (error) {
      console.error("Error fetching current asset:", error);
    }
  };
  useEffect(() => {
    fetchAssetUser(assetId);
    fetchAssestHistory();
    fetchCurrentAsset(assetId);
  }, [assetId]);

  const sortedAssetHistory = [...assetHistory].sort(
    (a, b) => new Date(b.transferDate) - new Date(a.transferDate)
  );

  const trackingItems = [];

  if (sortedAssetHistory.length > 0 || currentAssetUser) {
    trackingItems.push({
      status: `Asset Currently on ${currentAssetUser}`,
      dueDate:
        sortedAssetHistory.length > 0
          ? new Date(sortedAssetHistory[0].transferDate).toLocaleString() ||
            "N/A"
          : "N/A",
      icon: User,
      iconColor: "#E27100",
    });

    for (let i = 0; i < sortedAssetHistory.length; i++) {
      const item = sortedAssetHistory[i];
      trackingItems.push({
        status: `Item transferred from ${item.fromUserName} to ${item.toUserName}`,
        dueDate: new Date(item.transferDate).toLocaleString(),
        icon: User,
        iconColor: "#895BBA",
      });
    }
  }
const refreshData = () => {
  fetchAssetUser(assetId);
  fetchAssestHistory();
  fetchCurrentAsset(assetId);
};
  return (
    <div className="flex flex-col w-full gap-5 ">
      <div
        className="flex flex-col justify-between gap-5 p-8 rounded-lg"
        style={{ boxShadow: "0px 0px 10px 0px #0000000A" }}
      >
        <div className="flex items-center justify-between w-full">
          <h2>Asset Management History</h2>
          <TransferAssetDialog
            asset={{
              _id: assetId,
              assignedUser: assignedUserID,
              assignedUserName: currentAssetUser,
            }}
            holders={holders}
            setHolders={setHolders}
            onTransferSuccess={refreshData}
          />
        </div>
        <div className="flex flex-col w-full gap-4">
          <ApproveTracker trackingItems={trackingItems} />
        </div>
      </div>
    </div>
  );
};

export default AssetManagementHistory;
