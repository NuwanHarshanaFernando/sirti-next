"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { io } from "socket.io-client";
import { toast } from "sonner";

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const { data: session } = useSession();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (session?.user) {
      const socketUrl = process.env.NODE_ENV === 'production' 
        ? window.location.origin  
        : (process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000'); 
      const socketInstance = io(socketUrl, {
        path: "/socket.io",
        transports: ['polling', 'websocket'],
        upgrade: true,
        timeout: 20000,
        forceNew: true,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
        autoConnect: true
      });

      socketInstance.on("connect", () => {
        setIsConnected(true);
        
        const joinData = {
          userId: session.user.id || session.user.email,
          userRole: session.user.role,
          userEmail: session.user.email
        };
        
        socketInstance.emit("join-user", joinData);
      });

      socketInstance.on("joined-rooms", ({ userRoom, roleRoom }) => {
      });

      socketInstance.on("connect_error", (error) => {
        console.error("❌ Socket connection error:", error);
        setIsConnected(false);
      });

      socketInstance.on("disconnect", (reason) => {
        setIsConnected(false);
      });

      socketInstance.on("new-notification", (notification) => {
        
        if (notification.message !== "New Stock Transfer Request") {
          toast.info(notification.message, {
            description: notification.description,
            duration: 5000,
            action: notification.actionUrl ? {
              label: "View",
              onClick: () => window.location.href = notification.actionUrl
            } : undefined
          });
        }

        if (typeof window !== 'undefined' && window.refreshNotificationCount) {
          window.refreshNotificationCount();
        }

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('newNotificationReceived', {
            detail: notification
          }));
        }
      });

      setSocket(socketInstance);

      return () => {
        socketInstance.disconnect();
      };
    }
  }, [session]);

  const broadcastNotification = (notificationData) => {
    if (socket && isConnected) {
      socket.emit("broadcast-notification", notificationData);
    }
  };

  return (
    <SocketContext.Provider value={{
      socket,
      isConnected,
      broadcastNotification
    }}>
      {children}
    </SocketContext.Provider>
  );
};
