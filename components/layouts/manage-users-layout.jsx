"use client";
import React, { useState, useEffect } from "react";
import Breadcrumb from "@/components/primary/manage-users/PrimaryBreadcrumb";
import ManageUsersTable from "../primary/manage-users/ManageUsersTable";
import { Button } from "../ui/button";
import { UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { Skeleton } from "../ui/skeleton";

const ManageUsersLayout = () => {
  const router = useRouter();
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitialLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  const handleCreateNewUser = () => {
    router.push("/manage-users/create-new-user");
  };

  return (
    <div className="flex flex-col gap-10">
      {isInitialLoading ? (
        <div className="flex items-center justify-between w-full">
          <div className="layout-header flex flex-col gap-2">
            <Skeleton className="h-8 w-32 mb-2" />
            <Skeleton className="h-5 w-48" />
          </div>
          <div className="flex items-center gap-2 w-44 max-w-full ml-auto">
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between w-full">
          <div className="layout-header">
            <h1>Manage Users</h1>
            <Breadcrumb />
          </div>
          <Button 
            variant="secondary" 
            size="secondary"
            onClick={handleCreateNewUser}
          >
            <UserPlus />Create New User
          </Button>
        </div>
      )}
      <div className="flex flex-col items-center justify-start w-full">
        <div className="flex flex-col w-full gap-10">
          <ManageUsersTable isParentLoading={isInitialLoading} />
        </div>
      </div>
    </div>
  );
};

export default ManageUsersLayout;
