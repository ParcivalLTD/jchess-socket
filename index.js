const http = require("http");
const socketIO = require("socket.io");

const server = http.createServer();
const io = socketIO(server, { cors: { origin: "*" } });

const PORT = process.env.PORT || 3000;

let waitingPlayers = [];

function userJoinRoom(io, socket) {
  waitingPlayers.push(socket);
  if (waitingPlayers.length < 2) return;
  // remove player from watingPlayers list
  const player1 = waitingPlayers.shift();
  const player2 = waitingPlayers.shift();
  const randRoomId = Math.ceil(Math.random() * 10000);
  player1.join(randRoomId);
  player2.join(randRoomId);
  io.to(randRoomId).emit("startGame", { room: randRoomId });
  console.log(`Game started in room ${randRoomId}`);
}

io.on("connection", async (socket) => {
  console.log("A user connected");
  userJoinRoom(io, socket);

  socket.on("playerMove", ({ move, room }) => {
    // Broadcast the move to the opponent in the same room
    socket.to(room).emit("opponentMove", move);
    console.log("move emit");
  });

  socket.on("disconnect", () => {
    console.log("A user disconnected");
    // Remove the player from the waiting list if they were in the queue
    waitingPlayers = waitingPlayers.filter((player) => player !== socket);
  });
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
