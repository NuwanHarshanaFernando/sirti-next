"use client";

import NotificationRow from "@/components/shared/notification-row";
import ApprovalSheet from "@/components/popups/ApprovalSheet/ApprovalSheet";
import React, { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import {
  markNotificationAsViewed,
  isNotificationViewed,
  getViewedNotifications,
  generateUserSpecificNotificationId,
} from "@/lib/notification-utils";
import { useNotificationCount } from "@/hooks/use-notification-count-simplified";

const NotificationTable = ({ isParentLoading }) => {
  const { data: session } = useSession();
  const router = useRouter();
  const { refresh: refreshNotificationCount } = useNotificationCount();
  const [filter, setFilter] = useState("all");
  const [viewedNotifications, setViewedNotifications] = useState([]);

  
  const [isApprovalSheetOpen, setIsApprovalSheetOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [approvalSheetRequests, setApprovalSheetRequests] = useState([]);

  
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  
  const resolveProductName = async (productId) => {
    if (!productId) {
      return "Unknown Product";
    }

    try {
      const response = await fetch(`/api/Products/${productId}`);

      if (response.ok) {
        const data = await response.json();
        const productName =
          data.product?.productName || data.productName || "Unknown Product";
        return productName;
      }
    } catch (error) {
    }
    return "Unknown Product";
  };

  
  const resolveProjectName = async (projectId) => {
    if (!projectId) {
      return "Unknown Project";
    }

    try {
      const response = await fetch(`/api/Projects/${projectId}`);

      if (response.ok) {
        const data = await response.json();
        const projectName =
          data.project?.projectName || data.projectName || "Unknown Project";
        return projectName;
      }
    } catch (error) {
    }
    return "Unknown Project";
  };

  
  const refetchNotifications = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/notifications");
      if (response.ok) {
        const data = await response.json();
        const notifications = data.notifications || [];

        
        const processedNotifications = await Promise.all(
          notifications.map(async (notification) => {
            if (
              notification.description &&
              (notification.description.includes("Unknown Product") ||
                notification.description.includes("Unknown Project"))
            ) {
              let updatedDescription = notification.description;
              const rawData = notification.rawData;

              
              if (updatedDescription.includes("Unknown Product")) {
                
                let productId = null;
                let productName = null;

                
                if (
                  rawData?.productId &&
                  typeof rawData.productId === "object"
                ) {
                  productId = rawData.productId._id;
                  productName = rawData.productId.productName;
                } else {
                  
                  productId =
                    rawData?.productId ||
                    rawData?.product_id ||
                    rawData?.product?.id ||
                    rawData?.product?._id;
                }

                
                if (productName && productName !== "Unknown Product") {
                  updatedDescription = updatedDescription.replace(
                    /Unknown Product/g,
                    productName
                  );
                } else if (productId) {
                  try {
                    const resolvedProductName = await resolveProductName(
                      productId
                    );
                    if (
                      resolvedProductName &&
                      resolvedProductName !== "Unknown Product"
                    ) {
                      updatedDescription = updatedDescription.replace(
                        /Unknown Product/g,
                        resolvedProductName
                      );
                    }
                  } catch (error) {
                  }
                }
              }

              
              if (updatedDescription.includes("Unknown Project")) {
                
                let projectId = null;
                let projectName = null;



                
                if (
                  rawData?.projectName &&
                  rawData.projectName !== "Unknown Project"
                ) {
                  projectName = rawData.projectName;
                }
                
                else if (
                  rawData?.projectId &&
                  typeof rawData.projectId === "object" &&
                  rawData.projectId !== null
                ) {
                  projectId = rawData.projectId._id || rawData.projectId;
                  projectName = rawData.projectId.projectName;
                } else if (rawData?.projectId && rawData.projectId !== null) {
                  
                  projectId = rawData.projectId.toString();
                } else {
                  
                  projectId =
                    rawData?.project_id ||
                    rawData?.project?.id ||
                    rawData?.project?._id;
                }

                
                if (projectName && projectName !== "Unknown Project") {
                  updatedDescription = updatedDescription.replace(
                    /Unknown Project/g,
                    projectName
                  );
                } else if (projectId) {
                  try {
                    const resolvedProjectName = await resolveProjectName(
                      projectId
                    );
                    if (
                      resolvedProjectName &&
                      resolvedProjectName !== "Unknown Project"
                    ) {
                      updatedDescription = updatedDescription.replace(
                        /Unknown Project/g,
                        resolvedProjectName
                      );
                    }
                  } catch (error) {
                    
                  }
                } else {
                  
                  if (
                    notification.type === "stock_in" ||
                    notification.type === "stock_out"
                  ) {
                    const fallbackProjectName = "General Warehouse";
                    updatedDescription = updatedDescription.replace(
                      /Unknown Project/g,
                      fallbackProjectName
                    );
                  }
                }
              }

              return {
                ...notification,
                description: updatedDescription,
              };
            }

            return notification;
          })
        );

        setNotifications(processedNotifications);
      } else {
        toast.error("Failed to fetch notifications");
      }
    } catch (error) {
      toast.error("Failed to fetch notifications");
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    if (session?.user) {
      refetchNotifications();
    }
  }, [session?.user]);

  useEffect(() => {
  
    if (session?.user?.email) {
      const initialViewed = getViewedNotifications(session.user.email);
      setViewedNotifications(initialViewed);
    }
  }, [session]);


  useEffect(() => {
    if (session?.user?.email) {
      refreshNotificationCount();
    }
  }, [
    filter,
    viewedNotifications,
    refreshNotificationCount,
    session?.user?.email,
  ]);


  const filteredNotifications = useMemo(() => {
    if (!session?.user || notifications.length === 0) return [];


    let filtered = notifications;
    const userEmail = session.user.email;
    const userRole = session.user.role;


    if (filter === "unread") {
      filtered = filtered.filter((notification) => {
        const userSpecificId = generateUserSpecificNotificationId(
          notification.id,
          userEmail
        );
        return !isNotificationViewed(userSpecificId, userEmail);
      });
    } else if (filter === "read") {
      filtered = filtered.filter((notification) => {
        const userSpecificId = generateUserSpecificNotificationId(
          notification.id,
          userEmail
        );
        return isNotificationViewed(userSpecificId, userEmail);
      });
    }



    return filtered;
  }, [notifications, session, filter, viewedNotifications]);

  const handleView = async (notificationId) => {
    if (session?.user?.email) {
      const userSpecificId = generateUserSpecificNotificationId(
        notificationId,
        session.user.email
      );

      markNotificationAsViewed(userSpecificId, session.user.email);

      const newViewedNotifications = [...viewedNotifications];
      if (!newViewedNotifications.includes(userSpecificId)) {
        newViewedNotifications.push(userSpecificId);
      }
      setViewedNotifications(newViewedNotifications);



      refreshNotificationCount();
      setTimeout(() => {
        refreshNotificationCount();
      }, 100);
    }


    const notification = notifications.find((n) => n.id === notificationId);
    if (!notification) {
      toast.error("Notification not found");
      return;
    }
    setSelectedNotification(notification);
    
    const rawData = notification.rawData;
    let requests = [];

    if (notification.type.includes("transfer")) {
      
      requests = [
        {
          _id: rawData._id,
          productId: rawData.productId,
          fromProjectId: rawData.fromProjectId,
          toProjectId: rawData.toProjectId,
          projectId: rawData.fromProjectId, 
          projectName: rawData.sourceProjectName,
          quantity: rawData.quantity,
          reason: rawData.reason,
          status: rawData.status,
          
          transferType: rawData.transferType,
          toRack: rawData.toRack,
          fromRack: rawData.fromRack,
          requestedBy: rawData.requestedBy,
          requestedAt: rawData.requestedAt || rawData.createdAt,
          createdAt: rawData.createdAt,
          approvedBy: rawData.approvedBy,
          approvedAt: rawData.approvedAt,
          rejectedBy: rawData.rejectedBy,
          rejectedAt: rawData.rejectedAt,
          completedBy: rawData.completedBy,
          completedAt: rawData.completedAt,
        },
      ];
    } else if (notification.type.includes("adjustment")) {
      
      requests = [
        {
          requestId: rawData.requestId || rawData._id,
          _id: rawData._id,
          productId: rawData.productId,
          projectId: rawData.projectId,
          projectName: rawData.projectName,
          rackNumber: rawData.rackNumber,
          stockOnHand: rawData.stockOnHand,
          stockOnHold: rawData.stockOnHold,
          reason: rawData.reason,
          status: rawData.status,
          requestedBy: rawData.requestedBy,
          requestedAt: rawData.requestedAt || rawData.createdAt,
          createdAt: rawData.createdAt,
          approvedBy: rawData.approvedBy,
          approvedAt: rawData.approvedAt,
          rejectedBy: rawData.rejectedBy,
          rejectedAt: rawData.rejectedAt,
          completedBy: rawData.completedBy,
          completedAt: rawData.completedAt,
        },
      ];
    } else if (
      notification.type === "stock_in" ||
      notification.type === "stock_out"
    ) {
  

      requests = [
        {
          _id: rawData._id,
          productId: rawData.productId,
          projectId: rawData.projectId,
          projectName: rawData.projectName,
          quantity: rawData.quantity,
          type: rawData.type,
          transactionType: rawData.transactionType,
          activityType: rawData.activityType,
          reason:
            rawData.reason ||
            `Stock ${rawData.transactionType || rawData.type} transaction`,
          status: rawData.status || "completed",
          requestedBy: rawData.requestedBy || "System",
          requestedAt: rawData.createdAt,
          createdAt: rawData.createdAt,
          completedBy: rawData.completedBy || "System",
          completedAt: rawData.createdAt,
          rackNumber: rawData.rackNumber,
          invoiceNumber: rawData.invoiceNumber,
          productName: rawData.productId?.productName || rawData.productName,
        },
      ];

   
    } else if (notification.type === "order_request") {
      
      if (session?.user?.role === "keeper") {
     
        router.push(`/orders/view/${rawData._id}`);
        return;
      }

  

      
      const transactionType =
        rawData.type || rawData.transactionType || rawData.activityType || "in";
 

      
      let productName = rawData.productName || rawData.entityName;
      let projectName = rawData.projectName;


      if (!productName || productName === "Unknown Product") {
        productName = await resolveProductName(rawData.productId);
      }
      if (!projectName || projectName === "Unknown Project") {
        projectName = await resolveProjectName(rawData.projectId);
      }

      
      requests = [
        {
          _id: rawData._id,
          productId: rawData.productId,
          projectId: rawData.projectId,
          quantity: rawData.quantity,
          type: transactionType, 
          status: rawData.status || "pending",
          date: rawData.date || rawData.createdAt,
          createdAt: rawData.createdAt,
          invoiceNumber:
            rawData.invoiceNumber || rawData.poNumber || "Not specified",
          supplierName:
            rawData.supplierName || rawData.recipient || "Not specified",
          
          productName: productName,
          projectName: projectName,
          createdBy: rawData.createdBy || rawData.requestedBy || "System",
          reason:
            rawData.reason ||
            `Order request for ${rawData.quantity || 0} units`,
          
          orderType:
            transactionType === "in" ? "Stock IN Order" : "Stock OUT Order",
          activityType: transactionType === "in" ? "Stock IN" : "Stock OUT",
          impact:
            transactionType === "in" ? "Stock Increase" : "Stock Decrease",
        },
      ];
    } else if (notification.type === "order_completion") {
    
      
      const transactionType =
        rawData.type || rawData.transactionType || rawData.activityType || "in";
  

      
      let productName = rawData.productName || rawData.entityName;
      let projectName = rawData.projectName;

      
      if (!productName || productName === "Unknown Product") {
        productName = await resolveProductName(rawData.productId);
      }
      if (!projectName || projectName === "Unknown Project") {
        projectName = await resolveProjectName(rawData.projectId);
      }

      
      requests = [
        {
          _id: rawData._id,
          productId: rawData.productId,
          projectId: rawData.projectId,
          quantity: rawData.quantity,
          type: transactionType, 
          status: "completed",
          date: rawData.date || rawData.createdAt,
          createdAt: rawData.createdAt,
          completedAt:
            rawData.completedAt ||
            rawData.createdAt ||
            new Date().toISOString(),
          completedBy:
            rawData.completedBy ||
            rawData.requestedBy ||
            rawData.createdBy ||
            "System",
          invoiceNumber:
            rawData.invoiceNumber || rawData.poNumber || "Not specified",
          supplierName:
            rawData.supplierName || rawData.recipient || "Not specified",
          
          productName: productName,
          projectName: projectName,
          reason:
            rawData.reason || `Order completed: ${rawData.quantity || 0} units`,
          
          orderType:
            transactionType === "in" ? "Stock IN Order" : "Stock OUT Order",
          activityType: transactionType === "in" ? "Stock IN" : "Stock OUT",
          impact:
            transactionType === "in" ? "Stock Increase" : "Stock Decrease",
        },
      ];
    } else {
      console.warn("Unknown notification type:", notification.type);
      return;
    }

    setApprovalSheetRequests(requests);


    let requestType = "transfer";
    if (notification.type.includes("adjustment")) {
      requestType = "stock-adjustment";
    } else if (
      notification.type === "stock_in" ||
      notification.type === "stock_out"
    ) {
      requestType = "activity"; 
    } else if (notification.type === "order_request") {
      requestType = "order_request";
    } else if (notification.type === "order_completion") {
      requestType = "order_completion";
    }

    setSelectedNotification({ ...notification, requestType });
    setIsApprovalSheetOpen(true);
  };

  const handleCheck = async (notificationId) => {
    
    const notification = notifications.find((n) => n.id === notificationId);
    if (!notification) {
      toast.error("Notification not found");
      return;
    }

    
    if (
      session?.user?.role === "admin" &&
      (notification.type === "transfer_request_admin" ||
        notification.type === "adjustment_request_admin") &&
      notification.status === "pending"
    ) {
      try {
        const rawData = notification.rawData;

        if (notification.type === "transfer_request_admin") {
          const response = await fetch("/api/transfers", {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              transferId: rawData._id,
              status: "approved",
              approvedBy: session?.user?.id,
            }),
          });

          if (response && response.ok) {
            toast.success("Transfer request approved successfully!");
            await refetchNotifications(); 
          } else {
            const errorData = await response.json();
            toast.error(`Error: ${errorData.error}`);
          }
        } else if (notification.type === "adjustment_request_admin") {
          const response = await fetch("/api/stock-adjustment-requests", {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              requestId: rawData.requestId || rawData._id,
              action: "approve",
            }),
          });

          if (response && response.ok) {
            toast.success("Stock adjustment request approved successfully!");
            await refetchNotifications(); 
          } else {
            const errorData = await response.json();
            toast.error(`Error: ${errorData.error}`);
          }
        } else {
          toast.error("Unknown notification type for approval");
        }
      } catch (error) {
        toast.error("Failed to approve request. Please try again.");
      }
    }
    
    else if (
      (notification.type === "transfer_ready_destination" ||
        notification.status === "ready_for_completion") &&
      (session?.user?.role === "manager" ||
        session?.user?.role === "keeper" ||
        session?.user?.role === "admin")
    ) {
      handleView(notificationId);
    }
    
    else {
      handleView(notificationId);
    }
  };

  const handleDelete = async (notificationId) => {
    
    const notification = notifications.find((n) => n.id === notificationId);
    if (!notification) return;

    
    if (
      session?.user?.role === "admin" &&
      ["request", "pending"].includes(notification.status)
    ) {
      if (!confirm("Are you sure you want to reject this request?")) return;
      try {
        const rawData = notification.rawData;

        if (notification.type.includes("transfer")) {
          const response = await fetch("/api/transfers", {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              transferId: rawData._id,
              status: "rejected",
              rejectedBy: session?.user?.id,
            }),
          });

          if (response.ok) {
            toast.success("Transfer request rejected successfully!");
            await refetchNotifications(); 
          } else {
            const errorData = await response.json();
            toast.error(`Error: ${errorData.error}`);
          }
        } else if (notification.type.includes("adjustment")) {
          const response = await fetch("/api/stock-adjustment-requests", {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              requestId: rawData.requestId || rawData._id,
              action: "reject",
            }),
          });

          if (response.ok) {
            toast.success("Stock adjustment request rejected successfully!");
            await refetchNotifications(); 
          } else {
            const errorData = await response.json();
            toast.error(`Error: ${errorData.error}`);
          }
        } else {
          console.warn(
            "Unknown notification type for rejection:",
            notification.type
          );
        }
      } catch (error) {
        console.error("Error rejecting request:", error);
        toast.error("Failed to reject request. Please try again.");
      }
    }
    
    else if (
      notification.status === "ready_for_completion" &&
      (session?.user?.role === "manager" ||
        session?.user?.role === "keeper" ||
        session?.user?.role === "admin")
    ) {
      if (
        !confirm(
          "Are you sure you want to reject this transfer? This will cancel the approved transfer."
        )
      )
        return;
      try {
        const rawData = notification.rawData;
        const response = await fetch("/api/transfers", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            transferId: rawData._id,
            status: "rejected",
            rejectedBy: session?.user?.id,
          }),
        });
        if (response.ok) {
          toast.success("Transfer rejected successfully!");
          await refetchNotifications(); 
        } else {
          const errorData = await response.json();
          toast.error(`Error: ${errorData.error}`);
        }
      } catch (error) {
        console.error("Error rejecting transfer:", error);
        toast.error("Failed to reject transfer. Please try again.");
      }
    }
  };

  const handleApprovalSheetClose = (isOpen) => {
    setIsApprovalSheetOpen(isOpen);
    if (!isOpen) {
      setSelectedNotification(null);
      setApprovalSheetRequests([]);

      
      if (refetchNotifications) {
        refetchNotifications();
      }

      
      if (refreshNotificationCount) {
   
        refreshNotificationCount();
      }
    }
  };

  if (isParentLoading || loading) {
    return (
      <div className="flex flex-col items-start justify-start w-full gap-5">
        <div className="flex flex-row items-center justify-end w-full gap-2 font-medium cursor-pointer">
          <Skeleton className="w-12 h-5" />
          <Skeleton className="w-16 h-5" />
          <Skeleton className="w-12 h-5" />
        </div>
        <div className="w-full space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-4 rounded-md shadow-sm"
              style={{ boxShadow: "0px 0px 10px 0px #0000000A" }}
            >
              <div className="flex items-center gap-3">
                <Skeleton className="w-8 h-8 rounded-full" />
                <Skeleton className="w-64 h-5" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="w-24 h-5" />
                <Skeleton className="w-8 h-8 rounded-md" />
                <Skeleton className="w-8 h-8 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-start justify-start w-full gap-5">
      <div className="flex flex-row items-center justify-end w-full gap-2 font-medium">
        {/* Admin-only Stock Adjustment Approvals button */}
        {/* {session?.user?.role === 'admin' && (
          <button 
            onClick={handleStockAdjustmentApprovals} 
            className="px-4 py-1.5 text-sm font-medium text-white bg-amalfitanAzure rounded-md hover:bg-blue-700 transition-colors"
          >
            Stock Adjustment Approvals
          </button>
        )} */}

        <div className="flex flex-row items-center gap-2 cursor-pointer">
          <p
            className={`${
              filter === "all"
                ? "text-amalfitanAzure underline"
                : "text-amalfitanAzure/40"
            } active:text-amalfitanAzure active:underline`}
            onClick={() => setFilter("all")}
          >
            All
          </p>
          <p
            className={`${
              filter === "unread"
                ? "text-amalfitanAzure underline"
                : "text-amalfitanAzure/40"
            } active:text-amalfitanAzure active:underline`}
            onClick={() => setFilter("unread")}
          >
            Unread
          </p>
          <p
            className={`${
              filter === "read"
                ? "text-amalfitanAzure underline"
                : "text-amalfitanAzure/40"
            } active:text-amalfitanAzure active:underline`}
            onClick={() => setFilter("read")}
          >
            Read
          </p>
        </div>
      </div>
      <div className="w-full space-y-3">
        {!loading && session?.user && filteredNotifications.length === 0 ? (
          <div className="flex items-center justify-center w-full py-8">
            <p className="text-gray-500">No notifications found.</p>
          </div>
        ) : (
         
          filteredNotifications.map((notification) => {
            
            let canApprove = false;
            let canComplete = false;
            
            if (
              session?.user?.role === "admin" &&
              notification.status === "pending"
            ) {
              canApprove = true;
            }
            if (
              session?.user?.role === "manager" ||
              (session?.user?.role === "keeper" &&
                notification.status === "ready_for_completion")
            ) {
              
              const assignedProjects =
                session.user.availableProjects?.map(
                  (p) => p._id?.toString?.() || p.toString?.() || p
                ) ||
                (session.user.assignedProject
                  ? [session.user.assignedProject.toString()]
                  : []);
              if (
                assignedProjects.includes(
                  notification.destinationProjectId?.toString?.()
                )
              ) {
                canComplete = true;
              }
            }
            return (
              <NotificationRow
                key={notification.id}
                iconColor={notification.iconColor}
                description={notification.description}
                timestamp={notification.timestamp}
                actor={notification.actor}
                quantity={notification.quantity}
                adjustmentType={notification.adjustmentType}
                onView={() => handleView(notification.id)}
                onCheck={() => handleCheck(notification.id)}
                onDelete={() => handleDelete(notification.id)}
                userRole={session?.user?.role}
                canApprove={canApprove}
                canComplete={canComplete}
                read={isNotificationViewed(
                  generateUserSpecificNotificationId(notification.id, session?.user?.email),
                  session?.user?.email
                )}
              />
            );
          })
        )}
      </div>
      {/* ApprovalSheet Component */}
      {selectedNotification && (
        <ApprovalSheet
          isOpen={isApprovalSheetOpen}
          onOpenChange={handleApprovalSheetClose}
          showTrigger={false}
          session={session}
          requests={approvalSheetRequests}
          requestType={selectedNotification.requestType || "transfer"} 
          pendingCount={approvalSheetRequests.length}
          projectName={
            approvalSheetRequests.length > 1
              ? "Multiple Projects"
              : selectedNotification.rawData?.projectId?.projectName ||
                selectedNotification.rawData?.projectName ||
                selectedNotification.rawData?.sourceProjectName ||
                "Unknown Project"
          }
          productName={
            approvalSheetRequests.length > 1
              ? "Multiple Products"
              : selectedNotification.rawData?.productId?.productName ||
                selectedNotification.rawData?.entityName ||
                selectedNotification.rawData?.productName ||
                "Unknown Product"
          }
          status={selectedNotification.status || "unknown"}
          statusColor={selectedNotification.iconColor || "#6B7280"}
        />
      )}
    </div>
  );
};

export default NotificationTable;
