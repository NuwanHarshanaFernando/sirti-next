"use client";
import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Breadcrumb from "@/components/primary/reports/PrimaryBreadcrumb";
import DatePicker from "@/components/shared/date-picker";
import { Button } from "../ui/button";
import Calendar23 from "../calendar-23";
import { Combobox } from "../ui/combobox";
import { SlidersHorizontal } from "lucide-react";
import ReportsTable from "../primary/reports/ReportsTable";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

const ReportsLayout = () => {
  const { data: session } = useSession();
  const [selectedFilter, setSelectedFilter] = useState("stock_adjustments");
  const [dateRange, setDateRange] = useState(undefined);
  const [activities, setActivities] = useState([]);
  const [filteredActivities, setFilteredActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectOptions, setProjectOptions] = useState([]);
  const [reportsReloadKey, setReportsReloadKey] = useState(0);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        setLoading(true);

        const response = await fetch("/api/activities");
        if (!response.ok) {
          throw new Error("Failed to fetch activities");
        }
        const data = await response.json();
        const usersResponse = await fetch("/api/Users");
        const usersResult = usersResponse.ok ? await usersResponse.json() : { users: [] };
        const userMap = {};
        const usersData = usersResult.users || [];
        usersData.forEach(user => {
          if (user._id) {
            userMap[user._id] = user.name || user.email || 'Unknown User';
          }
          if (user.email) {
            userMap[user.email] = user.name || user.email || 'Unknown User';
          }
        });

        if (data.success && Array.isArray(data.activities)) {
          const processedActivities = data.activities.map(activity => {
            let affectValue = 0;
            let grantedInfo = [];

            const enhancedUserName = userMap[activity.userId] ||
              userMap[activity.userEmail] ||
              activity.userName ||
              'Unknown User';
            if (activity.type === "Stock" || activity.entityType === "Stock") {
              if (activity.action === "Transferred" || activity.action === "Approved Transfer") {
                affectValue = activity.changes?.quantityTransferred || activity.changes?.quantity || 0;
              } else if (activity.action === "Adjusted" || activity.action === "Incremented stock" || activity.action === "Decremented stock") {
                affectValue = Math.abs(activity.changes?.quantityAdjusted || activity.changes?.newQuantity || activity.changes?.quantity || 0);
              } else if (activity.action === "Stock Request" || activity.action === "Created Stock Transfer Request") {
                affectValue = activity.changes?.quantityRequested || activity.changes?.quantity || 0;
              }
            } else if (activity.entityType === "product" || activity.type === "product_update") {
              if (activity.changes?.quantityAdded) {
                affectValue = activity.changes.quantityAdded;
              } else if (activity.changes?.quantityChanged) {
                affectValue = Math.abs(activity.changes.quantityChanged);
              } else if (activity.changes?.price && typeof activity.changes.price.from === 'number' && typeof activity.changes.price.to === 'number') {
                affectValue = Math.abs(activity.changes.price.to - activity.changes.price.from);
              } else if (activity.changes?.quantity) {
                affectValue = activity.changes.quantity;
              }
            } else if (activity.entityType === "Transfer" || activity.type === "Transfer") {
              affectValue = activity.changes?.quantity || activity.changes?.quantityTransferred || 0;
            }
            if (activity.action.includes("Approved") || activity.action.includes("Auto-approved")) {
              if (activity.metadata?.approvedBy) {
                grantedInfo.push({ name: `APPROVED BY ${activity.metadata.approvedBy.toUpperCase()}`, color: "#008919" });
              } else if (activity.metadata?.autoApproved || activity.action.includes("Auto-approved")) {
                grantedInfo.push({ name: "AUTO-APPROVED", color: "#0066CC" });
              } else {
                grantedInfo.push({ name: "APPROVED", color: "#008919" });
              }
            } else if (activity.action.includes("Rejected") || activity.action.includes("Denied")) {
              if (activity.metadata?.rejectedBy) {
                grantedInfo.push({ name: `REJECTED BY ${activity.metadata.rejectedBy.toUpperCase()}`, color: "#DC2626" });
              } else {
                grantedInfo.push({ name: "REJECTED", color: "#DC2626" });
              }
            } else if (activity.action.includes("Pending") || activity.action.includes("Request")) {
              grantedInfo.push({ name: "PENDING APPROVAL", color: "#E27100" });
            } else if (activity.action.includes("Created Stock Transfer Request")) {
              grantedInfo.push({ name: "PENDING APPROVAL", color: "#E27100" });
            } else if (activity.type === "Stock" && (activity.action === "Incremented stock" || activity.action === "Decremented stock" || activity.action === "Adjusted")) {
              if (activity.metadata?.requiresApproval === false || activity.metadata?.autoApproved) {
                grantedInfo.push({ name: "AUTO-APPROVED", color: "#0066CC" });
              } else if (activity.metadata?.approvedBy) {
                grantedInfo.push({ name: `APPROVED BY ${activity.metadata.approvedBy.toUpperCase()}`, color: "#008919" });
              } else {
                grantedInfo.push({ name: "DIRECT ACTION", color: "#6B7280" });
              }
            } else if (activity.metadata?.status) {
              switch (activity.metadata.status.toLowerCase()) {
                case "completed":
                case "success":
                  grantedInfo.push({ name: "COMPLETED", color: "#008919" });
                  break;
                case "pending":
                  grantedInfo.push({ name: "PENDING", color: "#E27100" });
                  break;
                case "failed":
                case "error":
                  grantedInfo.push({ name: "FAILED", color: "#DC2626" });
                  break;
                default:
                  grantedInfo.push({ name: activity.metadata.status.toUpperCase(), color: "#6B7280" });
              }
            } else if (activity.entityType === "User" || activity.action.includes("Login") || activity.action.includes("Created")) {
              grantedInfo.push({ name: "SYSTEM ACTION", color: "#6B7280" });
            } else if (activity.entityType === "product" || activity.type === "product_update") {
              grantedInfo.push({ name: "DIRECT ACTION", color: "#6B7280" });
            } else {
              grantedInfo.push({ name: "DIRECT ACTION", color: "#6B7280" });
            } return {
              date: new Date(activity.timestamp).toLocaleString(),
              remark: activity.remark || generateRemark(activity, userMap),
              affect: affectValue.toString(),
              granted: grantedInfo,
              originalActivity: { ...activity, enhancedUserName },
            };
          });
          setActivities(processedActivities);
          setFilteredActivities(processedActivities);
        }
      } catch (error) {
        console.error("Error fetching activities for reports:", error);
        setActivities([]);
        setFilteredActivities([]);
      } finally {
        setLoading(false);
      }
    }; fetchActivities();
  }, []);

  useEffect(() => {
    if (!activities.length) return;

    let filtered = activities;
    switch (selectedFilter) {
      case "stock_adjustments":
        filtered = activities.filter(activity =>
          activity.originalActivity?.action?.includes("Adjusted") ||
          activity.originalActivity?.action?.includes("Incremented") ||
          activity.originalActivity?.action?.includes("Decremented") ||
          activity.originalActivity?.type === "Stock" ||
          activity.originalActivity?.action?.includes("stock")
        );
        break;
      case "qty_in_out":
        filtered = activities.filter(activity =>
          activity.originalActivity?.type === "stock_in" ||
          activity.originalActivity?.type === "stock_out" ||
          activity.originalActivity?.action === "stock_in" ||
          activity.originalActivity?.action === "stock_out"
        );
        break;
      default:
        filtered = activities;
    }

    if (dateRange?.from || dateRange?.to) {
      filtered = filtered.filter(activity => {
        const activityDate = new Date(activity.originalActivity.timestamp);
        if (dateRange.from && !dateRange.to) {
          const fromDate = new Date(dateRange.from);
          fromDate.setHours(0, 0, 0, 0);
          return activityDate >= fromDate;
        }
        if (!dateRange.from && dateRange.to) {
          const toDate = new Date(dateRange.to);
          toDate.setHours(23, 59, 59, 999);
          return activityDate <= toDate;
        }
        if (dateRange.from && dateRange.to) {
          const fromDate = new Date(dateRange.from);
          const toDate = new Date(dateRange.to);
          fromDate.setHours(0, 0, 0, 0);
          toDate.setHours(23, 59, 59, 999);
          return activityDate >= fromDate && activityDate <= toDate;
        }
        return true;
      });
    }
    setFilteredActivities(filtered);
  }, [selectedFilter, dateRange, activities]);
  const filterOptions = [
    { value: "stock_adjustments", label: "Stock Adjustments" },
    { value: "qty_in_out", label: "Qty In /Out" },
    { value: "project_qty_in_out", label: "Project Wise Qty In /Out" },
    { value: "non_moving_items", label: "Non-moving items" },
    { value: "total_stocks", label: "Total Stocks of all Items" }
  ];

  const generateRemark = (activity, userMap = {}) => {
    const user = userMap[activity.userId] ||
      userMap[activity.userEmail] ||
      activity.userName ||
      'Unknown User';
    const entity = activity.entityName || 'Unknown Entity';
    const action = activity.action;
    const entityType = activity.entityType;

    if (activity.type === "Stock" || entityType === "Stock") {
      if (action.includes("Transfer")) {
        const fromProject = activity.changes?.fromProject || activity.metadata?.fromProject || 'Unknown Project';
        const toProject = activity.changes?.toProject || activity.metadata?.toProject || activity.projectName || 'Unknown Project';
        return `${user} transferred ${entity} from ${fromProject} to ${toProject}`;
      } else if (action.includes("Adjusted") || action.includes("Incremented") || action.includes("Decremented")) {
        const project = activity.projectName || 'Unknown Project';
        return `${user} ${action.toLowerCase()} stock for ${entity} in ${project}`;
      } else if (action.includes("Request")) {
        return `${user} created ${action.toLowerCase()} for ${entity}`;
      }
    } else if (entityType === "product" || activity.type === "product_update") {
      if (action.includes("Added") || action.includes("added")) {
        return `${user} added new product: ${entity}`;
      } else if (action.includes("Updated") || action.includes("updated")) {
        if (activity.changes?.price) {
          return `${user} updated price for ${entity} from $${activity.changes.price.from} to $${activity.changes.price.to}`;
        } else if (activity.metadata?.changedFields?.length > 0) {
          return `${user} updated ${activity.metadata.changedFields.join(', ')} for product: ${entity}`;
        } else {
          return `${user} updated product: ${entity}`;
        }
      }
    } else if (entityType === "Transfer") {
      return `${user} ${action.toLowerCase()} transfer for ${entity}`;
    }

    return `${user} ${action} ${entityType}: ${entity}`;
  };

  const handleDateRangeChange = (newDateRange) => {
    setDateRange(newDateRange);
  };

  const clearDateFilter = () => {
    setDateRange(undefined);
  };

  useEffect(() => {
    if (selectedFilter === "project_qty_in_out") {
      const fetchProjects = async () => {
        try {
          const response = await fetch("/api/Projects");
          if (!response.ok) return;
          const data = await response.json();
          if (Array.isArray(data.projects)) {
            const projectList = data.projects.map(p => ({ value: p._id, label: p.projectName }));
            setProjectOptions([{ value: 'ALL', label: 'ALL PROJECTS' }, ...projectList]);
          }
        } catch { }
      };
      fetchProjects();
    }
  }, [selectedFilter]);

  const handleGenerateReport = async () => {
    if (!selectedFilter) {
      toast.error("Please select a filter before generating a report.");
      return;
    }
    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filter: selectedFilter,
          dateRange,
          projectId: selectedFilter === "project_qty_in_out" ? selectedProject : null,
          createdBy: session?.user?.name || null,
        }),
      });
      if (!response.ok) throw new Error("Failed to generate report");
      setReportsReloadKey(prev => prev + 1);
    } catch (err) {
    }
  };

  return (
    <div className="flex flex-col gap-10 pb-10">
      <div className="flex items-center justify-between w-full">
        <div className="layout-header">
          <h1>Reports</h1>
          <Breadcrumb />
        </div>        <div className="flex items-center gap-2">
          <Calendar23
            onDateRangeChange={handleDateRangeChange}
            dateRange={dateRange}
          />
          <Combobox
            options={filterOptions}
            value={selectedFilter}
            onValueChange={setSelectedFilter}
            placeholder="Filter By Action"
            searchPlaceholder=""
            className=""
            icon={SlidersHorizontal}
          />
          {selectedFilter === "project_qty_in_out" && (
            <Combobox
              options={projectOptions}
              value={selectedProject}
              onValueChange={setSelectedProject}
              placeholder="Select Project"
              searchPlaceholder="Search Project"
              className="min-w-[200px]"
            />
          )}
          <Button variant="secondary" size="secondary" onClick={handleGenerateReport}>
            Generate Report
          </Button>
          {(dateRange?.from || dateRange?.to) && (
            <Button
              variant="secondaryOutline"
              size="secondary"
              onClick={clearDateFilter}
            >
              Clear Date Filter
            </Button>
          )}
        </div>
      </div>
      <div className="flex flex-col items-center justify-start w-full">
        <div className="flex flex-col w-full gap-10">
          {loading ? (
            <div className="flex flex-col gap-6">
              <div className="flex flex-col w-full gap-4">
                {[...Array(4)].map((_, idx) => (
                  <div key={idx} className="flex items-center justify-between w-full gap-4">
                    <Skeleton className="w-1/5 h-6" />
                    <Skeleton className="w-1/5 h-6" />
                    <Skeleton className="w-1/5 h-6" />
                    <Skeleton className="w-1/5 h-6" />
                    <Skeleton className="w-1/5 h-6" />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <ReportsTable
              key={reportsReloadKey}
              filter={selectedFilter}
              dateRange={dateRange}
              projectId={selectedFilter === "project_qty_in_out" ? selectedProject : null}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportsLayout;
