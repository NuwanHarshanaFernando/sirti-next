export const broadcastNotification = (data) => {
  
  try {
    // Use the global io instance from the server
    if (typeof global !== 'undefined' && global.io) {
      const { type, targetRole, targetUsers, notification } = data;
      
      if (targetRole) {
        const targetRoomName = `role-${targetRole}`;
        
        // Get the room to see how many clients are in it
        const room = global.io.sockets.adapter.rooms.get(targetRoomName);
        
        global.io.to(targetRoomName).emit("new-notification", notification);
      }
      
      if (targetUsers && Array.isArray(targetUsers)) {
        targetUsers.forEach(userId => {
          const userRoomName = `user-${userId}`;
          
          const room = global.io.sockets.adapter.rooms.get(userRoomName);
          
          global.io.to(userRoomName).emit("new-notification", notification);
        });
      }
      
      if (type === 'global') {
        global.io.emit("new-notification", notification);
      }
      
    } else {
      console.warn(" Socket.IO not initialized or not available");
      console.warn("Global object keys:", typeof global !== 'undefined' ? Object.keys(global) : "global not available");
    }
  } catch (error) {
    console.error(" Error broadcasting notification:", error);
  }
};
