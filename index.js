const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const Chess = require("chess");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: "*" } });

app.use(express.static("public")); // Assuming your client-side code is in a folder named "public"

const games = {};
let waitingPlayer = null;

io.on("connection", (socket) => {
  socket.on("joinQueue", () => {
    if (waitingPlayer) {
      const gameKey = `${waitingPlayer.id}-${socket.id}`;
      games[gameKey] = new Chess();
      io.to(waitingPlayer.id).emit("startGame", gameKey, "white");
      io.to(socket.id).emit("startGame", gameKey, "black");
      waitingPlayer = null;
    } else {
      waitingPlayer = { id: socket.id };
    }
  });

  socket.on("playerMove", (gameKey, move) => {
    if (games[gameKey]) {
      // Validate the move here if needed
      // Update the game state
      games[gameKey].move(move);
      // Broadcast the move to the opponent
      const opponentId = Object.keys(socket.rooms).find(
        (id) => id !== socket.id
      );
      io.to(opponentId).emit("opponentMove", move);
    }
  });

  socket.on("disconnect", () => {
    if (waitingPlayer && waitingPlayer.id === socket.id) {
      waitingPlayer = null;
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
