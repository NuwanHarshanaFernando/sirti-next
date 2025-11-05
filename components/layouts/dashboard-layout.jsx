"use client";
import React from "react";
import InventorySummaryGridDashboard from "@/components/primary/dashboard/InventorySummary/InventorySummaryGridDashboard";
import RecentActivityList from "@/components/primary/dashboard/RecentActivity/RecentActivityList";
import RecentItemsSection from "@/components/primary/dashboard/RecentItems/RecentItemsSection";
import Breadcrumb from "@/components/primary/dashboard/PrimaryBreadcrumb";
import LowStockTable from "@/components/primary/dashboard/LowStockThresholds/LowStockTable";
import ProjectsOverview from "../primary/dashboard/ProjectsOverview/ProjectsOverview";

const DashboardLayout = () => {
  return (
    <div className="flex flex-col gap-10">
      <div className="layout-header">
        <h1>Dashboard</h1>
        <Breadcrumb />
      </div>
      <div className="flex flex-col items-center justify-start w-full">
        <div className="flex flex-col gap-10 w-[900px]">
          <ProjectsOverview />
          <InventorySummaryGridDashboard />
          <RecentActivityList />
          {/* <RecentItemsSection />
          <LowStockTable /> */}
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;
