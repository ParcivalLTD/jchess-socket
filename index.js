// server.js
const express = require("express");
const http = require("http");
const socketIO = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketIO(server, { cors: { origin: "*" } });

app.use(express.static("public"));

const PORT = process.env.PORT || 3000;

// Array to store players waiting for a match
let waitingPlayers = [];

io.on("connection", (socket) => {
  console.log("A user connected");

  // Handle player joining the queue
  socket.on("joinQueue", () => {
    waitingPlayers.push(socket);

    // Check if there are enough players to start a game
    if (waitingPlayers.length >= 2) {
      // Pair up the first two players and remove them from the waiting list
      const player1 = waitingPlayers.shift();
      const player2 = waitingPlayers.shift();

      // Create a unique room ID
      const roomId = `room-${Math.random().toString(36).substr(2, 9)}`;

      // Join players to the room
      player1.join(roomId);
      player2.join(roomId);

      // Notify players that the game is starting
      io.to(roomId).emit("startGame", { room: roomId });

      console.log(`Game started in room ${roomId}`);
    }
  });

  // Handle player move
  socket.on("playerMove", (move) => {
    // Broadcast the move to the opponent in the same room
    socket.to(move.room).emit("opponentMove", move);
  });

  // Handle disconnect
  socket.on("disconnect", () => {
    console.log("A user disconnected");

    // Remove the player from the waiting list if they were in the queue
    waitingPlayers = waitingPlayers.filter((player) => player !== socket);
  });
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
