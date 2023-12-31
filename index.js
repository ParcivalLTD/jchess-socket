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
    return;
  }

  usernames.add(socket.username);
  ips.add(socket.handshake.address);

  const playersWithSameGamemode = waitingPlayers.filter((player) => player.gamemode === socket.gamemode);

  if (playersWithSameGamemode.length >= 1) {
    const opponent = playersWithSameGamemode.shift();
    const randRoomId = Math.ceil(Math.random() * 10000);
    opponent.join(randRoomId);
    socket.join(randRoomId);
    playerRooms[opponent.id] = randRoomId;
    playerRooms[socket.id] = randRoomId;
    io.to(randRoomId).emit("startGame", {
      room: randRoomId,
      player1: opponent.id,
      player2: socket.id,
      player1Username: opponent.username,
      player2Username: socket.username,
    });
    console.log(`Game started in room ${randRoomId}`);
  } else {
    waitingPlayers.push(socket);
  }
}

function cancelPlayerSearch(socket) {
  waitingPlayers = waitingPlayers.filter((player) => player !== socket);
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
