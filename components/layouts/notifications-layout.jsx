"use client";
import React from "react";
import Breadcrumb from "@/components/primary/notifications/PrimaryBreadcrumb";
import NotificationTable from "../primary/notifications/NotificationTable";
import { SessionProvider } from "next-auth/react";
import { Skeleton } from "../ui/skeleton";
import { useState, useEffect } from "react";

const NotificationsLayout = ({ session }) => {
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitialLoading(false);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  return (
    <SessionProvider session={session}>
      <div className="flex flex-col gap-10">
        {isInitialLoading ? (
          <div className="flex items-center justify-between w-full">
            <div className="flex flex-col gap-2 layout-header">
              <Skeleton className="w-48 h-8 mb-2" />
              <Skeleton className="w-64 h-5" />
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between w-full">
            <div className="layout-header">
              <h1>Notifications</h1>
              <Breadcrumb />
            </div>
          </div>
        )}
        <div className="flex flex-col items-center justify-start w-full">
          <div className="flex flex-col w-full">
            <NotificationTable isParentLoading={isInitialLoading} />
          </div>
        </div>
      </div>
    </SessionProvider>
  );
};

export default NotificationsLayout;
