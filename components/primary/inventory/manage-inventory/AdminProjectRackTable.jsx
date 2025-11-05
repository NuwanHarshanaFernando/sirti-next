"use client";
import React, { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import NumberInput from "@/components/shared/number-input";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { PackagePlus } from "lucide-react";
import { useRouter } from "next/navigation";

const AdminProjectRackTable = ({
  productId,
  session,
  excludedProjects = [],
  includedProjects = [],
}) => {
  const [assignedProjects, setAssignedProjects] = useState([]);
  const [nonAssignedProjects, setNonAssignedProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [allRacks, setAllRacks] = useState([]);
  const [transferDialogs, setTransferDialogs] = useState({
    sendStock: { isOpen: false, project: null, quantity: 0, reason: "" },
    requestStock: { isOpen: false, project: null, quantity: 0, reason: "" },
  });
  const [newRackForm, setNewRackForm] = useState({
    isOpen: false,
    projectIndex: null,
    rackNumber: "",
  });
  const [submittingKey, setSubmittingKey] = useState(null);
  const router = useRouter();

  useEffect(() => {
    if (productId && session) {
      fetchAllProjectsData();
      fetchPendingRequests();
      fetchAllRacks();
    } else {
    }
  }, [productId, session]);
  const fetchAllProjectsData = async () => {
    try {
      setLoading(true);

      const response = await fetch(
        `/api/admin/projects-stock?productId=${productId}`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch projects data");
      }

      if (data.assignedProjects?.length === 0) {
      } else {
      }

  let assignedProjects = data.assignedProjects || [];
      let nonAssignedProjects = data.nonAssignedProjects || [];

      if (session?.user?.role === "admin" || session?.user?.role === "keeper") {
        if (includedProjects && includedProjects.length > 0) {
          const allProjects = [...assignedProjects, ...nonAssignedProjects];

          const filteredIncludedProjects = allProjects.filter((project) => {
            return includedProjects.some((includedProject) => {
              const includedProjectId =
                includedProject._id || includedProject.id || includedProject;
              // Always allow the current user's Lobby project to pass through
              const isLobby = project.isLobby === true;
              return (
                project._id.toString() === includedProjectId.toString() || isLobby
              );
            });
          });

          assignedProjects = filteredIncludedProjects;
          nonAssignedProjects = [];
        } else {
          assignedProjects = [...assignedProjects, ...nonAssignedProjects];
          nonAssignedProjects = [];
        }
      } else {
        if (includedProjects && includedProjects.length > 0) {
          const filterProjects = (projects) => {
            return projects.filter((project) => {
              return includedProjects.some((includedProject) => {
                const includedProjectId =
                  includedProject._id || includedProject.id || includedProject;
                return project._id.toString() === includedProjectId.toString();
              });
            });
          };

          const originalAssignedCount = assignedProjects.length;
          const originalNonAssignedCount = nonAssignedProjects.length;

          const allowLobby = (p) => p.isLobby === true;
          assignedProjects = [
            ...filterProjects(assignedProjects),
          ].filter((p, idx, arr) => allowLobby(p) || arr.findIndex(x => x._id.toString() === p._id.toString()) === idx);
          nonAssignedProjects = [
            ...filterProjects(nonAssignedProjects),
          ].filter((p, idx, arr) => allowLobby(p) || arr.findIndex(x => x._id.toString() === p._id.toString()) === idx);
        }
      }

  // compute total available stock across assigned projects' racks
  let assignedTotalStock = 0;
  const assignedWithAdjustments = assignedProjects.map((project) => {
        const projectData = {
          ...project,
          reasonForAdjustment: "",
          adjustStock: 0,
          selectedRack: "",
        };

        if (project.racks && project.racks.length > 0) {
          let sumOnHand = 0;
          let sumOnHold = 0;
          project.racks.forEach((rack) => {
            projectData[`stockOnHand_${rack.rackNumber}`] = rack.stock || 0;
            projectData[`stockOnHold_${rack.rackNumber}`] =
              rack.stockOnHold || 0;
            projectData[`reason_${rack.rackNumber}`] = "";
            assignedTotalStock += rack.stock || 0;
            sumOnHand += rack.stock || 0;
            sumOnHold += rack.stockOnHold || 0;
          });
          // If project-level aggregates are missing/zero but racks have values, mirror sums
          if (typeof projectData.stockOnHand !== 'number' || projectData.stockOnHand === 0) {
            projectData.stockOnHand = sumOnHand;
          }
          if (typeof projectData.stockOnHold !== 'number' || projectData.stockOnHold === 0) {
            projectData.stockOnHold = sumOnHold;
          }
        }

        return projectData;
      });

      const nonAssignedWithTransfers = nonAssignedProjects.map((project) => ({
        ...project,
        transferQuantity: 0,
        transferReason: "",
      }));

    setAssignedProjects(assignedWithAdjustments);
    setSourceAvailableStock(assignedTotalStock);
      setNonAssignedProjects(nonAssignedWithTransfers);
    } catch (error) {
      setAssignedProjects([]);
      setNonAssignedProjects([]);
    } finally {
      setLoading(false);
    }
  };
  const [sourceAvailableStock, setSourceAvailableStock] = useState(0);
  const fetchAllRacks = async () => {
    try {
      const response = await fetch("/api/Racks");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch racks");
      }

      setAllRacks(data.racks || []);
    } catch (error) {
      console.error("Error fetching racks:", error);
    }
  };

  const fetchPendingRequests = async () => {
    try {
      const response = await fetch(
        `/api/stock-adjustment-requests?role=${session?.user?.role}&productId=${productId}`
      );
      const data = await response.json();

      if (response.ok) {
        setPendingRequests(data.requests || []);
      }
    } catch (error) {
      console.error("Error fetching pending requests:", error);
    }
  };
  const handleStockChange = (projectIndex, field, value) => {
    setAssignedProjects((prev) => {
      const updated = [...prev];
      updated[projectIndex] = {
        ...updated[projectIndex],
        [field]: parseInt(value) || 0,
      };
      return updated;
    });
  };

  const handleReasonChange = (projectIndex, value) => {
    setAssignedProjects((prev) => {
      const updated = [...prev];
      updated[projectIndex] = {
        ...updated[projectIndex],
        reasonForAdjustment: value,
      };
      return updated;
    });
  };

  const handleRackChange = (projectIndex, value) => {
    setAssignedProjects((prev) => {
      const updated = [...prev];
      updated[projectIndex] = {
        ...updated[projectIndex],
        selectedRack: value,
      };
      return updated;
    });
  };

  const handleRackStockChange = (projectIndex, rackNumber, field, value) => {
    setAssignedProjects((prev) => {
      const updated = [...prev];
      updated[projectIndex] = {
        ...updated[projectIndex],
        [`${field}_${rackNumber}`]: parseInt(value) || 0,
      };
      return updated;
    });
  };

  const handleRackReasonChange = (projectIndex, rackNumber, value) => {
    setAssignedProjects((prev) => {
      const updated = [...prev];
      updated[projectIndex] = {
        ...updated[projectIndex],
        [`reason_${rackNumber}`]: value,
      };
      return updated;
    });
  };

  const handleUpdateRackStock = async (projectIndex, rackNumber) => {
    const project = assignedProjects[projectIndex];
    const reason = project[`reason_${rackNumber}`];
    const stockOnHand = project[`stockOnHand_${rackNumber}`];
    const stockOnHold = project[`stockOnHold_${rackNumber}`] || 0;

    if (!reason?.trim()) {
      toast.error("Please provide a reason for adjustment.");
      return;
    }
    if (stockOnHand === undefined || stockOnHand === null) {
      toast.error("Please set the stock on hand value.");
      return;
    }
    if (stockOnHand < 0 || stockOnHold < 0) {
      toast.error("Stock on hand and stock on hold cannot be negative.");
      return;
    }

    try {
      const response = await fetch("/api/admin/direct-rack-stock-update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId,
          projectId: project._id,
          projectName: project.projectName,
          rackNumber,
          stockOnHand,
          stockOnHold,
          reason,
          adminUser: session.user.email,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Rack stock updated successfully!");

        setAssignedProjects((prev) => {
          const updated = [...prev];
          updated[projectIndex] = {
            ...updated[projectIndex],
            [`reason_${rackNumber}`]: "",
          };
          return updated;
        });

        fetchAllProjectsData();
        fetchPendingRequests();
      } else {
        toast.error(data.error);
      }
    } catch (error) {
      console.error("Error updating rack stock:", error);
      toast.error("Failed to update rack stock. Please try again.");
    }
  };

  const getRackOptionsForProject = (project) => {
    if (!project.racks || !allRacks.length) return [];

    const projectRackOptions = allRacks
      .filter((rack) =>
        project.racks.some((rackInfo) => rackInfo._id === rack._id)
      )
      .map((rack) => ({
        value: rack.rackNumber,
        label: rack.rackNumber,
      }));

    return projectRackOptions;
  };

  const handleUpdateStock = async (projectIndex) => {
    const project = assignedProjects[projectIndex];

    if (!project.reasonForAdjustment?.trim()) {
      toast.error("Please provide a reason for adjustment.");
      return;
    }
    if (project.stockOnHand < 0 || project.stockOnHold < 0) {
      toast.error("Stock on hand and stock on hold cannot be negative.");
      return;
    }

    try {
      const response = await fetch("/api/admin/direct-stock-update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId,
          projectId: project._id,
          projectName: project.projectName,
          stockOnHand: project.stockOnHand,
          stockOnHold: project.stockOnHold,
          selectedRack: project.selectedRack,
          reason: project.reasonForAdjustment,
          adminUser: session.user.email,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Stock updated successfully!");
        fetchAllProjectsData();

        setAssignedProjects((prev) => {
          const updated = [...prev];
          updated[projectIndex] = {
            ...updated[projectIndex],
            reasonForAdjustment: "",
            selectedRack: "",
          };
          return updated;
        });
      } else {
        toast.error(data.error);
      }
    } catch (error) {
      console.error("Error updating stock:", error);
      toast.error("Failed to update stock. Please try again.");
    }
  };

  const openSendStockDialog = (project) => {
    setTransferDialogs((prev) => ({
      ...prev,
      sendStock: { isOpen: true, project, quantity: 0, reason: "" },
    }));
  };

  const openRequestStockDialog = (project) => {
    setTransferDialogs((prev) => ({
      ...prev,
      requestStock: { isOpen: true, project, quantity: 0, reason: "" },
    }));
  };

  const closeSendStockDialog = () => {
    setTransferDialogs((prev) => ({
      ...prev,
      sendStock: { isOpen: false, project: null, quantity: 0, reason: "" },
    }));
  };

  const closeRequestStockDialog = () => {
    setTransferDialogs((prev) => ({
      ...prev,
      requestStock: { isOpen: false, project: null, quantity: 0, reason: "" },
    }));
  };

  const handleSendStock = async () => {
    const { project, quantity, reason } = transferDialogs.sendStock;

    if (!quantity || quantity <= 0) {
      toast.error("Please enter a valid quantity.");
      return;
    }

    if (!reason.trim()) {
      toast.error("Please enter a reason for the transfer.");
      return;
    }

    try {
    const response = await fetch("/api/transfers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId,
          fromProjectId: assignedProjects[0]?._id,
          toProjectId: project._id,
          quantity: parseInt(quantity),
      reason: reason,
      requestedBy: session?.user?.id,
      transferType: "OUT",
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Stock transfer initiated successfully!");
        closeSendStockDialog();
        fetchAllProjectsData();
      } else {
        toast.error(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error("Error sending stock:", error);
      toast.error("Failed to send stock. Please try again.");
    }
  };

  const handleRequestStock = async () => {
    const { project, quantity, reason } = transferDialogs.requestStock;

    if (!quantity || quantity <= 0) {
      toast.error("Please enter a valid quantity.");
      return;
    }
    if (!reason.trim()) {
      toast.error("Please enter a reason for the request.");
      return;
    }

    try {
    const response = await fetch("/api/transfers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId,
          fromProjectId: project._id,
          toProjectId: assignedProjects[0]?._id,
          quantity: parseInt(quantity),
      reason: reason,
      requestedBy: session?.user?.id,
      transferType: "IN",
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Stock request sent successfully!");
        closeRequestStockDialog();
        fetchAllProjectsData();
      } else {
        toast.error(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error("Error requesting stock:", error);
      toast.error("Failed to request stock. Please try again.");
    }
  };
  const handleApproveRequest = async (requestId) => {
    try {
      const response = await fetch("/api/stock-adjustment-requests", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestId,
          action: "approve",
        }),
      });

      if (response.ok) {
        toast.success("Stock adjustment approved successfully");
        fetchPendingRequests();
        fetchAllProjectsData();
      } else {
        const error = await response.json();
        toast.error(`Error: ${error.message || "Failed to approve request"}`);
      }
    } catch (error) {
      console.error("Error approving request:", error);
      toast.error("Failed to approve request");
    }
  };

  const handleRejectRequest = async (requestId) => {
    try {
      const response = await fetch("/api/stock-adjustment-requests", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestId,
          action: "reject",
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Request rejected successfully!");
        fetchPendingRequests();
      } else {
        toast.error(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error("Error rejecting request:", error);
      toast.error("Failed to reject request. Please try again.");
    }
  };

  const handleAddNewRackClick = (projectIndex) => {
    setNewRackForm({
      isOpen: true,
      projectIndex,
      rackNumber: "",
    });
  };

  const handleNewRackNumberChange = (value) => {
    setNewRackForm((prev) => ({
      ...prev,
      rackNumber: value,
    }));
  };

  const handleCreateRack = async () => {
    if (!newRackForm.rackNumber?.trim()) {
      toast.error("Please enter a valid rack number");
      return;
    }

    const project = assignedProjects[newRackForm.projectIndex];
    if (!project || !project._id) {
      toast.error("Invalid project selected");
      return;
    }

    try {
      const response = await fetch("/api/Racks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rackNumber: newRackForm.rackNumber.trim(),
          projectId: project._id,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("New rack created successfully!");
        setNewRackForm({ isOpen: false, projectIndex: null, rackNumber: "" });

        fetchAllProjectsData();
        fetchAllRacks();
      } else {
        toast.error(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error("Error creating rack:", error);
      toast.error("Failed to create rack. Please try again.");
    }
  };

  const handleRequestApproval = async (projectIndex, rackNumber) => {
    setSubmittingKey(`${projectIndex}-${rackNumber}`);
    const project = assignedProjects[projectIndex];
    const reason = project[`reason_${rackNumber}`];
    const stockOnHand = project[`stockOnHand_${rackNumber}`];
    const stockOnHold = project[`stockOnHold_${rackNumber}`] || 0;

    if (!rackNumber || !reason?.trim()) {
      toast.error("Please select a rack and provide a reason for adjustment.");
      return;
    }

    try {
      const response = await fetch("/api/stock-adjustment-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId,
          projectId: project._id,
          projectName: project.projectName,
          rackNumber,
          stockOnHand,
          stockOnHold,
          reason,
          isRackLevel: true,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        toast.success("Request approval sent. You'll be notified upon review.");
        fetchPendingRequests && fetchPendingRequests();
        setAssignedProjects((prev) => {
          const updated = [...prev];
          updated[projectIndex][`stockOnHold_${rackNumber}`] = 0;
          updated[projectIndex][`reason_${rackNumber}`] = "";
          return updated;
        });
        setTimeout(() => {
          window.location.reload();
        }, 800);
      } else {
        toast.error(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error("Error submitting request:", error);
      toast.error("Failed to submit request. Please try again.");
    } finally {
      setSubmittingKey(null);
    }
  };
  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        {[...Array(2)].map((_, idx) => (
          <div key={idx} className="mb-8">
            <div className="p-4 border-b-2 border-gray-200 rounded-t-lg bg-gray-50">
              <div className="flex items-center gap-3 mb-2">
                <Skeleton className="w-16 h-4" />
                <Skeleton className="w-10 h-4" />
              </div>
            </div>
            <div className="p-4 border border-t-0 rounded-b-lg">
              {[...Array(3)].map((_, rowIdx) => (
                <div key={rowIdx} className="flex items-center gap-4 mb-4">
                  <Skeleton className="w-24 h-4" />
                  <Skeleton className="w-20 h-4" />
                  <Skeleton className="w-24 h-10" />
                  <Skeleton className="w-24 h-10" />
                  <Skeleton className="w-40 h-10" />
                  <Skeleton className="w-24 h-10" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  const pendingCount = pendingRequests.filter(
    (req) => req.status === "pending"
  ).length;

  const hasValidRacks =
    assignedProjects.length > 0 &&
    assignedProjects.some(
      (project) => project.racks && project.racks.length > 0
    );

  if (!loading && !hasValidRacks) {
    return (
      <div className="flex flex-col gap-5">
        <div className="p-8 text-center border-2 border-gray-300 border-dashed rounded-lg bg-gray-50">
          <div className="flex flex-col items-center gap-4">
            <div className="p-3 bg-gray-200 rounded-full">
              <PackagePlus className="w-8 h-8 text-gray-500" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-gray-700">
                No Racks Available
              </h3>
              <p className="max-w-md text-sm text-gray-500">
                {assignedProjects.length === 0
                  ? session?.user?.role === "admin"
                    ? "No projects are included in this product's project list."
                    : "You don't have access to any projects for this product."
                  : "No racks are assigned to the available projects for this product."}
              </p>
              {includedProjects && includedProjects.length > 0 && (
                <p className="mt-2 text-xs text-gray-400">
                  This product is restricted to specific projects only.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {" "}
      {/* Admin's Projects Section */}
      {assignedProjects.length > 0 ? (
        <div>
          {/* Group by Project with Individual Rack Rows */}
          {assignedProjects.map((project, projectIndex) => {
            // Sort racks so racks with stock appear on top
            const sortedRacks = project.racks
              ?.slice()
              .sort((a, b) => (b.stock || 0) - (a.stock || 0));

            // Compute unassigned on-hold: project-level hold minus sum of rack-level holds
            const rackHoldSum = (project.racks || []).reduce((sum, rack) => {
              const key = `stockOnHold_${rack.rackNumber}`;
              const perRackHold = typeof project[key] === "number" ? project[key] : (rack.stockOnHold || 0);
              return sum + (Number(perRackHold) || 0);
            }, 0);
            const projectHold = Number(project.stockOnHold || 0);
            const unassignedHold = Math.max(0, projectHold - rackHoldSum);

            const isExcluded = excludedProjects.some(
              (pid) => pid.toString() === project._id.toString()
            );
            const projectTransferApprovals = pendingRequests.filter(
              (req) =>
                req.status === "pending" &&
                req.toProjectId?.toString() === project._id.toString()
            );
            return (
              <div key={project._id} className="mb-8">
                <div className="px-0 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <h4 className="text-xl font-medium text-gray-800">
                        {project.projectName}
                        {project.isLobby && (
                          <span className="ml-2 text-xs font-semibold text-gray-500">• Lobby</span>
                        )}
                      </h4>
                      <p className="text-base text-gray-600">
                        ({project.racks?.length || 0} racks)
                      </p>
                      {unassignedHold > 0 && (
                        <span className="px-2 py-0.5 text-xs font-medium text-amber-700 bg-amber-100 rounded">
                          Unassigned hold: {unassignedHold}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <Table className="border-t-0">
                  <TableHeader>
                    <TableRow className="bg-gray-25">
                      <TableHead className="w-[150px]">RACK</TableHead>
                      <TableHead className="w-[120px]">CURRENT STOCK</TableHead>
                      <TableHead className="w-[150px]">STOCK ON HAND</TableHead>
                      <TableHead className="w-[150px]">STOCK ON HOLD</TableHead>
                      <TableHead className="text-left">
                        REASON FOR CHANGES
                      </TableHead>
                      <TableHead className="w-[120px]">ACTION</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {project.racks && sortedRacks.length > 0 ? (
                      sortedRacks.map((rack, rackIndex) => (
                        <TableRow
                          key={`${project._id}-${rack._id}`}
                          className={
                            isExcluded ? "opacity-50 pointer-events-none" : ""
                          }
                        >
                          <TableCell className="py-3">
                            <div className="font-medium text-gray-900">
                              {rack.rackNumber}
                            </div>
                          </TableCell>
                          <TableCell className="py-3">
                            <div className="text-sm text-gray-600">
                              {rack.stock || 0} units
                            </div>
                          </TableCell>
                          <TableCell className="py-3">
                            <NumberInput
                              placeholder="0"
                              value={
                                typeof project[
                                  `stockOnHand_${rack.rackNumber}`
                                ] === "number"
                                  ? project[`stockOnHand_${rack.rackNumber}`]
                                  : typeof rack.stock === "number"
                                  ? rack.stock
                                  : 0
                              }
                              onChange={(value) =>
                                handleRackStockChange(
                                  projectIndex,
                                  rack.rackNumber,
                                  "stockOnHand",
                                  value
                                )
                              }
                              className="w-full h-10"
                              disabled={
                                isExcluded ||
                                (session?.user?.role !== "admin" &&
                                  session?.user?.role !== "keeper")
                              }
                            />
                          </TableCell>
                          <TableCell className="py-3">
                            <NumberInput
                              placeholder="0"
                              value={
                                typeof project[
                                  `stockOnHold_${rack.rackNumber}`
                                ] === "number"
                                  ? project[`stockOnHold_${rack.rackNumber}`]
                                  : 0
                              }
                              onChange={(value) =>
                                handleRackStockChange(
                                  projectIndex,
                                  rack.rackNumber,
                                  "stockOnHold",
                                  value
                                )
                              }
                              className="w-full h-10"
                              disabled={
                                isExcluded ||
                                (session?.user?.role !== "admin" &&
                                  session?.user?.role !== "keeper")
                              }
                            />
                          </TableCell>
                          <TableCell className="py-3">
                            <Input
                              placeholder="Enter reason for changes"
                              value={project[`reason_${rack.rackNumber}`] || ""}
                              onChange={(e) =>
                                handleRackReasonChange(
                                  projectIndex,
                                  rack.rackNumber,
                                  e.target.value
                                )
                              }
                              className="w-full h-10"
                              disabled={
                                isExcluded ||
                                (session?.user?.role !== "admin" &&
                                  session?.user?.role !== "keeper")
                              }
                            />
                          </TableCell>
                          <TableCell className="py-3">
                            {session?.user?.role === "admin" && (
                              <Button
                                className="w-full h-10 normal-case"
                                variant="secondary"
                                size="sm"
                                onClick={() =>
                                  handleUpdateRackStock(
                                    projectIndex,
                                    rack.rackNumber
                                  )
                                }
                                disabled={
                                  isExcluded ||
                                  !project[`reason_${rack.rackNumber}`]?.trim()
                                }
                              >
                                Apply Changes
                              </Button>
                            )}
                            {session?.user?.role === "keeper" && (
                              <Button
                                className="w-full h-10 normal-case"
                                variant="secondary"
                                size="sm"
                                onClick={() =>
                                  handleRequestApproval(
                                    projectIndex,
                                    rack.rackNumber
                                  )
                                }
                                disabled={
                                  isExcluded ||
                                  !project[`reason_${rack.rackNumber}`]?.trim() ||
                                  submittingKey === `${projectIndex}-${rack.rackNumber}`
                                }
                              >
                                {submittingKey === `${projectIndex}-${rack.rackNumber}` ? (
                                  <span className="flex items-center justify-center w-full">
                                    <svg className="mr-3 -ml-1 size-5 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                    <span className="sr-only">Processing...</span>
                                  </span>
                                ) : (
                                  "Request Approval"
                                )}
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="py-8 text-center text-gray-500"
                        >
                          No racks available for this project
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                {/* {session?.user?.role === "admin" && (
                  <div className="flex items-center justify-end py-2">
                  <Button
                    variant="default"
                    size="sm"
                    className="!h-10"
                    onClick={() => handleAddNewRackClick(projectIndex)}
                  >
                    <PackagePlus className="w-4 h-4 mr-2" /> Add New Rack
                  </Button>
                  </div>
                )} */}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-6 text-center border border-gray-200 rounded-lg bg-gray-50">
          <h3 className="mb-2 text-lg font-semibold text-gray-700">
            No Projects Available
          </h3>
          <p className="mb-4 text-gray-600">
            {session?.user?.role === "admin"
              ? "No projects found in the system for this product. You can create projects and assign this product to them."
              : "You have no assigned projects for this product. Please contact an administrator to get projects assigned."}
          </p>
          {session?.user?.role === "admin" && (
            <Button
              variant="outline"
              size="sm"
              className="text-blue-600 border-blue-300 hover:bg-blue-50"
              onClick={() => router.push("/manage-projects")}
            >
              Manage Projects
            </Button>
          )}
        </div>
      )}
      {/* Other Projects Section - For Transfers (Only for non-admin users) */}
      {/* Add footer with approval buttons for admin */}
      {/* {session?.user?.role === "admin" && (
        <div className="mt-4 mb-6">
          <div className="flex items-center justify-end gap-3 p-4 rounded-lg">
            <button 
              className="px-4 py-2 text-sm font-medium text-white transition-colors bg-blue-600 rounded-md hover:bg-blue-700"
              onClick={() => {
                toast.info("Transfer approvals functionality is being integrated.");
              }}
            >
              0 TRANSFER APPROVALS
            </button>
          </div>
        </div>
      )} */}
      {nonAssignedProjects.length > 0 && session?.user?.role !== "admin" && (
        <div>
          <div className="p-4 mb-4 rounded-lg bg-gray-50">
            <h3 className="mb-2 text-lg font-semibold text-gray-800">
              Other Projects - Stock Transfers
            </h3>
            <p className="text-sm text-gray-600">
              Send stock to or request stock from other projects.
            </p>
          </div>

          <Table className="!p-10">
            <TableHeader>
              <TableRow className="!border-b-0">
                <TableHead className="w-[200px]">PROJECT</TableHead>
                <TableHead className="w-1/5">STOCK ON HAND</TableHead>
                <TableHead className="w-1/5">STOCK ON HOLD</TableHead>
                <TableHead className="text-left">REASON FOR REQUEST</TableHead>
                <TableHead className="w-[200px]">ACTIONS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {nonAssignedProjects.map((project, index) => {
                const isExcluded = excludedProjects.some(
                  (pid) => pid.toString() === project._id.toString()
                );
                const projectTransferApprovals = pendingRequests.filter(
                  (req) =>
                    req.status === "pending" &&
                    req.toProjectId?.toString() === project._id.toString()
                );
                return (
                  <TableRow
                    key={project._id}
                    className={
                      isExcluded ? "opacity-50 pointer-events-none" : ""
                    }
                  >
                    <TableCell className="py-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: project.color }}
                        />
                        <span className="font-medium">
                          {project.projectName}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-2">
                      <span className="text-gray-600">
                        {project.stockOnHand}
                      </span>
                    </TableCell>
                    <TableCell className="py-2">
                      <span className="text-gray-600">
                        {project.stockOnHold}
                      </span>
                    </TableCell>
                    <TableCell className="py-2">
                      <span className="text-sm text-gray-400">
                        ADD REQUIREMENT
                      </span>
                    </TableCell>
                    <TableCell className="py-2">
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openSendStockDialog(project)}
                          className="text-blue-600 border-blue-300 hover:bg-blue-50"
                          disabled={isExcluded || sourceAvailableStock <= 0}
                          title={sourceAvailableStock <= 0 ? "No stock available in your project (Lobby). Use Request Stock instead." : undefined}
                        >
                          Send Stock
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openRequestStockDialog(project)}
                          className="text-green-600 border-green-300 hover:bg-green-50"
                          disabled={isExcluded}
                        >
                          Request Stock
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
      {/* Send Stock Dialog */}
      {transferDialogs.sendStock.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="p-6 bg-white rounded-lg w-96">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                Send Stock to {transferDialogs.sendStock.project?.projectName}
              </h3>
              <button
                onClick={closeSendStockDialog}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <p className="mb-4 text-gray-600">
              Send stock from your assigned project to{" "}
              {transferDialogs.sendStock.project?.projectName}. Stock will be
              transferred out of your project.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block mb-1 text-sm font-medium">
                  Stock Quantity
                </label>
                <NumberInput
                  placeholder="Enter quantity"
                  value={transferDialogs.sendStock.quantity}
                  onChange={(value) =>
                    setTransferDialogs((prev) => ({
                      ...prev,
                      sendStock: { ...prev.sendStock, quantity: value },
                    }))
                  }
                  className="w-full"
                />
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium">Reason</label>
                <textarea
                  placeholder="Enter reason for transfer request"
                  value={transferDialogs.sendStock.reason}
                  onChange={(e) =>
                    setTransferDialogs((prev) => ({
                      ...prev,
                      sendStock: { ...prev.sendStock, reason: e.target.value },
                    }))
                  }
                  className="w-full p-2 border rounded-md resize-none"
                  rows={3}
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <Button onClick={handleSendStock} className="flex-1">
                Send Stock
              </Button>
              <Button
                variant="outline"
                onClick={closeSendStockDialog}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* Request Stock Dialog */}
      {transferDialogs.requestStock.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="p-6 bg-white rounded-lg w-96">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                Request Stock from{" "}
                {transferDialogs.requestStock.project?.projectName}
              </h3>
              <button
                onClick={closeRequestStockDialog}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <p className="mb-4 text-gray-600">
              Request stock from{" "}
              {transferDialogs.requestStock.project?.projectName} to be
              transferred to your assigned project. Available:{" "}
              {transferDialogs.requestStock.project?.stockOnHand || 0}
            </p>
            <div className="space-y-4">
              <div>
                <label className="block mb-1 text-sm font-medium">
                  Stock Quantity
                </label>
                <NumberInput
                  placeholder="0"
                  value={transferDialogs.requestStock.quantity}
                  onChange={(value) =>
                    setTransferDialogs((prev) => ({
                      ...prev,
                      requestStock: { ...prev.requestStock, quantity: value },
                    }))
                  }
                  className="w-full"
                />
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium">Reason</label>
                <textarea
                  placeholder="Enter reason for transfer request"
                  value={transferDialogs.requestStock.reason}
                  onChange={(e) =>
                    setTransferDialogs((prev) => ({
                      ...prev,
                      requestStock: {
                        ...prev.requestStock,
                        reason: e.target.value,
                      },
                    }))
                  }
                  className="w-full p-2 border rounded-md resize-none"
                  rows={3}
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <Button onClick={handleRequestStock} className="flex-1">
                Request Stock
              </Button>
              <Button
                variant="outline"
                onClick={closeRequestStockDialog}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* New Rack Form Dialog */}
      {newRackForm.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
          <div className="p-6 bg-white rounded-lg w-96">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                Add New Rack to{" "}
                {assignedProjects[newRackForm.projectIndex]?.projectName}
              </h3>
              <button
                onClick={() =>
                  setNewRackForm({
                    isOpen: false,
                    projectIndex: null,
                    rackNumber: "",
                  })
                }
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block mb-1 text-sm font-medium">
                  Rack Number
                </label>
                <Input
                  placeholder="Enter new rack number"
                  value={newRackForm.rackNumber}
                  onChange={(e) => handleNewRackNumberChange(e.target.value)}
                  className="w-full"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <Button onClick={handleCreateRack} className="flex-1">
                Create Rack
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  setNewRackForm({
                    isOpen: false,
                    projectIndex: null,
                    rackNumber: "",
                  })
                }
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* Pending Approval Requests - Only shown for non-admin users or when not using ApprovalSheet */}
      {pendingRequests.length > 0 && session?.user?.role !== "admin" && (
        <div className="mt-8">
          <h3 className="mb-4 text-lg font-semibold text-orange-800">
            Pending Approval Requests ({pendingCount})
          </h3>
          <div className="space-y-4">
            {pendingRequests
              .filter((req) => req.status === "pending")
              .map((request) => (
                <div
                  key={request._id}
                  className="p-4 border border-orange-200 rounded-lg bg-orange-50"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">
                        {request.projectName} - Rack {request.rackNumber}
                      </h4>{" "}
                      <p className="mt-1 text-sm text-gray-600">
                        Requested by: {request.requestedBy} on
                        {new Date(
                          request.requestedAt || request.createdAt
                        ).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-gray-600">
                        New Stock: {request.stockOnHand} | Hold:{" "}
                        {request.stockOnHold}
                      </p>
                      <p className="mt-2 text-sm text-gray-700">
                        <strong>Reason:</strong> {request.reason}
                      </p>
                    </div>{" "}
                    <div className="flex gap-2 ml-4">
                      {/* Approval buttons shown only for managers who need to see status */}
                      <div className="px-3 py-1 text-sm text-gray-600 bg-gray-100 rounded">
                        Pending Admin Approval
                      </div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
      {/* Create New Rack Dialog */}
      {newRackForm.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="p-6 bg-white rounded-lg w-96">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                Create New Rack for{" "}
                {assignedProjects[newRackForm.projectIndex]?.projectName}
              </h3>
              <button
                onClick={() =>
                  setNewRackForm({
                    isOpen: false,
                    projectIndex: null,
                    rackNumber: "",
                  })
                }
                className="text-gray-500 cursor-pointer hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <p className="mb-4 text-gray-600">
              Create a new rack for this project to store inventory items.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block mb-1 text-sm font-medium">
                  Rack Number
                </label>
                <Input
                  placeholder="Enter rack number (e.g. RACK-001)"
                  value={newRackForm.rackNumber}
                  onChange={(e) => handleNewRackNumberChange(e.target.value)}
                  className="w-full"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <Button
                onClick={handleCreateRack}
                className="flex-1"
                disabled={!newRackForm.rackNumber?.trim()}
              >
                Create Rack
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  setNewRackForm({
                    isOpen: false,
                    projectIndex: null,
                    rackNumber: "",
                  })
                }
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminProjectRackTable;
