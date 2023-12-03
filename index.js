const express = require("express");
const http = require("http");
const socketIO = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketIO(server, { cors: { origin: "*" } });

const PORT = process.env.PORT || 3000;

app.use(express.static(__dirname + "/public"));

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

const rooms = {};
let waitingPlayer = null;

io.on("connection", (socket) => {
  socket.on("queue", () => {
    if (waitingPlayer) {
      const room = socket.id + "-" + waitingPlayer.id;
      socket.join(room);
      waitingPlayer.join(room);
      io.to(room).emit("startGame");
      waitingPlayer = null;
    } else {
      waitingPlayer = socket;
    }
  });

  socket.on("playerMove", (move) => {
    socket.to(socket.room).emit("opponentMove", move);
  });

  socket.on("disconnect", () => {
    if (waitingPlayer && waitingPlayer.id === socket.id) {
      waitingPlayer = null;
    } else {
      io.to(socket.room).emit("opponentLeft");
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
