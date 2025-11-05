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
        console.error('Hook: Failed to fetch notifications');
        setUnreadCount(0);
        setLoading(false);
        return;
      }
      
      const data = await response.json();
      const notifications = data.notifications || [];
      

      // One-time migration: convert existing base IDs to user-specific IDs
      const existingViewed = getViewedNotifications(session.user.email);
      const migratedViewed = [];
      let migrationHappened = false;
      
      // Check if we have any base IDs that need migration
      const hasBaseIds = existingViewed.some(id => !id.includes('-user-'));
      
      if (hasBaseIds) {
        // Clear the old format entirely to start fresh with user-specific IDs
        localStorage.removeItem(`viewedNotifications_${session.user.email}`);
        migrationHappened = true;
      }

      // Get user's viewed notifications (now cleared if migration happened)
      const viewedNotifications = getViewedNotifications(session.user.email);
      
      // Count unread notifications - generate user-specific IDs for comparison
      const unreadNotifications = notifications.filter(notification => {
        const userSpecificId = generateUserSpecificId(notification.id);
        const isViewed = viewedNotifications.includes(userSpecificId);
        return !isViewed;
      });

      setUnreadCount(unreadNotifications.length);

      
    } catch (error) {
      console.error('Hook: Error fetching notification count:', error);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }, [session?.user, generateUserSpecificId]);

  // Socket listeners for real-time updates
  useEffect(() => {
    if (socket) {
      const handleTransferStatusUpdate = () => {
        fetchUnreadNotifications();
      };

      const handleNewNotification = () => {
        fetchUnreadNotifications();
      };

      const handleNotificationViewed = () => {
        fetchUnreadNotifications();
      };

      socket.on('transferStatusUpdated', handleTransferStatusUpdate);
      socket.on('new-notification', handleNewNotification); // Fix: use hyphenated version
      socket.on('newNotification', handleNewNotification); // Keep both for compatibility
      socket.on('notificationViewed', handleNotificationViewed);

      return () => {
        socket.off('transferStatusUpdated', handleTransferStatusUpdate);
        socket.off('new-notification', handleNewNotification);
        socket.off('newNotification', handleNewNotification);
        socket.off('notificationViewed', handleNotificationViewed);
      };
    }
  }, [socket, fetchUnreadNotifications]);

  // Listen for localStorage changes (when notifications are viewed)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key?.startsWith('viewedNotifications_') && session?.user?.email) {
        fetchUnreadNotifications();
      }
    };

    const handleCustomViewedEvent = (e) => {
      if (e.detail?.userEmail === session?.user?.email) {
        fetchUnreadNotifications();
      }
    };

    const handleNewNotificationEvent = (e) => {
      fetchUnreadNotifications();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('viewedNotificationsChanged', handleCustomViewedEvent);
    window.addEventListener('newNotificationReceived', handleNewNotificationEvent);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('viewedNotificationsChanged', handleCustomViewedEvent);
      window.removeEventListener('newNotificationReceived', handleNewNotificationEvent);
    };
  }, [session?.user?.email, fetchUnreadNotifications]);

  // Initial fetch and periodic refresh
  useEffect(() => {
    fetchUnreadNotifications();
    
    // Refresh every 30 seconds to catch any missed updates
    const interval = setInterval(fetchUnreadNotifications, 30000);
    
    return () => clearInterval(interval);
  }, [fetchUnreadNotifications]);

  const refresh = useCallback(() => {
    fetchUnreadNotifications();
  }, [fetchUnreadNotifications]);

  // Make refresh function available globally for socket context
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.refreshNotificationCount = refresh;
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.refreshNotificationCount = null;
      }
    };
  }, [refresh]);

  return { 
    unreadCount, 
    loading, 
    refresh 
  };
};
