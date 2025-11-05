"use client";
import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import InventorySummaryCard from "@/components/primary/dashboard/InventorySummary/InventorySummaryCard";
import {
  ArrowLeftToLine,
  ArrowRightToLine,
  PackageSearch,
  PackageOpen,
  ArchiveX,
} from "lucide-react";

const InventorySummaryGridDashboard = () => {
  const { data: session } = useSession();
  const [summaryData, setSummaryData] = useState({
    totalItems: 0,
    inventory: 0,
    outOfStock: 0,
    incoming: 0,
    outgoing: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [session]);

  const fetchDashboardData = async () => {
    if (!session?.user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/dashboard');
      
      if (response.ok) {
        const data = await response.json();
        setSummaryData({
          totalItems: data.inventorySummary?.totalItems || 0,
          inventory: data.inventorySummary?.inventory || 0,
          outOfStock: data.inventorySummary?.outOfStock || 0,
          incoming: data.inventorySummary?.incoming || 0,
          outgoing: data.inventorySummary?.outgoing || 0
        });
      } else {
        console.error('Failed to fetch dashboard data:', response.status);
        setSummaryData({
          totalItems: 0,
          inventory: 0,
          outOfStock: 0,
          incoming: 0,
          outgoing: 0
        });
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      setSummaryData({
        totalItems: 0,
        inventory: 0,
        outOfStock: 0,
        incoming: 0,
        outgoing: 0
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-between gap-5">
        <h2>Inventory Summary</h2>
        <div className="flex flex-row justify-between gap-4">
          {[1, 2, 3, 4, 5].map((index) => (
            <div key={index} className="flex-1 h-24 bg-gray-200 rounded-lg animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col justify-between gap-5">
      <h2>Inventory Summary</h2>
      <div className="flex flex-row justify-between gap-4">
        <InventorySummaryCard
          title={"Total Items"}
          update={0}
          value={summaryData.totalItems}
          icon={<PackageSearch />}
          fillcolor={"#4283DE"}
          bgcolor={"#4283DE1A"}
        />
        <InventorySummaryCard
          title={"Inventory"}
          update={0}
          value={summaryData.inventory}
          icon={<PackageOpen />}
          fillcolor={"#007D51"}
          bgcolor={"#007D511A"}
        />
        <InventorySummaryCard
          title={"Out of Stock"}
          update={0}
          value={summaryData.outOfStock}
          icon={<ArchiveX />}
          fillcolor={"#E25360"}
          bgcolor={"#E253601A"}
        />
        <InventorySummaryCard
          title={"Incoming"}
          update={0}
          value={summaryData.incoming}
          icon={<ArrowLeftToLine />}
          fillcolor={"#E76500"}
          bgcolor={"#E765001A"}
        />
        <InventorySummaryCard
          title={"Outgoing"}
          update={0}
          value={summaryData.outgoing}
          icon={<ArrowRightToLine />}
          fillcolor={"#895BBA"}
          bgcolor={"#895BBA1A"}
        />
      </div>
    </div>
  );
};

export default InventorySummaryGridDashboard;
