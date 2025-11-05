"use client";
import React, { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import { ArrowUpFromLine, ArrowDownFromLine } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import ApprovalDialog from "@/components/popups/ApprovalDialog";
import ApprovalSheet from "@/components/popups/ApprovalSheet/ApprovalSheet";


const ProjectStockTransferRequestTable = ({ productId, session }) => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(false);
  }, []);

  if (loading) {
    return <div className="flex justify-center p-8">Loading projects...</div>;
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="p-4 border border-yellow-200 rounded-lg bg-yellow-50">
        <h3 className="mb-2 text-lg font-semibold text-yellow-800">
          🔧 Testing Basic Component Structure
        </h3>
        <p className="text-yellow-600">
          This version tests the basic component without complex imports.
        </p>
        <div className="mt-4 text-sm text-gray-600">
          <p>Product ID: {productId || "N/A"}</p>
          <p>Session: {session ? "Available" : "Not available"}</p>
        </div>
      </div>
    </div>
  );
};

export default ProjectStockTransferRequestTable;
