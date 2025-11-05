import { Server } from "socket.io";

// This needs to be stored globally in the Next.js app
let io;

// Initialize socket.io with the HTTP server
export const initSocket = (httpServer) => {
  if (!io) {
    io = new Server(httpServer, {
      path: "/api/socket",
      addTrailingSlash: false,
      cors: {
        origin: process.env.NODE_ENV === "production" 
          ? process.env.NEXTAUTH_URL 
          : "http://localhost:3001",
        methods: ["GET", "POST"]
      }
    });

    io.on("connection", (socket) => {
      console.log("Client connected:", socket.id);
      
      socket.on("join-user", ({ userId, userRole, userEmail }) => {
        const userRoom = `user-${userId}`;
        const roleRoom = `role-${userRole}`;
        
        socket.join(userRoom);
        socket.join(roleRoom);
        
      });

      socket.on("broadcast-notification", (data) => {
        
        const { type, targetRole, targetUsers, notification } = data;
        
        if (targetRole) {
          socket.to(`role-${targetRole}`).emit("new-notification", notification);
        }
        
        if (targetUsers && Array.isArray(targetUsers)) {
          targetUsers.forEach(userId => {
            socket.to(`user-${userId}`).emit("new-notification", notification);
          });
        }
        
        if (type === 'global') {
          socket.broadcast.emit("new-notification", notification);
        }
      });

      socket.on("disconnect", () => {
        console.log("Client disconnected:", socket.id);
      });
    });
  }
  
  return io;
};

// Get the existing socket instance
export const getSocket = () => io;

// Emit notification to connected clients
export const emitNotification = (data) => {
  if (!io) {
    console.warn("Socket.IO not initialized");
    return;
  }
  
  const { type, targetRole, targetUsers, notification } = data;
  
  
  if (targetRole) {
    io.to(`role-${targetRole}`).emit("new-notification", notification);
  }
  
  if (targetUsers && Array.isArray(targetUsers)) {
    targetUsers.forEach(userId => {
      io.to(`user-${userId}`).emit("new-notification", notification);
    });
  }
  
  if (type === 'global') {
    io.emit("new-notification", notification);
  }
};
