"use client";

import NotificationRow from "@/components/shared/notification-row";
import ApprovalSheet from "@/components/popups/ApprovalSheet/ApprovalSheet";
import ApprovalDialog from "@/components/popups/ApprovalDialog";
import DeleteDialog from "@/components/popups/DeleteDialog";
import React, { useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";

const ActivityHistory = ({ productId, session }) => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [approvalSheetData, setApprovalSheetData] = useState(null);
  const [isApprovalSheetOpen, setIsApprovalSheetOpen] = useState(false);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pendingActionId, setPendingActionId] = useState(null);
  const [pendingActionType, setPendingActionType] = useState(null);

  const userRole = session?.user?.role;
  const isAdmin = userRole === 'admin';

  useEffect(() => {
    if (productId) {
      fetchActivityHistory();
    }
  }, [productId]);  const fetchActivityHistory = async () => {
    try {
      setLoading(true);
      
      
      const productResponse = await fetch(`/api/Products/${productId}`);
      const productData = productResponse.ok ? await productResponse.json() : null;
      
      
      const projectsResponse = await fetch('/api/Projects');
      const projectsData = projectsResponse.ok ? await projectsResponse.json() : { projects: [] };
      const projects = projectsData.projects || [];      
      const [transfersResponse, stockRequestsResponse, stockTransactionsResponse, activitiesResponse, adminActionsResponse] = await Promise.all([
        fetch(`/api/transfers?productId=${productId}`),
        fetch(`/api/stock-adjustment-requests?productId=${productId}`),
        fetch(`/api/stock-management?productId=${productId}`),
        fetch('/api/activities'),
        fetch(`/api/admin/actions?productId=${productId}`)
      ]);

  const transfersData = transfersResponse.ok ? await transfersResponse.json() : { transfers: [] };
  const stockRequestsData = stockRequestsResponse.ok ? await stockRequestsResponse.json() : { requests: [] };
  const stockTransactionsData = stockTransactionsResponse.ok ? await stockTransactionsResponse.json() : { transactions: [] };
  const activitiesData = activitiesResponse.ok ? await activitiesResponse.json() : { activities: [] };
  const adminActionsData = adminActionsResponse.ok ? await adminActionsResponse.json() : { actions: [] };

      
      const allActivities = [];      
      if (transfersData.transfers) {
        transfersData.transfers.forEach(transfer => {
          const sourceProjectName = getProjectNameById(transfer.fromProjectId, projects);
          const destinationProjectName = getProjectNameById(transfer.toProjectId, projects);
          const productName = productData ? productData.productName : "Unknown Product";
          const transferType = transfer.type || "transfer";
          
          let description = "";
          if (transfer.status === 'pending') {
            description = `${sourceProjectName} created stock transfer for ${productName}`;
          } else if (transfer.status === 'approved') {
            description = `Admin approved stock transfer for ${productName}`;
          } else if (transfer.status === 'rejected') {
            description = `Admin rejected stock transfer for ${productName}`;
          } else if (transfer.status === 'completed') {
            description = `${destinationProjectName} completed stock transfer for ${productName}`;
          } else {
            description = `${sourceProjectName} requested transfer of ${productName}`;
          }
          
          const activity = {
            id: `transfer-${transfer._id}`,
            type: 'transfer',
            iconColor: getTransferIconColor(transfer),
            description: description,
            timestamp: formatTimestamp(transfer.createdAt),
            originalData: transfer
          };
          allActivities.push(activity);
        });
      }

      
      if (stockRequestsData.requests) {
        stockRequestsData.requests.forEach(request => {
          const projectName = request.projectName || getProjectNameById(request.projectId, projects);
          const productName = productData ? productData.productName : "Unknown Product";
          
          let description = "";
          if (request.status === 'pending') {
            description = `${projectName} created stock request for ${productName}`;
          } else if (request.status === 'approved') {
            description = `Admin approved stock movement for ${productName}`;
          } else if (request.status === 'rejected') {
            description = `Admin rejected stock request for ${productName}`;
          } else {
            description = `${projectName} requested stock adjustment for ${productName}`;
          }
            const activity = {
            id: `stock-${request._id}`,
            type: 'stock_adjustment',
            iconColor: getStockAdjustmentIconColor(request),
            description: description,
            timestamp: formatTimestamp(request.createdAt || request.requestedAt),
            originalData: request
          };
          allActivities.push(activity);
        });
      }

      if (stockTransactionsData.transactions) {

        stockTransactionsData.transactions.forEach(transaction => {
          const projectName = transaction.projectName || getProjectNameById(transaction.projectId, projects);
          const productName = productData ? productData.productName : "Unknown Product";
          
          let description = "";
          let iconColor = "";
          
          if (transaction.type === 'in') {
            description = `Stock IN: ${transaction.quantity} units of ${productName} added to ${projectName}`;
            iconColor = "#10B981"; 
          } else if (transaction.type === 'out') {
            description = `Stock OUT: ${transaction.quantity} units of ${productName} removed from ${projectName}`;
            iconColor = "#EF4444"; 
          } else {
            description = `Stock transaction: ${transaction.quantity} units of ${productName} in ${projectName}`;
            iconColor = "#6366F1"; 
          }
          
          if (transaction.invoiceNumber || transaction.supplierName) {
            const invoiceInfo = transaction.invoiceNumber ? ` Invoice: ${transaction.invoiceNumber}` : '';
            const supplierInfo = transaction.supplierName ? ` Supplier: ${transaction.supplierName}` : '';
            description += `${invoiceInfo}${supplierInfo}`;
          }
          
          const activity = {
            id: `stock-transaction-${transaction._id}`,
            type: transaction.type === 'in' ? 'stock_in' : 'stock_out',
            iconColor: iconColor,
            description: description,
            timestamp: formatTimestamp(transaction.createdAt),
            originalData: {
              ...transaction,
              productName: productName,
              projectName: projectName
            }
          };
          allActivities.push(activity);
        });
      }

      // Admin direct actions (from adminActions collection)
      if (adminActionsData.actions) {
        adminActionsData.actions.forEach(action => {
          const productName = productData ? productData.productName : (action.productName || "Unknown Product");
          const projectName = action.projectName || getProjectNameById(action.projectId, projects);
          const actorName = action.adminUser || 'Admin';
          let description = '';
          const oh = (val) => (val === undefined || val === null) ? '-' : val;
          if (action.action === 'direct_rack_stock_update') {
            description = `${actorName} set ${productName} at Rack ${action.rackNumber} in ${projectName}: On Hand ${oh(action.stockOnHand)}, On Hold ${oh(action.stockOnHold)}`;
          } else if (action.action === 'direct_stock_update') {
            if (action.selectedRack) {
              description = `${actorName} set ${productName} at Rack ${action.selectedRack} in ${projectName}: On Hand ${oh(action.stockOnHand)}, On Hold ${oh(action.stockOnHold)}`;
            } else {
              description = `${actorName} set ${productName} stock in ${projectName}: On Hand ${oh(action.stockOnHand)}, On Hold ${oh(action.stockOnHold)}`;
            }
          } else {
            description = `${actorName} performed admin action on ${productName} in ${projectName}`;
          }
          if (action.reason) {
            description += ` (Reason: ${action.reason})`;
          }
          const activity = {
            id: `admin-action-${action._id}`,
            type: 'system_activity',
            iconColor: '#0EA5E9', // info blue
            description,
            timestamp: formatTimestamp(action.timestamp),
            originalData: {
              ...action,
              createdAt: action.timestamp,
              productName,
              projectName,
            },
          };
          allActivities.push(activity);
        });
      }

      
      // Helper to safely normalize a MongoDB ObjectId or string to string for comparisons
      const normalizeId = (val) => {
        if (!val) return null;
        if (typeof val === 'string') return val;
        if (typeof val === 'object') {
          if (val.$oid) return val.$oid; // Extended JSON
          if (val._id) {
            if (typeof val._id === 'string') return val._id;
            if (val._id?.$oid) return val._id.$oid;
          }
        }
        try { return val.toString?.(); } catch { return null; }
      };

      if (activitiesData.activities) {
        activitiesData.activities
          .filter(activity => {
            const entType = activity.entityType;
            const entId = normalizeId(activity.entityId);
            const changesPid = normalizeId(activity.changes?.productId);
            // Match if: product-level entity OR request-level pointing to same product
            return (
              (entType === 'product' && entId === productId) ||
              entId === productId ||
              changesPid === productId
            );
          })
          .forEach(activity => {
            const productName = productData ? productData.productName : (activity.entityName || "Unknown Product");
            const actorName = activity.userName || activity.userEmail || 'Unknown User';
            const projectName = activity.projectName || 'Unknown Project';
            
            let description = "";
            let iconColor = "#8B5CF6"; 
            
            if (activity.type === 'stock_management') {
              if (activity.action === 'stock_in') {
                description = `Stock IN: ${activity.changes?.quantity || 'Unknown'} units of ${productName} added to ${projectName}`;
                iconColor = "#10B981"; 
              } else if (activity.action === 'stock_out') {
                description = `Stock OUT: ${activity.changes?.quantity || 'Unknown'} units of ${productName} removed from ${projectName}`;
                iconColor = "#EF4444"; 
              } else {
                description = `${actorName} managed stock for ${productName} in ${projectName}`;
                iconColor = "#6366F1"; 
              }
              
              
              if (activity.metadata?.rackNumber) {
                description += ` (Rack: ${activity.metadata.rackNumber})`;
              }
              if (activity.metadata?.invoiceNumber) {
                description += ` Invoice: ${activity.metadata.invoiceNumber}`;
              }
            } else if (activity.type === 'stock_adjustment' && activity.action === 'manual_adjustment_applied') {
              const rackNo = activity.changes?.rackNumber ? `Rack ${activity.changes.rackNumber}` : 'Rack -';
              const onHand = activity.changes?.stockOnHand || {};
              const onHold = activity.changes?.stockOnHold || {};
              const fmtDelta = (v) => (v > 0 ? `+${v}` : `${v}`);
              const ohPrev = onHand.previous ?? '-';
              const ohNew = onHand.new ?? '-';
              const ohDelta = onHand.delta ?? 0;
              const hPrev = onHold.previous ?? '-';
              const hNew = onHold.new ?? '-';
              const hDelta = onHold.delta ?? 0;
              description = `Approved stock adjustment for ${productName} at ${rackNo}: On Hand ${ohPrev} → ${ohNew} (${fmtDelta(ohDelta)}), On Hold ${hPrev} → ${hNew} (${fmtDelta(hDelta)})`;
              iconColor = "#10B981"; // green for approved
            } else if (activity.type === 'stock_adjustment' && activity.action === 'request_created') {
              const rackNo = activity.changes?.rackNumber ? `Rack ${activity.changes.rackNumber}` : 'Rack -';
              const requestedHand = activity.changes?.requestedStockOnHand;
              const requestedHold = activity.changes?.requestedStockOnHold;
              const currentHand = activity.changes?.currentRackStock;
              const parts = [];
              if (currentHand !== undefined && requestedHand !== undefined) {
                parts.push(`On Hand ${currentHand} → ${requestedHand}`);
              } else if (requestedHand !== undefined) {
                parts.push(`On Hand (requested) ${requestedHand}`);
              }
              if (requestedHold !== undefined) {
                parts.push(`On Hold (requested) ${requestedHold}`);
              }
              const reason = activity.changes?.reason ? ` (Reason: ${activity.changes.reason})` : '';
              const suffix = parts.length ? `: ${parts.join(', ')}` : '';
              description = `${actorName} requested stock adjustment for ${productName} at ${rackNo}${suffix}${reason}`;
              iconColor = "#F59E0B"; // amber for pending
            } else if (activity.type === 'stock_adjustment' && activity.action === 'request_approved') {
              const rackNo = activity.changes?.rackNumber ? `Rack ${activity.changes.rackNumber}` : 'Rack -';
              const approvedHand = activity.changes?.approvedStockOnHand;
              const approvedHold = activity.changes?.approvedStockOnHold;
              const parts = [];
              if (approvedHand !== undefined) parts.push(`On Hand → ${approvedHand}`);
              if (approvedHold !== undefined) parts.push(`On Hold → ${approvedHold}`);
              const suffix = parts.length ? `: ${parts.join(', ')}` : '';
              description = `${actorName} approved stock adjustment for ${productName} at ${rackNo}${suffix}`;
              iconColor = "#10B981"; // approved green
            } else if (activity.type === 'product_update') {
              description = `${actorName} updated product details for ${productName}`;
              iconColor = "#8B5CF6"; 
              
              
              activity.type = 'product_update';
            } else if (activity.type === 'stock_increment') {
              description = `${projectName} incremented stock of ${productName}`;
              iconColor = "#10B981"; 
            } else if (activity.type === 'stock_decrement') {
              description = `${projectName} decremented stock of ${productName}`;
              iconColor = "#EF4444"; 
            } else if (activity.action === 'create' && activity.entityType === 'product') {
              description = `${actorName} created product ${productName}`;
              iconColor = "#10B981"; 
            } else if (activity.action === 'update' && activity.entityType === 'product') {
              description = `${actorName} updated ${productName}`;
              iconColor = "#F59E0B"; 
            } else {
              
              description = `${actorName} ${activity.action} ${activity.entityType} ${productName}`;
            }
            
            const activityItem = {
              id: `activity-${activity._id}`,
              type: activity.type === 'product_update' ? 'product_update' : 'system_activity',
              iconColor: iconColor,
              description: description,
              timestamp: formatTimestamp(activity.timestamp),
              originalData: activity
            };
            allActivities.push(activityItem);
          });
      }
      allActivities.sort((a, b) => {
        const dateA = new Date(a.originalData.createdAt || a.originalData.requestedAt || a.originalData.timestamp || 0);
        const dateB = new Date(b.originalData.createdAt || b.originalData.requestedAt || b.originalData.timestamp || 0);
        return dateB - dateA;
      });      setActivities(allActivities);
    } catch (error) {
      console.error("Error fetching activity history:", error);
      setActivities([]);
    } finally {
      setLoading(false);
    }
  };
  const getProjectNameById = (projectId, projects) => {
    if (!projectId || !projects) return "Unknown Project";
    const project = projects.find(p => p._id === projectId);
    return project ? project.projectName : "Unknown Project";
  };
  const getTransferIconColor = (transfer) => {
    switch (transfer.status) {
      case 'approved': return "#10B981"; 
      case 'rejected': return "#EF4444"; 
      case 'pending': return "#F59E0B"; 
      case 'completed': return "#06B6D4"; 
      default: return "#4283DE"; 
    }
  };

  const getStockAdjustmentIconColor = (request) => {
    switch (request.status) {
      case 'approved': return "#10B981"; 
      case 'rejected': return "#EF4444"; 
      case 'pending': return "#F59E0B"; 
      default: return "#6366F1"; 
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "Unknown time";
    
    try {
      const date = new Date(timestamp);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      return "Invalid date";
    }
  };
  const handleView = (activityId) => {
    const activity = activities.find(act => act.id === activityId);
    if (!activity) {
      console.error("Activity not found:", activityId);
      return;
    }

    let approvalData;
    
    if (activity.type === 'transfer') {
      const transferData = activity.originalData;
      approvalData = {
        type: 'transfer',
        data: [transferData], 
        productId: productId,
        session: session
      };
    } else if (activity.type === 'stock_adjustment') {
      const stockData = activity.originalData;
      approvalData = {
        type: 'stock_adjustment',
        data: [stockData], 
        productId: productId,
        session: session
      };
    } else if (activity.type === 'system_activity' && activity.originalData.type === 'product_update') {
      
      const productUpdateData = activity.originalData;
      approvalData = {
        type: 'product_update',
        data: [productUpdateData], 
        productId: productId,
        session: session
      };
    } else if (activity.type === 'product_update') {
      
      const productUpdateData = activity.originalData;
      approvalData = {
        type: 'product_update',
        data: [productUpdateData],
        productId: productId,
        session: session
      };
    } else if (activity.type === 'stock_in' || activity.type === 'stock_out') {
      const transactionData = activity.originalData;
      
      const transformedTransactionData = {
        ...transactionData,
        transactionType: transactionData.type,
        activityType: `Stock ${transactionData.type === 'in' ? 'IN' : 'OUT'}`,
        reason: transactionData.reason || `Stock ${transactionData.type} transaction`,
        status: 'completed',
        productName: transactionData.productName
      };
      
      
      approvalData = {
        type: 'activity', 
        data: [transformedTransactionData],
        productId: productId,
        session: session
      };
    }

    if (approvalData) {
      setApprovalSheetData(approvalData);
      setIsApprovalSheetOpen(true);
    } else {
    }
  };

  const handleCheck = (activityId) => {
    setPendingActionId(activityId);
    setPendingActionType('approve');
    setApproveDialogOpen(true);
  };

  const handleDelete = (activityId) => {
    setPendingActionId(activityId);
    setPendingActionType('reject');
    setDeleteDialogOpen(true);
  };

  const handleApproveConfirm = async () => {
    if (!pendingActionId) return;
    
    await approveRequest(pendingActionId);
    setApproveDialogOpen(false);
    setPendingActionId(null);
    setPendingActionType(null);
  };

  const handleRejectConfirm = async () => {
    if (!pendingActionId) return;
    
    await rejectRequest(pendingActionId);
    setDeleteDialogOpen(false);
    setPendingActionId(null);
    setPendingActionType(null);
  };

  
  const approveRequest = async (activityId) => {
    if (!isAdmin) return;
    const activity = activities.find(act => act.id === activityId);
    if (!activity) return;
    try {
      let response;
      if (activity.type === 'transfer') {
        response = await fetch('/api/transfers', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transferId: activity.originalData._id,
            status: 'approved',
            approvedBy: session.user.id
          }),
        });
      } else if (activity.type === 'stock_adjustment') {
        response = await fetch('/api/stock-adjustment-requests', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requestId: activity.originalData.requestId,
            action: 'approve'
          }),
        });
      }
      if (response && response.ok) {
        await fetchActivityHistory();
      }
    } catch (error) {
      console.error("Error approving request:", error);
    }
  };

  const rejectRequest = async (activityId) => {
    if (!isAdmin) return;
    const activity = activities.find(act => act.id === activityId);
    if (!activity) return;
    try {
      let response;
      if (activity.type === 'transfer') {
        response = await fetch('/api/transfers', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transferId: activity.originalData._id,
            status: 'rejected',
            approvedBy: session.user.id
          }),
        });
      } else if (activity.type === 'stock_adjustment') {
        response = await fetch('/api/stock-adjustment-requests', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requestId: activity.originalData.requestId,
            action: 'reject'
          }),
        });
      }
      if (response && response.ok) {
        await fetchActivityHistory();
      }
    } catch (error) {
      console.error("Error rejecting request:", error);
    }
  };

  return (
    <div className="flex flex-col justify-between gap-5">
      <h2>Activity History</h2>
      <div className="flex flex-col w-full gap-4">
        {loading ? (
          <div className="flex flex-col w-full gap-4">
            <Skeleton className="w-1/3 h-6 mb-2" />
            {[...Array(4)].map((_, idx) => (
              <div key={idx} className="flex items-center gap-4 mb-2">
                <Skeleton className="w-10 h-10 rounded-full" />
                <Skeleton className="w-1/2 h-5" />
                <Skeleton className="w-32 h-4" />
              </div>
            ))}
          </div>
        ) : activities.length === 0 ? (
          <div className="flex justify-center p-8">
            <p className="text-gray-500">No activity history found for this product</p>
          </div>
        ) : (
          <div className="flex flex-col w-full gap-4 max-h-[500px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
            {activities.map((activity) => {
              
              const canApprove = isAdmin && 
                activity.originalData && 
                activity.originalData.status === 'pending';
              // Determine if a popup is available for this activity type
              const supportsPopup = (
                activity.type === 'transfer' ||
                activity.type === 'stock_in' ||
                activity.type === 'stock_out' ||
                activity.type === 'product_update' ||
                (activity.type === 'stock_adjustment' && (activity.originalData?.requestId || activity.originalData?.status))
              );
              
              return (
                <NotificationRow
                  key={activity.id}
                  iconColor={activity.iconColor}
                  description={activity.description}
                  timestamp={activity.timestamp}
                  userRole={userRole}
                  canApprove={canApprove}
                  canView={supportsPopup}
                  onView={() => handleView(activity.id)}
                  onCheck={() => handleCheck(activity.id)}
                  onDelete={() => handleDelete(activity.id)}
                />
              );
            })}
            {activities.length > 5 && (
              <div className="p-2 text-xs text-center text-gray-400">
                {activities.length} total activities
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* ApprovalSheet for viewing individual requests */}
      {approvalSheetData && (
        <ApprovalSheet
          session={session}
          requests={approvalSheetData.data}
          productId={productId}
          requestType={
            approvalSheetData.type === 'transfer' 
              ? 'transfer' 
              : approvalSheetData.type === 'product_update'
                ? 'product_update'
                : approvalSheetData.type === 'activity'
                  ? 'activity'
                  : 'stock-adjustment'
          }
          pendingCount={approvalSheetData.data.length}
          isOpen={isApprovalSheetOpen}
          onOpenChange={setIsApprovalSheetOpen}
          showTrigger={false}
        />
      )}
      {/* ApprovalDialog for approve action */}
      {approveDialogOpen && (
        <ApprovalDialog
          open={approveDialogOpen}
          onOpenChange={setApproveDialogOpen}
          title="Approve Request"
          submitButtonText="Approve"
          cancelButtonText="Cancel"
          onSubmit={handleApproveConfirm}
          disabled={false}
          showStockQuantity={false}
          showReason={false}
        />
      )}
      {/* DeleteDialog for reject action */}
      {deleteDialogOpen && (
        <DeleteDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          title="Reject Request"
          description="Are you sure you want to reject this request? This action cannot be undone."
          confirmButtonText="Reject"
          cancelButtonText="Cancel"
          onConfirm={handleRejectConfirm}
          onCancel={() => setDeleteDialogOpen(false)}
          showTag={false}
        />
      )}
    </div>
  );
};

export default ActivityHistory;
