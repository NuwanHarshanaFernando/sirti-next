import { NextRequest, NextResponse } from "next/server";
import { Server } from "socket.io";

let io;

function initializeSocket(httpServer) {
  if (!io) {
    io = new Server(httpServer, {
      path: "/api/socket",
      addTrailingSlash: false,
      cors: {
        origin: process.env.NODE_ENV === "production" 
          ? [
              process.env.NEXTAUTH_URL,
              process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
              process.env.PRODUCTION_URL
            ].filter(Boolean)
          : ["http://localhost:3000", "http://localhost:3001"],
        methods: ["GET", "POST"],
        credentials: true
      }
    });

    io.on("connection", (socket) => {
      console.log(" Client connected:", socket.id);
      
      socket.on("join-user", ({ userId, userRole, userEmail }) => {
        const userRoom = `user-${userId}`;
        const roleRoom = `role-${userRole}`;
        
        socket.join(userRoom);
        socket.join(roleRoom);
        
        socket.emit("joined-rooms", { userRoom, roleRoom });
      });

      socket.on("broadcast-notification", (data) => {
        
        const { type, targetRole, targetUsers, notification } = data;
        
        if (targetRole) {
          const targetRoomName = `role-${targetRole}`;
          const room = io.sockets.adapter.rooms.get(targetRoomName);
          io.to(targetRoomName).emit("new-notification", notification);
        }
        
        if (targetUsers && Array.isArray(targetUsers)) {
          targetUsers.forEach(userId => {
            const userRoomName = `user-${userId}`;
            const room = io.sockets.adapter.rooms.get(userRoomName);
            io.to(userRoomName).emit("new-notification", notification);
          });
        }
        
        if (type === 'global') {
          io.emit("new-notification", notification);
        }
      });

      socket.on("disconnect", (reason) => {
        console.log(" Client disconnected:", socket.id, "Reason:", reason);
      });
    });

    global.io = io;
  }
  
  return io;
}

export async function GET(req) {
  try {
    // Initialize socket if not already done
    if (req.server) {
      initializeSocket(req.server);
    }
    
    return NextResponse.json({ 
      message: "Socket.IO endpoint ready",
      status: io ? "initialized" : "pending"
    });
  } catch (error) {
    console.error("Socket.IO initialization error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  return GET(req);
}
