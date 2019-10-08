import { Component } from '@angular/core';
import { MenuController } from '@ionic/angular';


declare let Phaser;

let that;
let game;
let player;
let aliens;
let bullets;
let bulletTime = 0;
let cursors;
const mobileCursors = {
  left: false,
  right: false
};


let fireButton;
let mobileFireButton = false;
let explosions;
let starfield;
let score = 0;
let scoreString = '';
let scoreText;
let lives;
let enemyBullets;
let firingTimer = 0;
let stateText;
const livingEnemies = [];

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
})
export class HomePage {

  constructor(private menuCtrl: MenuController) {
    game = new Phaser.Game(window.innerWidth, window.innerHeight, Phaser.AUTO, 'space-invaders',
      { preload: this.preload, create: this.create, update: this.update, render: this.render });

    that = Object.create(this.constructor.prototype);
  }
  ionViewDidEnter() {
    this.menuCtrl.enable(false, 'start');
    this.menuCtrl.enable(false, 'end');
  }

  preload() {
    game.load.image('bullet', 'assets/phaser/bullet.png');
    game.load.image('enemyBullet', 'assets/phaser/enemy-bullet.png');
    game.load.spritesheet('invader', 'assets/phaser/invader32x32x4.png', 32, 32);
    game.load.image('ship', 'assets/phaser/player.png');
    game.load.spritesheet('kaboom', 'assets/phaser/explode.png', 128, 128);
    game.load.image('starfield', 'assets/phaser/starfield.png');
    game.load.image('background', 'assets/phaser/background2.png');

  }

