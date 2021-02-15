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
    const playerCoords = {
        x: 300,
        y: 400
    };

    if (gameStates[roomId]) //if the room already exists
    {
      gameStates[roomId].players[playerId] = playerCoords;
      socket.to(roomId).broadcast.emit('add-player', playerId, playerCoords)
    }
    else //new room
    {
      gameStates[roomId] = {
        players: {}
      };
      gameStates[roomId].players[playerId] = playerCoords;
    }

    socket.emit('init-gamestate', gameStates[roomId]);
    socket.join(roomId);


    //Handling disconnection
    socket.on('disconnect', () => {
      for (let id in gameStates[roomId].players) {
        if (id == playerId) {
          delete gameStates[roomId].players[id];
          break;
        }
      }
      if (isEmpty(gameStates[roomId].players))//empty room
        delete gameStates[roomId];
      else
        socket.to(roomId).broadcast.emit('remove-player', playerId);
    });


    socket.on('player-state', (playerId, playerCoords) => {  //playerCoords == {x: ..., y: ...}
        gameStates[roomId].players[playerId] = playerCoords;
        socket.to(roomId).broadcast.emit('player-state', playerId, playerCoords);
    });
  });



});


//Auxiliary functions
function isEmpty(obj) {
    for(var prop in obj) {
        if(obj.hasOwnProperty(prop))
            return false;
    }
    return true;
}



const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log("server listening on port " + PORT + "...");
})
