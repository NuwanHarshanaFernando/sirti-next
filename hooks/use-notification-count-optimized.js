"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { getViewedNotifications, generateUserSpecificNotificationId } from "@/lib/notification-utils";
import { useSocket } from "@/contexts/SocketContext";

export const useNotificationCount = () => {
  const { data: session } = useSession();
  const { socket } = useSocket();
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Helper function to generate user-specific notification IDs
  const generateUserSpecificId = useCallback((baseId) => {
    return generateUserSpecificNotificationId(baseId, session?.user?.email);
  }, [session?.user?.email]);

  // Helper function to format timestamp  
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Unknown time';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now - date) / (1000 * 60));
      return `${diffInMinutes} minutes ago`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} hours ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    }
  };

  const fetchUnreadNotifications = useCallback(async () => {
    if (!session?.user) {
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Use the centralized notifications API
      const response = await fetch('/api/notifications');
      if (!response.ok) {
        console.error('Failed to fetch notifications');
        setUnreadCount(0);
        setLoading(false);
        return;
      }
      
      const data = await response.json();
      const notifications = data.notifications || [];
      

      // Get user's viewed notifications
      const viewedNotifications = getViewedNotifications(session.user.email);
      
      // Count unread notifications - generate user-specific IDs for comparison
      const unreadNotifications = notifications.filter(notification => {
        const userSpecificId = generateUserSpecificId(notification.id);
        return !viewedNotifications.includes(userSpecificId);
      });

      setUnreadCount(unreadNotifications.length);
      
    } catch (error) {
      console.error('Error fetching notification count:', error);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }, [session?.user, generateUserSpecificId]);
        // Map by both _id and email for flexible lookup
        if (user._id) {
          userMap[user._id] = user.name || user.email || 'Unknown User';
        }
        if (user.email) {
          userMap[user.email] = user.name || user.email || 'Unknown User';
        }
      });

      // Transform transfer requests to notifications (same logic as NotificationTable)
      const transferNotifications = [];
      
      (transferData.transfers || []).forEach(transfer => {
        // Special handling for EXTERNAL projects
        const fromIsExternal = transfer.fromProjectId === "EXTERNAL";
        const toIsExternal = transfer.toProjectId === "EXTERNAL";
        
        // Get project names with special handling for EXTERNAL
        const sourceProjectName = fromIsExternal ? "EXTERNAL" : 
                                (projectMap[transfer.fromProjectId]?.name || 'Unknown Project');
        const destinationProjectName = toIsExternal ? "EXTERNAL" : 
                                      (projectMap[transfer.toProjectId]?.name || 'Unknown Project');
        
        const productName = productMap[transfer.productId] || 'Unknown Product';
        const requestorName = userMap[transfer.requestedBy] || transfer.requestedBy || 'Unknown User';
        
        // Create notification for source project users (the requester's notification)
        transferNotifications.push({
          id: generateUserSpecificId(`transfer-request-${transfer._id}-source`),
          type: 'transfer_request_source',
          iconColor: '#F59E0B',
          projectName: sourceProjectName,
          actionText: 'created transfer request',
          itemName: productName,
          description: `${requestorName} created transfer request for ${productName} from ${sourceProjectName} to ${destinationProjectName}`,
          timestamp: formatTimestamp(transfer.createdAt || transfer.requestedAt),
          status: transfer.status,
          actor: requestorName,
          quantity: transfer.quantity,
          rawData: { 
            ...transfer, 
            activityType: 'request',
            sourceProjectName,
            destinationProjectName,
            productName
          }
        });
        
        // Create notification for admin (pending approval notification)
        if (transfer.status === 'pending') {
          transferNotifications.push({
            id: generateUserSpecificId(`transfer-request-${transfer._id}-admin`),
            type: 'transfer_request_admin',
            iconColor: '#F59E0B',
            projectName: sourceProjectName,
            actionText: 'pending transfer approval',
            itemName: productName,
            description: `Pending approval: Transfer of ${productName} from ${sourceProjectName} to ${destinationProjectName}`,
            timestamp: formatTimestamp(transfer.createdAt || transfer.requestedAt),
            status: 'pending',
            actor: requestorName,
            quantity: transfer.quantity,
            rawData: { 
              ...transfer, 
              activityType: 'pending_approval',
              sourceProjectName,
              destinationProjectName,
              productName
            }
          });
        }

        // If the transfer has been approved, add notifications for both requester and destination users
        if (transfer.status === 'approved') {
          const approverName = userMap[transfer.approvedBy] || transfer.approvedBy || 'Admin';
          
          // Add notification for original requester (source project)
          transferNotifications.push({
            id: generateUserSpecificId(`transfer-approval-${transfer._id}-source`),
            type: 'transfer_approval_source',
            iconColor: '#10B981',
            projectName: sourceProjectName,
            actionText: 'approved transfer',
            itemName: productName,
            description: `${approverName} approved transfer of ${productName} from ${sourceProjectName} to ${destinationProjectName}`,
            timestamp: formatTimestamp(transfer.approvedAt || transfer.updatedAt || transfer.createdAt),
            status: 'approved',
            actor: approverName,
            quantity: transfer.quantity,
            rawData: { 
              ...transfer, 
              activityType: 'approval',
              sourceProjectName,
              destinationProjectName,
              productName
            }
          });

          // Add notification for destination project users
          transferNotifications.push({
            id: generateUserSpecificId(`transfer-ready-${transfer._id}-destination`),
            type: 'transfer_ready_destination',
            iconColor: '#0066CC',
            projectName: destinationProjectName, 
            actionText: 'ready to receive',
            itemName: productName,
            description: `Transfer of ${productName} from ${sourceProjectName} is ready to receive in ${destinationProjectName}`,
            timestamp: formatTimestamp(transfer.approvedAt || transfer.updatedAt || transfer.createdAt),
            status: 'ready_for_completion',
            actor: 'System',
            quantity: transfer.quantity,
            destinationProjectId: transfer.toProjectId,
            sourceProjectId: transfer.fromProjectId,
            rawData: { 
              ...transfer, 
              activityType: 'ready_for_completion',
              sourceProjectName,
              destinationProjectName,
              productName
            }
          });
        } else if (transfer.status === 'rejected') {
          const rejecterName = userMap[transfer.rejectedBy] || transfer.rejectedBy || 'Admin';
          transferNotifications.push({
            id: generateUserSpecificId(`transfer-rejection-${transfer._id}`),
            type: 'transfer_rejection',
            iconColor: '#EF4444',
            projectName: '',
            actionText: '',
            itemName: '',
            description: `${rejecterName} rejected stock transfer for ${productName}`,
            timestamp: formatTimestamp(transfer.rejectedAt || transfer.updatedAt || transfer.createdAt),
            status: 'rejected',
            actor: rejecterName,
            quantity: transfer.quantity,
            rawData: { 
              ...transfer, 
              activityType: 'rejection',
              sourceProjectName,
              destinationProjectName,
              productName
            }
          });
        } else if (transfer.status === 'completed') {
          const completerName = userMap[transfer.completedBy] || transfer.completedBy || destinationProjectName;
          transferNotifications.push({
            id: generateUserSpecificId(`transfer-completion-${transfer._id}`),
            type: 'transfer_completion',
            iconColor: '#06B6D4',
            projectName: '',
            actionText: '',
            itemName: '',
            description: `${completerName} completed stock transfer for ${productName}`,
            timestamp: formatTimestamp(transfer.completedAt || transfer.updatedAt || transfer.createdAt),
            status: 'completed',
            actor: completerName,
            quantity: transfer.quantity,
            rawData: { 
              ...transfer, 
              activityType: 'completion',
              sourceProjectName,
              destinationProjectName,
              productName
            }
          });
        }
      });
      
      // Transform stock adjustment requests to notifications
      const adjustmentNotifications = [];
      
      (adjustmentData.requests || []).forEach(adjustment => {
        const projectName = projectMap[adjustment.projectId]?.name || adjustment.projectName || 'Unknown Project';
        const productName = productMap[adjustment.productId] || 'Unknown Product';
        const requestorName = userMap[adjustment.requestedBy] || adjustment.requestedBy || 'Unknown User';
        
        // Create notification for the requester
        adjustmentNotifications.push({
          id: generateUserSpecificId(`adjustment-request-${adjustment.requestId || adjustment._id}-user`),
          type: 'adjustment_request_user',
          iconColor: '#8B5CF6',
          projectName: projectName,
          actionText: 'requested adjustment',
          itemName: productName,
          description: `${requestorName} requested stock adjustment for ${productName} in ${projectName}`,
          timestamp: formatTimestamp(adjustment.requestedAt || adjustment.createdAt),
          status: adjustment.status || 'pending',
          actor: requestorName,
          quantity: adjustment.stockOnHold || 0,
          adjustmentType: 'stock',
          rawData: { 
            ...adjustment, 
            activityType: 'request',
            projectName,
            productName
          }
        });
        
        // Create notification for admin (pending approval notification)
        if (adjustment.status === 'pending') {
          adjustmentNotifications.push({
            id: generateUserSpecificId(`adjustment-request-${adjustment.requestId || adjustment._id}-admin`),
            type: 'adjustment_request_admin',
            iconColor: '#F59E0B',
            projectName: projectName,
            actionText: 'pending adjustment approval',
            itemName: productName,
            description: `Pending approval: Stock adjustment for ${productName} in ${projectName}`,
            timestamp: formatTimestamp(adjustment.requestedAt || adjustment.createdAt),
            status: 'pending',
            actor: requestorName,
            quantity: adjustment.stockOnHold || 0,
            adjustmentType: 'stock',
            rawData: { 
              ...adjustment, 
              activityType: 'pending_approval',
              projectName,
              productName
            }
          });
        }
        
        if (adjustment.status === 'approved') {
          const approverName = userMap[adjustment.approvedBy] || adjustment.approvedBy || 'Admin';
          
          adjustmentNotifications.push({
            id: generateUserSpecificId(`adjustment-approval-${adjustment.requestId || adjustment._id}`),
            type: 'adjustment_approval',
            iconColor: '#10B981',
            projectName: projectName,
            actionText: 'approved adjustment',
            itemName: productName,
            description: `${approverName} approved stock adjustment for ${productName} in ${projectName}`,
            timestamp: formatTimestamp(adjustment.approvedAt || adjustment.updatedAt || adjustment.createdAt),
            status: 'approved',
            actor: approverName,
            quantity: adjustment.stockOnHold || 0,
            adjustmentType: 'stock',
            rawData: { 
              ...adjustment, 
              activityType: 'approval',
              projectName,
              productName
            }
          });
        } else if (adjustment.status === 'rejected') {
          const rejecterName = userMap[adjustment.rejectedBy] || adjustment.rejectedBy || 'Admin';
          
          adjustmentNotifications.push({
            id: generateUserSpecificId(`adjustment-rejection-${adjustment.requestId || adjustment._id}`),
            type: 'adjustment_rejection',
            iconColor: '#EF4444',
            projectName: projectName,
            actionText: 'rejected adjustment',
            itemName: productName,
            description: `${rejecterName} rejected stock adjustment for ${productName} in ${projectName}`,
            timestamp: formatTimestamp(adjustment.rejectedAt || adjustment.updatedAt || adjustment.createdAt),
            status: 'rejected',
            actor: rejecterName,
            quantity: adjustment.stockOnHold || 0,
            adjustmentType: 'stock',
            rawData: { 
              ...adjustment, 
              activityType: 'rejection',
              projectName,
              productName
            }
          });
        } else if (adjustment.status === 'completed') {
          const completerName = userMap[adjustment.completedBy] || adjustment.completedBy || 'Admin';
          
          adjustmentNotifications.push({
            id: generateUserSpecificId(`adjustment-completion-${adjustment.requestId || adjustment._id}`),
            type: 'adjustment_completion',
            iconColor: '#06B6D4',
            projectName: projectName,
            actionText: 'completed stock adjustment for',
            itemName: productName,
            description: `${completerName} completed stock adjustment for ${productName} in ${projectName}`,
            timestamp: formatTimestamp(adjustment.completedAt || adjustment.updatedAt || adjustment.createdAt),
            status: 'completed',
            actor: completerName,
            quantity: adjustment.stockOnHold || 0,
            adjustmentType: 'stock',
            rawData: { 
              ...adjustment, 
              activityType: 'completion',
              projectName,
              productName
            }
          });
        }
      });

      // Transform stock transactions to notifications
      const stockTransactionNotifications = [];
      
      (stockTransactionsData.transactions || []).forEach(transaction => {
        const productName = productMap[transaction.productId] || 'Unknown Product';
        const projectName = projectMap[transaction.projectId]?.name || 'Unknown Project';
        const transactionType = transaction.type === 'in' ? 'IN' : 'OUT';
        const iconColor = transaction.type === 'in' ? '#10B981' : '#EF4444'; // Green for IN, Red for OUT
        
        stockTransactionNotifications.push({
          id: generateUserSpecificId(`stock-transaction-${transaction._id}`),
          type: `stock_${transaction.type}`,
          iconColor: iconColor,
          projectName: projectName,
          actionText: `stock ${transaction.type}`,
          itemName: productName,
          description: `Stock ${transactionType}: ${transaction.quantity} units of ${productName} ${transaction.type === 'in' ? 'added to' : 'removed from'} ${projectName}`,
          timestamp: formatTimestamp(transaction.createdAt),
          status: 'completed',
          actor: 'System',
          quantity: transaction.quantity,
          rawData: {
            ...transaction,
            activityType: `stock_${transaction.type}`,
            productName,
            projectName,
            transactionType: transactionType
          }
        });
      });

      // Combine and sort notifications by timestamp (most recent first)
      const allNotifications = [...transferNotifications, ...adjustmentNotifications, ...stockTransactionNotifications]
        .sort((a, b) => {
          const dateA = new Date(a.rawData.requestedAt || a.rawData.createdAt || a.rawData.approvedAt || a.rawData.rejectedAt || a.rawData.completedAt);
          const dateB = new Date(b.rawData.requestedAt || b.rawData.createdAt || b.rawData.approvedAt || b.rawData.rejectedAt || b.rawData.completedAt);
          return dateB - dateA;
        });

      // Filter notifications based on user role and assignments (same logic as NotificationTable)
      let filteredNotifications = [];
      
      const user = session.user;
      const userEmail = user.email;
      const userRole = user.role;
      
      if (userRole === "admin") {
        // Admin sees all notifications
        filteredNotifications = allNotifications;
      } else if (userRole === "manager" || userRole === "keeper") {
        // Manager/Keeper sees notifications for their projects
        const userProjects = [];
        
        // Get user's assigned projects from various sources
        if (user.availableProjects && Array.isArray(user.availableProjects)) {
          user.availableProjects.forEach(p => {
            if (typeof p === 'object' && p !== null && p._id) {
              userProjects.push(p._id.toString());
            } else if (p) {
              userProjects.push(p.toString());
            }
          });
        }
        
        if (user.assignedProject) {
          const projectId = typeof user.assignedProject === 'object' 
            ? user.assignedProject._id?.toString() 
            : user.assignedProject.toString();
          
          if (projectId && !userProjects.includes(projectId)) {
            userProjects.push(projectId);
          }
        }
        
        if (user.projects && Array.isArray(user.projects)) {
          user.projects.forEach(p => {
            if (typeof p === 'object' && p !== null && p._id) {
              userProjects.push(p._id.toString());
            } else if (p) {
              userProjects.push(p.toString());
            }
          });
        }
        
        // Prioritize "ready for completion" notifications
        const readyForCompletionNotifications = allNotifications.filter(n => 
          n.type === 'transfer_ready_destination' && 
          n.rawData.toProjectId && 
          userProjects.includes(n.rawData.toProjectId.toString())
        );
        
        // Then include other relevant notifications
        const otherRelevantNotifications = allNotifications.filter(n => {
          if (readyForCompletionNotifications.some(rn => rn.id === n.id)) {
            return false;
          }
          
          if (n.type.includes('transfer_')) {
            const sourceId = n.rawData.fromProjectId?.toString?.();
            const destId = n.rawData.toProjectId?.toString?.();
            
            return (sourceId && (sourceId === "EXTERNAL" || userProjects.includes(sourceId))) || 
                   (destId && (destId === "EXTERNAL" || userProjects.includes(destId)));
          }
          
          if (n.type.includes('adjustment_')) {
            const projectId = n.rawData.projectId?.toString?.();
            return projectId && userProjects.includes(projectId);
          }
          
          return false;
        });
        
        filteredNotifications = [...readyForCompletionNotifications, ...otherRelevantNotifications];
      } else {
        // Regular user - their own notifications + project assignments
        const userProjects = [];
        
        if (user.availableProjects && Array.isArray(user.availableProjects)) {
          user.availableProjects.forEach(p => {
            if (typeof p === 'object' && p !== null && p._id) {
              userProjects.push(p._id.toString());
            } else if (p) {
              userProjects.push(p.toString());
            }
          });
        }
        
        if (user.assignedProject) {
          const projectId = typeof user.assignedProject === 'object' 
            ? user.assignedProject._id?.toString() 
            : user.assignedProject.toString();
          
          if (projectId && !userProjects.includes(projectId)) {
            userProjects.push(projectId);
          }
        }
        
        if (user.projects && Array.isArray(user.projects)) {
          user.projects.forEach(p => {
            if (typeof p === 'object' && p !== null && p._id) {
              userProjects.push(p._id.toString());
            } else if (p) {
              userProjects.push(p.toString());
            }
          });
        }
        
        filteredNotifications = allNotifications.filter(notification => {
          // Show notifications they created
          if (notification.rawData?.requestedBy === userEmail) {
            return true;
          }
          
          // Show notifications for their projects
          if (notification.type === 'transfer_ready_destination') {
            const matches = userProjects.includes(notification.rawData?.toProjectId?.toString?.());
            return matches;
          }
          
          const sourceId = notification.rawData?.fromProjectId?.toString?.();
          const destId = notification.rawData?.toProjectId?.toString?.();
          const projectId = notification.rawData?.projectId?.toString?.();
          
          return (sourceId && userProjects.includes(sourceId)) ||
                 (destId && userProjects.includes(destId)) ||
                 (projectId && userProjects.includes(projectId));
        });
      }

      // Get user's viewed notifications
      const viewedNotifications = getViewedNotifications(session.user.email);
      
      // Count unread notifications
      const unreadNotifications = filteredNotifications.filter(notification => 
        !viewedNotifications.includes(notification.id)
      );

      setUnreadCount(unreadNotifications.length);
      
    } catch (error) {
      console.error('Error fetching notification count:', error);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }, [session, generateUserSpecificId]);

  useEffect(() => {
    fetchUnreadNotifications();
    
    // Set up global refresh function for socket notifications
    window.refreshNotificationCount = () => {
      fetchUnreadNotifications();
    };
    
    // Listen for socket notifications to refresh count immediately
    if (socket) {
      const handleSocketNotification = (notification) => {
        fetchUnreadNotifications();
      };
      
      socket.on("new-notification", handleSocketNotification);
      
      // Cleanup socket listener
      return () => {
        socket.off("new-notification", handleSocketNotification);
      };
    }
    
    // Listen for localStorage changes to viewed notifications
    const handleStorageChange = (e) => {
      if (e.key && e.key.startsWith('viewedNotifications_')) {
        fetchUnreadNotifications();
      }
    };
    
    // Listen for storage events (changes from other tabs/windows)
    window.addEventListener('storage', handleStorageChange);
    
    // Listen for custom events (changes from same tab)
    const handleCustomStorageChange = () => {
      fetchUnreadNotifications();
    };
    
    window.addEventListener('viewedNotificationsChanged', handleCustomStorageChange);
    
    // Cleanup function
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('viewedNotificationsChanged', handleCustomStorageChange);
      // Clean up global function
      if (window.refreshNotificationCount) {
        delete window.refreshNotificationCount;
      }
    };
  }, [fetchUnreadNotifications, socket]);

  const refresh = useCallback(() => {
    fetchUnreadNotifications();
  }, [fetchUnreadNotifications]);

  return {
    unreadCount,
    loading,
    refresh,
  };
};
