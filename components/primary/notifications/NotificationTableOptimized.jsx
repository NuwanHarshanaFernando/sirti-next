"use client";

import NotificationRow from "@/components/shared/notification-row";
import React, { useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { TableSkeleton } from "@/components/ui/skeleton";
import useOptimizedFetch from "@/hooks/use-optimized-fetch-clean";

const NotificationTableOptimized = () => {
  const { data: session } = useSession();
  const [filter, setFilter] = useState("all"); 

  
  const { data: stockAdjustmentData } = useOptimizedFetch(
    session?.user ? `/api/stock-adjustment-requests?role=${session.user.role}` : null,
    {
      staleTime: 30000, 
      cacheKey: `stock-adjustment-${session?.user?.role}`,
    }
  );

  const { data: transferData } = useOptimizedFetch(
    session?.user ? "/api/transfers" : null,
    {
      staleTime: 30000,
      cacheKey: "transfers-notifications",
    }
  );

  const { data: activitiesData } = useOptimizedFetch(
    session?.user ? "/api/activities" : null,
    {
      staleTime: 30000,
      cacheKey: "activities-notifications",
    }
  );

  const { data: productsData } = useOptimizedFetch(
    session?.user ? "/api/Products" : null,
    {
      staleTime: 60000, 
      cacheKey: "products-lookup",
    }
  );

  const { data: projectsData } = useOptimizedFetch(
    session?.user ? "/api/Projects" : null,
    {
      staleTime: 60000,
      cacheKey: "projects-lookup",
    }
  );

  const { data: usersData } = useOptimizedFetch(
    session?.user ? "/api/Users" : null,
    {
      staleTime: 60000,
      cacheKey: "users-lookup",
    }
  );

  const isLoading = !stockAdjustmentData || !transferData || !activitiesData || 
                   !productsData || !projectsData || !usersData;

  
  const notifications = useMemo(() => {
    if (!session?.user || isLoading) return [];

    try {
      
      const productMap = {};
      const projectMap = {};  
      const userMap = {};
      
      (productsData?.products || []).forEach(product => {
        productMap[product._id] = product.productName || 'Unknown Product';
      });
      
      (projectsData?.projects || []).forEach(project => {
        projectMap[project._id] = {
          name: project.projectName || 'Unknown Project',
          color: project.color || '#6B7280'
        };
      });

      (usersData?.users || []).forEach(user => {
        if (user._id) {
          userMap[user._id] = user.name || user.email || 'Unknown User';
        }
        if (user.email) {
          userMap[user.email] = user.name || user.email || 'Unknown User';
        }
      });

      const formatTimestamp = (timestamp) => {
        if (!timestamp) return 'Unknown time';
        try {
          return new Date(timestamp).toLocaleString();
        } catch (error) {
          return 'Invalid date';
        }
      };

      const stockAdjustmentNotifications = [];
      
      
      (stockAdjustmentData?.requests || []).forEach(request => {
        const projectName = request.projectName || projectMap[request.projectId]?.name || 'Unknown Project';
        const productName = productMap[request.productId] || 'Unknown Product';
        const actorName = userMap[request.requestedBy] || request.requestedBy || 'Unknown User';
        
        stockAdjustmentNotifications.push({
          id: `stock-request-${request._id}`,
          type: 'stock_adjustment_request',
          iconColor: '#F59E0B',
          projectName: '',
          actionText: '',
          itemName: '',
          description: `${projectName} created stock request for ${productName}`,
          timestamp: formatTimestamp(request.requestedAt),
          status: 'request',
          actor: actorName,
          quantity: request.quantity,
          adjustmentType: request.adjustmentType,
          rawData: { ...request, activityType: 'request' }
        });

        if (request.status === 'approved' || request.status === 'rejected') {
          const statusColor = request.status === 'approved' ? '#10B981' : '#EF4444';
          const statusText = request.status === 'approved' ? 'approved' : 'rejected';
          
          stockAdjustmentNotifications.push({
            id: `stock-${request.status}-${request._id}`,
            type: 'stock_adjustment_response',
            iconColor: statusColor,
            projectName: '',
            actionText: '',
            itemName: '',
            description: `Stock request for ${productName} was ${statusText}`,
            timestamp: formatTimestamp(request.processedAt || request.updatedAt),
            status: request.status,
            actor: userMap[request.processedBy] || 'System',
            quantity: request.quantity,
            adjustmentType: request.adjustmentType,
            rawData: { ...request, activityType: 'response' }
          });
        }
      });

      
      const transferNotifications = [];
      (transferData?.transfers || []).forEach(transfer => {
        const productName = productMap[transfer.productId] || 'Unknown Product';
        const actorName = userMap[transfer.requestedBy] || transfer.requestedBy || 'Unknown User';
        
        transferNotifications.push({
          id: `transfer-request-${transfer._id}`,
          type: 'transfer_request',
          iconColor: '#3B82F6',
          projectName: '',
          actionText: '',
          itemName: '',
          description: `Transfer request created for ${productName}`,
          timestamp: formatTimestamp(transfer.requestedAt),
          status: 'request',
          actor: actorName,
          quantity: transfer.quantity,
          rawData: { ...transfer, activityType: 'request' }
        });

        if (transfer.status === 'approved' || transfer.status === 'rejected' || transfer.status === 'completed') {
          const statusColors = {
            approved: '#10B981',
            rejected: '#EF4444',
            completed: '#059669'
          };
          
          transferNotifications.push({
            id: `transfer-${transfer.status}-${transfer._id}`,
            type: 'transfer_response',
            iconColor: statusColors[transfer.status] || '#6B7280',
            projectName: '',
            actionText: '',
            itemName: '',
            description: `Transfer for ${productName} was ${transfer.status}`,
            timestamp: formatTimestamp(transfer.processedAt || transfer.completedAt || transfer.updatedAt),
            status: transfer.status,
            actor: userMap[transfer.processedBy || transfer.completedBy] || 'System',
            quantity: transfer.quantity,
            rawData: { ...transfer, activityType: 'response' }
          });
        }
      });

      
      const activityNotifications = (activitiesData?.activities || [])
        .slice(0, 50) 
        .map(activity => ({
          id: `activity-${activity._id}`,
          type: 'activity',
          iconColor: '#6B7280',
          projectName: '',
          actionText: '',
          itemName: '',
          description: activity.description || `${activity.action} performed`,
          timestamp: formatTimestamp(activity.timestamp),
          status: 'info',
          actor: userMap[activity.performedBy] || activity.performedBy || 'System',
          rawData: activity
        }));

      
      const allNotifications = [
        ...stockAdjustmentNotifications,
        ...transferNotifications,
        ...activityNotifications
      ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      return allNotifications;
    } catch (error) {
      toast.error("Error processing notifications");
      return [];
    }
  }, [
    stockAdjustmentData,
    transferData,
    activitiesData,
    productsData,
    projectsData,
    usersData,
    session,
    isLoading
  ]);

  
  const filteredNotifications = useMemo(() => {
    if (filter === "all") return notifications;
    
    return notifications; 
  }, [notifications, filter]);

  if (!session?.user) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">Please sign in to view notifications.</p>
      </div>
    );
  }

  if (isLoading) {
    return <TableSkeleton />;
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Filter buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter("all")}
          className={`px-3 py-1 rounded text-sm ${
            filter === "all" 
              ? "bg-primary text-primary-foreground" 
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          All ({notifications.length})
        </button>
        <button
          onClick={() => setFilter("unread")}
          className={`px-3 py-1 rounded text-sm ${
            filter === "unread" 
              ? "bg-primary text-primary-foreground" 
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          Unread
        </button>
        <button
          onClick={() => setFilter("read")}
          className={`px-3 py-1 rounded text-sm ${
            filter === "read" 
              ? "bg-primary text-primary-foreground" 
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          Read
        </button>
      </div>

      {/* Notifications list */}
      <div className="flex flex-col gap-2">
        {filteredNotifications.length === 0 ? (
          <div className="flex items-center justify-center p-8">
            <p className="text-muted-foreground">No notifications found.</p>
          </div>
        ) : (
          filteredNotifications.map((notification) => (
            <NotificationRow
              key={notification.id}
              iconColor={notification.iconColor}
              projectName={notification.projectName}
              actionText={notification.actionText}
              itemName={notification.itemName}
              description={notification.description}
              timestamp={notification.timestamp}
              actor={notification.actor}
              quantity={notification.quantity}
              adjustmentType={notification.adjustmentType}
              status={notification.status}
              rawData={notification.rawData}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default NotificationTableOptimized;
