
//create an instance of a Phaser game Object
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
})

//GLOBAL VARIABLES
var player;
var cursors;
var speed = 120;



function preload()
{
    this.load.image('tileset', 'maps/tileset.png');
    this.load.tilemapTiledJSON('island', 'maps/island.json');
    this.load.atlas('daunte', 'characters/daunte.png', 'characters/daunte.json');
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
    player = this.physics.add.sprite(300, 400, 'daunte', 'walk_down_2.png');

    this.anims.create({
        key: 'walk_down',
        frames: this.anims.generateFrameNames('daunte', {start: 1, end: 4, prefix: 'walk_down_', suffix: '.png'}),
        repeat: -1,
        frameRate: 5
    });

    this.anims.create({
        key: 'walk_up',
        frames: this.anims.generateFrameNames('daunte', {start: 1, end: 4, prefix: 'walk_up_', suffix: '.png'}),
        repeat: -1,
        frameRate: 5
    });

    this.anims.create({
        key: 'walk_left',
        frames: this.anims.generateFrameNames('daunte', {start: 1, end: 4, prefix: 'walk_left_', suffix: '.png'}),
        repeat: -1,
        frameRate: 5
    });

    this.anims.create({
        key: 'walk_right',
        frames: this.anims.generateFrameNames('daunte', {start: 1, end: 4, prefix: 'walk_right_', suffix: '.png'}),
        repeat: -1,
        frameRate: 5
    });

    player.anims.play('walk_down');
    this.physics.add.collider(player, collideLayer);
    this.cameras.main.startFollow(player, true);
    this.cameras.main.setBackgroundColor(0x50a7e8);
}



function update()
{
  if (cursors.left.isDown)
  {
      player.anims.play('walk_left', true);
      player.setVelocity(-speed, 0);
  }
  else if (cursors.right.isDown)
  {
      player.anims.play('walk_right', true);
      player.setVelocity(speed, 0);
  }
  else if (cursors.up.isDown)
  {
      player.anims.play('walk_up', true);
      player.setVelocity(0, -speed);
  }
  else if (cursors.down.isDown)
  {
      player.anims.play('walk_down', true);
      player.setVelocity(0, speed);
  }
  else
  {
      var sprite = player.anims.currentAnim.key.split('_');
      sprite.push('2.png');
      player.play(sprite.join('_'));
      player.setVelocity(0, 0);
  }
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
