"use client";
import React,{ useEffect, useState } from "react";
import ServiceHistoryRow from "@/components/shared/service-history-row";
import { differenceInDays, parseISO } from "date-fns";
import { useSession } from "next-auth/react";

const ServiceHistory = ({id}) => {

  const [serviceHistoryData, setServiceHistoryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const { data: session } = useSession();
  useEffect(() => {
    const fetchServiceAssets = async () => {
      setLoading(true);
      const response = await fetch(`/api/assets?id=${id}`);
      const assets = await response.json();
      const asset = assets?.asset || {};
      const today = new Date();

      const purchaseDateStr = asset.purchaseDate && asset.purchaseDate !== "N/A" ? asset.purchaseDate : null;
      const fallbackServiceDateStr = asset.nextServiceDate || null;
      const purchaseDate = purchaseDateStr ? new Date(purchaseDateStr) : null;

      const historyRes = await fetch(`/api/assets/assetHistory?id=${id}`);
      const history = await historyRes.json();

      const allCompletions = history
        .filter(h => h.action === "service_completed" && h.timestamp)
        .map(h => ({
          id: h._id,
          assetId: h.assetId,
          iconColor: "#10B981",
          projectName: "Service Maintenance",
          actionText: "Completed by",
          itemName: h.userName,
          timestamp: new Date(h.timestamp).toLocaleString(),
          rawTimestamp: new Date(h.timestamp),
          type: "completed"
        }))
        .sort((a, b) => b.rawTimestamp - a.rawTimestamp);

      const lastCompletion = allCompletions[0] || null;
      const lastServiceDate = lastCompletion
        ? lastCompletion.rawTimestamp
        : (fallbackServiceDateStr ? new Date(fallbackServiceDateStr) : null);

      const serviceTermDays = (() => {
        const raw = asset?.serviceTerm ?? "30";
        const parsed = parseInt(String(raw), 10);
        return Number.isFinite(parsed) ? parsed : 30;
      })();

      let upcomingRow = [];
      if (lastServiceDate) {
        const nextDue = new Date(lastServiceDate);
        nextDue.setDate(nextDue.getDate() + serviceTermDays);
        const daysUntil = differenceInDays(nextDue, today);
        if (daysUntil >= 0) {
          upcomingRow.push({
            id: `${asset.id}-upcoming`,
            assetId: asset.id,
            iconColor: "#3B82F6",
            projectName: "Service Maintenance",
            actionText: "Upcoming service in",
            itemName: `${daysUntil} Days`,
            timestamp: nextDue.toLocaleString(),
            asset: asset,
            type: "due"
          });
        }
      }

      const purchaseRow = purchaseDate
        ? [{
            id: `${asset.id}-purchase`,
            assetId: asset.id,
            iconColor: "#9CA3AF",
            projectName: "Product",
            actionText: "Purchased",
            itemName: "",
            timestamp: purchaseDate.toLocaleString(),
            rawTimestamp: purchaseDate,
            type: "milestone"
          }]
        : [];

      const serviceDateRow = lastServiceDate
        ? [{
            id: `${asset.id}-service-latest`,
            assetId: asset.id,
            iconColor: "#2563EB",
            projectName: "Service",
            actionText: lastCompletion ? "Done by" : "Scheduled",
            itemName: lastCompletion ? lastCompletion.itemName : "",
            timestamp: lastServiceDate.toLocaleString(),
            rawTimestamp: lastServiceDate,
            type: "milestone"
          }]
        : [];

      const betweenRows = allCompletions
        .filter(r => !lastServiceDate || r.rawTimestamp < lastServiceDate)
        .filter(r => !purchaseDate || r.rawTimestamp >= purchaseDate)
        .sort((a, b) => b.rawTimestamp - a.rawTimestamp)
        .map(({ rawTimestamp, ...rest }) => rest);

      const finalRows = [
        ...upcomingRow,
        ...serviceDateRow,
        ...betweenRows,
        ...purchaseRow.map(({ rawTimestamp, ...rest }) => rest)
      ];

      setServiceHistoryData(finalRows);
      setLoading(false);
    };

    fetchServiceAssets();
  }, []);
  const handleView = async (row, serviceDate) => {
    if (row.type !== "due") return;
    const userName = session?.user?.name;
    
    await fetch("/api/assets/assetHistory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assetId: row.assetId,
        action: "service_completed",
        userName: userName,
        timestamp: serviceDate ? new Date(serviceDate) : new Date()
      })
    });

    
    const serviceTerm = parseInt((row.asset?.serviceTerm ?? "30"), 10) || 30;
    let baseDate = serviceDate ? new Date(serviceDate) : new Date();
    baseDate.setDate(baseDate.getDate() + serviceTerm);
    const newNextServiceDate = baseDate;

    await fetch("/api/assets", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: row.assetId,
        updateData: {
          nextServiceDate: newNextServiceDate.toISOString().split("T")[0]
        }
      })
    });

    window.location.reload();
  };

  return (
    <div className="flex flex-col w-full gap-5 ">
      <div
        className="flex flex-col justify-between w-full gap-5 p-8 rounded-lg"
        style={{ boxShadow: "0px 0px 10px 0px #0000000A" }}
      >
        <div className="flex items-center justify-between w-full">
          <h2>Service History</h2>
        </div>{" "}
        <div className="flex flex-col w-full gap-4">
          {serviceHistoryData.map((notification) => (
            <ServiceHistoryRow
              key={notification.id}
              iconColor={notification.iconColor}
              projectName={notification.projectName}
              actionText={notification.actionText}
              itemName={notification.itemName}
              timestamp={notification.timestamp}
              assetId={notification.assetId}
              row={notification}
              onView={handleView}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default ServiceHistory;
