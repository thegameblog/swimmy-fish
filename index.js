var Gesso = require('gesso');
var helpers = require('./helpers');

var game = new Gesso();
var gravity = 0.3;
var seaLevel = 80;
var player = {
  x: 100,
  y: 200,
  sy: 1,
  velocity: -10,
  jumpVelocity: 8,
  terminalVelocity: 7,
  score: 0,
  best: 0
};
var rocks = [];
var frameCount = 0;

Gesso.getCanvas().addEventListener('mousedown', function (e) {
  e.stopPropagation();
  e.preventDefault();
  if (player.y > seaLevel) {
    player.velocity = -player.jumpVelocity;
    player.sy = 1.6;
  }
  return false;
});

game.update(function () {
  frameCount += 1;

  // Update player
  if (frameCount % 6 === 0) {
    player.score += 100;
  }
  player.velocity += gravity;
  if (player.velocity > player.terminalVelocity) {
    player.velocity = player.terminalVelocity;
  }
  player.y += player.velocity;
  if (player.y >= game.height) {
    player.y = 0;
  }
  if (player.sy > 1) {
    player.sy -= 0.1;
  }

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
});

game.render(function (ctx) {
  // Draw background
  ctx.fillStyle = '#ece';
  ctx.fillRect(0, 0, game.width, game.height);

  // Draw water
  ctx.fillStyle = '#35f';
  ctx.fillRect(0, seaLevel, game.width, game.height - seaLevel);

  // Score
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'right';
  helpers.outlineText(ctx, 'Score: ' + player.score, game.width - 30, 32, '#333', '#fff');

  // Draw rocks
  for (var r = 0; r < rocks.length; r++) {
    ctx.fillStyle = '#5d4';
    ctx.fillRect(rocks[r].x, rocks[r].y, rocks[r].width, rocks[r].height);
  }

  // Draw player
  ctx.save();
  helpers.fillEllipse(ctx, player.x, player.y, 10, 2, player.sy, '#ff4');
  helpers.fillCircle(ctx, player.x + 5, player.y - 2, 3, '#330');
});

// TODO: Delete this
game.run();

// TODO: Get the runtime to expose this object through a gesso.current global
module.exports = game;
