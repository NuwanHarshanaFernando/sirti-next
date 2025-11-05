"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { getViewedNotifications } from "@/lib/notification-utils";
import { useSocket } from "@/contexts/SocketContext";

export const useNotificationCount = () => {
  const { data: session } = useSession();
  const { socket } = useSocket();
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchNotificationCount = useCallback(async () => {
    if (!session?.user?.email) {
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Use the unified notifications API
      const response = await fetch('/api/notifications?limit=100');
      
      if (!response.ok) {
        console.error("Failed to fetch notifications:", response.status);
        setUnreadCount(0);
        setLoading(false);
        return;
      }

      const data = await response.json();
      const notifications = data.notifications || [];
      

      // Get viewed notifications from localStorage
      const viewedNotifications = getViewedNotifications(session.user.email);

      // Count unread notifications
      const unreadNotifications = notifications.filter(notification => 
        !viewedNotifications.includes(notification.id)
      );

      const count = unreadNotifications.length;


      setUnreadCount(count);
    } catch (error) {
      console.error('🔔 Error fetching notification count:', error);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }, [session?.user?.email]);

  // Initial fetch on mount and when session changes
  useEffect(() => {
    fetchNotificationCount();
  }, [session?.user?.email, fetchNotificationCount]);

  // Listen for socket events to refresh count
  useEffect(() => {
    if (!socket) return;

    const handleNotificationUpdate = () => {
      fetchNotificationCount();
    };

    socket.on('notification_update', handleNotificationUpdate);
    socket.on('transfer_status_update', handleNotificationUpdate);
    socket.on('stock_adjustment_update', handleNotificationUpdate);

    return () => {
      socket.off('notification_update', handleNotificationUpdate);
      socket.off('transfer_status_update', handleNotificationUpdate);
      socket.off('stock_adjustment_update', handleNotificationUpdate);
    };
  }, [socket, fetchNotificationCount]);

  return {
    unreadCount,
    loading,
    refresh: fetchNotificationCount
  };
};
