const http = require("http");
const socketIO = require("socket.io");

const server = http.createServer();
const io = socketIO(server, { cors: { origin: "*" } });

const PORT = process.env.PORT || 3000;

let waitingPlayers = [];
let playerRooms = {};

let usernames = new Set();
let ips = new Set();

let waitingPlayersByGamemode = new Map();

function userJoinRoom(io, socket) {
  let waitingPlayers = waitingPlayersByGamemode.get(socket.gamemode);
  if (!waitingPlayers) {
    waitingPlayers = [];
    waitingPlayersByGamemode.set(socket.gamemode, waitingPlayers);
  }

  const player1 = waitingPlayers.find((player) => player !== socket);
  if (!player1) {
    waitingPlayers.push(socket);
    return;
  }

  waitingPlayers = waitingPlayers.filter((player) => player !== player1 && player !== socket);
  waitingPlayersByGamemode.set(socket.gamemode, waitingPlayers);

  const player2 = socket;
  const randRoomId = uuidv4();
  playerRooms[player1.id] = randRoomId;
  playerRooms[player2.id] = randRoomId;
  player1.join(randRoomId);
  player2.join(randRoomId);
  io.to(randRoomId).emit("gameStart", {
    room: randRoomId,
    player1: player1.id,
    player2: player2.id,
    player1Username: player1.username,
    player2Username: player2.username,
  });
  console.log(`Game started in room ${randRoomId}`);
}

function cancelPlayerSearch(socket) {
  let waitingPlayers = waitingPlayersByGamemode.get(socket.gamemode);
  if (waitingPlayers) {
    waitingPlayers = waitingPlayers.filter((player) => player !== socket);
    waitingPlayersByGamemode.set(socket.gamemode, waitingPlayers);
  }
}

io.on("connection", async (socket) => {
  console.log("A user connected");
  socket.on("login", (username, gamemode) => {
    socket.username = username;
    socket.gamemode = gamemode;
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
