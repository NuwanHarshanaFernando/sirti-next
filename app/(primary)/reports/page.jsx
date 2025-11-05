"use client";
import React from "react";
import ReportsLayout from "@/components/layouts/reports-layout";
import { useSession } from "next-auth/react";

const ReportsPage = () => {
  return (
    <div className="flex flex-col w-full">
      <ReportsLayout />
    </div>
  );
};

export default ReportsPage;