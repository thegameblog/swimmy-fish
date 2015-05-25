var Gesso = require('gesso');
var helpers = require('./helpers');

var game = new Gesso();
var gravity = 0.3;
var seaLevel = 80;
var player = null;
var rocks = [];
var burstItem = null;
var burstSpeed = 2;
var burstCount = 0;
var burstMode = false;
var burstModeCount = 0;
var burstModeMaxCount = 500;
var longJump = false;
var longJumpCompleteCount = 0;
var longJumpCompleteMaxCount = 120;
var longJumpCompleteScore = 1000000;
var frameCount = 0;
var currentLevel = -1;
var scoreFrameCount = 6;
var scoreIncrement = 100;
var highScore = 0;
var highScoreTime = 0;
var highScoreMaxTime = 60;
var particles = [];
var endGameParticleCount = 100;
var bottomLeeway = 60;
var bubbles = [];
var splash = [];
var clickLock = 0;

var levelStartFrames = [0, 120, 660, 1260, 2000, 3200, 4400, 5600, 6800];
var levelStartScore = [];
for (var levelStartScoreIndex = 0; levelStartScoreIndex < levelStartFrames.length; levelStartScoreIndex++) {
  levelStartScore.push(Math.floor(levelStartFrames[levelStartScoreIndex] / scoreFrameCount * scoreIncrement / 2 / 100) * 100);
}
var levels = {
  0: {speed: 4, newRockMaxWidth: 100, newRockFrameCount: 60, newBurstItemFrameCount: null},
  1: {speed: 4, newRockMaxWidth: 100, newRockFrameCount: 200, newBurstItemFrameCount: null},
  2: {speed: 4.2, newRockMaxWidth: 100, newRockFrameCount: 100, newBurstItemFrameCount: null},
  3: {speed: 4.4, newRockMaxWidth: 100, newRockFrameCount: 80, newBurstItemFrameCount: null},
  4: {speed: 5, newRockMaxWidth: 120, newRockFrameCount: 75, newBurstItemFrameCount: null},
  5: {speed: 6, newRockMaxWidth: 150, newRockFrameCount: 75, newBurstItemFrameCount: null},
  6: {speed: 7, newRockMaxWidth: 150, newRockFrameCount: 65, newBurstItemFrameCount: null},
  7: {speed: 8, newRockMaxWidth: 225, newRockFrameCount: 65, newBurstItemFrameCount: null},
  8: {speed: 8, newRockMaxWidth: 250, newRockFrameCount: 65, newBurstItemFrameCount: 1200}
};

function newGame() {
  // First play
  if (currentLevel === -1) {
    currentLevel = 0;
  }
  // Reduce level
  if (currentLevel > 0) {
    currentLevel -= 1;
  }
  // Create player
  player = {
    x: 100,
    y: 200,
    sy: 1,
    velocity: -10,
    jumpVelocity: 8,
    terminalVelocity: 7,
    levelUpBubbles: 0,
    score: levelStartScore[currentLevel]
  };
  // Reset frame count
  frameCount = levelStartFrames[currentLevel];
  // Reset burst
  burstCount = 0;
  burstMode = false;
  burstModeCount = 0;
  longJump = false;
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
  clickLock = 30;
}

function newSplash() {
  for (var s = 0; s < 20; s++) {
    var ax = Math.random() * 4 - 3;
    var ay = -(Math.random() * 2 + 1);
    splash.push({x: player.x + ax, y: seaLevel, vx: ax, vy: ay, r: helpers.randInt(1, 2)});
  }
}

function newBubble(probability) {
  if (player && helpers.randInt(1, probability) === 1) {
    bubbles.push({x: player.x, y: player.y, r: helpers.randInt(2, 4)});
  }
}

game.click(function (e) {
  // Prevent accidental new game click
  if (clickLock > 0) {
    return false;
  }

  // Create new player, if not currently playing
  if (!player) {
    newGame();
    return false;
  }

  // Swim / jump
  if (player.y + 5 > seaLevel) {
    player.velocity = -player.jumpVelocity;
    player.sy = 1.6;
    newBubble(10);
  }
});

