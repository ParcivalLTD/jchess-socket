// app.js
const express = require("express");
const http = require("http");
const socketIO = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

app.use(express.static(__dirname + "/public"));

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

const rooms = {};

io.on("connection", (socket) => {
  socket.on("createRoom", (roomName) => {
    rooms[roomName] = { players: [socket.id], board: initialBoard() };
    socket.join(roomName);
    io.to(roomName).emit("updateGame", rooms[roomName].board);
  });

  socket.on("joinRoom", (roomName) => {
    if (rooms[roomName] && rooms[roomName].players.length < 2) {
      rooms[roomName].players.push(socket.id);
      socket.join(roomName);
      io.to(roomName).emit("updateGame", rooms[roomName].board);
    } else {
      socket.emit("errorMessage", "Room is full or does not exist");
    }
  });

  socket.on("move", ({ roomName, from, to }) => {
    // Add chess logic to validate the move
    // Update the board and broadcast the updated board to all players in the room
    io.to(roomName).emit("updateGame", rooms[roomName].board);
  });

  socket.on("disconnect", () => {
    for (const roomName in rooms) {
      const index = rooms[roomName].players.indexOf(socket.id);
      if (index !== -1) {
        rooms[roomName].players.splice(index, 1);
        io.to(roomName).emit("playerLeft", socket.id);
        if (rooms[roomName].players.length === 0) {
          delete rooms[roomName];
        }
      }
    }
  });
});

function initialBoard() {
  // Implement your initial chess board state
  // Return the initial board state
}

const port = process.env.PORT || 3000;

server.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
