"use client";
import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Input } from "../ui/input";
import Calendar23 from "../calendar-23";
import StockManageTable from "../primary/stock-manage/StockManageTable";
import Breadcrumb from "@/components/primary/stock-manage/PrimaryBreadcrumb";
import { Combobox } from "../ui/combobox";

const StockManageLayout = ({ session, type = "in", isOrderMode = false }) => {
  const pathname = usePathname();
  const [dateRange, setDateRange] = useState(undefined);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [selectedProject, setSelectedProject] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [projects, setProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const isStockManagePage = pathname?.includes("/stock-manage");
  const isOrderCreatePage = pathname?.includes("/order-create");
  const shouldShowProjectDropdown = type === "out" && (isStockManagePage || (isOrderMode && isOrderCreatePage));
  const handleDateRangeChange = (newDate) => {
    setDateRange(newDate);
  };

  useEffect(() => {
    const fetchProjectsForDropdown = async () => {
      if (shouldShowProjectDropdown) {
        try {
          setProjectsLoading(true);
          const response = await fetch("/api/Projects");
          if (response.ok) {
            const data = await response.json();
            const allNonLobbyProjects = (data.projects || []).filter(p => !p.isLobby);
            const projectById = new Map(
              (data.projects || []).map(p => [p._id?.toString?.() || String(p._id), p])
            );
            const rawUserProjects = session?.user?.projects || session?.user?.availableProjects || [];
            const userProjectIds = [];
            for (const up of rawUserProjects) {
              if (!up) continue;
              if (typeof up === 'string') {
                userProjectIds.push(up);
                continue;
              }
              if (typeof up === 'object') {
                const idVal = up._id || up.id;
                if (idVal) {
                  userProjectIds.push(idVal.toString());
                }
              }
            }

            const hasSafetyProject = userProjectIds.some(id => {
              const p = projectById.get(id);
              const name = typeof p?.projectName === 'string' ? p.projectName : (typeof p?.name === 'string' ? p.name : '');
              return name.toLowerCase().includes('safety');
            });
            let filteredProjects;
            if (session?.user?.role === 'admin' || session?.user?.role === 'keeper') {
              filteredProjects = allNonLobbyProjects;
            } else if (hasSafetyProject) {
              filteredProjects = allNonLobbyProjects;
            } else {
              if (userProjectIds.length === 0) {
                setProjects([]);
                return;
              }
              const userProjectIdSet = new Set(userProjectIds);
              filteredProjects = allNonLobbyProjects.filter(p => userProjectIdSet.has(p._id?.toString?.() || String(p._id)));
            }

            const projectOptions = filteredProjects.map((project) => ({
              value: (project._id && project._id.toString) ? project._id.toString() : String(project._id),
              label: project.projectName,
              color: project.color,
            }));

            setProjects(projectOptions);
          }
        } catch (error) {
          console.error("Error fetching projects:", error);
        } finally {
          setProjectsLoading(false);
        }
      }
    };

    fetchProjectsForDropdown();
  }, [shouldShowProjectDropdown, session]);

  const getTitle = () => {
    if (isOrderMode) {
      return "Create Order";
    }
    return type === "in" ? "Create GRN Order" : "Create Delivery Notice";
  };

  return (
    <div className="flex flex-col gap-10">
      <div className="flex items-center justify-between w-full">
        <div className="layout-header">
          <h1>{getTitle()}</h1>
          <Breadcrumb type={type} isOrderMode={isOrderMode} />
        </div>
        <div className="flex gap-2">
          {shouldShowProjectDropdown ? (
            <Combobox
              options={projects}
              value={selectedProject}
              onValueChange={setSelectedProject}
              placeholder="Select Project"
              searchPlaceholder="Search projects..."
              emptyText="No projects found"
              loading={projectsLoading}
              className="h-10 min-w-[200px] border-2 border-black/10"
            />
          ) : (
            <Input
              className="h-10 pr-10 border-2 border-black/10 placeholder:uppercase"
              placeholder="P/O Number"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
            />
          )}
          <Input
            className="h-10 pr-10 border-2 border-black/10 placeholder:uppercase"
            placeholder={type === "in" ? "Supplier Name" : "Recipient Name"}
            value={supplierName}
            onChange={(e) => setSupplierName(e.target.value)}
          />
          <Calendar23
            mode="single"
            placeholder="Select Date"
            onValueChange={handleDateRangeChange}
            value={dateRange}
          />
        </div>
      </div>
      <div className="flex flex-col items-center justify-start w-full">
        <div className="flex flex-col w-full gap-10">
          <StockManageTable
            type={type}
            session={session}
            invoiceNumber={
              shouldShowProjectDropdown ? selectedProject : invoiceNumber
            }
            supplierName={supplierName}
            date={dateRange}
            isOrderMode={isOrderMode}
            selectedProjectId={
              shouldShowProjectDropdown ? selectedProject : null
            }
            projects={projects}
          />
        </div>
      </div>
    </div>
  );
};

export default StockManageLayout;
