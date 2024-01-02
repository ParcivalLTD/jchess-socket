const http = require("http");
const socketIO = require("socket.io");

const server = http.createServer();
const io = socketIO(server, { cors: { origin: "*" } });

const PORT = process.env.PORT || 3000;

let waitingPlayers = [];
let playerRooms = {};

let usernames = new Set();
let ips = new Set();

let tokenGameModes = {};

let tokenRooms = {};

function userJoinRoom(io, socket) {
  if (socket.token && tokenRooms[socket.token]) {
    // Wenn es bereits einen Raum für dieses Token gibt, lassen Sie den Benutzer diesem Raum beitreten
    socket.join(tokenRooms[socket.token]);
    console.log(socket.username + " joined room " + tokenRooms[socket.token]);
  } else {
    // Wenn es keinen Raum für dieses Token gibt, erstellen Sie einen neuen Raum und lassen Sie den Benutzer diesem Raum beitreten
    if (!waitingPlayers[socket.gamemode]) {
      waitingPlayers[socket.gamemode] = [];
    }
    waitingPlayers[socket.gamemode].push(socket);
    if (waitingPlayers[socket.gamemode].length < 2) return;
    joinRoom(io, socket);
  }
}

function joinRoom(io, socket) {
  if (waitingPlayers[socket.gamemode] && waitingPlayers[socket.gamemode].length >= 2) {
    const player1 = waitingPlayers[socket.gamemode].shift();
    const player2 = waitingPlayers[socket.gamemode].shift();
    const randRoomId = Math.ceil(Math.random() * 10000);
    player1.join(randRoomId);
    player2.join(randRoomId);
    playerRooms[player1.id] = randRoomId;
    playerRooms[player2.id] = randRoomId;
    // Speichern Sie die Zuordnung von Token zu Raum
    if (player1.token) {
      tokenRooms[player1.token] = randRoomId;
    }
    if (player2.token) {
      tokenRooms[player2.token] = randRoomId;
    }
    io.to(randRoomId).emit("startGame", {
      room: randRoomId,
      player1: player1.id,
      player2: player2.id,
      player1Username: player1.username,
      player2Username: player2.username,
    });
    console.log(`Game started in room ${randRoomId}`);
  }
}

function cancelPlayerSearch(socket) {
  if (waitingPlayers[socket.gamemode]) {
    waitingPlayers[socket.gamemode] = waitingPlayers[socket.gamemode].filter((player) => player !== socket);
  }
}

io.on("connection", async (socket) => {
  socket.on("login", (username, gamemode, token) => {
    socket.username = username;
    socket.gamemode = gamemode;
    console.log(`User ${username} (${gamemode}) logged in`);

    if (token) {
      socket.token = token;
      if (tokenGameModes[token] && tokenGameModes[token] !== gamemode) {
        socket.gamemode = tokenGameModes[token];
        socket.emit("gamemode", socket.gamemode);
      } else {
        tokenGameModes[token] = gamemode;
      }
    }

    if (!token || (token && tokenGameModes[token] === gamemode)) {
      userJoinRoom(io, socket);
      console.log(username + " joined room");
    }
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
    if (socket.username) {
      usernames.delete(socket.username);
      console.log(socket.username + " disconnected");
    } else {
      console.log("A user disconnected without a username");
    }
    ips.delete(socket.handshake.address);
    const room = playerRooms[socket.id];
    if (room) {
      socket.to(room).emit("opponentDisconnected", "Your opponent has disconnected. You win!");
    }
    delete playerRooms[socket.id];
    waitingPlayers = waitingPlayers.filter((player) => player !== socket);
  });

  socket.on("ding", () => {
    socket.emit("ding");
  });
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
