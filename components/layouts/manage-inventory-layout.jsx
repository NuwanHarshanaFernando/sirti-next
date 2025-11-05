"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Breadcrumb from "@/components/primary/inventory/manage-inventory/PrimaryBreadcrumb";
import RackStockAdjustment from "../primary/inventory/manage-inventory/RackStockAdjustmentTable";
import AdminProjectRackTable from "../primary/inventory/manage-inventory/AdminProjectRackTable";
import ProjectStockTransferRequestTable from "../primary/inventory/manage-inventory/StockTransferRequestTable";
import ActivityHistory from "../primary/inventory/manage-inventory/ActivityHistory";
import ApprovalSheet from "../popups/ApprovalSheet/ApprovalSheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "../ui/button";

const ManageInventoryLayout = ({ productId, session }) => {
  const router = useRouter();
  const [productName, setProductName] = useState("");
  const [loading, setLoading] = useState(true);
  const [approvedTransfers, setApprovedTransfers] = useState([]);
  const [includedProjects, setIncludedProjects] = useState([]);

  useEffect(() => {
    const fetchProductData = async () => {
      if (!productId) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/Products/${productId}`);
        if (response.ok) {
          const productData = await response.json();
          setProductName(productData.productName || "Unknown Product");
          setIncludedProjects(productData.includedProjects || []);
        } else {
          console.error("Failed to fetch product data");
          setProductName("Unknown Product");
          setIncludedProjects([]);
        }
      } catch (error) {
        console.error("Error fetching product data:", error);
        setProductName("Unknown Product");
        setIncludedProjects([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProductData();
  }, [productId]);

  useEffect(() => {
    const fetchApprovedTransfers = async () => {
      if (!session?.user?.id || !productId) return;

      try {
        const projectsResponse = await fetch(`/api/manager/assigned-projects?productId=${productId}`);
        const projectsData = await projectsResponse.json();

        if (!projectsData.assignedProjects || projectsData.assignedProjects.length === 0) {
          setApprovedTransfers([]);
          return;
        }

        const assignedProjectIds = projectsData.assignedProjects.map(p => p._id);

        const transfersResponse = await fetch(`/api/transfers?status=approved&productId=${productId}`);
        const transfersData = await transfersResponse.json();

        if (transfersResponse.ok && transfersData.transfers) {
          const relevantTransfers = transfersData.transfers.filter(transfer =>
            assignedProjectIds.includes(transfer.toProjectId.toString())
          );
          setApprovedTransfers(relevantTransfers);
        }
      } catch (error) {
        console.error("Error fetching approved transfers:", error);
        setApprovedTransfers([]);
      }
    };

    fetchApprovedTransfers();
  }, [session?.user?.id, productId]);
  return (
    loading ? (
      <div className="flex flex-col gap-10">
        <div className="flex items-center justify-between w-full">
          <div className="flex flex-col gap-2 layout-header">
            <Skeleton className="w-64 h-8 mb-2" />
            <Skeleton className="w-48 h-5" />
          </div>
        </div>
        <div className="flex flex-col items-center justify-start w-full">
          <div className="flex flex-col w-full gap-10">
            <Skeleton className="w-full h-16 mb-2 rounded-md" />
            <Skeleton className="w-full h-40 mb-2 rounded-md" />
            <Skeleton className="w-full h-40 mb-2 rounded-md" />
            <Skeleton className="w-full h-40 mb-2 rounded-md" />
          </div>
        </div>
      </div>
    ) : (
      <div className="flex flex-col gap-10">
        <div className="flex items-center justify-between w-full">
          <div className="layout-header">
            <h1>
              Manage Inventory - {loading ? "Loading..." : productName || "Unknown Product"}
            </h1>
            <Breadcrumb />
          </div>
          <Button
            variant="secondary"
            size="secondary"
            onClick={() => router.push(`/inventory/edit-product?id=${productId}`)}
            disabled={!productId}
          >
            View Product
          </Button>
        </div>
        <div className="flex flex-col items-center justify-start w-full">
          <div className="flex flex-col w-full gap-10">
            {session?.user?.role === "admin" || session?.user?.role === "keeper" ? (
              <AdminProjectRackTable productId={productId} session={session} includedProjects={includedProjects} />
            ) : (
              <RackStockAdjustment productId={productId} session={session} includedProjects={includedProjects} />
            )}
            <ProjectStockTransferRequestTable
              productId={productId}
              session={session}
              includedProjects={includedProjects}
            />
            <ActivityHistory productId={productId} session={session} />
          </div>
        </div>
      </div>
    )
  );
};

export default ManageInventoryLayout;
