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
import { ArrowUpFromLine, ArrowDownToLine } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import ApprovalDialog from "@/components/popups/ApprovalDialog";
import ApprovalSheet from "@/components/popups/ApprovalSheet/ApprovalSheet";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

const ProjectStockTransferRequestTable = ({
  productId,
  session,
  excludedProjects = [],
}) => {
  const [nonAssignedProjects, setNonAssignedProjects] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmittingTransfer, setIsSubmittingTransfer] = useState(false);
  const [userAssignedProjectId, setUserAssignedProjectId] = useState(null);
  const [approvedTransfersForCompletion, setApprovedTransfersForCompletion] =
    useState([]);

  
  const [pendingAdjustments, setPendingAdjustments] = useState([]);
  const [isAdjustmentSheetOpen, setIsAdjustmentSheetOpen] = useState(false);

  
  const [selectedSourceRack, setSelectedSourceRack] = useState(null);
  const [rackStockOnHold, setRackStockOnHold] = useState(0);

  useEffect(() => {
    if (productId && session) {
      fetchNonAssignedProjects();
      fetchPendingRequests();
      fetchApprovedTransfersForCompletion();
      fetchPendingStockAdjustments();
    }
  }, [productId, session]);

  
  const fetchPendingStockAdjustments = async () => {
    if (session?.user?.role !== "admin") return;

    try {
      const response = await fetch(
        `/api/stock-adjustment-requests?status=pending&productId=${productId}`
      );
      const data = await response.json();

      if (response.ok) {
        setPendingAdjustments(data.requests || []);
      } else {
        console.error(
          "Error response from stock-adjustment-requests API:",
          data
        );
        setPendingAdjustments([]);
      }
    } catch (error) {
      console.error("Error fetching pending stock adjustments:", error);
      setPendingAdjustments([]);
    }
  };

  const fetchNonAssignedProjects = async () => {
    try {
      const response = await fetch(
        `/api/manager/assigned-projects?productId=${productId}`
      );
      const data = await response.json();
      if (response.ok) {
        setNonAssignedProjects(data.nonAssignedProjects || []);

        
        if (data.assignedProjects && data.assignedProjects.length > 0) {
          const assignedProjectId = data.assignedProjects[0]._id;
          setUserAssignedProjectId(assignedProjectId);
        } else {
          setUserAssignedProjectId(null);
        }
      }
    } catch (error) {
      console.error("Error fetching non-assigned projects:", error);
    } finally {
      setLoading(false);
    }
  };
  const fetchPendingRequests = async () => {
    try {
      const response = await fetch(
        `/api/transfers?productId=${productId}&status=pending`
      );
      const data = await response.json();

      if (response.ok) {
        setPendingRequests(data.transfers || []);
      }
    } catch (error) {
      console.error("Error fetching pending transfer requests:", error);
    }
  };
  const fetchApprovedTransfersForCompletion = async () => {
    try {
      if (!session?.user?.id) return;

      
      const projectsResponse = await fetch(
        `/api/manager/assigned-projects?productId=${productId}`
      );
      const projectsData = await projectsResponse.json();

      if (!projectsData.assignedProjects || projectsData.assignedProjects.length === 0) {
        setApprovedTransfersForCompletion([]);
        return;
      }

      const assignedProjectIds = projectsData.assignedProjects.map(
        (p) => p._id
      );

      
      const transfersResponse = await fetch(
        `/api/transfers?status=approved&productId=${productId}`
      );
      const transfersData = await transfersResponse.json();

      if (transfersResponse.ok && transfersData.transfers) {
        // Show only transfers where the user manages the SOURCE project
        const relevantTransfers = transfersData.transfers.filter((transfer) =>
          assignedProjectIds.includes(transfer.fromProjectId.toString())
        );
        setApprovedTransfersForCompletion(relevantTransfers);
      }
    } catch (error) {
      console.error("Error fetching approved transfers for completion:", error);
      setApprovedTransfersForCompletion([]);
    }
  };

  const validateStockForTransfer = async (fromProjectId, quantity) => {
    try {
      const response = await fetch(
        `/api/stock-validation?productId=${productId}&projectId=${fromProjectId}`
      );
      const data = await response.json();

      if (response.ok) {
        return {
          isValid: data.availableStock >= quantity,
          availableStock: data.availableStock,
          rackBreakdown: data.rackBreakdown,
        };
      }
      return { isValid: false, availableStock: 0 };
    } catch (error) {
      console.error("Error validating stock:", error);
      return { isValid: false, availableStock: 0 };
    }
  };
  const handleInstantTransfer = async (data, destinationProjectId) => {
    const {
      stockQuantity,
      reason,
      selectedSourceProject,
      selectedRack: selectedSourceRack, 
      selectedDestinationRack,
    } = data;

    const quantity = parseInt(stockQuantity);

    if (!quantity || quantity <= 0) {
      toast.error("Please enter a valid quantity");
      return;
    }

    if (!selectedSourceProject) {
      toast.error("Please select a source project");
      return;
    }

    if (!selectedSourceRack) {
      toast.error("Please select a source rack");
      return;
    }

    if (!selectedDestinationRack) {
      toast.error("Please select a destination rack");
      return;
    }

    if (selectedSourceProject === destinationProjectId) {
      toast.error("Cannot transfer within the same project");
      return;
    }

    setIsSubmittingTransfer(true);

    try {
      
      const sourceValidation = await fetch(
        `/api/stock-validation?productId=${productId}&projectId=${selectedSourceProject}`
      );
      const sourceData = await sourceValidation.json();

      if (!sourceValidation.ok || !sourceData.rackBreakdown) {
        toast.error("Error validating source rack stock");
        return;
      }

      const sourceRackData = sourceData.rackBreakdown.find(
        (rack) => rack.rackNumber === selectedSourceRack
      );

      if (!sourceRackData || sourceRackData.stock < quantity) {
        toast.error(
          `Insufficient stock in source rack ${selectedSourceRack}. Available: ${
            sourceRackData?.stock || 0
          }, Requested: ${quantity}`
        );
        return;
      }

      
      const transferData = {
        productId,
        fromProjectId: selectedSourceProject,
        toProjectId: destinationProjectId,
        fromRack: selectedSourceRack,
        toRack: selectedDestinationRack,
        quantity,
        reason: reason || "Admin instant transfer",
        transferredBy: session?.user?.id,
        type: "INSTANT_TRANSFER",
      };

      const response = await fetch("/api/transfers/instant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(transferData),
      });

      const result = await response.json();

      if (response.ok) {
        toast.success(
          `Transfer completed! ${quantity} units moved from rack ${selectedSourceRack} to rack ${selectedDestinationRack}`
        );

        
        await fetchNonAssignedProjects();
        await fetchPendingRequests();
      } else {
        console.error("❌ Instant transfer failed:", result);
        toast.error(`Transfer failed: ${result.error || result.message}`);
      }
    } catch (error) {
      console.error("❌ Error executing instant transfer:", error);
      toast.error("Failed to execute transfer. Please try again.");
    } finally {
      setIsSubmittingTransfer(false);
    }
  };

  const handleTransferOut = async (data, sourceProjectIdFromTable) => {
    const {
      stockQuantity,
      reason,
      selectedRack,
      selectedDestinationProject,
      selectedDestinationRack,
    } = data;
    const quantity = parseInt(stockQuantity);

    if (!quantity || quantity <= 0) {
      toast.error("Please enter a valid quantity");
      return;
    }

    setIsSubmittingTransfer(true);

    try {
      let sourceProjectId, targetProjectId;

      if (session?.user?.role === "admin" && selectedDestinationProject) {
        sourceProjectId = sourceProjectIdFromTable;
        targetProjectId = selectedDestinationProject;
      } else if (session?.user?.role === "keeper") {
        
        const includedProjectsResponse = await fetch(
          `/api/keeper/included-projects?productId=${productId}`
        );
        const includedProjectsData = await includedProjectsResponse.json();
        const includedProjects = includedProjectsData.projects || [];

        sourceProjectId = includedProjects[0]?._id || sourceProjectIdFromTable;
        targetProjectId = sourceProjectIdFromTable;
      } else {
        
        const userProjectResponse = await fetch(
          `/api/manager/assigned-projects?productId=${productId}`
        );
        const userProjectData = await userProjectResponse.json();
        const assignedProjects = userProjectData.assignedProjects || [];
        if (assignedProjects.length === 0) {
          toast.error(
            "You don't have an assigned project to transfer stock from"
          );
          return;
        }
        sourceProjectId = assignedProjects[0]._id;
        targetProjectId = sourceProjectIdFromTable;
      }

      if (sourceProjectId === targetProjectId) {
        toast.error("Cannot transfer from a project to itself");
        return;
      }

      
      let validation;
      if (
        (session?.user?.role === "manager" ||
          session?.user?.role === "keeper") &&
        selectedRack
      ) {
        
        const managerRacksResponse = await fetch(
          `/api/manager/transfer-source-racks?productId=${productId}`
        );
        const managerRacksData = await managerRacksResponse.json();

        if (managerRacksResponse.ok && managerRacksData.racks) {
          const selectedRackData = managerRacksData.racks.find(
            (rack) => rack.rackNumber === selectedRack
          );

          if (!selectedRackData) {
            toast.error(
              `Selected rack ${selectedRack} not found or has no stock`
            );
            return;
          }

          if (selectedRackData.stock < quantity) {
            toast.error(
              `Insufficient stock in selected rack ${selectedRack}. Available: ${selectedRackData.stock}, Requested: ${quantity}`
            );
            return;
          }

          validation = {
            isValid: true,
            availableStock: selectedRackData.stock,
            rackBreakdown: [
              { rackNumber: selectedRack, stock: selectedRackData.stock },
            ],
          };
        } else {
          toast.error("Failed to validate rack availability");
          return;
        }
      } else {
        
        validation = await validateStockForTransfer(sourceProjectId, quantity);

        if (!validation.isValid) {
          toast.error(
            `Insufficient stock in your project. Available: ${validation.availableStock}, Requested: ${quantity}`
          );
          return;
        }

        
        if (selectedRack) {
          const rackData = validation.rackBreakdown?.find(
            (rack) => rack.rackNumber === selectedRack
          );

          if (!rackData) {
            toast.error(
              `Selected rack ${selectedRack} not found or has no stock`
            );
            return;
          }

          if (rackData.stock < quantity) {
            toast.error(
              `Insufficient stock in selected rack ${selectedRack}. Available: ${rackData.stock}, Requested: ${quantity}`
            );
            return;
          }
        }
      }

      const transferRequestData = {
        productId,
        fromProjectId: sourceProjectId,
        toProjectId: targetProjectId,
        quantity,
        reason: reason || "Stock transfer out (project to project)",
  requestedBy: session?.user?.id,
  transferType: "OUT",
        fromRack: selectedRack,
        toRack: selectedDestinationRack,
      };

      
      const response = await fetch("/api/transfers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(transferRequestData),
      });

      const result = await response.json();

      if (response.ok) {
        toast.success("Transfer out request submitted successfully!");
        fetchPendingRequests();
      } else {
        toast.error(`Error: ${result.error || result.message}`);
      }
    } catch (error) {
      console.error("❌ Error submitting transfer out request:", error);
      if (!error.silent)
        toast.error("Failed to submit transfer request. Please try again.");
    } finally {
      setIsSubmittingTransfer(false);
    }
  };
  const handleTransferIn = async (data, sourceProjectId) => {
    const { stockQuantity, reason, selectedDestinationRack } = data;
    const quantity = parseInt(stockQuantity);

    if (!quantity || quantity <= 0) {
      toast.error("Please enter a valid quantity");
      return;
    }

    if (!selectedDestinationRack) {
      toast.error("Please select a destination rack");
      return;
    }

    setIsSubmittingTransfer(true);

    try {
      
      const userProjectResponse = await fetch(
        `/api/manager/assigned-projects?productId=${productId}`
      );
      const userProjectData = await userProjectResponse.json();
      const assignedProjects = userProjectData.assignedProjects || [];
      const includedProjectsForKeepers = await fetch(
        `/api/keeper/included-projects?productId=${productId}`
      );
      const includedProjects = await includedProjectsForKeepers.json();

      if (session?.user?.role === "manager" && assignedProjects.length === 0) {
        toast.error("You don't have an assigned project to transfer stock to");
        return;
      }

      if (session?.user?.role === "keeper" && includedProjects.length === 0) {
        toast.error(
          "No Included Projects for this Product to transfer stock to"
        );
        return;
      }

      const destinationProjectId =
        session?.user?.role === "manager"
          ? assignedProjects[0]._id
          : includedProjects?.projects?.[0]?._id;
      if (sourceProjectId === destinationProjectId) {
        toast.error("Cannot transfer from a project to itself");
        return;
      }

      
      const validation = await validateStockForTransfer(
        sourceProjectId,
        quantity
      );

      if (!validation.isValid) {
        toast.error(
          `Insufficient stock in source project. Available: ${validation.availableStock}, Requested: ${quantity}`
        );
        return;
      }

      const transferRequestData = {
        productId,
        fromProjectId: sourceProjectId, 
        toProjectId: destinationProjectId, 
        toRack: selectedDestinationRack, 
        quantity,
        reason: reason || "Stock transfer in (project to project)",
  requestedBy: session?.user?.id,
  transferType: "IN", 
      };

      
      const response = await fetch("/api/transfers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(transferRequestData),
      });

      const result = await response.json();

      if (response.ok) {
        toast.success("Transfer in request submitted successfully!");
        fetchPendingRequests(); 
      } else {
        toast.error(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error("❌ Error submitting transfer in request:", error);
      if (!error.silent)
        toast.error("Failed to submit transfer request. Please try again.");
    } finally {
      setIsSubmittingTransfer(false);
    }
  };

  
  const fetchRackStockOnHold = async (projectId, rackNumber, productId) => {
    try {
      const response = await fetch(
        `/api/rack-stock-on-hold?projectId=${projectId}&rackNumber=${rackNumber}&productId=${productId}`
      );
      const data = await response.json();
      if (response.ok) {
        setRackStockOnHold(data.rackStockOnHold);
      }
    } catch (error) {
      console.error("Error fetching rack stock on hold:", error);
      setRackStockOnHold(0);
    }
  };

  
  const handleSourceRackSelect = async (rackNumber, projectId) => {
    setSelectedSourceRack(rackNumber);
    await fetchRackStockOnHold(projectId, rackNumber, productId);
  };

  
  const createTransferRequest = async (fromProject, toProject, quantity) => {
    if (!selectedSourceRack) {
      toast.error("Please select a source rack for the transfer");
      return;
    }

    setIsSubmittingTransfer(true);
    try {
      const response = await fetch("/api/transfers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId,
          fromProjectId: fromProject._id,
          toProjectId: toProject._id,
          quantity,
          sourceRackNumber: selectedSourceRack,
          
          currentRackStockOnHold: rackStockOnHold,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        toast.success("Transfer request created successfully");
        fetchPendingRequests();
        
        setSelectedSourceRack(null);
        setRackStockOnHold(0);
      } else {
        toast.error(data.error || "Failed to create transfer request");
      }
    } catch (error) {
      console.error("Error creating transfer request:", error);
      toast.error("Failed to create transfer request");
    } finally {
      setIsSubmittingTransfer(false);
    }
  };

  const totalPendingApprovals = nonAssignedProjects.reduce(
    (total, project) => total + (project.pendingApprovals || 0),
    0
  );

  const pendingCount = pendingRequests.filter(
    (req) => req.status === "pending"
  ).length;

  if (loading) {
    return (
      <div className="flex flex-col gap-5">
        <div className="p-4 border rounded-lg">
          <div className="flex flex-row gap-4 mb-4">
            <Skeleton className="w-1/3 h-6" />
            <Skeleton className="w-1/3 h-6" />
            <Skeleton className="w-1/3 h-6" />
            <Skeleton className="w-32 h-6" />
          </div>
          {[...Array(3)].map((_, idx) => (
            <div key={idx} className="flex flex-row gap-4 mb-4">
              <Skeleton className="w-1/3 h-10" />
              <Skeleton className="w-1/3 h-10" />
              <Skeleton className="w-1/3 h-10" />
              <Skeleton className="w-32 h-10" />
            </div>
          ))}
        </div>
      </div>
    );
    R;
  }

  return (
    <div className="flex flex-col gap-5">
      <Table className="!p-10">
        {nonAssignedProjects.length > 0 ? (
          <TableHeader>
            <TableRow className="!border-b-0">
              <TableHead className="w-1/3">Project</TableHead>
              <TableHead className="w-1/3">Stock on hand</TableHead>
              <TableHead className="w-1/3">Stock on Hold</TableHead>
              <TableHead className="w-[150px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
        ) : null}
        <TableBody>
          {nonAssignedProjects.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={4}
                className="hidden py-8 text-center text-gray-500 "
              >
                No other projects available for stock transfer
              </TableCell>
            </TableRow>
          ) : (
            nonAssignedProjects.map((project, index) => {
              const isExcluded = excludedProjects.some(
                (pid) => pid.toString() === project._id.toString()
              );
              return (
                <TableRow
                  key={project._id || index}
                  className={isExcluded ? "opacity-50 pointer-events-none" : ""}
                >
                  <TableCell className="py-2">
                    <div className="flex flex-row items-center justify-start w-full gap-2 px-3 py-3 border rounded-lg border-black/10">
                      <div
                        className="w-6 h-6 rounded-full"
                        style={{
                          backgroundColor: project.color || "#ccc",
                        }}
                      />
                      <p className="!text-[15px]">
                        {project.projectName || "Unknown Project"}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="py-2">
                    <div className="flex flex-row items-center justify-start w-full gap-2 px-3 py-3 border rounded-lg border-black/10">
                      <p className="!text-[15px]">
                        {formatNumber(project.stockOnHand || 0)}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="py-2">
                    <div className="flex flex-row items-center justify-start w-full gap-2 px-3 py-3 border rounded-lg border-black/10">
                      <p className="!text-[15px]">
                        {formatNumber(project.stockOnHold || 0)}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="py-2">
                    <div className="flex flex-row items-center justify-start gap-2">
                      <ApprovalDialog
                        icon={ArrowUpFromLine}
                        title={`${
                          session?.user?.role === "admin"
                            ? "Transfer Stock TO " + project.projectName
                            : "Request Approval for Transfer"
                        }`}
                        description={`${
                          session?.user?.role === "admin"
                            ? `Transfer stock from any project TO ${project.projectName}. Select source and destination racks.`
                            : `Send stock from ${project.projectName} to another project. Stock will be transferred out of ${project.projectName}.`
                        }`}
                        submitButtonText={
                          session?.user?.role === "admin"
                            ? "Execute Transfer"
                            : "Request Approval"
                        }
                        onSubmit={(data) =>
                          session?.user?.role === "admin"
                            ? handleInstantTransfer(data, project._id)
                            : handleTransferOut(data, project._id)
                        }
                        disabled={
                          isSubmittingTransfer ||
                          (session?.user?.role !== "manager" &&
                            session?.user?.role !== "admin" &&
                            session?.user?.role !== "keeper") ||
                          isExcluded
                        }
                        showRackSelection={true}
                        sourceProjectId={
                          session?.user?.role === "admin"
                            ? "CROSS_PROJECT_SELECTION"
                            : project._id
                        }
                        destinationProjectId={project._id}
                        productId={productId}
                        transferType={
                          session?.user?.role === "admin" ? "instant" : "out"
                        }
                        session={session}
                        availableProjects={nonAssignedProjects}
                        excludeDestinationFromSource={true}
                      />
                      {(session?.user?.role === "manager" ||
                        session?.user?.role === "keeper") && (
                        <ApprovalDialog
                          icon={ArrowDownToLine}
                          title={`Request Stock from ${project.projectName}`}
                          description={`Request stock from ${
                            project.projectName
                          } to be transferred to your assigned project. Available: ${formatNumber(
                            project.stockOnHand || 0
                          )}`}
                          submitButtonText="Request Stock"
                          onSubmit={(data) =>
                            handleTransferIn(data, project._id)
                          }
                          disabled={
                            isSubmittingTransfer ||
                            (session?.user?.role !== "manager" &&
                              session?.user?.role !== "admin" &&
                              session?.user?.role !== "keeper") ||
                            isExcluded
                          }
                          showRackSelection={true}
                          transferType="in"
                          session={session}
                          productId={productId}
                        />
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
        <TableFooter className="border-t-0">
          <TableRow>
            <TableCell colSpan={4} className="text-right">
              <div className="flex items-center justify-end gap-3 ml-0">
                {nonAssignedProjects.length > 0 && (
                  <ApprovalSheet
                    triggerText="TRANSFER APPROVALS"
                    pendingCount={pendingCount}
                    session={session}
                    requests={pendingRequests}
                    productId={productId}
                    requestType="transfer"
                    showTrigger={true}
                  />
                )}

                {/* Pending Stock Adjustment Approvals using ApprovalSheet */}
                {session?.user?.role === "admin" && (
                  <ApprovalSheet
                    triggerText="ADJUSTMENT APPROVALS"
                    pendingCount={pendingAdjustments.length}
                    session={session}
                    requests={pendingAdjustments}
                    productId={productId}
                    requestType="stock-adjustment"
                    showTrigger={true}
                    isOpen={isAdjustmentSheetOpen}
                    onOpenChange={(open) => {
                      setIsAdjustmentSheetOpen(open);
                      if (!open) {
                        
                        fetchPendingStockAdjustments();
                      }
                    }}
                  />
                )}

                {/* Transfer Completion using ApprovalSheet - Show for managers, users, and keepers with approved transfers */}
                {(session?.user?.role === "manager") &&
                  approvedTransfersForCompletion.length > 0 && (
                    <ApprovalSheet
                      productId={productId}
                      session={session}
                      requests={approvedTransfersForCompletion}
                      pendingCount={approvedTransfersForCompletion.length}
                      triggerText="COMPLETE TRANSFERS"
                      requestType="transfer"
                      showTrigger={true}
                    />
                  )}
              </div>
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
};
export default ProjectStockTransferRequestTable;
