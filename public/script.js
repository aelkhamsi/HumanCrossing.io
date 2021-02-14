
//// Socket & Peer connection ////
var PLAYER_ID;
var gameState;
var game;
var create_players_flag = false;
var add_players_flag = false;
var remove_players_flag = false;

const socket = io('/');
var myPeer = new Peer();

myPeer.on('open', id => {
    PLAYER_ID = id;
    socket.emit('join-room', ROOM_ID, PLAYER_ID);
});

socket.on('init-gamestate', initGameState => {
    gameState = initGameState;
    console.log(gameState);
    create_players_flag = true;

    //// Create Phaser game instance ////
    game = new Phaser.Game({
        type: Phaser.AUTO,
        width: 800,
        height: 600,
        scene: {
            preload: preload,
            create: create,
            update: update
        },
        physics: {
          default: 'arcade',
          arcade: {
            debug: true,
            gravity: { y: 0 }
          }
        }
    });
});


socket.on('add-player', playerState => {
    newPlayers.push(playerState);
    add_players_flag = true;
});


socket.on('remove-player', playerId => {
    oldPlayers.push(playerId);
    remove_players_flag = true;
});

socket.on('player-state', playerState => {
    //updatePlayer(playerState);
    console.log(playerState);
})


//GLOBAL VARIABLES
var players = {};
var newPlayers = []; //queue of players to be added to the game
var oldPlayers = []; //queue of player ids to be removed from the game
var cursors;
var speed = 120;
console.log(ROOM_ID);



function preload()
{
    this.load.image('tileset', 'maps/tileset.png');
    this.load.tilemapTiledJSON('island', 'maps/island.json');
    this.load.atlas('hemadi', 'characters/hemadi.png', 'characters/hemadi.json');
}



function create()
{
    cursors = this.input.keyboard.createCursorKeys();

    //// Map Creation ////
    const map = this.make.tilemap({key: 'island'});
    const tileset = map.addTilesetImage('village', 'tileset');

    const groundLayer = map.createStaticLayer('Ground', tileset);
    const bushesLayer = map.createStaticLayer('Bushes', tileset);
    const collideLayer = map.createStaticLayer('Collide', tileset);
    collideLayer.setCollisionByExclusion([-1]);
    //collisionDebug([groundLayer, bushesLayer, collideLayer], this)


    //// Player Creation & Animation ////
    players[PLAYER_ID] = this.physics.add.sprite(300, 400, 'hemadi', 'walk_down_2.png');

    this.anims.create({
        key: 'walk_down',
        frames: this.anims.generateFrameNames('hemadi', {start: 1, end: 4, prefix: 'walk_down_', suffix: '.png'}),
        repeat: -1,
        frameRate: 8
    });

    this.anims.create({
        key: 'walk_up',
        frames: this.anims.generateFrameNames('hemadi', {start: 1, end: 4, prefix: 'walk_up_', suffix: '.png'}),
        repeat: -1,
        frameRate: 8
    });

    this.anims.create({
        key: 'walk_left',
        frames: this.anims.generateFrameNames('hemadi', {start: 1, end: 4, prefix: 'walk_left_', suffix: '.png'}),
        repeat: -1,
        frameRate: 8
    });

    this.anims.create({
        key: 'walk_right',
        frames: this.anims.generateFrameNames('hemadi', {start: 1, end: 4, prefix: 'walk_right_', suffix: '.png'}),
        repeat: -1,
        frameRate: 8
    });

    players[PLAYER_ID].anims.play('walk_down');
    this.physics.add.collider(players[PLAYER_ID], collideLayer);
    this.cameras.main.startFollow(players[PLAYER_ID], true);
    this.cameras.main.setBackgroundColor(0x50a7e8);
}



function update()
{
  //Creating all players in initialization
  if (create_players_flag) {
    create_players_flag = false;
    createPlayers(this);
  }

  //Add a player
  if (add_players_flag) {
    add_players_flag = false;
    for (let playerState of newPlayers) {
      addPlayer(this, playerState);
    }
  }

  //Remove a player
  if (remove_players_flag) {
    remove_players_flag = false;
    for (let playerId of oldPlayers) {
      removePlayer(this, playerId);
    }
  }

  //Send our player state
  socket.emit('player-state', {
    playerId: PLAYER_ID,
    posX: players[PLAYER_ID].x,
    posY: players[PLAYER_ID].y
  })

  //Control our player
  if (cursors.left.isDown)
  {
      players[PLAYER_ID].anims.play('walk_left', true);
      players[PLAYER_ID].setVelocity(-speed, 0);
  }
  else if (cursors.right.isDown)
  {
      players[PLAYER_ID].anims.play('walk_right', true);
      players[PLAYER_ID].setVelocity(speed, 0);
  }
  else if (cursors.up.isDown)
  {
      players[PLAYER_ID].anims.play('walk_up', true);
      players[PLAYER_ID].setVelocity(0, -speed);
  }
  else if (cursors.down.isDown)
  {
      players[PLAYER_ID].anims.play('walk_down', true);
      players[PLAYER_ID].setVelocity(0, speed);
  }
  else
  {
      var sprite = players[PLAYER_ID].anims.currentAnim.key.split('_');
      sprite.push('2.png');
      players[PLAYER_ID].play(sprite.join('_'));
      players[PLAYER_ID].setVelocity(0, 0);
  }
}


function createPlayers(game) {
  for (let player of gameState.players) {
      const id = player.playerId;
      if (id != PLAYER_ID) {
          if (!(id in players)) { //new player
              players[id] = game.physics.add.sprite(player.posX, player.posY, 'hemadi', 'walk_down_2.png');
          }
      }
  }
}

function addPlayer(game, playerState) {
    const playerId = playerState.playerId;
    players[playerId] = game.physics.add.sprite(playerState.posX, playerState.posY, 'hemadi', 'walk_down_2.png');
}

function removePlayer(game, playerId) {
    players[playerId].destroy();
    delete players[playerId];
    console.log('DESTROY');
}

function collisionDebug(collisionLayers, game)
{
    const debugGraphics = game.add.graphics().setAlpha(0.7)
    collisionLayers.forEach(layer => {
        layer.renderDebug(debugGraphics, {
            tileColor: null,
            collidingTileColor: new Phaser.Display.Color(243, 134, 48, 255),
            faceColor: new Phaser.Display.Color(40, 39, 37, 255)
        })
    });
}



//Check for players who exited the room
// for (let playerId in players) {
//     var active = false;
//     for (let player of gameState.players) {
//         if (player.playerId == playerId) {
//             active = true;
//             break;
//         }
//     }
//     if (!active) {
//         players[playerId].destroy();
//         delete players[playerId]
//     }
// }
