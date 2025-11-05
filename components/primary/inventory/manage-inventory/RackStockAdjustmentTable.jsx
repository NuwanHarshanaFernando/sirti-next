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
import NumberInput from "@/components/shared/number-input";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { PackagePlus } from "lucide-react";
import ApprovalSheet from "@/components/popups/ApprovalSheet/ApprovalSheet";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

const RackStockAdjustmentTable = ({
  productId,
  session,
  excludedProjects = [],
  includedProjects = [],
}) => {
  const [assignedProjects, setAssignedProjects] = useState([]);
  const [rackData, setRackData] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submittingIndex, setSubmittingIndex] = useState(null);

  // Check if manager's assigned projects are included in product's includedProjects
  const hasAccessToStockAdjustment = () => {
    // Only apply this restriction to managers
    if (session?.user?.role !== "manager") {
      return true; // Admin, keeper, etc. have full access
    }

    // If no includedProjects are set for the product, allow access
    if (!includedProjects || includedProjects.length === 0) {
      return true;
    }

    // Always allow if user's Lobby project is present
    const hasLobby = assignedProjects.some(p => p.isLobby === true);
    if (hasLobby) return true;

    const hasIntersection = assignedProjects.some((assignedProject) => {
      return includedProjects.some((includedProject) => {
        const includedProjectId =
          includedProject._id || includedProject.id || includedProject;
        return assignedProject._id.toString() === includedProjectId.toString();
      });
    });


  return hasIntersection;
  };

  const createEmptyRow = (projectId = null, rackNumber = "") => ({
    id: Date.now() + Math.random(),
    projectId,
    rack: rackNumber,
    stockOnHand: 0,
    stockOnHold: 0,
    reasonForAdjustment: "",
    showCreateRackForm: false,
    newRackNumber: "",
    selectedProjectId: projectId,
  });

  useEffect(() => {
    if (productId && session) {
      fetchAssignedProjects();
      fetchPendingRequests();
    }
  }, [productId, session]);
  const fetchAssignedProjects = async () => {
    try {
      // Detect if we're in test mode based on URL path
      const isTestMode = window.location.pathname.includes("/test/");
      const apiEndpoint = isTestMode
        ? `/api/test-manager-projects?productId=${productId}&email=manager@test.com`
        : `/api/manager/assigned-projects?productId=${productId}`;

      const response = await fetch(apiEndpoint);
      const data = await response.json();

      if (response.ok) {
        // Start with all assigned projects from API
        let filteredProjects = data.assignedProjects || [];

        // Restrict managers only when product has includedProjects
        if (
          session?.user?.role === "manager" &&
          includedProjects &&
          includedProjects.length > 0
        ) {
          filteredProjects = filteredProjects.filter((assignedProject) => {
            // Always keep the user's Lobby project regardless of product restriction
            if (assignedProject.isLobby) return true;
            return includedProjects.some((includedProject) => {
              const includedProjectId =
                includedProject._id || includedProject.id || includedProject;
              return (
                assignedProject._id.toString() === includedProjectId.toString()
              );
            });
          });
        }

        setAssignedProjects(filteredProjects);

        // Initialize rack data based on filtered assigned projects
        const initialRackData = [];
        filteredProjects.forEach((project) => {
          if (Array.isArray(project.racks) && project.racks.length > 0) {
            project.racks.forEach((rack) => {
              const rackNumber = rack?.rackNumber || rack?.number || rack?.name || "";
              const onHand = Number(rack?.stockOnHand) || 0;
              const onHold = Number(rack?.stockOnHold) || 0;
              initialRackData.push({
                id: Date.now() + Math.random(),
                projectId: project._id,
                projectName: project.ProjectName,
                projectColor: project.ProjectColor,
                rack: rackNumber,
                stockOnHand: onHand,
                stockOnHold: onHold,
                reasonForAdjustment: "",
              });
            });
          } else {
            // Add empty row for projects without racks
            initialRackData.push(createEmptyRow(project._id));
          }
        });

        // Add at least one empty row if no data
        if (initialRackData.length === 0) {
          initialRackData.push(createEmptyRow());
        }

        setRackData(initialRackData);
      }
    } catch (error) {
      console.error("Error fetching assigned projects:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingRequests = async () => {
    try {
      const response = await fetch(
        `/api/stock-adjustment-requests?role=${session?.user?.role}`
      );
      const data = await response.json();

      if (response.ok) {
        setPendingRequests(data.requests || []);
      }
    } catch (error) {
      console.error("Error fetching pending requests:", error);
    }
  }; // Generate rack options from available racks
  const getRackOptions = (currentIndex = null) => {
    const rackOptions = [];

    // Get all currently selected racks except for the current row being edited
    const selectedRacks = rackData
      .map((item, index) => (index !== currentIndex ? item.rack : null))
      .filter((rack) => rack && rack.trim() !== "");

    // Add a "Create New Rack" option at the top
    // rackOptions.push({
    //   value: "CREATE_NEW_RACK",
    //   label: "➕ Create New Rack",
    //   projectId: null,
    //   disabled: false,
    //   className: "font-medium text-blue-600",
    // });

    assignedProjects.forEach((project) => {
      if (project.racks && project.racks.length > 0) {
        project.racks.forEach((rack) => {
          const isSelected = selectedRacks.includes(rack.rackNumber);
          rackOptions.push({
      value: rack.rackNumber,
      label: `${rack.rackNumber} (${project.ProjectName}${project.isLobby ? ' • Lobby' : ''})${
              isSelected ? " - Already Selected" : ""
            }`,
            projectId: project._id,
            disabled: isSelected,
            className: isSelected ? "opacity-50 text-gray-400" : "",
          });
        });
      }
    });

    return rackOptions;
  };
  const handleRackChange = (index, value) => {
    // If "Create New Rack" is selected, update the state to show the create rack form
    if (value === "CREATE_NEW_RACK") {
      setRackData((prev) => {
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          rack: value,
          showCreateRackForm: true,
          newRackNumber: "",
          selectedProjectId:
            updated[index].projectId ||
            (assignedProjects.length > 0 ? assignedProjects[0]._id : null),
        };
        return updated;
      });
      return;
    }

    // Check if the selected rack is disabled (already selected elsewhere)
    const rackOptions = getRackOptions(index);
    const selectedOption = rackOptions.find((opt) => opt.value === value);

    if (selectedOption && selectedOption.disabled) {
      // Prevent selection of disabled racks
      toast.error(
        "This rack is already selected in another row. Please choose a different rack."
      );
      return;
    }

    setRackData((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        rack: value,
        projectId: selectedOption?.projectId || updated[index].projectId,
        showCreateRackForm: false,
      };
      return updated;
    });
  };

  const handleStockOnHandChange = (index, value) => {
    setRackData((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], stockOnHand: value };
      return updated;
    });
  };

  const handleStockOnHoldChange = (index, value) => {
    setRackData((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        stockOnHold: value,
        rackNumber: updated[index].rack, // Ensure rack number is included
      };
      return updated;
    });
  };

  const handleReasonChange = (index, value) => {
    setRackData((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], reasonForAdjustment: value };
      return updated;
    });
  };

  const handleRequestApproval = async (index) => {
    const item = rackData[index];
    if (!item.rack || !item.reasonForAdjustment?.trim()) {
      toast.error("Please select a rack and provide a reason for adjustment.");
      return;
    }

    try {
      setSubmittingIndex(index);
      const response = await fetch("/api/stock-adjustment-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId,
          projectId: item.projectId,
          projectName: item.projectName,
          rackNumber: item.rack,
          stockOnHand: item.stockOnHand,
          stockOnHold: item.stockOnHold,
          reason: item.reasonForAdjustment,
          // Additional field to indicate this is a rack-level adjustment
          isRackLevel: true,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        toast.success("Request approval sent. You'll be notified upon review.");
        fetchPendingRequests(); // Refresh pending requests
        setTimeout(() => {
          window.location.reload();
        }, 800);
        // Do not reset field values; keep user inputs intact
      } else {
        toast.error(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error("Error submitting request:", error);
      toast.error("Failed to submit request. Please try again.");
    } finally {
      setSubmittingIndex(null);
    }
  };

  const duplicateRow = (index) => {
    setRackData((prev) => {
      const updated = [...prev];
      const newRow = createEmptyRow();
      updated.splice(index + 1, 0, newRow);
      return updated;
    });
  };

  const handleNewRackNumberChange = (index, value) => {
    setRackData((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], newRackNumber: value };
      return updated;
    });
  };

  const handleProjectIdChange = (index, value) => {
    setRackData((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], selectedProjectId: value };
      return updated;
    });
  };

  const getProjectOptions = () => {
    return assignedProjects.map((project) => ({
      value: project._id,
      label: project.ProjectName || "Unknown Project",
    }));
  };

  const handleCreateRack = async (index) => {
    const item = rackData[index];

    if (!item.newRackNumber?.trim()) {
      toast.error("Please enter a valid rack number");
      return;
    }

    if (!item.selectedProjectId) {
      toast.error("Please select a project for the new rack");
      return;
    }

    try {
      const response = await fetch("/api/Racks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rackNumber: item.newRackNumber.trim(),
          projectId: item.selectedProjectId,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("New rack created successfully!");

        // Update the rack data with the newly created rack
        setRackData((prev) => {
          const updated = [...prev];
          updated[index] = {
            ...updated[index],
            rack: data.rack.rackNumber,
            projectId: item.selectedProjectId,
            showCreateRackForm: false,
          };
          return updated;
        });

        // Refresh assigned projects to include the new rack
        fetchAssignedProjects();
      } else {
        toast.error(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error("Error creating rack:", error);
      toast.error("Failed to create rack. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-5">
        <div className="p-4 mb-4 rounded-lg bg-blue-50">
          <Skeleton className="w-1/3 h-6 mb-2" />
          <Skeleton className="w-1/2 h-4" />
        </div>
        <div className="p-4 border rounded-lg">
          {[...Array(3)].map((_, idx) => (
            <div key={idx} className="flex items-center gap-4 mb-4">
              <Skeleton className="w-48 h-10" />
              <Skeleton className="w-24 h-10" />
              <Skeleton className="w-24 h-10" />
              <Skeleton className="w-40 h-10" />
              <Skeleton className="w-32 h-10" />
              <Skeleton className="w-12 h-10" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const pendingCount = pendingRequests.filter(
    (req) => req.status === "pending"
  ).length;

  // Check if there are any rows that represent a rack or editable entry
  const hasValidRacks = Array.isArray(rackData) && rackData.length > 0 &&
    rackData.some((row) => (row?.rack && row.rack !== "") || row?.showCreateRackForm);

  // If no valid racks, show message instead of table
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
                  ? "Your assigned projects are not included in this product's project list, or no projects are assigned to you."
                  : "No racks are assigned to your available projects for this product."}
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

  // Preserve user-entered order to avoid rows jumping while adjusting quantities
  const sortedRackData = rackData;

  return (
    <div className="flex flex-col gap-5">
      {/* <div className="p-4 rounded-lg bg-blue-50">
        <h3 className="mb-2 text-lg font-semibold text-blue-800">
          Your Assigned Projects - Stock Adjustment
        </h3>
        <p className="text-sm text-blue-600">
          Manage stock for projects assigned to you. Changes require approval.
        </p>
        {getRackOptions().length === 0 && assignedProjects.length > 0 && (
          <div className="p-3 mt-3 border border-yellow-200 rounded-md bg-yellow-50">
            <p className="text-sm text-yellow-800">
              ⚠️ No racks are currently assigned to your projects. Please
              contact an administrator to assign racks to your projects.
            </p>
          </div>
        )}
      </div> */}

      <Table className="!p-10">
        <TableHeader>
          <TableRow className="!border-b-0">
            <TableHead className="w-[250px]">RACK</TableHead>
            <TableHead className="w-1/5">Stock on hand</TableHead>
            <TableHead className="w-1/5">Stock on Hold</TableHead>
            <TableHead className="text-left">REASON FOR ADJUSTMENT</TableHead>
            <TableHead className="w-[150px]">ACTION</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedRackData.map((item, index) => {
            const project = assignedProjects.find(
              (p) => p._id === item.projectId
            );
            const isExcluded = excludedProjects.some(
              (pid) => pid.toString() === item.projectId?.toString()
            );
            return (
              <TableRow
                key={item.id || `${item.rack}-${index}`}
                className={isExcluded ? "opacity-50 pointer-events-none" : ""}
              >
                {/* ...existing code for TableCell rendering... */}
                <TableCell className="py-2">
                  <div className="flex flex-col gap-2">
                    {item.showCreateRackForm ? (
                      <div className="flex flex-col gap-2 p-2 rounded-md bg-blue-50">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-blue-700">
                            Create New Rack:
                          </span>
                        </div>
                        <div className="flex flex-col gap-2">
                          <Input
                            placeholder="Enter Rack Number"
                            value={item.newRackNumber || ""}
                            onChange={(e) =>
                              handleNewRackNumberChange(index, e.target.value)
                            }
                            className="h-10"
                          />
                          <Combobox
                            placeholder="Select Project"
                            value={item.selectedProjectId || ""}
                            onValueChange={(value) =>
                              handleProjectIdChange(index, value)
                            }
                            options={getProjectOptions()}
                            className="h-10"
                          />
                          <div className="flex gap-2">
                            <Button
                              className="flex-1 h-10"
                              variant="secondary"
                              onClick={() => handleCreateRack(index)}
                              disabled={
                                !item.newRackNumber?.trim() ||
                                !item.selectedProjectId
                              }
                            >
                              Create Rack
                            </Button>
                            <Button
                              className="flex-1 h-10"
                              variant="outline"
                              onClick={() => {
                                setRackData((prev) => {
                                  const updated = [...prev];
                                  updated[index] = {
                                    ...updated[index],
                                    rack: "",
                                    showCreateRackForm: false,
                                  };
                                  return updated;
                                });
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        {getRackOptions(index).length > 0 ? (
                          <Combobox
                            placeholder="Select Rack"
                            searchPlaceholder="Search racks..."
                            emptyText="No rack found."
                            value={item.rack || ""}
                            onValueChange={(value) =>
                              handleRackChange(index, value)
                            }
                            options={getRackOptions(index)}
                            className="w-full h-12"
                            icon={() => null}
                          />
                        ) : (
                          <div className="flex items-center justify-center w-full h-12 border border-gray-300 rounded-md bg-gray-50">
                            <span className="text-sm text-gray-500">
                              No racks available for assigned projects
                            </span>
                          </div>
                        )}
                        {/* {project && !item.showCreateRackForm && (
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: project.ProjectColor }}
                            />
                            <span className="text-xs text-gray-600">
                              {project.ProjectName}
                            </span>
                          </div>
                        )} */}
                      </>
                    )}
                  </div>
                </TableCell>
                <TableCell className="py-2">
                  <NumberInput
                    value={item.stockOnHand}
                    onChange={(value) => handleStockOnHandChange(index, value)}
                    disabled={
                      !hasAccessToStockAdjustment() ||
                      (session?.user?.role !== "manager" &&
                        session?.user?.role !== "admin") ||
                      isExcluded
                    }
                  />
                </TableCell>
                <TableCell className="py-2">
                  {session?.user?.role === "manager" ? (
                    <Input
                      value={item.stockOnHold}
                      readOnly
                      disabled
                      className="h-12 text-center opacity-100 bg-gray-50 disabled:opacity-100"
                    />
                  ) : (
                    <NumberInput
                      value={item.stockOnHold}
                      onChange={(value) => handleStockOnHoldChange(index, value)}
                      disabled={
                        !hasAccessToStockAdjustment() ||
                        (session?.user?.role !== "manager" &&
                          session?.user?.role !== "admin") ||
                        isExcluded
                      }
                    />
                  )}
                </TableCell>
                <TableCell className="py-2 text-end">
                  <Input
                    placeholder="ENTER REASON FOR ADJUSTMENTS"
                    value={item.reasonForAdjustment || ""}
                    onChange={(e) => handleReasonChange(index, e.target.value)}
                    disabled={
                      !hasAccessToStockAdjustment() ||
                      (session?.user?.role !== "manager" &&
                        session?.user?.role !== "admin") ||
                      isExcluded
                    }
                  />
                </TableCell>
                <TableCell className="py-2">
                  <Button
                    className="w-full h-12 normal-case"
                    variant="secondary"
                    size="secondary"
                    onClick={() => handleRequestApproval(index)}
                    disabled={
                      !hasAccessToStockAdjustment() ||
                      !item.rack ||
                      item.showCreateRackForm ||
                      !item.reasonForAdjustment?.trim() ||
                      (session?.user?.role !== "manager" &&
                        session?.user?.role !== "admin") ||
                      isExcluded ||
                      submittingIndex === index
                    }
                  >
                    {submittingIndex === index ? (
                      <span className="flex items-center justify-center w-full">
                        <svg className="mr-3 -ml-1 text-white size-5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        <span className="sr-only">Processing...</span>
                      </span>
                    ) : (
                      "Request Approval"
                    )}
                  </Button>
                </TableCell>
                <TableCell className="py-2">
                  {session?.user?.role === "admin" &&
                    !isExcluded &&
                    index === sortedRackData.length - 1 && (
                      <div
                        className="flex flex-row items-center justify-center w-12 h-12 p-3.5 rounded-lg cursor-pointer bg-amalfitanAzure/5 hover:bg-amalfitanAzure/10"
                        onClick={() => duplicateRow(index)}
                      >
                        <PackagePlus className="stroke-amalfitanAzure" />
                      </div>
                    )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
        <TableFooter className="border-t-0">
          <TableRow>
            <TableCell colSpan={6} className="text-left">
              <ApprovalSheet
                triggerText="PENDING APPROVALS"
                pendingCount={pendingCount}
                session={session}
                requests={pendingRequests}
              />
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
};

export default RackStockAdjustmentTable;
