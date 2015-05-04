var Gesso = require('gesso');
var helpers = require('./helpers');

var game = new Gesso();
var gravity = 0.3;
var seaLevel = 80;
var player = null;
var rocks = [];
var frameCount = 0;
var highScore = 0;
var highScoreTime = 0;
var highScoreMaxTime = 60;
var particles = [];
var endGameParticleCount = 100;

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

  // Set the new high score, animating it, if the record was broken
  if (player.score > highScore) {
    highScore = player.score;
    highScoreTime = highScoreMaxTime;
  }

  // Explode
  for (var index = 0; index < endGameParticleCount; index++) {
    var angle = helpers.randInt(0, 360);
    var velocity = helpers.randInt(10, 20);
    particles.push({
      x: player.x,
      y: player.y,
      vx: Math.cos(angle * Math.PI / 180) * velocity - 6,
      vy: Math.sin(angle * Math.PI / 180) * velocity
    });
  }

  // Set to not playing
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
    // TODO: Delete old rocks
  }

  // Create a new rock
  // TODO: Difficulty
  // TODO: Top / bottom pattern
  if (frameCount % 100 === 0) {
    rocks.push({
      x: game.width,
      y: helpers.randInt(50, game.height),
      width: helpers.randInt(100, 150),
      height: helpers.randInt(200, 300)
    });
  }

  // Update particles
  for (var p = 0; p < particles.length; p++) {
    particles[p].x -= particles[p].vx;
    particles[p].y -= particles[p].vy;
    // TODO: Delete old particles
  }

  // Skip player logic if not currently playing
  if (!player) {
    return;
  }

  // Check for collisions
  for (r = 0; r < rocks.length; r++) {
    if (helpers.intersected({x: player.x, y: player.y, width: 20, height: 10}, rocks[r])) {
      endGame();
      return;
    }
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
    return;
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

  // Draw particles
  for (var p = 0; p < particles.length; p++) {
    helpers.fillCircle(ctx, particles[p].x, particles[p].y, 3, '#ff4');
  }

  // Draw score
  if (player || highScore) {
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'right';
    helpers.outlineText(ctx, 'Score: ' + (player ? player.score : 0), game.width - 30, 32, '#333', '#fff');
  }
  if (highScore) {
    ctx.font = 'bold 24px sans-serif';
    helpers.outlineText(ctx, 'Best: ' + highScore, game.width - 30, 64, '#333', '#fff');
    if (highScoreTime > 0) {
      var offset = (highScoreMaxTime - highScoreTime) / 2;
      var fade = (highScoreTime / highScoreMaxTime);
      ctx.font = 'bold ' + (24 + offset) + 'px sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, ' + fade + ')';
      ctx.fillText('Best: ' + highScore, game.width - 30 + (offset * 1.5), 64 + (offset / 2.8));
      highScoreTime -= 1;
    }
  }

  // Draw pre-game text
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

  // TODO: Draw bubbles
});

// TODO: Delete this
game.run();

// TODO: Get the runtime to expose this object through a gesso.current global
module.exports = game;