  create() {
    game.physics.startSystem(Phaser.Physics.ARCADE);

    // The scrolling starfield background
    starfield = game.add.tileSprite(0, 0, window.innerWidth, window.innerHeight, 'starfield');

    //  Our bullet group
    bullets = game.add.group();
    bullets.enableBody = true;
    bullets.physicsBodyType = Phaser.Physics.ARCADE;
    bullets.createMultiple(30, 'bullet');
    bullets.setAll('anchor.x', 0.5);
    bullets.setAll('anchor.y', 1);
    bullets.setAll('outOfBoundsKill', true);
    bullets.setAll('checkWorldBounds', true);
    // The enemy's bullets
    enemyBullets = game.add.group();
    enemyBullets.enableBody = true;
    enemyBullets.physicsBodyType = Phaser.Physics.ARCADE;
    enemyBullets.createMultiple(30, 'enemyBullet');
    enemyBullets.setAll('anchor.x', 0.5);
    enemyBullets.setAll('anchor.y', 1);
    enemyBullets.setAll('outOfBoundsKill', true);
    enemyBullets.setAll('checkWorldBounds', true);

    //  The hero!
    player = game.add.sprite(window.innerWidth / 2, window.innerHeight - 100, 'ship');
    player.anchor.setTo(0.5, 0.5);
    game.physics.enable(player, Phaser.Physics.ARCADE);

    //  The baddies!
    aliens = game.add.group();
    aliens.enableBody = true;
    aliens.physicsBodyType = Phaser.Physics.ARCADE;

    that.createAliens();

    //  The score
    scoreString = 'Score : ';
    scoreText = game.add.text(10, 10, scoreString + score, { font: '24px Arial', fill: '#fff' });

    //  Lives
    lives = game.add.group();
    game.add.text(game.world.width - 100, 10, 'Lives : ', { font: '24px Arial', fill: '#fff' });

    //  Text
    stateText = game.add.text(game.world.centerX, game.world.centerY, ' ', { font: '34px Arial', fill: '#fff' });
    stateText.anchor.setTo(0.5, 0.5);
    stateText.visible = false;

    for (let i = 0; i < 3; i++) {
      const ship = lives.create(game.world.width - 100 + (30 * i), 60, 'ship');
      ship.anchor.setTo(0.5, 0.5);
      ship.angle = 90;
      ship.alpha = 0.4;
    }

    //  An explosion pool
    explosions = game.add.group();
    explosions.createMultiple(30, 'kaboom');
    explosions.forEach(that.setupInvader, this);

    //  And some controls to play the game with
    // Useful if your game is web-based, where player can use a keyboard
    cursors = game.input.keyboard.createCursorKeys();
    fireButton = game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR);

  }

  createAliens() {

    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 8; x++) {
        const alien = aliens.create(x * ((window.innerWidth - 100) / 8), y * 50, 'invader');
        alien.anchor.setTo(0.5, 0.5);
        alien.animations.add('fly', [0, 1, 2, 3], 20, true);
        alien.play('fly');
        alien.body.moves = false;
      }
    }

    aliens.x = 10;
    aliens.y = 50;

    //  All this does is basically start the invaders moving.
    // Notice we're moving the Group they belong to, rather than the invaders directly.
    const tween = game.add.tween(aliens).to({ x: 90 }, 2000, Phaser.Easing.Linear.None, true, 0, 1000, true);

    //  When the tween loops it calls descend
    tween.onLoop.add(that.descend, this);
  }

  setupInvader(invader) {

    invader.anchor.x = 0.5;
    invader.anchor.y = 0.5;
    invader.animations.add('kaboom');

  }

  descend() {
    aliens.y += 10;
  }

  update() {
    //  Scroll the background
    starfield.tilePosition.y += 2;
    if (player.alive) {
      //  Reset the player, then check for movement keys
      player.body.velocity.setTo(0, 0);
      if (cursors.left.isDown || mobileCursors.left) {
        player.body.velocity.x = -200;
      } else if (cursors.right.isDown || mobileCursors.right) {
        player.body.velocity.x = 200;
      }

      //  Firing?
      if (fireButton.isDown || mobileFireButton) {
        that.fireBullet();
      }

      if (game.time.now > firingTimer) {
        that.enemyFires();
      }

      //  Run collision
      game.physics.arcade.overlap(bullets, aliens, that.collisionHandler, null, this);
      game.physics.arcade.overlap(enemyBullets, player, that.enemyHitsPlayer, null, this);
    }
  }

  render() {
    // for (let i = 0; i < aliens.length; i++)
    // {
    //     game.debug.body(aliens.children[i]);
    // }
  }

  collisionHandler(bullet, alien) {
    //  When a bullet hits an alien we kill them both
    bullet.kill();
    alien.kill();
    //  Increase the score
    score += 20;
    scoreText.text = scoreString + score;
    //  And create an explosion :)
    const explosion = explosions.getFirstExists(false);
    explosion.reset(alien.body.x, alien.body.y);
    explosion.play('kaboom', 30, false, true);
    if (aliens.countLiving() === 0) {
      score += 1000;
      scoreText.text = scoreString + score;
      enemyBullets.callAll('kill', this);
      stateText.text = ' You Won, \n Click to restart';
      stateText.visible = true;
      // the "click to restart" handler
      game.input.onTap.addOnce(that.restart, this);
    }

  }

  enemyHitsPlayer(player, bullet) {
    bullet.kill();
    const live = lives.getFirstAlive();
    if (live) {
      live.kill();
    }
    //  And create an explosion :)
    const explosion = explosions.getFirstExists(false);
    explosion.reset(player.body.x, player.body.y);
    explosion.play('kaboom', 30, false, true);
    // When the player dies
    if (lives.countLiving() < 1) {
      player.kill();
      enemyBullets.callAll('kill');
      stateText.text = ' GAME OVER \n Click to restart';
      stateText.visible = true;
      // the "click to restart" handler
      game.input.onTap.addOnce(that.restart, this);
    }

  }

  enemyFires() {

    //  Grab the first bullet we can from the pool
    const enemyBullet = enemyBullets.getFirstExists(false);

    livingEnemies.length = 0;

    aliens.forEachAlive(function (alien) {

      // put every living enemy in an array
      livingEnemies.push(alien);
    });


    if (enemyBullet && livingEnemies.length > 0) {

      const random = game.rnd.integerInRange(0, livingEnemies.length - 1);

      // randomly select one of them
      const shooter = livingEnemies[random];
      // And fire the bullet from this enemy
      enemyBullet.reset(shooter.body.x, shooter.body.y);

      game.physics.arcade.moveToObject(enemyBullet, player, 120);
      firingTimer = game.time.now + 2000;
    }

  }

  fireBullet() {
    //  To avoid them being allowed to fire too fast we set a time limit
    if (game.time.now > bulletTime) {
      //  Grab the first bullet we can from the pool
      const bullet = bullets.getFirstExists(false);

      if (bullet) {
        //  And fire it
        bullet.reset(player.x, player.y + 8);
        bullet.body.velocity.y = -400;
        bulletTime = game.time.now + 200;
      }
    }

  }

  resetBullet(bullet) {

    //  Called if the bullet goes out of the screen
    bullet.kill();

  }

  restart() {

    //  A new level starts

    // resets the life count
    lives.callAll('revive');
    //  And brings the aliens back from the dead :)
    aliens.removeAll();
    that.createAliens();

    // revives the player
    player.revive();
    // hides the text
    stateText.visible = false;

  }

  fireStart(event) {
    mobileFireButton = true;
  }
  fireEnd(event) {
    mobileFireButton = false;
  }
  leftStart(event) {
    mobileCursors.left = true;
  }
  leftEnd(event) {
    mobileCursors.left = false;
  }
  rightStart(event) {
    mobileCursors.right = true;
  }
  rightEnd(event) {
    mobileCursors.right = false;
  }

}