game.update(function () {
  // Update frame count, which represents time passed
  frameCount += 1;

  if (clickLock > 0) {
    clickLock -= 1;
  }

  // Do nothing else if this is the first time playing
  if (currentLevel === -1) {
    return;
  }

  // Set difficulty as a function of time
  if (player) {
    if (currentLevel + 1 < levelStartFrames.length && frameCount >= levelStartFrames[currentLevel + 1]) {
      currentLevel += 1;
      player.levelUpBubbles = 20 * currentLevel + 10;
    }
    // Show level up effect
    if (player.levelUpBubbles > 0) {
      player.levelUpBubbles -= 1;
      for (var u = 0; u < 10; u++) {
        newBubble(10);
      }
    }
  }

  // Get current level
  var level = levels[currentLevel];

  // Create new burst item
  if (player && level.newBurstItemFrameCount && !burstMode) {
    burstCount += 1;
    // Add the burst item such that it can be intersected right after a long jump
    if (burstCount >= level.newBurstItemFrameCount && (frameCount - level.newRockFrameCount * (level.speed / burstSpeed) - level.newRockMaxWidth - 4) % level.newRockFrameCount === 0 && !burstItem) {
      burstItem = {x: game.width, y: 36, r: 6};
      burstCount = 0;
    }
  }
  // Update burst item
  if (burstItem) {
    burstItem.x -= burstSpeed;
    burstItem.y = seaLevel - 16 - Math.abs(Math.sin(frameCount / 12)) * 24;
    // Delete burst item when out of bounds
    if (burstItem.x + burstItem.r < 0) {
      burstItem = null;
    }
  }
  // Check for intersection with player
  if (player && burstItem &&
      helpers.intersected({x: player.x - 10, y: player.y - 10, width: 40, height: 20},
        {x: burstItem.x, y: burstItem.y, width: burstItem.r, height: burstItem.r})) {
    burstMode = true;
    burstModeCount = 0;
    burstItem = null;
  }

  // Update rocks
  for (var r = 0; r < rocks.length; r++) {
    rocks[r].x -= level.speed;
    if (burstMode) {
      rocks[r].x -= burstModeCount / 8;
    } else if (longJump) {
      rocks[r].x -= 100 + level.speed;
    }
    // Delete rock when out of bounds
    if (rocks[r].x + rocks[r].width < 0) {
      rocks.splice(r, 1);
      r--;
    }
  }
  // Check for end of long jump
  if (longJump && rocks.length === 0) {
    longJump = false;
    if (player) {
      longJumpCompleteCount = longJumpCompleteMaxCount;
      // TODO: Animate
      player.score += longJumpCompleteScore;
    }
  }
  // Create a new rock
  if (!burstMode && !longJump) {
    if (frameCount % level.newRockFrameCount === 0) {
      var floater = player ? !!helpers.randInt(0, 1) : false;
      var height = helpers.randInt(200, player ? 300 : 250);
      rocks.push({
        x: game.width,
        y: floater ? seaLevel - (10 * helpers.randInt(1, 2)) : game.height - height,
        width: helpers.randInt(30, level.newRockMaxWidth),
        height: height
      });
    }
  } else if (!longJump) {
    var v = Math.floor(burstModeCount / burstModeMaxCount * 4);
    if (burstModeCount % 8 === 0) {
      var h = 60 + v * 60;
      rocks.push({
        x: game.width,
        y: game.height - h,
        width: 30 + v * 50,
        height: h
      });
    }
    burstModeCount += 1;
    if (burstModeCount >= burstModeMaxCount) {
      burstMode = false;
      burstModeCount = 0;
      longJump = true;
      rocks.push({
        x: game.width,
        y: seaLevel - 20,
        width: 3000,
        height: game.height - seaLevel
      });
    }
  }

  // Update bubbles
  for (var b = 0; b < bubbles.length; b++) {
    bubbles[b].x -= 3;
    if (burstMode || longJump) {
      bubbles[b].x -= ((burstModeCount) / burstModeMaxCount) * 10;
    }
    if (helpers.randInt(1, 3) === 1) {
      bubbles[b].x -= 1;
    }
    if (helpers.randInt(1, 5)) {
      bubbles[b].y += helpers.randInt(-3, 1);
    }
    // Delete bubble when out of bounds
    if (bubbles[b].x + bubbles[b].r < 0 || bubbles[b].y <= seaLevel) {
      bubbles.splice(b, 1);
      b--;
    }
  }
  // Randomly add a new bubble
  if (player) {
    newBubble(100);
  }
  // Add bubbles in burst mode
  if (burstMode) {
    for (var bu = 0; bu < 10; bu++) {
      newBubble(10);
    }
  }
  // Check for rock / bubble collisions
  for (r = 0; r < rocks.length; r++) {
    for (b = 0; b < bubbles.length; b++) {
      if (helpers.intersected({x: bubbles[b].x, y: bubbles[b].y, width: bubbles[b].r, height: bubbles[b].r}, rocks[r])) {
        bubbles.splice(b, 1);
        b--;
      }
    }
  }

  // Update splash
  for (var s = 0; s < splash.length; s++) {
    splash[s].x += splash[s].vx;
    splash[s].y += splash[s].vy;
    splash[s].vy += gravity;
    // Delete splash
    if (splash[s].y > seaLevel) {
      splash.splice(s, 1);
      s--;
    }
  }

  // Update particles
  for (var p = 0; p < particles.length; p++) {
    particles[p].x -= particles[p].vx;
    particles[p].y -= particles[p].vy;
    // Delete particle when out of bounds
    if (particles[p].x + 3 < 0 || particles[p].y + 3 < 0 ||
        particles[p].x - 3 > game.width || particles[p].y - 3 > game.height + bottomLeeway) {
      particles.splice(p, 1);
      p--;
    }
  }

  // Update high score animation
  if (highScoreTime > 0) {
    highScoreTime -= 1;
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
  if (frameCount % scoreFrameCount === 0) {
    player.score += scoreIncrement;
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
  if (player.y >= game.height + bottomLeeway) {
    endGame();
    return;
  }
  if ((player.y - player.velocity >= seaLevel && player.y < seaLevel) ||
      (player.y - player.velocity <= seaLevel && player.y > seaLevel)) {
    newSplash();
  }
});

game.render(function (ctx) {
  // Draw background
  ctx.fillStyle = '#ece';
  ctx.fillRect(0, 0, game.width, game.height);

  // Draw sky
  var grd = ctx.createLinearGradient(game.width / 2, 0.000, game.width / 2, seaLevel);
  grd.addColorStop(0.000, '#80befc');
  grd.addColorStop(1.000, '#cbcfed');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, game.width, seaLevel);

  // Draw water
  grd = ctx.createLinearGradient(game.width / 2, seaLevel, game.width / 2, game.height - seaLevel);
  grd.addColorStop(0.000, '#7EBDFC');
  grd.addColorStop(0.100, '#007fff');
  grd.addColorStop(1.000, '#003f7f');
  ctx.fillStyle = grd;
  ctx.fillRect(0, seaLevel, game.width, game.height - seaLevel);

  // Water lighting (note: coordinates are off, but the mistake looks better)
  grd = ctx.createLinearGradient(0, 0, game.width, game.height - seaLevel);
  grd.addColorStop(0.000, 'rgba(0, 127, 255, 0.200)');
  grd.addColorStop(0.100, 'rgba(255, 255, 255, 0.200)');
  grd.addColorStop(0.200, 'rgba(0, 127, 255, 0.200)');
  grd.addColorStop(0.500, 'rgba(255, 255, 255, 0.200)');
  grd.addColorStop(0.600, 'rgba(0, 127, 255, 0.200)');
  grd.addColorStop(0.800, 'rgba(255, 255, 255, 0.200)');
  grd.addColorStop(1.000, 'rgba(0, 127, 255, 0.200)');
  ctx.fillStyle = grd;
  ctx.fillRect(0, seaLevel, game.width, game.height - seaLevel);

  // Draw burst
  if (burstItem) {
    helpers.fillCircle(ctx, burstItem.x, burstItem.y, burstItem.r, '#D34384');
  }

  // Draw splash
  for (var s = 0; s < splash.length; s++) {
    helpers.fillCircle(ctx, splash[s].x, splash[s].y, splash[s].r, '#7EBDFC');
  }

  // Draw bubbles
  for (var b = 0; b < bubbles.length; b++) {
    helpers.fillCircle(ctx, bubbles[b].x, bubbles[b].y, bubbles[b].r, 'rgba(255, 255, 255, 0.8)');
  }

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
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    helpers.outlineText(ctx, player ? player.score : 'High Score', game.width / 2, 22, '#333', '#fff');
  }
  if (highScore) {
    ctx.font = 'bold 20px sans-serif';
    helpers.outlineText(ctx, highScore, game.width / 2, 51, '#333', '#fff');
    if (highScoreTime > 0) {
      var offset = (highScoreTime) * 2;
      var fade = (highScoreTime / highScoreMaxTime * 2);
      ctx.font = 'bold ' + (24 + offset) + 'px sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, ' + fade + ')';
      ctx.fillText(highScore, game.width / 2, 64 + (offset * 1.5));
    }
  }

  // Draw level badges
  for (var badge = 0; badge < currentLevel; badge++) {
    var x = (game.width - (badge % 4) * 40 - 22);
    var y = 16 + (24 * Math.floor(badge / 4));
    helpers.fillEllipse(ctx, x, y, 8, 2, 1, '#ff4');
    helpers.fillCircle(ctx, x + 5, y - 2, 2, '#330');
  }

  // Draw burst mode meter
  if (burstMode) {
    var bw = 153;
    helpers.drawMeter(ctx, game.width - bw - 5, seaLevel - 22, bw, 12, burstModeMaxCount - burstModeCount, burstModeMaxCount, '#5d4');
  }

  if (player) {
    // Draw player
    helpers.fillEllipse(ctx, player.x, player.y, 10, 2, player.sy, '#ff4');
    helpers.fillCircle(ctx, player.x + 5, player.y - 2, 3, '#330');
  }

  // Draw water depth gradient
  grd = ctx.createLinearGradient(game.width / 2, seaLevel, game.width / 2, game.height);
  grd.addColorStop(0.000, 'rgba(0, 127, 255, 0.100)');
  grd.addColorStop(0.700, 'rgba(0, 63, 127, 0.100)');
  grd.addColorStop(1.000, 'rgba(0, 63, 127, 0.600)');
  ctx.fillStyle = grd;
  ctx.fillRect(0, seaLevel, game.width, game.height - seaLevel);

  if (!player) {
    // Draw pre-game text
    if ((frameCount % 120 > 5 && frameCount % 120 < 20) || frameCount % 120 > 25) {
      ctx.font = 'bold 64px sans-serif';
      ctx.textAlign = 'center';
      if (highScore) {
        helpers.outlineText(ctx, 'Game over!', game.width / 2, game.height / 2 - 30, '#333', '#fff');
        helpers.outlineText(ctx, 'Click again!', game.width / 2, game.height / 2 + 40, '#333', '#fff');
      } else {
        helpers.outlineText(ctx, 'Click to start!', game.width / 2, game.height / 2, '#333', '#fff');
      }
    }
  }

  if (player && longJumpCompleteCount > 0) {
    // Draw message
    longJumpCompleteCount -= 1;
    ctx.font = 'bold 72px sans-serif';
    ctx.textAlign = 'center';
    if (longJumpCompleteCount % 20 > 5) {
      helpers.outlineText(ctx, 'Nice jump!', game.width / 2, game.height / 2, '#333', '#fff');
    }
  }
});

// TODO: Delete this
game.run();

// TODO: Get the runtime to expose this object through a gesso.current global
module.exports = game;
