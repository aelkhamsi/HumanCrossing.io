
//// Socket & Peer connection ////
var PLAYER_ID;
var gameState;
var game;
var scene;
var create_players_flag = false;

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

    //createPlayers(scene);
});


socket.on('add-player', playerState => {
    addPlayer(scene, playerState);
});


socket.on('remove-player', playerId => {
    removePlayer(playerId);
});

socket.on('player-state', playerState => {
    const id = playerState.id;
    positions[id].x = playerState.x;
    positions[id].y = playerState.y;
})


//GLOBAL VARIABLES
var players = {};
var cursors = {};
var localCursor;
var positions = {};
var speed = 120;
var collideLayer;


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
    players[PLAYER_ID] = this.physics.add.sprite(300, 400, 'hemadi', 'walk_down_2.png');
    localCursor = this.input.keyboard.createCursorKeys();
    positions[PLAYER_ID] = {x: 300, y: 400};


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

    //Control our player
    if (localCursor.left.isDown)
    {
        players[PLAYER_ID].anims.play('walk_left', true);
        players[PLAYER_ID].setVelocity(-speed, 0);
    }
    else if (localCursor.right.isDown)
    {
        players[PLAYER_ID].anims.play('walk_right', true);
        players[PLAYER_ID].setVelocity(speed, 0);
    }
    else if (localCursor.up.isDown)
    {
        players[PLAYER_ID].anims.play('walk_up', true);
        players[PLAYER_ID].setVelocity(0, -speed);
    }
    else if (localCursor.down.isDown)
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

    //Send our player state
    socket.emit('player-state', {
      id: PLAYER_ID,
      x: players[PLAYER_ID].x,
      y: players[PLAYER_ID].y
    })

    //Update the cursors
    //updateCursors(this);

    //Move the characters of other players
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


function createPlayers(scene) {
  for (let player of gameState.players) {
      const id = player.id;
      if (id != PLAYER_ID) {
          if (!(id in players)) { //new player
              players[id] = scene.physics.add.sprite(player.x, player.y, 'hemadi', 'walk_down_2.png');
              players[id].anims.play('walk_down');
              cursors[id] = {right: false, left: false, up: false, down: false};
              positions[id] = {x: player.x, y: player.y};
              scene.physics.add.collider(players[id], collideLayer);
          }
      }
  }
}

function movePlayers(game) {
    // TODO: compare players[id].x with positions[id].x
    //             & players[id].y with positions[id].y
    // for (let id in players) {
    //
    // }
}

function addPlayer(scene, playerState) {
    const id = playerState.id;
    players[id] = scene.physics.add.sprite(playerState.x, playerState.y, 'hemadi', 'walk_down_2.png');
    players[id].anims.play('walk_down');
    cursors[id] = {right: false, left: false, up: false, down: false};
    positions[id] = {x: playerState.x, y: playerState.y};
    scene.physics.add.collider(players[id], collideLayer);
}

function removePlayer(playerId) {
    players[playerId].destroy();
    delete players[playerId];
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
