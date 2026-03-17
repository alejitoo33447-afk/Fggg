import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  const PORT = 3000;

  // Store game state
  const rooms: Record<string, {
    players: Record<string, any>;
    mapObjects: any[];
  }> = {};

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("join-room", (roomId, userData) => {
      socket.join(roomId);
      if (!rooms[roomId]) {
        rooms[roomId] = { players: {}, mapObjects: [] };
      }
      
      rooms[roomId].players[socket.id] = {
        id: socket.id,
        ...userData,
        position: [0, 2, 0],
        rotation: [0, 0, 0],
        isMoving: false,
        isJumping: false,
        isTalking: false
      };

      // Send current state to the new player
      socket.emit("room-state", rooms[roomId]);
      
      // Notify others
      socket.to(roomId).emit("player-joined", rooms[roomId].players[socket.id]);
    });

    socket.on("update-player", (roomId, data) => {
      if (rooms[roomId] && rooms[roomId].players[socket.id]) {
        rooms[roomId].players[socket.id] = {
          ...rooms[roomId].players[socket.id],
          ...data
        };
        socket.to(roomId).emit("player-updated", rooms[roomId].players[socket.id]);
      }
    });

    socket.on("update-map", (roomId, mapObjects) => {
      if (rooms[roomId]) {
        rooms[roomId].mapObjects = mapObjects;
        socket.to(roomId).emit("map-updated", mapObjects);
      }
    });

    socket.on("voice-data", (roomId, audioData) => {
      // Broadcast voice data to others in the room
      socket.to(roomId).emit("remote-voice", socket.id, audioData);
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
      for (const roomId in rooms) {
        if (rooms[roomId].players[socket.id]) {
          delete rooms[roomId].players[socket.id];
          io.to(roomId).emit("player-left", socket.id);
        }
      }
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
