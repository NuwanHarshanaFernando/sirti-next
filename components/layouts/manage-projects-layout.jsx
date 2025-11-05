"use client";

import React from "react";
import { useRouter } from "next/navigation";
import ManageProjectsBreadcrumb from "@/components/primary/manage-projects/PrimaryBreadcrumb";
import ManageProjectsTable from "../primary/manage-projects/ManageProjectsTable";
import { Button } from "../ui/button";
import { FolderPlus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const ManageProjectsLayout = () => {
  const router = useRouter();
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const handleCreateNewProject = () => {
    router.push("/manage-projects/create-new-project");
  };

  return (
    <div className="flex flex-col gap-10">
      <div className="flex items-center justify-between w-full">
        <div className="layout-header">
          {loading ? (
            <>
              <Skeleton className="w-48 h-8 mb-2" />
              <Skeleton className="w-64 h-5" />
            </>
          ) : (
            <>
              <h1>Manage Projects</h1>
              <ManageProjectsBreadcrumb />
            </>
          )}
        </div>
        {loading ? (
          <Skeleton className="h-10 rounded-md w-44" />
        ) : (
          <Button 
            variant="secondary" 
            size="secondary" 
            onClick={handleCreateNewProject}
          >
            <FolderPlus />Create New Project
          </Button>
        )}
      </div>
      <div className="flex flex-col items-center justify-start w-full">
        <div className="flex flex-col w-full gap-10">
          <ManageProjectsTable loading={loading} />
        </div>
      </div>
    </div>
  );
};

export default ManageProjectsLayout;