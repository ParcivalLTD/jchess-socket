const http = require("http");
const socketIO = require("socket.io");

const server = http.createServer();
const io = socketIO(server, { cors: { origin: "*" } });

const PORT = process.env.PORT || 3000;

let waitingPlayers = [];
let playerRooms = {};

let usernames = new Set();
let ips = new Set();

function userJoinRoom(io, socket) {
  if (usernames.has(socket.username) || ips.has(socket.handshake.address)) {
    socket.emit("error", "Benutzername oder IP-Adresse bereits in Verwendung");
    //return;
  }

  usernames.add(socket.username);
  ips.add(socket.handshake.address);

  let gameMode = socket.gameMode;
  if (!waitingPlayers[gameMode]) {
    waitingPlayers[gameMode] = [];
  }
  waitingPlayers[gameMode].push(socket);

  if (waitingPlayers[gameMode].length < 2) return;

  const player1 = waitingPlayers[gameMode].shift();
  const player2 = waitingPlayers[gameMode].shift();

  const randRoomId = Math.ceil(Math.random() * 10000);
  player1.join(randRoomId);
  player2.join(randRoomId);
  playerRooms[player1.id] = randRoomId;
  playerRooms[player2.id] = randRoomId;
  io.to(randRoomId).emit("startGame", {
    room: randRoomId,
    player1: player1.id,
    player2: player2.id,
    player1Username: player1.username.username,
    player2Username: player2.username.username,
  });
  console.log(`Game started in room ${randRoomId}`);
}

function cancelPlayerSearch(socket) {
  waitingPlayers = waitingPlayers.filter((player) => player !== socket);
}

io.on("connection", async (socket) => {
  console.log("A user connected");
  socket.on("login", (username, gameMode) => {
    socket.username = username;
    socket.gameMode = gameMode;
    userJoinRoom(io, socket);
  });

  socket.on("chatMessage", (message) => {
    const room = playerRooms[socket.id];
    io.to(room).emit("chatMessage", { username: socket.username, message });
  });

  socket.on("playerMove", ({ move, fen }) => {
    const room = playerRooms[socket.id];
    socket.to(room).emit("opponentMove", { move, fen });
    console.log(move, fen, room);
  });

  socket.on("disconnect", () => {
    usernames.delete(socket.username);
    ips.delete(socket.handshake.address);
    console.log("A user disconnected");
    const room = playerRooms[socket.id];
    if (room) {
      socket.to(room).emit("opponentDisconnected", "Your opponent has disconnected. You win!");
    }
    delete playerRooms[socket.id];
    waitingPlayers = waitingPlayers.filter((player) => player !== socket);
  });
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
