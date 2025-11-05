"use client";
import React, { useState, useEffect } from "react";
import Breadcrumb from "@/components/primary/assets-management/PrimaryBreadcrumb";
import SearchBarcode from "@/components/shared/search-barcode-input";
import { Button } from "@/components/ui/button";
import { FilePlus2 } from "lucide-react";
import Link from "next/link";
import AssetsManagementTable from "../primary/assets-management/AssetsManagementTable";
import {MultiCombobox} from "@/components/ui/multi-combobox";
import { useSession } from "next-auth/react";
import { Combobox } from "@/components/ui/combobox";
 

const AssetsManagementLayout = () => {
    const [searchValue, setSearchValue] = useState("");
    const [categoryOptions, setCategoryOptions] = useState([]);
    const [selectedCategories, setSelectedCategories] = useState("");
    const [projectOptions, setProjectOptions] = useState([]);
    const [statusOptions] = useState([
      { value: "Operational", label: "Operational" },
      { value: "Under Maintain", label: "Under Maintain" },
      { value: "Broken", label: "Broken" },
      { value: "Stolen", label: "Stolen" },
    ]);
    const [assigneeOptions, setAssigneeOptions] = useState([]);
    const [selectedProject, setSelectedProject] = useState("ALL");
    const [selectedStatus, setSelectedStatus] = useState("ALL");
    const [selectedAssignee, setSelectedAssignee] = useState("ALL");
  const { data: session } = useSession();
    // Fetch categories from assets API
    useEffect(() => {
      const fetchCategories = async () => {
        try {
          const response = await fetch("/api/assets");
          if (!response.ok) return;
          const data = await response.json();
          // Get unique categories
          const categories = Array.from(
            new Set(
              (data || []).map((asset) => asset.category || asset.Category || asset.productCategory || "N/A")
            )
          ).filter((cat) => cat && cat !== "N/A");
          setCategoryOptions(
            categories.map((cat) => ({ label: cat, value: cat }))
          );
        } catch (e) {
          setCategoryOptions([]);
        }
      };
      fetchCategories();
    }, []);

    useEffect(() => {
      const fetchFilters = async () => {
        try {
          const [assetsRes, projectsRes, usersRes] = await Promise.all([
            fetch("/api/assets"),
            fetch("/api/Projects"),
            fetch("/api/Users"),
          ]);
          const assetsJson = assetsRes.ok ? await assetsRes.json() : [];
          const projectsJson = projectsRes.ok ? await projectsRes.json() : { projects: [] };
          const usersJson = usersRes.ok ? await usersRes.json() : { users: [] };
          const projectIdSet = new Set((assetsJson || []).map(a => (a.projectId ? a.projectId.toString() : null)).filter(Boolean));
          const availableProjects = (projectsJson.projects || []).filter(p => projectIdSet.has(p._id?.toString?.() || p._id));
          setProjectOptions([{ value: "ALL", label: "All Projects" }, ...availableProjects.map(p => ({ value: p._id, label: p.projectName }))]);
          const assignees = Array.from(new Set((assetsJson || []).map(a => a.assignedUserName).filter(Boolean)));
          setAssigneeOptions([{ value: "ALL", label: "All Assignees" }, ...assignees.map(a => ({ value: a, label: a }))]);
        } catch (e) {
          setProjectOptions([]);
          setAssigneeOptions([]);
        }
      };
      fetchFilters();
    }, []);

    const handleSearchChange = (e) => {
    setSearchValue(e.target.value);
  };
    const handleSearchKeyDown = (e) => {
    if (e.key === "Enter") {
    }
  };

  const handleBarcodeScanned = (scannedText) => {
    setSearchValue(scannedText);
  };

  return (
    <div className="flex flex-col gap-10">
      <div className="flex items-center justify-between w-full">
        <div className="layout-header">
          <h1>Assets Management</h1>
          <Breadcrumb />
        </div>
  <div className="flex items-center gap-2">
          <MultiCombobox
            placeholder="Filter by Category"
            options={categoryOptions}
            value={selectedCategories}
            onValueChange={setSelectedCategories}
            className="min-w-[250px]"
          />
        
          <Combobox
            options={projectOptions}
            value={selectedProject}
            onValueChange={setSelectedProject}
            placeholder="Filter by Project"
            searchPlaceholder="Search Project"
            className="min-w-[250px]"
          />
          <Combobox
            options={[{ value: "ALL", label: "All Statuses" }, ...statusOptions]}
            value={selectedStatus}
            onValueChange={setSelectedStatus}
            placeholder="Filter by Status"
            searchPlaceholder="Search Status"
            className="min-w-[250px]"
          />
          <Combobox
            options={assigneeOptions}
            value={selectedAssignee}
            onValueChange={setSelectedAssignee}
            placeholder="Filter by Assignee"
            searchPlaceholder="Search Assignee"
            className="min-w-[250px]"
          />
          <SearchBarcode
            value={searchValue}
            onChange={handleSearchChange}
            onKeyDown={handleSearchKeyDown}
            onScan={handleBarcodeScanned}
            placeholder="SEARCH"
            className="min-w-[250px]"
          />
          {session?.user?.role === 'admin' && (
            <Button variant="secondary" size="secondary" asChild>
              <Link href="/assets-management/add-new-asset">
                <FilePlus2 />
                Add New Assets
              </Link>
            </Button>
          )}
        </div>
      </div>
      <div className="flex flex-col items-center justify-start w-full">
        <div className="flex flex-col w-full gap-10">
        <AssetsManagementTable searchValue={searchValue} selectedCategories={selectedCategories} filterProjectId={selectedProject} filterStatus={selectedStatus} filterAssignee={selectedAssignee} />
        </div>
      </div>
    </div>
  );
};

export default AssetsManagementLayout