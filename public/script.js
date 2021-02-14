

//GLOBAL VARIABLES
var gameState;
var scene;
var PLAYER_ID; // Our ID
var create_players_flag = false;

var players = {};  // sprites representing the other characters
var localPlayer; // sprite of our character

var cursors = {};  // cursors (arrow keys) of the other players
var localCursor; // Our cursor

var positions = {};  // positions of the other players
//we don't need to store our position globally

var speed = 120;
var collideLayer;


//// Socket & Peer connection ////
const socket = io('/');
var myPeer = new Peer();

myPeer.on('open', id => { //The connection to a peer server gives each player a unique ID
    PLAYER_ID = id;
    socket.emit('join-room', ROOM_ID, PLAYER_ID);
});

socket.on('init-gamestate', initGameState => {
    gameState = initGameState;
    console.log(gameState);
    create_players_flag = true;

    //// Create Phaser game instance ////
    var game = new Phaser.Game({
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
    addPlayer(scene, playerState);
});


socket.on('remove-player', playerId => {
    removePlayer(playerId);
});

socket.on('player-state', playerState => { //Update the positions of a player
    const id = playerState.id;
    positions[id].x = playerState.x;
    positions[id].y = playerState.y;
})



//////////////////////////////////////
/// Functions for the Phaser scene ///
//////////////////////////////////////

function preload()
{
    this.load.image('tileset', 'maps/tileset.png');
    this.load.tilemapTiledJSON('island', 'maps/island.json');
    this.load.atlas('hemadi', 'characters/hemadi.png', 'characters/hemadi.json');
}



function create()
{
    scene = this;

    //// Map Creation ////
    const map = this.make.tilemap({key: 'island'});
    const tileset = map.addTilesetImage('village', 'tileset');

    const groundLayer = map.createStaticLayer('Ground', tileset);
    const bushesLayer = map.createStaticLayer('Bushes', tileset);
    collideLayer = map.createStaticLayer('Collide', tileset);
    collideLayer.setCollisionByExclusion([-1]);
    //collisionDebug([groundLayer, bushesLayer, collideLayer], this)


    //// Player Creation & Animation ////
    localPlayer = this.physics.add.sprite(300, 400, 'hemadi', 'walk_down_2.png');
    localCursor = this.input.keyboard.createCursorKeys();


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

    localPlayer.anims.play('walk_down');
    this.physics.add.collider(localPlayer, collideLayer);
    this.cameras.main.startFollow(localPlayer, true);
    this.cameras.main.setBackgroundColor(0x50a7e8);
}



function update()
{
    //Creating all players in initialization
    if (create_players_flag) {
      create_players_flag = false;
      createPlayers(this);
    }

    //Move our player
    if (localCursor.left.isDown)
    {
        localPlayer.anims.play('walk_left', true);
        localPlayer.setVelocity(-speed, 0);
    }
    else if (localCursor.right.isDown)
    {
        localPlayer.anims.play('walk_right', true);
        localPlayer.setVelocity(speed, 0);
    }
    else if (localCursor.up.isDown)
    {
        localPlayer.anims.play('walk_up', true);
        localPlayer.setVelocity(0, -speed);
    }
    else if (localCursor.down.isDown)
    {
        localPlayer.anims.play('walk_down', true);
        localPlayer.setVelocity(0, speed);
    }
    else
    {
        var sprite = localPlayer.anims.currentAnim.key.split('_');
        sprite.push('2.png');
        localPlayer.play(sprite.join('_'));
        localPlayer.setVelocity(0, 0);
    }

    //Broadcast our player state
    socket.emit('player-state', {
      id: PLAYER_ID,
      x: localPlayer.x,
      y: localPlayer.y
    })

    //Update the cursors of the other players
    updateCursors(this);

    //Move the characters of other players
    movePlayers();
}


/*  When we join a room, the server sends a gameState containing all the players in the room
    This function creates an instance of these players locally
*/
function createPlayers(scene) {
  for (let player of gameState.players) {
      const id = player.id;
      if (id != PLAYER_ID) {
          if (!(id in players)) { //new player
              cursors[id] = {right: false, left: false, up: false, down: false};
              positions[id] = {x: player.x, y: player.y};
              players[id] = scene.physics.add.sprite(player.x, player.y, 'hemadi', 'walk_down_2.png');
              players[id].anims.play('walk_down');
              scene.physics.add.collider(players[id], collideLayer);
          }
      }
  }
}


/*  Add a player that have just joined the room
*/
function addPlayer(scene, playerState) {
    const id = playerState.id;
    cursors[id] = {right: false, left: false, up: false, down: false};
    positions[id] = {x: playerState.x, y: playerState.y};
    players[id] = scene.physics.add.sprite(playerState.x, playerState.y, 'hemadi', 'walk_down_2.png');
    players[id].anims.play('walk_down');
    scene.physics.add.collider(players[id], collideLayer);
}


/*  Remove a player that have just exited the room
*/
function removePlayer(playerId) {
    players[playerId].destroy();
    delete players[playerId];
}


/*  On each frame, the other players send their updated positions.
    If the updated position for a player is different from the local position,
  we activate the cursors (arrow keys) corresponding to this player to be able to move
  his character later
*/
function updateCursors(game) {
    for (let id in players) {
        if (players[id].x > positions[id].x) {
            cursors[id].left = true;
        }
        else if (players[id].x < positions[id].x) {
            cursors[id].right = true;
        }
        else {
            cursors[id].left = false;
            cursors[id].right = false;
        }

        if (players[id].y > positions[id].y) {
            cursors[id].up = true;
        }
        else if (players[id].y < positions[id].y) {
            cursors[id].down = true;
        }
        else {
            cursors[id].up = false;
            cursors[id].down = false;
        }
    }
}


/* Based on the cursors state of each player,
  we move the character corresponding to this player
*/
function movePlayers() {
    for (let id in players) {
      if (id != PLAYER_ID) {
        if (cursors[id].left)
        {
          players[id].anims.play('walk_left', true);
          players[id].setVelocity(-speed, 0);
        }
        else if (cursors[id].right)
        {
          players[id].anims.play('walk_right', true);
          players[id].setVelocity(speed, 0);
        }
        else if (cursors[id].up)
        {
          players[id].anims.play('walk_up', true);
          players[id].setVelocity(0, -speed);
        }
        else if (cursors[id].down)
        {
          players[id].anims.play('walk_down', true);
          players[id].setVelocity(0, speed);
        }
        else
        {
          var sprite = players[id].anims.currentAnim.key.split('_');
          sprite.push('2.png');
          players[id].play(sprite.join('_'));
          players[id].setVelocity(0, 0);
        }
      }
    }
}

//dev
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
