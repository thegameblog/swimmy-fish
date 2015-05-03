var Gesso = require('gesso');
var helpers = require('./helpers');

var game = new Gesso();
var gravity = 0.3;
var seaLevel = 80;
var player = null;
var rocks = [];
var frameCount = 0;
var highScore = 0;

function newGame() {
  player = {
    playing: false,
    x: 100,
    y: 200,
    sy: 1,
    velocity: -10,
    jumpVelocity: 8,
    terminalVelocity: 7,
    score: 0
  };
}

function endGame() {
  if (!player) {
    return;
  }

  if (player.score > highScore) {
    highScore = player.score;
  }
  player = null;
}

Gesso.getCanvas().addEventListener('mousedown', function (e) {
  e.preventDefault();

  // Create new player, if not currently playing
  if (!player) {
    newGame();
    return false;
  }

  // Swim / jump
  if (player.y > seaLevel) {
    player.velocity = -player.jumpVelocity;
    player.sy = 1.6;
  }

  return false;
});

game.update(function () {
  frameCount += 1;

  // Update rocks
  for (var r = 0; r < rocks.length; r++) {
    rocks[r].x -= 5;
  }

  // Check for collisions
  // TODO: implement

  // Create a new rock
  if (frameCount % 100 === 0) {
    rocks.push({
      x: game.width,
      y: Math.random() * game.height,
      width: 100,
      height: 200 + Math.random() * 100
    });
  }

  if (!player) {
    return;
  }

  // Update player
  if (frameCount % 6 === 0) {
    player.score += 100;
  }
  if (player.sy > 1) {
    player.sy -= 0.1;
  }
  if (player.best && player.score > player.best) {
    player.best = player.score;
  }
  player.velocity += gravity;
  if (player.velocity > player.terminalVelocity) {
    player.velocity = player.terminalVelocity;
  }
  player.y += player.velocity;
  if (player.y >= game.height) {
    endGame();
  }
});

game.render(function (ctx) {
  // Draw background
  ctx.fillStyle = '#ece';
  ctx.fillRect(0, 0, game.width, game.height);

  // Draw water
  ctx.fillStyle = '#35f';
  ctx.fillRect(0, seaLevel, game.width, game.height - seaLevel);

  // Draw rocks
  for (var r = 0; r < rocks.length; r++) {
    ctx.fillStyle = '#5d4';
    ctx.fillRect(rocks[r].x, rocks[r].y, rocks[r].width, rocks[r].height);
  }

  // Draw score
  if (player || highScore) {
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'right';
    helpers.outlineText(ctx, 'Score: ' + (player ? player.score : 0), game.width - 30, 32, '#333', '#fff');
  }
  if (highScore) {
    helpers.outlineText(ctx, 'Best: ' + highScore, game.width - 30, 64, '#333', '#fff');
  }

  // Draw pre-game
  if (!player) {
    if ((frameCount % 120 > 5 && frameCount % 120 < 20) || frameCount % 120 > 25) {
      ctx.font = 'bold 64px sans-serif';
      ctx.textAlign = 'center';
      if (highScore) {
        helpers.outlineText(ctx, 'Game over!', (game.width / 2), (game.height / 2) - 90, '#333', '#fff');
        helpers.outlineText(ctx, 'Click again!', (game.width / 2), (game.height / 2) - 10, '#333', '#fff');
      } else {
        helpers.outlineText(ctx, 'Click to start!', (game.width / 2), (game.height / 2) - 50, '#333', '#fff');
      }
    }
    return;
  }

  // Draw player
  helpers.fillEllipse(ctx, player.x, player.y, 10, 2, player.sy, '#ff4');
  helpers.fillCircle(ctx, player.x + 5, player.y - 2, 3, '#330');
});

// TODO: Delete this
game.run();

// TODO: Get the runtime to expose this object through a gesso.current global
module.exports = game;
