const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const { Server } = require("socket.io");

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "localhost";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

let io;

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error("Error occurred handling", req.url, err);
      res.statusCode = 500;
      res.end("internal server error");
    }
  });

  io = new Server(server, {
    path: "/socket.io",
    cors: {
      origin: dev 
        ? ["http://localhost:3000", "http://localhost:3001"] 
        : [
            process.env.NEXTAUTH_URL,
            process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
            process.env.PRODUCTION_URL
          ].filter(Boolean),
      methods: ["GET", "POST"],
      credentials: true,
      allowedHeaders: ["Content-Type", "Authorization"]
    },
    allowEIO3: true,
    transports: ['polling', 'websocket']
  });

  io.on("connection", (socket) => {
    
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


  });

  global.io = io;

  server
    .once("error", (err) => {
      console.error("Server error:", err);
      process.exit(1);
    })
    .listen(port, () => {
    
    });
});

process.on("SIGTERM", () => {
  if (io) {
    io.close();
  }
  process.exit(0);
});

process.on("SIGINT", () => {
  if (io) {
    io.close();
  }
  process.exit(0);
});
