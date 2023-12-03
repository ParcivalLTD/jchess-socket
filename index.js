const express = require("express");
const http = require("http");
const socketIO = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketIO(server, { cors: { origin: "*" } });

const PORT = process.env.PORT || 3000;

app.use(express.static("public")); // Assuming your client-side files are in a "public" directory

const games = {};

io.on("connection", (socket) => {
  // Handle player joining the queue
  socket.on("joinQueue", () => {
    let gameId;

    // Check if there's a game waiting for an opponent
    const waitingGame = Object.values(games).find((game) => !game.player2);

    if (waitingGame) {
      gameId = waitingGame.id;
      waitingGame.player2 = socket.id;
      io.to(socket.id).emit("gameFound", { gameId, color: "black" });
      io.to(waitingGame.player1).emit("gameFound", { gameId, color: "white" });
    } else {
      // Create a new game
      gameId = Date.now().toString();
      games[gameId] = { id: gameId, player1: socket.id, player2: null };
      io.to(socket.id).emit("waitingForOpponent", gameId);
    }

    // Join the room for the game
    socket.join(gameId);
  });

  // Handle player moves
  socket.on("playerMove", (move) => {
    const game = Object.values(games).find(
      (g) => g.player1 === socket.id || g.player2 === socket.id
    );

    if (game) {
      const opponentSocketId =
        game.player1 === socket.id ? game.player2 : game.player1;
      io.to(opponentSocketId).emit("opponentMove", move);
    }
  });

  // Handle disconnect
  socket.on("disconnect", () => {
    // Find the game the player is in and inform the opponent
    const game = Object.values(games).find(
      (g) => g.player1 === socket.id || g.player2 === socket.id
    );

    if (game) {
      const opponentSocketId =
        game.player1 === socket.id ? game.player2 : game.player1;
      io.to(opponentSocketId).emit("opponentLeft");
      delete games[game.id];
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
