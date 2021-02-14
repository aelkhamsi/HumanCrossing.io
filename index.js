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
    const newPlayer = {
      id: playerId,
      x: 300,
      y: 400
    };
    if (gameStates[roomId]) //if the room already exists
    {
      gameStates[roomId].players.push(newPlayer);
      socket.to(roomId).broadcast.emit('add-player', newPlayer)
    }
    else
    {
      gameStates[roomId] = createGameState(newPlayer);
    }
    socket.emit('init-gamestate', gameStates[roomId]);
    socket.join(roomId);

    //Handling disconnection
    socket.on('disconnect', () => {
      const gameState = gameStates[roomId];
      const players = gameState.players;

      for (let index in players) {
        if (players[index].id == playerId) {
          players.splice(index, 1);
          break;
        }
      }

      socket.to(roomId).broadcast.emit('remove-player', playerId);
    });


    socket.on('player-state', playerState => {  //playerState == {id: ..., x: ..., y: ...}
        for (player of gameStates[roomId].players) {
            if (player.id == playerState.id) {
                player.x = playerState.x;
                player.y = playerState.y;
                break;
            }
        }
        socket.to(roomId).broadcast.emit('player-state', playerState);
    });
  });



});


//auxiliary function
function createGameState(newPlayer) {
  return {
    players: [newPlayer]
  }
}


const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log("server listening on port " + PORT + "...");
})
