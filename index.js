const express = require('express');
const app = express();
const server = require('http').createServer(app);
const shortid = require('shortid');
const io = require('socket.io')(server);
// const PlayerState = require('models/PlayerState.js').PlayerState;
// const GameState = require('models/GameState.js').GameState;

var gameStates = {}; //{roomId1: gameState1, roomId2: gameState2, ...}

app.set('view engine', 'ejs');
app.use(express.static('public'));


app.get('/', (req, res) => {
  res.redirect(`/${shortid.generate()}`)
});

app.get('/:roomId', (req, res) => {
  res.render('room', {roomId: req.params.roomId});
})


io.on('connection', socket => {

  socket.on('join-room', (roomId, playerId) => {
    socket.join(roomId);
    if (gameStates[roomId]) //if the room already exists
    {
      gameStates[roomId].players.push({
        playerId: playerId,
        posX: 300,
        posY: 400
      });
      socket.to(roomId).broadcast.emit('gameState', gameStates[roomId])
      socket.emit('init', gameStates[roomId]);
      //io.sockets.in(roomId).emit('gameState', gameStates[roomId]);
    }
    else
    {
      gameStates[roomId] = createGameState(playerId);
      socket.emit('init', gameStates[roomId]);
    }

    //Handling disconnection
    socket.on('disconnect', () => {
      const gameState = gameStates[roomId];
      const players = gameState.players;

      for (let index in players) {
        if (players[index].playerId == playerId) {
          players.splice(index, 1);
          break;
        }
      }

      socket.to(roomId).broadcast.emit('gameState', gameStates[roomId]);
    });
  });



});



function createGameState(playerId) {
  return {
    players: [
      {
        playerId: playerId,
        posX: 300,
        posY: 400
      }
    ]
  }
}


const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log("server listening on port " + PORT + "...");
})
