(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var Gesso = require('gesso');
var helpers = require('./helpers');

var game = new Gesso();
var gravity = 0.3;
var seaLevel = 80;
var player = null;
var rocks = [];
var burstItem = null;
var burstItemSeen = false;
var burstSpeed = 2;
var burstCount = 0;
var burstMode = false;
var burstModeCount = 0;
var burstModeMaxCount = 500;
var longJump = false;
var longJumpCompleteCount = 0;
var longJumpCompleteMaxCount = 120;
var longJumpCompleteScore = 1000000;
var badJump = false;
var frameCount = 0;
var currentLevel = -1;
// TODO: var scoreBuffer = 0;
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
var respawnDanger = 0;
var invincibility = 0;
var invincibilityBlink = 30;

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
  8: {speed: 8, newRockMaxWidth: 250, newRockFrameCount: 65, newBurstItemFrameCount: 120, newBurstItemFrameRepeat: 1200}
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
  // Reset burst mode
  burstItemSeen = false;
  burstCount = 0;
  burstMode = false;
  burstModeCount = 0;
  longJump = false;
  badJump = false;
  // Reset with invincibility if in danger
  if (respawnDanger > 0) {
    invincibility = 60 * 3;
  }
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

  // Bad jump if in burst mode
  if (burstMode || longJump) {
    badJump = true;
  }

  // Use invincibility until all rocks pass
  respawnDanger = game.width - player.x + levels[currentLevel].newRockMaxWidth;

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

function click() {
  // Prevent accidental new game click
  if (clickLock > 0 || longJump) {
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
}

game.click(click);
game.keydown(function (e) {
  if (e.which === 32) {
    click();
    return true;
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

  // Adjust invincibility
  if (invincibility > 0) {
    invincibility -= 1;
  }
  // Adjust re-spawn danger, adjusted for the current speed
  if (respawnDanger > 0) {
    respawnDanger = Math.max(respawnDanger - level.speed, 0);
  }

  // Create new burst item
  if (player && level.newBurstItemFrameCount && !burstMode) {
    burstCount += 1;
    // Add the burst item such that it can be intersected right after a long jump
    if (!burstItem &&
        (burstCount >= (!burstItemSeen ? level.newBurstItemFrameCount : level.newBurstItemFrameRepeat)) &&
        (frameCount - level.newRockFrameCount * (level.speed / burstSpeed) - level.newRockMaxWidth - 4) % level.newRockFrameCount === 0) {
      burstItem = {x: game.width, y: 36, r: 6};
      burstItemSeen = true;
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
    if (!badJump) {
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
    if (invincibility === 0 && helpers.intersected({x: player.x, y: player.y, width: 20, height: 10}, rocks[r])) {
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
  grd.addColorStop(0.000, 'rgba(0, 127, 255, 0.2)');
  grd.addColorStop(0.100, 'rgba(255, 255, 255, 0.2)');
  grd.addColorStop(0.200, 'rgba(0, 127, 255, 0.2)');
  grd.addColorStop(0.500, 'rgba(255, 255, 255, 0.2)');
  grd.addColorStop(0.600, 'rgba(0, 127, 255, 0.2)');
  grd.addColorStop(0.800, 'rgba(255, 255, 255, 0.2)');
  grd.addColorStop(1.000, 'rgba(0, 127, 255, 0.2)');
  ctx.fillStyle = grd;
  ctx.fillRect(0, seaLevel, game.width, game.height - seaLevel);

  // Draw burst item
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
    var x = (game.width - (badge % 4) * 28 - 16);
    var y = 16 + (24 * Math.floor(badge / 4));
    ctx.fillStyle = '#ff4';
    ctx.beginPath();
    ctx.moveTo(x + 8, y);
    ctx.lineTo(x, y + 8);
    ctx.lineTo(x, y - 8);
    ctx.fill();
    ctx.moveTo(x, y);
    ctx.lineTo(x - 8, y + 8);
    ctx.lineTo(x - 8, y - 8);
    ctx.fill();
  }

  // Draw burst mode meter
  if (burstMode) {
    var bw = 153;
    helpers.drawMeter(ctx, game.width - bw - 5, seaLevel - 22, bw, 12, burstModeMaxCount - burstModeCount, burstModeMaxCount, '#5d4');
  }

  // Draw player
  if (player && (invincibility % invincibilityBlink < invincibilityBlink - 4)) {
    helpers.fillEllipse(ctx, player.x, player.y, 10, 2, player.sy, invincibility ? 'rgba(255, 255, 68, 0.5)' : '#ff4');
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

},{"./helpers":2,"gesso":12}],2:[function(require,module,exports){
module.exports = {
  randInt: function (min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },
  fillCircle: function (ctx, x, y, r, color) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 2 * Math.PI, false);
    ctx.fillStyle = color;
    ctx.fill();
  },
  fillEllipse: function (ctx, x, y, r, sx, sy, color) {
    ctx.save();
    ctx.translate(-x * (sx - 1), -y * (sy - 1));
    ctx.scale(sx, sy);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 2 * Math.PI, false);
    ctx.restore();
    ctx.fillStyle = color;
    ctx.fill();
  },
  drawMeter: function (ctx, x, y, width, height, value, max, color) {
    ctx.fillStyle = '#fff';
    ctx.fillRect(x, y, width, height);
    ctx.fillStyle = '#000';
    ctx.fillRect(x + 2, y + 2, width - 4, height - 4);
    ctx.fillStyle = color;
    var meterWidth = width - 8;
    ctx.fillRect(x + 4 + ((max - value) / max) * meterWidth, y + 4, meterWidth - ((max - value) / max) * meterWidth, height - 8);
  },
  outlineText: function (ctx, text, x, y, color, outline) {
    ctx.fillStyle = color;
    ctx.fillText(text, x - 1, y);
    ctx.fillText(text, x + 1, y);
    ctx.fillText(text, x, y - 1);
    ctx.fillText(text, x, y + 2);
    ctx.fillStyle = outline;
    ctx.fillText(text, x, y);
  },
  intersected: function (rect1, rect2) {
    return (rect1.x < rect2.x + rect2.width &&
      rect1.x + rect1.width > rect2.x &&
      rect1.y < rect2.y + rect2.height &&
      rect1.height + rect1.y > rect2.y);
  }
};

},{}],3:[function(require,module,exports){
var lowLevel = require('./lowLevel');

function Controller(gesso, canvas) {
  this.gesso = gesso;
  this.canvas = canvas || lowLevel.getCanvas();
  this._context = this.canvas.getContext('2d');
  this._running = null;
  this._requestId = null;
}
Controller.prototype.stepOnce = function (timestamp) {
  this.gesso.step(this._context);
};
Controller.prototype.continueOn = function (timestamp) {
  this.stepOnce();

  var self = this;
  self._requestId = lowLevel.requestAnimationFrame(function (timestamp) {
    self._requestId = null;
    if (!self._running) {
      return;
    }
    // TODO: FPS
    self.continueOn();
  });
};
Controller.prototype.start = function start() {
  if (this._running) {
    return;
  }
  this._running = true;

  this.gesso.initialize();
  this.gesso.start.invoke();
  // TODO: Use a scheduler
  this.continueOn();
};
Controller.prototype.stop = function stop() {
  if (!this._running) {
    return;
  }
  this._running = false;

  lowLevel.cancelAnimationFrame(this._requestId);
  this._requestId = null;
  this.gesso.stop.invoke();
};

module.exports = Controller;

},{"./lowLevel":8}],4:[function(require,module,exports){
var util = require('./util');

// Returns a callable object that, when called with a function, subscribes
// to the delegate. Call invoke on this object to invoke each handler.
function Delegate(subscribed, unsubscribed) {
  var handlers = [];

  function callable(handler) {
    if (arguments.length !== 1) {
      throw new Error('Delegate takes exactly 1 argument (' + arguments.length + ' given)');
    } else if (typeof handler !== 'function') {
      throw new Error('Delegate argument must be a Function object (got ' + typeof handler + ')');
    }
    // Add the handler
    handlers.push(handler);
    // Allow custom logic on subscribe, passing in the handler
    var subscribedResult;
    if (subscribed) {
      subscribedResult = subscribed(handler);
    }
    // Return the unsubscribe function
    return function unsubscribe() {
      var initialHandler = util.removeLast(handlers, handler);
      // Allow custom logic on unsubscribe, passing in the original handler
      if (unsubscribed) {
        unsubscribed(initialHandler, subscribedResult);
      }
      // Return the original handler
      return initialHandler;
    };
  }
  callable.invoke = function invoke() {
    var args = arguments;
    util.forEach(handlers, function (handler) {
      handler.apply(null, args);
    });
  };
  // Expose handlers for inspection
  callable.handlers = handlers;

  return callable;
}

module.exports = Delegate;

},{"./util":9}],5:[function(require,module,exports){
var url = require('url');
var path = require('path');
var Controller = require('./controller');
var Delegate = require('./delegate');
var lowLevel = require('./lowLevel');
var logging = require('./logging');

function pointerHandlerWrapper(gesso, canvas, handler) {
  return function (e) {
    e.preventDefault();
    var rect = canvas.getBoundingClientRect();
    var x = e.clientX - rect.left;
    var y = e.clientY - rect.top;
    if (gesso.width !== rect.width) {
      x *= gesso.width / rect.width;
    }
    if (gesso.height !== rect.height) {
      y *= gesso.height / rect.height;
    }
    handler({x: x, y: y, e: e});
    return false;
  };
}

function keyHandlerWrapper(handler) {
  return function (e) {
    var handled = handler({which: e.which, e: e});
    // Prevent default when handled and not focused on an external UI element
    if (handled && lowLevel.isRootContainer(e.target)) {
      e.preventDefault();
      return false;
    }
  };
}

function Gesso(options) {
  options = options || {};
  this.queryVariables = null;
  this.scriptUrl = Gesso.getScriptUrl();
  this.contextType = options.contextType || '2d';
  this.contextAttributes = options.contextAttributes;
  this.fps = options.fps || 60;
  this.autoplay = options.autoplay || true;
  this.width = options.width || 640;    // TODO: allow 'null' to use width of target canvas
  this.height = options.height || 480;  // TODO: allow 'null' to use height of target canvas
  this.setup = new Delegate();
  this.start = new Delegate();
  this.stop = new Delegate();
  this.update = new Delegate();
  this.render = new Delegate();
  // TODO: Use the canvas passed into run() instead of Gesso.getCanvas in these input handlers
  var self = this;
  this.click = new Delegate(function (handler) {
    var canvas = Gesso.getCanvas();
    var r = {canvas: canvas, handlerWrapper: pointerHandlerWrapper(self, canvas, handler)};
    r.canvas.addEventListener('touchstart', r.handlerWrapper, false);
    r.canvas.addEventListener('mousedown', r.handlerWrapper, false);
    return r;
  }, function (handler, r) {
    r.canvas.removeEventListener('touchstart', r.handlerWrapper || handler);
    r.canvas.removeEventListener('mousedown', r.handlerWrapper || handler);
  });
  this.pointerdown = new Delegate(function (handler) {
    var canvas = Gesso.getCanvas();
    var r = {canvas: canvas, handlerWrapper: pointerHandlerWrapper(self, canvas, handler)};
    r.canvas.addEventListener('pointerdown', r.handlerWrapper, false);
    return r;
  }, function (handler, r) {
    r.canvas.removeEventListener('pointerdown', r.handlerWrapper || handler);
  });
  this.pointermove = new Delegate(function (handler) {
    var canvas = Gesso.getCanvas();
    var r = {canvas: canvas, handlerWrapper: pointerHandlerWrapper(self, canvas, handler)};
    r.canvas.addEventListener('pointermove', r.handlerWrapper, false);
    return r;
  }, function (handler, r) {
    r.canvas.removeEventListener('pointermove', r.handlerWrapper || handler);
  });
  this.pointerup = new Delegate(function (handler) {
    var canvas = Gesso.getCanvas();
    var r = {canvas: canvas, handlerWrapper: pointerHandlerWrapper(self, canvas, handler)};
    r.canvas.addEventListener('pointerup', r.handlerWrapper, false);
    return r;
  }, function (handler, r) {
    r.canvas.removeEventListener('pointerup', r.handlerWrapper || handler);
  });
  this.keydown = new Delegate(function (handler) {
    var r = {root: lowLevel.getRootElement(), handlerWrapper: keyHandlerWrapper(handler)};
    r.root.addEventListener('keydown', r.handlerWrapper, false);
    return r;
  }, function (handler, r) {
    r.root.removeEventListener('keydown', r.handlerWrapper || handler);
  });
  this.keyup = new Delegate(function (handler) {
    var r = {root: lowLevel.getRootElement(), handlerWrapper: keyHandlerWrapper(handler)};
    r.root.addEventListener('keyup', r.handlerWrapper, false);
    return r;
  }, function (handler, r) {
    r.root.removeEventListener('keyup', r.handlerWrapper || handler);
  });
  this._initialized = false;
  this._frameCount = 0;
}
Gesso.Controller = Controller;
Gesso.Delegate = Delegate;
Gesso.getQueryVariables = lowLevel.getQueryVariables;
Gesso.getScriptUrl = lowLevel.getScriptUrl;
Gesso.requestAnimationFrame = lowLevel.requestAnimationFrame;
Gesso.cancelAnimationFrame = lowLevel.cancelAnimationFrame;
Gesso.getCanvas = lowLevel.getCanvas;
Gesso.getContext2D = lowLevel.getContext2D;
Gesso.getWebGLContext = lowLevel.getWebGLContext;
Gesso.error = logging.error;
Gesso.info = logging.info;
Gesso.log = logging.log;
Gesso.warn = logging.warn;
Gesso.prototype.initialize = function initialize() {
  if (this._initialized) {
    return;
  }
  this._initialized = true;
  this.setup.invoke();
};
Gesso.prototype.step = function step(context) {
  this.nextFrame();
  this.renderTo(context);
};
Gesso.prototype.nextFrame = function nextFrame() {
  return this.update.invoke(++this._frameCount);
};
Gesso.prototype.renderTo = function renderTo(context) {
  return this.render.invoke(context);
};
Gesso.prototype.run = function run(canvas) {
  var controller = new Controller(this, canvas);
  controller.start();
  return controller;
};
Gesso.prototype.asset = function asset(assetPath) {
  return url.resolve(this.scriptUrl, path.join('assets', assetPath));
};
Gesso.prototype.param = function param(name) {
  if (this.queryVariables === null) {
    this.queryVariables = Gesso.getQueryVariables();
  }
  return this.queryVariables[name];
};

module.exports = Gesso;

},{"./controller":3,"./delegate":4,"./logging":7,"./lowLevel":8,"path":13,"url":19}],6:[function(require,module,exports){
var Gesso = require('./gesso');

// TODO: Delete this
window.Gesso = Gesso;

module.exports = Gesso;

},{"./gesso":5}],7:[function(require,module,exports){
// TODO: Logger class
// TODO: Pluggable log backend, e.g. console.log

// http://stackoverflow.com/questions/6418220/javascript-send-json-object-with-ajax
// http://stackoverflow.com/questions/9713058/sending-post-data-with-a-xmlhttprequest
// http://stackoverflow.com/questions/332872/encode-url-in-javascript
function _send(level, args) {
  var payload = (
    'level=' + encodeURIComponent(level) +
    '&message=' + encodeURIComponent(args.join(' ')));

  var xhr = new XMLHttpRequest();
  xhr.open('POST', '/log');
  xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
  xhr.onreadystatechange = function () {
    // Check for error state
    if (xhr.readyState === 4 && xhr.status !== 200) {
      // TODO: Notify user on the page and show message if console.log doesn't exist
      if (console && console.log) {
        console.log(xhr.responseText);
      }
    }
  };
  xhr.send(payload);
}

function error(message) {
  return _send('error', Array.prototype.slice.call(arguments));
}

function info(message) {
  return _send('info', Array.prototype.slice.call(arguments));
}

function log(message) {
  return _send('log', Array.prototype.slice.call(arguments));
}

function warn(message) {
  return _send('warn', Array.prototype.slice.call(arguments));
}

module.exports = {
  error: error,
  info: info,
  log: log,
  warn: warn
};

},{}],8:[function(require,module,exports){
/* globals document */

var raf = require('./vendor/raf');
var util = require('./util');

// Global polyfills
require('./vendor/hand.min.1.3.8');

// TODO: Find a better way to do this
var getScriptUrl = (function () {
  var scripts = document.getElementsByTagName('script');
  var index = scripts.length - 1;
  var thisScript = scripts[index];
  return function () { return thisScript.src; };
})();

function getQueryVariables() {
  var pl = /\+/g;  // Regex for replacing addition symbol with a space
  var search = /([^&=]+)=?([^&]*)/g;
  var decode = function (s) {
    return decodeURIComponent(s.replace(pl, ' '));
  };
  var query = window.location.search.substring(1);

  var urlParams = {};
  while (true) {
    var match = search.exec(query);
    if (!match) {
      return urlParams;
    }
    urlParams[decode(match[1])] = decode(match[2]);
  }
}

function getRootElement() {
  return document;
}

function isRootContainer(target) {
  return target === document || target === document.body;
}

function getCanvas() {
  // TODO: Extract this out to break dependency
  if (typeof window === 'undefined') {
    throw new Error('Cannot get canvas outside of browser context.');
  }

  // TODO: Read the project settings use the right ID
  var canvas = window.document.getElementById('gesso-target');

  // Replace image placeholder with canvas
  if (canvas && canvas.tagName === 'IMG') {
    canvas = util.changeTagName(canvas, 'canvas');
  }

  // Default to using the only canvas on the page, if available
  if (!canvas) {
    var canvases = window.document.getElementsByTagName('canvas');
    if (canvases.length === 1) {
      canvas = canvases[0];
    }
  }

  // Raise error if no usable canvases were found
  if (!canvas) {
    throw new Error('Canvas not found.');
  }

  return canvas;
}

function getContext2D() {
  return getCanvas().getContext('2d');
}

function getWebGLContext() {
  return getCanvas().getContext('webgl');
}

module.exports = {
  requestAnimationFrame: raf.requestAnimationFrame,
  cancelAnimationFrame: raf.cancelAnimationFrame,
  getScriptUrl: getScriptUrl,
  getQueryVariables: getQueryVariables,
  getRootElement: getRootElement,
  isRootContainer: isRootContainer,
  getCanvas: getCanvas,
  getContext2D: getContext2D,
  getWebGLContext: getWebGLContext
};

},{"./util":9,"./vendor/hand.min.1.3.8":10,"./vendor/raf":11}],9:[function(require,module,exports){
function forEach(array, stepFunction) {
  for (var index = 0; index < array.length; index++) {
    stepFunction(array[index]);
  }
}

function pop(array, index) {
  return typeof index === 'undefined' ? array.pop() : array.splice(index, 1)[0];
}

function indexOf(array, item, startIndex) {
  for (var index = startIndex || 0; index < array.length; index++) {
    if (array[index] === item) {
      return index;
    }
  }
  return -1;
}

function lastIndexOf(array, item, startIndex) {
  for (var index = startIndex || array.length - 1; index >= 0; index--) {
    if (array[index] === item) {
      return index;
    }
  }
  return -1;
}

function remove(array, item) {
  var index = indexOf(array, item);
  return index !== -1 ? pop(array, index) : null;
}

function removeLast(array, item) {
  var index = lastIndexOf(array, item);
  return index !== -1 ? pop(array, index) : null;
}

function changeTagName(element, tagName) {
  if (element.tagName === tagName.toUpperCase()) {
    return element;
  }

  // Try changing the type first (modern browsers, except IE)
  element.tagName = tagName;
  if (element.tagName === tagName.toUpperCase()) {
    return element;
  }

  // Create new element
  var newElement = document.createElement(tagName);
  // Copy attributes
  for (var i = 0; i < element.attributes.length; i++) {
    newElement.setAttribute(element.attributes[i].name, element.attributes[i].value);
  }
  // Copy child nodes
  while (element.firstChild) {
    newElement.appendChild(element.firstChild);
  }
  // Replace element
  element.parentNode.replaceChild(newElement, element);

  return newElement;
}

module.exports = {
  forEach: forEach,
  pop: pop,
  indexOf: indexOf,
  lastIndexOf: lastIndexOf,
  remove: remove,
  removeLast: removeLast,
  changeTagName: changeTagName
};

},{}],10:[function(require,module,exports){
var HANDJS=HANDJS||{};!function(){function e(){b=!0,clearTimeout(M),M=setTimeout(function(){b=!1},700)}function t(e,t){for(;e;){if(e.contains(t))return e;e=e.parentNode}return null}function n(e,n,r){for(var o=t(e,n),i=e,a=[];i&&i!==o;)h(i,"pointerenter")&&a.push(i),i=i.parentNode;for(;a.length>0;)r(a.pop())}function r(e,n,r){for(var o=t(e,n),i=e;i&&i!==o;)h(i,"pointerleave")&&r(i),i=i.parentNode}function o(e,t){["pointerdown","pointermove","pointerup","pointerover","pointerout"].forEach(function(n){window.addEventListener(e(n),function(e){!b&&m(e.target,n)&&t(e,n,!0)})}),void 0===window["on"+e("pointerenter").toLowerCase()]&&window.addEventListener(e("pointerover"),function(e){if(!b){var r=m(e.target,"pointerenter");r&&r!==window&&(r.contains(e.relatedTarget)||n(r,e.relatedTarget,function(n){t(e,"pointerenter",!1,n,e.relatedTarget)}))}}),void 0===window["on"+e("pointerleave").toLowerCase()]&&window.addEventListener(e("pointerout"),function(e){if(!b){var n=m(e.target,"pointerleave");n&&n!==window&&(n.contains(e.relatedTarget)||r(n,e.relatedTarget,function(n){t(e,"pointerleave",!1,n,e.relatedTarget)}))}})}if(!window.PointerEvent){Array.prototype.indexOf||(Array.prototype.indexOf=function(e){var t=Object(this),n=t.length>>>0;if(0===n)return-1;var r=0;if(arguments.length>0&&(r=Number(arguments[1]),r!==r?r=0:0!==r&&1/0!==r&&r!==-1/0&&(r=(r>0||-1)*Math.floor(Math.abs(r)))),r>=n)return-1;for(var o=r>=0?r:Math.max(n-Math.abs(r),0);n>o;o++)if(o in t&&t[o]===e)return o;return-1}),Array.prototype.forEach||(Array.prototype.forEach=function(e,t){if(!(this&&e instanceof Function))throw new TypeError;for(var n=0;n<this.length;n++)e.call(t,this[n],n,this)}),String.prototype.trim||(String.prototype.trim=function(){return this.replace(/^\s+|\s+$/,"")});var i=["pointerdown","pointerup","pointermove","pointerover","pointerout","pointercancel","pointerenter","pointerleave"],a=["PointerDown","PointerUp","PointerMove","PointerOver","PointerOut","PointerCancel","PointerEnter","PointerLeave"],s="touch",d="pen",c="mouse",f={},l=function(e){for(;e&&!e.handjs_forcePreventDefault;)e=e.parentNode;return!!e||window.handjs_forcePreventDefault},v=function(e,t,n,r,o){var i;if(document.createEvent?(i=document.createEvent("MouseEvents"),i.initMouseEvent(t,n,!0,window,1,e.screenX,e.screenY,e.clientX,e.clientY,e.ctrlKey,e.altKey,e.shiftKey,e.metaKey,e.button,o||e.relatedTarget)):(i=document.createEventObject(),i.screenX=e.screenX,i.screenY=e.screenY,i.clientX=e.clientX,i.clientY=e.clientY,i.ctrlKey=e.ctrlKey,i.altKey=e.altKey,i.shiftKey=e.shiftKey,i.metaKey=e.metaKey,i.button=e.button,i.relatedTarget=o||e.relatedTarget),void 0===i.offsetX&&(void 0!==e.offsetX?(Object&&void 0!==Object.defineProperty&&(Object.defineProperty(i,"offsetX",{writable:!0}),Object.defineProperty(i,"offsetY",{writable:!0})),i.offsetX=e.offsetX,i.offsetY=e.offsetY):Object&&void 0!==Object.defineProperty?(Object.defineProperty(i,"offsetX",{get:function(){return this.currentTarget&&this.currentTarget.offsetLeft?e.clientX-this.currentTarget.offsetLeft:e.clientX}}),Object.defineProperty(i,"offsetY",{get:function(){return this.currentTarget&&this.currentTarget.offsetTop?e.clientY-this.currentTarget.offsetTop:e.clientY}})):void 0!==e.layerX&&(i.offsetX=e.layerX-e.currentTarget.offsetLeft,i.offsetY=e.layerY-e.currentTarget.offsetTop)),i.isPrimary=void 0!==e.isPrimary?e.isPrimary:!0,e.pressure)i.pressure=e.pressure;else{var a=0;void 0!==e.which?a=e.which:void 0!==e.button&&(a=e.button),i.pressure=0===a?0:.5}if(i.rotation=e.rotation?e.rotation:0,i.hwTimestamp=e.hwTimestamp?e.hwTimestamp:0,i.tiltX=e.tiltX?e.tiltX:0,i.tiltY=e.tiltY?e.tiltY:0,i.height=e.height?e.height:0,i.width=e.width?e.width:0,i.preventDefault=function(){void 0!==e.preventDefault&&e.preventDefault()},void 0!==i.stopPropagation){var f=i.stopPropagation;i.stopPropagation=function(){void 0!==e.stopPropagation&&e.stopPropagation(),f.call(this)}}switch(i.pointerId=e.pointerId,i.pointerType=e.pointerType,i.pointerType){case 2:i.pointerType=s;break;case 3:i.pointerType=d;break;case 4:i.pointerType=c}r?r.dispatchEvent(i):e.target?e.target.dispatchEvent(i):e.srcElement.fireEvent("on"+E(t),i)},u=function(e,t,n,r,o){e.pointerId=1,e.pointerType=c,v(e,t,n,r,o)},p=function(e,t,n,r,o,i){var a=t.identifier+2;t.pointerId=a,t.pointerType=s,t.currentTarget=n,void 0!==r.preventDefault&&(t.preventDefault=function(){r.preventDefault()}),v(t,e,o,n,i)},h=function(e,t){return e.__handjsGlobalRegisteredEvents&&e.__handjsGlobalRegisteredEvents[t]},m=function(e,t){for(;e&&!h(e,t);)e=e.parentNode;return e?e:h(window,t)?window:void 0},g=function(e,t,n,r,o,i){m(n,e)&&p(e,t,n,r,o,i)},E=function(e){return e.toLowerCase().replace("pointer","mouse")},w=function(e,t){var n=i.indexOf(t),r=e+a[n];return r},T=function(e,t,n,r){if(void 0===e.__handjsRegisteredEvents&&(e.__handjsRegisteredEvents=[]),r){if(void 0!==e.__handjsRegisteredEvents[t])return e.__handjsRegisteredEvents[t]++,void 0;e.__handjsRegisteredEvents[t]=1,e.addEventListener(t,n,!1)}else{if(-1!==e.__handjsRegisteredEvents.indexOf(t)&&(e.__handjsRegisteredEvents[t]--,0!==e.__handjsRegisteredEvents[t]))return;e.removeEventListener(t,n),e.__handjsRegisteredEvents[t]=0}},y=function(e,t,n){if(e.__handjsGlobalRegisteredEvents||(e.__handjsGlobalRegisteredEvents=[]),n){if(void 0!==e.__handjsGlobalRegisteredEvents[t])return e.__handjsGlobalRegisteredEvents[t]++,void 0;e.__handjsGlobalRegisteredEvents[t]=1}else void 0!==e.__handjsGlobalRegisteredEvents[t]&&(e.__handjsGlobalRegisteredEvents[t]--,e.__handjsGlobalRegisteredEvents[t]<0&&(e.__handjsGlobalRegisteredEvents[t]=0));var r,o;switch(window.MSPointerEvent?(r=function(e){return w("MS",e)},o=v):(r=E,o=u),t){case"pointerenter":case"pointerleave":var i=r(t);void 0!==e["on"+i.toLowerCase()]&&T(e,i,function(e){o(e,t)},n)}},L=function(e){var t=e.prototype?e.prototype.addEventListener:e.addEventListener,n=function(e,n,r){-1!==i.indexOf(e)&&y(this,e,!0),void 0===t?this.attachEvent("on"+E(e),n):t.call(this,e,n,r)};e.prototype?e.prototype.addEventListener=n:e.addEventListener=n},_=function(e){var t=e.prototype?e.prototype.removeEventListener:e.removeEventListener,n=function(e,n,r){-1!==i.indexOf(e)&&y(this,e,!1),void 0===t?this.detachEvent(E(e),n):t.call(this,e,n,r)};e.prototype?e.prototype.removeEventListener=n:e.removeEventListener=n};L(window),L(window.HTMLElement||window.Element),L(document),L(HTMLBodyElement),L(HTMLDivElement),L(HTMLImageElement),L(HTMLUListElement),L(HTMLAnchorElement),L(HTMLLIElement),L(HTMLTableElement),window.HTMLSpanElement&&L(HTMLSpanElement),window.HTMLCanvasElement&&L(HTMLCanvasElement),window.SVGElement&&L(SVGElement),_(window),_(window.HTMLElement||window.Element),_(document),_(HTMLBodyElement),_(HTMLDivElement),_(HTMLImageElement),_(HTMLUListElement),_(HTMLAnchorElement),_(HTMLLIElement),_(HTMLTableElement),window.HTMLSpanElement&&_(HTMLSpanElement),window.HTMLCanvasElement&&_(HTMLCanvasElement),window.SVGElement&&_(SVGElement);var b=!1,M=-1;!function(){window.MSPointerEvent?o(function(e){return w("MS",e)},v):(o(E,u),void 0!==window.ontouchstart&&(window.addEventListener("touchstart",function(t){for(var r=0;r<t.changedTouches.length;++r){var o=t.changedTouches[r];f[o.identifier]=o.target,g("pointerover",o,o.target,t,!0),n(o.target,null,function(e){p("pointerenter",o,e,t,!1)}),g("pointerdown",o,o.target,t,!0)}e()}),window.addEventListener("touchend",function(t){for(var n=0;n<t.changedTouches.length;++n){var o=t.changedTouches[n],i=f[o.identifier];g("pointerup",o,i,t,!0),g("pointerout",o,i,t,!0),r(i,null,function(e){p("pointerleave",o,e,t,!1)})}e()}),window.addEventListener("touchmove",function(t){for(var o=0;o<t.changedTouches.length;++o){var i=t.changedTouches[o],a=document.elementFromPoint(i.clientX,i.clientY),s=f[i.identifier];s&&l(s)===!0&&t.preventDefault(),g("pointermove",i,s,t,!0),s!==a&&(s&&(g("pointerout",i,s,t,!0,a),s.contains(a)||r(s,a,function(e){p("pointerleave",i,e,t,!1,a)})),a&&(g("pointerover",i,a,t,!0,s),a.contains(s)||n(a,s,function(e){p("pointerenter",i,e,t,!1,s)})),f[i.identifier]=a)}e()}),window.addEventListener("touchcancel",function(e){for(var t=0;t<e.changedTouches.length;++t){var n=e.changedTouches[t];g("pointercancel",n,f[n.identifier],e,!0)}})))}(),void 0===navigator.pointerEnabled&&(navigator.pointerEnabled=!0,navigator.msPointerEnabled&&(navigator.maxTouchPoints=navigator.msMaxTouchPoints))}}(),function(){window.PointerEvent||document.styleSheets&&document.addEventListener&&document.addEventListener("DOMContentLoaded",function(){if(void 0===document.body.style.touchAction){var e=new RegExp(".+?{.*?}","m"),t=new RegExp(".+?{","m"),n=function(n){var r=e.exec(n);if(r){var o=r[0];n=n.replace(o,"").trim();var i=t.exec(o)[0].replace("{","").trim();if(-1!==o.replace(/\s/g,"").indexOf("touch-action:none"))for(var a=document.querySelectorAll(i),s=0;s<a.length;s++){var d=a[s];void 0!==d.style.msTouchAction?d.style.msTouchAction="none":d.handjs_forcePreventDefault=!0}return n}},r=function(e){if(window.setImmediate)e&&setImmediate(r,n(e));else for(;e;)e=n(e)};try{for(var o=0;o<document.styleSheets.length;o++){var i=document.styleSheets[o];if(void 0!==i.href){var a=new XMLHttpRequest;a.open("get",i.href),a.send();var s=a.responseText.replace(/(\n|\r)/g,"");r(s)}}}catch(d){}for(var c=document.getElementsByTagName("style"),o=0;o<c.length;o++){var f=c[o],l=f.innerHTML.replace(/(\n|\r)/g,"").trim();r(l)}}},!1)}();
},{}],11:[function(require,module,exports){
// Raf polyfill by Erik Möller. fixes from Paul Irish and Tino Zijdel
// MIT license
// Adapted to CommonJS by Joe Esposito
// Origin: http://paulirish.com/2011/requestanimationframe-for-smart-animating/
//         https://gist.github.com/paulirish/1579671

var raf = (function () {
  var requestAnimationFrame = null;
  var cancelAnimationFrame = null;

  if (typeof window !== 'undefined') {
    var vendors = ['ms', 'moz', 'webkit', 'o'];
    requestAnimationFrame = window.requestAnimationFrame;
    cancelAnimationFrame = window.cancelAnimationFrame;
    for(var x = 0; x < vendors.length && !requestAnimationFrame; ++x) {
      requestAnimationFrame = window[vendors[x] + 'RequestAnimationFrame'];
      cancelAnimationFrame = window[vendors[x] + 'CancelAnimationFrame'] || window[vendors[x] + 'CancelRequestAnimationFrame'];
    }
  }

  if (!requestAnimationFrame) {
    var lastTime = 0;
    requestAnimationFrame = function(callback) {
      var currTime = new Date().getTime();
      var timeToCall = Math.max(0, 16 - (currTime - lastTime));
      var id = setTimeout(function () { callback(currTime + timeToCall); }, timeToCall);
      lastTime = currTime + timeToCall;
      return id;
    };
    cancelAnimationFrame = function(id) {
      clearTimeout(id);
    };
  }

  return {
    requestAnimationFrame: function(callback) { return requestAnimationFrame(callback); },
    cancelAnimationFrame: function(requestID) { return cancelAnimationFrame(requestID); }
  };
})();

module.exports = raf;

},{}],12:[function(require,module,exports){
// Gesso Entry Point
// Detect whether this is called from the browser, or from the CLI.

if (typeof window === 'undefined') {
  // Use module.require so the client-side build skips over server code,
  // which will work properly at runtime since no window global is defined
  module.exports = module.require('./gesso');
} else {
  // Include in client-side build,
  // which will have a window global defined at runtime
  module.exports = require('./client');
}

},{"./client":6}],13:[function(require,module,exports){
(function (process){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// resolves . and .. elements in a path array with directory names there
// must be no slashes, empty elements, or device names (c:\) in the array
// (so also no leading and trailing slashes - it does not distinguish
// relative and absolute paths)
function normalizeArray(parts, allowAboveRoot) {
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = parts.length - 1; i >= 0; i--) {
    var last = parts[i];
    if (last === '.') {
      parts.splice(i, 1);
    } else if (last === '..') {
      parts.splice(i, 1);
      up++;
    } else if (up) {
      parts.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (allowAboveRoot) {
    for (; up--; up) {
      parts.unshift('..');
    }
  }

  return parts;
}

// Split a filename into [root, dir, basename, ext], unix version
// 'root' is just a slash, or nothing.
var splitPathRe =
    /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
var splitPath = function(filename) {
  return splitPathRe.exec(filename).slice(1);
};

// path.resolve([from ...], to)
// posix version
exports.resolve = function() {
  var resolvedPath = '',
      resolvedAbsolute = false;

  for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
    var path = (i >= 0) ? arguments[i] : process.cwd();

    // Skip empty and invalid entries
    if (typeof path !== 'string') {
      throw new TypeError('Arguments to path.resolve must be strings');
    } else if (!path) {
      continue;
    }

    resolvedPath = path + '/' + resolvedPath;
    resolvedAbsolute = path.charAt(0) === '/';
  }

  // At this point the path should be resolved to a full absolute path, but
  // handle relative paths to be safe (might happen when process.cwd() fails)

  // Normalize the path
  resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {
    return !!p;
  }), !resolvedAbsolute).join('/');

  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
};

// path.normalize(path)
// posix version
exports.normalize = function(path) {
  var isAbsolute = exports.isAbsolute(path),
      trailingSlash = substr(path, -1) === '/';

  // Normalize the path
  path = normalizeArray(filter(path.split('/'), function(p) {
    return !!p;
  }), !isAbsolute).join('/');

  if (!path && !isAbsolute) {
    path = '.';
  }
  if (path && trailingSlash) {
    path += '/';
  }

  return (isAbsolute ? '/' : '') + path;
};

// posix version
exports.isAbsolute = function(path) {
  return path.charAt(0) === '/';
};

// posix version
exports.join = function() {
  var paths = Array.prototype.slice.call(arguments, 0);
  return exports.normalize(filter(paths, function(p, index) {
    if (typeof p !== 'string') {
      throw new TypeError('Arguments to path.join must be strings');
    }
    return p;
  }).join('/'));
};


// path.relative(from, to)
// posix version
exports.relative = function(from, to) {
  from = exports.resolve(from).substr(1);
  to = exports.resolve(to).substr(1);

  function trim(arr) {
    var start = 0;
    for (; start < arr.length; start++) {
      if (arr[start] !== '') break;
    }

    var end = arr.length - 1;
    for (; end >= 0; end--) {
      if (arr[end] !== '') break;
    }

    if (start > end) return [];
    return arr.slice(start, end - start + 1);
  }

  var fromParts = trim(from.split('/'));
  var toParts = trim(to.split('/'));

  var length = Math.min(fromParts.length, toParts.length);
  var samePartsLength = length;
  for (var i = 0; i < length; i++) {
    if (fromParts[i] !== toParts[i]) {
      samePartsLength = i;
      break;
    }
  }

  var outputParts = [];
  for (var i = samePartsLength; i < fromParts.length; i++) {
    outputParts.push('..');
  }

  outputParts = outputParts.concat(toParts.slice(samePartsLength));

  return outputParts.join('/');
};

exports.sep = '/';
exports.delimiter = ':';

exports.dirname = function(path) {
  var result = splitPath(path),
      root = result[0],
      dir = result[1];

  if (!root && !dir) {
    // No dirname whatsoever
    return '.';
  }

  if (dir) {
    // It has a dirname, strip trailing slash
    dir = dir.substr(0, dir.length - 1);
  }

  return root + dir;
};


exports.basename = function(path, ext) {
  var f = splitPath(path)[2];
  // TODO: make this comparison case-insensitive on windows?
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  return f;
};


exports.extname = function(path) {
  return splitPath(path)[3];
};

function filter (xs, f) {
    if (xs.filter) return xs.filter(f);
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        if (f(xs[i], i, xs)) res.push(xs[i]);
    }
    return res;
}

// String.prototype.substr - negative index don't work in IE8
var substr = 'ab'.substr(-1) === 'b'
    ? function (str, start, len) { return str.substr(start, len) }
    : function (str, start, len) {
        if (start < 0) start = str.length + start;
        return str.substr(start, len);
    }
;

}).call(this,require('_process'))
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL1JlcG9zaXRvcmllcy9nZXNzby5qcy9ub2RlX21vZHVsZXMvcGF0aC1icm93c2VyaWZ5L2luZGV4LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIi8vIENvcHlyaWdodCBKb3llbnQsIEluYy4gYW5kIG90aGVyIE5vZGUgY29udHJpYnV0b3JzLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhXG4vLyBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4vLyBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbi8vIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbi8vIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXRcbi8vIHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZVxuLy8gZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbi8vIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1Ncbi8vIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0Zcbi8vIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU5cbi8vIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLFxuLy8gREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SXG4vLyBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFXG4vLyBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG4vLyByZXNvbHZlcyAuIGFuZCAuLiBlbGVtZW50cyBpbiBhIHBhdGggYXJyYXkgd2l0aCBkaXJlY3RvcnkgbmFtZXMgdGhlcmVcbi8vIG11c3QgYmUgbm8gc2xhc2hlcywgZW1wdHkgZWxlbWVudHMsIG9yIGRldmljZSBuYW1lcyAoYzpcXCkgaW4gdGhlIGFycmF5XG4vLyAoc28gYWxzbyBubyBsZWFkaW5nIGFuZCB0cmFpbGluZyBzbGFzaGVzIC0gaXQgZG9lcyBub3QgZGlzdGluZ3Vpc2hcbi8vIHJlbGF0aXZlIGFuZCBhYnNvbHV0ZSBwYXRocylcbmZ1bmN0aW9uIG5vcm1hbGl6ZUFycmF5KHBhcnRzLCBhbGxvd0Fib3ZlUm9vdCkge1xuICAvLyBpZiB0aGUgcGF0aCB0cmllcyB0byBnbyBhYm92ZSB0aGUgcm9vdCwgYHVwYCBlbmRzIHVwID4gMFxuICB2YXIgdXAgPSAwO1xuICBmb3IgKHZhciBpID0gcGFydHMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICB2YXIgbGFzdCA9IHBhcnRzW2ldO1xuICAgIGlmIChsYXN0ID09PSAnLicpIHtcbiAgICAgIHBhcnRzLnNwbGljZShpLCAxKTtcbiAgICB9IGVsc2UgaWYgKGxhc3QgPT09ICcuLicpIHtcbiAgICAgIHBhcnRzLnNwbGljZShpLCAxKTtcbiAgICAgIHVwKys7XG4gICAgfSBlbHNlIGlmICh1cCkge1xuICAgICAgcGFydHMuc3BsaWNlKGksIDEpO1xuICAgICAgdXAtLTtcbiAgICB9XG4gIH1cblxuICAvLyBpZiB0aGUgcGF0aCBpcyBhbGxvd2VkIHRvIGdvIGFib3ZlIHRoZSByb290LCByZXN0b3JlIGxlYWRpbmcgLi5zXG4gIGlmIChhbGxvd0Fib3ZlUm9vdCkge1xuICAgIGZvciAoOyB1cC0tOyB1cCkge1xuICAgICAgcGFydHMudW5zaGlmdCgnLi4nKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gcGFydHM7XG59XG5cbi8vIFNwbGl0IGEgZmlsZW5hbWUgaW50byBbcm9vdCwgZGlyLCBiYXNlbmFtZSwgZXh0XSwgdW5peCB2ZXJzaW9uXG4vLyAncm9vdCcgaXMganVzdCBhIHNsYXNoLCBvciBub3RoaW5nLlxudmFyIHNwbGl0UGF0aFJlID1cbiAgICAvXihcXC8/fCkoW1xcc1xcU10qPykoKD86XFwuezEsMn18W15cXC9dKz98KShcXC5bXi5cXC9dKnwpKSg/OltcXC9dKikkLztcbnZhciBzcGxpdFBhdGggPSBmdW5jdGlvbihmaWxlbmFtZSkge1xuICByZXR1cm4gc3BsaXRQYXRoUmUuZXhlYyhmaWxlbmFtZSkuc2xpY2UoMSk7XG59O1xuXG4vLyBwYXRoLnJlc29sdmUoW2Zyb20gLi4uXSwgdG8pXG4vLyBwb3NpeCB2ZXJzaW9uXG5leHBvcnRzLnJlc29sdmUgPSBmdW5jdGlvbigpIHtcbiAgdmFyIHJlc29sdmVkUGF0aCA9ICcnLFxuICAgICAgcmVzb2x2ZWRBYnNvbHV0ZSA9IGZhbHNlO1xuXG4gIGZvciAodmFyIGkgPSBhcmd1bWVudHMubGVuZ3RoIC0gMTsgaSA+PSAtMSAmJiAhcmVzb2x2ZWRBYnNvbHV0ZTsgaS0tKSB7XG4gICAgdmFyIHBhdGggPSAoaSA+PSAwKSA/IGFyZ3VtZW50c1tpXSA6IHByb2Nlc3MuY3dkKCk7XG5cbiAgICAvLyBTa2lwIGVtcHR5IGFuZCBpbnZhbGlkIGVudHJpZXNcbiAgICBpZiAodHlwZW9mIHBhdGggIT09ICdzdHJpbmcnKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdBcmd1bWVudHMgdG8gcGF0aC5yZXNvbHZlIG11c3QgYmUgc3RyaW5ncycpO1xuICAgIH0gZWxzZSBpZiAoIXBhdGgpIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIHJlc29sdmVkUGF0aCA9IHBhdGggKyAnLycgKyByZXNvbHZlZFBhdGg7XG4gICAgcmVzb2x2ZWRBYnNvbHV0ZSA9IHBhdGguY2hhckF0KDApID09PSAnLyc7XG4gIH1cblxuICAvLyBBdCB0aGlzIHBvaW50IHRoZSBwYXRoIHNob3VsZCBiZSByZXNvbHZlZCB0byBhIGZ1bGwgYWJzb2x1dGUgcGF0aCwgYnV0XG4gIC8vIGhhbmRsZSByZWxhdGl2ZSBwYXRocyB0byBiZSBzYWZlIChtaWdodCBoYXBwZW4gd2hlbiBwcm9jZXNzLmN3ZCgpIGZhaWxzKVxuXG4gIC8vIE5vcm1hbGl6ZSB0aGUgcGF0aFxuICByZXNvbHZlZFBhdGggPSBub3JtYWxpemVBcnJheShmaWx0ZXIocmVzb2x2ZWRQYXRoLnNwbGl0KCcvJyksIGZ1bmN0aW9uKHApIHtcbiAgICByZXR1cm4gISFwO1xuICB9KSwgIXJlc29sdmVkQWJzb2x1dGUpLmpvaW4oJy8nKTtcblxuICByZXR1cm4gKChyZXNvbHZlZEFic29sdXRlID8gJy8nIDogJycpICsgcmVzb2x2ZWRQYXRoKSB8fCAnLic7XG59O1xuXG4vLyBwYXRoLm5vcm1hbGl6ZShwYXRoKVxuLy8gcG9zaXggdmVyc2lvblxuZXhwb3J0cy5ub3JtYWxpemUgPSBmdW5jdGlvbihwYXRoKSB7XG4gIHZhciBpc0Fic29sdXRlID0gZXhwb3J0cy5pc0Fic29sdXRlKHBhdGgpLFxuICAgICAgdHJhaWxpbmdTbGFzaCA9IHN1YnN0cihwYXRoLCAtMSkgPT09ICcvJztcblxuICAvLyBOb3JtYWxpemUgdGhlIHBhdGhcbiAgcGF0aCA9IG5vcm1hbGl6ZUFycmF5KGZpbHRlcihwYXRoLnNwbGl0KCcvJyksIGZ1bmN0aW9uKHApIHtcbiAgICByZXR1cm4gISFwO1xuICB9KSwgIWlzQWJzb2x1dGUpLmpvaW4oJy8nKTtcblxuICBpZiAoIXBhdGggJiYgIWlzQWJzb2x1dGUpIHtcbiAgICBwYXRoID0gJy4nO1xuICB9XG4gIGlmIChwYXRoICYmIHRyYWlsaW5nU2xhc2gpIHtcbiAgICBwYXRoICs9ICcvJztcbiAgfVxuXG4gIHJldHVybiAoaXNBYnNvbHV0ZSA/ICcvJyA6ICcnKSArIHBhdGg7XG59O1xuXG4vLyBwb3NpeCB2ZXJzaW9uXG5leHBvcnRzLmlzQWJzb2x1dGUgPSBmdW5jdGlvbihwYXRoKSB7XG4gIHJldHVybiBwYXRoLmNoYXJBdCgwKSA9PT0gJy8nO1xufTtcblxuLy8gcG9zaXggdmVyc2lvblxuZXhwb3J0cy5qb2luID0gZnVuY3Rpb24oKSB7XG4gIHZhciBwYXRocyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMCk7XG4gIHJldHVybiBleHBvcnRzLm5vcm1hbGl6ZShmaWx0ZXIocGF0aHMsIGZ1bmN0aW9uKHAsIGluZGV4KSB7XG4gICAgaWYgKHR5cGVvZiBwICE9PSAnc3RyaW5nJykge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQXJndW1lbnRzIHRvIHBhdGguam9pbiBtdXN0IGJlIHN0cmluZ3MnKTtcbiAgICB9XG4gICAgcmV0dXJuIHA7XG4gIH0pLmpvaW4oJy8nKSk7XG59O1xuXG5cbi8vIHBhdGgucmVsYXRpdmUoZnJvbSwgdG8pXG4vLyBwb3NpeCB2ZXJzaW9uXG5leHBvcnRzLnJlbGF0aXZlID0gZnVuY3Rpb24oZnJvbSwgdG8pIHtcbiAgZnJvbSA9IGV4cG9ydHMucmVzb2x2ZShmcm9tKS5zdWJzdHIoMSk7XG4gIHRvID0gZXhwb3J0cy5yZXNvbHZlKHRvKS5zdWJzdHIoMSk7XG5cbiAgZnVuY3Rpb24gdHJpbShhcnIpIHtcbiAgICB2YXIgc3RhcnQgPSAwO1xuICAgIGZvciAoOyBzdGFydCA8IGFyci5sZW5ndGg7IHN0YXJ0KyspIHtcbiAgICAgIGlmIChhcnJbc3RhcnRdICE9PSAnJykgYnJlYWs7XG4gICAgfVxuXG4gICAgdmFyIGVuZCA9IGFyci5sZW5ndGggLSAxO1xuICAgIGZvciAoOyBlbmQgPj0gMDsgZW5kLS0pIHtcbiAgICAgIGlmIChhcnJbZW5kXSAhPT0gJycpIGJyZWFrO1xuICAgIH1cblxuICAgIGlmIChzdGFydCA+IGVuZCkgcmV0dXJuIFtdO1xuICAgIHJldHVybiBhcnIuc2xpY2Uoc3RhcnQsIGVuZCAtIHN0YXJ0ICsgMSk7XG4gIH1cblxuICB2YXIgZnJvbVBhcnRzID0gdHJpbShmcm9tLnNwbGl0KCcvJykpO1xuICB2YXIgdG9QYXJ0cyA9IHRyaW0odG8uc3BsaXQoJy8nKSk7XG5cbiAgdmFyIGxlbmd0aCA9IE1hdGgubWluKGZyb21QYXJ0cy5sZW5ndGgsIHRvUGFydHMubGVuZ3RoKTtcbiAgdmFyIHNhbWVQYXJ0c0xlbmd0aCA9IGxlbmd0aDtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgIGlmIChmcm9tUGFydHNbaV0gIT09IHRvUGFydHNbaV0pIHtcbiAgICAgIHNhbWVQYXJ0c0xlbmd0aCA9IGk7XG4gICAgICBicmVhaztcbiAgICB9XG4gIH1cblxuICB2YXIgb3V0cHV0UGFydHMgPSBbXTtcbiAgZm9yICh2YXIgaSA9IHNhbWVQYXJ0c0xlbmd0aDsgaSA8IGZyb21QYXJ0cy5sZW5ndGg7IGkrKykge1xuICAgIG91dHB1dFBhcnRzLnB1c2goJy4uJyk7XG4gIH1cblxuICBvdXRwdXRQYXJ0cyA9IG91dHB1dFBhcnRzLmNvbmNhdCh0b1BhcnRzLnNsaWNlKHNhbWVQYXJ0c0xlbmd0aCkpO1xuXG4gIHJldHVybiBvdXRwdXRQYXJ0cy5qb2luKCcvJyk7XG59O1xuXG5leHBvcnRzLnNlcCA9ICcvJztcbmV4cG9ydHMuZGVsaW1pdGVyID0gJzonO1xuXG5leHBvcnRzLmRpcm5hbWUgPSBmdW5jdGlvbihwYXRoKSB7XG4gIHZhciByZXN1bHQgPSBzcGxpdFBhdGgocGF0aCksXG4gICAgICByb290ID0gcmVzdWx0WzBdLFxuICAgICAgZGlyID0gcmVzdWx0WzFdO1xuXG4gIGlmICghcm9vdCAmJiAhZGlyKSB7XG4gICAgLy8gTm8gZGlybmFtZSB3aGF0c29ldmVyXG4gICAgcmV0dXJuICcuJztcbiAgfVxuXG4gIGlmIChkaXIpIHtcbiAgICAvLyBJdCBoYXMgYSBkaXJuYW1lLCBzdHJpcCB0cmFpbGluZyBzbGFzaFxuICAgIGRpciA9IGRpci5zdWJzdHIoMCwgZGlyLmxlbmd0aCAtIDEpO1xuICB9XG5cbiAgcmV0dXJuIHJvb3QgKyBkaXI7XG59O1xuXG5cbmV4cG9ydHMuYmFzZW5hbWUgPSBmdW5jdGlvbihwYXRoLCBleHQpIHtcbiAgdmFyIGYgPSBzcGxpdFBhdGgocGF0aClbMl07XG4gIC8vIFRPRE86IG1ha2UgdGhpcyBjb21wYXJpc29uIGNhc2UtaW5zZW5zaXRpdmUgb24gd2luZG93cz9cbiAgaWYgKGV4dCAmJiBmLnN1YnN0cigtMSAqIGV4dC5sZW5ndGgpID09PSBleHQpIHtcbiAgICBmID0gZi5zdWJzdHIoMCwgZi5sZW5ndGggLSBleHQubGVuZ3RoKTtcbiAgfVxuICByZXR1cm4gZjtcbn07XG5cblxuZXhwb3J0cy5leHRuYW1lID0gZnVuY3Rpb24ocGF0aCkge1xuICByZXR1cm4gc3BsaXRQYXRoKHBhdGgpWzNdO1xufTtcblxuZnVuY3Rpb24gZmlsdGVyICh4cywgZikge1xuICAgIGlmICh4cy5maWx0ZXIpIHJldHVybiB4cy5maWx0ZXIoZik7XG4gICAgdmFyIHJlcyA9IFtdO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgeHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKGYoeHNbaV0sIGksIHhzKSkgcmVzLnB1c2goeHNbaV0pO1xuICAgIH1cbiAgICByZXR1cm4gcmVzO1xufVxuXG4vLyBTdHJpbmcucHJvdG90eXBlLnN1YnN0ciAtIG5lZ2F0aXZlIGluZGV4IGRvbid0IHdvcmsgaW4gSUU4XG52YXIgc3Vic3RyID0gJ2FiJy5zdWJzdHIoLTEpID09PSAnYidcbiAgICA/IGZ1bmN0aW9uIChzdHIsIHN0YXJ0LCBsZW4pIHsgcmV0dXJuIHN0ci5zdWJzdHIoc3RhcnQsIGxlbikgfVxuICAgIDogZnVuY3Rpb24gKHN0ciwgc3RhcnQsIGxlbikge1xuICAgICAgICBpZiAoc3RhcnQgPCAwKSBzdGFydCA9IHN0ci5sZW5ndGggKyBzdGFydDtcbiAgICAgICAgcmV0dXJuIHN0ci5zdWJzdHIoc3RhcnQsIGxlbik7XG4gICAgfVxuO1xuIl19
},{"_process":14}],14:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};
var queue = [];
var draining = false;

function drainQueue() {
    if (draining) {
        return;
    }
    draining = true;
    var currentQueue;
    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        var i = -1;
        while (++i < len) {
            currentQueue[i]();
        }
        len = queue.length;
    }
    draining = false;
}
process.nextTick = function (fun) {
    queue.push(fun);
    if (!draining) {
        setTimeout(drainQueue, 0);
    }
};

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],15:[function(require,module,exports){
(function (global){
/*! http://mths.be/punycode v1.2.4 by @mathias */
;(function(root) {

	/** Detect free variables */
	var freeExports = typeof exports == 'object' && exports;
	var freeModule = typeof module == 'object' && module &&
		module.exports == freeExports && module;
	var freeGlobal = typeof global == 'object' && global;
	if (freeGlobal.global === freeGlobal || freeGlobal.window === freeGlobal) {
		root = freeGlobal;
	}

	/**
	 * The `punycode` object.
	 * @name punycode
	 * @type Object
	 */
	var punycode,

	/** Highest positive signed 32-bit float value */
	maxInt = 2147483647, // aka. 0x7FFFFFFF or 2^31-1

	/** Bootstring parameters */
	base = 36,
	tMin = 1,
	tMax = 26,
	skew = 38,
	damp = 700,
	initialBias = 72,
	initialN = 128, // 0x80
	delimiter = '-', // '\x2D'

	/** Regular expressions */
	regexPunycode = /^xn--/,
	regexNonASCII = /[^ -~]/, // unprintable ASCII chars + non-ASCII chars
	regexSeparators = /\x2E|\u3002|\uFF0E|\uFF61/g, // RFC 3490 separators

	/** Error messages */
	errors = {
		'overflow': 'Overflow: input needs wider integers to process',
		'not-basic': 'Illegal input >= 0x80 (not a basic code point)',
		'invalid-input': 'Invalid input'
	},

	/** Convenience shortcuts */
	baseMinusTMin = base - tMin,
	floor = Math.floor,
	stringFromCharCode = String.fromCharCode,

	/** Temporary variable */
	key;

	/*--------------------------------------------------------------------------*/

	/**
	 * A generic error utility function.
	 * @private
	 * @param {String} type The error type.
	 * @returns {Error} Throws a `RangeError` with the applicable error message.
	 */
	function error(type) {
		throw RangeError(errors[type]);
	}

	/**
	 * A generic `Array#map` utility function.
	 * @private
	 * @param {Array} array The array to iterate over.
	 * @param {Function} callback The function that gets called for every array
	 * item.
	 * @returns {Array} A new array of values returned by the callback function.
	 */
	function map(array, fn) {
		var length = array.length;
		while (length--) {
			array[length] = fn(array[length]);
		}
		return array;
	}

	/**
	 * A simple `Array#map`-like wrapper to work with domain name strings.
	 * @private
	 * @param {String} domain The domain name.
	 * @param {Function} callback The function that gets called for every
	 * character.
	 * @returns {Array} A new string of characters returned by the callback
	 * function.
	 */
	function mapDomain(string, fn) {
		return map(string.split(regexSeparators), fn).join('.');
	}

	/**
	 * Creates an array containing the numeric code points of each Unicode
	 * character in the string. While JavaScript uses UCS-2 internally,
	 * this function will convert a pair of surrogate halves (each of which
	 * UCS-2 exposes as separate characters) into a single code point,
	 * matching UTF-16.
	 * @see `punycode.ucs2.encode`
	 * @see <http://mathiasbynens.be/notes/javascript-encoding>
	 * @memberOf punycode.ucs2
	 * @name decode
	 * @param {String} string The Unicode input string (UCS-2).
	 * @returns {Array} The new array of code points.
	 */
	function ucs2decode(string) {
		var output = [],
		    counter = 0,
		    length = string.length,
		    value,
		    extra;
		while (counter < length) {
			value = string.charCodeAt(counter++);
			if (value >= 0xD800 && value <= 0xDBFF && counter < length) {
				// high surrogate, and there is a next character
				extra = string.charCodeAt(counter++);
				if ((extra & 0xFC00) == 0xDC00) { // low surrogate
					output.push(((value & 0x3FF) << 10) + (extra & 0x3FF) + 0x10000);
				} else {
					// unmatched surrogate; only append this code unit, in case the next
					// code unit is the high surrogate of a surrogate pair
					output.push(value);
					counter--;
				}
			} else {
				output.push(value);
			}
		}
		return output;
	}

	/**
	 * Creates a string based on an array of numeric code points.
	 * @see `punycode.ucs2.decode`
	 * @memberOf punycode.ucs2
	 * @name encode
	 * @param {Array} codePoints The array of numeric code points.
	 * @returns {String} The new Unicode string (UCS-2).
	 */
	function ucs2encode(array) {
		return map(array, function(value) {
			var output = '';
			if (value > 0xFFFF) {
				value -= 0x10000;
				output += stringFromCharCode(value >>> 10 & 0x3FF | 0xD800);
				value = 0xDC00 | value & 0x3FF;
			}
			output += stringFromCharCode(value);
			return output;
		}).join('');
	}

	/**
	 * Converts a basic code point into a digit/integer.
	 * @see `digitToBasic()`
	 * @private
	 * @param {Number} codePoint The basic numeric code point value.
	 * @returns {Number} The numeric value of a basic code point (for use in
	 * representing integers) in the range `0` to `base - 1`, or `base` if
	 * the code point does not represent a value.
	 */
	function basicToDigit(codePoint) {
		if (codePoint - 48 < 10) {
			return codePoint - 22;
		}
		if (codePoint - 65 < 26) {
			return codePoint - 65;
		}
		if (codePoint - 97 < 26) {
			return codePoint - 97;
		}
		return base;
	}

	/**
	 * Converts a digit/integer into a basic code point.
	 * @see `basicToDigit()`
	 * @private
	 * @param {Number} digit The numeric value of a basic code point.
	 * @returns {Number} The basic code point whose value (when used for
	 * representing integers) is `digit`, which needs to be in the range
	 * `0` to `base - 1`. If `flag` is non-zero, the uppercase form is
	 * used; else, the lowercase form is used. The behavior is undefined
	 * if `flag` is non-zero and `digit` has no uppercase form.
	 */
	function digitToBasic(digit, flag) {
		//  0..25 map to ASCII a..z or A..Z
		// 26..35 map to ASCII 0..9
		return digit + 22 + 75 * (digit < 26) - ((flag != 0) << 5);
	}

	/**
	 * Bias adaptation function as per section 3.4 of RFC 3492.
	 * http://tools.ietf.org/html/rfc3492#section-3.4
	 * @private
	 */
	function adapt(delta, numPoints, firstTime) {
		var k = 0;
		delta = firstTime ? floor(delta / damp) : delta >> 1;
		delta += floor(delta / numPoints);
		for (/* no initialization */; delta > baseMinusTMin * tMax >> 1; k += base) {
			delta = floor(delta / baseMinusTMin);
		}
		return floor(k + (baseMinusTMin + 1) * delta / (delta + skew));
	}

	/**
	 * Converts a Punycode string of ASCII-only symbols to a string of Unicode
	 * symbols.
	 * @memberOf punycode
	 * @param {String} input The Punycode string of ASCII-only symbols.
	 * @returns {String} The resulting string of Unicode symbols.
	 */
	function decode(input) {
		// Don't use UCS-2
		var output = [],
		    inputLength = input.length,
		    out,
		    i = 0,
		    n = initialN,
		    bias = initialBias,
		    basic,
		    j,
		    index,
		    oldi,
		    w,
		    k,
		    digit,
		    t,
		    /** Cached calculation results */
		    baseMinusT;

		// Handle the basic code points: let `basic` be the number of input code
		// points before the last delimiter, or `0` if there is none, then copy
		// the first basic code points to the output.

		basic = input.lastIndexOf(delimiter);
		if (basic < 0) {
			basic = 0;
		}

		for (j = 0; j < basic; ++j) {
			// if it's not a basic code point
			if (input.charCodeAt(j) >= 0x80) {
				error('not-basic');
			}
			output.push(input.charCodeAt(j));
		}

		// Main decoding loop: start just after the last delimiter if any basic code
		// points were copied; start at the beginning otherwise.

		for (index = basic > 0 ? basic + 1 : 0; index < inputLength; /* no final expression */) {

			// `index` is the index of the next character to be consumed.
			// Decode a generalized variable-length integer into `delta`,
			// which gets added to `i`. The overflow checking is easier
			// if we increase `i` as we go, then subtract off its starting
			// value at the end to obtain `delta`.
			for (oldi = i, w = 1, k = base; /* no condition */; k += base) {

				if (index >= inputLength) {
					error('invalid-input');
				}

				digit = basicToDigit(input.charCodeAt(index++));

				if (digit >= base || digit > floor((maxInt - i) / w)) {
					error('overflow');
				}

				i += digit * w;
				t = k <= bias ? tMin : (k >= bias + tMax ? tMax : k - bias);

				if (digit < t) {
					break;
				}

				baseMinusT = base - t;
				if (w > floor(maxInt / baseMinusT)) {
					error('overflow');
				}

				w *= baseMinusT;

			}

			out = output.length + 1;
			bias = adapt(i - oldi, out, oldi == 0);

			// `i` was supposed to wrap around from `out` to `0`,
			// incrementing `n` each time, so we'll fix that now:
			if (floor(i / out) > maxInt - n) {
				error('overflow');
			}

			n += floor(i / out);
			i %= out;

			// Insert `n` at position `i` of the output
			output.splice(i++, 0, n);

		}

		return ucs2encode(output);
	}

	/**
	 * Converts a string of Unicode symbols to a Punycode string of ASCII-only
	 * symbols.
	 * @memberOf punycode
	 * @param {String} input The string of Unicode symbols.
	 * @returns {String} The resulting Punycode string of ASCII-only symbols.
	 */
	function encode(input) {
		var n,
		    delta,
		    handledCPCount,
		    basicLength,
		    bias,
		    j,
		    m,
		    q,
		    k,
		    t,
		    currentValue,
		    output = [],
		    /** `inputLength` will hold the number of code points in `input`. */
		    inputLength,
		    /** Cached calculation results */
		    handledCPCountPlusOne,
		    baseMinusT,
		    qMinusT;

		// Convert the input in UCS-2 to Unicode
		input = ucs2decode(input);

		// Cache the length
		inputLength = input.length;

		// Initialize the state
		n = initialN;
		delta = 0;
		bias = initialBias;

		// Handle the basic code points
		for (j = 0; j < inputLength; ++j) {
			currentValue = input[j];
			if (currentValue < 0x80) {
				output.push(stringFromCharCode(currentValue));
			}
		}

		handledCPCount = basicLength = output.length;

		// `handledCPCount` is the number of code points that have been handled;
		// `basicLength` is the number of basic code points.

		// Finish the basic string - if it is not empty - with a delimiter
		if (basicLength) {
			output.push(delimiter);
		}

		// Main encoding loop:
		while (handledCPCount < inputLength) {

			// All non-basic code points < n have been handled already. Find the next
			// larger one:
			for (m = maxInt, j = 0; j < inputLength; ++j) {
				currentValue = input[j];
				if (currentValue >= n && currentValue < m) {
					m = currentValue;
				}
			}

			// Increase `delta` enough to advance the decoder's <n,i> state to <m,0>,
			// but guard against overflow
			handledCPCountPlusOne = handledCPCount + 1;
			if (m - n > floor((maxInt - delta) / handledCPCountPlusOne)) {
				error('overflow');
			}

			delta += (m - n) * handledCPCountPlusOne;
			n = m;

			for (j = 0; j < inputLength; ++j) {
				currentValue = input[j];

				if (currentValue < n && ++delta > maxInt) {
					error('overflow');
				}

				if (currentValue == n) {
					// Represent delta as a generalized variable-length integer
					for (q = delta, k = base; /* no condition */; k += base) {
						t = k <= bias ? tMin : (k >= bias + tMax ? tMax : k - bias);
						if (q < t) {
							break;
						}
						qMinusT = q - t;
						baseMinusT = base - t;
						output.push(
							stringFromCharCode(digitToBasic(t + qMinusT % baseMinusT, 0))
						);
						q = floor(qMinusT / baseMinusT);
					}

					output.push(stringFromCharCode(digitToBasic(q, 0)));
					bias = adapt(delta, handledCPCountPlusOne, handledCPCount == basicLength);
					delta = 0;
					++handledCPCount;
				}
			}

			++delta;
			++n;

		}
		return output.join('');
	}

	/**
	 * Converts a Punycode string representing a domain name to Unicode. Only the
	 * Punycoded parts of the domain name will be converted, i.e. it doesn't
	 * matter if you call it on a string that has already been converted to
	 * Unicode.
	 * @memberOf punycode
	 * @param {String} domain The Punycode domain name to convert to Unicode.
	 * @returns {String} The Unicode representation of the given Punycode
	 * string.
	 */
	function toUnicode(domain) {
		return mapDomain(domain, function(string) {
			return regexPunycode.test(string)
				? decode(string.slice(4).toLowerCase())
				: string;
		});
	}

	/**
	 * Converts a Unicode string representing a domain name to Punycode. Only the
	 * non-ASCII parts of the domain name will be converted, i.e. it doesn't
	 * matter if you call it with a domain that's already in ASCII.
	 * @memberOf punycode
	 * @param {String} domain The domain name to convert, as a Unicode string.
	 * @returns {String} The Punycode representation of the given domain name.
	 */
	function toASCII(domain) {
		return mapDomain(domain, function(string) {
			return regexNonASCII.test(string)
				? 'xn--' + encode(string)
				: string;
		});
	}

	/*--------------------------------------------------------------------------*/

	/** Define the public API */
	punycode = {
		/**
		 * A string representing the current Punycode.js version number.
		 * @memberOf punycode
		 * @type String
		 */
		'version': '1.2.4',
		/**
		 * An object of methods to convert from JavaScript's internal character
		 * representation (UCS-2) to Unicode code points, and back.
		 * @see <http://mathiasbynens.be/notes/javascript-encoding>
		 * @memberOf punycode
		 * @type Object
		 */
		'ucs2': {
			'decode': ucs2decode,
			'encode': ucs2encode
		},
		'decode': decode,
		'encode': encode,
		'toASCII': toASCII,
		'toUnicode': toUnicode
	};

	/** Expose `punycode` */
	// Some AMD build optimizers, like r.js, check for specific condition patterns
	// like the following:
	if (
		typeof define == 'function' &&
		typeof define.amd == 'object' &&
		define.amd
	) {
		define('punycode', function() {
			return punycode;
		});
	} else if (freeExports && !freeExports.nodeType) {
		if (freeModule) { // in Node.js or RingoJS v0.8.0+
			freeModule.exports = punycode;
		} else { // in Narwhal or RingoJS v0.7.0-
			for (key in punycode) {
				punycode.hasOwnProperty(key) && (freeExports[key] = punycode[key]);
			}
		}
	} else { // in Rhino or a web browser
		root.punycode = punycode;
	}

}(this));

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL1JlcG9zaXRvcmllcy9nZXNzby5qcy9ub2RlX21vZHVsZXMvcHVueWNvZGUvcHVueWNvZGUuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIvKiEgaHR0cDovL210aHMuYmUvcHVueWNvZGUgdjEuMi40IGJ5IEBtYXRoaWFzICovXG47KGZ1bmN0aW9uKHJvb3QpIHtcblxuXHQvKiogRGV0ZWN0IGZyZWUgdmFyaWFibGVzICovXG5cdHZhciBmcmVlRXhwb3J0cyA9IHR5cGVvZiBleHBvcnRzID09ICdvYmplY3QnICYmIGV4cG9ydHM7XG5cdHZhciBmcmVlTW9kdWxlID0gdHlwZW9mIG1vZHVsZSA9PSAnb2JqZWN0JyAmJiBtb2R1bGUgJiZcblx0XHRtb2R1bGUuZXhwb3J0cyA9PSBmcmVlRXhwb3J0cyAmJiBtb2R1bGU7XG5cdHZhciBmcmVlR2xvYmFsID0gdHlwZW9mIGdsb2JhbCA9PSAnb2JqZWN0JyAmJiBnbG9iYWw7XG5cdGlmIChmcmVlR2xvYmFsLmdsb2JhbCA9PT0gZnJlZUdsb2JhbCB8fCBmcmVlR2xvYmFsLndpbmRvdyA9PT0gZnJlZUdsb2JhbCkge1xuXHRcdHJvb3QgPSBmcmVlR2xvYmFsO1xuXHR9XG5cblx0LyoqXG5cdCAqIFRoZSBgcHVueWNvZGVgIG9iamVjdC5cblx0ICogQG5hbWUgcHVueWNvZGVcblx0ICogQHR5cGUgT2JqZWN0XG5cdCAqL1xuXHR2YXIgcHVueWNvZGUsXG5cblx0LyoqIEhpZ2hlc3QgcG9zaXRpdmUgc2lnbmVkIDMyLWJpdCBmbG9hdCB2YWx1ZSAqL1xuXHRtYXhJbnQgPSAyMTQ3NDgzNjQ3LCAvLyBha2EuIDB4N0ZGRkZGRkYgb3IgMl4zMS0xXG5cblx0LyoqIEJvb3RzdHJpbmcgcGFyYW1ldGVycyAqL1xuXHRiYXNlID0gMzYsXG5cdHRNaW4gPSAxLFxuXHR0TWF4ID0gMjYsXG5cdHNrZXcgPSAzOCxcblx0ZGFtcCA9IDcwMCxcblx0aW5pdGlhbEJpYXMgPSA3Mixcblx0aW5pdGlhbE4gPSAxMjgsIC8vIDB4ODBcblx0ZGVsaW1pdGVyID0gJy0nLCAvLyAnXFx4MkQnXG5cblx0LyoqIFJlZ3VsYXIgZXhwcmVzc2lvbnMgKi9cblx0cmVnZXhQdW55Y29kZSA9IC9eeG4tLS8sXG5cdHJlZ2V4Tm9uQVNDSUkgPSAvW14gLX5dLywgLy8gdW5wcmludGFibGUgQVNDSUkgY2hhcnMgKyBub24tQVNDSUkgY2hhcnNcblx0cmVnZXhTZXBhcmF0b3JzID0gL1xceDJFfFxcdTMwMDJ8XFx1RkYwRXxcXHVGRjYxL2csIC8vIFJGQyAzNDkwIHNlcGFyYXRvcnNcblxuXHQvKiogRXJyb3IgbWVzc2FnZXMgKi9cblx0ZXJyb3JzID0ge1xuXHRcdCdvdmVyZmxvdyc6ICdPdmVyZmxvdzogaW5wdXQgbmVlZHMgd2lkZXIgaW50ZWdlcnMgdG8gcHJvY2VzcycsXG5cdFx0J25vdC1iYXNpYyc6ICdJbGxlZ2FsIGlucHV0ID49IDB4ODAgKG5vdCBhIGJhc2ljIGNvZGUgcG9pbnQpJyxcblx0XHQnaW52YWxpZC1pbnB1dCc6ICdJbnZhbGlkIGlucHV0J1xuXHR9LFxuXG5cdC8qKiBDb252ZW5pZW5jZSBzaG9ydGN1dHMgKi9cblx0YmFzZU1pbnVzVE1pbiA9IGJhc2UgLSB0TWluLFxuXHRmbG9vciA9IE1hdGguZmxvb3IsXG5cdHN0cmluZ0Zyb21DaGFyQ29kZSA9IFN0cmluZy5mcm9tQ2hhckNvZGUsXG5cblx0LyoqIFRlbXBvcmFyeSB2YXJpYWJsZSAqL1xuXHRrZXk7XG5cblx0LyotLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSovXG5cblx0LyoqXG5cdCAqIEEgZ2VuZXJpYyBlcnJvciB1dGlsaXR5IGZ1bmN0aW9uLlxuXHQgKiBAcHJpdmF0ZVxuXHQgKiBAcGFyYW0ge1N0cmluZ30gdHlwZSBUaGUgZXJyb3IgdHlwZS5cblx0ICogQHJldHVybnMge0Vycm9yfSBUaHJvd3MgYSBgUmFuZ2VFcnJvcmAgd2l0aCB0aGUgYXBwbGljYWJsZSBlcnJvciBtZXNzYWdlLlxuXHQgKi9cblx0ZnVuY3Rpb24gZXJyb3IodHlwZSkge1xuXHRcdHRocm93IFJhbmdlRXJyb3IoZXJyb3JzW3R5cGVdKTtcblx0fVxuXG5cdC8qKlxuXHQgKiBBIGdlbmVyaWMgYEFycmF5I21hcGAgdXRpbGl0eSBmdW5jdGlvbi5cblx0ICogQHByaXZhdGVcblx0ICogQHBhcmFtIHtBcnJheX0gYXJyYXkgVGhlIGFycmF5IHRvIGl0ZXJhdGUgb3Zlci5cblx0ICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgVGhlIGZ1bmN0aW9uIHRoYXQgZ2V0cyBjYWxsZWQgZm9yIGV2ZXJ5IGFycmF5XG5cdCAqIGl0ZW0uXG5cdCAqIEByZXR1cm5zIHtBcnJheX0gQSBuZXcgYXJyYXkgb2YgdmFsdWVzIHJldHVybmVkIGJ5IHRoZSBjYWxsYmFjayBmdW5jdGlvbi5cblx0ICovXG5cdGZ1bmN0aW9uIG1hcChhcnJheSwgZm4pIHtcblx0XHR2YXIgbGVuZ3RoID0gYXJyYXkubGVuZ3RoO1xuXHRcdHdoaWxlIChsZW5ndGgtLSkge1xuXHRcdFx0YXJyYXlbbGVuZ3RoXSA9IGZuKGFycmF5W2xlbmd0aF0pO1xuXHRcdH1cblx0XHRyZXR1cm4gYXJyYXk7XG5cdH1cblxuXHQvKipcblx0ICogQSBzaW1wbGUgYEFycmF5I21hcGAtbGlrZSB3cmFwcGVyIHRvIHdvcmsgd2l0aCBkb21haW4gbmFtZSBzdHJpbmdzLlxuXHQgKiBAcHJpdmF0ZVxuXHQgKiBAcGFyYW0ge1N0cmluZ30gZG9tYWluIFRoZSBkb21haW4gbmFtZS5cblx0ICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgVGhlIGZ1bmN0aW9uIHRoYXQgZ2V0cyBjYWxsZWQgZm9yIGV2ZXJ5XG5cdCAqIGNoYXJhY3Rlci5cblx0ICogQHJldHVybnMge0FycmF5fSBBIG5ldyBzdHJpbmcgb2YgY2hhcmFjdGVycyByZXR1cm5lZCBieSB0aGUgY2FsbGJhY2tcblx0ICogZnVuY3Rpb24uXG5cdCAqL1xuXHRmdW5jdGlvbiBtYXBEb21haW4oc3RyaW5nLCBmbikge1xuXHRcdHJldHVybiBtYXAoc3RyaW5nLnNwbGl0KHJlZ2V4U2VwYXJhdG9ycyksIGZuKS5qb2luKCcuJyk7XG5cdH1cblxuXHQvKipcblx0ICogQ3JlYXRlcyBhbiBhcnJheSBjb250YWluaW5nIHRoZSBudW1lcmljIGNvZGUgcG9pbnRzIG9mIGVhY2ggVW5pY29kZVxuXHQgKiBjaGFyYWN0ZXIgaW4gdGhlIHN0cmluZy4gV2hpbGUgSmF2YVNjcmlwdCB1c2VzIFVDUy0yIGludGVybmFsbHksXG5cdCAqIHRoaXMgZnVuY3Rpb24gd2lsbCBjb252ZXJ0IGEgcGFpciBvZiBzdXJyb2dhdGUgaGFsdmVzIChlYWNoIG9mIHdoaWNoXG5cdCAqIFVDUy0yIGV4cG9zZXMgYXMgc2VwYXJhdGUgY2hhcmFjdGVycykgaW50byBhIHNpbmdsZSBjb2RlIHBvaW50LFxuXHQgKiBtYXRjaGluZyBVVEYtMTYuXG5cdCAqIEBzZWUgYHB1bnljb2RlLnVjczIuZW5jb2RlYFxuXHQgKiBAc2VlIDxodHRwOi8vbWF0aGlhc2J5bmVucy5iZS9ub3Rlcy9qYXZhc2NyaXB0LWVuY29kaW5nPlxuXHQgKiBAbWVtYmVyT2YgcHVueWNvZGUudWNzMlxuXHQgKiBAbmFtZSBkZWNvZGVcblx0ICogQHBhcmFtIHtTdHJpbmd9IHN0cmluZyBUaGUgVW5pY29kZSBpbnB1dCBzdHJpbmcgKFVDUy0yKS5cblx0ICogQHJldHVybnMge0FycmF5fSBUaGUgbmV3IGFycmF5IG9mIGNvZGUgcG9pbnRzLlxuXHQgKi9cblx0ZnVuY3Rpb24gdWNzMmRlY29kZShzdHJpbmcpIHtcblx0XHR2YXIgb3V0cHV0ID0gW10sXG5cdFx0ICAgIGNvdW50ZXIgPSAwLFxuXHRcdCAgICBsZW5ndGggPSBzdHJpbmcubGVuZ3RoLFxuXHRcdCAgICB2YWx1ZSxcblx0XHQgICAgZXh0cmE7XG5cdFx0d2hpbGUgKGNvdW50ZXIgPCBsZW5ndGgpIHtcblx0XHRcdHZhbHVlID0gc3RyaW5nLmNoYXJDb2RlQXQoY291bnRlcisrKTtcblx0XHRcdGlmICh2YWx1ZSA+PSAweEQ4MDAgJiYgdmFsdWUgPD0gMHhEQkZGICYmIGNvdW50ZXIgPCBsZW5ndGgpIHtcblx0XHRcdFx0Ly8gaGlnaCBzdXJyb2dhdGUsIGFuZCB0aGVyZSBpcyBhIG5leHQgY2hhcmFjdGVyXG5cdFx0XHRcdGV4dHJhID0gc3RyaW5nLmNoYXJDb2RlQXQoY291bnRlcisrKTtcblx0XHRcdFx0aWYgKChleHRyYSAmIDB4RkMwMCkgPT0gMHhEQzAwKSB7IC8vIGxvdyBzdXJyb2dhdGVcblx0XHRcdFx0XHRvdXRwdXQucHVzaCgoKHZhbHVlICYgMHgzRkYpIDw8IDEwKSArIChleHRyYSAmIDB4M0ZGKSArIDB4MTAwMDApO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdC8vIHVubWF0Y2hlZCBzdXJyb2dhdGU7IG9ubHkgYXBwZW5kIHRoaXMgY29kZSB1bml0LCBpbiBjYXNlIHRoZSBuZXh0XG5cdFx0XHRcdFx0Ly8gY29kZSB1bml0IGlzIHRoZSBoaWdoIHN1cnJvZ2F0ZSBvZiBhIHN1cnJvZ2F0ZSBwYWlyXG5cdFx0XHRcdFx0b3V0cHV0LnB1c2godmFsdWUpO1xuXHRcdFx0XHRcdGNvdW50ZXItLTtcblx0XHRcdFx0fVxuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0b3V0cHV0LnB1c2godmFsdWUpO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRyZXR1cm4gb3V0cHV0O1xuXHR9XG5cblx0LyoqXG5cdCAqIENyZWF0ZXMgYSBzdHJpbmcgYmFzZWQgb24gYW4gYXJyYXkgb2YgbnVtZXJpYyBjb2RlIHBvaW50cy5cblx0ICogQHNlZSBgcHVueWNvZGUudWNzMi5kZWNvZGVgXG5cdCAqIEBtZW1iZXJPZiBwdW55Y29kZS51Y3MyXG5cdCAqIEBuYW1lIGVuY29kZVxuXHQgKiBAcGFyYW0ge0FycmF5fSBjb2RlUG9pbnRzIFRoZSBhcnJheSBvZiBudW1lcmljIGNvZGUgcG9pbnRzLlxuXHQgKiBAcmV0dXJucyB7U3RyaW5nfSBUaGUgbmV3IFVuaWNvZGUgc3RyaW5nIChVQ1MtMikuXG5cdCAqL1xuXHRmdW5jdGlvbiB1Y3MyZW5jb2RlKGFycmF5KSB7XG5cdFx0cmV0dXJuIG1hcChhcnJheSwgZnVuY3Rpb24odmFsdWUpIHtcblx0XHRcdHZhciBvdXRwdXQgPSAnJztcblx0XHRcdGlmICh2YWx1ZSA+IDB4RkZGRikge1xuXHRcdFx0XHR2YWx1ZSAtPSAweDEwMDAwO1xuXHRcdFx0XHRvdXRwdXQgKz0gc3RyaW5nRnJvbUNoYXJDb2RlKHZhbHVlID4+PiAxMCAmIDB4M0ZGIHwgMHhEODAwKTtcblx0XHRcdFx0dmFsdWUgPSAweERDMDAgfCB2YWx1ZSAmIDB4M0ZGO1xuXHRcdFx0fVxuXHRcdFx0b3V0cHV0ICs9IHN0cmluZ0Zyb21DaGFyQ29kZSh2YWx1ZSk7XG5cdFx0XHRyZXR1cm4gb3V0cHV0O1xuXHRcdH0pLmpvaW4oJycpO1xuXHR9XG5cblx0LyoqXG5cdCAqIENvbnZlcnRzIGEgYmFzaWMgY29kZSBwb2ludCBpbnRvIGEgZGlnaXQvaW50ZWdlci5cblx0ICogQHNlZSBgZGlnaXRUb0Jhc2ljKClgXG5cdCAqIEBwcml2YXRlXG5cdCAqIEBwYXJhbSB7TnVtYmVyfSBjb2RlUG9pbnQgVGhlIGJhc2ljIG51bWVyaWMgY29kZSBwb2ludCB2YWx1ZS5cblx0ICogQHJldHVybnMge051bWJlcn0gVGhlIG51bWVyaWMgdmFsdWUgb2YgYSBiYXNpYyBjb2RlIHBvaW50IChmb3IgdXNlIGluXG5cdCAqIHJlcHJlc2VudGluZyBpbnRlZ2VycykgaW4gdGhlIHJhbmdlIGAwYCB0byBgYmFzZSAtIDFgLCBvciBgYmFzZWAgaWZcblx0ICogdGhlIGNvZGUgcG9pbnQgZG9lcyBub3QgcmVwcmVzZW50IGEgdmFsdWUuXG5cdCAqL1xuXHRmdW5jdGlvbiBiYXNpY1RvRGlnaXQoY29kZVBvaW50KSB7XG5cdFx0aWYgKGNvZGVQb2ludCAtIDQ4IDwgMTApIHtcblx0XHRcdHJldHVybiBjb2RlUG9pbnQgLSAyMjtcblx0XHR9XG5cdFx0aWYgKGNvZGVQb2ludCAtIDY1IDwgMjYpIHtcblx0XHRcdHJldHVybiBjb2RlUG9pbnQgLSA2NTtcblx0XHR9XG5cdFx0aWYgKGNvZGVQb2ludCAtIDk3IDwgMjYpIHtcblx0XHRcdHJldHVybiBjb2RlUG9pbnQgLSA5Nztcblx0XHR9XG5cdFx0cmV0dXJuIGJhc2U7XG5cdH1cblxuXHQvKipcblx0ICogQ29udmVydHMgYSBkaWdpdC9pbnRlZ2VyIGludG8gYSBiYXNpYyBjb2RlIHBvaW50LlxuXHQgKiBAc2VlIGBiYXNpY1RvRGlnaXQoKWBcblx0ICogQHByaXZhdGVcblx0ICogQHBhcmFtIHtOdW1iZXJ9IGRpZ2l0IFRoZSBudW1lcmljIHZhbHVlIG9mIGEgYmFzaWMgY29kZSBwb2ludC5cblx0ICogQHJldHVybnMge051bWJlcn0gVGhlIGJhc2ljIGNvZGUgcG9pbnQgd2hvc2UgdmFsdWUgKHdoZW4gdXNlZCBmb3Jcblx0ICogcmVwcmVzZW50aW5nIGludGVnZXJzKSBpcyBgZGlnaXRgLCB3aGljaCBuZWVkcyB0byBiZSBpbiB0aGUgcmFuZ2Vcblx0ICogYDBgIHRvIGBiYXNlIC0gMWAuIElmIGBmbGFnYCBpcyBub24temVybywgdGhlIHVwcGVyY2FzZSBmb3JtIGlzXG5cdCAqIHVzZWQ7IGVsc2UsIHRoZSBsb3dlcmNhc2UgZm9ybSBpcyB1c2VkLiBUaGUgYmVoYXZpb3IgaXMgdW5kZWZpbmVkXG5cdCAqIGlmIGBmbGFnYCBpcyBub24temVybyBhbmQgYGRpZ2l0YCBoYXMgbm8gdXBwZXJjYXNlIGZvcm0uXG5cdCAqL1xuXHRmdW5jdGlvbiBkaWdpdFRvQmFzaWMoZGlnaXQsIGZsYWcpIHtcblx0XHQvLyAgMC4uMjUgbWFwIHRvIEFTQ0lJIGEuLnogb3IgQS4uWlxuXHRcdC8vIDI2Li4zNSBtYXAgdG8gQVNDSUkgMC4uOVxuXHRcdHJldHVybiBkaWdpdCArIDIyICsgNzUgKiAoZGlnaXQgPCAyNikgLSAoKGZsYWcgIT0gMCkgPDwgNSk7XG5cdH1cblxuXHQvKipcblx0ICogQmlhcyBhZGFwdGF0aW9uIGZ1bmN0aW9uIGFzIHBlciBzZWN0aW9uIDMuNCBvZiBSRkMgMzQ5Mi5cblx0ICogaHR0cDovL3Rvb2xzLmlldGYub3JnL2h0bWwvcmZjMzQ5MiNzZWN0aW9uLTMuNFxuXHQgKiBAcHJpdmF0ZVxuXHQgKi9cblx0ZnVuY3Rpb24gYWRhcHQoZGVsdGEsIG51bVBvaW50cywgZmlyc3RUaW1lKSB7XG5cdFx0dmFyIGsgPSAwO1xuXHRcdGRlbHRhID0gZmlyc3RUaW1lID8gZmxvb3IoZGVsdGEgLyBkYW1wKSA6IGRlbHRhID4+IDE7XG5cdFx0ZGVsdGEgKz0gZmxvb3IoZGVsdGEgLyBudW1Qb2ludHMpO1xuXHRcdGZvciAoLyogbm8gaW5pdGlhbGl6YXRpb24gKi87IGRlbHRhID4gYmFzZU1pbnVzVE1pbiAqIHRNYXggPj4gMTsgayArPSBiYXNlKSB7XG5cdFx0XHRkZWx0YSA9IGZsb29yKGRlbHRhIC8gYmFzZU1pbnVzVE1pbik7XG5cdFx0fVxuXHRcdHJldHVybiBmbG9vcihrICsgKGJhc2VNaW51c1RNaW4gKyAxKSAqIGRlbHRhIC8gKGRlbHRhICsgc2tldykpO1xuXHR9XG5cblx0LyoqXG5cdCAqIENvbnZlcnRzIGEgUHVueWNvZGUgc3RyaW5nIG9mIEFTQ0lJLW9ubHkgc3ltYm9scyB0byBhIHN0cmluZyBvZiBVbmljb2RlXG5cdCAqIHN5bWJvbHMuXG5cdCAqIEBtZW1iZXJPZiBwdW55Y29kZVxuXHQgKiBAcGFyYW0ge1N0cmluZ30gaW5wdXQgVGhlIFB1bnljb2RlIHN0cmluZyBvZiBBU0NJSS1vbmx5IHN5bWJvbHMuXG5cdCAqIEByZXR1cm5zIHtTdHJpbmd9IFRoZSByZXN1bHRpbmcgc3RyaW5nIG9mIFVuaWNvZGUgc3ltYm9scy5cblx0ICovXG5cdGZ1bmN0aW9uIGRlY29kZShpbnB1dCkge1xuXHRcdC8vIERvbid0IHVzZSBVQ1MtMlxuXHRcdHZhciBvdXRwdXQgPSBbXSxcblx0XHQgICAgaW5wdXRMZW5ndGggPSBpbnB1dC5sZW5ndGgsXG5cdFx0ICAgIG91dCxcblx0XHQgICAgaSA9IDAsXG5cdFx0ICAgIG4gPSBpbml0aWFsTixcblx0XHQgICAgYmlhcyA9IGluaXRpYWxCaWFzLFxuXHRcdCAgICBiYXNpYyxcblx0XHQgICAgaixcblx0XHQgICAgaW5kZXgsXG5cdFx0ICAgIG9sZGksXG5cdFx0ICAgIHcsXG5cdFx0ICAgIGssXG5cdFx0ICAgIGRpZ2l0LFxuXHRcdCAgICB0LFxuXHRcdCAgICAvKiogQ2FjaGVkIGNhbGN1bGF0aW9uIHJlc3VsdHMgKi9cblx0XHQgICAgYmFzZU1pbnVzVDtcblxuXHRcdC8vIEhhbmRsZSB0aGUgYmFzaWMgY29kZSBwb2ludHM6IGxldCBgYmFzaWNgIGJlIHRoZSBudW1iZXIgb2YgaW5wdXQgY29kZVxuXHRcdC8vIHBvaW50cyBiZWZvcmUgdGhlIGxhc3QgZGVsaW1pdGVyLCBvciBgMGAgaWYgdGhlcmUgaXMgbm9uZSwgdGhlbiBjb3B5XG5cdFx0Ly8gdGhlIGZpcnN0IGJhc2ljIGNvZGUgcG9pbnRzIHRvIHRoZSBvdXRwdXQuXG5cblx0XHRiYXNpYyA9IGlucHV0Lmxhc3RJbmRleE9mKGRlbGltaXRlcik7XG5cdFx0aWYgKGJhc2ljIDwgMCkge1xuXHRcdFx0YmFzaWMgPSAwO1xuXHRcdH1cblxuXHRcdGZvciAoaiA9IDA7IGogPCBiYXNpYzsgKytqKSB7XG5cdFx0XHQvLyBpZiBpdCdzIG5vdCBhIGJhc2ljIGNvZGUgcG9pbnRcblx0XHRcdGlmIChpbnB1dC5jaGFyQ29kZUF0KGopID49IDB4ODApIHtcblx0XHRcdFx0ZXJyb3IoJ25vdC1iYXNpYycpO1xuXHRcdFx0fVxuXHRcdFx0b3V0cHV0LnB1c2goaW5wdXQuY2hhckNvZGVBdChqKSk7XG5cdFx0fVxuXG5cdFx0Ly8gTWFpbiBkZWNvZGluZyBsb29wOiBzdGFydCBqdXN0IGFmdGVyIHRoZSBsYXN0IGRlbGltaXRlciBpZiBhbnkgYmFzaWMgY29kZVxuXHRcdC8vIHBvaW50cyB3ZXJlIGNvcGllZDsgc3RhcnQgYXQgdGhlIGJlZ2lubmluZyBvdGhlcndpc2UuXG5cblx0XHRmb3IgKGluZGV4ID0gYmFzaWMgPiAwID8gYmFzaWMgKyAxIDogMDsgaW5kZXggPCBpbnB1dExlbmd0aDsgLyogbm8gZmluYWwgZXhwcmVzc2lvbiAqLykge1xuXG5cdFx0XHQvLyBgaW5kZXhgIGlzIHRoZSBpbmRleCBvZiB0aGUgbmV4dCBjaGFyYWN0ZXIgdG8gYmUgY29uc3VtZWQuXG5cdFx0XHQvLyBEZWNvZGUgYSBnZW5lcmFsaXplZCB2YXJpYWJsZS1sZW5ndGggaW50ZWdlciBpbnRvIGBkZWx0YWAsXG5cdFx0XHQvLyB3aGljaCBnZXRzIGFkZGVkIHRvIGBpYC4gVGhlIG92ZXJmbG93IGNoZWNraW5nIGlzIGVhc2llclxuXHRcdFx0Ly8gaWYgd2UgaW5jcmVhc2UgYGlgIGFzIHdlIGdvLCB0aGVuIHN1YnRyYWN0IG9mZiBpdHMgc3RhcnRpbmdcblx0XHRcdC8vIHZhbHVlIGF0IHRoZSBlbmQgdG8gb2J0YWluIGBkZWx0YWAuXG5cdFx0XHRmb3IgKG9sZGkgPSBpLCB3ID0gMSwgayA9IGJhc2U7IC8qIG5vIGNvbmRpdGlvbiAqLzsgayArPSBiYXNlKSB7XG5cblx0XHRcdFx0aWYgKGluZGV4ID49IGlucHV0TGVuZ3RoKSB7XG5cdFx0XHRcdFx0ZXJyb3IoJ2ludmFsaWQtaW5wdXQnKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGRpZ2l0ID0gYmFzaWNUb0RpZ2l0KGlucHV0LmNoYXJDb2RlQXQoaW5kZXgrKykpO1xuXG5cdFx0XHRcdGlmIChkaWdpdCA+PSBiYXNlIHx8IGRpZ2l0ID4gZmxvb3IoKG1heEludCAtIGkpIC8gdykpIHtcblx0XHRcdFx0XHRlcnJvcignb3ZlcmZsb3cnKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGkgKz0gZGlnaXQgKiB3O1xuXHRcdFx0XHR0ID0gayA8PSBiaWFzID8gdE1pbiA6IChrID49IGJpYXMgKyB0TWF4ID8gdE1heCA6IGsgLSBiaWFzKTtcblxuXHRcdFx0XHRpZiAoZGlnaXQgPCB0KSB7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRiYXNlTWludXNUID0gYmFzZSAtIHQ7XG5cdFx0XHRcdGlmICh3ID4gZmxvb3IobWF4SW50IC8gYmFzZU1pbnVzVCkpIHtcblx0XHRcdFx0XHRlcnJvcignb3ZlcmZsb3cnKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdHcgKj0gYmFzZU1pbnVzVDtcblxuXHRcdFx0fVxuXG5cdFx0XHRvdXQgPSBvdXRwdXQubGVuZ3RoICsgMTtcblx0XHRcdGJpYXMgPSBhZGFwdChpIC0gb2xkaSwgb3V0LCBvbGRpID09IDApO1xuXG5cdFx0XHQvLyBgaWAgd2FzIHN1cHBvc2VkIHRvIHdyYXAgYXJvdW5kIGZyb20gYG91dGAgdG8gYDBgLFxuXHRcdFx0Ly8gaW5jcmVtZW50aW5nIGBuYCBlYWNoIHRpbWUsIHNvIHdlJ2xsIGZpeCB0aGF0IG5vdzpcblx0XHRcdGlmIChmbG9vcihpIC8gb3V0KSA+IG1heEludCAtIG4pIHtcblx0XHRcdFx0ZXJyb3IoJ292ZXJmbG93Jyk7XG5cdFx0XHR9XG5cblx0XHRcdG4gKz0gZmxvb3IoaSAvIG91dCk7XG5cdFx0XHRpICU9IG91dDtcblxuXHRcdFx0Ly8gSW5zZXJ0IGBuYCBhdCBwb3NpdGlvbiBgaWAgb2YgdGhlIG91dHB1dFxuXHRcdFx0b3V0cHV0LnNwbGljZShpKyssIDAsIG4pO1xuXG5cdFx0fVxuXG5cdFx0cmV0dXJuIHVjczJlbmNvZGUob3V0cHV0KTtcblx0fVxuXG5cdC8qKlxuXHQgKiBDb252ZXJ0cyBhIHN0cmluZyBvZiBVbmljb2RlIHN5bWJvbHMgdG8gYSBQdW55Y29kZSBzdHJpbmcgb2YgQVNDSUktb25seVxuXHQgKiBzeW1ib2xzLlxuXHQgKiBAbWVtYmVyT2YgcHVueWNvZGVcblx0ICogQHBhcmFtIHtTdHJpbmd9IGlucHV0IFRoZSBzdHJpbmcgb2YgVW5pY29kZSBzeW1ib2xzLlxuXHQgKiBAcmV0dXJucyB7U3RyaW5nfSBUaGUgcmVzdWx0aW5nIFB1bnljb2RlIHN0cmluZyBvZiBBU0NJSS1vbmx5IHN5bWJvbHMuXG5cdCAqL1xuXHRmdW5jdGlvbiBlbmNvZGUoaW5wdXQpIHtcblx0XHR2YXIgbixcblx0XHQgICAgZGVsdGEsXG5cdFx0ICAgIGhhbmRsZWRDUENvdW50LFxuXHRcdCAgICBiYXNpY0xlbmd0aCxcblx0XHQgICAgYmlhcyxcblx0XHQgICAgaixcblx0XHQgICAgbSxcblx0XHQgICAgcSxcblx0XHQgICAgayxcblx0XHQgICAgdCxcblx0XHQgICAgY3VycmVudFZhbHVlLFxuXHRcdCAgICBvdXRwdXQgPSBbXSxcblx0XHQgICAgLyoqIGBpbnB1dExlbmd0aGAgd2lsbCBob2xkIHRoZSBudW1iZXIgb2YgY29kZSBwb2ludHMgaW4gYGlucHV0YC4gKi9cblx0XHQgICAgaW5wdXRMZW5ndGgsXG5cdFx0ICAgIC8qKiBDYWNoZWQgY2FsY3VsYXRpb24gcmVzdWx0cyAqL1xuXHRcdCAgICBoYW5kbGVkQ1BDb3VudFBsdXNPbmUsXG5cdFx0ICAgIGJhc2VNaW51c1QsXG5cdFx0ICAgIHFNaW51c1Q7XG5cblx0XHQvLyBDb252ZXJ0IHRoZSBpbnB1dCBpbiBVQ1MtMiB0byBVbmljb2RlXG5cdFx0aW5wdXQgPSB1Y3MyZGVjb2RlKGlucHV0KTtcblxuXHRcdC8vIENhY2hlIHRoZSBsZW5ndGhcblx0XHRpbnB1dExlbmd0aCA9IGlucHV0Lmxlbmd0aDtcblxuXHRcdC8vIEluaXRpYWxpemUgdGhlIHN0YXRlXG5cdFx0biA9IGluaXRpYWxOO1xuXHRcdGRlbHRhID0gMDtcblx0XHRiaWFzID0gaW5pdGlhbEJpYXM7XG5cblx0XHQvLyBIYW5kbGUgdGhlIGJhc2ljIGNvZGUgcG9pbnRzXG5cdFx0Zm9yIChqID0gMDsgaiA8IGlucHV0TGVuZ3RoOyArK2opIHtcblx0XHRcdGN1cnJlbnRWYWx1ZSA9IGlucHV0W2pdO1xuXHRcdFx0aWYgKGN1cnJlbnRWYWx1ZSA8IDB4ODApIHtcblx0XHRcdFx0b3V0cHV0LnB1c2goc3RyaW5nRnJvbUNoYXJDb2RlKGN1cnJlbnRWYWx1ZSkpO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGhhbmRsZWRDUENvdW50ID0gYmFzaWNMZW5ndGggPSBvdXRwdXQubGVuZ3RoO1xuXG5cdFx0Ly8gYGhhbmRsZWRDUENvdW50YCBpcyB0aGUgbnVtYmVyIG9mIGNvZGUgcG9pbnRzIHRoYXQgaGF2ZSBiZWVuIGhhbmRsZWQ7XG5cdFx0Ly8gYGJhc2ljTGVuZ3RoYCBpcyB0aGUgbnVtYmVyIG9mIGJhc2ljIGNvZGUgcG9pbnRzLlxuXG5cdFx0Ly8gRmluaXNoIHRoZSBiYXNpYyBzdHJpbmcgLSBpZiBpdCBpcyBub3QgZW1wdHkgLSB3aXRoIGEgZGVsaW1pdGVyXG5cdFx0aWYgKGJhc2ljTGVuZ3RoKSB7XG5cdFx0XHRvdXRwdXQucHVzaChkZWxpbWl0ZXIpO1xuXHRcdH1cblxuXHRcdC8vIE1haW4gZW5jb2RpbmcgbG9vcDpcblx0XHR3aGlsZSAoaGFuZGxlZENQQ291bnQgPCBpbnB1dExlbmd0aCkge1xuXG5cdFx0XHQvLyBBbGwgbm9uLWJhc2ljIGNvZGUgcG9pbnRzIDwgbiBoYXZlIGJlZW4gaGFuZGxlZCBhbHJlYWR5LiBGaW5kIHRoZSBuZXh0XG5cdFx0XHQvLyBsYXJnZXIgb25lOlxuXHRcdFx0Zm9yIChtID0gbWF4SW50LCBqID0gMDsgaiA8IGlucHV0TGVuZ3RoOyArK2opIHtcblx0XHRcdFx0Y3VycmVudFZhbHVlID0gaW5wdXRbal07XG5cdFx0XHRcdGlmIChjdXJyZW50VmFsdWUgPj0gbiAmJiBjdXJyZW50VmFsdWUgPCBtKSB7XG5cdFx0XHRcdFx0bSA9IGN1cnJlbnRWYWx1ZTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHQvLyBJbmNyZWFzZSBgZGVsdGFgIGVub3VnaCB0byBhZHZhbmNlIHRoZSBkZWNvZGVyJ3MgPG4saT4gc3RhdGUgdG8gPG0sMD4sXG5cdFx0XHQvLyBidXQgZ3VhcmQgYWdhaW5zdCBvdmVyZmxvd1xuXHRcdFx0aGFuZGxlZENQQ291bnRQbHVzT25lID0gaGFuZGxlZENQQ291bnQgKyAxO1xuXHRcdFx0aWYgKG0gLSBuID4gZmxvb3IoKG1heEludCAtIGRlbHRhKSAvIGhhbmRsZWRDUENvdW50UGx1c09uZSkpIHtcblx0XHRcdFx0ZXJyb3IoJ292ZXJmbG93Jyk7XG5cdFx0XHR9XG5cblx0XHRcdGRlbHRhICs9IChtIC0gbikgKiBoYW5kbGVkQ1BDb3VudFBsdXNPbmU7XG5cdFx0XHRuID0gbTtcblxuXHRcdFx0Zm9yIChqID0gMDsgaiA8IGlucHV0TGVuZ3RoOyArK2opIHtcblx0XHRcdFx0Y3VycmVudFZhbHVlID0gaW5wdXRbal07XG5cblx0XHRcdFx0aWYgKGN1cnJlbnRWYWx1ZSA8IG4gJiYgKytkZWx0YSA+IG1heEludCkge1xuXHRcdFx0XHRcdGVycm9yKCdvdmVyZmxvdycpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0aWYgKGN1cnJlbnRWYWx1ZSA9PSBuKSB7XG5cdFx0XHRcdFx0Ly8gUmVwcmVzZW50IGRlbHRhIGFzIGEgZ2VuZXJhbGl6ZWQgdmFyaWFibGUtbGVuZ3RoIGludGVnZXJcblx0XHRcdFx0XHRmb3IgKHEgPSBkZWx0YSwgayA9IGJhc2U7IC8qIG5vIGNvbmRpdGlvbiAqLzsgayArPSBiYXNlKSB7XG5cdFx0XHRcdFx0XHR0ID0gayA8PSBiaWFzID8gdE1pbiA6IChrID49IGJpYXMgKyB0TWF4ID8gdE1heCA6IGsgLSBiaWFzKTtcblx0XHRcdFx0XHRcdGlmIChxIDwgdCkge1xuXHRcdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdHFNaW51c1QgPSBxIC0gdDtcblx0XHRcdFx0XHRcdGJhc2VNaW51c1QgPSBiYXNlIC0gdDtcblx0XHRcdFx0XHRcdG91dHB1dC5wdXNoKFxuXHRcdFx0XHRcdFx0XHRzdHJpbmdGcm9tQ2hhckNvZGUoZGlnaXRUb0Jhc2ljKHQgKyBxTWludXNUICUgYmFzZU1pbnVzVCwgMCkpXG5cdFx0XHRcdFx0XHQpO1xuXHRcdFx0XHRcdFx0cSA9IGZsb29yKHFNaW51c1QgLyBiYXNlTWludXNUKTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRvdXRwdXQucHVzaChzdHJpbmdGcm9tQ2hhckNvZGUoZGlnaXRUb0Jhc2ljKHEsIDApKSk7XG5cdFx0XHRcdFx0YmlhcyA9IGFkYXB0KGRlbHRhLCBoYW5kbGVkQ1BDb3VudFBsdXNPbmUsIGhhbmRsZWRDUENvdW50ID09IGJhc2ljTGVuZ3RoKTtcblx0XHRcdFx0XHRkZWx0YSA9IDA7XG5cdFx0XHRcdFx0KytoYW5kbGVkQ1BDb3VudDtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHQrK2RlbHRhO1xuXHRcdFx0KytuO1xuXG5cdFx0fVxuXHRcdHJldHVybiBvdXRwdXQuam9pbignJyk7XG5cdH1cblxuXHQvKipcblx0ICogQ29udmVydHMgYSBQdW55Y29kZSBzdHJpbmcgcmVwcmVzZW50aW5nIGEgZG9tYWluIG5hbWUgdG8gVW5pY29kZS4gT25seSB0aGVcblx0ICogUHVueWNvZGVkIHBhcnRzIG9mIHRoZSBkb21haW4gbmFtZSB3aWxsIGJlIGNvbnZlcnRlZCwgaS5lLiBpdCBkb2Vzbid0XG5cdCAqIG1hdHRlciBpZiB5b3UgY2FsbCBpdCBvbiBhIHN0cmluZyB0aGF0IGhhcyBhbHJlYWR5IGJlZW4gY29udmVydGVkIHRvXG5cdCAqIFVuaWNvZGUuXG5cdCAqIEBtZW1iZXJPZiBwdW55Y29kZVxuXHQgKiBAcGFyYW0ge1N0cmluZ30gZG9tYWluIFRoZSBQdW55Y29kZSBkb21haW4gbmFtZSB0byBjb252ZXJ0IHRvIFVuaWNvZGUuXG5cdCAqIEByZXR1cm5zIHtTdHJpbmd9IFRoZSBVbmljb2RlIHJlcHJlc2VudGF0aW9uIG9mIHRoZSBnaXZlbiBQdW55Y29kZVxuXHQgKiBzdHJpbmcuXG5cdCAqL1xuXHRmdW5jdGlvbiB0b1VuaWNvZGUoZG9tYWluKSB7XG5cdFx0cmV0dXJuIG1hcERvbWFpbihkb21haW4sIGZ1bmN0aW9uKHN0cmluZykge1xuXHRcdFx0cmV0dXJuIHJlZ2V4UHVueWNvZGUudGVzdChzdHJpbmcpXG5cdFx0XHRcdD8gZGVjb2RlKHN0cmluZy5zbGljZSg0KS50b0xvd2VyQ2FzZSgpKVxuXHRcdFx0XHQ6IHN0cmluZztcblx0XHR9KTtcblx0fVxuXG5cdC8qKlxuXHQgKiBDb252ZXJ0cyBhIFVuaWNvZGUgc3RyaW5nIHJlcHJlc2VudGluZyBhIGRvbWFpbiBuYW1lIHRvIFB1bnljb2RlLiBPbmx5IHRoZVxuXHQgKiBub24tQVNDSUkgcGFydHMgb2YgdGhlIGRvbWFpbiBuYW1lIHdpbGwgYmUgY29udmVydGVkLCBpLmUuIGl0IGRvZXNuJ3Rcblx0ICogbWF0dGVyIGlmIHlvdSBjYWxsIGl0IHdpdGggYSBkb21haW4gdGhhdCdzIGFscmVhZHkgaW4gQVNDSUkuXG5cdCAqIEBtZW1iZXJPZiBwdW55Y29kZVxuXHQgKiBAcGFyYW0ge1N0cmluZ30gZG9tYWluIFRoZSBkb21haW4gbmFtZSB0byBjb252ZXJ0LCBhcyBhIFVuaWNvZGUgc3RyaW5nLlxuXHQgKiBAcmV0dXJucyB7U3RyaW5nfSBUaGUgUHVueWNvZGUgcmVwcmVzZW50YXRpb24gb2YgdGhlIGdpdmVuIGRvbWFpbiBuYW1lLlxuXHQgKi9cblx0ZnVuY3Rpb24gdG9BU0NJSShkb21haW4pIHtcblx0XHRyZXR1cm4gbWFwRG9tYWluKGRvbWFpbiwgZnVuY3Rpb24oc3RyaW5nKSB7XG5cdFx0XHRyZXR1cm4gcmVnZXhOb25BU0NJSS50ZXN0KHN0cmluZylcblx0XHRcdFx0PyAneG4tLScgKyBlbmNvZGUoc3RyaW5nKVxuXHRcdFx0XHQ6IHN0cmluZztcblx0XHR9KTtcblx0fVxuXG5cdC8qLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qL1xuXG5cdC8qKiBEZWZpbmUgdGhlIHB1YmxpYyBBUEkgKi9cblx0cHVueWNvZGUgPSB7XG5cdFx0LyoqXG5cdFx0ICogQSBzdHJpbmcgcmVwcmVzZW50aW5nIHRoZSBjdXJyZW50IFB1bnljb2RlLmpzIHZlcnNpb24gbnVtYmVyLlxuXHRcdCAqIEBtZW1iZXJPZiBwdW55Y29kZVxuXHRcdCAqIEB0eXBlIFN0cmluZ1xuXHRcdCAqL1xuXHRcdCd2ZXJzaW9uJzogJzEuMi40Jyxcblx0XHQvKipcblx0XHQgKiBBbiBvYmplY3Qgb2YgbWV0aG9kcyB0byBjb252ZXJ0IGZyb20gSmF2YVNjcmlwdCdzIGludGVybmFsIGNoYXJhY3RlclxuXHRcdCAqIHJlcHJlc2VudGF0aW9uIChVQ1MtMikgdG8gVW5pY29kZSBjb2RlIHBvaW50cywgYW5kIGJhY2suXG5cdFx0ICogQHNlZSA8aHR0cDovL21hdGhpYXNieW5lbnMuYmUvbm90ZXMvamF2YXNjcmlwdC1lbmNvZGluZz5cblx0XHQgKiBAbWVtYmVyT2YgcHVueWNvZGVcblx0XHQgKiBAdHlwZSBPYmplY3Rcblx0XHQgKi9cblx0XHQndWNzMic6IHtcblx0XHRcdCdkZWNvZGUnOiB1Y3MyZGVjb2RlLFxuXHRcdFx0J2VuY29kZSc6IHVjczJlbmNvZGVcblx0XHR9LFxuXHRcdCdkZWNvZGUnOiBkZWNvZGUsXG5cdFx0J2VuY29kZSc6IGVuY29kZSxcblx0XHQndG9BU0NJSSc6IHRvQVNDSUksXG5cdFx0J3RvVW5pY29kZSc6IHRvVW5pY29kZVxuXHR9O1xuXG5cdC8qKiBFeHBvc2UgYHB1bnljb2RlYCAqL1xuXHQvLyBTb21lIEFNRCBidWlsZCBvcHRpbWl6ZXJzLCBsaWtlIHIuanMsIGNoZWNrIGZvciBzcGVjaWZpYyBjb25kaXRpb24gcGF0dGVybnNcblx0Ly8gbGlrZSB0aGUgZm9sbG93aW5nOlxuXHRpZiAoXG5cdFx0dHlwZW9mIGRlZmluZSA9PSAnZnVuY3Rpb24nICYmXG5cdFx0dHlwZW9mIGRlZmluZS5hbWQgPT0gJ29iamVjdCcgJiZcblx0XHRkZWZpbmUuYW1kXG5cdCkge1xuXHRcdGRlZmluZSgncHVueWNvZGUnLCBmdW5jdGlvbigpIHtcblx0XHRcdHJldHVybiBwdW55Y29kZTtcblx0XHR9KTtcblx0fSBlbHNlIGlmIChmcmVlRXhwb3J0cyAmJiAhZnJlZUV4cG9ydHMubm9kZVR5cGUpIHtcblx0XHRpZiAoZnJlZU1vZHVsZSkgeyAvLyBpbiBOb2RlLmpzIG9yIFJpbmdvSlMgdjAuOC4wK1xuXHRcdFx0ZnJlZU1vZHVsZS5leHBvcnRzID0gcHVueWNvZGU7XG5cdFx0fSBlbHNlIHsgLy8gaW4gTmFyd2hhbCBvciBSaW5nb0pTIHYwLjcuMC1cblx0XHRcdGZvciAoa2V5IGluIHB1bnljb2RlKSB7XG5cdFx0XHRcdHB1bnljb2RlLmhhc093blByb3BlcnR5KGtleSkgJiYgKGZyZWVFeHBvcnRzW2tleV0gPSBwdW55Y29kZVtrZXldKTtcblx0XHRcdH1cblx0XHR9XG5cdH0gZWxzZSB7IC8vIGluIFJoaW5vIG9yIGEgd2ViIGJyb3dzZXJcblx0XHRyb290LnB1bnljb2RlID0gcHVueWNvZGU7XG5cdH1cblxufSh0aGlzKSk7XG4iXX0=
},{}],16:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

// If obj.hasOwnProperty has been overridden, then calling
// obj.hasOwnProperty(prop) will break.
// See: https://github.com/joyent/node/issues/1707
function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

module.exports = function(qs, sep, eq, options) {
  sep = sep || '&';
  eq = eq || '=';
  var obj = {};

  if (typeof qs !== 'string' || qs.length === 0) {
    return obj;
  }

  var regexp = /\+/g;
  qs = qs.split(sep);

  var maxKeys = 1000;
  if (options && typeof options.maxKeys === 'number') {
    maxKeys = options.maxKeys;
  }

  var len = qs.length;
  // maxKeys <= 0 means that we should not limit keys count
  if (maxKeys > 0 && len > maxKeys) {
    len = maxKeys;
  }

  for (var i = 0; i < len; ++i) {
    var x = qs[i].replace(regexp, '%20'),
        idx = x.indexOf(eq),
        kstr, vstr, k, v;

    if (idx >= 0) {
      kstr = x.substr(0, idx);
      vstr = x.substr(idx + 1);
    } else {
      kstr = x;
      vstr = '';
    }

    k = decodeURIComponent(kstr);
    v = decodeURIComponent(vstr);

    if (!hasOwnProperty(obj, k)) {
      obj[k] = v;
    } else if (isArray(obj[k])) {
      obj[k].push(v);
    } else {
      obj[k] = [obj[k], v];
    }
  }

  return obj;
};

var isArray = Array.isArray || function (xs) {
  return Object.prototype.toString.call(xs) === '[object Array]';
};

},{}],17:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

var stringifyPrimitive = function(v) {
  switch (typeof v) {
    case 'string':
      return v;

    case 'boolean':
      return v ? 'true' : 'false';

    case 'number':
      return isFinite(v) ? v : '';

    default:
      return '';
  }
};

module.exports = function(obj, sep, eq, name) {
  sep = sep || '&';
  eq = eq || '=';
  if (obj === null) {
    obj = undefined;
  }

  if (typeof obj === 'object') {
    return map(objectKeys(obj), function(k) {
      var ks = encodeURIComponent(stringifyPrimitive(k)) + eq;
      if (isArray(obj[k])) {
        return map(obj[k], function(v) {
          return ks + encodeURIComponent(stringifyPrimitive(v));
        }).join(sep);
      } else {
        return ks + encodeURIComponent(stringifyPrimitive(obj[k]));
      }
    }).join(sep);

  }

  if (!name) return '';
  return encodeURIComponent(stringifyPrimitive(name)) + eq +
         encodeURIComponent(stringifyPrimitive(obj));
};

var isArray = Array.isArray || function (xs) {
  return Object.prototype.toString.call(xs) === '[object Array]';
};

function map (xs, f) {
  if (xs.map) return xs.map(f);
  var res = [];
  for (var i = 0; i < xs.length; i++) {
    res.push(f(xs[i], i));
  }
  return res;
}

var objectKeys = Object.keys || function (obj) {
  var res = [];
  for (var key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) res.push(key);
  }
  return res;
};

},{}],18:[function(require,module,exports){
'use strict';

exports.decode = exports.parse = require('./decode');
exports.encode = exports.stringify = require('./encode');

},{"./decode":16,"./encode":17}],19:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var punycode = require('punycode');

exports.parse = urlParse;
exports.resolve = urlResolve;
exports.resolveObject = urlResolveObject;
exports.format = urlFormat;

exports.Url = Url;

function Url() {
  this.protocol = null;
  this.slashes = null;
  this.auth = null;
  this.host = null;
  this.port = null;
  this.hostname = null;
  this.hash = null;
  this.search = null;
  this.query = null;
  this.pathname = null;
  this.path = null;
  this.href = null;
}

// Reference: RFC 3986, RFC 1808, RFC 2396

// define these here so at least they only have to be
// compiled once on the first module load.
var protocolPattern = /^([a-z0-9.+-]+:)/i,
    portPattern = /:[0-9]*$/,

    // RFC 2396: characters reserved for delimiting URLs.
    // We actually just auto-escape these.
    delims = ['<', '>', '"', '`', ' ', '\r', '\n', '\t'],

    // RFC 2396: characters not allowed for various reasons.
    unwise = ['{', '}', '|', '\\', '^', '`'].concat(delims),

    // Allowed by RFCs, but cause of XSS attacks.  Always escape these.
    autoEscape = ['\''].concat(unwise),
    // Characters that are never ever allowed in a hostname.
    // Note that any invalid chars are also handled, but these
    // are the ones that are *expected* to be seen, so we fast-path
    // them.
    nonHostChars = ['%', '/', '?', ';', '#'].concat(autoEscape),
    hostEndingChars = ['/', '?', '#'],
    hostnameMaxLen = 255,
    hostnamePartPattern = /^[a-z0-9A-Z_-]{0,63}$/,
    hostnamePartStart = /^([a-z0-9A-Z_-]{0,63})(.*)$/,
    // protocols that can allow "unsafe" and "unwise" chars.
    unsafeProtocol = {
      'javascript': true,
      'javascript:': true
    },
    // protocols that never have a hostname.
    hostlessProtocol = {
      'javascript': true,
      'javascript:': true
    },
    // protocols that always contain a // bit.
    slashedProtocol = {
      'http': true,
      'https': true,
      'ftp': true,
      'gopher': true,
      'file': true,
      'http:': true,
      'https:': true,
      'ftp:': true,
      'gopher:': true,
      'file:': true
    },
    querystring = require('querystring');

function urlParse(url, parseQueryString, slashesDenoteHost) {
  if (url && isObject(url) && url instanceof Url) return url;

  var u = new Url;
  u.parse(url, parseQueryString, slashesDenoteHost);
  return u;
}

Url.prototype.parse = function(url, parseQueryString, slashesDenoteHost) {
  if (!isString(url)) {
    throw new TypeError("Parameter 'url' must be a string, not " + typeof url);
  }

  var rest = url;

  // trim before proceeding.
  // This is to support parse stuff like "  http://foo.com  \n"
  rest = rest.trim();

  var proto = protocolPattern.exec(rest);
  if (proto) {
    proto = proto[0];
    var lowerProto = proto.toLowerCase();
    this.protocol = lowerProto;
    rest = rest.substr(proto.length);
  }

  // figure out if it's got a host
  // user@server is *always* interpreted as a hostname, and url
  // resolution will treat //foo/bar as host=foo,path=bar because that's
  // how the browser resolves relative URLs.
  if (slashesDenoteHost || proto || rest.match(/^\/\/[^@\/]+@[^@\/]+/)) {
    var slashes = rest.substr(0, 2) === '//';
    if (slashes && !(proto && hostlessProtocol[proto])) {
      rest = rest.substr(2);
      this.slashes = true;
    }
  }

  if (!hostlessProtocol[proto] &&
      (slashes || (proto && !slashedProtocol[proto]))) {

    // there's a hostname.
    // the first instance of /, ?, ;, or # ends the host.
    //
    // If there is an @ in the hostname, then non-host chars *are* allowed
    // to the left of the last @ sign, unless some host-ending character
    // comes *before* the @-sign.
    // URLs are obnoxious.
    //
    // ex:
    // http://a@b@c/ => user:a@b host:c
    // http://a@b?@c => user:a host:c path:/?@c

    // v0.12 TODO(isaacs): This is not quite how Chrome does things.
    // Review our test case against browsers more comprehensively.

    // find the first instance of any hostEndingChars
    var hostEnd = -1;
    for (var i = 0; i < hostEndingChars.length; i++) {
      var hec = rest.indexOf(hostEndingChars[i]);
      if (hec !== -1 && (hostEnd === -1 || hec < hostEnd))
        hostEnd = hec;
    }

    // at this point, either we have an explicit point where the
    // auth portion cannot go past, or the last @ char is the decider.
    var auth, atSign;
    if (hostEnd === -1) {
      // atSign can be anywhere.
      atSign = rest.lastIndexOf('@');
    } else {
      // atSign must be in auth portion.
      // http://a@b/c@d => host:b auth:a path:/c@d
      atSign = rest.lastIndexOf('@', hostEnd);
    }

    // Now we have a portion which is definitely the auth.
    // Pull that off.
    if (atSign !== -1) {
      auth = rest.slice(0, atSign);
      rest = rest.slice(atSign + 1);
      this.auth = decodeURIComponent(auth);
    }

    // the host is the remaining to the left of the first non-host char
    hostEnd = -1;
    for (var i = 0; i < nonHostChars.length; i++) {
      var hec = rest.indexOf(nonHostChars[i]);
      if (hec !== -1 && (hostEnd === -1 || hec < hostEnd))
        hostEnd = hec;
    }
    // if we still have not hit it, then the entire thing is a host.
    if (hostEnd === -1)
      hostEnd = rest.length;

    this.host = rest.slice(0, hostEnd);
    rest = rest.slice(hostEnd);

    // pull out port.
    this.parseHost();

    // we've indicated that there is a hostname,
    // so even if it's empty, it has to be present.
    this.hostname = this.hostname || '';

    // if hostname begins with [ and ends with ]
    // assume that it's an IPv6 address.
    var ipv6Hostname = this.hostname[0] === '[' &&
        this.hostname[this.hostname.length - 1] === ']';

    // validate a little.
    if (!ipv6Hostname) {
      var hostparts = this.hostname.split(/\./);
      for (var i = 0, l = hostparts.length; i < l; i++) {
        var part = hostparts[i];
        if (!part) continue;
        if (!part.match(hostnamePartPattern)) {
          var newpart = '';
          for (var j = 0, k = part.length; j < k; j++) {
            if (part.charCodeAt(j) > 127) {
              // we replace non-ASCII char with a temporary placeholder
              // we need this to make sure size of hostname is not
              // broken by replacing non-ASCII by nothing
              newpart += 'x';
            } else {
              newpart += part[j];
            }
          }
          // we test again with ASCII char only
          if (!newpart.match(hostnamePartPattern)) {
            var validParts = hostparts.slice(0, i);
            var notHost = hostparts.slice(i + 1);
            var bit = part.match(hostnamePartStart);
            if (bit) {
              validParts.push(bit[1]);
              notHost.unshift(bit[2]);
            }
            if (notHost.length) {
              rest = '/' + notHost.join('.') + rest;
            }
            this.hostname = validParts.join('.');
            break;
          }
        }
      }
    }

    if (this.hostname.length > hostnameMaxLen) {
      this.hostname = '';
    } else {
      // hostnames are always lower case.
      this.hostname = this.hostname.toLowerCase();
    }

    if (!ipv6Hostname) {
      // IDNA Support: Returns a puny coded representation of "domain".
      // It only converts the part of the domain name that
      // has non ASCII characters. I.e. it dosent matter if
      // you call it with a domain that already is in ASCII.
      var domainArray = this.hostname.split('.');
      var newOut = [];
      for (var i = 0; i < domainArray.length; ++i) {
        var s = domainArray[i];
        newOut.push(s.match(/[^A-Za-z0-9_-]/) ?
            'xn--' + punycode.encode(s) : s);
      }
      this.hostname = newOut.join('.');
    }

    var p = this.port ? ':' + this.port : '';
    var h = this.hostname || '';
    this.host = h + p;
    this.href += this.host;

    // strip [ and ] from the hostname
    // the host field still retains them, though
    if (ipv6Hostname) {
      this.hostname = this.hostname.substr(1, this.hostname.length - 2);
      if (rest[0] !== '/') {
        rest = '/' + rest;
      }
    }
  }

  // now rest is set to the post-host stuff.
  // chop off any delim chars.
  if (!unsafeProtocol[lowerProto]) {

    // First, make 100% sure that any "autoEscape" chars get
    // escaped, even if encodeURIComponent doesn't think they
    // need to be.
    for (var i = 0, l = autoEscape.length; i < l; i++) {
      var ae = autoEscape[i];
      var esc = encodeURIComponent(ae);
      if (esc === ae) {
        esc = escape(ae);
      }
      rest = rest.split(ae).join(esc);
    }
  }


  // chop off from the tail first.
  var hash = rest.indexOf('#');
  if (hash !== -1) {
    // got a fragment string.
    this.hash = rest.substr(hash);
    rest = rest.slice(0, hash);
  }
  var qm = rest.indexOf('?');
  if (qm !== -1) {
    this.search = rest.substr(qm);
    this.query = rest.substr(qm + 1);
    if (parseQueryString) {
      this.query = querystring.parse(this.query);
    }
    rest = rest.slice(0, qm);
  } else if (parseQueryString) {
    // no query string, but parseQueryString still requested
    this.search = '';
    this.query = {};
  }
  if (rest) this.pathname = rest;
  if (slashedProtocol[lowerProto] &&
      this.hostname && !this.pathname) {
    this.pathname = '/';
  }

  //to support http.request
  if (this.pathname || this.search) {
    var p = this.pathname || '';
    var s = this.search || '';
    this.path = p + s;
  }

  // finally, reconstruct the href based on what has been validated.
  this.href = this.format();
  return this;
};

// format a parsed object into a url string
function urlFormat(obj) {
  // ensure it's an object, and not a string url.
  // If it's an obj, this is a no-op.
  // this way, you can call url_format() on strings
  // to clean up potentially wonky urls.
  if (isString(obj)) obj = urlParse(obj);
  if (!(obj instanceof Url)) return Url.prototype.format.call(obj);
  return obj.format();
}

Url.prototype.format = function() {
  var auth = this.auth || '';
  if (auth) {
    auth = encodeURIComponent(auth);
    auth = auth.replace(/%3A/i, ':');
    auth += '@';
  }

  var protocol = this.protocol || '',
      pathname = this.pathname || '',
      hash = this.hash || '',
      host = false,
      query = '';

  if (this.host) {
    host = auth + this.host;
  } else if (this.hostname) {
    host = auth + (this.hostname.indexOf(':') === -1 ?
        this.hostname :
        '[' + this.hostname + ']');
    if (this.port) {
      host += ':' + this.port;
    }
  }

  if (this.query &&
      isObject(this.query) &&
      Object.keys(this.query).length) {
    query = querystring.stringify(this.query);
  }

  var search = this.search || (query && ('?' + query)) || '';

  if (protocol && protocol.substr(-1) !== ':') protocol += ':';

  // only the slashedProtocols get the //.  Not mailto:, xmpp:, etc.
  // unless they had them to begin with.
  if (this.slashes ||
      (!protocol || slashedProtocol[protocol]) && host !== false) {
    host = '//' + (host || '');
    if (pathname && pathname.charAt(0) !== '/') pathname = '/' + pathname;
  } else if (!host) {
    host = '';
  }

  if (hash && hash.charAt(0) !== '#') hash = '#' + hash;
  if (search && search.charAt(0) !== '?') search = '?' + search;

  pathname = pathname.replace(/[?#]/g, function(match) {
    return encodeURIComponent(match);
  });
  search = search.replace('#', '%23');

  return protocol + host + pathname + search + hash;
};

function urlResolve(source, relative) {
  return urlParse(source, false, true).resolve(relative);
}

Url.prototype.resolve = function(relative) {
  return this.resolveObject(urlParse(relative, false, true)).format();
};

function urlResolveObject(source, relative) {
  if (!source) return relative;
  return urlParse(source, false, true).resolveObject(relative);
}

Url.prototype.resolveObject = function(relative) {
  if (isString(relative)) {
    var rel = new Url();
    rel.parse(relative, false, true);
    relative = rel;
  }

  var result = new Url();
  Object.keys(this).forEach(function(k) {
    result[k] = this[k];
  }, this);

  // hash is always overridden, no matter what.
  // even href="" will remove it.
  result.hash = relative.hash;

  // if the relative url is empty, then there's nothing left to do here.
  if (relative.href === '') {
    result.href = result.format();
    return result;
  }

  // hrefs like //foo/bar always cut to the protocol.
  if (relative.slashes && !relative.protocol) {
    // take everything except the protocol from relative
    Object.keys(relative).forEach(function(k) {
      if (k !== 'protocol')
        result[k] = relative[k];
    });

    //urlParse appends trailing / to urls like http://www.example.com
    if (slashedProtocol[result.protocol] &&
        result.hostname && !result.pathname) {
      result.path = result.pathname = '/';
    }

    result.href = result.format();
    return result;
  }

  if (relative.protocol && relative.protocol !== result.protocol) {
    // if it's a known url protocol, then changing
    // the protocol does weird things
    // first, if it's not file:, then we MUST have a host,
    // and if there was a path
    // to begin with, then we MUST have a path.
    // if it is file:, then the host is dropped,
    // because that's known to be hostless.
    // anything else is assumed to be absolute.
    if (!slashedProtocol[relative.protocol]) {
      Object.keys(relative).forEach(function(k) {
        result[k] = relative[k];
      });
      result.href = result.format();
      return result;
    }

    result.protocol = relative.protocol;
    if (!relative.host && !hostlessProtocol[relative.protocol]) {
      var relPath = (relative.pathname || '').split('/');
      while (relPath.length && !(relative.host = relPath.shift()));
      if (!relative.host) relative.host = '';
      if (!relative.hostname) relative.hostname = '';
      if (relPath[0] !== '') relPath.unshift('');
      if (relPath.length < 2) relPath.unshift('');
      result.pathname = relPath.join('/');
    } else {
      result.pathname = relative.pathname;
    }
    result.search = relative.search;
    result.query = relative.query;
    result.host = relative.host || '';
    result.auth = relative.auth;
    result.hostname = relative.hostname || relative.host;
    result.port = relative.port;
    // to support http.request
    if (result.pathname || result.search) {
      var p = result.pathname || '';
      var s = result.search || '';
      result.path = p + s;
    }
    result.slashes = result.slashes || relative.slashes;
    result.href = result.format();
    return result;
  }

  var isSourceAbs = (result.pathname && result.pathname.charAt(0) === '/'),
      isRelAbs = (
          relative.host ||
          relative.pathname && relative.pathname.charAt(0) === '/'
      ),
      mustEndAbs = (isRelAbs || isSourceAbs ||
                    (result.host && relative.pathname)),
      removeAllDots = mustEndAbs,
      srcPath = result.pathname && result.pathname.split('/') || [],
      relPath = relative.pathname && relative.pathname.split('/') || [],
      psychotic = result.protocol && !slashedProtocol[result.protocol];

  // if the url is a non-slashed url, then relative
  // links like ../.. should be able
  // to crawl up to the hostname, as well.  This is strange.
  // result.protocol has already been set by now.
  // Later on, put the first path part into the host field.
  if (psychotic) {
    result.hostname = '';
    result.port = null;
    if (result.host) {
      if (srcPath[0] === '') srcPath[0] = result.host;
      else srcPath.unshift(result.host);
    }
    result.host = '';
    if (relative.protocol) {
      relative.hostname = null;
      relative.port = null;
      if (relative.host) {
        if (relPath[0] === '') relPath[0] = relative.host;
        else relPath.unshift(relative.host);
      }
      relative.host = null;
    }
    mustEndAbs = mustEndAbs && (relPath[0] === '' || srcPath[0] === '');
  }

  if (isRelAbs) {
    // it's absolute.
    result.host = (relative.host || relative.host === '') ?
                  relative.host : result.host;
    result.hostname = (relative.hostname || relative.hostname === '') ?
                      relative.hostname : result.hostname;
    result.search = relative.search;
    result.query = relative.query;
    srcPath = relPath;
    // fall through to the dot-handling below.
  } else if (relPath.length) {
    // it's relative
    // throw away the existing file, and take the new path instead.
    if (!srcPath) srcPath = [];
    srcPath.pop();
    srcPath = srcPath.concat(relPath);
    result.search = relative.search;
    result.query = relative.query;
  } else if (!isNullOrUndefined(relative.search)) {
    // just pull out the search.
    // like href='?foo'.
    // Put this after the other two cases because it simplifies the booleans
    if (psychotic) {
      result.hostname = result.host = srcPath.shift();
      //occationaly the auth can get stuck only in host
      //this especialy happens in cases like
      //url.resolveObject('mailto:local1@domain1', 'local2@domain2')
      var authInHost = result.host && result.host.indexOf('@') > 0 ?
                       result.host.split('@') : false;
      if (authInHost) {
        result.auth = authInHost.shift();
        result.host = result.hostname = authInHost.shift();
      }
    }
    result.search = relative.search;
    result.query = relative.query;
    //to support http.request
    if (!isNull(result.pathname) || !isNull(result.search)) {
      result.path = (result.pathname ? result.pathname : '') +
                    (result.search ? result.search : '');
    }
    result.href = result.format();
    return result;
  }

  if (!srcPath.length) {
    // no path at all.  easy.
    // we've already handled the other stuff above.
    result.pathname = null;
    //to support http.request
    if (result.search) {
      result.path = '/' + result.search;
    } else {
      result.path = null;
    }
    result.href = result.format();
    return result;
  }

  // if a url ENDs in . or .., then it must get a trailing slash.
  // however, if it ends in anything else non-slashy,
  // then it must NOT get a trailing slash.
  var last = srcPath.slice(-1)[0];
  var hasTrailingSlash = (
      (result.host || relative.host) && (last === '.' || last === '..') ||
      last === '');

  // strip single dots, resolve double dots to parent dir
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = srcPath.length; i >= 0; i--) {
    last = srcPath[i];
    if (last == '.') {
      srcPath.splice(i, 1);
    } else if (last === '..') {
      srcPath.splice(i, 1);
      up++;
    } else if (up) {
      srcPath.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (!mustEndAbs && !removeAllDots) {
    for (; up--; up) {
      srcPath.unshift('..');
    }
  }

  if (mustEndAbs && srcPath[0] !== '' &&
      (!srcPath[0] || srcPath[0].charAt(0) !== '/')) {
    srcPath.unshift('');
  }

  if (hasTrailingSlash && (srcPath.join('/').substr(-1) !== '/')) {
    srcPath.push('');
  }

  var isAbsolute = srcPath[0] === '' ||
      (srcPath[0] && srcPath[0].charAt(0) === '/');

  // put the host back
  if (psychotic) {
    result.hostname = result.host = isAbsolute ? '' :
                                    srcPath.length ? srcPath.shift() : '';
    //occationaly the auth can get stuck only in host
    //this especialy happens in cases like
    //url.resolveObject('mailto:local1@domain1', 'local2@domain2')
    var authInHost = result.host && result.host.indexOf('@') > 0 ?
                     result.host.split('@') : false;
    if (authInHost) {
      result.auth = authInHost.shift();
      result.host = result.hostname = authInHost.shift();
    }
  }

  mustEndAbs = mustEndAbs || (result.host && srcPath.length);

  if (mustEndAbs && !isAbsolute) {
    srcPath.unshift('');
  }

  if (!srcPath.length) {
    result.pathname = null;
    result.path = null;
  } else {
    result.pathname = srcPath.join('/');
  }

  //to support request.http
  if (!isNull(result.pathname) || !isNull(result.search)) {
    result.path = (result.pathname ? result.pathname : '') +
                  (result.search ? result.search : '');
  }
  result.auth = relative.auth || result.auth;
  result.slashes = result.slashes || relative.slashes;
  result.href = result.format();
  return result;
};

Url.prototype.parseHost = function() {
  var host = this.host;
  var port = portPattern.exec(host);
  if (port) {
    port = port[0];
    if (port !== ':') {
      this.port = port.substr(1);
    }
    host = host.substr(0, host.length - port.length);
  }
  if (host) this.hostname = host;
};

function isString(arg) {
  return typeof arg === "string";
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isNull(arg) {
  return arg === null;
}
function isNullOrUndefined(arg) {
  return  arg == null;
}

},{"punycode":15,"querystring":18}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL1JlcG9zaXRvcmllcy9nZXNzby5qcy9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiaW5kZXguanMiLCJoZWxwZXJzLmpzIiwibm9kZV9tb2R1bGVzL2dlc3NvL2NsaWVudC9jb250cm9sbGVyLmpzIiwibm9kZV9tb2R1bGVzL2dlc3NvL2NsaWVudC9kZWxlZ2F0ZS5qcyIsIm5vZGVfbW9kdWxlcy9nZXNzby9jbGllbnQvZ2Vzc28uanMiLCJub2RlX21vZHVsZXMvZ2Vzc28vY2xpZW50L2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2dlc3NvL2NsaWVudC9sb2dnaW5nLmpzIiwibm9kZV9tb2R1bGVzL2dlc3NvL2NsaWVudC9sb3dMZXZlbC5qcyIsIm5vZGVfbW9kdWxlcy9nZXNzby9jbGllbnQvdXRpbC5qcyIsIm5vZGVfbW9kdWxlcy9nZXNzby9jbGllbnQvdmVuZG9yL2hhbmQubWluLjEuMy44LmpzIiwibm9kZV9tb2R1bGVzL2dlc3NvL2NsaWVudC92ZW5kb3IvcmFmLmpzIiwibm9kZV9tb2R1bGVzL2dlc3NvL2luZGV4LmpzIiwiLi4vLi4vLi4vLi4vUmVwb3NpdG9yaWVzL2dlc3NvLmpzL25vZGVfbW9kdWxlcy9wYXRoLWJyb3dzZXJpZnkvaW5kZXguanMiLCIuLi8uLi8uLi8uLi9SZXBvc2l0b3JpZXMvZ2Vzc28uanMvbm9kZV9tb2R1bGVzL3Byb2Nlc3MvYnJvd3Nlci5qcyIsIi4uLy4uLy4uLy4uL1JlcG9zaXRvcmllcy9nZXNzby5qcy9ub2RlX21vZHVsZXMvcHVueWNvZGUvcHVueWNvZGUuanMiLCIuLi8uLi8uLi8uLi9SZXBvc2l0b3JpZXMvZ2Vzc28uanMvbm9kZV9tb2R1bGVzL3F1ZXJ5c3RyaW5nLWVzMy9kZWNvZGUuanMiLCIuLi8uLi8uLi8uLi9SZXBvc2l0b3JpZXMvZ2Vzc28uanMvbm9kZV9tb2R1bGVzL3F1ZXJ5c3RyaW5nLWVzMy9lbmNvZGUuanMiLCIuLi8uLi8uLi8uLi9SZXBvc2l0b3JpZXMvZ2Vzc28uanMvbm9kZV9tb2R1bGVzL3F1ZXJ5c3RyaW5nLWVzMy9pbmRleC5qcyIsIi4uLy4uLy4uLy4uL1JlcG9zaXRvcmllcy9nZXNzby5qcy9ub2RlX21vZHVsZXMvdXJsL3VybC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqaUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ05BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUVBOztBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25PQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5ZkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciBHZXNzbyA9IHJlcXVpcmUoJ2dlc3NvJyk7XHJcbnZhciBoZWxwZXJzID0gcmVxdWlyZSgnLi9oZWxwZXJzJyk7XHJcblxyXG52YXIgZ2FtZSA9IG5ldyBHZXNzbygpO1xyXG52YXIgZ3Jhdml0eSA9IDAuMztcclxudmFyIHNlYUxldmVsID0gODA7XHJcbnZhciBwbGF5ZXIgPSBudWxsO1xyXG52YXIgcm9ja3MgPSBbXTtcclxudmFyIGJ1cnN0SXRlbSA9IG51bGw7XHJcbnZhciBidXJzdEl0ZW1TZWVuID0gZmFsc2U7XHJcbnZhciBidXJzdFNwZWVkID0gMjtcclxudmFyIGJ1cnN0Q291bnQgPSAwO1xyXG52YXIgYnVyc3RNb2RlID0gZmFsc2U7XHJcbnZhciBidXJzdE1vZGVDb3VudCA9IDA7XHJcbnZhciBidXJzdE1vZGVNYXhDb3VudCA9IDUwMDtcclxudmFyIGxvbmdKdW1wID0gZmFsc2U7XHJcbnZhciBsb25nSnVtcENvbXBsZXRlQ291bnQgPSAwO1xyXG52YXIgbG9uZ0p1bXBDb21wbGV0ZU1heENvdW50ID0gMTIwO1xyXG52YXIgbG9uZ0p1bXBDb21wbGV0ZVNjb3JlID0gMTAwMDAwMDtcclxudmFyIGJhZEp1bXAgPSBmYWxzZTtcclxudmFyIGZyYW1lQ291bnQgPSAwO1xyXG52YXIgY3VycmVudExldmVsID0gLTE7XHJcbi8vIFRPRE86IHZhciBzY29yZUJ1ZmZlciA9IDA7XHJcbnZhciBzY29yZUZyYW1lQ291bnQgPSA2O1xyXG52YXIgc2NvcmVJbmNyZW1lbnQgPSAxMDA7XHJcbnZhciBoaWdoU2NvcmUgPSAwO1xyXG52YXIgaGlnaFNjb3JlVGltZSA9IDA7XHJcbnZhciBoaWdoU2NvcmVNYXhUaW1lID0gNjA7XHJcbnZhciBwYXJ0aWNsZXMgPSBbXTtcclxudmFyIGVuZEdhbWVQYXJ0aWNsZUNvdW50ID0gMTAwO1xyXG52YXIgYm90dG9tTGVld2F5ID0gNjA7XHJcbnZhciBidWJibGVzID0gW107XHJcbnZhciBzcGxhc2ggPSBbXTtcclxudmFyIGNsaWNrTG9jayA9IDA7XHJcbnZhciByZXNwYXduRGFuZ2VyID0gMDtcclxudmFyIGludmluY2liaWxpdHkgPSAwO1xyXG52YXIgaW52aW5jaWJpbGl0eUJsaW5rID0gMzA7XHJcblxyXG52YXIgbGV2ZWxTdGFydEZyYW1lcyA9IFswLCAxMjAsIDY2MCwgMTI2MCwgMjAwMCwgMzIwMCwgNDQwMCwgNTYwMCwgNjgwMF07XHJcbnZhciBsZXZlbFN0YXJ0U2NvcmUgPSBbXTtcclxuZm9yICh2YXIgbGV2ZWxTdGFydFNjb3JlSW5kZXggPSAwOyBsZXZlbFN0YXJ0U2NvcmVJbmRleCA8IGxldmVsU3RhcnRGcmFtZXMubGVuZ3RoOyBsZXZlbFN0YXJ0U2NvcmVJbmRleCsrKSB7XHJcbiAgbGV2ZWxTdGFydFNjb3JlLnB1c2goTWF0aC5mbG9vcihsZXZlbFN0YXJ0RnJhbWVzW2xldmVsU3RhcnRTY29yZUluZGV4XSAvIHNjb3JlRnJhbWVDb3VudCAqIHNjb3JlSW5jcmVtZW50IC8gMiAvIDEwMCkgKiAxMDApO1xyXG59XHJcbnZhciBsZXZlbHMgPSB7XHJcbiAgMDoge3NwZWVkOiA0LCBuZXdSb2NrTWF4V2lkdGg6IDEwMCwgbmV3Um9ja0ZyYW1lQ291bnQ6IDYwLCBuZXdCdXJzdEl0ZW1GcmFtZUNvdW50OiBudWxsfSxcclxuICAxOiB7c3BlZWQ6IDQsIG5ld1JvY2tNYXhXaWR0aDogMTAwLCBuZXdSb2NrRnJhbWVDb3VudDogMjAwLCBuZXdCdXJzdEl0ZW1GcmFtZUNvdW50OiBudWxsfSxcclxuICAyOiB7c3BlZWQ6IDQuMiwgbmV3Um9ja01heFdpZHRoOiAxMDAsIG5ld1JvY2tGcmFtZUNvdW50OiAxMDAsIG5ld0J1cnN0SXRlbUZyYW1lQ291bnQ6IG51bGx9LFxyXG4gIDM6IHtzcGVlZDogNC40LCBuZXdSb2NrTWF4V2lkdGg6IDEwMCwgbmV3Um9ja0ZyYW1lQ291bnQ6IDgwLCBuZXdCdXJzdEl0ZW1GcmFtZUNvdW50OiBudWxsfSxcclxuICA0OiB7c3BlZWQ6IDUsIG5ld1JvY2tNYXhXaWR0aDogMTIwLCBuZXdSb2NrRnJhbWVDb3VudDogNzUsIG5ld0J1cnN0SXRlbUZyYW1lQ291bnQ6IG51bGx9LFxyXG4gIDU6IHtzcGVlZDogNiwgbmV3Um9ja01heFdpZHRoOiAxNTAsIG5ld1JvY2tGcmFtZUNvdW50OiA3NSwgbmV3QnVyc3RJdGVtRnJhbWVDb3VudDogbnVsbH0sXHJcbiAgNjoge3NwZWVkOiA3LCBuZXdSb2NrTWF4V2lkdGg6IDE1MCwgbmV3Um9ja0ZyYW1lQ291bnQ6IDY1LCBuZXdCdXJzdEl0ZW1GcmFtZUNvdW50OiBudWxsfSxcclxuICA3OiB7c3BlZWQ6IDgsIG5ld1JvY2tNYXhXaWR0aDogMjI1LCBuZXdSb2NrRnJhbWVDb3VudDogNjUsIG5ld0J1cnN0SXRlbUZyYW1lQ291bnQ6IG51bGx9LFxyXG4gIDg6IHtzcGVlZDogOCwgbmV3Um9ja01heFdpZHRoOiAyNTAsIG5ld1JvY2tGcmFtZUNvdW50OiA2NSwgbmV3QnVyc3RJdGVtRnJhbWVDb3VudDogMTIwLCBuZXdCdXJzdEl0ZW1GcmFtZVJlcGVhdDogMTIwMH1cclxufTtcclxuXHJcbmZ1bmN0aW9uIG5ld0dhbWUoKSB7XHJcbiAgLy8gRmlyc3QgcGxheVxyXG4gIGlmIChjdXJyZW50TGV2ZWwgPT09IC0xKSB7XHJcbiAgICBjdXJyZW50TGV2ZWwgPSAwO1xyXG4gIH1cclxuICAvLyBSZWR1Y2UgbGV2ZWxcclxuICBpZiAoY3VycmVudExldmVsID4gMCkge1xyXG4gICAgY3VycmVudExldmVsIC09IDE7XHJcbiAgfVxyXG4gIC8vIENyZWF0ZSBwbGF5ZXJcclxuICBwbGF5ZXIgPSB7XHJcbiAgICB4OiAxMDAsXHJcbiAgICB5OiAyMDAsXHJcbiAgICBzeTogMSxcclxuICAgIHZlbG9jaXR5OiAtMTAsXHJcbiAgICBqdW1wVmVsb2NpdHk6IDgsXHJcbiAgICB0ZXJtaW5hbFZlbG9jaXR5OiA3LFxyXG4gICAgbGV2ZWxVcEJ1YmJsZXM6IDAsXHJcbiAgICBzY29yZTogbGV2ZWxTdGFydFNjb3JlW2N1cnJlbnRMZXZlbF1cclxuICB9O1xyXG4gIC8vIFJlc2V0IGZyYW1lIGNvdW50XHJcbiAgZnJhbWVDb3VudCA9IGxldmVsU3RhcnRGcmFtZXNbY3VycmVudExldmVsXTtcclxuICAvLyBSZXNldCBidXJzdCBtb2RlXHJcbiAgYnVyc3RJdGVtU2VlbiA9IGZhbHNlO1xyXG4gIGJ1cnN0Q291bnQgPSAwO1xyXG4gIGJ1cnN0TW9kZSA9IGZhbHNlO1xyXG4gIGJ1cnN0TW9kZUNvdW50ID0gMDtcclxuICBsb25nSnVtcCA9IGZhbHNlO1xyXG4gIGJhZEp1bXAgPSBmYWxzZTtcclxuICAvLyBSZXNldCB3aXRoIGludmluY2liaWxpdHkgaWYgaW4gZGFuZ2VyXHJcbiAgaWYgKHJlc3Bhd25EYW5nZXIgPiAwKSB7XHJcbiAgICBpbnZpbmNpYmlsaXR5ID0gNjAgKiAzO1xyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gZW5kR2FtZSgpIHtcclxuICBpZiAoIXBsYXllcikge1xyXG4gICAgcmV0dXJuO1xyXG4gIH1cclxuXHJcbiAgLy8gU2V0IHRoZSBuZXcgaGlnaCBzY29yZSwgYW5pbWF0aW5nIGl0LCBpZiB0aGUgcmVjb3JkIHdhcyBicm9rZW5cclxuICBpZiAocGxheWVyLnNjb3JlID4gaGlnaFNjb3JlKSB7XHJcbiAgICBoaWdoU2NvcmUgPSBwbGF5ZXIuc2NvcmU7XHJcbiAgICBoaWdoU2NvcmVUaW1lID0gaGlnaFNjb3JlTWF4VGltZTtcclxuICB9XHJcblxyXG4gIC8vIEV4cGxvZGVcclxuICBmb3IgKHZhciBpbmRleCA9IDA7IGluZGV4IDwgZW5kR2FtZVBhcnRpY2xlQ291bnQ7IGluZGV4KyspIHtcclxuICAgIHZhciBhbmdsZSA9IGhlbHBlcnMucmFuZEludCgwLCAzNjApO1xyXG4gICAgdmFyIHZlbG9jaXR5ID0gaGVscGVycy5yYW5kSW50KDEwLCAyMCk7XHJcbiAgICBwYXJ0aWNsZXMucHVzaCh7XHJcbiAgICAgIHg6IHBsYXllci54LFxyXG4gICAgICB5OiBwbGF5ZXIueSxcclxuICAgICAgdng6IE1hdGguY29zKGFuZ2xlICogTWF0aC5QSSAvIDE4MCkgKiB2ZWxvY2l0eSAtIDYsXHJcbiAgICAgIHZ5OiBNYXRoLnNpbihhbmdsZSAqIE1hdGguUEkgLyAxODApICogdmVsb2NpdHlcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgLy8gQmFkIGp1bXAgaWYgaW4gYnVyc3QgbW9kZVxyXG4gIGlmIChidXJzdE1vZGUgfHwgbG9uZ0p1bXApIHtcclxuICAgIGJhZEp1bXAgPSB0cnVlO1xyXG4gIH1cclxuXHJcbiAgLy8gVXNlIGludmluY2liaWxpdHkgdW50aWwgYWxsIHJvY2tzIHBhc3NcclxuICByZXNwYXduRGFuZ2VyID0gZ2FtZS53aWR0aCAtIHBsYXllci54ICsgbGV2ZWxzW2N1cnJlbnRMZXZlbF0ubmV3Um9ja01heFdpZHRoO1xyXG5cclxuICAvLyBTZXQgdG8gbm90IHBsYXlpbmdcclxuICBwbGF5ZXIgPSBudWxsO1xyXG4gIGNsaWNrTG9jayA9IDMwO1xyXG59XHJcblxyXG5mdW5jdGlvbiBuZXdTcGxhc2goKSB7XHJcbiAgZm9yICh2YXIgcyA9IDA7IHMgPCAyMDsgcysrKSB7XHJcbiAgICB2YXIgYXggPSBNYXRoLnJhbmRvbSgpICogNCAtIDM7XHJcbiAgICB2YXIgYXkgPSAtKE1hdGgucmFuZG9tKCkgKiAyICsgMSk7XHJcbiAgICBzcGxhc2gucHVzaCh7eDogcGxheWVyLnggKyBheCwgeTogc2VhTGV2ZWwsIHZ4OiBheCwgdnk6IGF5LCByOiBoZWxwZXJzLnJhbmRJbnQoMSwgMil9KTtcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIG5ld0J1YmJsZShwcm9iYWJpbGl0eSkge1xyXG4gIGlmIChwbGF5ZXIgJiYgaGVscGVycy5yYW5kSW50KDEsIHByb2JhYmlsaXR5KSA9PT0gMSkge1xyXG4gICAgYnViYmxlcy5wdXNoKHt4OiBwbGF5ZXIueCwgeTogcGxheWVyLnksIHI6IGhlbHBlcnMucmFuZEludCgyLCA0KX0pO1xyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gY2xpY2soKSB7XHJcbiAgLy8gUHJldmVudCBhY2NpZGVudGFsIG5ldyBnYW1lIGNsaWNrXHJcbiAgaWYgKGNsaWNrTG9jayA+IDAgfHwgbG9uZ0p1bXApIHtcclxuICAgIHJldHVybiBmYWxzZTtcclxuICB9XHJcblxyXG4gIC8vIENyZWF0ZSBuZXcgcGxheWVyLCBpZiBub3QgY3VycmVudGx5IHBsYXlpbmdcclxuICBpZiAoIXBsYXllcikge1xyXG4gICAgbmV3R2FtZSgpO1xyXG4gICAgcmV0dXJuIGZhbHNlO1xyXG4gIH1cclxuXHJcbiAgLy8gU3dpbSAvIGp1bXBcclxuICBpZiAocGxheWVyLnkgKyA1ID4gc2VhTGV2ZWwpIHtcclxuICAgIHBsYXllci52ZWxvY2l0eSA9IC1wbGF5ZXIuanVtcFZlbG9jaXR5O1xyXG4gICAgcGxheWVyLnN5ID0gMS42O1xyXG4gICAgbmV3QnViYmxlKDEwKTtcclxuICB9XHJcbn1cclxuXHJcbmdhbWUuY2xpY2soY2xpY2spO1xyXG5nYW1lLmtleWRvd24oZnVuY3Rpb24gKGUpIHtcclxuICBpZiAoZS53aGljaCA9PT0gMzIpIHtcclxuICAgIGNsaWNrKCk7XHJcbiAgICByZXR1cm4gdHJ1ZTtcclxuICB9XHJcbn0pO1xyXG5cclxuZ2FtZS51cGRhdGUoZnVuY3Rpb24gKCkge1xyXG4gIC8vIFVwZGF0ZSBmcmFtZSBjb3VudCwgd2hpY2ggcmVwcmVzZW50cyB0aW1lIHBhc3NlZFxyXG4gIGZyYW1lQ291bnQgKz0gMTtcclxuXHJcbiAgaWYgKGNsaWNrTG9jayA+IDApIHtcclxuICAgIGNsaWNrTG9jayAtPSAxO1xyXG4gIH1cclxuXHJcbiAgLy8gRG8gbm90aGluZyBlbHNlIGlmIHRoaXMgaXMgdGhlIGZpcnN0IHRpbWUgcGxheWluZ1xyXG4gIGlmIChjdXJyZW50TGV2ZWwgPT09IC0xKSB7XHJcbiAgICByZXR1cm47XHJcbiAgfVxyXG5cclxuICAvLyBTZXQgZGlmZmljdWx0eSBhcyBhIGZ1bmN0aW9uIG9mIHRpbWVcclxuICBpZiAocGxheWVyKSB7XHJcbiAgICBpZiAoY3VycmVudExldmVsICsgMSA8IGxldmVsU3RhcnRGcmFtZXMubGVuZ3RoICYmIGZyYW1lQ291bnQgPj0gbGV2ZWxTdGFydEZyYW1lc1tjdXJyZW50TGV2ZWwgKyAxXSkge1xyXG4gICAgICBjdXJyZW50TGV2ZWwgKz0gMTtcclxuICAgICAgcGxheWVyLmxldmVsVXBCdWJibGVzID0gMjAgKiBjdXJyZW50TGV2ZWwgKyAxMDtcclxuICAgIH1cclxuICAgIC8vIFNob3cgbGV2ZWwgdXAgZWZmZWN0XHJcbiAgICBpZiAocGxheWVyLmxldmVsVXBCdWJibGVzID4gMCkge1xyXG4gICAgICBwbGF5ZXIubGV2ZWxVcEJ1YmJsZXMgLT0gMTtcclxuICAgICAgZm9yICh2YXIgdSA9IDA7IHUgPCAxMDsgdSsrKSB7XHJcbiAgICAgICAgbmV3QnViYmxlKDEwKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLy8gR2V0IGN1cnJlbnQgbGV2ZWxcclxuICB2YXIgbGV2ZWwgPSBsZXZlbHNbY3VycmVudExldmVsXTtcclxuXHJcbiAgLy8gQWRqdXN0IGludmluY2liaWxpdHlcclxuICBpZiAoaW52aW5jaWJpbGl0eSA+IDApIHtcclxuICAgIGludmluY2liaWxpdHkgLT0gMTtcclxuICB9XHJcbiAgLy8gQWRqdXN0IHJlLXNwYXduIGRhbmdlciwgYWRqdXN0ZWQgZm9yIHRoZSBjdXJyZW50IHNwZWVkXHJcbiAgaWYgKHJlc3Bhd25EYW5nZXIgPiAwKSB7XHJcbiAgICByZXNwYXduRGFuZ2VyID0gTWF0aC5tYXgocmVzcGF3bkRhbmdlciAtIGxldmVsLnNwZWVkLCAwKTtcclxuICB9XHJcblxyXG4gIC8vIENyZWF0ZSBuZXcgYnVyc3QgaXRlbVxyXG4gIGlmIChwbGF5ZXIgJiYgbGV2ZWwubmV3QnVyc3RJdGVtRnJhbWVDb3VudCAmJiAhYnVyc3RNb2RlKSB7XHJcbiAgICBidXJzdENvdW50ICs9IDE7XHJcbiAgICAvLyBBZGQgdGhlIGJ1cnN0IGl0ZW0gc3VjaCB0aGF0IGl0IGNhbiBiZSBpbnRlcnNlY3RlZCByaWdodCBhZnRlciBhIGxvbmcganVtcFxyXG4gICAgaWYgKCFidXJzdEl0ZW0gJiZcclxuICAgICAgICAoYnVyc3RDb3VudCA+PSAoIWJ1cnN0SXRlbVNlZW4gPyBsZXZlbC5uZXdCdXJzdEl0ZW1GcmFtZUNvdW50IDogbGV2ZWwubmV3QnVyc3RJdGVtRnJhbWVSZXBlYXQpKSAmJlxyXG4gICAgICAgIChmcmFtZUNvdW50IC0gbGV2ZWwubmV3Um9ja0ZyYW1lQ291bnQgKiAobGV2ZWwuc3BlZWQgLyBidXJzdFNwZWVkKSAtIGxldmVsLm5ld1JvY2tNYXhXaWR0aCAtIDQpICUgbGV2ZWwubmV3Um9ja0ZyYW1lQ291bnQgPT09IDApIHtcclxuICAgICAgYnVyc3RJdGVtID0ge3g6IGdhbWUud2lkdGgsIHk6IDM2LCByOiA2fTtcclxuICAgICAgYnVyc3RJdGVtU2VlbiA9IHRydWU7XHJcbiAgICAgIGJ1cnN0Q291bnQgPSAwO1xyXG4gICAgfVxyXG4gIH1cclxuICAvLyBVcGRhdGUgYnVyc3QgaXRlbVxyXG4gIGlmIChidXJzdEl0ZW0pIHtcclxuICAgIGJ1cnN0SXRlbS54IC09IGJ1cnN0U3BlZWQ7XHJcbiAgICBidXJzdEl0ZW0ueSA9IHNlYUxldmVsIC0gMTYgLSBNYXRoLmFicyhNYXRoLnNpbihmcmFtZUNvdW50IC8gMTIpKSAqIDI0O1xyXG4gICAgLy8gRGVsZXRlIGJ1cnN0IGl0ZW0gd2hlbiBvdXQgb2YgYm91bmRzXHJcbiAgICBpZiAoYnVyc3RJdGVtLnggKyBidXJzdEl0ZW0uciA8IDApIHtcclxuICAgICAgYnVyc3RJdGVtID0gbnVsbDtcclxuICAgIH1cclxuICB9XHJcbiAgLy8gQ2hlY2sgZm9yIGludGVyc2VjdGlvbiB3aXRoIHBsYXllclxyXG4gIGlmIChwbGF5ZXIgJiYgYnVyc3RJdGVtICYmXHJcbiAgICAgIGhlbHBlcnMuaW50ZXJzZWN0ZWQoe3g6IHBsYXllci54IC0gMTAsIHk6IHBsYXllci55IC0gMTAsIHdpZHRoOiA0MCwgaGVpZ2h0OiAyMH0sXHJcbiAgICAgICAge3g6IGJ1cnN0SXRlbS54LCB5OiBidXJzdEl0ZW0ueSwgd2lkdGg6IGJ1cnN0SXRlbS5yLCBoZWlnaHQ6IGJ1cnN0SXRlbS5yfSkpIHtcclxuICAgIGJ1cnN0TW9kZSA9IHRydWU7XHJcbiAgICBidXJzdE1vZGVDb3VudCA9IDA7XHJcbiAgICBidXJzdEl0ZW0gPSBudWxsO1xyXG4gIH1cclxuXHJcbiAgLy8gVXBkYXRlIHJvY2tzXHJcbiAgZm9yICh2YXIgciA9IDA7IHIgPCByb2Nrcy5sZW5ndGg7IHIrKykge1xyXG4gICAgcm9ja3Nbcl0ueCAtPSBsZXZlbC5zcGVlZDtcclxuICAgIGlmIChidXJzdE1vZGUpIHtcclxuICAgICAgcm9ja3Nbcl0ueCAtPSBidXJzdE1vZGVDb3VudCAvIDg7XHJcbiAgICB9IGVsc2UgaWYgKGxvbmdKdW1wKSB7XHJcbiAgICAgIHJvY2tzW3JdLnggLT0gMTAwICsgbGV2ZWwuc3BlZWQ7XHJcbiAgICB9XHJcbiAgICAvLyBEZWxldGUgcm9jayB3aGVuIG91dCBvZiBib3VuZHNcclxuICAgIGlmIChyb2Nrc1tyXS54ICsgcm9ja3Nbcl0ud2lkdGggPCAwKSB7XHJcbiAgICAgIHJvY2tzLnNwbGljZShyLCAxKTtcclxuICAgICAgci0tO1xyXG4gICAgfVxyXG4gIH1cclxuICAvLyBDaGVjayBmb3IgZW5kIG9mIGxvbmcganVtcFxyXG4gIGlmIChsb25nSnVtcCAmJiByb2Nrcy5sZW5ndGggPT09IDApIHtcclxuICAgIGxvbmdKdW1wID0gZmFsc2U7XHJcbiAgICBpZiAoIWJhZEp1bXApIHtcclxuICAgICAgbG9uZ0p1bXBDb21wbGV0ZUNvdW50ID0gbG9uZ0p1bXBDb21wbGV0ZU1heENvdW50O1xyXG4gICAgICAvLyBUT0RPOiBBbmltYXRlXHJcbiAgICAgIHBsYXllci5zY29yZSArPSBsb25nSnVtcENvbXBsZXRlU2NvcmU7XHJcbiAgICB9XHJcbiAgfVxyXG4gIC8vIENyZWF0ZSBhIG5ldyByb2NrXHJcbiAgaWYgKCFidXJzdE1vZGUgJiYgIWxvbmdKdW1wKSB7XHJcbiAgICBpZiAoZnJhbWVDb3VudCAlIGxldmVsLm5ld1JvY2tGcmFtZUNvdW50ID09PSAwKSB7XHJcbiAgICAgIHZhciBmbG9hdGVyID0gcGxheWVyID8gISFoZWxwZXJzLnJhbmRJbnQoMCwgMSkgOiBmYWxzZTtcclxuICAgICAgdmFyIGhlaWdodCA9IGhlbHBlcnMucmFuZEludCgyMDAsIHBsYXllciA/IDMwMCA6IDI1MCk7XHJcbiAgICAgIHJvY2tzLnB1c2goe1xyXG4gICAgICAgIHg6IGdhbWUud2lkdGgsXHJcbiAgICAgICAgeTogZmxvYXRlciA/IHNlYUxldmVsIC0gKDEwICogaGVscGVycy5yYW5kSW50KDEsIDIpKSA6IGdhbWUuaGVpZ2h0IC0gaGVpZ2h0LFxyXG4gICAgICAgIHdpZHRoOiBoZWxwZXJzLnJhbmRJbnQoMzAsIGxldmVsLm5ld1JvY2tNYXhXaWR0aCksXHJcbiAgICAgICAgaGVpZ2h0OiBoZWlnaHRcclxuICAgICAgfSk7XHJcbiAgICB9XHJcbiAgfSBlbHNlIGlmICghbG9uZ0p1bXApIHtcclxuICAgIHZhciB2ID0gTWF0aC5mbG9vcihidXJzdE1vZGVDb3VudCAvIGJ1cnN0TW9kZU1heENvdW50ICogNCk7XHJcbiAgICBpZiAoYnVyc3RNb2RlQ291bnQgJSA4ID09PSAwKSB7XHJcbiAgICAgIHZhciBoID0gNjAgKyB2ICogNjA7XHJcbiAgICAgIHJvY2tzLnB1c2goe1xyXG4gICAgICAgIHg6IGdhbWUud2lkdGgsXHJcbiAgICAgICAgeTogZ2FtZS5oZWlnaHQgLSBoLFxyXG4gICAgICAgIHdpZHRoOiAzMCArIHYgKiA1MCxcclxuICAgICAgICBoZWlnaHQ6IGhcclxuICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICBidXJzdE1vZGVDb3VudCArPSAxO1xyXG4gICAgaWYgKGJ1cnN0TW9kZUNvdW50ID49IGJ1cnN0TW9kZU1heENvdW50KSB7XHJcbiAgICAgIGJ1cnN0TW9kZSA9IGZhbHNlO1xyXG4gICAgICBidXJzdE1vZGVDb3VudCA9IDA7XHJcbiAgICAgIGxvbmdKdW1wID0gdHJ1ZTtcclxuICAgICAgcm9ja3MucHVzaCh7XHJcbiAgICAgICAgeDogZ2FtZS53aWR0aCxcclxuICAgICAgICB5OiBzZWFMZXZlbCAtIDIwLFxyXG4gICAgICAgIHdpZHRoOiAzMDAwLFxyXG4gICAgICAgIGhlaWdodDogZ2FtZS5oZWlnaHQgLSBzZWFMZXZlbFxyXG4gICAgICB9KTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8vIFVwZGF0ZSBidWJibGVzXHJcbiAgZm9yICh2YXIgYiA9IDA7IGIgPCBidWJibGVzLmxlbmd0aDsgYisrKSB7XHJcbiAgICBidWJibGVzW2JdLnggLT0gMztcclxuICAgIGlmIChidXJzdE1vZGUgfHwgbG9uZ0p1bXApIHtcclxuICAgICAgYnViYmxlc1tiXS54IC09ICgoYnVyc3RNb2RlQ291bnQpIC8gYnVyc3RNb2RlTWF4Q291bnQpICogMTA7XHJcbiAgICB9XHJcbiAgICBpZiAoaGVscGVycy5yYW5kSW50KDEsIDMpID09PSAxKSB7XHJcbiAgICAgIGJ1YmJsZXNbYl0ueCAtPSAxO1xyXG4gICAgfVxyXG4gICAgaWYgKGhlbHBlcnMucmFuZEludCgxLCA1KSkge1xyXG4gICAgICBidWJibGVzW2JdLnkgKz0gaGVscGVycy5yYW5kSW50KC0zLCAxKTtcclxuICAgIH1cclxuICAgIC8vIERlbGV0ZSBidWJibGUgd2hlbiBvdXQgb2YgYm91bmRzXHJcbiAgICBpZiAoYnViYmxlc1tiXS54ICsgYnViYmxlc1tiXS5yIDwgMCB8fCBidWJibGVzW2JdLnkgPD0gc2VhTGV2ZWwpIHtcclxuICAgICAgYnViYmxlcy5zcGxpY2UoYiwgMSk7XHJcbiAgICAgIGItLTtcclxuICAgIH1cclxuICB9XHJcbiAgLy8gUmFuZG9tbHkgYWRkIGEgbmV3IGJ1YmJsZVxyXG4gIGlmIChwbGF5ZXIpIHtcclxuICAgIG5ld0J1YmJsZSgxMDApO1xyXG4gIH1cclxuICAvLyBBZGQgYnViYmxlcyBpbiBidXJzdCBtb2RlXHJcbiAgaWYgKGJ1cnN0TW9kZSkge1xyXG4gICAgZm9yICh2YXIgYnUgPSAwOyBidSA8IDEwOyBidSsrKSB7XHJcbiAgICAgIG5ld0J1YmJsZSgxMCk7XHJcbiAgICB9XHJcbiAgfVxyXG4gIC8vIENoZWNrIGZvciByb2NrIC8gYnViYmxlIGNvbGxpc2lvbnNcclxuICBmb3IgKHIgPSAwOyByIDwgcm9ja3MubGVuZ3RoOyByKyspIHtcclxuICAgIGZvciAoYiA9IDA7IGIgPCBidWJibGVzLmxlbmd0aDsgYisrKSB7XHJcbiAgICAgIGlmIChoZWxwZXJzLmludGVyc2VjdGVkKHt4OiBidWJibGVzW2JdLngsIHk6IGJ1YmJsZXNbYl0ueSwgd2lkdGg6IGJ1YmJsZXNbYl0uciwgaGVpZ2h0OiBidWJibGVzW2JdLnJ9LCByb2Nrc1tyXSkpIHtcclxuICAgICAgICBidWJibGVzLnNwbGljZShiLCAxKTtcclxuICAgICAgICBiLS07XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8vIFVwZGF0ZSBzcGxhc2hcclxuICBmb3IgKHZhciBzID0gMDsgcyA8IHNwbGFzaC5sZW5ndGg7IHMrKykge1xyXG4gICAgc3BsYXNoW3NdLnggKz0gc3BsYXNoW3NdLnZ4O1xyXG4gICAgc3BsYXNoW3NdLnkgKz0gc3BsYXNoW3NdLnZ5O1xyXG4gICAgc3BsYXNoW3NdLnZ5ICs9IGdyYXZpdHk7XHJcbiAgICAvLyBEZWxldGUgc3BsYXNoXHJcbiAgICBpZiAoc3BsYXNoW3NdLnkgPiBzZWFMZXZlbCkge1xyXG4gICAgICBzcGxhc2guc3BsaWNlKHMsIDEpO1xyXG4gICAgICBzLS07XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvLyBVcGRhdGUgcGFydGljbGVzXHJcbiAgZm9yICh2YXIgcCA9IDA7IHAgPCBwYXJ0aWNsZXMubGVuZ3RoOyBwKyspIHtcclxuICAgIHBhcnRpY2xlc1twXS54IC09IHBhcnRpY2xlc1twXS52eDtcclxuICAgIHBhcnRpY2xlc1twXS55IC09IHBhcnRpY2xlc1twXS52eTtcclxuICAgIC8vIERlbGV0ZSBwYXJ0aWNsZSB3aGVuIG91dCBvZiBib3VuZHNcclxuICAgIGlmIChwYXJ0aWNsZXNbcF0ueCArIDMgPCAwIHx8IHBhcnRpY2xlc1twXS55ICsgMyA8IDAgfHxcclxuICAgICAgICBwYXJ0aWNsZXNbcF0ueCAtIDMgPiBnYW1lLndpZHRoIHx8IHBhcnRpY2xlc1twXS55IC0gMyA+IGdhbWUuaGVpZ2h0ICsgYm90dG9tTGVld2F5KSB7XHJcbiAgICAgIHBhcnRpY2xlcy5zcGxpY2UocCwgMSk7XHJcbiAgICAgIHAtLTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8vIFVwZGF0ZSBoaWdoIHNjb3JlIGFuaW1hdGlvblxyXG4gIGlmIChoaWdoU2NvcmVUaW1lID4gMCkge1xyXG4gICAgaGlnaFNjb3JlVGltZSAtPSAxO1xyXG4gIH1cclxuXHJcbiAgLy8gU2tpcCBwbGF5ZXIgbG9naWMgaWYgbm90IGN1cnJlbnRseSBwbGF5aW5nXHJcbiAgaWYgKCFwbGF5ZXIpIHtcclxuICAgIHJldHVybjtcclxuICB9XHJcblxyXG4gIC8vIENoZWNrIGZvciBjb2xsaXNpb25zXHJcbiAgZm9yIChyID0gMDsgciA8IHJvY2tzLmxlbmd0aDsgcisrKSB7XHJcbiAgICBpZiAoaW52aW5jaWJpbGl0eSA9PT0gMCAmJiBoZWxwZXJzLmludGVyc2VjdGVkKHt4OiBwbGF5ZXIueCwgeTogcGxheWVyLnksIHdpZHRoOiAyMCwgaGVpZ2h0OiAxMH0sIHJvY2tzW3JdKSkge1xyXG4gICAgICBlbmRHYW1lKCk7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8vIFVwZGF0ZSBwbGF5ZXJcclxuICBpZiAoZnJhbWVDb3VudCAlIHNjb3JlRnJhbWVDb3VudCA9PT0gMCkge1xyXG4gICAgcGxheWVyLnNjb3JlICs9IHNjb3JlSW5jcmVtZW50O1xyXG4gIH1cclxuICBpZiAocGxheWVyLnN5ID4gMSkge1xyXG4gICAgcGxheWVyLnN5IC09IDAuMTtcclxuICB9XHJcbiAgaWYgKHBsYXllci5iZXN0ICYmIHBsYXllci5zY29yZSA+IHBsYXllci5iZXN0KSB7XHJcbiAgICBwbGF5ZXIuYmVzdCA9IHBsYXllci5zY29yZTtcclxuICB9XHJcbiAgcGxheWVyLnZlbG9jaXR5ICs9IGdyYXZpdHk7XHJcbiAgaWYgKHBsYXllci52ZWxvY2l0eSA+IHBsYXllci50ZXJtaW5hbFZlbG9jaXR5KSB7XHJcbiAgICBwbGF5ZXIudmVsb2NpdHkgPSBwbGF5ZXIudGVybWluYWxWZWxvY2l0eTtcclxuICB9XHJcbiAgcGxheWVyLnkgKz0gcGxheWVyLnZlbG9jaXR5O1xyXG4gIGlmIChwbGF5ZXIueSA+PSBnYW1lLmhlaWdodCArIGJvdHRvbUxlZXdheSkge1xyXG4gICAgZW5kR2FtZSgpO1xyXG4gICAgcmV0dXJuO1xyXG4gIH1cclxuICBpZiAoKHBsYXllci55IC0gcGxheWVyLnZlbG9jaXR5ID49IHNlYUxldmVsICYmIHBsYXllci55IDwgc2VhTGV2ZWwpIHx8XHJcbiAgICAgIChwbGF5ZXIueSAtIHBsYXllci52ZWxvY2l0eSA8PSBzZWFMZXZlbCAmJiBwbGF5ZXIueSA+IHNlYUxldmVsKSkge1xyXG4gICAgbmV3U3BsYXNoKCk7XHJcbiAgfVxyXG59KTtcclxuXHJcbmdhbWUucmVuZGVyKGZ1bmN0aW9uIChjdHgpIHtcclxuICAvLyBEcmF3IGJhY2tncm91bmRcclxuICBjdHguZmlsbFN0eWxlID0gJyNlY2UnO1xyXG4gIGN0eC5maWxsUmVjdCgwLCAwLCBnYW1lLndpZHRoLCBnYW1lLmhlaWdodCk7XHJcblxyXG4gIC8vIERyYXcgc2t5XHJcbiAgdmFyIGdyZCA9IGN0eC5jcmVhdGVMaW5lYXJHcmFkaWVudChnYW1lLndpZHRoIC8gMiwgMC4wMDAsIGdhbWUud2lkdGggLyAyLCBzZWFMZXZlbCk7XHJcbiAgZ3JkLmFkZENvbG9yU3RvcCgwLjAwMCwgJyM4MGJlZmMnKTtcclxuICBncmQuYWRkQ29sb3JTdG9wKDEuMDAwLCAnI2NiY2ZlZCcpO1xyXG4gIGN0eC5maWxsU3R5bGUgPSBncmQ7XHJcbiAgY3R4LmZpbGxSZWN0KDAsIDAsIGdhbWUud2lkdGgsIHNlYUxldmVsKTtcclxuXHJcbiAgLy8gRHJhdyB3YXRlclxyXG4gIGdyZCA9IGN0eC5jcmVhdGVMaW5lYXJHcmFkaWVudChnYW1lLndpZHRoIC8gMiwgc2VhTGV2ZWwsIGdhbWUud2lkdGggLyAyLCBnYW1lLmhlaWdodCAtIHNlYUxldmVsKTtcclxuICBncmQuYWRkQ29sb3JTdG9wKDAuMDAwLCAnIzdFQkRGQycpO1xyXG4gIGdyZC5hZGRDb2xvclN0b3AoMC4xMDAsICcjMDA3ZmZmJyk7XHJcbiAgZ3JkLmFkZENvbG9yU3RvcCgxLjAwMCwgJyMwMDNmN2YnKTtcclxuICBjdHguZmlsbFN0eWxlID0gZ3JkO1xyXG4gIGN0eC5maWxsUmVjdCgwLCBzZWFMZXZlbCwgZ2FtZS53aWR0aCwgZ2FtZS5oZWlnaHQgLSBzZWFMZXZlbCk7XHJcblxyXG4gIC8vIFdhdGVyIGxpZ2h0aW5nIChub3RlOiBjb29yZGluYXRlcyBhcmUgb2ZmLCBidXQgdGhlIG1pc3Rha2UgbG9va3MgYmV0dGVyKVxyXG4gIGdyZCA9IGN0eC5jcmVhdGVMaW5lYXJHcmFkaWVudCgwLCAwLCBnYW1lLndpZHRoLCBnYW1lLmhlaWdodCAtIHNlYUxldmVsKTtcclxuICBncmQuYWRkQ29sb3JTdG9wKDAuMDAwLCAncmdiYSgwLCAxMjcsIDI1NSwgMC4yKScpO1xyXG4gIGdyZC5hZGRDb2xvclN0b3AoMC4xMDAsICdyZ2JhKDI1NSwgMjU1LCAyNTUsIDAuMiknKTtcclxuICBncmQuYWRkQ29sb3JTdG9wKDAuMjAwLCAncmdiYSgwLCAxMjcsIDI1NSwgMC4yKScpO1xyXG4gIGdyZC5hZGRDb2xvclN0b3AoMC41MDAsICdyZ2JhKDI1NSwgMjU1LCAyNTUsIDAuMiknKTtcclxuICBncmQuYWRkQ29sb3JTdG9wKDAuNjAwLCAncmdiYSgwLCAxMjcsIDI1NSwgMC4yKScpO1xyXG4gIGdyZC5hZGRDb2xvclN0b3AoMC44MDAsICdyZ2JhKDI1NSwgMjU1LCAyNTUsIDAuMiknKTtcclxuICBncmQuYWRkQ29sb3JTdG9wKDEuMDAwLCAncmdiYSgwLCAxMjcsIDI1NSwgMC4yKScpO1xyXG4gIGN0eC5maWxsU3R5bGUgPSBncmQ7XHJcbiAgY3R4LmZpbGxSZWN0KDAsIHNlYUxldmVsLCBnYW1lLndpZHRoLCBnYW1lLmhlaWdodCAtIHNlYUxldmVsKTtcclxuXHJcbiAgLy8gRHJhdyBidXJzdCBpdGVtXHJcbiAgaWYgKGJ1cnN0SXRlbSkge1xyXG4gICAgaGVscGVycy5maWxsQ2lyY2xlKGN0eCwgYnVyc3RJdGVtLngsIGJ1cnN0SXRlbS55LCBidXJzdEl0ZW0uciwgJyNEMzQzODQnKTtcclxuICB9XHJcblxyXG4gIC8vIERyYXcgc3BsYXNoXHJcbiAgZm9yICh2YXIgcyA9IDA7IHMgPCBzcGxhc2gubGVuZ3RoOyBzKyspIHtcclxuICAgIGhlbHBlcnMuZmlsbENpcmNsZShjdHgsIHNwbGFzaFtzXS54LCBzcGxhc2hbc10ueSwgc3BsYXNoW3NdLnIsICcjN0VCREZDJyk7XHJcbiAgfVxyXG5cclxuICAvLyBEcmF3IGJ1YmJsZXNcclxuICBmb3IgKHZhciBiID0gMDsgYiA8IGJ1YmJsZXMubGVuZ3RoOyBiKyspIHtcclxuICAgIGhlbHBlcnMuZmlsbENpcmNsZShjdHgsIGJ1YmJsZXNbYl0ueCwgYnViYmxlc1tiXS55LCBidWJibGVzW2JdLnIsICdyZ2JhKDI1NSwgMjU1LCAyNTUsIDAuOCknKTtcclxuICB9XHJcblxyXG4gIC8vIERyYXcgcm9ja3NcclxuICBmb3IgKHZhciByID0gMDsgciA8IHJvY2tzLmxlbmd0aDsgcisrKSB7XHJcbiAgICBjdHguZmlsbFN0eWxlID0gJyM1ZDQnO1xyXG4gICAgY3R4LmZpbGxSZWN0KHJvY2tzW3JdLngsIHJvY2tzW3JdLnksIHJvY2tzW3JdLndpZHRoLCByb2Nrc1tyXS5oZWlnaHQpO1xyXG4gIH1cclxuXHJcbiAgLy8gRHJhdyBwYXJ0aWNsZXNcclxuICBmb3IgKHZhciBwID0gMDsgcCA8IHBhcnRpY2xlcy5sZW5ndGg7IHArKykge1xyXG4gICAgaGVscGVycy5maWxsQ2lyY2xlKGN0eCwgcGFydGljbGVzW3BdLngsIHBhcnRpY2xlc1twXS55LCAzLCAnI2ZmNCcpO1xyXG4gIH1cclxuXHJcbiAgLy8gRHJhdyBzY29yZVxyXG4gIGlmIChwbGF5ZXIgfHwgaGlnaFNjb3JlKSB7XHJcbiAgICBjdHguZm9udCA9ICdib2xkIDIwcHggc2Fucy1zZXJpZic7XHJcbiAgICBjdHgudGV4dEFsaWduID0gJ2NlbnRlcic7XHJcbiAgICBoZWxwZXJzLm91dGxpbmVUZXh0KGN0eCwgcGxheWVyID8gcGxheWVyLnNjb3JlIDogJ0hpZ2ggU2NvcmUnLCBnYW1lLndpZHRoIC8gMiwgMjIsICcjMzMzJywgJyNmZmYnKTtcclxuICB9XHJcbiAgaWYgKGhpZ2hTY29yZSkge1xyXG4gICAgY3R4LmZvbnQgPSAnYm9sZCAyMHB4IHNhbnMtc2VyaWYnO1xyXG4gICAgaGVscGVycy5vdXRsaW5lVGV4dChjdHgsIGhpZ2hTY29yZSwgZ2FtZS53aWR0aCAvIDIsIDUxLCAnIzMzMycsICcjZmZmJyk7XHJcbiAgICBpZiAoaGlnaFNjb3JlVGltZSA+IDApIHtcclxuICAgICAgdmFyIG9mZnNldCA9IChoaWdoU2NvcmVUaW1lKSAqIDI7XHJcbiAgICAgIHZhciBmYWRlID0gKGhpZ2hTY29yZVRpbWUgLyBoaWdoU2NvcmVNYXhUaW1lICogMik7XHJcbiAgICAgIGN0eC5mb250ID0gJ2JvbGQgJyArICgyNCArIG9mZnNldCkgKyAncHggc2Fucy1zZXJpZic7XHJcbiAgICAgIGN0eC5maWxsU3R5bGUgPSAncmdiYSgyNTUsIDI1NSwgMjU1LCAnICsgZmFkZSArICcpJztcclxuICAgICAgY3R4LmZpbGxUZXh0KGhpZ2hTY29yZSwgZ2FtZS53aWR0aCAvIDIsIDY0ICsgKG9mZnNldCAqIDEuNSkpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLy8gRHJhdyBsZXZlbCBiYWRnZXNcclxuICBmb3IgKHZhciBiYWRnZSA9IDA7IGJhZGdlIDwgY3VycmVudExldmVsOyBiYWRnZSsrKSB7XHJcbiAgICB2YXIgeCA9IChnYW1lLndpZHRoIC0gKGJhZGdlICUgNCkgKiAyOCAtIDE2KTtcclxuICAgIHZhciB5ID0gMTYgKyAoMjQgKiBNYXRoLmZsb29yKGJhZGdlIC8gNCkpO1xyXG4gICAgY3R4LmZpbGxTdHlsZSA9ICcjZmY0JztcclxuICAgIGN0eC5iZWdpblBhdGgoKTtcclxuICAgIGN0eC5tb3ZlVG8oeCArIDgsIHkpO1xyXG4gICAgY3R4LmxpbmVUbyh4LCB5ICsgOCk7XHJcbiAgICBjdHgubGluZVRvKHgsIHkgLSA4KTtcclxuICAgIGN0eC5maWxsKCk7XHJcbiAgICBjdHgubW92ZVRvKHgsIHkpO1xyXG4gICAgY3R4LmxpbmVUbyh4IC0gOCwgeSArIDgpO1xyXG4gICAgY3R4LmxpbmVUbyh4IC0gOCwgeSAtIDgpO1xyXG4gICAgY3R4LmZpbGwoKTtcclxuICB9XHJcblxyXG4gIC8vIERyYXcgYnVyc3QgbW9kZSBtZXRlclxyXG4gIGlmIChidXJzdE1vZGUpIHtcclxuICAgIHZhciBidyA9IDE1MztcclxuICAgIGhlbHBlcnMuZHJhd01ldGVyKGN0eCwgZ2FtZS53aWR0aCAtIGJ3IC0gNSwgc2VhTGV2ZWwgLSAyMiwgYncsIDEyLCBidXJzdE1vZGVNYXhDb3VudCAtIGJ1cnN0TW9kZUNvdW50LCBidXJzdE1vZGVNYXhDb3VudCwgJyM1ZDQnKTtcclxuICB9XHJcblxyXG4gIC8vIERyYXcgcGxheWVyXHJcbiAgaWYgKHBsYXllciAmJiAoaW52aW5jaWJpbGl0eSAlIGludmluY2liaWxpdHlCbGluayA8IGludmluY2liaWxpdHlCbGluayAtIDQpKSB7XHJcbiAgICBoZWxwZXJzLmZpbGxFbGxpcHNlKGN0eCwgcGxheWVyLngsIHBsYXllci55LCAxMCwgMiwgcGxheWVyLnN5LCBpbnZpbmNpYmlsaXR5ID8gJ3JnYmEoMjU1LCAyNTUsIDY4LCAwLjUpJyA6ICcjZmY0Jyk7XHJcbiAgICBoZWxwZXJzLmZpbGxDaXJjbGUoY3R4LCBwbGF5ZXIueCArIDUsIHBsYXllci55IC0gMiwgMywgJyMzMzAnKTtcclxuICB9XHJcblxyXG4gIC8vIERyYXcgd2F0ZXIgZGVwdGggZ3JhZGllbnRcclxuICBncmQgPSBjdHguY3JlYXRlTGluZWFyR3JhZGllbnQoZ2FtZS53aWR0aCAvIDIsIHNlYUxldmVsLCBnYW1lLndpZHRoIC8gMiwgZ2FtZS5oZWlnaHQpO1xyXG4gIGdyZC5hZGRDb2xvclN0b3AoMC4wMDAsICdyZ2JhKDAsIDEyNywgMjU1LCAwLjEwMCknKTtcclxuICBncmQuYWRkQ29sb3JTdG9wKDAuNzAwLCAncmdiYSgwLCA2MywgMTI3LCAwLjEwMCknKTtcclxuICBncmQuYWRkQ29sb3JTdG9wKDEuMDAwLCAncmdiYSgwLCA2MywgMTI3LCAwLjYwMCknKTtcclxuICBjdHguZmlsbFN0eWxlID0gZ3JkO1xyXG4gIGN0eC5maWxsUmVjdCgwLCBzZWFMZXZlbCwgZ2FtZS53aWR0aCwgZ2FtZS5oZWlnaHQgLSBzZWFMZXZlbCk7XHJcblxyXG4gIGlmICghcGxheWVyKSB7XHJcbiAgICAvLyBEcmF3IHByZS1nYW1lIHRleHRcclxuICAgIGlmICgoZnJhbWVDb3VudCAlIDEyMCA+IDUgJiYgZnJhbWVDb3VudCAlIDEyMCA8IDIwKSB8fCBmcmFtZUNvdW50ICUgMTIwID4gMjUpIHtcclxuICAgICAgY3R4LmZvbnQgPSAnYm9sZCA2NHB4IHNhbnMtc2VyaWYnO1xyXG4gICAgICBjdHgudGV4dEFsaWduID0gJ2NlbnRlcic7XHJcbiAgICAgIGlmIChoaWdoU2NvcmUpIHtcclxuICAgICAgICBoZWxwZXJzLm91dGxpbmVUZXh0KGN0eCwgJ0dhbWUgb3ZlciEnLCBnYW1lLndpZHRoIC8gMiwgZ2FtZS5oZWlnaHQgLyAyIC0gMzAsICcjMzMzJywgJyNmZmYnKTtcclxuICAgICAgICBoZWxwZXJzLm91dGxpbmVUZXh0KGN0eCwgJ0NsaWNrIGFnYWluIScsIGdhbWUud2lkdGggLyAyLCBnYW1lLmhlaWdodCAvIDIgKyA0MCwgJyMzMzMnLCAnI2ZmZicpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGhlbHBlcnMub3V0bGluZVRleHQoY3R4LCAnQ2xpY2sgdG8gc3RhcnQhJywgZ2FtZS53aWR0aCAvIDIsIGdhbWUuaGVpZ2h0IC8gMiwgJyMzMzMnLCAnI2ZmZicpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBpZiAocGxheWVyICYmIGxvbmdKdW1wQ29tcGxldGVDb3VudCA+IDApIHtcclxuICAgIC8vIERyYXcgbWVzc2FnZVxyXG4gICAgbG9uZ0p1bXBDb21wbGV0ZUNvdW50IC09IDE7XHJcbiAgICBjdHguZm9udCA9ICdib2xkIDcycHggc2Fucy1zZXJpZic7XHJcbiAgICBjdHgudGV4dEFsaWduID0gJ2NlbnRlcic7XHJcbiAgICBpZiAobG9uZ0p1bXBDb21wbGV0ZUNvdW50ICUgMjAgPiA1KSB7XHJcbiAgICAgIGhlbHBlcnMub3V0bGluZVRleHQoY3R4LCAnTmljZSBqdW1wIScsIGdhbWUud2lkdGggLyAyLCBnYW1lLmhlaWdodCAvIDIsICcjMzMzJywgJyNmZmYnKTtcclxuICAgIH1cclxuICB9XHJcbn0pO1xyXG5cclxuLy8gVE9ETzogRGVsZXRlIHRoaXNcclxuZ2FtZS5ydW4oKTtcclxuXHJcbi8vIFRPRE86IEdldCB0aGUgcnVudGltZSB0byBleHBvc2UgdGhpcyBvYmplY3QgdGhyb3VnaCBhIGdlc3NvLmN1cnJlbnQgZ2xvYmFsXHJcbm1vZHVsZS5leHBvcnRzID0gZ2FtZTtcclxuIiwibW9kdWxlLmV4cG9ydHMgPSB7XHJcbiAgcmFuZEludDogZnVuY3Rpb24gKG1pbiwgbWF4KSB7XHJcbiAgICByZXR1cm4gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogKG1heCAtIG1pbiArIDEpKSArIG1pbjtcclxuICB9LFxyXG4gIGZpbGxDaXJjbGU6IGZ1bmN0aW9uIChjdHgsIHgsIHksIHIsIGNvbG9yKSB7XHJcbiAgICBjdHguYmVnaW5QYXRoKCk7XHJcbiAgICBjdHguYXJjKHgsIHksIHIsIDAsIDIgKiBNYXRoLlBJLCBmYWxzZSk7XHJcbiAgICBjdHguZmlsbFN0eWxlID0gY29sb3I7XHJcbiAgICBjdHguZmlsbCgpO1xyXG4gIH0sXHJcbiAgZmlsbEVsbGlwc2U6IGZ1bmN0aW9uIChjdHgsIHgsIHksIHIsIHN4LCBzeSwgY29sb3IpIHtcclxuICAgIGN0eC5zYXZlKCk7XHJcbiAgICBjdHgudHJhbnNsYXRlKC14ICogKHN4IC0gMSksIC15ICogKHN5IC0gMSkpO1xyXG4gICAgY3R4LnNjYWxlKHN4LCBzeSk7XHJcbiAgICBjdHguYmVnaW5QYXRoKCk7XHJcbiAgICBjdHguYXJjKHgsIHksIHIsIDAsIDIgKiBNYXRoLlBJLCBmYWxzZSk7XHJcbiAgICBjdHgucmVzdG9yZSgpO1xyXG4gICAgY3R4LmZpbGxTdHlsZSA9IGNvbG9yO1xyXG4gICAgY3R4LmZpbGwoKTtcclxuICB9LFxyXG4gIGRyYXdNZXRlcjogZnVuY3Rpb24gKGN0eCwgeCwgeSwgd2lkdGgsIGhlaWdodCwgdmFsdWUsIG1heCwgY29sb3IpIHtcclxuICAgIGN0eC5maWxsU3R5bGUgPSAnI2ZmZic7XHJcbiAgICBjdHguZmlsbFJlY3QoeCwgeSwgd2lkdGgsIGhlaWdodCk7XHJcbiAgICBjdHguZmlsbFN0eWxlID0gJyMwMDAnO1xyXG4gICAgY3R4LmZpbGxSZWN0KHggKyAyLCB5ICsgMiwgd2lkdGggLSA0LCBoZWlnaHQgLSA0KTtcclxuICAgIGN0eC5maWxsU3R5bGUgPSBjb2xvcjtcclxuICAgIHZhciBtZXRlcldpZHRoID0gd2lkdGggLSA4O1xyXG4gICAgY3R4LmZpbGxSZWN0KHggKyA0ICsgKChtYXggLSB2YWx1ZSkgLyBtYXgpICogbWV0ZXJXaWR0aCwgeSArIDQsIG1ldGVyV2lkdGggLSAoKG1heCAtIHZhbHVlKSAvIG1heCkgKiBtZXRlcldpZHRoLCBoZWlnaHQgLSA4KTtcclxuICB9LFxyXG4gIG91dGxpbmVUZXh0OiBmdW5jdGlvbiAoY3R4LCB0ZXh0LCB4LCB5LCBjb2xvciwgb3V0bGluZSkge1xyXG4gICAgY3R4LmZpbGxTdHlsZSA9IGNvbG9yO1xyXG4gICAgY3R4LmZpbGxUZXh0KHRleHQsIHggLSAxLCB5KTtcclxuICAgIGN0eC5maWxsVGV4dCh0ZXh0LCB4ICsgMSwgeSk7XHJcbiAgICBjdHguZmlsbFRleHQodGV4dCwgeCwgeSAtIDEpO1xyXG4gICAgY3R4LmZpbGxUZXh0KHRleHQsIHgsIHkgKyAyKTtcclxuICAgIGN0eC5maWxsU3R5bGUgPSBvdXRsaW5lO1xyXG4gICAgY3R4LmZpbGxUZXh0KHRleHQsIHgsIHkpO1xyXG4gIH0sXHJcbiAgaW50ZXJzZWN0ZWQ6IGZ1bmN0aW9uIChyZWN0MSwgcmVjdDIpIHtcclxuICAgIHJldHVybiAocmVjdDEueCA8IHJlY3QyLnggKyByZWN0Mi53aWR0aCAmJlxyXG4gICAgICByZWN0MS54ICsgcmVjdDEud2lkdGggPiByZWN0Mi54ICYmXHJcbiAgICAgIHJlY3QxLnkgPCByZWN0Mi55ICsgcmVjdDIuaGVpZ2h0ICYmXHJcbiAgICAgIHJlY3QxLmhlaWdodCArIHJlY3QxLnkgPiByZWN0Mi55KTtcclxuICB9XHJcbn07XHJcbiIsInZhciBsb3dMZXZlbCA9IHJlcXVpcmUoJy4vbG93TGV2ZWwnKTtcclxuXHJcbmZ1bmN0aW9uIENvbnRyb2xsZXIoZ2Vzc28sIGNhbnZhcykge1xyXG4gIHRoaXMuZ2Vzc28gPSBnZXNzbztcclxuICB0aGlzLmNhbnZhcyA9IGNhbnZhcyB8fCBsb3dMZXZlbC5nZXRDYW52YXMoKTtcclxuICB0aGlzLl9jb250ZXh0ID0gdGhpcy5jYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcclxuICB0aGlzLl9ydW5uaW5nID0gbnVsbDtcclxuICB0aGlzLl9yZXF1ZXN0SWQgPSBudWxsO1xyXG59XHJcbkNvbnRyb2xsZXIucHJvdG90eXBlLnN0ZXBPbmNlID0gZnVuY3Rpb24gKHRpbWVzdGFtcCkge1xyXG4gIHRoaXMuZ2Vzc28uc3RlcCh0aGlzLl9jb250ZXh0KTtcclxufTtcclxuQ29udHJvbGxlci5wcm90b3R5cGUuY29udGludWVPbiA9IGZ1bmN0aW9uICh0aW1lc3RhbXApIHtcclxuICB0aGlzLnN0ZXBPbmNlKCk7XHJcblxyXG4gIHZhciBzZWxmID0gdGhpcztcclxuICBzZWxmLl9yZXF1ZXN0SWQgPSBsb3dMZXZlbC5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUoZnVuY3Rpb24gKHRpbWVzdGFtcCkge1xyXG4gICAgc2VsZi5fcmVxdWVzdElkID0gbnVsbDtcclxuICAgIGlmICghc2VsZi5fcnVubmluZykge1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcbiAgICAvLyBUT0RPOiBGUFNcclxuICAgIHNlbGYuY29udGludWVPbigpO1xyXG4gIH0pO1xyXG59O1xyXG5Db250cm9sbGVyLnByb3RvdHlwZS5zdGFydCA9IGZ1bmN0aW9uIHN0YXJ0KCkge1xyXG4gIGlmICh0aGlzLl9ydW5uaW5nKSB7XHJcbiAgICByZXR1cm47XHJcbiAgfVxyXG4gIHRoaXMuX3J1bm5pbmcgPSB0cnVlO1xyXG5cclxuICB0aGlzLmdlc3NvLmluaXRpYWxpemUoKTtcclxuICB0aGlzLmdlc3NvLnN0YXJ0Lmludm9rZSgpO1xyXG4gIC8vIFRPRE86IFVzZSBhIHNjaGVkdWxlclxyXG4gIHRoaXMuY29udGludWVPbigpO1xyXG59O1xyXG5Db250cm9sbGVyLnByb3RvdHlwZS5zdG9wID0gZnVuY3Rpb24gc3RvcCgpIHtcclxuICBpZiAoIXRoaXMuX3J1bm5pbmcpIHtcclxuICAgIHJldHVybjtcclxuICB9XHJcbiAgdGhpcy5fcnVubmluZyA9IGZhbHNlO1xyXG5cclxuICBsb3dMZXZlbC5jYW5jZWxBbmltYXRpb25GcmFtZSh0aGlzLl9yZXF1ZXN0SWQpO1xyXG4gIHRoaXMuX3JlcXVlc3RJZCA9IG51bGw7XHJcbiAgdGhpcy5nZXNzby5zdG9wLmludm9rZSgpO1xyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBDb250cm9sbGVyO1xyXG4iLCJ2YXIgdXRpbCA9IHJlcXVpcmUoJy4vdXRpbCcpO1xyXG5cclxuLy8gUmV0dXJucyBhIGNhbGxhYmxlIG9iamVjdCB0aGF0LCB3aGVuIGNhbGxlZCB3aXRoIGEgZnVuY3Rpb24sIHN1YnNjcmliZXNcclxuLy8gdG8gdGhlIGRlbGVnYXRlLiBDYWxsIGludm9rZSBvbiB0aGlzIG9iamVjdCB0byBpbnZva2UgZWFjaCBoYW5kbGVyLlxyXG5mdW5jdGlvbiBEZWxlZ2F0ZShzdWJzY3JpYmVkLCB1bnN1YnNjcmliZWQpIHtcclxuICB2YXIgaGFuZGxlcnMgPSBbXTtcclxuXHJcbiAgZnVuY3Rpb24gY2FsbGFibGUoaGFuZGxlcikge1xyXG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggIT09IDEpIHtcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdEZWxlZ2F0ZSB0YWtlcyBleGFjdGx5IDEgYXJndW1lbnQgKCcgKyBhcmd1bWVudHMubGVuZ3RoICsgJyBnaXZlbiknKTtcclxuICAgIH0gZWxzZSBpZiAodHlwZW9mIGhhbmRsZXIgIT09ICdmdW5jdGlvbicpIHtcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdEZWxlZ2F0ZSBhcmd1bWVudCBtdXN0IGJlIGEgRnVuY3Rpb24gb2JqZWN0IChnb3QgJyArIHR5cGVvZiBoYW5kbGVyICsgJyknKTtcclxuICAgIH1cclxuICAgIC8vIEFkZCB0aGUgaGFuZGxlclxyXG4gICAgaGFuZGxlcnMucHVzaChoYW5kbGVyKTtcclxuICAgIC8vIEFsbG93IGN1c3RvbSBsb2dpYyBvbiBzdWJzY3JpYmUsIHBhc3NpbmcgaW4gdGhlIGhhbmRsZXJcclxuICAgIHZhciBzdWJzY3JpYmVkUmVzdWx0O1xyXG4gICAgaWYgKHN1YnNjcmliZWQpIHtcclxuICAgICAgc3Vic2NyaWJlZFJlc3VsdCA9IHN1YnNjcmliZWQoaGFuZGxlcik7XHJcbiAgICB9XHJcbiAgICAvLyBSZXR1cm4gdGhlIHVuc3Vic2NyaWJlIGZ1bmN0aW9uXHJcbiAgICByZXR1cm4gZnVuY3Rpb24gdW5zdWJzY3JpYmUoKSB7XHJcbiAgICAgIHZhciBpbml0aWFsSGFuZGxlciA9IHV0aWwucmVtb3ZlTGFzdChoYW5kbGVycywgaGFuZGxlcik7XHJcbiAgICAgIC8vIEFsbG93IGN1c3RvbSBsb2dpYyBvbiB1bnN1YnNjcmliZSwgcGFzc2luZyBpbiB0aGUgb3JpZ2luYWwgaGFuZGxlclxyXG4gICAgICBpZiAodW5zdWJzY3JpYmVkKSB7XHJcbiAgICAgICAgdW5zdWJzY3JpYmVkKGluaXRpYWxIYW5kbGVyLCBzdWJzY3JpYmVkUmVzdWx0KTtcclxuICAgICAgfVxyXG4gICAgICAvLyBSZXR1cm4gdGhlIG9yaWdpbmFsIGhhbmRsZXJcclxuICAgICAgcmV0dXJuIGluaXRpYWxIYW5kbGVyO1xyXG4gICAgfTtcclxuICB9XHJcbiAgY2FsbGFibGUuaW52b2tlID0gZnVuY3Rpb24gaW52b2tlKCkge1xyXG4gICAgdmFyIGFyZ3MgPSBhcmd1bWVudHM7XHJcbiAgICB1dGlsLmZvckVhY2goaGFuZGxlcnMsIGZ1bmN0aW9uIChoYW5kbGVyKSB7XHJcbiAgICAgIGhhbmRsZXIuYXBwbHkobnVsbCwgYXJncyk7XHJcbiAgICB9KTtcclxuICB9O1xyXG4gIC8vIEV4cG9zZSBoYW5kbGVycyBmb3IgaW5zcGVjdGlvblxyXG4gIGNhbGxhYmxlLmhhbmRsZXJzID0gaGFuZGxlcnM7XHJcblxyXG4gIHJldHVybiBjYWxsYWJsZTtcclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBEZWxlZ2F0ZTtcclxuIiwidmFyIHVybCA9IHJlcXVpcmUoJ3VybCcpO1xyXG52YXIgcGF0aCA9IHJlcXVpcmUoJ3BhdGgnKTtcclxudmFyIENvbnRyb2xsZXIgPSByZXF1aXJlKCcuL2NvbnRyb2xsZXInKTtcclxudmFyIERlbGVnYXRlID0gcmVxdWlyZSgnLi9kZWxlZ2F0ZScpO1xyXG52YXIgbG93TGV2ZWwgPSByZXF1aXJlKCcuL2xvd0xldmVsJyk7XHJcbnZhciBsb2dnaW5nID0gcmVxdWlyZSgnLi9sb2dnaW5nJyk7XHJcblxyXG5mdW5jdGlvbiBwb2ludGVySGFuZGxlcldyYXBwZXIoZ2Vzc28sIGNhbnZhcywgaGFuZGxlcikge1xyXG4gIHJldHVybiBmdW5jdGlvbiAoZSkge1xyXG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgdmFyIHJlY3QgPSBjYW52YXMuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XHJcbiAgICB2YXIgeCA9IGUuY2xpZW50WCAtIHJlY3QubGVmdDtcclxuICAgIHZhciB5ID0gZS5jbGllbnRZIC0gcmVjdC50b3A7XHJcbiAgICBpZiAoZ2Vzc28ud2lkdGggIT09IHJlY3Qud2lkdGgpIHtcclxuICAgICAgeCAqPSBnZXNzby53aWR0aCAvIHJlY3Qud2lkdGg7XHJcbiAgICB9XHJcbiAgICBpZiAoZ2Vzc28uaGVpZ2h0ICE9PSByZWN0LmhlaWdodCkge1xyXG4gICAgICB5ICo9IGdlc3NvLmhlaWdodCAvIHJlY3QuaGVpZ2h0O1xyXG4gICAgfVxyXG4gICAgaGFuZGxlcih7eDogeCwgeTogeSwgZTogZX0pO1xyXG4gICAgcmV0dXJuIGZhbHNlO1xyXG4gIH07XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGtleUhhbmRsZXJXcmFwcGVyKGhhbmRsZXIpIHtcclxuICByZXR1cm4gZnVuY3Rpb24gKGUpIHtcclxuICAgIHZhciBoYW5kbGVkID0gaGFuZGxlcih7d2hpY2g6IGUud2hpY2gsIGU6IGV9KTtcclxuICAgIC8vIFByZXZlbnQgZGVmYXVsdCB3aGVuIGhhbmRsZWQgYW5kIG5vdCBmb2N1c2VkIG9uIGFuIGV4dGVybmFsIFVJIGVsZW1lbnRcclxuICAgIGlmIChoYW5kbGVkICYmIGxvd0xldmVsLmlzUm9vdENvbnRhaW5lcihlLnRhcmdldCkpIHtcclxuICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9XHJcbiAgfTtcclxufVxyXG5cclxuZnVuY3Rpb24gR2Vzc28ob3B0aW9ucykge1xyXG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xyXG4gIHRoaXMucXVlcnlWYXJpYWJsZXMgPSBudWxsO1xyXG4gIHRoaXMuc2NyaXB0VXJsID0gR2Vzc28uZ2V0U2NyaXB0VXJsKCk7XHJcbiAgdGhpcy5jb250ZXh0VHlwZSA9IG9wdGlvbnMuY29udGV4dFR5cGUgfHwgJzJkJztcclxuICB0aGlzLmNvbnRleHRBdHRyaWJ1dGVzID0gb3B0aW9ucy5jb250ZXh0QXR0cmlidXRlcztcclxuICB0aGlzLmZwcyA9IG9wdGlvbnMuZnBzIHx8IDYwO1xyXG4gIHRoaXMuYXV0b3BsYXkgPSBvcHRpb25zLmF1dG9wbGF5IHx8IHRydWU7XHJcbiAgdGhpcy53aWR0aCA9IG9wdGlvbnMud2lkdGggfHwgNjQwOyAgICAvLyBUT0RPOiBhbGxvdyAnbnVsbCcgdG8gdXNlIHdpZHRoIG9mIHRhcmdldCBjYW52YXNcclxuICB0aGlzLmhlaWdodCA9IG9wdGlvbnMuaGVpZ2h0IHx8IDQ4MDsgIC8vIFRPRE86IGFsbG93ICdudWxsJyB0byB1c2UgaGVpZ2h0IG9mIHRhcmdldCBjYW52YXNcclxuICB0aGlzLnNldHVwID0gbmV3IERlbGVnYXRlKCk7XHJcbiAgdGhpcy5zdGFydCA9IG5ldyBEZWxlZ2F0ZSgpO1xyXG4gIHRoaXMuc3RvcCA9IG5ldyBEZWxlZ2F0ZSgpO1xyXG4gIHRoaXMudXBkYXRlID0gbmV3IERlbGVnYXRlKCk7XHJcbiAgdGhpcy5yZW5kZXIgPSBuZXcgRGVsZWdhdGUoKTtcclxuICAvLyBUT0RPOiBVc2UgdGhlIGNhbnZhcyBwYXNzZWQgaW50byBydW4oKSBpbnN0ZWFkIG9mIEdlc3NvLmdldENhbnZhcyBpbiB0aGVzZSBpbnB1dCBoYW5kbGVyc1xyXG4gIHZhciBzZWxmID0gdGhpcztcclxuICB0aGlzLmNsaWNrID0gbmV3IERlbGVnYXRlKGZ1bmN0aW9uIChoYW5kbGVyKSB7XHJcbiAgICB2YXIgY2FudmFzID0gR2Vzc28uZ2V0Q2FudmFzKCk7XHJcbiAgICB2YXIgciA9IHtjYW52YXM6IGNhbnZhcywgaGFuZGxlcldyYXBwZXI6IHBvaW50ZXJIYW5kbGVyV3JhcHBlcihzZWxmLCBjYW52YXMsIGhhbmRsZXIpfTtcclxuICAgIHIuY2FudmFzLmFkZEV2ZW50TGlzdGVuZXIoJ3RvdWNoc3RhcnQnLCByLmhhbmRsZXJXcmFwcGVyLCBmYWxzZSk7XHJcbiAgICByLmNhbnZhcy5hZGRFdmVudExpc3RlbmVyKCdtb3VzZWRvd24nLCByLmhhbmRsZXJXcmFwcGVyLCBmYWxzZSk7XHJcbiAgICByZXR1cm4gcjtcclxuICB9LCBmdW5jdGlvbiAoaGFuZGxlciwgcikge1xyXG4gICAgci5jYW52YXMucmVtb3ZlRXZlbnRMaXN0ZW5lcigndG91Y2hzdGFydCcsIHIuaGFuZGxlcldyYXBwZXIgfHwgaGFuZGxlcik7XHJcbiAgICByLmNhbnZhcy5yZW1vdmVFdmVudExpc3RlbmVyKCdtb3VzZWRvd24nLCByLmhhbmRsZXJXcmFwcGVyIHx8IGhhbmRsZXIpO1xyXG4gIH0pO1xyXG4gIHRoaXMucG9pbnRlcmRvd24gPSBuZXcgRGVsZWdhdGUoZnVuY3Rpb24gKGhhbmRsZXIpIHtcclxuICAgIHZhciBjYW52YXMgPSBHZXNzby5nZXRDYW52YXMoKTtcclxuICAgIHZhciByID0ge2NhbnZhczogY2FudmFzLCBoYW5kbGVyV3JhcHBlcjogcG9pbnRlckhhbmRsZXJXcmFwcGVyKHNlbGYsIGNhbnZhcywgaGFuZGxlcil9O1xyXG4gICAgci5jYW52YXMuYWRkRXZlbnRMaXN0ZW5lcigncG9pbnRlcmRvd24nLCByLmhhbmRsZXJXcmFwcGVyLCBmYWxzZSk7XHJcbiAgICByZXR1cm4gcjtcclxuICB9LCBmdW5jdGlvbiAoaGFuZGxlciwgcikge1xyXG4gICAgci5jYW52YXMucmVtb3ZlRXZlbnRMaXN0ZW5lcigncG9pbnRlcmRvd24nLCByLmhhbmRsZXJXcmFwcGVyIHx8IGhhbmRsZXIpO1xyXG4gIH0pO1xyXG4gIHRoaXMucG9pbnRlcm1vdmUgPSBuZXcgRGVsZWdhdGUoZnVuY3Rpb24gKGhhbmRsZXIpIHtcclxuICAgIHZhciBjYW52YXMgPSBHZXNzby5nZXRDYW52YXMoKTtcclxuICAgIHZhciByID0ge2NhbnZhczogY2FudmFzLCBoYW5kbGVyV3JhcHBlcjogcG9pbnRlckhhbmRsZXJXcmFwcGVyKHNlbGYsIGNhbnZhcywgaGFuZGxlcil9O1xyXG4gICAgci5jYW52YXMuYWRkRXZlbnRMaXN0ZW5lcigncG9pbnRlcm1vdmUnLCByLmhhbmRsZXJXcmFwcGVyLCBmYWxzZSk7XHJcbiAgICByZXR1cm4gcjtcclxuICB9LCBmdW5jdGlvbiAoaGFuZGxlciwgcikge1xyXG4gICAgci5jYW52YXMucmVtb3ZlRXZlbnRMaXN0ZW5lcigncG9pbnRlcm1vdmUnLCByLmhhbmRsZXJXcmFwcGVyIHx8IGhhbmRsZXIpO1xyXG4gIH0pO1xyXG4gIHRoaXMucG9pbnRlcnVwID0gbmV3IERlbGVnYXRlKGZ1bmN0aW9uIChoYW5kbGVyKSB7XHJcbiAgICB2YXIgY2FudmFzID0gR2Vzc28uZ2V0Q2FudmFzKCk7XHJcbiAgICB2YXIgciA9IHtjYW52YXM6IGNhbnZhcywgaGFuZGxlcldyYXBwZXI6IHBvaW50ZXJIYW5kbGVyV3JhcHBlcihzZWxmLCBjYW52YXMsIGhhbmRsZXIpfTtcclxuICAgIHIuY2FudmFzLmFkZEV2ZW50TGlzdGVuZXIoJ3BvaW50ZXJ1cCcsIHIuaGFuZGxlcldyYXBwZXIsIGZhbHNlKTtcclxuICAgIHJldHVybiByO1xyXG4gIH0sIGZ1bmN0aW9uIChoYW5kbGVyLCByKSB7XHJcbiAgICByLmNhbnZhcy5yZW1vdmVFdmVudExpc3RlbmVyKCdwb2ludGVydXAnLCByLmhhbmRsZXJXcmFwcGVyIHx8IGhhbmRsZXIpO1xyXG4gIH0pO1xyXG4gIHRoaXMua2V5ZG93biA9IG5ldyBEZWxlZ2F0ZShmdW5jdGlvbiAoaGFuZGxlcikge1xyXG4gICAgdmFyIHIgPSB7cm9vdDogbG93TGV2ZWwuZ2V0Um9vdEVsZW1lbnQoKSwgaGFuZGxlcldyYXBwZXI6IGtleUhhbmRsZXJXcmFwcGVyKGhhbmRsZXIpfTtcclxuICAgIHIucm9vdC5hZGRFdmVudExpc3RlbmVyKCdrZXlkb3duJywgci5oYW5kbGVyV3JhcHBlciwgZmFsc2UpO1xyXG4gICAgcmV0dXJuIHI7XHJcbiAgfSwgZnVuY3Rpb24gKGhhbmRsZXIsIHIpIHtcclxuICAgIHIucm9vdC5yZW1vdmVFdmVudExpc3RlbmVyKCdrZXlkb3duJywgci5oYW5kbGVyV3JhcHBlciB8fCBoYW5kbGVyKTtcclxuICB9KTtcclxuICB0aGlzLmtleXVwID0gbmV3IERlbGVnYXRlKGZ1bmN0aW9uIChoYW5kbGVyKSB7XHJcbiAgICB2YXIgciA9IHtyb290OiBsb3dMZXZlbC5nZXRSb290RWxlbWVudCgpLCBoYW5kbGVyV3JhcHBlcjoga2V5SGFuZGxlcldyYXBwZXIoaGFuZGxlcil9O1xyXG4gICAgci5yb290LmFkZEV2ZW50TGlzdGVuZXIoJ2tleXVwJywgci5oYW5kbGVyV3JhcHBlciwgZmFsc2UpO1xyXG4gICAgcmV0dXJuIHI7XHJcbiAgfSwgZnVuY3Rpb24gKGhhbmRsZXIsIHIpIHtcclxuICAgIHIucm9vdC5yZW1vdmVFdmVudExpc3RlbmVyKCdrZXl1cCcsIHIuaGFuZGxlcldyYXBwZXIgfHwgaGFuZGxlcik7XHJcbiAgfSk7XHJcbiAgdGhpcy5faW5pdGlhbGl6ZWQgPSBmYWxzZTtcclxuICB0aGlzLl9mcmFtZUNvdW50ID0gMDtcclxufVxyXG5HZXNzby5Db250cm9sbGVyID0gQ29udHJvbGxlcjtcclxuR2Vzc28uRGVsZWdhdGUgPSBEZWxlZ2F0ZTtcclxuR2Vzc28uZ2V0UXVlcnlWYXJpYWJsZXMgPSBsb3dMZXZlbC5nZXRRdWVyeVZhcmlhYmxlcztcclxuR2Vzc28uZ2V0U2NyaXB0VXJsID0gbG93TGV2ZWwuZ2V0U2NyaXB0VXJsO1xyXG5HZXNzby5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUgPSBsb3dMZXZlbC5yZXF1ZXN0QW5pbWF0aW9uRnJhbWU7XHJcbkdlc3NvLmNhbmNlbEFuaW1hdGlvbkZyYW1lID0gbG93TGV2ZWwuY2FuY2VsQW5pbWF0aW9uRnJhbWU7XHJcbkdlc3NvLmdldENhbnZhcyA9IGxvd0xldmVsLmdldENhbnZhcztcclxuR2Vzc28uZ2V0Q29udGV4dDJEID0gbG93TGV2ZWwuZ2V0Q29udGV4dDJEO1xyXG5HZXNzby5nZXRXZWJHTENvbnRleHQgPSBsb3dMZXZlbC5nZXRXZWJHTENvbnRleHQ7XHJcbkdlc3NvLmVycm9yID0gbG9nZ2luZy5lcnJvcjtcclxuR2Vzc28uaW5mbyA9IGxvZ2dpbmcuaW5mbztcclxuR2Vzc28ubG9nID0gbG9nZ2luZy5sb2c7XHJcbkdlc3NvLndhcm4gPSBsb2dnaW5nLndhcm47XHJcbkdlc3NvLnByb3RvdHlwZS5pbml0aWFsaXplID0gZnVuY3Rpb24gaW5pdGlhbGl6ZSgpIHtcclxuICBpZiAodGhpcy5faW5pdGlhbGl6ZWQpIHtcclxuICAgIHJldHVybjtcclxuICB9XHJcbiAgdGhpcy5faW5pdGlhbGl6ZWQgPSB0cnVlO1xyXG4gIHRoaXMuc2V0dXAuaW52b2tlKCk7XHJcbn07XHJcbkdlc3NvLnByb3RvdHlwZS5zdGVwID0gZnVuY3Rpb24gc3RlcChjb250ZXh0KSB7XHJcbiAgdGhpcy5uZXh0RnJhbWUoKTtcclxuICB0aGlzLnJlbmRlclRvKGNvbnRleHQpO1xyXG59O1xyXG5HZXNzby5wcm90b3R5cGUubmV4dEZyYW1lID0gZnVuY3Rpb24gbmV4dEZyYW1lKCkge1xyXG4gIHJldHVybiB0aGlzLnVwZGF0ZS5pbnZva2UoKyt0aGlzLl9mcmFtZUNvdW50KTtcclxufTtcclxuR2Vzc28ucHJvdG90eXBlLnJlbmRlclRvID0gZnVuY3Rpb24gcmVuZGVyVG8oY29udGV4dCkge1xyXG4gIHJldHVybiB0aGlzLnJlbmRlci5pbnZva2UoY29udGV4dCk7XHJcbn07XHJcbkdlc3NvLnByb3RvdHlwZS5ydW4gPSBmdW5jdGlvbiBydW4oY2FudmFzKSB7XHJcbiAgdmFyIGNvbnRyb2xsZXIgPSBuZXcgQ29udHJvbGxlcih0aGlzLCBjYW52YXMpO1xyXG4gIGNvbnRyb2xsZXIuc3RhcnQoKTtcclxuICByZXR1cm4gY29udHJvbGxlcjtcclxufTtcclxuR2Vzc28ucHJvdG90eXBlLmFzc2V0ID0gZnVuY3Rpb24gYXNzZXQoYXNzZXRQYXRoKSB7XHJcbiAgcmV0dXJuIHVybC5yZXNvbHZlKHRoaXMuc2NyaXB0VXJsLCBwYXRoLmpvaW4oJ2Fzc2V0cycsIGFzc2V0UGF0aCkpO1xyXG59O1xyXG5HZXNzby5wcm90b3R5cGUucGFyYW0gPSBmdW5jdGlvbiBwYXJhbShuYW1lKSB7XHJcbiAgaWYgKHRoaXMucXVlcnlWYXJpYWJsZXMgPT09IG51bGwpIHtcclxuICAgIHRoaXMucXVlcnlWYXJpYWJsZXMgPSBHZXNzby5nZXRRdWVyeVZhcmlhYmxlcygpO1xyXG4gIH1cclxuICByZXR1cm4gdGhpcy5xdWVyeVZhcmlhYmxlc1tuYW1lXTtcclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gR2Vzc287XHJcbiIsInZhciBHZXNzbyA9IHJlcXVpcmUoJy4vZ2Vzc28nKTtcclxuXHJcbi8vIFRPRE86IERlbGV0ZSB0aGlzXHJcbndpbmRvdy5HZXNzbyA9IEdlc3NvO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBHZXNzbztcclxuIiwiLy8gVE9ETzogTG9nZ2VyIGNsYXNzXHJcbi8vIFRPRE86IFBsdWdnYWJsZSBsb2cgYmFja2VuZCwgZS5nLiBjb25zb2xlLmxvZ1xyXG5cclxuLy8gaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy82NDE4MjIwL2phdmFzY3JpcHQtc2VuZC1qc29uLW9iamVjdC13aXRoLWFqYXhcclxuLy8gaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy85NzEzMDU4L3NlbmRpbmctcG9zdC1kYXRhLXdpdGgtYS14bWxodHRwcmVxdWVzdFxyXG4vLyBodHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzMzMjg3Mi9lbmNvZGUtdXJsLWluLWphdmFzY3JpcHRcclxuZnVuY3Rpb24gX3NlbmQobGV2ZWwsIGFyZ3MpIHtcclxuICB2YXIgcGF5bG9hZCA9IChcclxuICAgICdsZXZlbD0nICsgZW5jb2RlVVJJQ29tcG9uZW50KGxldmVsKSArXHJcbiAgICAnJm1lc3NhZ2U9JyArIGVuY29kZVVSSUNvbXBvbmVudChhcmdzLmpvaW4oJyAnKSkpO1xyXG5cclxuICB2YXIgeGhyID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XHJcbiAgeGhyLm9wZW4oJ1BPU1QnLCAnL2xvZycpO1xyXG4gIHhoci5zZXRSZXF1ZXN0SGVhZGVyKCdDb250ZW50LXR5cGUnLCAnYXBwbGljYXRpb24veC13d3ctZm9ybS11cmxlbmNvZGVkJyk7XHJcbiAgeGhyLm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgIC8vIENoZWNrIGZvciBlcnJvciBzdGF0ZVxyXG4gICAgaWYgKHhoci5yZWFkeVN0YXRlID09PSA0ICYmIHhoci5zdGF0dXMgIT09IDIwMCkge1xyXG4gICAgICAvLyBUT0RPOiBOb3RpZnkgdXNlciBvbiB0aGUgcGFnZSBhbmQgc2hvdyBtZXNzYWdlIGlmIGNvbnNvbGUubG9nIGRvZXNuJ3QgZXhpc3RcclxuICAgICAgaWYgKGNvbnNvbGUgJiYgY29uc29sZS5sb2cpIHtcclxuICAgICAgICBjb25zb2xlLmxvZyh4aHIucmVzcG9uc2VUZXh0KTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH07XHJcbiAgeGhyLnNlbmQocGF5bG9hZCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGVycm9yKG1lc3NhZ2UpIHtcclxuICByZXR1cm4gX3NlbmQoJ2Vycm9yJywgQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzKSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGluZm8obWVzc2FnZSkge1xyXG4gIHJldHVybiBfc2VuZCgnaW5mbycsIEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cykpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBsb2cobWVzc2FnZSkge1xyXG4gIHJldHVybiBfc2VuZCgnbG9nJywgQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzKSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHdhcm4obWVzc2FnZSkge1xyXG4gIHJldHVybiBfc2VuZCgnd2FybicsIEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cykpO1xyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IHtcclxuICBlcnJvcjogZXJyb3IsXHJcbiAgaW5mbzogaW5mbyxcclxuICBsb2c6IGxvZyxcclxuICB3YXJuOiB3YXJuXHJcbn07XHJcbiIsIi8qIGdsb2JhbHMgZG9jdW1lbnQgKi9cclxuXHJcbnZhciByYWYgPSByZXF1aXJlKCcuL3ZlbmRvci9yYWYnKTtcclxudmFyIHV0aWwgPSByZXF1aXJlKCcuL3V0aWwnKTtcclxuXHJcbi8vIEdsb2JhbCBwb2x5ZmlsbHNcclxucmVxdWlyZSgnLi92ZW5kb3IvaGFuZC5taW4uMS4zLjgnKTtcclxuXHJcbi8vIFRPRE86IEZpbmQgYSBiZXR0ZXIgd2F5IHRvIGRvIHRoaXNcclxudmFyIGdldFNjcmlwdFVybCA9IChmdW5jdGlvbiAoKSB7XHJcbiAgdmFyIHNjcmlwdHMgPSBkb2N1bWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnc2NyaXB0Jyk7XHJcbiAgdmFyIGluZGV4ID0gc2NyaXB0cy5sZW5ndGggLSAxO1xyXG4gIHZhciB0aGlzU2NyaXB0ID0gc2NyaXB0c1tpbmRleF07XHJcbiAgcmV0dXJuIGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRoaXNTY3JpcHQuc3JjOyB9O1xyXG59KSgpO1xyXG5cclxuZnVuY3Rpb24gZ2V0UXVlcnlWYXJpYWJsZXMoKSB7XHJcbiAgdmFyIHBsID0gL1xcKy9nOyAgLy8gUmVnZXggZm9yIHJlcGxhY2luZyBhZGRpdGlvbiBzeW1ib2wgd2l0aCBhIHNwYWNlXHJcbiAgdmFyIHNlYXJjaCA9IC8oW14mPV0rKT0/KFteJl0qKS9nO1xyXG4gIHZhciBkZWNvZGUgPSBmdW5jdGlvbiAocykge1xyXG4gICAgcmV0dXJuIGRlY29kZVVSSUNvbXBvbmVudChzLnJlcGxhY2UocGwsICcgJykpO1xyXG4gIH07XHJcbiAgdmFyIHF1ZXJ5ID0gd2luZG93LmxvY2F0aW9uLnNlYXJjaC5zdWJzdHJpbmcoMSk7XHJcblxyXG4gIHZhciB1cmxQYXJhbXMgPSB7fTtcclxuICB3aGlsZSAodHJ1ZSkge1xyXG4gICAgdmFyIG1hdGNoID0gc2VhcmNoLmV4ZWMocXVlcnkpO1xyXG4gICAgaWYgKCFtYXRjaCkge1xyXG4gICAgICByZXR1cm4gdXJsUGFyYW1zO1xyXG4gICAgfVxyXG4gICAgdXJsUGFyYW1zW2RlY29kZShtYXRjaFsxXSldID0gZGVjb2RlKG1hdGNoWzJdKTtcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdldFJvb3RFbGVtZW50KCkge1xyXG4gIHJldHVybiBkb2N1bWVudDtcclxufVxyXG5cclxuZnVuY3Rpb24gaXNSb290Q29udGFpbmVyKHRhcmdldCkge1xyXG4gIHJldHVybiB0YXJnZXQgPT09IGRvY3VtZW50IHx8IHRhcmdldCA9PT0gZG9jdW1lbnQuYm9keTtcclxufVxyXG5cclxuZnVuY3Rpb24gZ2V0Q2FudmFzKCkge1xyXG4gIC8vIFRPRE86IEV4dHJhY3QgdGhpcyBvdXQgdG8gYnJlYWsgZGVwZW5kZW5jeVxyXG4gIGlmICh0eXBlb2Ygd2luZG93ID09PSAndW5kZWZpbmVkJykge1xyXG4gICAgdGhyb3cgbmV3IEVycm9yKCdDYW5ub3QgZ2V0IGNhbnZhcyBvdXRzaWRlIG9mIGJyb3dzZXIgY29udGV4dC4nKTtcclxuICB9XHJcblxyXG4gIC8vIFRPRE86IFJlYWQgdGhlIHByb2plY3Qgc2V0dGluZ3MgdXNlIHRoZSByaWdodCBJRFxyXG4gIHZhciBjYW52YXMgPSB3aW5kb3cuZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2dlc3NvLXRhcmdldCcpO1xyXG5cclxuICAvLyBSZXBsYWNlIGltYWdlIHBsYWNlaG9sZGVyIHdpdGggY2FudmFzXHJcbiAgaWYgKGNhbnZhcyAmJiBjYW52YXMudGFnTmFtZSA9PT0gJ0lNRycpIHtcclxuICAgIGNhbnZhcyA9IHV0aWwuY2hhbmdlVGFnTmFtZShjYW52YXMsICdjYW52YXMnKTtcclxuICB9XHJcblxyXG4gIC8vIERlZmF1bHQgdG8gdXNpbmcgdGhlIG9ubHkgY2FudmFzIG9uIHRoZSBwYWdlLCBpZiBhdmFpbGFibGVcclxuICBpZiAoIWNhbnZhcykge1xyXG4gICAgdmFyIGNhbnZhc2VzID0gd2luZG93LmRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdjYW52YXMnKTtcclxuICAgIGlmIChjYW52YXNlcy5sZW5ndGggPT09IDEpIHtcclxuICAgICAgY2FudmFzID0gY2FudmFzZXNbMF07XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvLyBSYWlzZSBlcnJvciBpZiBubyB1c2FibGUgY2FudmFzZXMgd2VyZSBmb3VuZFxyXG4gIGlmICghY2FudmFzKSB7XHJcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0NhbnZhcyBub3QgZm91bmQuJyk7XHJcbiAgfVxyXG5cclxuICByZXR1cm4gY2FudmFzO1xyXG59XHJcblxyXG5mdW5jdGlvbiBnZXRDb250ZXh0MkQoKSB7XHJcbiAgcmV0dXJuIGdldENhbnZhcygpLmdldENvbnRleHQoJzJkJyk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdldFdlYkdMQ29udGV4dCgpIHtcclxuICByZXR1cm4gZ2V0Q2FudmFzKCkuZ2V0Q29udGV4dCgnd2ViZ2wnKTtcclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSB7XHJcbiAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lOiByYWYucmVxdWVzdEFuaW1hdGlvbkZyYW1lLFxyXG4gIGNhbmNlbEFuaW1hdGlvbkZyYW1lOiByYWYuY2FuY2VsQW5pbWF0aW9uRnJhbWUsXHJcbiAgZ2V0U2NyaXB0VXJsOiBnZXRTY3JpcHRVcmwsXHJcbiAgZ2V0UXVlcnlWYXJpYWJsZXM6IGdldFF1ZXJ5VmFyaWFibGVzLFxyXG4gIGdldFJvb3RFbGVtZW50OiBnZXRSb290RWxlbWVudCxcclxuICBpc1Jvb3RDb250YWluZXI6IGlzUm9vdENvbnRhaW5lcixcclxuICBnZXRDYW52YXM6IGdldENhbnZhcyxcclxuICBnZXRDb250ZXh0MkQ6IGdldENvbnRleHQyRCxcclxuICBnZXRXZWJHTENvbnRleHQ6IGdldFdlYkdMQ29udGV4dFxyXG59O1xyXG4iLCJmdW5jdGlvbiBmb3JFYWNoKGFycmF5LCBzdGVwRnVuY3Rpb24pIHtcclxuICBmb3IgKHZhciBpbmRleCA9IDA7IGluZGV4IDwgYXJyYXkubGVuZ3RoOyBpbmRleCsrKSB7XHJcbiAgICBzdGVwRnVuY3Rpb24oYXJyYXlbaW5kZXhdKTtcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHBvcChhcnJheSwgaW5kZXgpIHtcclxuICByZXR1cm4gdHlwZW9mIGluZGV4ID09PSAndW5kZWZpbmVkJyA/IGFycmF5LnBvcCgpIDogYXJyYXkuc3BsaWNlKGluZGV4LCAxKVswXTtcclxufVxyXG5cclxuZnVuY3Rpb24gaW5kZXhPZihhcnJheSwgaXRlbSwgc3RhcnRJbmRleCkge1xyXG4gIGZvciAodmFyIGluZGV4ID0gc3RhcnRJbmRleCB8fCAwOyBpbmRleCA8IGFycmF5Lmxlbmd0aDsgaW5kZXgrKykge1xyXG4gICAgaWYgKGFycmF5W2luZGV4XSA9PT0gaXRlbSkge1xyXG4gICAgICByZXR1cm4gaW5kZXg7XHJcbiAgICB9XHJcbiAgfVxyXG4gIHJldHVybiAtMTtcclxufVxyXG5cclxuZnVuY3Rpb24gbGFzdEluZGV4T2YoYXJyYXksIGl0ZW0sIHN0YXJ0SW5kZXgpIHtcclxuICBmb3IgKHZhciBpbmRleCA9IHN0YXJ0SW5kZXggfHwgYXJyYXkubGVuZ3RoIC0gMTsgaW5kZXggPj0gMDsgaW5kZXgtLSkge1xyXG4gICAgaWYgKGFycmF5W2luZGV4XSA9PT0gaXRlbSkge1xyXG4gICAgICByZXR1cm4gaW5kZXg7XHJcbiAgICB9XHJcbiAgfVxyXG4gIHJldHVybiAtMTtcclxufVxyXG5cclxuZnVuY3Rpb24gcmVtb3ZlKGFycmF5LCBpdGVtKSB7XHJcbiAgdmFyIGluZGV4ID0gaW5kZXhPZihhcnJheSwgaXRlbSk7XHJcbiAgcmV0dXJuIGluZGV4ICE9PSAtMSA/IHBvcChhcnJheSwgaW5kZXgpIDogbnVsbDtcclxufVxyXG5cclxuZnVuY3Rpb24gcmVtb3ZlTGFzdChhcnJheSwgaXRlbSkge1xyXG4gIHZhciBpbmRleCA9IGxhc3RJbmRleE9mKGFycmF5LCBpdGVtKTtcclxuICByZXR1cm4gaW5kZXggIT09IC0xID8gcG9wKGFycmF5LCBpbmRleCkgOiBudWxsO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjaGFuZ2VUYWdOYW1lKGVsZW1lbnQsIHRhZ05hbWUpIHtcclxuICBpZiAoZWxlbWVudC50YWdOYW1lID09PSB0YWdOYW1lLnRvVXBwZXJDYXNlKCkpIHtcclxuICAgIHJldHVybiBlbGVtZW50O1xyXG4gIH1cclxuXHJcbiAgLy8gVHJ5IGNoYW5naW5nIHRoZSB0eXBlIGZpcnN0IChtb2Rlcm4gYnJvd3NlcnMsIGV4Y2VwdCBJRSlcclxuICBlbGVtZW50LnRhZ05hbWUgPSB0YWdOYW1lO1xyXG4gIGlmIChlbGVtZW50LnRhZ05hbWUgPT09IHRhZ05hbWUudG9VcHBlckNhc2UoKSkge1xyXG4gICAgcmV0dXJuIGVsZW1lbnQ7XHJcbiAgfVxyXG5cclxuICAvLyBDcmVhdGUgbmV3IGVsZW1lbnRcclxuICB2YXIgbmV3RWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQodGFnTmFtZSk7XHJcbiAgLy8gQ29weSBhdHRyaWJ1dGVzXHJcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBlbGVtZW50LmF0dHJpYnV0ZXMubGVuZ3RoOyBpKyspIHtcclxuICAgIG5ld0VsZW1lbnQuc2V0QXR0cmlidXRlKGVsZW1lbnQuYXR0cmlidXRlc1tpXS5uYW1lLCBlbGVtZW50LmF0dHJpYnV0ZXNbaV0udmFsdWUpO1xyXG4gIH1cclxuICAvLyBDb3B5IGNoaWxkIG5vZGVzXHJcbiAgd2hpbGUgKGVsZW1lbnQuZmlyc3RDaGlsZCkge1xyXG4gICAgbmV3RWxlbWVudC5hcHBlbmRDaGlsZChlbGVtZW50LmZpcnN0Q2hpbGQpO1xyXG4gIH1cclxuICAvLyBSZXBsYWNlIGVsZW1lbnRcclxuICBlbGVtZW50LnBhcmVudE5vZGUucmVwbGFjZUNoaWxkKG5ld0VsZW1lbnQsIGVsZW1lbnQpO1xyXG5cclxuICByZXR1cm4gbmV3RWxlbWVudDtcclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSB7XHJcbiAgZm9yRWFjaDogZm9yRWFjaCxcclxuICBwb3A6IHBvcCxcclxuICBpbmRleE9mOiBpbmRleE9mLFxyXG4gIGxhc3RJbmRleE9mOiBsYXN0SW5kZXhPZixcclxuICByZW1vdmU6IHJlbW92ZSxcclxuICByZW1vdmVMYXN0OiByZW1vdmVMYXN0LFxyXG4gIGNoYW5nZVRhZ05hbWU6IGNoYW5nZVRhZ05hbWVcclxufTtcclxuIiwidmFyIEhBTkRKUz1IQU5ESlN8fHt9OyFmdW5jdGlvbigpe2Z1bmN0aW9uIGUoKXtiPSEwLGNsZWFyVGltZW91dChNKSxNPXNldFRpbWVvdXQoZnVuY3Rpb24oKXtiPSExfSw3MDApfWZ1bmN0aW9uIHQoZSx0KXtmb3IoO2U7KXtpZihlLmNvbnRhaW5zKHQpKXJldHVybiBlO2U9ZS5wYXJlbnROb2RlfXJldHVybiBudWxsfWZ1bmN0aW9uIG4oZSxuLHIpe2Zvcih2YXIgbz10KGUsbiksaT1lLGE9W107aSYmaSE9PW87KWgoaSxcInBvaW50ZXJlbnRlclwiKSYmYS5wdXNoKGkpLGk9aS5wYXJlbnROb2RlO2Zvcig7YS5sZW5ndGg+MDspcihhLnBvcCgpKX1mdW5jdGlvbiByKGUsbixyKXtmb3IodmFyIG89dChlLG4pLGk9ZTtpJiZpIT09bzspaChpLFwicG9pbnRlcmxlYXZlXCIpJiZyKGkpLGk9aS5wYXJlbnROb2RlfWZ1bmN0aW9uIG8oZSx0KXtbXCJwb2ludGVyZG93blwiLFwicG9pbnRlcm1vdmVcIixcInBvaW50ZXJ1cFwiLFwicG9pbnRlcm92ZXJcIixcInBvaW50ZXJvdXRcIl0uZm9yRWFjaChmdW5jdGlvbihuKXt3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihlKG4pLGZ1bmN0aW9uKGUpeyFiJiZtKGUudGFyZ2V0LG4pJiZ0KGUsbiwhMCl9KX0pLHZvaWQgMD09PXdpbmRvd1tcIm9uXCIrZShcInBvaW50ZXJlbnRlclwiKS50b0xvd2VyQ2FzZSgpXSYmd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoZShcInBvaW50ZXJvdmVyXCIpLGZ1bmN0aW9uKGUpe2lmKCFiKXt2YXIgcj1tKGUudGFyZ2V0LFwicG9pbnRlcmVudGVyXCIpO3ImJnIhPT13aW5kb3cmJihyLmNvbnRhaW5zKGUucmVsYXRlZFRhcmdldCl8fG4ocixlLnJlbGF0ZWRUYXJnZXQsZnVuY3Rpb24obil7dChlLFwicG9pbnRlcmVudGVyXCIsITEsbixlLnJlbGF0ZWRUYXJnZXQpfSkpfX0pLHZvaWQgMD09PXdpbmRvd1tcIm9uXCIrZShcInBvaW50ZXJsZWF2ZVwiKS50b0xvd2VyQ2FzZSgpXSYmd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoZShcInBvaW50ZXJvdXRcIiksZnVuY3Rpb24oZSl7aWYoIWIpe3ZhciBuPW0oZS50YXJnZXQsXCJwb2ludGVybGVhdmVcIik7biYmbiE9PXdpbmRvdyYmKG4uY29udGFpbnMoZS5yZWxhdGVkVGFyZ2V0KXx8cihuLGUucmVsYXRlZFRhcmdldCxmdW5jdGlvbihuKXt0KGUsXCJwb2ludGVybGVhdmVcIiwhMSxuLGUucmVsYXRlZFRhcmdldCl9KSl9fSl9aWYoIXdpbmRvdy5Qb2ludGVyRXZlbnQpe0FycmF5LnByb3RvdHlwZS5pbmRleE9mfHwoQXJyYXkucHJvdG90eXBlLmluZGV4T2Y9ZnVuY3Rpb24oZSl7dmFyIHQ9T2JqZWN0KHRoaXMpLG49dC5sZW5ndGg+Pj4wO2lmKDA9PT1uKXJldHVybi0xO3ZhciByPTA7aWYoYXJndW1lbnRzLmxlbmd0aD4wJiYocj1OdW1iZXIoYXJndW1lbnRzWzFdKSxyIT09cj9yPTA6MCE9PXImJjEvMCE9PXImJnIhPT0tMS8wJiYocj0ocj4wfHwtMSkqTWF0aC5mbG9vcihNYXRoLmFicyhyKSkpKSxyPj1uKXJldHVybi0xO2Zvcih2YXIgbz1yPj0wP3I6TWF0aC5tYXgobi1NYXRoLmFicyhyKSwwKTtuPm87bysrKWlmKG8gaW4gdCYmdFtvXT09PWUpcmV0dXJuIG87cmV0dXJuLTF9KSxBcnJheS5wcm90b3R5cGUuZm9yRWFjaHx8KEFycmF5LnByb3RvdHlwZS5mb3JFYWNoPWZ1bmN0aW9uKGUsdCl7aWYoISh0aGlzJiZlIGluc3RhbmNlb2YgRnVuY3Rpb24pKXRocm93IG5ldyBUeXBlRXJyb3I7Zm9yKHZhciBuPTA7bjx0aGlzLmxlbmd0aDtuKyspZS5jYWxsKHQsdGhpc1tuXSxuLHRoaXMpfSksU3RyaW5nLnByb3RvdHlwZS50cmltfHwoU3RyaW5nLnByb3RvdHlwZS50cmltPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMucmVwbGFjZSgvXlxccyt8XFxzKyQvLFwiXCIpfSk7dmFyIGk9W1wicG9pbnRlcmRvd25cIixcInBvaW50ZXJ1cFwiLFwicG9pbnRlcm1vdmVcIixcInBvaW50ZXJvdmVyXCIsXCJwb2ludGVyb3V0XCIsXCJwb2ludGVyY2FuY2VsXCIsXCJwb2ludGVyZW50ZXJcIixcInBvaW50ZXJsZWF2ZVwiXSxhPVtcIlBvaW50ZXJEb3duXCIsXCJQb2ludGVyVXBcIixcIlBvaW50ZXJNb3ZlXCIsXCJQb2ludGVyT3ZlclwiLFwiUG9pbnRlck91dFwiLFwiUG9pbnRlckNhbmNlbFwiLFwiUG9pbnRlckVudGVyXCIsXCJQb2ludGVyTGVhdmVcIl0scz1cInRvdWNoXCIsZD1cInBlblwiLGM9XCJtb3VzZVwiLGY9e30sbD1mdW5jdGlvbihlKXtmb3IoO2UmJiFlLmhhbmRqc19mb3JjZVByZXZlbnREZWZhdWx0OyllPWUucGFyZW50Tm9kZTtyZXR1cm4hIWV8fHdpbmRvdy5oYW5kanNfZm9yY2VQcmV2ZW50RGVmYXVsdH0sdj1mdW5jdGlvbihlLHQsbixyLG8pe3ZhciBpO2lmKGRvY3VtZW50LmNyZWF0ZUV2ZW50PyhpPWRvY3VtZW50LmNyZWF0ZUV2ZW50KFwiTW91c2VFdmVudHNcIiksaS5pbml0TW91c2VFdmVudCh0LG4sITAsd2luZG93LDEsZS5zY3JlZW5YLGUuc2NyZWVuWSxlLmNsaWVudFgsZS5jbGllbnRZLGUuY3RybEtleSxlLmFsdEtleSxlLnNoaWZ0S2V5LGUubWV0YUtleSxlLmJ1dHRvbixvfHxlLnJlbGF0ZWRUYXJnZXQpKTooaT1kb2N1bWVudC5jcmVhdGVFdmVudE9iamVjdCgpLGkuc2NyZWVuWD1lLnNjcmVlblgsaS5zY3JlZW5ZPWUuc2NyZWVuWSxpLmNsaWVudFg9ZS5jbGllbnRYLGkuY2xpZW50WT1lLmNsaWVudFksaS5jdHJsS2V5PWUuY3RybEtleSxpLmFsdEtleT1lLmFsdEtleSxpLnNoaWZ0S2V5PWUuc2hpZnRLZXksaS5tZXRhS2V5PWUubWV0YUtleSxpLmJ1dHRvbj1lLmJ1dHRvbixpLnJlbGF0ZWRUYXJnZXQ9b3x8ZS5yZWxhdGVkVGFyZ2V0KSx2b2lkIDA9PT1pLm9mZnNldFgmJih2b2lkIDAhPT1lLm9mZnNldFg/KE9iamVjdCYmdm9pZCAwIT09T2JqZWN0LmRlZmluZVByb3BlcnR5JiYoT2JqZWN0LmRlZmluZVByb3BlcnR5KGksXCJvZmZzZXRYXCIse3dyaXRhYmxlOiEwfSksT2JqZWN0LmRlZmluZVByb3BlcnR5KGksXCJvZmZzZXRZXCIse3dyaXRhYmxlOiEwfSkpLGkub2Zmc2V0WD1lLm9mZnNldFgsaS5vZmZzZXRZPWUub2Zmc2V0WSk6T2JqZWN0JiZ2b2lkIDAhPT1PYmplY3QuZGVmaW5lUHJvcGVydHk/KE9iamVjdC5kZWZpbmVQcm9wZXJ0eShpLFwib2Zmc2V0WFwiLHtnZXQ6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5jdXJyZW50VGFyZ2V0JiZ0aGlzLmN1cnJlbnRUYXJnZXQub2Zmc2V0TGVmdD9lLmNsaWVudFgtdGhpcy5jdXJyZW50VGFyZ2V0Lm9mZnNldExlZnQ6ZS5jbGllbnRYfX0pLE9iamVjdC5kZWZpbmVQcm9wZXJ0eShpLFwib2Zmc2V0WVwiLHtnZXQ6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5jdXJyZW50VGFyZ2V0JiZ0aGlzLmN1cnJlbnRUYXJnZXQub2Zmc2V0VG9wP2UuY2xpZW50WS10aGlzLmN1cnJlbnRUYXJnZXQub2Zmc2V0VG9wOmUuY2xpZW50WX19KSk6dm9pZCAwIT09ZS5sYXllclgmJihpLm9mZnNldFg9ZS5sYXllclgtZS5jdXJyZW50VGFyZ2V0Lm9mZnNldExlZnQsaS5vZmZzZXRZPWUubGF5ZXJZLWUuY3VycmVudFRhcmdldC5vZmZzZXRUb3ApKSxpLmlzUHJpbWFyeT12b2lkIDAhPT1lLmlzUHJpbWFyeT9lLmlzUHJpbWFyeTohMCxlLnByZXNzdXJlKWkucHJlc3N1cmU9ZS5wcmVzc3VyZTtlbHNle3ZhciBhPTA7dm9pZCAwIT09ZS53aGljaD9hPWUud2hpY2g6dm9pZCAwIT09ZS5idXR0b24mJihhPWUuYnV0dG9uKSxpLnByZXNzdXJlPTA9PT1hPzA6LjV9aWYoaS5yb3RhdGlvbj1lLnJvdGF0aW9uP2Uucm90YXRpb246MCxpLmh3VGltZXN0YW1wPWUuaHdUaW1lc3RhbXA/ZS5od1RpbWVzdGFtcDowLGkudGlsdFg9ZS50aWx0WD9lLnRpbHRYOjAsaS50aWx0WT1lLnRpbHRZP2UudGlsdFk6MCxpLmhlaWdodD1lLmhlaWdodD9lLmhlaWdodDowLGkud2lkdGg9ZS53aWR0aD9lLndpZHRoOjAsaS5wcmV2ZW50RGVmYXVsdD1mdW5jdGlvbigpe3ZvaWQgMCE9PWUucHJldmVudERlZmF1bHQmJmUucHJldmVudERlZmF1bHQoKX0sdm9pZCAwIT09aS5zdG9wUHJvcGFnYXRpb24pe3ZhciBmPWkuc3RvcFByb3BhZ2F0aW9uO2kuc3RvcFByb3BhZ2F0aW9uPWZ1bmN0aW9uKCl7dm9pZCAwIT09ZS5zdG9wUHJvcGFnYXRpb24mJmUuc3RvcFByb3BhZ2F0aW9uKCksZi5jYWxsKHRoaXMpfX1zd2l0Y2goaS5wb2ludGVySWQ9ZS5wb2ludGVySWQsaS5wb2ludGVyVHlwZT1lLnBvaW50ZXJUeXBlLGkucG9pbnRlclR5cGUpe2Nhc2UgMjppLnBvaW50ZXJUeXBlPXM7YnJlYWs7Y2FzZSAzOmkucG9pbnRlclR5cGU9ZDticmVhaztjYXNlIDQ6aS5wb2ludGVyVHlwZT1jfXI/ci5kaXNwYXRjaEV2ZW50KGkpOmUudGFyZ2V0P2UudGFyZ2V0LmRpc3BhdGNoRXZlbnQoaSk6ZS5zcmNFbGVtZW50LmZpcmVFdmVudChcIm9uXCIrRSh0KSxpKX0sdT1mdW5jdGlvbihlLHQsbixyLG8pe2UucG9pbnRlcklkPTEsZS5wb2ludGVyVHlwZT1jLHYoZSx0LG4scixvKX0scD1mdW5jdGlvbihlLHQsbixyLG8saSl7dmFyIGE9dC5pZGVudGlmaWVyKzI7dC5wb2ludGVySWQ9YSx0LnBvaW50ZXJUeXBlPXMsdC5jdXJyZW50VGFyZ2V0PW4sdm9pZCAwIT09ci5wcmV2ZW50RGVmYXVsdCYmKHQucHJldmVudERlZmF1bHQ9ZnVuY3Rpb24oKXtyLnByZXZlbnREZWZhdWx0KCl9KSx2KHQsZSxvLG4saSl9LGg9ZnVuY3Rpb24oZSx0KXtyZXR1cm4gZS5fX2hhbmRqc0dsb2JhbFJlZ2lzdGVyZWRFdmVudHMmJmUuX19oYW5kanNHbG9iYWxSZWdpc3RlcmVkRXZlbnRzW3RdfSxtPWZ1bmN0aW9uKGUsdCl7Zm9yKDtlJiYhaChlLHQpOyllPWUucGFyZW50Tm9kZTtyZXR1cm4gZT9lOmgod2luZG93LHQpP3dpbmRvdzp2b2lkIDB9LGc9ZnVuY3Rpb24oZSx0LG4scixvLGkpe20obixlKSYmcChlLHQsbixyLG8saSl9LEU9ZnVuY3Rpb24oZSl7cmV0dXJuIGUudG9Mb3dlckNhc2UoKS5yZXBsYWNlKFwicG9pbnRlclwiLFwibW91c2VcIil9LHc9ZnVuY3Rpb24oZSx0KXt2YXIgbj1pLmluZGV4T2YodCkscj1lK2Fbbl07cmV0dXJuIHJ9LFQ9ZnVuY3Rpb24oZSx0LG4scil7aWYodm9pZCAwPT09ZS5fX2hhbmRqc1JlZ2lzdGVyZWRFdmVudHMmJihlLl9faGFuZGpzUmVnaXN0ZXJlZEV2ZW50cz1bXSkscil7aWYodm9pZCAwIT09ZS5fX2hhbmRqc1JlZ2lzdGVyZWRFdmVudHNbdF0pcmV0dXJuIGUuX19oYW5kanNSZWdpc3RlcmVkRXZlbnRzW3RdKyssdm9pZCAwO2UuX19oYW5kanNSZWdpc3RlcmVkRXZlbnRzW3RdPTEsZS5hZGRFdmVudExpc3RlbmVyKHQsbiwhMSl9ZWxzZXtpZigtMSE9PWUuX19oYW5kanNSZWdpc3RlcmVkRXZlbnRzLmluZGV4T2YodCkmJihlLl9faGFuZGpzUmVnaXN0ZXJlZEV2ZW50c1t0XS0tLDAhPT1lLl9faGFuZGpzUmVnaXN0ZXJlZEV2ZW50c1t0XSkpcmV0dXJuO2UucmVtb3ZlRXZlbnRMaXN0ZW5lcih0LG4pLGUuX19oYW5kanNSZWdpc3RlcmVkRXZlbnRzW3RdPTB9fSx5PWZ1bmN0aW9uKGUsdCxuKXtpZihlLl9faGFuZGpzR2xvYmFsUmVnaXN0ZXJlZEV2ZW50c3x8KGUuX19oYW5kanNHbG9iYWxSZWdpc3RlcmVkRXZlbnRzPVtdKSxuKXtpZih2b2lkIDAhPT1lLl9faGFuZGpzR2xvYmFsUmVnaXN0ZXJlZEV2ZW50c1t0XSlyZXR1cm4gZS5fX2hhbmRqc0dsb2JhbFJlZ2lzdGVyZWRFdmVudHNbdF0rKyx2b2lkIDA7ZS5fX2hhbmRqc0dsb2JhbFJlZ2lzdGVyZWRFdmVudHNbdF09MX1lbHNlIHZvaWQgMCE9PWUuX19oYW5kanNHbG9iYWxSZWdpc3RlcmVkRXZlbnRzW3RdJiYoZS5fX2hhbmRqc0dsb2JhbFJlZ2lzdGVyZWRFdmVudHNbdF0tLSxlLl9faGFuZGpzR2xvYmFsUmVnaXN0ZXJlZEV2ZW50c1t0XTwwJiYoZS5fX2hhbmRqc0dsb2JhbFJlZ2lzdGVyZWRFdmVudHNbdF09MCkpO3ZhciByLG87c3dpdGNoKHdpbmRvdy5NU1BvaW50ZXJFdmVudD8ocj1mdW5jdGlvbihlKXtyZXR1cm4gdyhcIk1TXCIsZSl9LG89dik6KHI9RSxvPXUpLHQpe2Nhc2VcInBvaW50ZXJlbnRlclwiOmNhc2VcInBvaW50ZXJsZWF2ZVwiOnZhciBpPXIodCk7dm9pZCAwIT09ZVtcIm9uXCIraS50b0xvd2VyQ2FzZSgpXSYmVChlLGksZnVuY3Rpb24oZSl7byhlLHQpfSxuKX19LEw9ZnVuY3Rpb24oZSl7dmFyIHQ9ZS5wcm90b3R5cGU/ZS5wcm90b3R5cGUuYWRkRXZlbnRMaXN0ZW5lcjplLmFkZEV2ZW50TGlzdGVuZXIsbj1mdW5jdGlvbihlLG4scil7LTEhPT1pLmluZGV4T2YoZSkmJnkodGhpcyxlLCEwKSx2b2lkIDA9PT10P3RoaXMuYXR0YWNoRXZlbnQoXCJvblwiK0UoZSksbik6dC5jYWxsKHRoaXMsZSxuLHIpfTtlLnByb3RvdHlwZT9lLnByb3RvdHlwZS5hZGRFdmVudExpc3RlbmVyPW46ZS5hZGRFdmVudExpc3RlbmVyPW59LF89ZnVuY3Rpb24oZSl7dmFyIHQ9ZS5wcm90b3R5cGU/ZS5wcm90b3R5cGUucmVtb3ZlRXZlbnRMaXN0ZW5lcjplLnJlbW92ZUV2ZW50TGlzdGVuZXIsbj1mdW5jdGlvbihlLG4scil7LTEhPT1pLmluZGV4T2YoZSkmJnkodGhpcyxlLCExKSx2b2lkIDA9PT10P3RoaXMuZGV0YWNoRXZlbnQoRShlKSxuKTp0LmNhbGwodGhpcyxlLG4scil9O2UucHJvdG90eXBlP2UucHJvdG90eXBlLnJlbW92ZUV2ZW50TGlzdGVuZXI9bjplLnJlbW92ZUV2ZW50TGlzdGVuZXI9bn07TCh3aW5kb3cpLEwod2luZG93LkhUTUxFbGVtZW50fHx3aW5kb3cuRWxlbWVudCksTChkb2N1bWVudCksTChIVE1MQm9keUVsZW1lbnQpLEwoSFRNTERpdkVsZW1lbnQpLEwoSFRNTEltYWdlRWxlbWVudCksTChIVE1MVUxpc3RFbGVtZW50KSxMKEhUTUxBbmNob3JFbGVtZW50KSxMKEhUTUxMSUVsZW1lbnQpLEwoSFRNTFRhYmxlRWxlbWVudCksd2luZG93LkhUTUxTcGFuRWxlbWVudCYmTChIVE1MU3BhbkVsZW1lbnQpLHdpbmRvdy5IVE1MQ2FudmFzRWxlbWVudCYmTChIVE1MQ2FudmFzRWxlbWVudCksd2luZG93LlNWR0VsZW1lbnQmJkwoU1ZHRWxlbWVudCksXyh3aW5kb3cpLF8od2luZG93LkhUTUxFbGVtZW50fHx3aW5kb3cuRWxlbWVudCksXyhkb2N1bWVudCksXyhIVE1MQm9keUVsZW1lbnQpLF8oSFRNTERpdkVsZW1lbnQpLF8oSFRNTEltYWdlRWxlbWVudCksXyhIVE1MVUxpc3RFbGVtZW50KSxfKEhUTUxBbmNob3JFbGVtZW50KSxfKEhUTUxMSUVsZW1lbnQpLF8oSFRNTFRhYmxlRWxlbWVudCksd2luZG93LkhUTUxTcGFuRWxlbWVudCYmXyhIVE1MU3BhbkVsZW1lbnQpLHdpbmRvdy5IVE1MQ2FudmFzRWxlbWVudCYmXyhIVE1MQ2FudmFzRWxlbWVudCksd2luZG93LlNWR0VsZW1lbnQmJl8oU1ZHRWxlbWVudCk7dmFyIGI9ITEsTT0tMTshZnVuY3Rpb24oKXt3aW5kb3cuTVNQb2ludGVyRXZlbnQ/byhmdW5jdGlvbihlKXtyZXR1cm4gdyhcIk1TXCIsZSl9LHYpOihvKEUsdSksdm9pZCAwIT09d2luZG93Lm9udG91Y2hzdGFydCYmKHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKFwidG91Y2hzdGFydFwiLGZ1bmN0aW9uKHQpe2Zvcih2YXIgcj0wO3I8dC5jaGFuZ2VkVG91Y2hlcy5sZW5ndGg7KytyKXt2YXIgbz10LmNoYW5nZWRUb3VjaGVzW3JdO2Zbby5pZGVudGlmaWVyXT1vLnRhcmdldCxnKFwicG9pbnRlcm92ZXJcIixvLG8udGFyZ2V0LHQsITApLG4oby50YXJnZXQsbnVsbCxmdW5jdGlvbihlKXtwKFwicG9pbnRlcmVudGVyXCIsbyxlLHQsITEpfSksZyhcInBvaW50ZXJkb3duXCIsbyxvLnRhcmdldCx0LCEwKX1lKCl9KSx3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcInRvdWNoZW5kXCIsZnVuY3Rpb24odCl7Zm9yKHZhciBuPTA7bjx0LmNoYW5nZWRUb3VjaGVzLmxlbmd0aDsrK24pe3ZhciBvPXQuY2hhbmdlZFRvdWNoZXNbbl0saT1mW28uaWRlbnRpZmllcl07ZyhcInBvaW50ZXJ1cFwiLG8saSx0LCEwKSxnKFwicG9pbnRlcm91dFwiLG8saSx0LCEwKSxyKGksbnVsbCxmdW5jdGlvbihlKXtwKFwicG9pbnRlcmxlYXZlXCIsbyxlLHQsITEpfSl9ZSgpfSksd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJ0b3VjaG1vdmVcIixmdW5jdGlvbih0KXtmb3IodmFyIG89MDtvPHQuY2hhbmdlZFRvdWNoZXMubGVuZ3RoOysrbyl7dmFyIGk9dC5jaGFuZ2VkVG91Y2hlc1tvXSxhPWRvY3VtZW50LmVsZW1lbnRGcm9tUG9pbnQoaS5jbGllbnRYLGkuY2xpZW50WSkscz1mW2kuaWRlbnRpZmllcl07cyYmbChzKT09PSEwJiZ0LnByZXZlbnREZWZhdWx0KCksZyhcInBvaW50ZXJtb3ZlXCIsaSxzLHQsITApLHMhPT1hJiYocyYmKGcoXCJwb2ludGVyb3V0XCIsaSxzLHQsITAsYSkscy5jb250YWlucyhhKXx8cihzLGEsZnVuY3Rpb24oZSl7cChcInBvaW50ZXJsZWF2ZVwiLGksZSx0LCExLGEpfSkpLGEmJihnKFwicG9pbnRlcm92ZXJcIixpLGEsdCwhMCxzKSxhLmNvbnRhaW5zKHMpfHxuKGEscyxmdW5jdGlvbihlKXtwKFwicG9pbnRlcmVudGVyXCIsaSxlLHQsITEscyl9KSksZltpLmlkZW50aWZpZXJdPWEpfWUoKX0pLHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKFwidG91Y2hjYW5jZWxcIixmdW5jdGlvbihlKXtmb3IodmFyIHQ9MDt0PGUuY2hhbmdlZFRvdWNoZXMubGVuZ3RoOysrdCl7dmFyIG49ZS5jaGFuZ2VkVG91Y2hlc1t0XTtnKFwicG9pbnRlcmNhbmNlbFwiLG4sZltuLmlkZW50aWZpZXJdLGUsITApfX0pKSl9KCksdm9pZCAwPT09bmF2aWdhdG9yLnBvaW50ZXJFbmFibGVkJiYobmF2aWdhdG9yLnBvaW50ZXJFbmFibGVkPSEwLG5hdmlnYXRvci5tc1BvaW50ZXJFbmFibGVkJiYobmF2aWdhdG9yLm1heFRvdWNoUG9pbnRzPW5hdmlnYXRvci5tc01heFRvdWNoUG9pbnRzKSl9fSgpLGZ1bmN0aW9uKCl7d2luZG93LlBvaW50ZXJFdmVudHx8ZG9jdW1lbnQuc3R5bGVTaGVldHMmJmRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXImJmRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJET01Db250ZW50TG9hZGVkXCIsZnVuY3Rpb24oKXtpZih2b2lkIDA9PT1kb2N1bWVudC5ib2R5LnN0eWxlLnRvdWNoQWN0aW9uKXt2YXIgZT1uZXcgUmVnRXhwKFwiLis/ey4qP31cIixcIm1cIiksdD1uZXcgUmVnRXhwKFwiLis/e1wiLFwibVwiKSxuPWZ1bmN0aW9uKG4pe3ZhciByPWUuZXhlYyhuKTtpZihyKXt2YXIgbz1yWzBdO249bi5yZXBsYWNlKG8sXCJcIikudHJpbSgpO3ZhciBpPXQuZXhlYyhvKVswXS5yZXBsYWNlKFwie1wiLFwiXCIpLnRyaW0oKTtpZigtMSE9PW8ucmVwbGFjZSgvXFxzL2csXCJcIikuaW5kZXhPZihcInRvdWNoLWFjdGlvbjpub25lXCIpKWZvcih2YXIgYT1kb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKGkpLHM9MDtzPGEubGVuZ3RoO3MrKyl7dmFyIGQ9YVtzXTt2b2lkIDAhPT1kLnN0eWxlLm1zVG91Y2hBY3Rpb24/ZC5zdHlsZS5tc1RvdWNoQWN0aW9uPVwibm9uZVwiOmQuaGFuZGpzX2ZvcmNlUHJldmVudERlZmF1bHQ9ITB9cmV0dXJuIG59fSxyPWZ1bmN0aW9uKGUpe2lmKHdpbmRvdy5zZXRJbW1lZGlhdGUpZSYmc2V0SW1tZWRpYXRlKHIsbihlKSk7ZWxzZSBmb3IoO2U7KWU9bihlKX07dHJ5e2Zvcih2YXIgbz0wO288ZG9jdW1lbnQuc3R5bGVTaGVldHMubGVuZ3RoO28rKyl7dmFyIGk9ZG9jdW1lbnQuc3R5bGVTaGVldHNbb107aWYodm9pZCAwIT09aS5ocmVmKXt2YXIgYT1uZXcgWE1MSHR0cFJlcXVlc3Q7YS5vcGVuKFwiZ2V0XCIsaS5ocmVmKSxhLnNlbmQoKTt2YXIgcz1hLnJlc3BvbnNlVGV4dC5yZXBsYWNlKC8oXFxufFxccikvZyxcIlwiKTtyKHMpfX19Y2F0Y2goZCl7fWZvcih2YXIgYz1kb2N1bWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZShcInN0eWxlXCIpLG89MDtvPGMubGVuZ3RoO28rKyl7dmFyIGY9Y1tvXSxsPWYuaW5uZXJIVE1MLnJlcGxhY2UoLyhcXG58XFxyKS9nLFwiXCIpLnRyaW0oKTtyKGwpfX19LCExKX0oKTsiLCIvLyBSYWYgcG9seWZpbGwgYnkgRXJpayBNw7ZsbGVyLiBmaXhlcyBmcm9tIFBhdWwgSXJpc2ggYW5kIFRpbm8gWmlqZGVsXHJcbi8vIE1JVCBsaWNlbnNlXHJcbi8vIEFkYXB0ZWQgdG8gQ29tbW9uSlMgYnkgSm9lIEVzcG9zaXRvXHJcbi8vIE9yaWdpbjogaHR0cDovL3BhdWxpcmlzaC5jb20vMjAxMS9yZXF1ZXN0YW5pbWF0aW9uZnJhbWUtZm9yLXNtYXJ0LWFuaW1hdGluZy9cclxuLy8gICAgICAgICBodHRwczovL2dpc3QuZ2l0aHViLmNvbS9wYXVsaXJpc2gvMTU3OTY3MVxyXG5cclxudmFyIHJhZiA9IChmdW5jdGlvbiAoKSB7XHJcbiAgdmFyIHJlcXVlc3RBbmltYXRpb25GcmFtZSA9IG51bGw7XHJcbiAgdmFyIGNhbmNlbEFuaW1hdGlvbkZyYW1lID0gbnVsbDtcclxuXHJcbiAgaWYgKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnKSB7XHJcbiAgICB2YXIgdmVuZG9ycyA9IFsnbXMnLCAnbW96JywgJ3dlYmtpdCcsICdvJ107XHJcbiAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUgPSB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lO1xyXG4gICAgY2FuY2VsQW5pbWF0aW9uRnJhbWUgPSB3aW5kb3cuY2FuY2VsQW5pbWF0aW9uRnJhbWU7XHJcbiAgICBmb3IodmFyIHggPSAwOyB4IDwgdmVuZG9ycy5sZW5ndGggJiYgIXJlcXVlc3RBbmltYXRpb25GcmFtZTsgKyt4KSB7XHJcbiAgICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZSA9IHdpbmRvd1t2ZW5kb3JzW3hdICsgJ1JlcXVlc3RBbmltYXRpb25GcmFtZSddO1xyXG4gICAgICBjYW5jZWxBbmltYXRpb25GcmFtZSA9IHdpbmRvd1t2ZW5kb3JzW3hdICsgJ0NhbmNlbEFuaW1hdGlvbkZyYW1lJ10gfHwgd2luZG93W3ZlbmRvcnNbeF0gKyAnQ2FuY2VsUmVxdWVzdEFuaW1hdGlvbkZyYW1lJ107XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBpZiAoIXJlcXVlc3RBbmltYXRpb25GcmFtZSkge1xyXG4gICAgdmFyIGxhc3RUaW1lID0gMDtcclxuICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZSA9IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XHJcbiAgICAgIHZhciBjdXJyVGltZSA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xyXG4gICAgICB2YXIgdGltZVRvQ2FsbCA9IE1hdGgubWF4KDAsIDE2IC0gKGN1cnJUaW1lIC0gbGFzdFRpbWUpKTtcclxuICAgICAgdmFyIGlkID0gc2V0VGltZW91dChmdW5jdGlvbiAoKSB7IGNhbGxiYWNrKGN1cnJUaW1lICsgdGltZVRvQ2FsbCk7IH0sIHRpbWVUb0NhbGwpO1xyXG4gICAgICBsYXN0VGltZSA9IGN1cnJUaW1lICsgdGltZVRvQ2FsbDtcclxuICAgICAgcmV0dXJuIGlkO1xyXG4gICAgfTtcclxuICAgIGNhbmNlbEFuaW1hdGlvbkZyYW1lID0gZnVuY3Rpb24oaWQpIHtcclxuICAgICAgY2xlYXJUaW1lb3V0KGlkKTtcclxuICAgIH07XHJcbiAgfVxyXG5cclxuICByZXR1cm4ge1xyXG4gICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lOiBmdW5jdGlvbihjYWxsYmFjaykgeyByZXR1cm4gcmVxdWVzdEFuaW1hdGlvbkZyYW1lKGNhbGxiYWNrKTsgfSxcclxuICAgIGNhbmNlbEFuaW1hdGlvbkZyYW1lOiBmdW5jdGlvbihyZXF1ZXN0SUQpIHsgcmV0dXJuIGNhbmNlbEFuaW1hdGlvbkZyYW1lKHJlcXVlc3RJRCk7IH1cclxuICB9O1xyXG59KSgpO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSByYWY7XHJcbiIsIi8vIEdlc3NvIEVudHJ5IFBvaW50XHJcbi8vIERldGVjdCB3aGV0aGVyIHRoaXMgaXMgY2FsbGVkIGZyb20gdGhlIGJyb3dzZXIsIG9yIGZyb20gdGhlIENMSS5cclxuXHJcbmlmICh0eXBlb2Ygd2luZG93ID09PSAndW5kZWZpbmVkJykge1xyXG4gIC8vIFVzZSBtb2R1bGUucmVxdWlyZSBzbyB0aGUgY2xpZW50LXNpZGUgYnVpbGQgc2tpcHMgb3ZlciBzZXJ2ZXIgY29kZSxcclxuICAvLyB3aGljaCB3aWxsIHdvcmsgcHJvcGVybHkgYXQgcnVudGltZSBzaW5jZSBubyB3aW5kb3cgZ2xvYmFsIGlzIGRlZmluZWRcclxuICBtb2R1bGUuZXhwb3J0cyA9IG1vZHVsZS5yZXF1aXJlKCcuL2dlc3NvJyk7XHJcbn0gZWxzZSB7XHJcbiAgLy8gSW5jbHVkZSBpbiBjbGllbnQtc2lkZSBidWlsZCxcclxuICAvLyB3aGljaCB3aWxsIGhhdmUgYSB3aW5kb3cgZ2xvYmFsIGRlZmluZWQgYXQgcnVudGltZVxyXG4gIG1vZHVsZS5leHBvcnRzID0gcmVxdWlyZSgnLi9jbGllbnQnKTtcclxufVxyXG4iLCIoZnVuY3Rpb24gKHByb2Nlc3Mpe1xuLy8gQ29weXJpZ2h0IEpveWVudCwgSW5jLiBhbmQgb3RoZXIgTm9kZSBjb250cmlidXRvcnMuXG4vL1xuLy8gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGFcbi8vIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGVcbi8vIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZ1xuLy8gd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLFxuLy8gZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdFxuLy8gcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlXG4vLyBmb2xsb3dpbmcgY29uZGl0aW9uczpcbi8vXG4vLyBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZFxuLy8gaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4vL1xuLy8gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTU1xuLy8gT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRlxuLy8gTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTlxuLy8gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sXG4vLyBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1Jcbi8vIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEVcbi8vIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXG5cbi8vIHJlc29sdmVzIC4gYW5kIC4uIGVsZW1lbnRzIGluIGEgcGF0aCBhcnJheSB3aXRoIGRpcmVjdG9yeSBuYW1lcyB0aGVyZVxuLy8gbXVzdCBiZSBubyBzbGFzaGVzLCBlbXB0eSBlbGVtZW50cywgb3IgZGV2aWNlIG5hbWVzIChjOlxcKSBpbiB0aGUgYXJyYXlcbi8vIChzbyBhbHNvIG5vIGxlYWRpbmcgYW5kIHRyYWlsaW5nIHNsYXNoZXMgLSBpdCBkb2VzIG5vdCBkaXN0aW5ndWlzaFxuLy8gcmVsYXRpdmUgYW5kIGFic29sdXRlIHBhdGhzKVxuZnVuY3Rpb24gbm9ybWFsaXplQXJyYXkocGFydHMsIGFsbG93QWJvdmVSb290KSB7XG4gIC8vIGlmIHRoZSBwYXRoIHRyaWVzIHRvIGdvIGFib3ZlIHRoZSByb290LCBgdXBgIGVuZHMgdXAgPiAwXG4gIHZhciB1cCA9IDA7XG4gIGZvciAodmFyIGkgPSBwYXJ0cy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuICAgIHZhciBsYXN0ID0gcGFydHNbaV07XG4gICAgaWYgKGxhc3QgPT09ICcuJykge1xuICAgICAgcGFydHMuc3BsaWNlKGksIDEpO1xuICAgIH0gZWxzZSBpZiAobGFzdCA9PT0gJy4uJykge1xuICAgICAgcGFydHMuc3BsaWNlKGksIDEpO1xuICAgICAgdXArKztcbiAgICB9IGVsc2UgaWYgKHVwKSB7XG4gICAgICBwYXJ0cy5zcGxpY2UoaSwgMSk7XG4gICAgICB1cC0tO1xuICAgIH1cbiAgfVxuXG4gIC8vIGlmIHRoZSBwYXRoIGlzIGFsbG93ZWQgdG8gZ28gYWJvdmUgdGhlIHJvb3QsIHJlc3RvcmUgbGVhZGluZyAuLnNcbiAgaWYgKGFsbG93QWJvdmVSb290KSB7XG4gICAgZm9yICg7IHVwLS07IHVwKSB7XG4gICAgICBwYXJ0cy51bnNoaWZ0KCcuLicpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBwYXJ0cztcbn1cblxuLy8gU3BsaXQgYSBmaWxlbmFtZSBpbnRvIFtyb290LCBkaXIsIGJhc2VuYW1lLCBleHRdLCB1bml4IHZlcnNpb25cbi8vICdyb290JyBpcyBqdXN0IGEgc2xhc2gsIG9yIG5vdGhpbmcuXG52YXIgc3BsaXRQYXRoUmUgPVxuICAgIC9eKFxcLz98KShbXFxzXFxTXSo/KSgoPzpcXC57MSwyfXxbXlxcL10rP3wpKFxcLlteLlxcL10qfCkpKD86W1xcL10qKSQvO1xudmFyIHNwbGl0UGF0aCA9IGZ1bmN0aW9uKGZpbGVuYW1lKSB7XG4gIHJldHVybiBzcGxpdFBhdGhSZS5leGVjKGZpbGVuYW1lKS5zbGljZSgxKTtcbn07XG5cbi8vIHBhdGgucmVzb2x2ZShbZnJvbSAuLi5dLCB0bylcbi8vIHBvc2l4IHZlcnNpb25cbmV4cG9ydHMucmVzb2x2ZSA9IGZ1bmN0aW9uKCkge1xuICB2YXIgcmVzb2x2ZWRQYXRoID0gJycsXG4gICAgICByZXNvbHZlZEFic29sdXRlID0gZmFsc2U7XG5cbiAgZm9yICh2YXIgaSA9IGFyZ3VtZW50cy5sZW5ndGggLSAxOyBpID49IC0xICYmICFyZXNvbHZlZEFic29sdXRlOyBpLS0pIHtcbiAgICB2YXIgcGF0aCA9IChpID49IDApID8gYXJndW1lbnRzW2ldIDogcHJvY2Vzcy5jd2QoKTtcblxuICAgIC8vIFNraXAgZW1wdHkgYW5kIGludmFsaWQgZW50cmllc1xuICAgIGlmICh0eXBlb2YgcGF0aCAhPT0gJ3N0cmluZycpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0FyZ3VtZW50cyB0byBwYXRoLnJlc29sdmUgbXVzdCBiZSBzdHJpbmdzJyk7XG4gICAgfSBlbHNlIGlmICghcGF0aCkge1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgcmVzb2x2ZWRQYXRoID0gcGF0aCArICcvJyArIHJlc29sdmVkUGF0aDtcbiAgICByZXNvbHZlZEFic29sdXRlID0gcGF0aC5jaGFyQXQoMCkgPT09ICcvJztcbiAgfVxuXG4gIC8vIEF0IHRoaXMgcG9pbnQgdGhlIHBhdGggc2hvdWxkIGJlIHJlc29sdmVkIHRvIGEgZnVsbCBhYnNvbHV0ZSBwYXRoLCBidXRcbiAgLy8gaGFuZGxlIHJlbGF0aXZlIHBhdGhzIHRvIGJlIHNhZmUgKG1pZ2h0IGhhcHBlbiB3aGVuIHByb2Nlc3MuY3dkKCkgZmFpbHMpXG5cbiAgLy8gTm9ybWFsaXplIHRoZSBwYXRoXG4gIHJlc29sdmVkUGF0aCA9IG5vcm1hbGl6ZUFycmF5KGZpbHRlcihyZXNvbHZlZFBhdGguc3BsaXQoJy8nKSwgZnVuY3Rpb24ocCkge1xuICAgIHJldHVybiAhIXA7XG4gIH0pLCAhcmVzb2x2ZWRBYnNvbHV0ZSkuam9pbignLycpO1xuXG4gIHJldHVybiAoKHJlc29sdmVkQWJzb2x1dGUgPyAnLycgOiAnJykgKyByZXNvbHZlZFBhdGgpIHx8ICcuJztcbn07XG5cbi8vIHBhdGgubm9ybWFsaXplKHBhdGgpXG4vLyBwb3NpeCB2ZXJzaW9uXG5leHBvcnRzLm5vcm1hbGl6ZSA9IGZ1bmN0aW9uKHBhdGgpIHtcbiAgdmFyIGlzQWJzb2x1dGUgPSBleHBvcnRzLmlzQWJzb2x1dGUocGF0aCksXG4gICAgICB0cmFpbGluZ1NsYXNoID0gc3Vic3RyKHBhdGgsIC0xKSA9PT0gJy8nO1xuXG4gIC8vIE5vcm1hbGl6ZSB0aGUgcGF0aFxuICBwYXRoID0gbm9ybWFsaXplQXJyYXkoZmlsdGVyKHBhdGguc3BsaXQoJy8nKSwgZnVuY3Rpb24ocCkge1xuICAgIHJldHVybiAhIXA7XG4gIH0pLCAhaXNBYnNvbHV0ZSkuam9pbignLycpO1xuXG4gIGlmICghcGF0aCAmJiAhaXNBYnNvbHV0ZSkge1xuICAgIHBhdGggPSAnLic7XG4gIH1cbiAgaWYgKHBhdGggJiYgdHJhaWxpbmdTbGFzaCkge1xuICAgIHBhdGggKz0gJy8nO1xuICB9XG5cbiAgcmV0dXJuIChpc0Fic29sdXRlID8gJy8nIDogJycpICsgcGF0aDtcbn07XG5cbi8vIHBvc2l4IHZlcnNpb25cbmV4cG9ydHMuaXNBYnNvbHV0ZSA9IGZ1bmN0aW9uKHBhdGgpIHtcbiAgcmV0dXJuIHBhdGguY2hhckF0KDApID09PSAnLyc7XG59O1xuXG4vLyBwb3NpeCB2ZXJzaW9uXG5leHBvcnRzLmpvaW4gPSBmdW5jdGlvbigpIHtcbiAgdmFyIHBhdGhzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAwKTtcbiAgcmV0dXJuIGV4cG9ydHMubm9ybWFsaXplKGZpbHRlcihwYXRocywgZnVuY3Rpb24ocCwgaW5kZXgpIHtcbiAgICBpZiAodHlwZW9mIHAgIT09ICdzdHJpbmcnKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdBcmd1bWVudHMgdG8gcGF0aC5qb2luIG11c3QgYmUgc3RyaW5ncycpO1xuICAgIH1cbiAgICByZXR1cm4gcDtcbiAgfSkuam9pbignLycpKTtcbn07XG5cblxuLy8gcGF0aC5yZWxhdGl2ZShmcm9tLCB0bylcbi8vIHBvc2l4IHZlcnNpb25cbmV4cG9ydHMucmVsYXRpdmUgPSBmdW5jdGlvbihmcm9tLCB0bykge1xuICBmcm9tID0gZXhwb3J0cy5yZXNvbHZlKGZyb20pLnN1YnN0cigxKTtcbiAgdG8gPSBleHBvcnRzLnJlc29sdmUodG8pLnN1YnN0cigxKTtcblxuICBmdW5jdGlvbiB0cmltKGFycikge1xuICAgIHZhciBzdGFydCA9IDA7XG4gICAgZm9yICg7IHN0YXJ0IDwgYXJyLmxlbmd0aDsgc3RhcnQrKykge1xuICAgICAgaWYgKGFycltzdGFydF0gIT09ICcnKSBicmVhaztcbiAgICB9XG5cbiAgICB2YXIgZW5kID0gYXJyLmxlbmd0aCAtIDE7XG4gICAgZm9yICg7IGVuZCA+PSAwOyBlbmQtLSkge1xuICAgICAgaWYgKGFycltlbmRdICE9PSAnJykgYnJlYWs7XG4gICAgfVxuXG4gICAgaWYgKHN0YXJ0ID4gZW5kKSByZXR1cm4gW107XG4gICAgcmV0dXJuIGFyci5zbGljZShzdGFydCwgZW5kIC0gc3RhcnQgKyAxKTtcbiAgfVxuXG4gIHZhciBmcm9tUGFydHMgPSB0cmltKGZyb20uc3BsaXQoJy8nKSk7XG4gIHZhciB0b1BhcnRzID0gdHJpbSh0by5zcGxpdCgnLycpKTtcblxuICB2YXIgbGVuZ3RoID0gTWF0aC5taW4oZnJvbVBhcnRzLmxlbmd0aCwgdG9QYXJ0cy5sZW5ndGgpO1xuICB2YXIgc2FtZVBhcnRzTGVuZ3RoID0gbGVuZ3RoO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgaWYgKGZyb21QYXJ0c1tpXSAhPT0gdG9QYXJ0c1tpXSkge1xuICAgICAgc2FtZVBhcnRzTGVuZ3RoID0gaTtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgfVxuXG4gIHZhciBvdXRwdXRQYXJ0cyA9IFtdO1xuICBmb3IgKHZhciBpID0gc2FtZVBhcnRzTGVuZ3RoOyBpIDwgZnJvbVBhcnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgb3V0cHV0UGFydHMucHVzaCgnLi4nKTtcbiAgfVxuXG4gIG91dHB1dFBhcnRzID0gb3V0cHV0UGFydHMuY29uY2F0KHRvUGFydHMuc2xpY2Uoc2FtZVBhcnRzTGVuZ3RoKSk7XG5cbiAgcmV0dXJuIG91dHB1dFBhcnRzLmpvaW4oJy8nKTtcbn07XG5cbmV4cG9ydHMuc2VwID0gJy8nO1xuZXhwb3J0cy5kZWxpbWl0ZXIgPSAnOic7XG5cbmV4cG9ydHMuZGlybmFtZSA9IGZ1bmN0aW9uKHBhdGgpIHtcbiAgdmFyIHJlc3VsdCA9IHNwbGl0UGF0aChwYXRoKSxcbiAgICAgIHJvb3QgPSByZXN1bHRbMF0sXG4gICAgICBkaXIgPSByZXN1bHRbMV07XG5cbiAgaWYgKCFyb290ICYmICFkaXIpIHtcbiAgICAvLyBObyBkaXJuYW1lIHdoYXRzb2V2ZXJcbiAgICByZXR1cm4gJy4nO1xuICB9XG5cbiAgaWYgKGRpcikge1xuICAgIC8vIEl0IGhhcyBhIGRpcm5hbWUsIHN0cmlwIHRyYWlsaW5nIHNsYXNoXG4gICAgZGlyID0gZGlyLnN1YnN0cigwLCBkaXIubGVuZ3RoIC0gMSk7XG4gIH1cblxuICByZXR1cm4gcm9vdCArIGRpcjtcbn07XG5cblxuZXhwb3J0cy5iYXNlbmFtZSA9IGZ1bmN0aW9uKHBhdGgsIGV4dCkge1xuICB2YXIgZiA9IHNwbGl0UGF0aChwYXRoKVsyXTtcbiAgLy8gVE9ETzogbWFrZSB0aGlzIGNvbXBhcmlzb24gY2FzZS1pbnNlbnNpdGl2ZSBvbiB3aW5kb3dzP1xuICBpZiAoZXh0ICYmIGYuc3Vic3RyKC0xICogZXh0Lmxlbmd0aCkgPT09IGV4dCkge1xuICAgIGYgPSBmLnN1YnN0cigwLCBmLmxlbmd0aCAtIGV4dC5sZW5ndGgpO1xuICB9XG4gIHJldHVybiBmO1xufTtcblxuXG5leHBvcnRzLmV4dG5hbWUgPSBmdW5jdGlvbihwYXRoKSB7XG4gIHJldHVybiBzcGxpdFBhdGgocGF0aClbM107XG59O1xuXG5mdW5jdGlvbiBmaWx0ZXIgKHhzLCBmKSB7XG4gICAgaWYgKHhzLmZpbHRlcikgcmV0dXJuIHhzLmZpbHRlcihmKTtcbiAgICB2YXIgcmVzID0gW107XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCB4cy5sZW5ndGg7IGkrKykge1xuICAgICAgICBpZiAoZih4c1tpXSwgaSwgeHMpKSByZXMucHVzaCh4c1tpXSk7XG4gICAgfVxuICAgIHJldHVybiByZXM7XG59XG5cbi8vIFN0cmluZy5wcm90b3R5cGUuc3Vic3RyIC0gbmVnYXRpdmUgaW5kZXggZG9uJ3Qgd29yayBpbiBJRThcbnZhciBzdWJzdHIgPSAnYWInLnN1YnN0cigtMSkgPT09ICdiJ1xuICAgID8gZnVuY3Rpb24gKHN0ciwgc3RhcnQsIGxlbikgeyByZXR1cm4gc3RyLnN1YnN0cihzdGFydCwgbGVuKSB9XG4gICAgOiBmdW5jdGlvbiAoc3RyLCBzdGFydCwgbGVuKSB7XG4gICAgICAgIGlmIChzdGFydCA8IDApIHN0YXJ0ID0gc3RyLmxlbmd0aCArIHN0YXJ0O1xuICAgICAgICByZXR1cm4gc3RyLnN1YnN0cihzdGFydCwgbGVuKTtcbiAgICB9XG47XG5cbn0pLmNhbGwodGhpcyxyZXF1aXJlKCdfcHJvY2VzcycpKVxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9ZGF0YTphcHBsaWNhdGlvbi9qc29uO2NoYXJzZXQ6dXRmLTg7YmFzZTY0LGV5SjJaWEp6YVc5dUlqb3pMQ0p6YjNWeVkyVnpJanBiSWk0dUx5NHVMeTR1THk0dUwxSmxjRzl6YVhSdmNtbGxjeTluWlhOemJ5NXFjeTl1YjJSbFgyMXZaSFZzWlhNdmNHRjBhQzFpY205M2MyVnlhV1o1TDJsdVpHVjRMbXB6SWwwc0ltNWhiV1Z6SWpwYlhTd2liV0Z3Y0dsdVozTWlPaUk3UVVGQlFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEVpTENKbWFXeGxJam9pWjJWdVpYSmhkR1ZrTG1weklpd2ljMjkxY21ObFVtOXZkQ0k2SWlJc0luTnZkWEpqWlhORGIyNTBaVzUwSWpwYklpOHZJRU52Y0hseWFXZG9kQ0JLYjNsbGJuUXNJRWx1WXk0Z1lXNWtJRzkwYUdWeUlFNXZaR1VnWTI5dWRISnBZblYwYjNKekxseHVMeTljYmk4dklGQmxjbTFwYzNOcGIyNGdhWE1nYUdWeVpXSjVJR2R5WVc1MFpXUXNJR1p5WldVZ2IyWWdZMmhoY21kbExDQjBieUJoYm5rZ2NHVnljMjl1SUc5aWRHRnBibWx1WnlCaFhHNHZMeUJqYjNCNUlHOW1JSFJvYVhNZ2MyOW1kSGRoY21VZ1lXNWtJR0Z6YzI5amFXRjBaV1FnWkc5amRXMWxiblJoZEdsdmJpQm1hV3hsY3lBb2RHaGxYRzR2THlCY0lsTnZablIzWVhKbFhDSXBMQ0IwYnlCa1pXRnNJR2x1SUhSb1pTQlRiMlowZDJGeVpTQjNhWFJvYjNWMElISmxjM1J5YVdOMGFXOXVMQ0JwYm1Oc2RXUnBibWRjYmk4dklIZHBkR2h2ZFhRZ2JHbHRhWFJoZEdsdmJpQjBhR1VnY21sbmFIUnpJSFJ2SUhWelpTd2dZMjl3ZVN3Z2JXOWthV1o1TENCdFpYSm5aU3dnY0hWaWJHbHphQ3hjYmk4dklHUnBjM1J5YVdKMWRHVXNJSE4xWW14cFkyVnVjMlVzSUdGdVpDOXZjaUJ6Wld4c0lHTnZjR2xsY3lCdlppQjBhR1VnVTI5bWRIZGhjbVVzSUdGdVpDQjBieUJ3WlhKdGFYUmNiaTh2SUhCbGNuTnZibk1nZEc4Z2QyaHZiU0IwYUdVZ1UyOW1kSGRoY21VZ2FYTWdablZ5Ym1semFHVmtJSFJ2SUdSdklITnZMQ0J6ZFdKcVpXTjBJSFJ2SUhSb1pWeHVMeThnWm05c2JHOTNhVzVuSUdOdmJtUnBkR2x2Ym5NNlhHNHZMMXh1THk4Z1ZHaGxJR0ZpYjNabElHTnZjSGx5YVdkb2RDQnViM1JwWTJVZ1lXNWtJSFJvYVhNZ2NHVnliV2x6YzJsdmJpQnViM1JwWTJVZ2MyaGhiR3dnWW1VZ2FXNWpiSFZrWldSY2JpOHZJR2x1SUdGc2JDQmpiM0JwWlhNZ2IzSWdjM1ZpYzNSaGJuUnBZV3dnY0c5eWRHbHZibk1nYjJZZ2RHaGxJRk52Wm5SM1lYSmxMbHh1THk5Y2JpOHZJRlJJUlNCVFQwWlVWMEZTUlNCSlV5QlFVazlXU1VSRlJDQmNJa0ZUSUVsVFhDSXNJRmRKVkVoUFZWUWdWMEZTVWtGT1ZGa2dUMFlnUVU1WklFdEpUa1FzSUVWWVVGSkZVMU5jYmk4dklFOVNJRWxOVUV4SlJVUXNJRWxPUTB4VlJFbE9SeUJDVlZRZ1RrOVVJRXhKVFVsVVJVUWdWRThnVkVoRklGZEJVbEpCVGxSSlJWTWdUMFpjYmk4dklFMUZVa05JUVU1VVFVSkpURWxVV1N3Z1JrbFVUa1ZUVXlCR1QxSWdRU0JRUVZKVVNVTlZURUZTSUZCVlVsQlBVMFVnUVU1RUlFNVBUa2xPUmxKSlRrZEZUVVZPVkM0Z1NVNWNiaTh2SUU1UElFVldSVTVVSUZOSVFVeE1JRlJJUlNCQlZWUklUMUpUSUU5U0lFTlBVRmxTU1VkSVZDQklUMHhFUlZKVElFSkZJRXhKUVVKTVJTQkdUMUlnUVU1WklFTk1RVWxOTEZ4dUx5OGdSRUZOUVVkRlV5QlBVaUJQVkVoRlVpQk1TVUZDU1V4SlZGa3NJRmRJUlZSSVJWSWdTVTRnUVU0Z1FVTlVTVTlPSUU5R0lFTlBUbFJTUVVOVUxDQlVUMUpVSUU5U1hHNHZMeUJQVkVoRlVsZEpVMFVzSUVGU1NWTkpUa2NnUmxKUFRTd2dUMVZVSUU5R0lFOVNJRWxPSUVOUFRrNUZRMVJKVDA0Z1YwbFVTQ0JVU0VVZ1UwOUdWRmRCVWtVZ1QxSWdWRWhGWEc0dkx5QlZVMFVnVDFJZ1QxUklSVklnUkVWQlRFbE9SMU1nU1U0Z1ZFaEZJRk5QUmxSWFFWSkZMbHh1WEc0dkx5QnlaWE52YkhabGN5QXVJR0Z1WkNBdUxpQmxiR1Z0Wlc1MGN5QnBiaUJoSUhCaGRHZ2dZWEp5WVhrZ2QybDBhQ0JrYVhKbFkzUnZjbmtnYm1GdFpYTWdkR2hsY21WY2JpOHZJRzExYzNRZ1ltVWdibThnYzJ4aGMyaGxjeXdnWlcxd2RIa2daV3hsYldWdWRITXNJRzl5SUdSbGRtbGpaU0J1WVcxbGN5QW9ZenBjWENrZ2FXNGdkR2hsSUdGeWNtRjVYRzR2THlBb2MyOGdZV3h6YnlCdWJ5QnNaV0ZrYVc1bklHRnVaQ0IwY21GcGJHbHVaeUJ6YkdGemFHVnpJQzBnYVhRZ1pHOWxjeUJ1YjNRZ1pHbHpkR2x1WjNWcGMyaGNiaTh2SUhKbGJHRjBhWFpsSUdGdVpDQmhZbk52YkhWMFpTQndZWFJvY3lsY2JtWjFibU4wYVc5dUlHNXZjbTFoYkdsNlpVRnljbUY1S0hCaGNuUnpMQ0JoYkd4dmQwRmliM1psVW05dmRDa2dlMXh1SUNBdkx5QnBaaUIwYUdVZ2NHRjBhQ0IwY21sbGN5QjBieUJuYnlCaFltOTJaU0IwYUdVZ2NtOXZkQ3dnWUhWd1lDQmxibVJ6SUhWd0lENGdNRnh1SUNCMllYSWdkWEFnUFNBd08xeHVJQ0JtYjNJZ0tIWmhjaUJwSUQwZ2NHRnlkSE11YkdWdVozUm9JQzBnTVRzZ2FTQStQU0F3T3lCcExTMHBJSHRjYmlBZ0lDQjJZWElnYkdGemRDQTlJSEJoY25SelcybGRPMXh1SUNBZ0lHbG1JQ2hzWVhOMElEMDlQU0FuTGljcElIdGNiaUFnSUNBZ0lIQmhjblJ6TG5Od2JHbGpaU2hwTENBeEtUdGNiaUFnSUNCOUlHVnNjMlVnYVdZZ0tHeGhjM1FnUFQwOUlDY3VMaWNwSUh0Y2JpQWdJQ0FnSUhCaGNuUnpMbk53YkdsalpTaHBMQ0F4S1R0Y2JpQWdJQ0FnSUhWd0t5czdYRzRnSUNBZ2ZTQmxiSE5sSUdsbUlDaDFjQ2tnZTF4dUlDQWdJQ0FnY0dGeWRITXVjM0JzYVdObEtHa3NJREVwTzF4dUlDQWdJQ0FnZFhBdExUdGNiaUFnSUNCOVhHNGdJSDFjYmx4dUlDQXZMeUJwWmlCMGFHVWdjR0YwYUNCcGN5QmhiR3h2ZDJWa0lIUnZJR2R2SUdGaWIzWmxJSFJvWlNCeWIyOTBMQ0J5WlhOMGIzSmxJR3hsWVdScGJtY2dMaTV6WEc0Z0lHbG1JQ2hoYkd4dmQwRmliM1psVW05dmRDa2dlMXh1SUNBZ0lHWnZjaUFvT3lCMWNDMHRPeUIxY0NrZ2UxeHVJQ0FnSUNBZ2NHRnlkSE11ZFc1emFHbG1kQ2duTGk0bktUdGNiaUFnSUNCOVhHNGdJSDFjYmx4dUlDQnlaWFIxY200Z2NHRnlkSE03WEc1OVhHNWNiaTh2SUZOd2JHbDBJR0VnWm1sc1pXNWhiV1VnYVc1MGJ5QmJjbTl2ZEN3Z1pHbHlMQ0JpWVhObGJtRnRaU3dnWlhoMFhTd2dkVzVwZUNCMlpYSnphVzl1WEc0dkx5QW5jbTl2ZENjZ2FYTWdhblZ6ZENCaElITnNZWE5vTENCdmNpQnViM1JvYVc1bkxseHVkbUZ5SUhOd2JHbDBVR0YwYUZKbElEMWNiaUFnSUNBdlhpaGNYQzgvZkNrb1cxeGNjMXhjVTEwcVB5a29LRDg2WEZ3dWV6RXNNbjE4VzE1Y1hDOWRLejk4S1NoY1hDNWJYaTVjWEM5ZEtud3BLU2cvT2x0Y1hDOWRLaWtrTHp0Y2JuWmhjaUJ6Y0d4cGRGQmhkR2dnUFNCbWRXNWpkR2x2YmlobWFXeGxibUZ0WlNrZ2UxeHVJQ0J5WlhSMWNtNGdjM0JzYVhSUVlYUm9VbVV1WlhobFl5aG1hV3hsYm1GdFpTa3VjMnhwWTJVb01TazdYRzU5TzF4dVhHNHZMeUJ3WVhSb0xuSmxjMjlzZG1Vb1cyWnliMjBnTGk0dVhTd2dkRzhwWEc0dkx5QndiM05wZUNCMlpYSnphVzl1WEc1bGVIQnZjblJ6TG5KbGMyOXNkbVVnUFNCbWRXNWpkR2x2YmlncElIdGNiaUFnZG1GeUlISmxjMjlzZG1Wa1VHRjBhQ0E5SUNjbkxGeHVJQ0FnSUNBZ2NtVnpiMngyWldSQlluTnZiSFYwWlNBOUlHWmhiSE5sTzF4dVhHNGdJR1p2Y2lBb2RtRnlJR2tnUFNCaGNtZDFiV1Z1ZEhNdWJHVnVaM1JvSUMwZ01Uc2dhU0ErUFNBdE1TQW1KaUFoY21WemIyeDJaV1JCWW5OdmJIVjBaVHNnYVMwdEtTQjdYRzRnSUNBZ2RtRnlJSEJoZEdnZ1BTQW9hU0ErUFNBd0tTQS9JR0Z5WjNWdFpXNTBjMXRwWFNBNklIQnliMk5sYzNNdVkzZGtLQ2s3WEc1Y2JpQWdJQ0F2THlCVGEybHdJR1Z0Y0hSNUlHRnVaQ0JwYm5aaGJHbGtJR1Z1ZEhKcFpYTmNiaUFnSUNCcFppQW9kSGx3Wlc5bUlIQmhkR2dnSVQwOUlDZHpkSEpwYm1jbktTQjdYRzRnSUNBZ0lDQjBhSEp2ZHlCdVpYY2dWSGx3WlVWeWNtOXlLQ2RCY21kMWJXVnVkSE1nZEc4Z2NHRjBhQzV5WlhOdmJIWmxJRzExYzNRZ1ltVWdjM1J5YVc1bmN5Y3BPMXh1SUNBZ0lIMGdaV3h6WlNCcFppQW9JWEJoZEdncElIdGNiaUFnSUNBZ0lHTnZiblJwYm5WbE8xeHVJQ0FnSUgxY2JseHVJQ0FnSUhKbGMyOXNkbVZrVUdGMGFDQTlJSEJoZEdnZ0t5QW5MeWNnS3lCeVpYTnZiSFpsWkZCaGRHZzdYRzRnSUNBZ2NtVnpiMngyWldSQlluTnZiSFYwWlNBOUlIQmhkR2d1WTJoaGNrRjBLREFwSUQwOVBTQW5MeWM3WEc0Z0lIMWNibHh1SUNBdkx5QkJkQ0IwYUdseklIQnZhVzUwSUhSb1pTQndZWFJvSUhOb2IzVnNaQ0JpWlNCeVpYTnZiSFpsWkNCMGJ5QmhJR1oxYkd3Z1lXSnpiMngxZEdVZ2NHRjBhQ3dnWW5WMFhHNGdJQzh2SUdoaGJtUnNaU0J5Wld4aGRHbDJaU0J3WVhSb2N5QjBieUJpWlNCellXWmxJQ2h0YVdkb2RDQm9ZWEJ3Wlc0Z2QyaGxiaUJ3Y205alpYTnpMbU4zWkNncElHWmhhV3h6S1Z4dVhHNGdJQzh2SUU1dmNtMWhiR2w2WlNCMGFHVWdjR0YwYUZ4dUlDQnlaWE52YkhabFpGQmhkR2dnUFNCdWIzSnRZV3hwZW1WQmNuSmhlU2htYVd4MFpYSW9jbVZ6YjJ4MlpXUlFZWFJvTG5Od2JHbDBLQ2N2Snlrc0lHWjFibU4wYVc5dUtIQXBJSHRjYmlBZ0lDQnlaWFIxY200Z0lTRndPMXh1SUNCOUtTd2dJWEpsYzI5c2RtVmtRV0p6YjJ4MWRHVXBMbXB2YVc0b0p5OG5LVHRjYmx4dUlDQnlaWFIxY200Z0tDaHlaWE52YkhabFpFRmljMjlzZFhSbElEOGdKeThuSURvZ0p5Y3BJQ3NnY21WemIyeDJaV1JRWVhSb0tTQjhmQ0FuTGljN1hHNTlPMXh1WEc0dkx5QndZWFJvTG01dmNtMWhiR2w2WlNod1lYUm9LVnh1THk4Z2NHOXphWGdnZG1WeWMybHZibHh1Wlhod2IzSjBjeTV1YjNKdFlXeHBlbVVnUFNCbWRXNWpkR2x2Ymlod1lYUm9LU0I3WEc0Z0lIWmhjaUJwYzBGaWMyOXNkWFJsSUQwZ1pYaHdiM0owY3k1cGMwRmljMjlzZFhSbEtIQmhkR2dwTEZ4dUlDQWdJQ0FnZEhKaGFXeHBibWRUYkdGemFDQTlJSE4xWW5OMGNpaHdZWFJvTENBdE1Ta2dQVDA5SUNjdkp6dGNibHh1SUNBdkx5Qk9iM0p0WVd4cGVtVWdkR2hsSUhCaGRHaGNiaUFnY0dGMGFDQTlJRzV2Y20xaGJHbDZaVUZ5Y21GNUtHWnBiSFJsY2lod1lYUm9Mbk53YkdsMEtDY3ZKeWtzSUdaMWJtTjBhVzl1S0hBcElIdGNiaUFnSUNCeVpYUjFjbTRnSVNGd08xeHVJQ0I5S1N3Z0lXbHpRV0p6YjJ4MWRHVXBMbXB2YVc0b0p5OG5LVHRjYmx4dUlDQnBaaUFvSVhCaGRHZ2dKaVlnSVdselFXSnpiMngxZEdVcElIdGNiaUFnSUNCd1lYUm9JRDBnSnk0bk8xeHVJQ0I5WEc0Z0lHbG1JQ2h3WVhSb0lDWW1JSFJ5WVdsc2FXNW5VMnhoYzJncElIdGNiaUFnSUNCd1lYUm9JQ3M5SUNjdkp6dGNiaUFnZlZ4dVhHNGdJSEpsZEhWeWJpQW9hWE5CWW5OdmJIVjBaU0EvSUNjdkp5QTZJQ2NuS1NBcklIQmhkR2c3WEc1OU8xeHVYRzR2THlCd2IzTnBlQ0IyWlhKemFXOXVYRzVsZUhCdmNuUnpMbWx6UVdKemIyeDFkR1VnUFNCbWRXNWpkR2x2Ymlod1lYUm9LU0I3WEc0Z0lISmxkSFZ5YmlCd1lYUm9MbU5vWVhKQmRDZ3dLU0E5UFQwZ0p5OG5PMXh1ZlR0Y2JseHVMeThnY0c5emFYZ2dkbVZ5YzJsdmJseHVaWGh3YjNKMGN5NXFiMmx1SUQwZ1puVnVZM1JwYjI0b0tTQjdYRzRnSUhaaGNpQndZWFJvY3lBOUlFRnljbUY1TG5CeWIzUnZkSGx3WlM1emJHbGpaUzVqWVd4c0tHRnlaM1Z0Wlc1MGN5d2dNQ2s3WEc0Z0lISmxkSFZ5YmlCbGVIQnZjblJ6TG01dmNtMWhiR2w2WlNobWFXeDBaWElvY0dGMGFITXNJR1oxYm1OMGFXOXVLSEFzSUdsdVpHVjRLU0I3WEc0Z0lDQWdhV1lnS0hSNWNHVnZaaUJ3SUNFOVBTQW5jM1J5YVc1bkp5a2dlMXh1SUNBZ0lDQWdkR2h5YjNjZ2JtVjNJRlI1Y0dWRmNuSnZjaWduUVhKbmRXMWxiblJ6SUhSdklIQmhkR2d1YW05cGJpQnRkWE4wSUdKbElITjBjbWx1WjNNbktUdGNiaUFnSUNCOVhHNGdJQ0FnY21WMGRYSnVJSEE3WEc0Z0lIMHBMbXB2YVc0b0p5OG5LU2s3WEc1OU8xeHVYRzVjYmk4dklIQmhkR2d1Y21Wc1lYUnBkbVVvWm5KdmJTd2dkRzhwWEc0dkx5QndiM05wZUNCMlpYSnphVzl1WEc1bGVIQnZjblJ6TG5KbGJHRjBhWFpsSUQwZ1puVnVZM1JwYjI0b1puSnZiU3dnZEc4cElIdGNiaUFnWm5KdmJTQTlJR1Y0Y0c5eWRITXVjbVZ6YjJ4MlpTaG1jbTl0S1M1emRXSnpkSElvTVNrN1hHNGdJSFJ2SUQwZ1pYaHdiM0owY3k1eVpYTnZiSFpsS0hSdktTNXpkV0p6ZEhJb01TazdYRzVjYmlBZ1puVnVZM1JwYjI0Z2RISnBiU2hoY25JcElIdGNiaUFnSUNCMllYSWdjM1JoY25RZ1BTQXdPMXh1SUNBZ0lHWnZjaUFvT3lCemRHRnlkQ0E4SUdGeWNpNXNaVzVuZEdnN0lITjBZWEowS3lzcElIdGNiaUFnSUNBZ0lHbG1JQ2hoY25KYmMzUmhjblJkSUNFOVBTQW5KeWtnWW5KbFlXczdYRzRnSUNBZ2ZWeHVYRzRnSUNBZ2RtRnlJR1Z1WkNBOUlHRnljaTVzWlc1bmRHZ2dMU0F4TzF4dUlDQWdJR1p2Y2lBb095QmxibVFnUGowZ01Ec2daVzVrTFMwcElIdGNiaUFnSUNBZ0lHbG1JQ2hoY25KYlpXNWtYU0FoUFQwZ0p5Y3BJR0p5WldGck8xeHVJQ0FnSUgxY2JseHVJQ0FnSUdsbUlDaHpkR0Z5ZENBK0lHVnVaQ2tnY21WMGRYSnVJRnRkTzF4dUlDQWdJSEpsZEhWeWJpQmhjbkl1YzJ4cFkyVW9jM1JoY25Rc0lHVnVaQ0F0SUhOMFlYSjBJQ3NnTVNrN1hHNGdJSDFjYmx4dUlDQjJZWElnWm5KdmJWQmhjblJ6SUQwZ2RISnBiU2htY205dExuTndiR2wwS0Njdkp5a3BPMXh1SUNCMllYSWdkRzlRWVhKMGN5QTlJSFJ5YVcwb2RHOHVjM0JzYVhRb0p5OG5LU2s3WEc1Y2JpQWdkbUZ5SUd4bGJtZDBhQ0E5SUUxaGRHZ3ViV2x1S0daeWIyMVFZWEowY3k1c1pXNW5kR2dzSUhSdlVHRnlkSE11YkdWdVozUm9LVHRjYmlBZ2RtRnlJSE5oYldWUVlYSjBjMHhsYm1kMGFDQTlJR3hsYm1kMGFEdGNiaUFnWm05eUlDaDJZWElnYVNBOUlEQTdJR2tnUENCc1pXNW5kR2c3SUdrckt5a2dlMXh1SUNBZ0lHbG1JQ2htY205dFVHRnlkSE5iYVYwZ0lUMDlJSFJ2VUdGeWRITmJhVjBwSUh0Y2JpQWdJQ0FnSUhOaGJXVlFZWEowYzB4bGJtZDBhQ0E5SUdrN1hHNGdJQ0FnSUNCaWNtVmhhenRjYmlBZ0lDQjlYRzRnSUgxY2JseHVJQ0IyWVhJZ2IzVjBjSFYwVUdGeWRITWdQU0JiWFR0Y2JpQWdabTl5SUNoMllYSWdhU0E5SUhOaGJXVlFZWEowYzB4bGJtZDBhRHNnYVNBOElHWnliMjFRWVhKMGN5NXNaVzVuZEdnN0lHa3JLeWtnZTF4dUlDQWdJRzkxZEhCMWRGQmhjblJ6TG5CMWMyZ29KeTR1SnlrN1hHNGdJSDFjYmx4dUlDQnZkWFJ3ZFhSUVlYSjBjeUE5SUc5MWRIQjFkRkJoY25SekxtTnZibU5oZENoMGIxQmhjblJ6TG5Oc2FXTmxLSE5oYldWUVlYSjBjMHhsYm1kMGFDa3BPMXh1WEc0Z0lISmxkSFZ5YmlCdmRYUndkWFJRWVhKMGN5NXFiMmx1S0Njdkp5azdYRzU5TzF4dVhHNWxlSEJ2Y25SekxuTmxjQ0E5SUNjdkp6dGNibVY0Y0c5eWRITXVaR1ZzYVcxcGRHVnlJRDBnSnpvbk8xeHVYRzVsZUhCdmNuUnpMbVJwY201aGJXVWdQU0JtZFc1amRHbHZiaWh3WVhSb0tTQjdYRzRnSUhaaGNpQnlaWE4xYkhRZ1BTQnpjR3hwZEZCaGRHZ29jR0YwYUNrc1hHNGdJQ0FnSUNCeWIyOTBJRDBnY21WemRXeDBXekJkTEZ4dUlDQWdJQ0FnWkdseUlEMGdjbVZ6ZFd4MFd6RmRPMXh1WEc0Z0lHbG1JQ2doY205dmRDQW1KaUFoWkdseUtTQjdYRzRnSUNBZ0x5OGdUbThnWkdseWJtRnRaU0IzYUdGMGMyOWxkbVZ5WEc0Z0lDQWdjbVYwZFhKdUlDY3VKenRjYmlBZ2ZWeHVYRzRnSUdsbUlDaGthWElwSUh0Y2JpQWdJQ0F2THlCSmRDQm9ZWE1nWVNCa2FYSnVZVzFsTENCemRISnBjQ0IwY21GcGJHbHVaeUJ6YkdGemFGeHVJQ0FnSUdScGNpQTlJR1JwY2k1emRXSnpkSElvTUN3Z1pHbHlMbXhsYm1kMGFDQXRJREVwTzF4dUlDQjlYRzVjYmlBZ2NtVjBkWEp1SUhKdmIzUWdLeUJrYVhJN1hHNTlPMXh1WEc1Y2JtVjRjRzl5ZEhNdVltRnpaVzVoYldVZ1BTQm1kVzVqZEdsdmJpaHdZWFJvTENCbGVIUXBJSHRjYmlBZ2RtRnlJR1lnUFNCemNHeHBkRkJoZEdnb2NHRjBhQ2xiTWwwN1hHNGdJQzh2SUZSUFJFODZJRzFoYTJVZ2RHaHBjeUJqYjIxd1lYSnBjMjl1SUdOaGMyVXRhVzV6Wlc1emFYUnBkbVVnYjI0Z2QybHVaRzkzY3o5Y2JpQWdhV1lnS0dWNGRDQW1KaUJtTG5OMVluTjBjaWd0TVNBcUlHVjRkQzVzWlc1bmRHZ3BJRDA5UFNCbGVIUXBJSHRjYmlBZ0lDQm1JRDBnWmk1emRXSnpkSElvTUN3Z1ppNXNaVzVuZEdnZ0xTQmxlSFF1YkdWdVozUm9LVHRjYmlBZ2ZWeHVJQ0J5WlhSMWNtNGdaanRjYm4wN1hHNWNibHh1Wlhod2IzSjBjeTVsZUhSdVlXMWxJRDBnWm5WdVkzUnBiMjRvY0dGMGFDa2dlMXh1SUNCeVpYUjFjbTRnYzNCc2FYUlFZWFJvS0hCaGRHZ3BXek5kTzF4dWZUdGNibHh1Wm5WdVkzUnBiMjRnWm1sc2RHVnlJQ2g0Y3l3Z1ppa2dlMXh1SUNBZ0lHbG1JQ2g0Y3k1bWFXeDBaWElwSUhKbGRIVnliaUI0Y3k1bWFXeDBaWElvWmlrN1hHNGdJQ0FnZG1GeUlISmxjeUE5SUZ0ZE8xeHVJQ0FnSUdadmNpQW9kbUZ5SUdrZ1BTQXdPeUJwSUR3Z2VITXViR1Z1WjNSb095QnBLeXNwSUh0Y2JpQWdJQ0FnSUNBZ2FXWWdLR1lvZUhOYmFWMHNJR2tzSUhoektTa2djbVZ6TG5CMWMyZ29lSE5iYVYwcE8xeHVJQ0FnSUgxY2JpQWdJQ0J5WlhSMWNtNGdjbVZ6TzF4dWZWeHVYRzR2THlCVGRISnBibWN1Y0hKdmRHOTBlWEJsTG5OMVluTjBjaUF0SUc1bFoyRjBhWFpsSUdsdVpHVjRJR1J2YmlkMElIZHZjbXNnYVc0Z1NVVTRYRzUyWVhJZ2MzVmljM1J5SUQwZ0oyRmlKeTV6ZFdKemRISW9MVEVwSUQwOVBTQW5ZaWRjYmlBZ0lDQS9JR1oxYm1OMGFXOXVJQ2h6ZEhJc0lITjBZWEowTENCc1pXNHBJSHNnY21WMGRYSnVJSE4wY2k1emRXSnpkSElvYzNSaGNuUXNJR3hsYmlrZ2ZWeHVJQ0FnSURvZ1puVnVZM1JwYjI0Z0tITjBjaXdnYzNSaGNuUXNJR3hsYmlrZ2UxeHVJQ0FnSUNBZ0lDQnBaaUFvYzNSaGNuUWdQQ0F3S1NCemRHRnlkQ0E5SUhOMGNpNXNaVzVuZEdnZ0t5QnpkR0Z5ZER0Y2JpQWdJQ0FnSUNBZ2NtVjBkWEp1SUhOMGNpNXpkV0p6ZEhJb2MzUmhjblFzSUd4bGJpazdYRzRnSUNBZ2ZWeHVPMXh1SWwxOSIsIi8vIHNoaW0gZm9yIHVzaW5nIHByb2Nlc3MgaW4gYnJvd3NlclxuXG52YXIgcHJvY2VzcyA9IG1vZHVsZS5leHBvcnRzID0ge307XG52YXIgcXVldWUgPSBbXTtcbnZhciBkcmFpbmluZyA9IGZhbHNlO1xuXG5mdW5jdGlvbiBkcmFpblF1ZXVlKCkge1xuICAgIGlmIChkcmFpbmluZykge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIGRyYWluaW5nID0gdHJ1ZTtcbiAgICB2YXIgY3VycmVudFF1ZXVlO1xuICAgIHZhciBsZW4gPSBxdWV1ZS5sZW5ndGg7XG4gICAgd2hpbGUobGVuKSB7XG4gICAgICAgIGN1cnJlbnRRdWV1ZSA9IHF1ZXVlO1xuICAgICAgICBxdWV1ZSA9IFtdO1xuICAgICAgICB2YXIgaSA9IC0xO1xuICAgICAgICB3aGlsZSAoKytpIDwgbGVuKSB7XG4gICAgICAgICAgICBjdXJyZW50UXVldWVbaV0oKTtcbiAgICAgICAgfVxuICAgICAgICBsZW4gPSBxdWV1ZS5sZW5ndGg7XG4gICAgfVxuICAgIGRyYWluaW5nID0gZmFsc2U7XG59XG5wcm9jZXNzLm5leHRUaWNrID0gZnVuY3Rpb24gKGZ1bikge1xuICAgIHF1ZXVlLnB1c2goZnVuKTtcbiAgICBpZiAoIWRyYWluaW5nKSB7XG4gICAgICAgIHNldFRpbWVvdXQoZHJhaW5RdWV1ZSwgMCk7XG4gICAgfVxufTtcblxucHJvY2Vzcy50aXRsZSA9ICdicm93c2VyJztcbnByb2Nlc3MuYnJvd3NlciA9IHRydWU7XG5wcm9jZXNzLmVudiA9IHt9O1xucHJvY2Vzcy5hcmd2ID0gW107XG5wcm9jZXNzLnZlcnNpb24gPSAnJzsgLy8gZW1wdHkgc3RyaW5nIHRvIGF2b2lkIHJlZ2V4cCBpc3N1ZXNcbnByb2Nlc3MudmVyc2lvbnMgPSB7fTtcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbnByb2Nlc3Mub24gPSBub29wO1xucHJvY2Vzcy5hZGRMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLm9uY2UgPSBub29wO1xucHJvY2Vzcy5vZmYgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUFsbExpc3RlbmVycyA9IG5vb3A7XG5wcm9jZXNzLmVtaXQgPSBub29wO1xuXG5wcm9jZXNzLmJpbmRpbmcgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5iaW5kaW5nIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5cbi8vIFRPRE8oc2h0eWxtYW4pXG5wcm9jZXNzLmN3ZCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICcvJyB9O1xucHJvY2Vzcy5jaGRpciA9IGZ1bmN0aW9uIChkaXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuY2hkaXIgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcbnByb2Nlc3MudW1hc2sgPSBmdW5jdGlvbigpIHsgcmV0dXJuIDA7IH07XG4iLCIoZnVuY3Rpb24gKGdsb2JhbCl7XG4vKiEgaHR0cDovL210aHMuYmUvcHVueWNvZGUgdjEuMi40IGJ5IEBtYXRoaWFzICovXG47KGZ1bmN0aW9uKHJvb3QpIHtcblxuXHQvKiogRGV0ZWN0IGZyZWUgdmFyaWFibGVzICovXG5cdHZhciBmcmVlRXhwb3J0cyA9IHR5cGVvZiBleHBvcnRzID09ICdvYmplY3QnICYmIGV4cG9ydHM7XG5cdHZhciBmcmVlTW9kdWxlID0gdHlwZW9mIG1vZHVsZSA9PSAnb2JqZWN0JyAmJiBtb2R1bGUgJiZcblx0XHRtb2R1bGUuZXhwb3J0cyA9PSBmcmVlRXhwb3J0cyAmJiBtb2R1bGU7XG5cdHZhciBmcmVlR2xvYmFsID0gdHlwZW9mIGdsb2JhbCA9PSAnb2JqZWN0JyAmJiBnbG9iYWw7XG5cdGlmIChmcmVlR2xvYmFsLmdsb2JhbCA9PT0gZnJlZUdsb2JhbCB8fCBmcmVlR2xvYmFsLndpbmRvdyA9PT0gZnJlZUdsb2JhbCkge1xuXHRcdHJvb3QgPSBmcmVlR2xvYmFsO1xuXHR9XG5cblx0LyoqXG5cdCAqIFRoZSBgcHVueWNvZGVgIG9iamVjdC5cblx0ICogQG5hbWUgcHVueWNvZGVcblx0ICogQHR5cGUgT2JqZWN0XG5cdCAqL1xuXHR2YXIgcHVueWNvZGUsXG5cblx0LyoqIEhpZ2hlc3QgcG9zaXRpdmUgc2lnbmVkIDMyLWJpdCBmbG9hdCB2YWx1ZSAqL1xuXHRtYXhJbnQgPSAyMTQ3NDgzNjQ3LCAvLyBha2EuIDB4N0ZGRkZGRkYgb3IgMl4zMS0xXG5cblx0LyoqIEJvb3RzdHJpbmcgcGFyYW1ldGVycyAqL1xuXHRiYXNlID0gMzYsXG5cdHRNaW4gPSAxLFxuXHR0TWF4ID0gMjYsXG5cdHNrZXcgPSAzOCxcblx0ZGFtcCA9IDcwMCxcblx0aW5pdGlhbEJpYXMgPSA3Mixcblx0aW5pdGlhbE4gPSAxMjgsIC8vIDB4ODBcblx0ZGVsaW1pdGVyID0gJy0nLCAvLyAnXFx4MkQnXG5cblx0LyoqIFJlZ3VsYXIgZXhwcmVzc2lvbnMgKi9cblx0cmVnZXhQdW55Y29kZSA9IC9eeG4tLS8sXG5cdHJlZ2V4Tm9uQVNDSUkgPSAvW14gLX5dLywgLy8gdW5wcmludGFibGUgQVNDSUkgY2hhcnMgKyBub24tQVNDSUkgY2hhcnNcblx0cmVnZXhTZXBhcmF0b3JzID0gL1xceDJFfFxcdTMwMDJ8XFx1RkYwRXxcXHVGRjYxL2csIC8vIFJGQyAzNDkwIHNlcGFyYXRvcnNcblxuXHQvKiogRXJyb3IgbWVzc2FnZXMgKi9cblx0ZXJyb3JzID0ge1xuXHRcdCdvdmVyZmxvdyc6ICdPdmVyZmxvdzogaW5wdXQgbmVlZHMgd2lkZXIgaW50ZWdlcnMgdG8gcHJvY2VzcycsXG5cdFx0J25vdC1iYXNpYyc6ICdJbGxlZ2FsIGlucHV0ID49IDB4ODAgKG5vdCBhIGJhc2ljIGNvZGUgcG9pbnQpJyxcblx0XHQnaW52YWxpZC1pbnB1dCc6ICdJbnZhbGlkIGlucHV0J1xuXHR9LFxuXG5cdC8qKiBDb252ZW5pZW5jZSBzaG9ydGN1dHMgKi9cblx0YmFzZU1pbnVzVE1pbiA9IGJhc2UgLSB0TWluLFxuXHRmbG9vciA9IE1hdGguZmxvb3IsXG5cdHN0cmluZ0Zyb21DaGFyQ29kZSA9IFN0cmluZy5mcm9tQ2hhckNvZGUsXG5cblx0LyoqIFRlbXBvcmFyeSB2YXJpYWJsZSAqL1xuXHRrZXk7XG5cblx0LyotLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSovXG5cblx0LyoqXG5cdCAqIEEgZ2VuZXJpYyBlcnJvciB1dGlsaXR5IGZ1bmN0aW9uLlxuXHQgKiBAcHJpdmF0ZVxuXHQgKiBAcGFyYW0ge1N0cmluZ30gdHlwZSBUaGUgZXJyb3IgdHlwZS5cblx0ICogQHJldHVybnMge0Vycm9yfSBUaHJvd3MgYSBgUmFuZ2VFcnJvcmAgd2l0aCB0aGUgYXBwbGljYWJsZSBlcnJvciBtZXNzYWdlLlxuXHQgKi9cblx0ZnVuY3Rpb24gZXJyb3IodHlwZSkge1xuXHRcdHRocm93IFJhbmdlRXJyb3IoZXJyb3JzW3R5cGVdKTtcblx0fVxuXG5cdC8qKlxuXHQgKiBBIGdlbmVyaWMgYEFycmF5I21hcGAgdXRpbGl0eSBmdW5jdGlvbi5cblx0ICogQHByaXZhdGVcblx0ICogQHBhcmFtIHtBcnJheX0gYXJyYXkgVGhlIGFycmF5IHRvIGl0ZXJhdGUgb3Zlci5cblx0ICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgVGhlIGZ1bmN0aW9uIHRoYXQgZ2V0cyBjYWxsZWQgZm9yIGV2ZXJ5IGFycmF5XG5cdCAqIGl0ZW0uXG5cdCAqIEByZXR1cm5zIHtBcnJheX0gQSBuZXcgYXJyYXkgb2YgdmFsdWVzIHJldHVybmVkIGJ5IHRoZSBjYWxsYmFjayBmdW5jdGlvbi5cblx0ICovXG5cdGZ1bmN0aW9uIG1hcChhcnJheSwgZm4pIHtcblx0XHR2YXIgbGVuZ3RoID0gYXJyYXkubGVuZ3RoO1xuXHRcdHdoaWxlIChsZW5ndGgtLSkge1xuXHRcdFx0YXJyYXlbbGVuZ3RoXSA9IGZuKGFycmF5W2xlbmd0aF0pO1xuXHRcdH1cblx0XHRyZXR1cm4gYXJyYXk7XG5cdH1cblxuXHQvKipcblx0ICogQSBzaW1wbGUgYEFycmF5I21hcGAtbGlrZSB3cmFwcGVyIHRvIHdvcmsgd2l0aCBkb21haW4gbmFtZSBzdHJpbmdzLlxuXHQgKiBAcHJpdmF0ZVxuXHQgKiBAcGFyYW0ge1N0cmluZ30gZG9tYWluIFRoZSBkb21haW4gbmFtZS5cblx0ICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgVGhlIGZ1bmN0aW9uIHRoYXQgZ2V0cyBjYWxsZWQgZm9yIGV2ZXJ5XG5cdCAqIGNoYXJhY3Rlci5cblx0ICogQHJldHVybnMge0FycmF5fSBBIG5ldyBzdHJpbmcgb2YgY2hhcmFjdGVycyByZXR1cm5lZCBieSB0aGUgY2FsbGJhY2tcblx0ICogZnVuY3Rpb24uXG5cdCAqL1xuXHRmdW5jdGlvbiBtYXBEb21haW4oc3RyaW5nLCBmbikge1xuXHRcdHJldHVybiBtYXAoc3RyaW5nLnNwbGl0KHJlZ2V4U2VwYXJhdG9ycyksIGZuKS5qb2luKCcuJyk7XG5cdH1cblxuXHQvKipcblx0ICogQ3JlYXRlcyBhbiBhcnJheSBjb250YWluaW5nIHRoZSBudW1lcmljIGNvZGUgcG9pbnRzIG9mIGVhY2ggVW5pY29kZVxuXHQgKiBjaGFyYWN0ZXIgaW4gdGhlIHN0cmluZy4gV2hpbGUgSmF2YVNjcmlwdCB1c2VzIFVDUy0yIGludGVybmFsbHksXG5cdCAqIHRoaXMgZnVuY3Rpb24gd2lsbCBjb252ZXJ0IGEgcGFpciBvZiBzdXJyb2dhdGUgaGFsdmVzIChlYWNoIG9mIHdoaWNoXG5cdCAqIFVDUy0yIGV4cG9zZXMgYXMgc2VwYXJhdGUgY2hhcmFjdGVycykgaW50byBhIHNpbmdsZSBjb2RlIHBvaW50LFxuXHQgKiBtYXRjaGluZyBVVEYtMTYuXG5cdCAqIEBzZWUgYHB1bnljb2RlLnVjczIuZW5jb2RlYFxuXHQgKiBAc2VlIDxodHRwOi8vbWF0aGlhc2J5bmVucy5iZS9ub3Rlcy9qYXZhc2NyaXB0LWVuY29kaW5nPlxuXHQgKiBAbWVtYmVyT2YgcHVueWNvZGUudWNzMlxuXHQgKiBAbmFtZSBkZWNvZGVcblx0ICogQHBhcmFtIHtTdHJpbmd9IHN0cmluZyBUaGUgVW5pY29kZSBpbnB1dCBzdHJpbmcgKFVDUy0yKS5cblx0ICogQHJldHVybnMge0FycmF5fSBUaGUgbmV3IGFycmF5IG9mIGNvZGUgcG9pbnRzLlxuXHQgKi9cblx0ZnVuY3Rpb24gdWNzMmRlY29kZShzdHJpbmcpIHtcblx0XHR2YXIgb3V0cHV0ID0gW10sXG5cdFx0ICAgIGNvdW50ZXIgPSAwLFxuXHRcdCAgICBsZW5ndGggPSBzdHJpbmcubGVuZ3RoLFxuXHRcdCAgICB2YWx1ZSxcblx0XHQgICAgZXh0cmE7XG5cdFx0d2hpbGUgKGNvdW50ZXIgPCBsZW5ndGgpIHtcblx0XHRcdHZhbHVlID0gc3RyaW5nLmNoYXJDb2RlQXQoY291bnRlcisrKTtcblx0XHRcdGlmICh2YWx1ZSA+PSAweEQ4MDAgJiYgdmFsdWUgPD0gMHhEQkZGICYmIGNvdW50ZXIgPCBsZW5ndGgpIHtcblx0XHRcdFx0Ly8gaGlnaCBzdXJyb2dhdGUsIGFuZCB0aGVyZSBpcyBhIG5leHQgY2hhcmFjdGVyXG5cdFx0XHRcdGV4dHJhID0gc3RyaW5nLmNoYXJDb2RlQXQoY291bnRlcisrKTtcblx0XHRcdFx0aWYgKChleHRyYSAmIDB4RkMwMCkgPT0gMHhEQzAwKSB7IC8vIGxvdyBzdXJyb2dhdGVcblx0XHRcdFx0XHRvdXRwdXQucHVzaCgoKHZhbHVlICYgMHgzRkYpIDw8IDEwKSArIChleHRyYSAmIDB4M0ZGKSArIDB4MTAwMDApO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdC8vIHVubWF0Y2hlZCBzdXJyb2dhdGU7IG9ubHkgYXBwZW5kIHRoaXMgY29kZSB1bml0LCBpbiBjYXNlIHRoZSBuZXh0XG5cdFx0XHRcdFx0Ly8gY29kZSB1bml0IGlzIHRoZSBoaWdoIHN1cnJvZ2F0ZSBvZiBhIHN1cnJvZ2F0ZSBwYWlyXG5cdFx0XHRcdFx0b3V0cHV0LnB1c2godmFsdWUpO1xuXHRcdFx0XHRcdGNvdW50ZXItLTtcblx0XHRcdFx0fVxuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0b3V0cHV0LnB1c2godmFsdWUpO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRyZXR1cm4gb3V0cHV0O1xuXHR9XG5cblx0LyoqXG5cdCAqIENyZWF0ZXMgYSBzdHJpbmcgYmFzZWQgb24gYW4gYXJyYXkgb2YgbnVtZXJpYyBjb2RlIHBvaW50cy5cblx0ICogQHNlZSBgcHVueWNvZGUudWNzMi5kZWNvZGVgXG5cdCAqIEBtZW1iZXJPZiBwdW55Y29kZS51Y3MyXG5cdCAqIEBuYW1lIGVuY29kZVxuXHQgKiBAcGFyYW0ge0FycmF5fSBjb2RlUG9pbnRzIFRoZSBhcnJheSBvZiBudW1lcmljIGNvZGUgcG9pbnRzLlxuXHQgKiBAcmV0dXJucyB7U3RyaW5nfSBUaGUgbmV3IFVuaWNvZGUgc3RyaW5nIChVQ1MtMikuXG5cdCAqL1xuXHRmdW5jdGlvbiB1Y3MyZW5jb2RlKGFycmF5KSB7XG5cdFx0cmV0dXJuIG1hcChhcnJheSwgZnVuY3Rpb24odmFsdWUpIHtcblx0XHRcdHZhciBvdXRwdXQgPSAnJztcblx0XHRcdGlmICh2YWx1ZSA+IDB4RkZGRikge1xuXHRcdFx0XHR2YWx1ZSAtPSAweDEwMDAwO1xuXHRcdFx0XHRvdXRwdXQgKz0gc3RyaW5nRnJvbUNoYXJDb2RlKHZhbHVlID4+PiAxMCAmIDB4M0ZGIHwgMHhEODAwKTtcblx0XHRcdFx0dmFsdWUgPSAweERDMDAgfCB2YWx1ZSAmIDB4M0ZGO1xuXHRcdFx0fVxuXHRcdFx0b3V0cHV0ICs9IHN0cmluZ0Zyb21DaGFyQ29kZSh2YWx1ZSk7XG5cdFx0XHRyZXR1cm4gb3V0cHV0O1xuXHRcdH0pLmpvaW4oJycpO1xuXHR9XG5cblx0LyoqXG5cdCAqIENvbnZlcnRzIGEgYmFzaWMgY29kZSBwb2ludCBpbnRvIGEgZGlnaXQvaW50ZWdlci5cblx0ICogQHNlZSBgZGlnaXRUb0Jhc2ljKClgXG5cdCAqIEBwcml2YXRlXG5cdCAqIEBwYXJhbSB7TnVtYmVyfSBjb2RlUG9pbnQgVGhlIGJhc2ljIG51bWVyaWMgY29kZSBwb2ludCB2YWx1ZS5cblx0ICogQHJldHVybnMge051bWJlcn0gVGhlIG51bWVyaWMgdmFsdWUgb2YgYSBiYXNpYyBjb2RlIHBvaW50IChmb3IgdXNlIGluXG5cdCAqIHJlcHJlc2VudGluZyBpbnRlZ2VycykgaW4gdGhlIHJhbmdlIGAwYCB0byBgYmFzZSAtIDFgLCBvciBgYmFzZWAgaWZcblx0ICogdGhlIGNvZGUgcG9pbnQgZG9lcyBub3QgcmVwcmVzZW50IGEgdmFsdWUuXG5cdCAqL1xuXHRmdW5jdGlvbiBiYXNpY1RvRGlnaXQoY29kZVBvaW50KSB7XG5cdFx0aWYgKGNvZGVQb2ludCAtIDQ4IDwgMTApIHtcblx0XHRcdHJldHVybiBjb2RlUG9pbnQgLSAyMjtcblx0XHR9XG5cdFx0aWYgKGNvZGVQb2ludCAtIDY1IDwgMjYpIHtcblx0XHRcdHJldHVybiBjb2RlUG9pbnQgLSA2NTtcblx0XHR9XG5cdFx0aWYgKGNvZGVQb2ludCAtIDk3IDwgMjYpIHtcblx0XHRcdHJldHVybiBjb2RlUG9pbnQgLSA5Nztcblx0XHR9XG5cdFx0cmV0dXJuIGJhc2U7XG5cdH1cblxuXHQvKipcblx0ICogQ29udmVydHMgYSBkaWdpdC9pbnRlZ2VyIGludG8gYSBiYXNpYyBjb2RlIHBvaW50LlxuXHQgKiBAc2VlIGBiYXNpY1RvRGlnaXQoKWBcblx0ICogQHByaXZhdGVcblx0ICogQHBhcmFtIHtOdW1iZXJ9IGRpZ2l0IFRoZSBudW1lcmljIHZhbHVlIG9mIGEgYmFzaWMgY29kZSBwb2ludC5cblx0ICogQHJldHVybnMge051bWJlcn0gVGhlIGJhc2ljIGNvZGUgcG9pbnQgd2hvc2UgdmFsdWUgKHdoZW4gdXNlZCBmb3Jcblx0ICogcmVwcmVzZW50aW5nIGludGVnZXJzKSBpcyBgZGlnaXRgLCB3aGljaCBuZWVkcyB0byBiZSBpbiB0aGUgcmFuZ2Vcblx0ICogYDBgIHRvIGBiYXNlIC0gMWAuIElmIGBmbGFnYCBpcyBub24temVybywgdGhlIHVwcGVyY2FzZSBmb3JtIGlzXG5cdCAqIHVzZWQ7IGVsc2UsIHRoZSBsb3dlcmNhc2UgZm9ybSBpcyB1c2VkLiBUaGUgYmVoYXZpb3IgaXMgdW5kZWZpbmVkXG5cdCAqIGlmIGBmbGFnYCBpcyBub24temVybyBhbmQgYGRpZ2l0YCBoYXMgbm8gdXBwZXJjYXNlIGZvcm0uXG5cdCAqL1xuXHRmdW5jdGlvbiBkaWdpdFRvQmFzaWMoZGlnaXQsIGZsYWcpIHtcblx0XHQvLyAgMC4uMjUgbWFwIHRvIEFTQ0lJIGEuLnogb3IgQS4uWlxuXHRcdC8vIDI2Li4zNSBtYXAgdG8gQVNDSUkgMC4uOVxuXHRcdHJldHVybiBkaWdpdCArIDIyICsgNzUgKiAoZGlnaXQgPCAyNikgLSAoKGZsYWcgIT0gMCkgPDwgNSk7XG5cdH1cblxuXHQvKipcblx0ICogQmlhcyBhZGFwdGF0aW9uIGZ1bmN0aW9uIGFzIHBlciBzZWN0aW9uIDMuNCBvZiBSRkMgMzQ5Mi5cblx0ICogaHR0cDovL3Rvb2xzLmlldGYub3JnL2h0bWwvcmZjMzQ5MiNzZWN0aW9uLTMuNFxuXHQgKiBAcHJpdmF0ZVxuXHQgKi9cblx0ZnVuY3Rpb24gYWRhcHQoZGVsdGEsIG51bVBvaW50cywgZmlyc3RUaW1lKSB7XG5cdFx0dmFyIGsgPSAwO1xuXHRcdGRlbHRhID0gZmlyc3RUaW1lID8gZmxvb3IoZGVsdGEgLyBkYW1wKSA6IGRlbHRhID4+IDE7XG5cdFx0ZGVsdGEgKz0gZmxvb3IoZGVsdGEgLyBudW1Qb2ludHMpO1xuXHRcdGZvciAoLyogbm8gaW5pdGlhbGl6YXRpb24gKi87IGRlbHRhID4gYmFzZU1pbnVzVE1pbiAqIHRNYXggPj4gMTsgayArPSBiYXNlKSB7XG5cdFx0XHRkZWx0YSA9IGZsb29yKGRlbHRhIC8gYmFzZU1pbnVzVE1pbik7XG5cdFx0fVxuXHRcdHJldHVybiBmbG9vcihrICsgKGJhc2VNaW51c1RNaW4gKyAxKSAqIGRlbHRhIC8gKGRlbHRhICsgc2tldykpO1xuXHR9XG5cblx0LyoqXG5cdCAqIENvbnZlcnRzIGEgUHVueWNvZGUgc3RyaW5nIG9mIEFTQ0lJLW9ubHkgc3ltYm9scyB0byBhIHN0cmluZyBvZiBVbmljb2RlXG5cdCAqIHN5bWJvbHMuXG5cdCAqIEBtZW1iZXJPZiBwdW55Y29kZVxuXHQgKiBAcGFyYW0ge1N0cmluZ30gaW5wdXQgVGhlIFB1bnljb2RlIHN0cmluZyBvZiBBU0NJSS1vbmx5IHN5bWJvbHMuXG5cdCAqIEByZXR1cm5zIHtTdHJpbmd9IFRoZSByZXN1bHRpbmcgc3RyaW5nIG9mIFVuaWNvZGUgc3ltYm9scy5cblx0ICovXG5cdGZ1bmN0aW9uIGRlY29kZShpbnB1dCkge1xuXHRcdC8vIERvbid0IHVzZSBVQ1MtMlxuXHRcdHZhciBvdXRwdXQgPSBbXSxcblx0XHQgICAgaW5wdXRMZW5ndGggPSBpbnB1dC5sZW5ndGgsXG5cdFx0ICAgIG91dCxcblx0XHQgICAgaSA9IDAsXG5cdFx0ICAgIG4gPSBpbml0aWFsTixcblx0XHQgICAgYmlhcyA9IGluaXRpYWxCaWFzLFxuXHRcdCAgICBiYXNpYyxcblx0XHQgICAgaixcblx0XHQgICAgaW5kZXgsXG5cdFx0ICAgIG9sZGksXG5cdFx0ICAgIHcsXG5cdFx0ICAgIGssXG5cdFx0ICAgIGRpZ2l0LFxuXHRcdCAgICB0LFxuXHRcdCAgICAvKiogQ2FjaGVkIGNhbGN1bGF0aW9uIHJlc3VsdHMgKi9cblx0XHQgICAgYmFzZU1pbnVzVDtcblxuXHRcdC8vIEhhbmRsZSB0aGUgYmFzaWMgY29kZSBwb2ludHM6IGxldCBgYmFzaWNgIGJlIHRoZSBudW1iZXIgb2YgaW5wdXQgY29kZVxuXHRcdC8vIHBvaW50cyBiZWZvcmUgdGhlIGxhc3QgZGVsaW1pdGVyLCBvciBgMGAgaWYgdGhlcmUgaXMgbm9uZSwgdGhlbiBjb3B5XG5cdFx0Ly8gdGhlIGZpcnN0IGJhc2ljIGNvZGUgcG9pbnRzIHRvIHRoZSBvdXRwdXQuXG5cblx0XHRiYXNpYyA9IGlucHV0Lmxhc3RJbmRleE9mKGRlbGltaXRlcik7XG5cdFx0aWYgKGJhc2ljIDwgMCkge1xuXHRcdFx0YmFzaWMgPSAwO1xuXHRcdH1cblxuXHRcdGZvciAoaiA9IDA7IGogPCBiYXNpYzsgKytqKSB7XG5cdFx0XHQvLyBpZiBpdCdzIG5vdCBhIGJhc2ljIGNvZGUgcG9pbnRcblx0XHRcdGlmIChpbnB1dC5jaGFyQ29kZUF0KGopID49IDB4ODApIHtcblx0XHRcdFx0ZXJyb3IoJ25vdC1iYXNpYycpO1xuXHRcdFx0fVxuXHRcdFx0b3V0cHV0LnB1c2goaW5wdXQuY2hhckNvZGVBdChqKSk7XG5cdFx0fVxuXG5cdFx0Ly8gTWFpbiBkZWNvZGluZyBsb29wOiBzdGFydCBqdXN0IGFmdGVyIHRoZSBsYXN0IGRlbGltaXRlciBpZiBhbnkgYmFzaWMgY29kZVxuXHRcdC8vIHBvaW50cyB3ZXJlIGNvcGllZDsgc3RhcnQgYXQgdGhlIGJlZ2lubmluZyBvdGhlcndpc2UuXG5cblx0XHRmb3IgKGluZGV4ID0gYmFzaWMgPiAwID8gYmFzaWMgKyAxIDogMDsgaW5kZXggPCBpbnB1dExlbmd0aDsgLyogbm8gZmluYWwgZXhwcmVzc2lvbiAqLykge1xuXG5cdFx0XHQvLyBgaW5kZXhgIGlzIHRoZSBpbmRleCBvZiB0aGUgbmV4dCBjaGFyYWN0ZXIgdG8gYmUgY29uc3VtZWQuXG5cdFx0XHQvLyBEZWNvZGUgYSBnZW5lcmFsaXplZCB2YXJpYWJsZS1sZW5ndGggaW50ZWdlciBpbnRvIGBkZWx0YWAsXG5cdFx0XHQvLyB3aGljaCBnZXRzIGFkZGVkIHRvIGBpYC4gVGhlIG92ZXJmbG93IGNoZWNraW5nIGlzIGVhc2llclxuXHRcdFx0Ly8gaWYgd2UgaW5jcmVhc2UgYGlgIGFzIHdlIGdvLCB0aGVuIHN1YnRyYWN0IG9mZiBpdHMgc3RhcnRpbmdcblx0XHRcdC8vIHZhbHVlIGF0IHRoZSBlbmQgdG8gb2J0YWluIGBkZWx0YWAuXG5cdFx0XHRmb3IgKG9sZGkgPSBpLCB3ID0gMSwgayA9IGJhc2U7IC8qIG5vIGNvbmRpdGlvbiAqLzsgayArPSBiYXNlKSB7XG5cblx0XHRcdFx0aWYgKGluZGV4ID49IGlucHV0TGVuZ3RoKSB7XG5cdFx0XHRcdFx0ZXJyb3IoJ2ludmFsaWQtaW5wdXQnKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGRpZ2l0ID0gYmFzaWNUb0RpZ2l0KGlucHV0LmNoYXJDb2RlQXQoaW5kZXgrKykpO1xuXG5cdFx0XHRcdGlmIChkaWdpdCA+PSBiYXNlIHx8IGRpZ2l0ID4gZmxvb3IoKG1heEludCAtIGkpIC8gdykpIHtcblx0XHRcdFx0XHRlcnJvcignb3ZlcmZsb3cnKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGkgKz0gZGlnaXQgKiB3O1xuXHRcdFx0XHR0ID0gayA8PSBiaWFzID8gdE1pbiA6IChrID49IGJpYXMgKyB0TWF4ID8gdE1heCA6IGsgLSBiaWFzKTtcblxuXHRcdFx0XHRpZiAoZGlnaXQgPCB0KSB7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRiYXNlTWludXNUID0gYmFzZSAtIHQ7XG5cdFx0XHRcdGlmICh3ID4gZmxvb3IobWF4SW50IC8gYmFzZU1pbnVzVCkpIHtcblx0XHRcdFx0XHRlcnJvcignb3ZlcmZsb3cnKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdHcgKj0gYmFzZU1pbnVzVDtcblxuXHRcdFx0fVxuXG5cdFx0XHRvdXQgPSBvdXRwdXQubGVuZ3RoICsgMTtcblx0XHRcdGJpYXMgPSBhZGFwdChpIC0gb2xkaSwgb3V0LCBvbGRpID09IDApO1xuXG5cdFx0XHQvLyBgaWAgd2FzIHN1cHBvc2VkIHRvIHdyYXAgYXJvdW5kIGZyb20gYG91dGAgdG8gYDBgLFxuXHRcdFx0Ly8gaW5jcmVtZW50aW5nIGBuYCBlYWNoIHRpbWUsIHNvIHdlJ2xsIGZpeCB0aGF0IG5vdzpcblx0XHRcdGlmIChmbG9vcihpIC8gb3V0KSA+IG1heEludCAtIG4pIHtcblx0XHRcdFx0ZXJyb3IoJ292ZXJmbG93Jyk7XG5cdFx0XHR9XG5cblx0XHRcdG4gKz0gZmxvb3IoaSAvIG91dCk7XG5cdFx0XHRpICU9IG91dDtcblxuXHRcdFx0Ly8gSW5zZXJ0IGBuYCBhdCBwb3NpdGlvbiBgaWAgb2YgdGhlIG91dHB1dFxuXHRcdFx0b3V0cHV0LnNwbGljZShpKyssIDAsIG4pO1xuXG5cdFx0fVxuXG5cdFx0cmV0dXJuIHVjczJlbmNvZGUob3V0cHV0KTtcblx0fVxuXG5cdC8qKlxuXHQgKiBDb252ZXJ0cyBhIHN0cmluZyBvZiBVbmljb2RlIHN5bWJvbHMgdG8gYSBQdW55Y29kZSBzdHJpbmcgb2YgQVNDSUktb25seVxuXHQgKiBzeW1ib2xzLlxuXHQgKiBAbWVtYmVyT2YgcHVueWNvZGVcblx0ICogQHBhcmFtIHtTdHJpbmd9IGlucHV0IFRoZSBzdHJpbmcgb2YgVW5pY29kZSBzeW1ib2xzLlxuXHQgKiBAcmV0dXJucyB7U3RyaW5nfSBUaGUgcmVzdWx0aW5nIFB1bnljb2RlIHN0cmluZyBvZiBBU0NJSS1vbmx5IHN5bWJvbHMuXG5cdCAqL1xuXHRmdW5jdGlvbiBlbmNvZGUoaW5wdXQpIHtcblx0XHR2YXIgbixcblx0XHQgICAgZGVsdGEsXG5cdFx0ICAgIGhhbmRsZWRDUENvdW50LFxuXHRcdCAgICBiYXNpY0xlbmd0aCxcblx0XHQgICAgYmlhcyxcblx0XHQgICAgaixcblx0XHQgICAgbSxcblx0XHQgICAgcSxcblx0XHQgICAgayxcblx0XHQgICAgdCxcblx0XHQgICAgY3VycmVudFZhbHVlLFxuXHRcdCAgICBvdXRwdXQgPSBbXSxcblx0XHQgICAgLyoqIGBpbnB1dExlbmd0aGAgd2lsbCBob2xkIHRoZSBudW1iZXIgb2YgY29kZSBwb2ludHMgaW4gYGlucHV0YC4gKi9cblx0XHQgICAgaW5wdXRMZW5ndGgsXG5cdFx0ICAgIC8qKiBDYWNoZWQgY2FsY3VsYXRpb24gcmVzdWx0cyAqL1xuXHRcdCAgICBoYW5kbGVkQ1BDb3VudFBsdXNPbmUsXG5cdFx0ICAgIGJhc2VNaW51c1QsXG5cdFx0ICAgIHFNaW51c1Q7XG5cblx0XHQvLyBDb252ZXJ0IHRoZSBpbnB1dCBpbiBVQ1MtMiB0byBVbmljb2RlXG5cdFx0aW5wdXQgPSB1Y3MyZGVjb2RlKGlucHV0KTtcblxuXHRcdC8vIENhY2hlIHRoZSBsZW5ndGhcblx0XHRpbnB1dExlbmd0aCA9IGlucHV0Lmxlbmd0aDtcblxuXHRcdC8vIEluaXRpYWxpemUgdGhlIHN0YXRlXG5cdFx0biA9IGluaXRpYWxOO1xuXHRcdGRlbHRhID0gMDtcblx0XHRiaWFzID0gaW5pdGlhbEJpYXM7XG5cblx0XHQvLyBIYW5kbGUgdGhlIGJhc2ljIGNvZGUgcG9pbnRzXG5cdFx0Zm9yIChqID0gMDsgaiA8IGlucHV0TGVuZ3RoOyArK2opIHtcblx0XHRcdGN1cnJlbnRWYWx1ZSA9IGlucHV0W2pdO1xuXHRcdFx0aWYgKGN1cnJlbnRWYWx1ZSA8IDB4ODApIHtcblx0XHRcdFx0b3V0cHV0LnB1c2goc3RyaW5nRnJvbUNoYXJDb2RlKGN1cnJlbnRWYWx1ZSkpO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGhhbmRsZWRDUENvdW50ID0gYmFzaWNMZW5ndGggPSBvdXRwdXQubGVuZ3RoO1xuXG5cdFx0Ly8gYGhhbmRsZWRDUENvdW50YCBpcyB0aGUgbnVtYmVyIG9mIGNvZGUgcG9pbnRzIHRoYXQgaGF2ZSBiZWVuIGhhbmRsZWQ7XG5cdFx0Ly8gYGJhc2ljTGVuZ3RoYCBpcyB0aGUgbnVtYmVyIG9mIGJhc2ljIGNvZGUgcG9pbnRzLlxuXG5cdFx0Ly8gRmluaXNoIHRoZSBiYXNpYyBzdHJpbmcgLSBpZiBpdCBpcyBub3QgZW1wdHkgLSB3aXRoIGEgZGVsaW1pdGVyXG5cdFx0aWYgKGJhc2ljTGVuZ3RoKSB7XG5cdFx0XHRvdXRwdXQucHVzaChkZWxpbWl0ZXIpO1xuXHRcdH1cblxuXHRcdC8vIE1haW4gZW5jb2RpbmcgbG9vcDpcblx0XHR3aGlsZSAoaGFuZGxlZENQQ291bnQgPCBpbnB1dExlbmd0aCkge1xuXG5cdFx0XHQvLyBBbGwgbm9uLWJhc2ljIGNvZGUgcG9pbnRzIDwgbiBoYXZlIGJlZW4gaGFuZGxlZCBhbHJlYWR5LiBGaW5kIHRoZSBuZXh0XG5cdFx0XHQvLyBsYXJnZXIgb25lOlxuXHRcdFx0Zm9yIChtID0gbWF4SW50LCBqID0gMDsgaiA8IGlucHV0TGVuZ3RoOyArK2opIHtcblx0XHRcdFx0Y3VycmVudFZhbHVlID0gaW5wdXRbal07XG5cdFx0XHRcdGlmIChjdXJyZW50VmFsdWUgPj0gbiAmJiBjdXJyZW50VmFsdWUgPCBtKSB7XG5cdFx0XHRcdFx0bSA9IGN1cnJlbnRWYWx1ZTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHQvLyBJbmNyZWFzZSBgZGVsdGFgIGVub3VnaCB0byBhZHZhbmNlIHRoZSBkZWNvZGVyJ3MgPG4saT4gc3RhdGUgdG8gPG0sMD4sXG5cdFx0XHQvLyBidXQgZ3VhcmQgYWdhaW5zdCBvdmVyZmxvd1xuXHRcdFx0aGFuZGxlZENQQ291bnRQbHVzT25lID0gaGFuZGxlZENQQ291bnQgKyAxO1xuXHRcdFx0aWYgKG0gLSBuID4gZmxvb3IoKG1heEludCAtIGRlbHRhKSAvIGhhbmRsZWRDUENvdW50UGx1c09uZSkpIHtcblx0XHRcdFx0ZXJyb3IoJ292ZXJmbG93Jyk7XG5cdFx0XHR9XG5cblx0XHRcdGRlbHRhICs9IChtIC0gbikgKiBoYW5kbGVkQ1BDb3VudFBsdXNPbmU7XG5cdFx0XHRuID0gbTtcblxuXHRcdFx0Zm9yIChqID0gMDsgaiA8IGlucHV0TGVuZ3RoOyArK2opIHtcblx0XHRcdFx0Y3VycmVudFZhbHVlID0gaW5wdXRbal07XG5cblx0XHRcdFx0aWYgKGN1cnJlbnRWYWx1ZSA8IG4gJiYgKytkZWx0YSA+IG1heEludCkge1xuXHRcdFx0XHRcdGVycm9yKCdvdmVyZmxvdycpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0aWYgKGN1cnJlbnRWYWx1ZSA9PSBuKSB7XG5cdFx0XHRcdFx0Ly8gUmVwcmVzZW50IGRlbHRhIGFzIGEgZ2VuZXJhbGl6ZWQgdmFyaWFibGUtbGVuZ3RoIGludGVnZXJcblx0XHRcdFx0XHRmb3IgKHEgPSBkZWx0YSwgayA9IGJhc2U7IC8qIG5vIGNvbmRpdGlvbiAqLzsgayArPSBiYXNlKSB7XG5cdFx0XHRcdFx0XHR0ID0gayA8PSBiaWFzID8gdE1pbiA6IChrID49IGJpYXMgKyB0TWF4ID8gdE1heCA6IGsgLSBiaWFzKTtcblx0XHRcdFx0XHRcdGlmIChxIDwgdCkge1xuXHRcdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdHFNaW51c1QgPSBxIC0gdDtcblx0XHRcdFx0XHRcdGJhc2VNaW51c1QgPSBiYXNlIC0gdDtcblx0XHRcdFx0XHRcdG91dHB1dC5wdXNoKFxuXHRcdFx0XHRcdFx0XHRzdHJpbmdGcm9tQ2hhckNvZGUoZGlnaXRUb0Jhc2ljKHQgKyBxTWludXNUICUgYmFzZU1pbnVzVCwgMCkpXG5cdFx0XHRcdFx0XHQpO1xuXHRcdFx0XHRcdFx0cSA9IGZsb29yKHFNaW51c1QgLyBiYXNlTWludXNUKTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRvdXRwdXQucHVzaChzdHJpbmdGcm9tQ2hhckNvZGUoZGlnaXRUb0Jhc2ljKHEsIDApKSk7XG5cdFx0XHRcdFx0YmlhcyA9IGFkYXB0KGRlbHRhLCBoYW5kbGVkQ1BDb3VudFBsdXNPbmUsIGhhbmRsZWRDUENvdW50ID09IGJhc2ljTGVuZ3RoKTtcblx0XHRcdFx0XHRkZWx0YSA9IDA7XG5cdFx0XHRcdFx0KytoYW5kbGVkQ1BDb3VudDtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHQrK2RlbHRhO1xuXHRcdFx0KytuO1xuXG5cdFx0fVxuXHRcdHJldHVybiBvdXRwdXQuam9pbignJyk7XG5cdH1cblxuXHQvKipcblx0ICogQ29udmVydHMgYSBQdW55Y29kZSBzdHJpbmcgcmVwcmVzZW50aW5nIGEgZG9tYWluIG5hbWUgdG8gVW5pY29kZS4gT25seSB0aGVcblx0ICogUHVueWNvZGVkIHBhcnRzIG9mIHRoZSBkb21haW4gbmFtZSB3aWxsIGJlIGNvbnZlcnRlZCwgaS5lLiBpdCBkb2Vzbid0XG5cdCAqIG1hdHRlciBpZiB5b3UgY2FsbCBpdCBvbiBhIHN0cmluZyB0aGF0IGhhcyBhbHJlYWR5IGJlZW4gY29udmVydGVkIHRvXG5cdCAqIFVuaWNvZGUuXG5cdCAqIEBtZW1iZXJPZiBwdW55Y29kZVxuXHQgKiBAcGFyYW0ge1N0cmluZ30gZG9tYWluIFRoZSBQdW55Y29kZSBkb21haW4gbmFtZSB0byBjb252ZXJ0IHRvIFVuaWNvZGUuXG5cdCAqIEByZXR1cm5zIHtTdHJpbmd9IFRoZSBVbmljb2RlIHJlcHJlc2VudGF0aW9uIG9mIHRoZSBnaXZlbiBQdW55Y29kZVxuXHQgKiBzdHJpbmcuXG5cdCAqL1xuXHRmdW5jdGlvbiB0b1VuaWNvZGUoZG9tYWluKSB7XG5cdFx0cmV0dXJuIG1hcERvbWFpbihkb21haW4sIGZ1bmN0aW9uKHN0cmluZykge1xuXHRcdFx0cmV0dXJuIHJlZ2V4UHVueWNvZGUudGVzdChzdHJpbmcpXG5cdFx0XHRcdD8gZGVjb2RlKHN0cmluZy5zbGljZSg0KS50b0xvd2VyQ2FzZSgpKVxuXHRcdFx0XHQ6IHN0cmluZztcblx0XHR9KTtcblx0fVxuXG5cdC8qKlxuXHQgKiBDb252ZXJ0cyBhIFVuaWNvZGUgc3RyaW5nIHJlcHJlc2VudGluZyBhIGRvbWFpbiBuYW1lIHRvIFB1bnljb2RlLiBPbmx5IHRoZVxuXHQgKiBub24tQVNDSUkgcGFydHMgb2YgdGhlIGRvbWFpbiBuYW1lIHdpbGwgYmUgY29udmVydGVkLCBpLmUuIGl0IGRvZXNuJ3Rcblx0ICogbWF0dGVyIGlmIHlvdSBjYWxsIGl0IHdpdGggYSBkb21haW4gdGhhdCdzIGFscmVhZHkgaW4gQVNDSUkuXG5cdCAqIEBtZW1iZXJPZiBwdW55Y29kZVxuXHQgKiBAcGFyYW0ge1N0cmluZ30gZG9tYWluIFRoZSBkb21haW4gbmFtZSB0byBjb252ZXJ0LCBhcyBhIFVuaWNvZGUgc3RyaW5nLlxuXHQgKiBAcmV0dXJucyB7U3RyaW5nfSBUaGUgUHVueWNvZGUgcmVwcmVzZW50YXRpb24gb2YgdGhlIGdpdmVuIGRvbWFpbiBuYW1lLlxuXHQgKi9cblx0ZnVuY3Rpb24gdG9BU0NJSShkb21haW4pIHtcblx0XHRyZXR1cm4gbWFwRG9tYWluKGRvbWFpbiwgZnVuY3Rpb24oc3RyaW5nKSB7XG5cdFx0XHRyZXR1cm4gcmVnZXhOb25BU0NJSS50ZXN0KHN0cmluZylcblx0XHRcdFx0PyAneG4tLScgKyBlbmNvZGUoc3RyaW5nKVxuXHRcdFx0XHQ6IHN0cmluZztcblx0XHR9KTtcblx0fVxuXG5cdC8qLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qL1xuXG5cdC8qKiBEZWZpbmUgdGhlIHB1YmxpYyBBUEkgKi9cblx0cHVueWNvZGUgPSB7XG5cdFx0LyoqXG5cdFx0ICogQSBzdHJpbmcgcmVwcmVzZW50aW5nIHRoZSBjdXJyZW50IFB1bnljb2RlLmpzIHZlcnNpb24gbnVtYmVyLlxuXHRcdCAqIEBtZW1iZXJPZiBwdW55Y29kZVxuXHRcdCAqIEB0eXBlIFN0cmluZ1xuXHRcdCAqL1xuXHRcdCd2ZXJzaW9uJzogJzEuMi40Jyxcblx0XHQvKipcblx0XHQgKiBBbiBvYmplY3Qgb2YgbWV0aG9kcyB0byBjb252ZXJ0IGZyb20gSmF2YVNjcmlwdCdzIGludGVybmFsIGNoYXJhY3RlclxuXHRcdCAqIHJlcHJlc2VudGF0aW9uIChVQ1MtMikgdG8gVW5pY29kZSBjb2RlIHBvaW50cywgYW5kIGJhY2suXG5cdFx0ICogQHNlZSA8aHR0cDovL21hdGhpYXNieW5lbnMuYmUvbm90ZXMvamF2YXNjcmlwdC1lbmNvZGluZz5cblx0XHQgKiBAbWVtYmVyT2YgcHVueWNvZGVcblx0XHQgKiBAdHlwZSBPYmplY3Rcblx0XHQgKi9cblx0XHQndWNzMic6IHtcblx0XHRcdCdkZWNvZGUnOiB1Y3MyZGVjb2RlLFxuXHRcdFx0J2VuY29kZSc6IHVjczJlbmNvZGVcblx0XHR9LFxuXHRcdCdkZWNvZGUnOiBkZWNvZGUsXG5cdFx0J2VuY29kZSc6IGVuY29kZSxcblx0XHQndG9BU0NJSSc6IHRvQVNDSUksXG5cdFx0J3RvVW5pY29kZSc6IHRvVW5pY29kZVxuXHR9O1xuXG5cdC8qKiBFeHBvc2UgYHB1bnljb2RlYCAqL1xuXHQvLyBTb21lIEFNRCBidWlsZCBvcHRpbWl6ZXJzLCBsaWtlIHIuanMsIGNoZWNrIGZvciBzcGVjaWZpYyBjb25kaXRpb24gcGF0dGVybnNcblx0Ly8gbGlrZSB0aGUgZm9sbG93aW5nOlxuXHRpZiAoXG5cdFx0dHlwZW9mIGRlZmluZSA9PSAnZnVuY3Rpb24nICYmXG5cdFx0dHlwZW9mIGRlZmluZS5hbWQgPT0gJ29iamVjdCcgJiZcblx0XHRkZWZpbmUuYW1kXG5cdCkge1xuXHRcdGRlZmluZSgncHVueWNvZGUnLCBmdW5jdGlvbigpIHtcblx0XHRcdHJldHVybiBwdW55Y29kZTtcblx0XHR9KTtcblx0fSBlbHNlIGlmIChmcmVlRXhwb3J0cyAmJiAhZnJlZUV4cG9ydHMubm9kZVR5cGUpIHtcblx0XHRpZiAoZnJlZU1vZHVsZSkgeyAvLyBpbiBOb2RlLmpzIG9yIFJpbmdvSlMgdjAuOC4wK1xuXHRcdFx0ZnJlZU1vZHVsZS5leHBvcnRzID0gcHVueWNvZGU7XG5cdFx0fSBlbHNlIHsgLy8gaW4gTmFyd2hhbCBvciBSaW5nb0pTIHYwLjcuMC1cblx0XHRcdGZvciAoa2V5IGluIHB1bnljb2RlKSB7XG5cdFx0XHRcdHB1bnljb2RlLmhhc093blByb3BlcnR5KGtleSkgJiYgKGZyZWVFeHBvcnRzW2tleV0gPSBwdW55Y29kZVtrZXldKTtcblx0XHRcdH1cblx0XHR9XG5cdH0gZWxzZSB7IC8vIGluIFJoaW5vIG9yIGEgd2ViIGJyb3dzZXJcblx0XHRyb290LnB1bnljb2RlID0gcHVueWNvZGU7XG5cdH1cblxufSh0aGlzKSk7XG5cbn0pLmNhbGwodGhpcyx0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsIDogdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KVxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9ZGF0YTphcHBsaWNhdGlvbi9qc29uO2NoYXJzZXQ6dXRmLTg7YmFzZTY0LGV5SjJaWEp6YVc5dUlqb3pMQ0p6YjNWeVkyVnpJanBiSWk0dUx5NHVMeTR1THk0dUwxSmxjRzl6YVhSdmNtbGxjeTluWlhOemJ5NXFjeTl1YjJSbFgyMXZaSFZzWlhNdmNIVnVlV052WkdVdmNIVnVlV052WkdVdWFuTWlYU3dpYm1GdFpYTWlPbHRkTENKdFlYQndhVzVuY3lJNklqdEJRVUZCTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJJaXdpWm1sc1pTSTZJbWRsYm1WeVlYUmxaQzVxY3lJc0luTnZkWEpqWlZKdmIzUWlPaUlpTENKemIzVnlZMlZ6UTI5dWRHVnVkQ0k2V3lJdktpRWdhSFIwY0RvdkwyMTBhSE11WW1VdmNIVnVlV052WkdVZ2RqRXVNaTQwSUdKNUlFQnRZWFJvYVdGeklDb3ZYRzQ3S0daMWJtTjBhVzl1S0hKdmIzUXBJSHRjYmx4dVhIUXZLaW9nUkdWMFpXTjBJR1p5WldVZ2RtRnlhV0ZpYkdWeklDb3ZYRzVjZEhaaGNpQm1jbVZsUlhod2IzSjBjeUE5SUhSNWNHVnZaaUJsZUhCdmNuUnpJRDA5SUNkdlltcGxZM1FuSUNZbUlHVjRjRzl5ZEhNN1hHNWNkSFpoY2lCbWNtVmxUVzlrZFd4bElEMGdkSGx3Wlc5bUlHMXZaSFZzWlNBOVBTQW5iMkpxWldOMEp5QW1KaUJ0YjJSMWJHVWdKaVpjYmx4MFhIUnRiMlIxYkdVdVpYaHdiM0owY3lBOVBTQm1jbVZsUlhod2IzSjBjeUFtSmlCdGIyUjFiR1U3WEc1Y2RIWmhjaUJtY21WbFIyeHZZbUZzSUQwZ2RIbHdaVzltSUdkc2IySmhiQ0E5UFNBbmIySnFaV04wSnlBbUppQm5iRzlpWVd3N1hHNWNkR2xtSUNobWNtVmxSMnh2WW1Gc0xtZHNiMkpoYkNBOVBUMGdabkpsWlVkc2IySmhiQ0I4ZkNCbWNtVmxSMnh2WW1Gc0xuZHBibVJ2ZHlBOVBUMGdabkpsWlVkc2IySmhiQ2tnZTF4dVhIUmNkSEp2YjNRZ1BTQm1jbVZsUjJ4dlltRnNPMXh1WEhSOVhHNWNibHgwTHlvcVhHNWNkQ0FxSUZSb1pTQmdjSFZ1ZVdOdlpHVmdJRzlpYW1WamRDNWNibHgwSUNvZ1FHNWhiV1VnY0hWdWVXTnZaR1ZjYmx4MElDb2dRSFI1Y0dVZ1QySnFaV04wWEc1Y2RDQXFMMXh1WEhSMllYSWdjSFZ1ZVdOdlpHVXNYRzVjYmx4MEx5b3FJRWhwWjJobGMzUWdjRzl6YVhScGRtVWdjMmxuYm1Wa0lETXlMV0pwZENCbWJHOWhkQ0IyWVd4MVpTQXFMMXh1WEhSdFlYaEpiblFnUFNBeU1UUTNORGd6TmpRM0xDQXZMeUJoYTJFdUlEQjROMFpHUmtaR1JrWWdiM0lnTWw0ek1TMHhYRzVjYmx4MEx5b3FJRUp2YjNSemRISnBibWNnY0dGeVlXMWxkR1Z5Y3lBcUwxeHVYSFJpWVhObElEMGdNellzWEc1Y2RIUk5hVzRnUFNBeExGeHVYSFIwVFdGNElEMGdNallzWEc1Y2RITnJaWGNnUFNBek9DeGNibHgwWkdGdGNDQTlJRGN3TUN4Y2JseDBhVzVwZEdsaGJFSnBZWE1nUFNBM01peGNibHgwYVc1cGRHbGhiRTRnUFNBeE1qZ3NJQzh2SURCNE9EQmNibHgwWkdWc2FXMXBkR1Z5SUQwZ0p5MG5MQ0F2THlBblhGeDRNa1FuWEc1Y2JseDBMeW9xSUZKbFozVnNZWElnWlhod2NtVnpjMmx2Ym5NZ0tpOWNibHgwY21WblpYaFFkVzU1WTI5a1pTQTlJQzllZUc0dExTOHNYRzVjZEhKbFoyVjRUbTl1UVZORFNVa2dQU0F2VzE0Z0xYNWRMeXdnTHk4Z2RXNXdjbWx1ZEdGaWJHVWdRVk5EU1VrZ1kyaGhjbk1nS3lCdWIyNHRRVk5EU1VrZ1kyaGhjbk5jYmx4MGNtVm5aWGhUWlhCaGNtRjBiM0p6SUQwZ0wxeGNlREpGZkZ4Y2RUTXdNREo4WEZ4MVJrWXdSWHhjWEhWR1JqWXhMMmNzSUM4dklGSkdReUF6TkRrd0lITmxjR0Z5WVhSdmNuTmNibHh1WEhRdktpb2dSWEp5YjNJZ2JXVnpjMkZuWlhNZ0tpOWNibHgwWlhKeWIzSnpJRDBnZTF4dVhIUmNkQ2R2ZG1WeVpteHZkeWM2SUNkUGRtVnlabXh2ZHpvZ2FXNXdkWFFnYm1WbFpITWdkMmxrWlhJZ2FXNTBaV2RsY25NZ2RHOGdjSEp2WTJWemN5Y3NYRzVjZEZ4MEoyNXZkQzFpWVhOcFl5YzZJQ2RKYkd4bFoyRnNJR2x1Y0hWMElENDlJREI0T0RBZ0tHNXZkQ0JoSUdKaGMybGpJR052WkdVZ2NHOXBiblFwSnl4Y2JseDBYSFFuYVc1MllXeHBaQzFwYm5CMWRDYzZJQ2RKYm5aaGJHbGtJR2x1Y0hWMEoxeHVYSFI5TEZ4dVhHNWNkQzhxS2lCRGIyNTJaVzVwWlc1alpTQnphRzl5ZEdOMWRITWdLaTljYmx4MFltRnpaVTFwYm5WelZFMXBiaUE5SUdKaGMyVWdMU0IwVFdsdUxGeHVYSFJtYkc5dmNpQTlJRTFoZEdndVpteHZiM0lzWEc1Y2RITjBjbWx1WjBaeWIyMURhR0Z5UTI5a1pTQTlJRk4wY21sdVp5NW1jbTl0UTJoaGNrTnZaR1VzWEc1Y2JseDBMeW9xSUZSbGJYQnZjbUZ5ZVNCMllYSnBZV0pzWlNBcUwxeHVYSFJyWlhrN1hHNWNibHgwTHlvdExTMHRMUzB0TFMwdExTMHRMUzB0TFMwdExTMHRMUzB0TFMwdExTMHRMUzB0TFMwdExTMHRMUzB0TFMwdExTMHRMUzB0TFMwdExTMHRMUzB0TFMwdExTMHRMUzB0TFMwdExTb3ZYRzVjYmx4MEx5b3FYRzVjZENBcUlFRWdaMlZ1WlhKcFl5Qmxjbkp2Y2lCMWRHbHNhWFI1SUdaMWJtTjBhVzl1TGx4dVhIUWdLaUJBY0hKcGRtRjBaVnh1WEhRZ0tpQkFjR0Z5WVcwZ2UxTjBjbWx1WjMwZ2RIbHdaU0JVYUdVZ1pYSnliM0lnZEhsd1pTNWNibHgwSUNvZ1FISmxkSFZ5Ym5NZ2UwVnljbTl5ZlNCVWFISnZkM01nWVNCZ1VtRnVaMlZGY25KdmNtQWdkMmwwYUNCMGFHVWdZWEJ3YkdsallXSnNaU0JsY25KdmNpQnRaWE56WVdkbExseHVYSFFnS2k5Y2JseDBablZ1WTNScGIyNGdaWEp5YjNJb2RIbHdaU2tnZTF4dVhIUmNkSFJvY205M0lGSmhibWRsUlhKeWIzSW9aWEp5YjNKelczUjVjR1ZkS1R0Y2JseDBmVnh1WEc1Y2RDOHFLbHh1WEhRZ0tpQkJJR2RsYm1WeWFXTWdZRUZ5Y21GNUkyMWhjR0FnZFhScGJHbDBlU0JtZFc1amRHbHZiaTVjYmx4MElDb2dRSEJ5YVhaaGRHVmNibHgwSUNvZ1FIQmhjbUZ0SUh0QmNuSmhlWDBnWVhKeVlYa2dWR2hsSUdGeWNtRjVJSFJ2SUdsMFpYSmhkR1VnYjNabGNpNWNibHgwSUNvZ1FIQmhjbUZ0SUh0R2RXNWpkR2x2Ym4wZ1kyRnNiR0poWTJzZ1ZHaGxJR1oxYm1OMGFXOXVJSFJvWVhRZ1oyVjBjeUJqWVd4c1pXUWdabTl5SUdWMlpYSjVJR0Z5Y21GNVhHNWNkQ0FxSUdsMFpXMHVYRzVjZENBcUlFQnlaWFIxY201eklIdEJjbkpoZVgwZ1FTQnVaWGNnWVhKeVlYa2diMllnZG1Gc2RXVnpJSEpsZEhWeWJtVmtJR0o1SUhSb1pTQmpZV3hzWW1GamF5Qm1kVzVqZEdsdmJpNWNibHgwSUNvdlhHNWNkR1oxYm1OMGFXOXVJRzFoY0NoaGNuSmhlU3dnWm00cElIdGNibHgwWEhSMllYSWdiR1Z1WjNSb0lEMGdZWEp5WVhrdWJHVnVaM1JvTzF4dVhIUmNkSGRvYVd4bElDaHNaVzVuZEdndExTa2dlMXh1WEhSY2RGeDBZWEp5WVhsYmJHVnVaM1JvWFNBOUlHWnVLR0Z5Y21GNVcyeGxibWQwYUYwcE8xeHVYSFJjZEgxY2JseDBYSFJ5WlhSMWNtNGdZWEp5WVhrN1hHNWNkSDFjYmx4dVhIUXZLaXBjYmx4MElDb2dRU0J6YVcxd2JHVWdZRUZ5Y21GNUkyMWhjR0F0YkdsclpTQjNjbUZ3Y0dWeUlIUnZJSGR2Y21zZ2QybDBhQ0JrYjIxaGFXNGdibUZ0WlNCemRISnBibWR6TGx4dVhIUWdLaUJBY0hKcGRtRjBaVnh1WEhRZ0tpQkFjR0Z5WVcwZ2UxTjBjbWx1WjMwZ1pHOXRZV2x1SUZSb1pTQmtiMjFoYVc0Z2JtRnRaUzVjYmx4MElDb2dRSEJoY21GdElIdEdkVzVqZEdsdmJuMGdZMkZzYkdKaFkyc2dWR2hsSUdaMWJtTjBhVzl1SUhSb1lYUWdaMlYwY3lCallXeHNaV1FnWm05eUlHVjJaWEo1WEc1Y2RDQXFJR05vWVhKaFkzUmxjaTVjYmx4MElDb2dRSEpsZEhWeWJuTWdlMEZ5Y21GNWZTQkJJRzVsZHlCemRISnBibWNnYjJZZ1kyaGhjbUZqZEdWeWN5QnlaWFIxY201bFpDQmllU0IwYUdVZ1kyRnNiR0poWTJ0Y2JseDBJQ29nWm5WdVkzUnBiMjR1WEc1Y2RDQXFMMXh1WEhSbWRXNWpkR2x2YmlCdFlYQkViMjFoYVc0b2MzUnlhVzVuTENCbWJpa2dlMXh1WEhSY2RISmxkSFZ5YmlCdFlYQW9jM1J5YVc1bkxuTndiR2wwS0hKbFoyVjRVMlZ3WVhKaGRHOXljeWtzSUdadUtTNXFiMmx1S0NjdUp5azdYRzVjZEgxY2JseHVYSFF2S2lwY2JseDBJQ29nUTNKbFlYUmxjeUJoYmlCaGNuSmhlU0JqYjI1MFlXbHVhVzVuSUhSb1pTQnVkVzFsY21saklHTnZaR1VnY0c5cGJuUnpJRzltSUdWaFkyZ2dWVzVwWTI5a1pWeHVYSFFnS2lCamFHRnlZV04wWlhJZ2FXNGdkR2hsSUhOMGNtbHVaeTRnVjJocGJHVWdTbUYyWVZOamNtbHdkQ0IxYzJWeklGVkRVeTB5SUdsdWRHVnlibUZzYkhrc1hHNWNkQ0FxSUhSb2FYTWdablZ1WTNScGIyNGdkMmxzYkNCamIyNTJaWEowSUdFZ2NHRnBjaUJ2WmlCemRYSnliMmRoZEdVZ2FHRnNkbVZ6SUNobFlXTm9JRzltSUhkb2FXTm9YRzVjZENBcUlGVkRVeTB5SUdWNGNHOXpaWE1nWVhNZ2MyVndZWEpoZEdVZ1kyaGhjbUZqZEdWeWN5a2dhVzUwYnlCaElITnBibWRzWlNCamIyUmxJSEJ2YVc1MExGeHVYSFFnS2lCdFlYUmphR2x1WnlCVlZFWXRNVFl1WEc1Y2RDQXFJRUJ6WldVZ1lIQjFibmxqYjJSbExuVmpjekl1Wlc1amIyUmxZRnh1WEhRZ0tpQkFjMlZsSUR4b2RIUndPaTh2YldGMGFHbGhjMko1Ym1WdWN5NWlaUzl1YjNSbGN5OXFZWFpoYzJOeWFYQjBMV1Z1WTI5a2FXNW5QbHh1WEhRZ0tpQkFiV1Z0WW1WeVQyWWdjSFZ1ZVdOdlpHVXVkV056TWx4dVhIUWdLaUJBYm1GdFpTQmtaV052WkdWY2JseDBJQ29nUUhCaGNtRnRJSHRUZEhKcGJtZDlJSE4wY21sdVp5QlVhR1VnVlc1cFkyOWtaU0JwYm5CMWRDQnpkSEpwYm1jZ0tGVkRVeTB5S1M1Y2JseDBJQ29nUUhKbGRIVnlibk1nZTBGeWNtRjVmU0JVYUdVZ2JtVjNJR0Z5Y21GNUlHOW1JR052WkdVZ2NHOXBiblJ6TGx4dVhIUWdLaTljYmx4MFpuVnVZM1JwYjI0Z2RXTnpNbVJsWTI5a1pTaHpkSEpwYm1jcElIdGNibHgwWEhSMllYSWdiM1YwY0hWMElEMGdXMTBzWEc1Y2RGeDBJQ0FnSUdOdmRXNTBaWElnUFNBd0xGeHVYSFJjZENBZ0lDQnNaVzVuZEdnZ1BTQnpkSEpwYm1jdWJHVnVaM1JvTEZ4dVhIUmNkQ0FnSUNCMllXeDFaU3hjYmx4MFhIUWdJQ0FnWlhoMGNtRTdYRzVjZEZ4MGQyaHBiR1VnS0dOdmRXNTBaWElnUENCc1pXNW5kR2dwSUh0Y2JseDBYSFJjZEhaaGJIVmxJRDBnYzNSeWFXNW5MbU5vWVhKRGIyUmxRWFFvWTI5MWJuUmxjaXNyS1R0Y2JseDBYSFJjZEdsbUlDaDJZV3gxWlNBK1BTQXdlRVE0TURBZ0ppWWdkbUZzZFdVZ1BEMGdNSGhFUWtaR0lDWW1JR052ZFc1MFpYSWdQQ0JzWlc1bmRHZ3BJSHRjYmx4MFhIUmNkRngwTHk4Z2FHbG5hQ0J6ZFhKeWIyZGhkR1VzSUdGdVpDQjBhR1Z5WlNCcGN5QmhJRzVsZUhRZ1kyaGhjbUZqZEdWeVhHNWNkRngwWEhSY2RHVjRkSEpoSUQwZ2MzUnlhVzVuTG1Ob1lYSkRiMlJsUVhRb1kyOTFiblJsY2lzcktUdGNibHgwWEhSY2RGeDBhV1lnS0NobGVIUnlZU0FtSURCNFJrTXdNQ2tnUFQwZ01IaEVRekF3S1NCN0lDOHZJR3h2ZHlCemRYSnliMmRoZEdWY2JseDBYSFJjZEZ4MFhIUnZkWFJ3ZFhRdWNIVnphQ2dvS0haaGJIVmxJQ1lnTUhnelJrWXBJRHc4SURFd0tTQXJJQ2hsZUhSeVlTQW1JREI0TTBaR0tTQXJJREI0TVRBd01EQXBPMXh1WEhSY2RGeDBYSFI5SUdWc2MyVWdlMXh1WEhSY2RGeDBYSFJjZEM4dklIVnViV0YwWTJobFpDQnpkWEp5YjJkaGRHVTdJRzl1YkhrZ1lYQndaVzVrSUhSb2FYTWdZMjlrWlNCMWJtbDBMQ0JwYmlCallYTmxJSFJvWlNCdVpYaDBYRzVjZEZ4MFhIUmNkRngwTHk4Z1kyOWtaU0IxYm1sMElHbHpJSFJvWlNCb2FXZG9JSE4xY25KdloyRjBaU0J2WmlCaElITjFjbkp2WjJGMFpTQndZV2x5WEc1Y2RGeDBYSFJjZEZ4MGIzVjBjSFYwTG5CMWMyZ29kbUZzZFdVcE8xeHVYSFJjZEZ4MFhIUmNkR052ZFc1MFpYSXRMVHRjYmx4MFhIUmNkRngwZlZ4dVhIUmNkRngwZlNCbGJITmxJSHRjYmx4MFhIUmNkRngwYjNWMGNIVjBMbkIxYzJnb2RtRnNkV1VwTzF4dVhIUmNkRngwZlZ4dVhIUmNkSDFjYmx4MFhIUnlaWFIxY200Z2IzVjBjSFYwTzF4dVhIUjlYRzVjYmx4MEx5b3FYRzVjZENBcUlFTnlaV0YwWlhNZ1lTQnpkSEpwYm1jZ1ltRnpaV1FnYjI0Z1lXNGdZWEp5WVhrZ2IyWWdiblZ0WlhKcFl5QmpiMlJsSUhCdmFXNTBjeTVjYmx4MElDb2dRSE5sWlNCZ2NIVnVlV052WkdVdWRXTnpNaTVrWldOdlpHVmdYRzVjZENBcUlFQnRaVzFpWlhKUFppQndkVzU1WTI5a1pTNTFZM015WEc1Y2RDQXFJRUJ1WVcxbElHVnVZMjlrWlZ4dVhIUWdLaUJBY0dGeVlXMGdlMEZ5Y21GNWZTQmpiMlJsVUc5cGJuUnpJRlJvWlNCaGNuSmhlU0J2WmlCdWRXMWxjbWxqSUdOdlpHVWdjRzlwYm5SekxseHVYSFFnS2lCQWNtVjBkWEp1Y3lCN1UzUnlhVzVuZlNCVWFHVWdibVYzSUZWdWFXTnZaR1VnYzNSeWFXNW5JQ2hWUTFNdE1pa3VYRzVjZENBcUwxeHVYSFJtZFc1amRHbHZiaUIxWTNNeVpXNWpiMlJsS0dGeWNtRjVLU0I3WEc1Y2RGeDBjbVYwZFhKdUlHMWhjQ2hoY25KaGVTd2dablZ1WTNScGIyNG9kbUZzZFdVcElIdGNibHgwWEhSY2RIWmhjaUJ2ZFhSd2RYUWdQU0FuSnp0Y2JseDBYSFJjZEdsbUlDaDJZV3gxWlNBK0lEQjRSa1pHUmlrZ2UxeHVYSFJjZEZ4MFhIUjJZV3gxWlNBdFBTQXdlREV3TURBd08xeHVYSFJjZEZ4MFhIUnZkWFJ3ZFhRZ0t6MGdjM1J5YVc1blJuSnZiVU5vWVhKRGIyUmxLSFpoYkhWbElENCtQaUF4TUNBbUlEQjRNMFpHSUh3Z01IaEVPREF3S1R0Y2JseDBYSFJjZEZ4MGRtRnNkV1VnUFNBd2VFUkRNREFnZkNCMllXeDFaU0FtSURCNE0wWkdPMXh1WEhSY2RGeDBmVnh1WEhSY2RGeDBiM1YwY0hWMElDczlJSE4wY21sdVowWnliMjFEYUdGeVEyOWtaU2gyWVd4MVpTazdYRzVjZEZ4MFhIUnlaWFIxY200Z2IzVjBjSFYwTzF4dVhIUmNkSDBwTG1wdmFXNG9KeWNwTzF4dVhIUjlYRzVjYmx4MEx5b3FYRzVjZENBcUlFTnZiblpsY25SeklHRWdZbUZ6YVdNZ1kyOWtaU0J3YjJsdWRDQnBiblJ2SUdFZ1pHbG5hWFF2YVc1MFpXZGxjaTVjYmx4MElDb2dRSE5sWlNCZ1pHbG5hWFJVYjBKaGMybGpLQ2xnWEc1Y2RDQXFJRUJ3Y21sMllYUmxYRzVjZENBcUlFQndZWEpoYlNCN1RuVnRZbVZ5ZlNCamIyUmxVRzlwYm5RZ1ZHaGxJR0poYzJsaklHNTFiV1Z5YVdNZ1kyOWtaU0J3YjJsdWRDQjJZV3gxWlM1Y2JseDBJQ29nUUhKbGRIVnlibk1nZTA1MWJXSmxjbjBnVkdobElHNTFiV1Z5YVdNZ2RtRnNkV1VnYjJZZ1lTQmlZWE5wWXlCamIyUmxJSEJ2YVc1MElDaG1iM0lnZFhObElHbHVYRzVjZENBcUlISmxjSEpsYzJWdWRHbHVaeUJwYm5SbFoyVnljeWtnYVc0Z2RHaGxJSEpoYm1kbElHQXdZQ0IwYnlCZ1ltRnpaU0F0SURGZ0xDQnZjaUJnWW1GelpXQWdhV1pjYmx4MElDb2dkR2hsSUdOdlpHVWdjRzlwYm5RZ1pHOWxjeUJ1YjNRZ2NtVndjbVZ6Wlc1MElHRWdkbUZzZFdVdVhHNWNkQ0FxTDF4dVhIUm1kVzVqZEdsdmJpQmlZWE5wWTFSdlJHbG5hWFFvWTI5a1pWQnZhVzUwS1NCN1hHNWNkRngwYVdZZ0tHTnZaR1ZRYjJsdWRDQXRJRFE0SUR3Z01UQXBJSHRjYmx4MFhIUmNkSEpsZEhWeWJpQmpiMlJsVUc5cGJuUWdMU0F5TWp0Y2JseDBYSFI5WEc1Y2RGeDBhV1lnS0dOdlpHVlFiMmx1ZENBdElEWTFJRHdnTWpZcElIdGNibHgwWEhSY2RISmxkSFZ5YmlCamIyUmxVRzlwYm5RZ0xTQTJOVHRjYmx4MFhIUjlYRzVjZEZ4MGFXWWdLR052WkdWUWIybHVkQ0F0SURrM0lEd2dNallwSUh0Y2JseDBYSFJjZEhKbGRIVnliaUJqYjJSbFVHOXBiblFnTFNBNU56dGNibHgwWEhSOVhHNWNkRngwY21WMGRYSnVJR0poYzJVN1hHNWNkSDFjYmx4dVhIUXZLaXBjYmx4MElDb2dRMjl1ZG1WeWRITWdZU0JrYVdkcGRDOXBiblJsWjJWeUlHbHVkRzhnWVNCaVlYTnBZeUJqYjJSbElIQnZhVzUwTGx4dVhIUWdLaUJBYzJWbElHQmlZWE5wWTFSdlJHbG5hWFFvS1dCY2JseDBJQ29nUUhCeWFYWmhkR1ZjYmx4MElDb2dRSEJoY21GdElIdE9kVzFpWlhKOUlHUnBaMmwwSUZSb1pTQnVkVzFsY21saklIWmhiSFZsSUc5bUlHRWdZbUZ6YVdNZ1kyOWtaU0J3YjJsdWRDNWNibHgwSUNvZ1FISmxkSFZ5Ym5NZ2UwNTFiV0psY24wZ1ZHaGxJR0poYzJsaklHTnZaR1VnY0c5cGJuUWdkMmh2YzJVZ2RtRnNkV1VnS0hkb1pXNGdkWE5sWkNCbWIzSmNibHgwSUNvZ2NtVndjbVZ6Wlc1MGFXNW5JR2x1ZEdWblpYSnpLU0JwY3lCZ1pHbG5hWFJnTENCM2FHbGphQ0J1WldWa2N5QjBieUJpWlNCcGJpQjBhR1VnY21GdVoyVmNibHgwSUNvZ1lEQmdJSFJ2SUdCaVlYTmxJQzBnTVdBdUlFbG1JR0JtYkdGbllDQnBjeUJ1YjI0dGVtVnlieXdnZEdobElIVndjR1Z5WTJGelpTQm1iM0p0SUdselhHNWNkQ0FxSUhWelpXUTdJR1ZzYzJVc0lIUm9aU0JzYjNkbGNtTmhjMlVnWm05eWJTQnBjeUIxYzJWa0xpQlVhR1VnWW1Wb1lYWnBiM0lnYVhNZ2RXNWtaV1pwYm1Wa1hHNWNkQ0FxSUdsbUlHQm1iR0ZuWUNCcGN5QnViMjR0ZW1WeWJ5QmhibVFnWUdScFoybDBZQ0JvWVhNZ2JtOGdkWEJ3WlhKallYTmxJR1p2Y20wdVhHNWNkQ0FxTDF4dVhIUm1kVzVqZEdsdmJpQmthV2RwZEZSdlFtRnphV01vWkdsbmFYUXNJR1pzWVdjcElIdGNibHgwWEhRdkx5QWdNQzR1TWpVZ2JXRndJSFJ2SUVGVFEwbEpJR0V1TG5vZ2IzSWdRUzR1V2x4dVhIUmNkQzh2SURJMkxpNHpOU0J0WVhBZ2RHOGdRVk5EU1VrZ01DNHVPVnh1WEhSY2RISmxkSFZ5YmlCa2FXZHBkQ0FySURJeUlDc2dOelVnS2lBb1pHbG5hWFFnUENBeU5pa2dMU0FvS0dac1lXY2dJVDBnTUNrZ1BEd2dOU2s3WEc1Y2RIMWNibHh1WEhRdktpcGNibHgwSUNvZ1FtbGhjeUJoWkdGd2RHRjBhVzl1SUdaMWJtTjBhVzl1SUdGeklIQmxjaUJ6WldOMGFXOXVJRE11TkNCdlppQlNSa01nTXpRNU1pNWNibHgwSUNvZ2FIUjBjRG92TDNSdmIyeHpMbWxsZEdZdWIzSm5MMmgwYld3dmNtWmpNelE1TWlOelpXTjBhVzl1TFRNdU5GeHVYSFFnS2lCQWNISnBkbUYwWlZ4dVhIUWdLaTljYmx4MFpuVnVZM1JwYjI0Z1lXUmhjSFFvWkdWc2RHRXNJRzUxYlZCdmFXNTBjeXdnWm1seWMzUlVhVzFsS1NCN1hHNWNkRngwZG1GeUlHc2dQU0F3TzF4dVhIUmNkR1JsYkhSaElEMGdabWx5YzNSVWFXMWxJRDhnWm14dmIzSW9aR1ZzZEdFZ0x5QmtZVzF3S1NBNklHUmxiSFJoSUQ0K0lERTdYRzVjZEZ4MFpHVnNkR0VnS3owZ1pteHZiM0lvWkdWc2RHRWdMeUJ1ZFcxUWIybHVkSE1wTzF4dVhIUmNkR1p2Y2lBb0x5b2dibThnYVc1cGRHbGhiR2w2WVhScGIyNGdLaTg3SUdSbGJIUmhJRDRnWW1GelpVMXBiblZ6VkUxcGJpQXFJSFJOWVhnZ1BqNGdNVHNnYXlBclBTQmlZWE5sS1NCN1hHNWNkRngwWEhSa1pXeDBZU0E5SUdac2IyOXlLR1JsYkhSaElDOGdZbUZ6WlUxcGJuVnpWRTFwYmlrN1hHNWNkRngwZlZ4dVhIUmNkSEpsZEhWeWJpQm1iRzl2Y2locklDc2dLR0poYzJWTmFXNTFjMVJOYVc0Z0t5QXhLU0FxSUdSbGJIUmhJQzhnS0dSbGJIUmhJQ3NnYzJ0bGR5a3BPMXh1WEhSOVhHNWNibHgwTHlvcVhHNWNkQ0FxSUVOdmJuWmxjblJ6SUdFZ1VIVnVlV052WkdVZ2MzUnlhVzVuSUc5bUlFRlRRMGxKTFc5dWJIa2djM2x0WW05c2N5QjBieUJoSUhOMGNtbHVaeUJ2WmlCVmJtbGpiMlJsWEc1Y2RDQXFJSE41YldKdmJITXVYRzVjZENBcUlFQnRaVzFpWlhKUFppQndkVzU1WTI5a1pWeHVYSFFnS2lCQWNHRnlZVzBnZTFOMGNtbHVaMzBnYVc1d2RYUWdWR2hsSUZCMWJubGpiMlJsSUhOMGNtbHVaeUJ2WmlCQlUwTkpTUzF2Ym14NUlITjViV0p2YkhNdVhHNWNkQ0FxSUVCeVpYUjFjbTV6SUh0VGRISnBibWQ5SUZSb1pTQnlaWE4xYkhScGJtY2djM1J5YVc1bklHOW1JRlZ1YVdOdlpHVWdjM2x0WW05c2N5NWNibHgwSUNvdlhHNWNkR1oxYm1OMGFXOXVJR1JsWTI5a1pTaHBibkIxZENrZ2UxeHVYSFJjZEM4dklFUnZiaWQwSUhWelpTQlZRMU10TWx4dVhIUmNkSFpoY2lCdmRYUndkWFFnUFNCYlhTeGNibHgwWEhRZ0lDQWdhVzV3ZFhSTVpXNW5kR2dnUFNCcGJuQjFkQzVzWlc1bmRHZ3NYRzVjZEZ4MElDQWdJRzkxZEN4Y2JseDBYSFFnSUNBZ2FTQTlJREFzWEc1Y2RGeDBJQ0FnSUc0Z1BTQnBibWwwYVdGc1RpeGNibHgwWEhRZ0lDQWdZbWxoY3lBOUlHbHVhWFJwWVd4Q2FXRnpMRnh1WEhSY2RDQWdJQ0JpWVhOcFl5eGNibHgwWEhRZ0lDQWdhaXhjYmx4MFhIUWdJQ0FnYVc1a1pYZ3NYRzVjZEZ4MElDQWdJRzlzWkdrc1hHNWNkRngwSUNBZ0lIY3NYRzVjZEZ4MElDQWdJR3NzWEc1Y2RGeDBJQ0FnSUdScFoybDBMRnh1WEhSY2RDQWdJQ0IwTEZ4dVhIUmNkQ0FnSUNBdktpb2dRMkZqYUdWa0lHTmhiR04xYkdGMGFXOXVJSEpsYzNWc2RITWdLaTljYmx4MFhIUWdJQ0FnWW1GelpVMXBiblZ6VkR0Y2JseHVYSFJjZEM4dklFaGhibVJzWlNCMGFHVWdZbUZ6YVdNZ1kyOWtaU0J3YjJsdWRITTZJR3hsZENCZ1ltRnphV05nSUdKbElIUm9aU0J1ZFcxaVpYSWdiMllnYVc1d2RYUWdZMjlrWlZ4dVhIUmNkQzh2SUhCdmFXNTBjeUJpWldadmNtVWdkR2hsSUd4aGMzUWdaR1ZzYVcxcGRHVnlMQ0J2Y2lCZ01HQWdhV1lnZEdobGNtVWdhWE1nYm05dVpTd2dkR2hsYmlCamIzQjVYRzVjZEZ4MEx5OGdkR2hsSUdacGNuTjBJR0poYzJsaklHTnZaR1VnY0c5cGJuUnpJSFJ2SUhSb1pTQnZkWFJ3ZFhRdVhHNWNibHgwWEhSaVlYTnBZeUE5SUdsdWNIVjBMbXhoYzNSSmJtUmxlRTltS0dSbGJHbHRhWFJsY2lrN1hHNWNkRngwYVdZZ0tHSmhjMmxqSUR3Z01Da2dlMXh1WEhSY2RGeDBZbUZ6YVdNZ1BTQXdPMXh1WEhSY2RIMWNibHh1WEhSY2RHWnZjaUFvYWlBOUlEQTdJR29nUENCaVlYTnBZenNnS3l0cUtTQjdYRzVjZEZ4MFhIUXZMeUJwWmlCcGRDZHpJRzV2ZENCaElHSmhjMmxqSUdOdlpHVWdjRzlwYm5SY2JseDBYSFJjZEdsbUlDaHBibkIxZEM1amFHRnlRMjlrWlVGMEtHb3BJRDQ5SURCNE9EQXBJSHRjYmx4MFhIUmNkRngwWlhKeWIzSW9KMjV2ZEMxaVlYTnBZeWNwTzF4dVhIUmNkRngwZlZ4dVhIUmNkRngwYjNWMGNIVjBMbkIxYzJnb2FXNXdkWFF1WTJoaGNrTnZaR1ZCZENocUtTazdYRzVjZEZ4MGZWeHVYRzVjZEZ4MEx5OGdUV0ZwYmlCa1pXTnZaR2x1WnlCc2IyOXdPaUJ6ZEdGeWRDQnFkWE4wSUdGbWRHVnlJSFJvWlNCc1lYTjBJR1JsYkdsdGFYUmxjaUJwWmlCaGJua2dZbUZ6YVdNZ1kyOWtaVnh1WEhSY2RDOHZJSEJ2YVc1MGN5QjNaWEpsSUdOdmNHbGxaRHNnYzNSaGNuUWdZWFFnZEdobElHSmxaMmx1Ym1sdVp5QnZkR2hsY25kcGMyVXVYRzVjYmx4MFhIUm1iM0lnS0dsdVpHVjRJRDBnWW1GemFXTWdQaUF3SUQ4Z1ltRnphV01nS3lBeElEb2dNRHNnYVc1a1pYZ2dQQ0JwYm5CMWRFeGxibWQwYURzZ0x5b2dibThnWm1sdVlXd2daWGh3Y21WemMybHZiaUFxTHlrZ2UxeHVYRzVjZEZ4MFhIUXZMeUJnYVc1a1pYaGdJR2x6SUhSb1pTQnBibVJsZUNCdlppQjBhR1VnYm1WNGRDQmphR0Z5WVdOMFpYSWdkRzhnWW1VZ1kyOXVjM1Z0WldRdVhHNWNkRngwWEhRdkx5QkVaV052WkdVZ1lTQm5aVzVsY21Gc2FYcGxaQ0IyWVhKcFlXSnNaUzFzWlc1bmRHZ2dhVzUwWldkbGNpQnBiblJ2SUdCa1pXeDBZV0FzWEc1Y2RGeDBYSFF2THlCM2FHbGphQ0JuWlhSeklHRmtaR1ZrSUhSdklHQnBZQzRnVkdobElHOTJaWEptYkc5M0lHTm9aV05yYVc1bklHbHpJR1ZoYzJsbGNseHVYSFJjZEZ4MEx5OGdhV1lnZDJVZ2FXNWpjbVZoYzJVZ1lHbGdJR0Z6SUhkbElHZHZMQ0IwYUdWdUlITjFZblJ5WVdOMElHOW1aaUJwZEhNZ2MzUmhjblJwYm1kY2JseDBYSFJjZEM4dklIWmhiSFZsSUdGMElIUm9aU0JsYm1RZ2RHOGdiMkowWVdsdUlHQmtaV3gwWVdBdVhHNWNkRngwWEhSbWIzSWdLRzlzWkdrZ1BTQnBMQ0IzSUQwZ01Td2dheUE5SUdKaGMyVTdJQzhxSUc1dklHTnZibVJwZEdsdmJpQXFMenNnYXlBclBTQmlZWE5sS1NCN1hHNWNibHgwWEhSY2RGeDBhV1lnS0dsdVpHVjRJRDQ5SUdsdWNIVjBUR1Z1WjNSb0tTQjdYRzVjZEZ4MFhIUmNkRngwWlhKeWIzSW9KMmx1ZG1Gc2FXUXRhVzV3ZFhRbktUdGNibHgwWEhSY2RGeDBmVnh1WEc1Y2RGeDBYSFJjZEdScFoybDBJRDBnWW1GemFXTlViMFJwWjJsMEtHbHVjSFYwTG1Ob1lYSkRiMlJsUVhRb2FXNWtaWGdyS3lrcE8xeHVYRzVjZEZ4MFhIUmNkR2xtSUNoa2FXZHBkQ0ErUFNCaVlYTmxJSHg4SUdScFoybDBJRDRnWm14dmIzSW9LRzFoZUVsdWRDQXRJR2twSUM4Z2R5a3BJSHRjYmx4MFhIUmNkRngwWEhSbGNuSnZjaWduYjNabGNtWnNiM2NuS1R0Y2JseDBYSFJjZEZ4MGZWeHVYRzVjZEZ4MFhIUmNkR2tnS3owZ1pHbG5hWFFnS2lCM08xeHVYSFJjZEZ4MFhIUjBJRDBnYXlBOFBTQmlhV0Z6SUQ4Z2RFMXBiaUE2SUNocklENDlJR0pwWVhNZ0t5QjBUV0Y0SUQ4Z2RFMWhlQ0E2SUdzZ0xTQmlhV0Z6S1R0Y2JseHVYSFJjZEZ4MFhIUnBaaUFvWkdsbmFYUWdQQ0IwS1NCN1hHNWNkRngwWEhSY2RGeDBZbkpsWVdzN1hHNWNkRngwWEhSY2RIMWNibHh1WEhSY2RGeDBYSFJpWVhObFRXbHVkWE5VSUQwZ1ltRnpaU0F0SUhRN1hHNWNkRngwWEhSY2RHbG1JQ2gzSUQ0Z1pteHZiM0lvYldGNFNXNTBJQzhnWW1GelpVMXBiblZ6VkNrcElIdGNibHgwWEhSY2RGeDBYSFJsY25KdmNpZ25iM1psY21ac2IzY25LVHRjYmx4MFhIUmNkRngwZlZ4dVhHNWNkRngwWEhSY2RIY2dLajBnWW1GelpVMXBiblZ6VkR0Y2JseHVYSFJjZEZ4MGZWeHVYRzVjZEZ4MFhIUnZkWFFnUFNCdmRYUndkWFF1YkdWdVozUm9JQ3NnTVR0Y2JseDBYSFJjZEdKcFlYTWdQU0JoWkdGd2RDaHBJQzBnYjJ4a2FTd2diM1YwTENCdmJHUnBJRDA5SURBcE8xeHVYRzVjZEZ4MFhIUXZMeUJnYVdBZ2QyRnpJSE4xY0hCdmMyVmtJSFJ2SUhkeVlYQWdZWEp2ZFc1a0lHWnliMjBnWUc5MWRHQWdkRzhnWURCZ0xGeHVYSFJjZEZ4MEx5OGdhVzVqY21WdFpXNTBhVzVuSUdCdVlDQmxZV05vSUhScGJXVXNJSE52SUhkbEoyeHNJR1pwZUNCMGFHRjBJRzV2ZHpwY2JseDBYSFJjZEdsbUlDaG1iRzl2Y2locElDOGdiM1YwS1NBK0lHMWhlRWx1ZENBdElHNHBJSHRjYmx4MFhIUmNkRngwWlhKeWIzSW9KMjkyWlhKbWJHOTNKeWs3WEc1Y2RGeDBYSFI5WEc1Y2JseDBYSFJjZEc0Z0t6MGdabXh2YjNJb2FTQXZJRzkxZENrN1hHNWNkRngwWEhScElDVTlJRzkxZER0Y2JseHVYSFJjZEZ4MEx5OGdTVzV6WlhKMElHQnVZQ0JoZENCd2IzTnBkR2x2YmlCZ2FXQWdiMllnZEdobElHOTFkSEIxZEZ4dVhIUmNkRngwYjNWMGNIVjBMbk53YkdsalpTaHBLeXNzSURBc0lHNHBPMXh1WEc1Y2RGeDBmVnh1WEc1Y2RGeDBjbVYwZFhKdUlIVmpjekpsYm1OdlpHVW9iM1YwY0hWMEtUdGNibHgwZlZ4dVhHNWNkQzhxS2x4dVhIUWdLaUJEYjI1MlpYSjBjeUJoSUhOMGNtbHVaeUJ2WmlCVmJtbGpiMlJsSUhONWJXSnZiSE1nZEc4Z1lTQlFkVzU1WTI5a1pTQnpkSEpwYm1jZ2IyWWdRVk5EU1VrdGIyNXNlVnh1WEhRZ0tpQnplVzFpYjJ4ekxseHVYSFFnS2lCQWJXVnRZbVZ5VDJZZ2NIVnVlV052WkdWY2JseDBJQ29nUUhCaGNtRnRJSHRUZEhKcGJtZDlJR2x1Y0hWMElGUm9aU0J6ZEhKcGJtY2diMllnVlc1cFkyOWtaU0J6ZVcxaWIyeHpMbHh1WEhRZ0tpQkFjbVYwZFhKdWN5QjdVM1J5YVc1bmZTQlVhR1VnY21WemRXeDBhVzVuSUZCMWJubGpiMlJsSUhOMGNtbHVaeUJ2WmlCQlUwTkpTUzF2Ym14NUlITjViV0p2YkhNdVhHNWNkQ0FxTDF4dVhIUm1kVzVqZEdsdmJpQmxibU52WkdVb2FXNXdkWFFwSUh0Y2JseDBYSFIyWVhJZ2JpeGNibHgwWEhRZ0lDQWdaR1ZzZEdFc1hHNWNkRngwSUNBZ0lHaGhibVJzWldSRFVFTnZkVzUwTEZ4dVhIUmNkQ0FnSUNCaVlYTnBZMHhsYm1kMGFDeGNibHgwWEhRZ0lDQWdZbWxoY3l4Y2JseDBYSFFnSUNBZ2FpeGNibHgwWEhRZ0lDQWdiU3hjYmx4MFhIUWdJQ0FnY1N4Y2JseDBYSFFnSUNBZ2F5eGNibHgwWEhRZ0lDQWdkQ3hjYmx4MFhIUWdJQ0FnWTNWeWNtVnVkRlpoYkhWbExGeHVYSFJjZENBZ0lDQnZkWFJ3ZFhRZ1BTQmJYU3hjYmx4MFhIUWdJQ0FnTHlvcUlHQnBibkIxZEV4bGJtZDBhR0FnZDJsc2JDQm9iMnhrSUhSb1pTQnVkVzFpWlhJZ2IyWWdZMjlrWlNCd2IybHVkSE1nYVc0Z1lHbHVjSFYwWUM0Z0tpOWNibHgwWEhRZ0lDQWdhVzV3ZFhSTVpXNW5kR2dzWEc1Y2RGeDBJQ0FnSUM4cUtpQkRZV05vWldRZ1kyRnNZM1ZzWVhScGIyNGdjbVZ6ZFd4MGN5QXFMMXh1WEhSY2RDQWdJQ0JvWVc1a2JHVmtRMUJEYjNWdWRGQnNkWE5QYm1Vc1hHNWNkRngwSUNBZ0lHSmhjMlZOYVc1MWMxUXNYRzVjZEZ4MElDQWdJSEZOYVc1MWMxUTdYRzVjYmx4MFhIUXZMeUJEYjI1MlpYSjBJSFJvWlNCcGJuQjFkQ0JwYmlCVlExTXRNaUIwYnlCVmJtbGpiMlJsWEc1Y2RGeDBhVzV3ZFhRZ1BTQjFZM015WkdWamIyUmxLR2x1Y0hWMEtUdGNibHh1WEhSY2RDOHZJRU5oWTJobElIUm9aU0JzWlc1bmRHaGNibHgwWEhScGJuQjFkRXhsYm1kMGFDQTlJR2x1Y0hWMExteGxibWQwYUR0Y2JseHVYSFJjZEM4dklFbHVhWFJwWVd4cGVtVWdkR2hsSUhOMFlYUmxYRzVjZEZ4MGJpQTlJR2x1YVhScFlXeE9PMXh1WEhSY2RHUmxiSFJoSUQwZ01EdGNibHgwWEhSaWFXRnpJRDBnYVc1cGRHbGhiRUpwWVhNN1hHNWNibHgwWEhRdkx5QklZVzVrYkdVZ2RHaGxJR0poYzJsaklHTnZaR1VnY0c5cGJuUnpYRzVjZEZ4MFptOXlJQ2hxSUQwZ01Ec2dhaUE4SUdsdWNIVjBUR1Z1WjNSb095QXJLMm9wSUh0Y2JseDBYSFJjZEdOMWNuSmxiblJXWVd4MVpTQTlJR2x1Y0hWMFcycGRPMXh1WEhSY2RGeDBhV1lnS0dOMWNuSmxiblJXWVd4MVpTQThJREI0T0RBcElIdGNibHgwWEhSY2RGeDBiM1YwY0hWMExuQjFjMmdvYzNSeWFXNW5Sbkp2YlVOb1lYSkRiMlJsS0dOMWNuSmxiblJXWVd4MVpTa3BPMXh1WEhSY2RGeDBmVnh1WEhSY2RIMWNibHh1WEhSY2RHaGhibVJzWldSRFVFTnZkVzUwSUQwZ1ltRnphV05NWlc1bmRHZ2dQU0J2ZFhSd2RYUXViR1Z1WjNSb08xeHVYRzVjZEZ4MEx5OGdZR2hoYm1Sc1pXUkRVRU52ZFc1MFlDQnBjeUIwYUdVZ2JuVnRZbVZ5SUc5bUlHTnZaR1VnY0c5cGJuUnpJSFJvWVhRZ2FHRjJaU0JpWldWdUlHaGhibVJzWldRN1hHNWNkRngwTHk4Z1lHSmhjMmxqVEdWdVozUm9ZQ0JwY3lCMGFHVWdiblZ0WW1WeUlHOW1JR0poYzJsaklHTnZaR1VnY0c5cGJuUnpMbHh1WEc1Y2RGeDBMeThnUm1sdWFYTm9JSFJvWlNCaVlYTnBZeUJ6ZEhKcGJtY2dMU0JwWmlCcGRDQnBjeUJ1YjNRZ1pXMXdkSGtnTFNCM2FYUm9JR0VnWkdWc2FXMXBkR1Z5WEc1Y2RGeDBhV1lnS0dKaGMybGpUR1Z1WjNSb0tTQjdYRzVjZEZ4MFhIUnZkWFJ3ZFhRdWNIVnphQ2hrWld4cGJXbDBaWElwTzF4dVhIUmNkSDFjYmx4dVhIUmNkQzh2SUUxaGFXNGdaVzVqYjJScGJtY2diRzl2Y0RwY2JseDBYSFIzYUdsc1pTQW9hR0Z1Wkd4bFpFTlFRMjkxYm5RZ1BDQnBibkIxZEV4bGJtZDBhQ2tnZTF4dVhHNWNkRngwWEhRdkx5QkJiR3dnYm05dUxXSmhjMmxqSUdOdlpHVWdjRzlwYm5SeklEd2diaUJvWVhabElHSmxaVzRnYUdGdVpHeGxaQ0JoYkhKbFlXUjVMaUJHYVc1a0lIUm9aU0J1WlhoMFhHNWNkRngwWEhRdkx5QnNZWEpuWlhJZ2IyNWxPbHh1WEhSY2RGeDBabTl5SUNodElEMGdiV0Y0U1c1MExDQnFJRDBnTURzZ2FpQThJR2x1Y0hWMFRHVnVaM1JvT3lBcksyb3BJSHRjYmx4MFhIUmNkRngwWTNWeWNtVnVkRlpoYkhWbElEMGdhVzV3ZFhSYmFsMDdYRzVjZEZ4MFhIUmNkR2xtSUNoamRYSnlaVzUwVm1Gc2RXVWdQajBnYmlBbUppQmpkWEp5Wlc1MFZtRnNkV1VnUENCdEtTQjdYRzVjZEZ4MFhIUmNkRngwYlNBOUlHTjFjbkpsYm5SV1lXeDFaVHRjYmx4MFhIUmNkRngwZlZ4dVhIUmNkRngwZlZ4dVhHNWNkRngwWEhRdkx5QkpibU55WldGelpTQmdaR1ZzZEdGZ0lHVnViM1ZuYUNCMGJ5QmhaSFpoYm1ObElIUm9aU0JrWldOdlpHVnlKM01nUEc0c2FUNGdjM1JoZEdVZ2RHOGdQRzBzTUQ0c1hHNWNkRngwWEhRdkx5QmlkWFFnWjNWaGNtUWdZV2RoYVc1emRDQnZkbVZ5Wm14dmQxeHVYSFJjZEZ4MGFHRnVaR3hsWkVOUVEyOTFiblJRYkhWelQyNWxJRDBnYUdGdVpHeGxaRU5RUTI5MWJuUWdLeUF4TzF4dVhIUmNkRngwYVdZZ0tHMGdMU0J1SUQ0Z1pteHZiM0lvS0cxaGVFbHVkQ0F0SUdSbGJIUmhLU0F2SUdoaGJtUnNaV1JEVUVOdmRXNTBVR3gxYzA5dVpTa3BJSHRjYmx4MFhIUmNkRngwWlhKeWIzSW9KMjkyWlhKbWJHOTNKeWs3WEc1Y2RGeDBYSFI5WEc1Y2JseDBYSFJjZEdSbGJIUmhJQ3M5SUNodElDMGdiaWtnS2lCb1lXNWtiR1ZrUTFCRGIzVnVkRkJzZFhOUGJtVTdYRzVjZEZ4MFhIUnVJRDBnYlR0Y2JseHVYSFJjZEZ4MFptOXlJQ2hxSUQwZ01Ec2dhaUE4SUdsdWNIVjBUR1Z1WjNSb095QXJLMm9wSUh0Y2JseDBYSFJjZEZ4MFkzVnljbVZ1ZEZaaGJIVmxJRDBnYVc1d2RYUmJhbDA3WEc1Y2JseDBYSFJjZEZ4MGFXWWdLR04xY25KbGJuUldZV3gxWlNBOElHNGdKaVlnS3l0a1pXeDBZU0ErSUcxaGVFbHVkQ2tnZTF4dVhIUmNkRngwWEhSY2RHVnljbTl5S0NkdmRtVnlabXh2ZHljcE8xeHVYSFJjZEZ4MFhIUjlYRzVjYmx4MFhIUmNkRngwYVdZZ0tHTjFjbkpsYm5SV1lXeDFaU0E5UFNCdUtTQjdYRzVjZEZ4MFhIUmNkRngwTHk4Z1VtVndjbVZ6Wlc1MElHUmxiSFJoSUdGeklHRWdaMlZ1WlhKaGJHbDZaV1FnZG1GeWFXRmliR1V0YkdWdVozUm9JR2x1ZEdWblpYSmNibHgwWEhSY2RGeDBYSFJtYjNJZ0tIRWdQU0JrWld4MFlTd2dheUE5SUdKaGMyVTdJQzhxSUc1dklHTnZibVJwZEdsdmJpQXFMenNnYXlBclBTQmlZWE5sS1NCN1hHNWNkRngwWEhSY2RGeDBYSFIwSUQwZ2F5QThQU0JpYVdGeklEOGdkRTFwYmlBNklDaHJJRDQ5SUdKcFlYTWdLeUIwVFdGNElEOGdkRTFoZUNBNklHc2dMU0JpYVdGektUdGNibHgwWEhSY2RGeDBYSFJjZEdsbUlDaHhJRHdnZENrZ2UxeHVYSFJjZEZ4MFhIUmNkRngwWEhSaWNtVmhhenRjYmx4MFhIUmNkRngwWEhSY2RIMWNibHgwWEhSY2RGeDBYSFJjZEhGTmFXNTFjMVFnUFNCeElDMGdkRHRjYmx4MFhIUmNkRngwWEhSY2RHSmhjMlZOYVc1MWMxUWdQU0JpWVhObElDMGdkRHRjYmx4MFhIUmNkRngwWEhSY2RHOTFkSEIxZEM1d2RYTm9LRnh1WEhSY2RGeDBYSFJjZEZ4MFhIUnpkSEpwYm1kR2NtOXRRMmhoY2tOdlpHVW9aR2xuYVhSVWIwSmhjMmxqS0hRZ0t5QnhUV2x1ZFhOVUlDVWdZbUZ6WlUxcGJuVnpWQ3dnTUNrcFhHNWNkRngwWEhSY2RGeDBYSFFwTzF4dVhIUmNkRngwWEhSY2RGeDBjU0E5SUdac2IyOXlLSEZOYVc1MWMxUWdMeUJpWVhObFRXbHVkWE5VS1R0Y2JseDBYSFJjZEZ4MFhIUjlYRzVjYmx4MFhIUmNkRngwWEhSdmRYUndkWFF1Y0hWemFDaHpkSEpwYm1kR2NtOXRRMmhoY2tOdlpHVW9aR2xuYVhSVWIwSmhjMmxqS0hFc0lEQXBLU2s3WEc1Y2RGeDBYSFJjZEZ4MFltbGhjeUE5SUdGa1lYQjBLR1JsYkhSaExDQm9ZVzVrYkdWa1ExQkRiM1Z1ZEZCc2RYTlBibVVzSUdoaGJtUnNaV1JEVUVOdmRXNTBJRDA5SUdKaGMybGpUR1Z1WjNSb0tUdGNibHgwWEhSY2RGeDBYSFJrWld4MFlTQTlJREE3WEc1Y2RGeDBYSFJjZEZ4MEt5dG9ZVzVrYkdWa1ExQkRiM1Z1ZER0Y2JseDBYSFJjZEZ4MGZWeHVYSFJjZEZ4MGZWeHVYRzVjZEZ4MFhIUXJLMlJsYkhSaE8xeHVYSFJjZEZ4MEt5dHVPMXh1WEc1Y2RGeDBmVnh1WEhSY2RISmxkSFZ5YmlCdmRYUndkWFF1YW05cGJpZ25KeWs3WEc1Y2RIMWNibHh1WEhRdktpcGNibHgwSUNvZ1EyOXVkbVZ5ZEhNZ1lTQlFkVzU1WTI5a1pTQnpkSEpwYm1jZ2NtVndjbVZ6Wlc1MGFXNW5JR0VnWkc5dFlXbHVJRzVoYldVZ2RHOGdWVzVwWTI5a1pTNGdUMjVzZVNCMGFHVmNibHgwSUNvZ1VIVnVlV052WkdWa0lIQmhjblJ6SUc5bUlIUm9aU0JrYjIxaGFXNGdibUZ0WlNCM2FXeHNJR0psSUdOdmJuWmxjblJsWkN3Z2FTNWxMaUJwZENCa2IyVnpiaWQwWEc1Y2RDQXFJRzFoZEhSbGNpQnBaaUI1YjNVZ1kyRnNiQ0JwZENCdmJpQmhJSE4wY21sdVp5QjBhR0YwSUdoaGN5QmhiSEpsWVdSNUlHSmxaVzRnWTI5dWRtVnlkR1ZrSUhSdlhHNWNkQ0FxSUZWdWFXTnZaR1V1WEc1Y2RDQXFJRUJ0WlcxaVpYSlBaaUJ3ZFc1NVkyOWtaVnh1WEhRZ0tpQkFjR0Z5WVcwZ2UxTjBjbWx1WjMwZ1pHOXRZV2x1SUZSb1pTQlFkVzU1WTI5a1pTQmtiMjFoYVc0Z2JtRnRaU0IwYnlCamIyNTJaWEowSUhSdklGVnVhV052WkdVdVhHNWNkQ0FxSUVCeVpYUjFjbTV6SUh0VGRISnBibWQ5SUZSb1pTQlZibWxqYjJSbElISmxjSEpsYzJWdWRHRjBhVzl1SUc5bUlIUm9aU0JuYVhabGJpQlFkVzU1WTI5a1pWeHVYSFFnS2lCemRISnBibWN1WEc1Y2RDQXFMMXh1WEhSbWRXNWpkR2x2YmlCMGIxVnVhV052WkdVb1pHOXRZV2x1S1NCN1hHNWNkRngwY21WMGRYSnVJRzFoY0VSdmJXRnBiaWhrYjIxaGFXNHNJR1oxYm1OMGFXOXVLSE4wY21sdVp5a2dlMXh1WEhSY2RGeDBjbVYwZFhKdUlISmxaMlY0VUhWdWVXTnZaR1V1ZEdWemRDaHpkSEpwYm1jcFhHNWNkRngwWEhSY2REOGdaR1ZqYjJSbEtITjBjbWx1Wnk1emJHbGpaU2cwS1M1MGIweHZkMlZ5UTJGelpTZ3BLVnh1WEhSY2RGeDBYSFE2SUhOMGNtbHVaenRjYmx4MFhIUjlLVHRjYmx4MGZWeHVYRzVjZEM4cUtseHVYSFFnS2lCRGIyNTJaWEowY3lCaElGVnVhV052WkdVZ2MzUnlhVzVuSUhKbGNISmxjMlZ1ZEdsdVp5QmhJR1J2YldGcGJpQnVZVzFsSUhSdklGQjFibmxqYjJSbExpQlBibXg1SUhSb1pWeHVYSFFnS2lCdWIyNHRRVk5EU1VrZ2NHRnlkSE1nYjJZZ2RHaGxJR1J2YldGcGJpQnVZVzFsSUhkcGJHd2dZbVVnWTI5dWRtVnlkR1ZrTENCcExtVXVJR2wwSUdSdlpYTnVKM1JjYmx4MElDb2diV0YwZEdWeUlHbG1JSGx2ZFNCallXeHNJR2wwSUhkcGRHZ2dZU0JrYjIxaGFXNGdkR2hoZENkeklHRnNjbVZoWkhrZ2FXNGdRVk5EU1VrdVhHNWNkQ0FxSUVCdFpXMWlaWEpQWmlCd2RXNTVZMjlrWlZ4dVhIUWdLaUJBY0dGeVlXMGdlMU4wY21sdVozMGdaRzl0WVdsdUlGUm9aU0JrYjIxaGFXNGdibUZ0WlNCMGJ5QmpiMjUyWlhKMExDQmhjeUJoSUZWdWFXTnZaR1VnYzNSeWFXNW5MbHh1WEhRZ0tpQkFjbVYwZFhKdWN5QjdVM1J5YVc1bmZTQlVhR1VnVUhWdWVXTnZaR1VnY21Wd2NtVnpaVzUwWVhScGIyNGdiMllnZEdobElHZHBkbVZ1SUdSdmJXRnBiaUJ1WVcxbExseHVYSFFnS2k5Y2JseDBablZ1WTNScGIyNGdkRzlCVTBOSlNTaGtiMjFoYVc0cElIdGNibHgwWEhSeVpYUjFjbTRnYldGd1JHOXRZV2x1S0dSdmJXRnBiaXdnWm5WdVkzUnBiMjRvYzNSeWFXNW5LU0I3WEc1Y2RGeDBYSFJ5WlhSMWNtNGdjbVZuWlhoT2IyNUJVME5KU1M1MFpYTjBLSE4wY21sdVp5bGNibHgwWEhSY2RGeDBQeUFuZUc0dExTY2dLeUJsYm1OdlpHVW9jM1J5YVc1bktWeHVYSFJjZEZ4MFhIUTZJSE4wY21sdVp6dGNibHgwWEhSOUtUdGNibHgwZlZ4dVhHNWNkQzhxTFMwdExTMHRMUzB0TFMwdExTMHRMUzB0TFMwdExTMHRMUzB0TFMwdExTMHRMUzB0TFMwdExTMHRMUzB0TFMwdExTMHRMUzB0TFMwdExTMHRMUzB0TFMwdExTMHRMUzB0TFMwcUwxeHVYRzVjZEM4cUtpQkVaV1pwYm1VZ2RHaGxJSEIxWW14cFl5QkJVRWtnS2k5Y2JseDBjSFZ1ZVdOdlpHVWdQU0I3WEc1Y2RGeDBMeW9xWEc1Y2RGeDBJQ29nUVNCemRISnBibWNnY21Wd2NtVnpaVzUwYVc1bklIUm9aU0JqZFhKeVpXNTBJRkIxYm5samIyUmxMbXB6SUhabGNuTnBiMjRnYm5WdFltVnlMbHh1WEhSY2RDQXFJRUJ0WlcxaVpYSlBaaUJ3ZFc1NVkyOWtaVnh1WEhSY2RDQXFJRUIwZVhCbElGTjBjbWx1WjF4dVhIUmNkQ0FxTDF4dVhIUmNkQ2QyWlhKemFXOXVKem9nSnpFdU1pNDBKeXhjYmx4MFhIUXZLaXBjYmx4MFhIUWdLaUJCYmlCdlltcGxZM1FnYjJZZ2JXVjBhRzlrY3lCMGJ5QmpiMjUyWlhKMElHWnliMjBnU21GMllWTmpjbWx3ZENkeklHbHVkR1Z5Ym1Gc0lHTm9ZWEpoWTNSbGNseHVYSFJjZENBcUlISmxjSEpsYzJWdWRHRjBhVzl1SUNoVlExTXRNaWtnZEc4Z1ZXNXBZMjlrWlNCamIyUmxJSEJ2YVc1MGN5d2dZVzVrSUdKaFkyc3VYRzVjZEZ4MElDb2dRSE5sWlNBOGFIUjBjRG92TDIxaGRHaHBZWE5pZVc1bGJuTXVZbVV2Ym05MFpYTXZhbUYyWVhOamNtbHdkQzFsYm1OdlpHbHVaejVjYmx4MFhIUWdLaUJBYldWdFltVnlUMllnY0hWdWVXTnZaR1ZjYmx4MFhIUWdLaUJBZEhsd1pTQlBZbXBsWTNSY2JseDBYSFFnS2k5Y2JseDBYSFFuZFdOek1pYzZJSHRjYmx4MFhIUmNkQ2RrWldOdlpHVW5PaUIxWTNNeVpHVmpiMlJsTEZ4dVhIUmNkRngwSjJWdVkyOWtaU2M2SUhWamN6SmxibU52WkdWY2JseDBYSFI5TEZ4dVhIUmNkQ2RrWldOdlpHVW5PaUJrWldOdlpHVXNYRzVjZEZ4MEoyVnVZMjlrWlNjNklHVnVZMjlrWlN4Y2JseDBYSFFuZEc5QlUwTkpTU2M2SUhSdlFWTkRTVWtzWEc1Y2RGeDBKM1J2Vlc1cFkyOWtaU2M2SUhSdlZXNXBZMjlrWlZ4dVhIUjlPMXh1WEc1Y2RDOHFLaUJGZUhCdmMyVWdZSEIxYm5samIyUmxZQ0FxTDF4dVhIUXZMeUJUYjIxbElFRk5SQ0JpZFdsc1pDQnZjSFJwYldsNlpYSnpMQ0JzYVd0bElISXVhbk1zSUdOb1pXTnJJR1p2Y2lCemNHVmphV1pwWXlCamIyNWthWFJwYjI0Z2NHRjBkR1Z5Ym5OY2JseDBMeThnYkdsclpTQjBhR1VnWm05c2JHOTNhVzVuT2x4dVhIUnBaaUFvWEc1Y2RGeDBkSGx3Wlc5bUlHUmxabWx1WlNBOVBTQW5ablZ1WTNScGIyNG5JQ1ltWEc1Y2RGeDBkSGx3Wlc5bUlHUmxabWx1WlM1aGJXUWdQVDBnSjI5aWFtVmpkQ2NnSmlaY2JseDBYSFJrWldacGJtVXVZVzFrWEc1Y2RDa2dlMXh1WEhSY2RHUmxabWx1WlNnbmNIVnVlV052WkdVbkxDQm1kVzVqZEdsdmJpZ3BJSHRjYmx4MFhIUmNkSEpsZEhWeWJpQndkVzU1WTI5a1pUdGNibHgwWEhSOUtUdGNibHgwZlNCbGJITmxJR2xtSUNobWNtVmxSWGh3YjNKMGN5QW1KaUFoWm5KbFpVVjRjRzl5ZEhNdWJtOWtaVlI1Y0dVcElIdGNibHgwWEhScFppQW9abkpsWlUxdlpIVnNaU2tnZXlBdkx5QnBiaUJPYjJSbExtcHpJRzl5SUZKcGJtZHZTbE1nZGpBdU9DNHdLMXh1WEhSY2RGeDBabkpsWlUxdlpIVnNaUzVsZUhCdmNuUnpJRDBnY0hWdWVXTnZaR1U3WEc1Y2RGeDBmU0JsYkhObElIc2dMeThnYVc0Z1RtRnlkMmhoYkNCdmNpQlNhVzVuYjBwVElIWXdMamN1TUMxY2JseDBYSFJjZEdadmNpQW9hMlY1SUdsdUlIQjFibmxqYjJSbEtTQjdYRzVjZEZ4MFhIUmNkSEIxYm5samIyUmxMbWhoYzA5M2JsQnliM0JsY25SNUtHdGxlU2tnSmlZZ0tHWnlaV1ZGZUhCdmNuUnpXMnRsZVYwZ1BTQndkVzU1WTI5a1pWdHJaWGxkS1R0Y2JseDBYSFJjZEgxY2JseDBYSFI5WEc1Y2RIMGdaV3h6WlNCN0lDOHZJR2x1SUZKb2FXNXZJRzl5SUdFZ2QyVmlJR0p5YjNkelpYSmNibHgwWEhSeWIyOTBMbkIxYm5samIyUmxJRDBnY0hWdWVXTnZaR1U3WEc1Y2RIMWNibHh1ZlNoMGFHbHpLU2s3WEc0aVhYMD0iLCIvLyBDb3B5cmlnaHQgSm95ZW50LCBJbmMuIGFuZCBvdGhlciBOb2RlIGNvbnRyaWJ1dG9ycy5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYVxuLy8gY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZVxuLy8gXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG4vLyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG4vLyBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0XG4vLyBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGVcbi8vIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4vLyBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4vLyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4vLyBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOXG4vLyBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSxcbi8vIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUlxuLy8gT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRVxuLy8gVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cblxuJ3VzZSBzdHJpY3QnO1xuXG4vLyBJZiBvYmouaGFzT3duUHJvcGVydHkgaGFzIGJlZW4gb3ZlcnJpZGRlbiwgdGhlbiBjYWxsaW5nXG4vLyBvYmouaGFzT3duUHJvcGVydHkocHJvcCkgd2lsbCBicmVhay5cbi8vIFNlZTogaHR0cHM6Ly9naXRodWIuY29tL2pveWVudC9ub2RlL2lzc3Vlcy8xNzA3XG5mdW5jdGlvbiBoYXNPd25Qcm9wZXJ0eShvYmosIHByb3ApIHtcbiAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmosIHByb3ApO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHFzLCBzZXAsIGVxLCBvcHRpb25zKSB7XG4gIHNlcCA9IHNlcCB8fCAnJic7XG4gIGVxID0gZXEgfHwgJz0nO1xuICB2YXIgb2JqID0ge307XG5cbiAgaWYgKHR5cGVvZiBxcyAhPT0gJ3N0cmluZycgfHwgcXMubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIG9iajtcbiAgfVxuXG4gIHZhciByZWdleHAgPSAvXFwrL2c7XG4gIHFzID0gcXMuc3BsaXQoc2VwKTtcblxuICB2YXIgbWF4S2V5cyA9IDEwMDA7XG4gIGlmIChvcHRpb25zICYmIHR5cGVvZiBvcHRpb25zLm1heEtleXMgPT09ICdudW1iZXInKSB7XG4gICAgbWF4S2V5cyA9IG9wdGlvbnMubWF4S2V5cztcbiAgfVxuXG4gIHZhciBsZW4gPSBxcy5sZW5ndGg7XG4gIC8vIG1heEtleXMgPD0gMCBtZWFucyB0aGF0IHdlIHNob3VsZCBub3QgbGltaXQga2V5cyBjb3VudFxuICBpZiAobWF4S2V5cyA+IDAgJiYgbGVuID4gbWF4S2V5cykge1xuICAgIGxlbiA9IG1heEtleXM7XG4gIH1cblxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgKytpKSB7XG4gICAgdmFyIHggPSBxc1tpXS5yZXBsYWNlKHJlZ2V4cCwgJyUyMCcpLFxuICAgICAgICBpZHggPSB4LmluZGV4T2YoZXEpLFxuICAgICAgICBrc3RyLCB2c3RyLCBrLCB2O1xuXG4gICAgaWYgKGlkeCA+PSAwKSB7XG4gICAgICBrc3RyID0geC5zdWJzdHIoMCwgaWR4KTtcbiAgICAgIHZzdHIgPSB4LnN1YnN0cihpZHggKyAxKTtcbiAgICB9IGVsc2Uge1xuICAgICAga3N0ciA9IHg7XG4gICAgICB2c3RyID0gJyc7XG4gICAgfVxuXG4gICAgayA9IGRlY29kZVVSSUNvbXBvbmVudChrc3RyKTtcbiAgICB2ID0gZGVjb2RlVVJJQ29tcG9uZW50KHZzdHIpO1xuXG4gICAgaWYgKCFoYXNPd25Qcm9wZXJ0eShvYmosIGspKSB7XG4gICAgICBvYmpba10gPSB2O1xuICAgIH0gZWxzZSBpZiAoaXNBcnJheShvYmpba10pKSB7XG4gICAgICBvYmpba10ucHVzaCh2KTtcbiAgICB9IGVsc2Uge1xuICAgICAgb2JqW2tdID0gW29ialtrXSwgdl07XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG9iajtcbn07XG5cbnZhciBpc0FycmF5ID0gQXJyYXkuaXNBcnJheSB8fCBmdW5jdGlvbiAoeHMpIHtcbiAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh4cykgPT09ICdbb2JqZWN0IEFycmF5XSc7XG59O1xuIiwiLy8gQ29weXJpZ2h0IEpveWVudCwgSW5jLiBhbmQgb3RoZXIgTm9kZSBjb250cmlidXRvcnMuXG4vL1xuLy8gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGFcbi8vIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGVcbi8vIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZ1xuLy8gd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLFxuLy8gZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdFxuLy8gcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlXG4vLyBmb2xsb3dpbmcgY29uZGl0aW9uczpcbi8vXG4vLyBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZFxuLy8gaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4vL1xuLy8gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTU1xuLy8gT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRlxuLy8gTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTlxuLy8gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sXG4vLyBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1Jcbi8vIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEVcbi8vIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIHN0cmluZ2lmeVByaW1pdGl2ZSA9IGZ1bmN0aW9uKHYpIHtcbiAgc3dpdGNoICh0eXBlb2Ygdikge1xuICAgIGNhc2UgJ3N0cmluZyc6XG4gICAgICByZXR1cm4gdjtcblxuICAgIGNhc2UgJ2Jvb2xlYW4nOlxuICAgICAgcmV0dXJuIHYgPyAndHJ1ZScgOiAnZmFsc2UnO1xuXG4gICAgY2FzZSAnbnVtYmVyJzpcbiAgICAgIHJldHVybiBpc0Zpbml0ZSh2KSA/IHYgOiAnJztcblxuICAgIGRlZmF1bHQ6XG4gICAgICByZXR1cm4gJyc7XG4gIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24ob2JqLCBzZXAsIGVxLCBuYW1lKSB7XG4gIHNlcCA9IHNlcCB8fCAnJic7XG4gIGVxID0gZXEgfHwgJz0nO1xuICBpZiAob2JqID09PSBudWxsKSB7XG4gICAgb2JqID0gdW5kZWZpbmVkO1xuICB9XG5cbiAgaWYgKHR5cGVvZiBvYmogPT09ICdvYmplY3QnKSB7XG4gICAgcmV0dXJuIG1hcChvYmplY3RLZXlzKG9iaiksIGZ1bmN0aW9uKGspIHtcbiAgICAgIHZhciBrcyA9IGVuY29kZVVSSUNvbXBvbmVudChzdHJpbmdpZnlQcmltaXRpdmUoaykpICsgZXE7XG4gICAgICBpZiAoaXNBcnJheShvYmpba10pKSB7XG4gICAgICAgIHJldHVybiBtYXAob2JqW2tdLCBmdW5jdGlvbih2KSB7XG4gICAgICAgICAgcmV0dXJuIGtzICsgZW5jb2RlVVJJQ29tcG9uZW50KHN0cmluZ2lmeVByaW1pdGl2ZSh2KSk7XG4gICAgICAgIH0pLmpvaW4oc2VwKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBrcyArIGVuY29kZVVSSUNvbXBvbmVudChzdHJpbmdpZnlQcmltaXRpdmUob2JqW2tdKSk7XG4gICAgICB9XG4gICAgfSkuam9pbihzZXApO1xuXG4gIH1cblxuICBpZiAoIW5hbWUpIHJldHVybiAnJztcbiAgcmV0dXJuIGVuY29kZVVSSUNvbXBvbmVudChzdHJpbmdpZnlQcmltaXRpdmUobmFtZSkpICsgZXEgK1xuICAgICAgICAgZW5jb2RlVVJJQ29tcG9uZW50KHN0cmluZ2lmeVByaW1pdGl2ZShvYmopKTtcbn07XG5cbnZhciBpc0FycmF5ID0gQXJyYXkuaXNBcnJheSB8fCBmdW5jdGlvbiAoeHMpIHtcbiAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh4cykgPT09ICdbb2JqZWN0IEFycmF5XSc7XG59O1xuXG5mdW5jdGlvbiBtYXAgKHhzLCBmKSB7XG4gIGlmICh4cy5tYXApIHJldHVybiB4cy5tYXAoZik7XG4gIHZhciByZXMgPSBbXTtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCB4cy5sZW5ndGg7IGkrKykge1xuICAgIHJlcy5wdXNoKGYoeHNbaV0sIGkpKTtcbiAgfVxuICByZXR1cm4gcmVzO1xufVxuXG52YXIgb2JqZWN0S2V5cyA9IE9iamVjdC5rZXlzIHx8IGZ1bmN0aW9uIChvYmopIHtcbiAgdmFyIHJlcyA9IFtdO1xuICBmb3IgKHZhciBrZXkgaW4gb2JqKSB7XG4gICAgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmosIGtleSkpIHJlcy5wdXNoKGtleSk7XG4gIH1cbiAgcmV0dXJuIHJlcztcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbmV4cG9ydHMuZGVjb2RlID0gZXhwb3J0cy5wYXJzZSA9IHJlcXVpcmUoJy4vZGVjb2RlJyk7XG5leHBvcnRzLmVuY29kZSA9IGV4cG9ydHMuc3RyaW5naWZ5ID0gcmVxdWlyZSgnLi9lbmNvZGUnKTtcbiIsIi8vIENvcHlyaWdodCBKb3llbnQsIEluYy4gYW5kIG90aGVyIE5vZGUgY29udHJpYnV0b3JzLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhXG4vLyBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4vLyBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbi8vIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbi8vIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXRcbi8vIHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZVxuLy8gZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbi8vIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1Ncbi8vIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0Zcbi8vIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU5cbi8vIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLFxuLy8gREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SXG4vLyBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFXG4vLyBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG52YXIgcHVueWNvZGUgPSByZXF1aXJlKCdwdW55Y29kZScpO1xuXG5leHBvcnRzLnBhcnNlID0gdXJsUGFyc2U7XG5leHBvcnRzLnJlc29sdmUgPSB1cmxSZXNvbHZlO1xuZXhwb3J0cy5yZXNvbHZlT2JqZWN0ID0gdXJsUmVzb2x2ZU9iamVjdDtcbmV4cG9ydHMuZm9ybWF0ID0gdXJsRm9ybWF0O1xuXG5leHBvcnRzLlVybCA9IFVybDtcblxuZnVuY3Rpb24gVXJsKCkge1xuICB0aGlzLnByb3RvY29sID0gbnVsbDtcbiAgdGhpcy5zbGFzaGVzID0gbnVsbDtcbiAgdGhpcy5hdXRoID0gbnVsbDtcbiAgdGhpcy5ob3N0ID0gbnVsbDtcbiAgdGhpcy5wb3J0ID0gbnVsbDtcbiAgdGhpcy5ob3N0bmFtZSA9IG51bGw7XG4gIHRoaXMuaGFzaCA9IG51bGw7XG4gIHRoaXMuc2VhcmNoID0gbnVsbDtcbiAgdGhpcy5xdWVyeSA9IG51bGw7XG4gIHRoaXMucGF0aG5hbWUgPSBudWxsO1xuICB0aGlzLnBhdGggPSBudWxsO1xuICB0aGlzLmhyZWYgPSBudWxsO1xufVxuXG4vLyBSZWZlcmVuY2U6IFJGQyAzOTg2LCBSRkMgMTgwOCwgUkZDIDIzOTZcblxuLy8gZGVmaW5lIHRoZXNlIGhlcmUgc28gYXQgbGVhc3QgdGhleSBvbmx5IGhhdmUgdG8gYmVcbi8vIGNvbXBpbGVkIG9uY2Ugb24gdGhlIGZpcnN0IG1vZHVsZSBsb2FkLlxudmFyIHByb3RvY29sUGF0dGVybiA9IC9eKFthLXowLTkuKy1dKzopL2ksXG4gICAgcG9ydFBhdHRlcm4gPSAvOlswLTldKiQvLFxuXG4gICAgLy8gUkZDIDIzOTY6IGNoYXJhY3RlcnMgcmVzZXJ2ZWQgZm9yIGRlbGltaXRpbmcgVVJMcy5cbiAgICAvLyBXZSBhY3R1YWxseSBqdXN0IGF1dG8tZXNjYXBlIHRoZXNlLlxuICAgIGRlbGltcyA9IFsnPCcsICc+JywgJ1wiJywgJ2AnLCAnICcsICdcXHInLCAnXFxuJywgJ1xcdCddLFxuXG4gICAgLy8gUkZDIDIzOTY6IGNoYXJhY3RlcnMgbm90IGFsbG93ZWQgZm9yIHZhcmlvdXMgcmVhc29ucy5cbiAgICB1bndpc2UgPSBbJ3snLCAnfScsICd8JywgJ1xcXFwnLCAnXicsICdgJ10uY29uY2F0KGRlbGltcyksXG5cbiAgICAvLyBBbGxvd2VkIGJ5IFJGQ3MsIGJ1dCBjYXVzZSBvZiBYU1MgYXR0YWNrcy4gIEFsd2F5cyBlc2NhcGUgdGhlc2UuXG4gICAgYXV0b0VzY2FwZSA9IFsnXFwnJ10uY29uY2F0KHVud2lzZSksXG4gICAgLy8gQ2hhcmFjdGVycyB0aGF0IGFyZSBuZXZlciBldmVyIGFsbG93ZWQgaW4gYSBob3N0bmFtZS5cbiAgICAvLyBOb3RlIHRoYXQgYW55IGludmFsaWQgY2hhcnMgYXJlIGFsc28gaGFuZGxlZCwgYnV0IHRoZXNlXG4gICAgLy8gYXJlIHRoZSBvbmVzIHRoYXQgYXJlICpleHBlY3RlZCogdG8gYmUgc2Vlbiwgc28gd2UgZmFzdC1wYXRoXG4gICAgLy8gdGhlbS5cbiAgICBub25Ib3N0Q2hhcnMgPSBbJyUnLCAnLycsICc/JywgJzsnLCAnIyddLmNvbmNhdChhdXRvRXNjYXBlKSxcbiAgICBob3N0RW5kaW5nQ2hhcnMgPSBbJy8nLCAnPycsICcjJ10sXG4gICAgaG9zdG5hbWVNYXhMZW4gPSAyNTUsXG4gICAgaG9zdG5hbWVQYXJ0UGF0dGVybiA9IC9eW2EtejAtOUEtWl8tXXswLDYzfSQvLFxuICAgIGhvc3RuYW1lUGFydFN0YXJ0ID0gL14oW2EtejAtOUEtWl8tXXswLDYzfSkoLiopJC8sXG4gICAgLy8gcHJvdG9jb2xzIHRoYXQgY2FuIGFsbG93IFwidW5zYWZlXCIgYW5kIFwidW53aXNlXCIgY2hhcnMuXG4gICAgdW5zYWZlUHJvdG9jb2wgPSB7XG4gICAgICAnamF2YXNjcmlwdCc6IHRydWUsXG4gICAgICAnamF2YXNjcmlwdDonOiB0cnVlXG4gICAgfSxcbiAgICAvLyBwcm90b2NvbHMgdGhhdCBuZXZlciBoYXZlIGEgaG9zdG5hbWUuXG4gICAgaG9zdGxlc3NQcm90b2NvbCA9IHtcbiAgICAgICdqYXZhc2NyaXB0JzogdHJ1ZSxcbiAgICAgICdqYXZhc2NyaXB0Oic6IHRydWVcbiAgICB9LFxuICAgIC8vIHByb3RvY29scyB0aGF0IGFsd2F5cyBjb250YWluIGEgLy8gYml0LlxuICAgIHNsYXNoZWRQcm90b2NvbCA9IHtcbiAgICAgICdodHRwJzogdHJ1ZSxcbiAgICAgICdodHRwcyc6IHRydWUsXG4gICAgICAnZnRwJzogdHJ1ZSxcbiAgICAgICdnb3BoZXInOiB0cnVlLFxuICAgICAgJ2ZpbGUnOiB0cnVlLFxuICAgICAgJ2h0dHA6JzogdHJ1ZSxcbiAgICAgICdodHRwczonOiB0cnVlLFxuICAgICAgJ2Z0cDonOiB0cnVlLFxuICAgICAgJ2dvcGhlcjonOiB0cnVlLFxuICAgICAgJ2ZpbGU6JzogdHJ1ZVxuICAgIH0sXG4gICAgcXVlcnlzdHJpbmcgPSByZXF1aXJlKCdxdWVyeXN0cmluZycpO1xuXG5mdW5jdGlvbiB1cmxQYXJzZSh1cmwsIHBhcnNlUXVlcnlTdHJpbmcsIHNsYXNoZXNEZW5vdGVIb3N0KSB7XG4gIGlmICh1cmwgJiYgaXNPYmplY3QodXJsKSAmJiB1cmwgaW5zdGFuY2VvZiBVcmwpIHJldHVybiB1cmw7XG5cbiAgdmFyIHUgPSBuZXcgVXJsO1xuICB1LnBhcnNlKHVybCwgcGFyc2VRdWVyeVN0cmluZywgc2xhc2hlc0Rlbm90ZUhvc3QpO1xuICByZXR1cm4gdTtcbn1cblxuVXJsLnByb3RvdHlwZS5wYXJzZSA9IGZ1bmN0aW9uKHVybCwgcGFyc2VRdWVyeVN0cmluZywgc2xhc2hlc0Rlbm90ZUhvc3QpIHtcbiAgaWYgKCFpc1N0cmluZyh1cmwpKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIlBhcmFtZXRlciAndXJsJyBtdXN0IGJlIGEgc3RyaW5nLCBub3QgXCIgKyB0eXBlb2YgdXJsKTtcbiAgfVxuXG4gIHZhciByZXN0ID0gdXJsO1xuXG4gIC8vIHRyaW0gYmVmb3JlIHByb2NlZWRpbmcuXG4gIC8vIFRoaXMgaXMgdG8gc3VwcG9ydCBwYXJzZSBzdHVmZiBsaWtlIFwiICBodHRwOi8vZm9vLmNvbSAgXFxuXCJcbiAgcmVzdCA9IHJlc3QudHJpbSgpO1xuXG4gIHZhciBwcm90byA9IHByb3RvY29sUGF0dGVybi5leGVjKHJlc3QpO1xuICBpZiAocHJvdG8pIHtcbiAgICBwcm90byA9IHByb3RvWzBdO1xuICAgIHZhciBsb3dlclByb3RvID0gcHJvdG8udG9Mb3dlckNhc2UoKTtcbiAgICB0aGlzLnByb3RvY29sID0gbG93ZXJQcm90bztcbiAgICByZXN0ID0gcmVzdC5zdWJzdHIocHJvdG8ubGVuZ3RoKTtcbiAgfVxuXG4gIC8vIGZpZ3VyZSBvdXQgaWYgaXQncyBnb3QgYSBob3N0XG4gIC8vIHVzZXJAc2VydmVyIGlzICphbHdheXMqIGludGVycHJldGVkIGFzIGEgaG9zdG5hbWUsIGFuZCB1cmxcbiAgLy8gcmVzb2x1dGlvbiB3aWxsIHRyZWF0IC8vZm9vL2JhciBhcyBob3N0PWZvbyxwYXRoPWJhciBiZWNhdXNlIHRoYXQnc1xuICAvLyBob3cgdGhlIGJyb3dzZXIgcmVzb2x2ZXMgcmVsYXRpdmUgVVJMcy5cbiAgaWYgKHNsYXNoZXNEZW5vdGVIb3N0IHx8IHByb3RvIHx8IHJlc3QubWF0Y2goL15cXC9cXC9bXkBcXC9dK0BbXkBcXC9dKy8pKSB7XG4gICAgdmFyIHNsYXNoZXMgPSByZXN0LnN1YnN0cigwLCAyKSA9PT0gJy8vJztcbiAgICBpZiAoc2xhc2hlcyAmJiAhKHByb3RvICYmIGhvc3RsZXNzUHJvdG9jb2xbcHJvdG9dKSkge1xuICAgICAgcmVzdCA9IHJlc3Quc3Vic3RyKDIpO1xuICAgICAgdGhpcy5zbGFzaGVzID0gdHJ1ZTtcbiAgICB9XG4gIH1cblxuICBpZiAoIWhvc3RsZXNzUHJvdG9jb2xbcHJvdG9dICYmXG4gICAgICAoc2xhc2hlcyB8fCAocHJvdG8gJiYgIXNsYXNoZWRQcm90b2NvbFtwcm90b10pKSkge1xuXG4gICAgLy8gdGhlcmUncyBhIGhvc3RuYW1lLlxuICAgIC8vIHRoZSBmaXJzdCBpbnN0YW5jZSBvZiAvLCA/LCA7LCBvciAjIGVuZHMgdGhlIGhvc3QuXG4gICAgLy9cbiAgICAvLyBJZiB0aGVyZSBpcyBhbiBAIGluIHRoZSBob3N0bmFtZSwgdGhlbiBub24taG9zdCBjaGFycyAqYXJlKiBhbGxvd2VkXG4gICAgLy8gdG8gdGhlIGxlZnQgb2YgdGhlIGxhc3QgQCBzaWduLCB1bmxlc3Mgc29tZSBob3N0LWVuZGluZyBjaGFyYWN0ZXJcbiAgICAvLyBjb21lcyAqYmVmb3JlKiB0aGUgQC1zaWduLlxuICAgIC8vIFVSTHMgYXJlIG9ibm94aW91cy5cbiAgICAvL1xuICAgIC8vIGV4OlxuICAgIC8vIGh0dHA6Ly9hQGJAYy8gPT4gdXNlcjphQGIgaG9zdDpjXG4gICAgLy8gaHR0cDovL2FAYj9AYyA9PiB1c2VyOmEgaG9zdDpjIHBhdGg6Lz9AY1xuXG4gICAgLy8gdjAuMTIgVE9ETyhpc2FhY3MpOiBUaGlzIGlzIG5vdCBxdWl0ZSBob3cgQ2hyb21lIGRvZXMgdGhpbmdzLlxuICAgIC8vIFJldmlldyBvdXIgdGVzdCBjYXNlIGFnYWluc3QgYnJvd3NlcnMgbW9yZSBjb21wcmVoZW5zaXZlbHkuXG5cbiAgICAvLyBmaW5kIHRoZSBmaXJzdCBpbnN0YW5jZSBvZiBhbnkgaG9zdEVuZGluZ0NoYXJzXG4gICAgdmFyIGhvc3RFbmQgPSAtMTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGhvc3RFbmRpbmdDaGFycy5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIGhlYyA9IHJlc3QuaW5kZXhPZihob3N0RW5kaW5nQ2hhcnNbaV0pO1xuICAgICAgaWYgKGhlYyAhPT0gLTEgJiYgKGhvc3RFbmQgPT09IC0xIHx8IGhlYyA8IGhvc3RFbmQpKVxuICAgICAgICBob3N0RW5kID0gaGVjO1xuICAgIH1cblxuICAgIC8vIGF0IHRoaXMgcG9pbnQsIGVpdGhlciB3ZSBoYXZlIGFuIGV4cGxpY2l0IHBvaW50IHdoZXJlIHRoZVxuICAgIC8vIGF1dGggcG9ydGlvbiBjYW5ub3QgZ28gcGFzdCwgb3IgdGhlIGxhc3QgQCBjaGFyIGlzIHRoZSBkZWNpZGVyLlxuICAgIHZhciBhdXRoLCBhdFNpZ247XG4gICAgaWYgKGhvc3RFbmQgPT09IC0xKSB7XG4gICAgICAvLyBhdFNpZ24gY2FuIGJlIGFueXdoZXJlLlxuICAgICAgYXRTaWduID0gcmVzdC5sYXN0SW5kZXhPZignQCcpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBhdFNpZ24gbXVzdCBiZSBpbiBhdXRoIHBvcnRpb24uXG4gICAgICAvLyBodHRwOi8vYUBiL2NAZCA9PiBob3N0OmIgYXV0aDphIHBhdGg6L2NAZFxuICAgICAgYXRTaWduID0gcmVzdC5sYXN0SW5kZXhPZignQCcsIGhvc3RFbmQpO1xuICAgIH1cblxuICAgIC8vIE5vdyB3ZSBoYXZlIGEgcG9ydGlvbiB3aGljaCBpcyBkZWZpbml0ZWx5IHRoZSBhdXRoLlxuICAgIC8vIFB1bGwgdGhhdCBvZmYuXG4gICAgaWYgKGF0U2lnbiAhPT0gLTEpIHtcbiAgICAgIGF1dGggPSByZXN0LnNsaWNlKDAsIGF0U2lnbik7XG4gICAgICByZXN0ID0gcmVzdC5zbGljZShhdFNpZ24gKyAxKTtcbiAgICAgIHRoaXMuYXV0aCA9IGRlY29kZVVSSUNvbXBvbmVudChhdXRoKTtcbiAgICB9XG5cbiAgICAvLyB0aGUgaG9zdCBpcyB0aGUgcmVtYWluaW5nIHRvIHRoZSBsZWZ0IG9mIHRoZSBmaXJzdCBub24taG9zdCBjaGFyXG4gICAgaG9zdEVuZCA9IC0xO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbm9uSG9zdENoYXJzLmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgaGVjID0gcmVzdC5pbmRleE9mKG5vbkhvc3RDaGFyc1tpXSk7XG4gICAgICBpZiAoaGVjICE9PSAtMSAmJiAoaG9zdEVuZCA9PT0gLTEgfHwgaGVjIDwgaG9zdEVuZCkpXG4gICAgICAgIGhvc3RFbmQgPSBoZWM7XG4gICAgfVxuICAgIC8vIGlmIHdlIHN0aWxsIGhhdmUgbm90IGhpdCBpdCwgdGhlbiB0aGUgZW50aXJlIHRoaW5nIGlzIGEgaG9zdC5cbiAgICBpZiAoaG9zdEVuZCA9PT0gLTEpXG4gICAgICBob3N0RW5kID0gcmVzdC5sZW5ndGg7XG5cbiAgICB0aGlzLmhvc3QgPSByZXN0LnNsaWNlKDAsIGhvc3RFbmQpO1xuICAgIHJlc3QgPSByZXN0LnNsaWNlKGhvc3RFbmQpO1xuXG4gICAgLy8gcHVsbCBvdXQgcG9ydC5cbiAgICB0aGlzLnBhcnNlSG9zdCgpO1xuXG4gICAgLy8gd2UndmUgaW5kaWNhdGVkIHRoYXQgdGhlcmUgaXMgYSBob3N0bmFtZSxcbiAgICAvLyBzbyBldmVuIGlmIGl0J3MgZW1wdHksIGl0IGhhcyB0byBiZSBwcmVzZW50LlxuICAgIHRoaXMuaG9zdG5hbWUgPSB0aGlzLmhvc3RuYW1lIHx8ICcnO1xuXG4gICAgLy8gaWYgaG9zdG5hbWUgYmVnaW5zIHdpdGggWyBhbmQgZW5kcyB3aXRoIF1cbiAgICAvLyBhc3N1bWUgdGhhdCBpdCdzIGFuIElQdjYgYWRkcmVzcy5cbiAgICB2YXIgaXB2Nkhvc3RuYW1lID0gdGhpcy5ob3N0bmFtZVswXSA9PT0gJ1snICYmXG4gICAgICAgIHRoaXMuaG9zdG5hbWVbdGhpcy5ob3N0bmFtZS5sZW5ndGggLSAxXSA9PT0gJ10nO1xuXG4gICAgLy8gdmFsaWRhdGUgYSBsaXR0bGUuXG4gICAgaWYgKCFpcHY2SG9zdG5hbWUpIHtcbiAgICAgIHZhciBob3N0cGFydHMgPSB0aGlzLmhvc3RuYW1lLnNwbGl0KC9cXC4vKTtcbiAgICAgIGZvciAodmFyIGkgPSAwLCBsID0gaG9zdHBhcnRzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICB2YXIgcGFydCA9IGhvc3RwYXJ0c1tpXTtcbiAgICAgICAgaWYgKCFwYXJ0KSBjb250aW51ZTtcbiAgICAgICAgaWYgKCFwYXJ0Lm1hdGNoKGhvc3RuYW1lUGFydFBhdHRlcm4pKSB7XG4gICAgICAgICAgdmFyIG5ld3BhcnQgPSAnJztcbiAgICAgICAgICBmb3IgKHZhciBqID0gMCwgayA9IHBhcnQubGVuZ3RoOyBqIDwgazsgaisrKSB7XG4gICAgICAgICAgICBpZiAocGFydC5jaGFyQ29kZUF0KGopID4gMTI3KSB7XG4gICAgICAgICAgICAgIC8vIHdlIHJlcGxhY2Ugbm9uLUFTQ0lJIGNoYXIgd2l0aCBhIHRlbXBvcmFyeSBwbGFjZWhvbGRlclxuICAgICAgICAgICAgICAvLyB3ZSBuZWVkIHRoaXMgdG8gbWFrZSBzdXJlIHNpemUgb2YgaG9zdG5hbWUgaXMgbm90XG4gICAgICAgICAgICAgIC8vIGJyb2tlbiBieSByZXBsYWNpbmcgbm9uLUFTQ0lJIGJ5IG5vdGhpbmdcbiAgICAgICAgICAgICAgbmV3cGFydCArPSAneCc7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBuZXdwYXJ0ICs9IHBhcnRbal07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIC8vIHdlIHRlc3QgYWdhaW4gd2l0aCBBU0NJSSBjaGFyIG9ubHlcbiAgICAgICAgICBpZiAoIW5ld3BhcnQubWF0Y2goaG9zdG5hbWVQYXJ0UGF0dGVybikpIHtcbiAgICAgICAgICAgIHZhciB2YWxpZFBhcnRzID0gaG9zdHBhcnRzLnNsaWNlKDAsIGkpO1xuICAgICAgICAgICAgdmFyIG5vdEhvc3QgPSBob3N0cGFydHMuc2xpY2UoaSArIDEpO1xuICAgICAgICAgICAgdmFyIGJpdCA9IHBhcnQubWF0Y2goaG9zdG5hbWVQYXJ0U3RhcnQpO1xuICAgICAgICAgICAgaWYgKGJpdCkge1xuICAgICAgICAgICAgICB2YWxpZFBhcnRzLnB1c2goYml0WzFdKTtcbiAgICAgICAgICAgICAgbm90SG9zdC51bnNoaWZ0KGJpdFsyXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAobm90SG9zdC5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgcmVzdCA9ICcvJyArIG5vdEhvc3Quam9pbignLicpICsgcmVzdDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuaG9zdG5hbWUgPSB2YWxpZFBhcnRzLmpvaW4oJy4nKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmICh0aGlzLmhvc3RuYW1lLmxlbmd0aCA+IGhvc3RuYW1lTWF4TGVuKSB7XG4gICAgICB0aGlzLmhvc3RuYW1lID0gJyc7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIGhvc3RuYW1lcyBhcmUgYWx3YXlzIGxvd2VyIGNhc2UuXG4gICAgICB0aGlzLmhvc3RuYW1lID0gdGhpcy5ob3N0bmFtZS50b0xvd2VyQ2FzZSgpO1xuICAgIH1cblxuICAgIGlmICghaXB2Nkhvc3RuYW1lKSB7XG4gICAgICAvLyBJRE5BIFN1cHBvcnQ6IFJldHVybnMgYSBwdW55IGNvZGVkIHJlcHJlc2VudGF0aW9uIG9mIFwiZG9tYWluXCIuXG4gICAgICAvLyBJdCBvbmx5IGNvbnZlcnRzIHRoZSBwYXJ0IG9mIHRoZSBkb21haW4gbmFtZSB0aGF0XG4gICAgICAvLyBoYXMgbm9uIEFTQ0lJIGNoYXJhY3RlcnMuIEkuZS4gaXQgZG9zZW50IG1hdHRlciBpZlxuICAgICAgLy8geW91IGNhbGwgaXQgd2l0aCBhIGRvbWFpbiB0aGF0IGFscmVhZHkgaXMgaW4gQVNDSUkuXG4gICAgICB2YXIgZG9tYWluQXJyYXkgPSB0aGlzLmhvc3RuYW1lLnNwbGl0KCcuJyk7XG4gICAgICB2YXIgbmV3T3V0ID0gW107XG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGRvbWFpbkFycmF5Lmxlbmd0aDsgKytpKSB7XG4gICAgICAgIHZhciBzID0gZG9tYWluQXJyYXlbaV07XG4gICAgICAgIG5ld091dC5wdXNoKHMubWF0Y2goL1teQS1aYS16MC05Xy1dLykgP1xuICAgICAgICAgICAgJ3huLS0nICsgcHVueWNvZGUuZW5jb2RlKHMpIDogcyk7XG4gICAgICB9XG4gICAgICB0aGlzLmhvc3RuYW1lID0gbmV3T3V0LmpvaW4oJy4nKTtcbiAgICB9XG5cbiAgICB2YXIgcCA9IHRoaXMucG9ydCA/ICc6JyArIHRoaXMucG9ydCA6ICcnO1xuICAgIHZhciBoID0gdGhpcy5ob3N0bmFtZSB8fCAnJztcbiAgICB0aGlzLmhvc3QgPSBoICsgcDtcbiAgICB0aGlzLmhyZWYgKz0gdGhpcy5ob3N0O1xuXG4gICAgLy8gc3RyaXAgWyBhbmQgXSBmcm9tIHRoZSBob3N0bmFtZVxuICAgIC8vIHRoZSBob3N0IGZpZWxkIHN0aWxsIHJldGFpbnMgdGhlbSwgdGhvdWdoXG4gICAgaWYgKGlwdjZIb3N0bmFtZSkge1xuICAgICAgdGhpcy5ob3N0bmFtZSA9IHRoaXMuaG9zdG5hbWUuc3Vic3RyKDEsIHRoaXMuaG9zdG5hbWUubGVuZ3RoIC0gMik7XG4gICAgICBpZiAocmVzdFswXSAhPT0gJy8nKSB7XG4gICAgICAgIHJlc3QgPSAnLycgKyByZXN0O1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8vIG5vdyByZXN0IGlzIHNldCB0byB0aGUgcG9zdC1ob3N0IHN0dWZmLlxuICAvLyBjaG9wIG9mZiBhbnkgZGVsaW0gY2hhcnMuXG4gIGlmICghdW5zYWZlUHJvdG9jb2xbbG93ZXJQcm90b10pIHtcblxuICAgIC8vIEZpcnN0LCBtYWtlIDEwMCUgc3VyZSB0aGF0IGFueSBcImF1dG9Fc2NhcGVcIiBjaGFycyBnZXRcbiAgICAvLyBlc2NhcGVkLCBldmVuIGlmIGVuY29kZVVSSUNvbXBvbmVudCBkb2Vzbid0IHRoaW5rIHRoZXlcbiAgICAvLyBuZWVkIHRvIGJlLlxuICAgIGZvciAodmFyIGkgPSAwLCBsID0gYXV0b0VzY2FwZS5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgIHZhciBhZSA9IGF1dG9Fc2NhcGVbaV07XG4gICAgICB2YXIgZXNjID0gZW5jb2RlVVJJQ29tcG9uZW50KGFlKTtcbiAgICAgIGlmIChlc2MgPT09IGFlKSB7XG4gICAgICAgIGVzYyA9IGVzY2FwZShhZSk7XG4gICAgICB9XG4gICAgICByZXN0ID0gcmVzdC5zcGxpdChhZSkuam9pbihlc2MpO1xuICAgIH1cbiAgfVxuXG5cbiAgLy8gY2hvcCBvZmYgZnJvbSB0aGUgdGFpbCBmaXJzdC5cbiAgdmFyIGhhc2ggPSByZXN0LmluZGV4T2YoJyMnKTtcbiAgaWYgKGhhc2ggIT09IC0xKSB7XG4gICAgLy8gZ290IGEgZnJhZ21lbnQgc3RyaW5nLlxuICAgIHRoaXMuaGFzaCA9IHJlc3Quc3Vic3RyKGhhc2gpO1xuICAgIHJlc3QgPSByZXN0LnNsaWNlKDAsIGhhc2gpO1xuICB9XG4gIHZhciBxbSA9IHJlc3QuaW5kZXhPZignPycpO1xuICBpZiAocW0gIT09IC0xKSB7XG4gICAgdGhpcy5zZWFyY2ggPSByZXN0LnN1YnN0cihxbSk7XG4gICAgdGhpcy5xdWVyeSA9IHJlc3Quc3Vic3RyKHFtICsgMSk7XG4gICAgaWYgKHBhcnNlUXVlcnlTdHJpbmcpIHtcbiAgICAgIHRoaXMucXVlcnkgPSBxdWVyeXN0cmluZy5wYXJzZSh0aGlzLnF1ZXJ5KTtcbiAgICB9XG4gICAgcmVzdCA9IHJlc3Quc2xpY2UoMCwgcW0pO1xuICB9IGVsc2UgaWYgKHBhcnNlUXVlcnlTdHJpbmcpIHtcbiAgICAvLyBubyBxdWVyeSBzdHJpbmcsIGJ1dCBwYXJzZVF1ZXJ5U3RyaW5nIHN0aWxsIHJlcXVlc3RlZFxuICAgIHRoaXMuc2VhcmNoID0gJyc7XG4gICAgdGhpcy5xdWVyeSA9IHt9O1xuICB9XG4gIGlmIChyZXN0KSB0aGlzLnBhdGhuYW1lID0gcmVzdDtcbiAgaWYgKHNsYXNoZWRQcm90b2NvbFtsb3dlclByb3RvXSAmJlxuICAgICAgdGhpcy5ob3N0bmFtZSAmJiAhdGhpcy5wYXRobmFtZSkge1xuICAgIHRoaXMucGF0aG5hbWUgPSAnLyc7XG4gIH1cblxuICAvL3RvIHN1cHBvcnQgaHR0cC5yZXF1ZXN0XG4gIGlmICh0aGlzLnBhdGhuYW1lIHx8IHRoaXMuc2VhcmNoKSB7XG4gICAgdmFyIHAgPSB0aGlzLnBhdGhuYW1lIHx8ICcnO1xuICAgIHZhciBzID0gdGhpcy5zZWFyY2ggfHwgJyc7XG4gICAgdGhpcy5wYXRoID0gcCArIHM7XG4gIH1cblxuICAvLyBmaW5hbGx5LCByZWNvbnN0cnVjdCB0aGUgaHJlZiBiYXNlZCBvbiB3aGF0IGhhcyBiZWVuIHZhbGlkYXRlZC5cbiAgdGhpcy5ocmVmID0gdGhpcy5mb3JtYXQoKTtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vLyBmb3JtYXQgYSBwYXJzZWQgb2JqZWN0IGludG8gYSB1cmwgc3RyaW5nXG5mdW5jdGlvbiB1cmxGb3JtYXQob2JqKSB7XG4gIC8vIGVuc3VyZSBpdCdzIGFuIG9iamVjdCwgYW5kIG5vdCBhIHN0cmluZyB1cmwuXG4gIC8vIElmIGl0J3MgYW4gb2JqLCB0aGlzIGlzIGEgbm8tb3AuXG4gIC8vIHRoaXMgd2F5LCB5b3UgY2FuIGNhbGwgdXJsX2Zvcm1hdCgpIG9uIHN0cmluZ3NcbiAgLy8gdG8gY2xlYW4gdXAgcG90ZW50aWFsbHkgd29ua3kgdXJscy5cbiAgaWYgKGlzU3RyaW5nKG9iaikpIG9iaiA9IHVybFBhcnNlKG9iaik7XG4gIGlmICghKG9iaiBpbnN0YW5jZW9mIFVybCkpIHJldHVybiBVcmwucHJvdG90eXBlLmZvcm1hdC5jYWxsKG9iaik7XG4gIHJldHVybiBvYmouZm9ybWF0KCk7XG59XG5cblVybC5wcm90b3R5cGUuZm9ybWF0ID0gZnVuY3Rpb24oKSB7XG4gIHZhciBhdXRoID0gdGhpcy5hdXRoIHx8ICcnO1xuICBpZiAoYXV0aCkge1xuICAgIGF1dGggPSBlbmNvZGVVUklDb21wb25lbnQoYXV0aCk7XG4gICAgYXV0aCA9IGF1dGgucmVwbGFjZSgvJTNBL2ksICc6Jyk7XG4gICAgYXV0aCArPSAnQCc7XG4gIH1cblxuICB2YXIgcHJvdG9jb2wgPSB0aGlzLnByb3RvY29sIHx8ICcnLFxuICAgICAgcGF0aG5hbWUgPSB0aGlzLnBhdGhuYW1lIHx8ICcnLFxuICAgICAgaGFzaCA9IHRoaXMuaGFzaCB8fCAnJyxcbiAgICAgIGhvc3QgPSBmYWxzZSxcbiAgICAgIHF1ZXJ5ID0gJyc7XG5cbiAgaWYgKHRoaXMuaG9zdCkge1xuICAgIGhvc3QgPSBhdXRoICsgdGhpcy5ob3N0O1xuICB9IGVsc2UgaWYgKHRoaXMuaG9zdG5hbWUpIHtcbiAgICBob3N0ID0gYXV0aCArICh0aGlzLmhvc3RuYW1lLmluZGV4T2YoJzonKSA9PT0gLTEgP1xuICAgICAgICB0aGlzLmhvc3RuYW1lIDpcbiAgICAgICAgJ1snICsgdGhpcy5ob3N0bmFtZSArICddJyk7XG4gICAgaWYgKHRoaXMucG9ydCkge1xuICAgICAgaG9zdCArPSAnOicgKyB0aGlzLnBvcnQ7XG4gICAgfVxuICB9XG5cbiAgaWYgKHRoaXMucXVlcnkgJiZcbiAgICAgIGlzT2JqZWN0KHRoaXMucXVlcnkpICYmXG4gICAgICBPYmplY3Qua2V5cyh0aGlzLnF1ZXJ5KS5sZW5ndGgpIHtcbiAgICBxdWVyeSA9IHF1ZXJ5c3RyaW5nLnN0cmluZ2lmeSh0aGlzLnF1ZXJ5KTtcbiAgfVxuXG4gIHZhciBzZWFyY2ggPSB0aGlzLnNlYXJjaCB8fCAocXVlcnkgJiYgKCc/JyArIHF1ZXJ5KSkgfHwgJyc7XG5cbiAgaWYgKHByb3RvY29sICYmIHByb3RvY29sLnN1YnN0cigtMSkgIT09ICc6JykgcHJvdG9jb2wgKz0gJzonO1xuXG4gIC8vIG9ubHkgdGhlIHNsYXNoZWRQcm90b2NvbHMgZ2V0IHRoZSAvLy4gIE5vdCBtYWlsdG86LCB4bXBwOiwgZXRjLlxuICAvLyB1bmxlc3MgdGhleSBoYWQgdGhlbSB0byBiZWdpbiB3aXRoLlxuICBpZiAodGhpcy5zbGFzaGVzIHx8XG4gICAgICAoIXByb3RvY29sIHx8IHNsYXNoZWRQcm90b2NvbFtwcm90b2NvbF0pICYmIGhvc3QgIT09IGZhbHNlKSB7XG4gICAgaG9zdCA9ICcvLycgKyAoaG9zdCB8fCAnJyk7XG4gICAgaWYgKHBhdGhuYW1lICYmIHBhdGhuYW1lLmNoYXJBdCgwKSAhPT0gJy8nKSBwYXRobmFtZSA9ICcvJyArIHBhdGhuYW1lO1xuICB9IGVsc2UgaWYgKCFob3N0KSB7XG4gICAgaG9zdCA9ICcnO1xuICB9XG5cbiAgaWYgKGhhc2ggJiYgaGFzaC5jaGFyQXQoMCkgIT09ICcjJykgaGFzaCA9ICcjJyArIGhhc2g7XG4gIGlmIChzZWFyY2ggJiYgc2VhcmNoLmNoYXJBdCgwKSAhPT0gJz8nKSBzZWFyY2ggPSAnPycgKyBzZWFyY2g7XG5cbiAgcGF0aG5hbWUgPSBwYXRobmFtZS5yZXBsYWNlKC9bPyNdL2csIGZ1bmN0aW9uKG1hdGNoKSB7XG4gICAgcmV0dXJuIGVuY29kZVVSSUNvbXBvbmVudChtYXRjaCk7XG4gIH0pO1xuICBzZWFyY2ggPSBzZWFyY2gucmVwbGFjZSgnIycsICclMjMnKTtcblxuICByZXR1cm4gcHJvdG9jb2wgKyBob3N0ICsgcGF0aG5hbWUgKyBzZWFyY2ggKyBoYXNoO1xufTtcblxuZnVuY3Rpb24gdXJsUmVzb2x2ZShzb3VyY2UsIHJlbGF0aXZlKSB7XG4gIHJldHVybiB1cmxQYXJzZShzb3VyY2UsIGZhbHNlLCB0cnVlKS5yZXNvbHZlKHJlbGF0aXZlKTtcbn1cblxuVXJsLnByb3RvdHlwZS5yZXNvbHZlID0gZnVuY3Rpb24ocmVsYXRpdmUpIHtcbiAgcmV0dXJuIHRoaXMucmVzb2x2ZU9iamVjdCh1cmxQYXJzZShyZWxhdGl2ZSwgZmFsc2UsIHRydWUpKS5mb3JtYXQoKTtcbn07XG5cbmZ1bmN0aW9uIHVybFJlc29sdmVPYmplY3Qoc291cmNlLCByZWxhdGl2ZSkge1xuICBpZiAoIXNvdXJjZSkgcmV0dXJuIHJlbGF0aXZlO1xuICByZXR1cm4gdXJsUGFyc2Uoc291cmNlLCBmYWxzZSwgdHJ1ZSkucmVzb2x2ZU9iamVjdChyZWxhdGl2ZSk7XG59XG5cblVybC5wcm90b3R5cGUucmVzb2x2ZU9iamVjdCA9IGZ1bmN0aW9uKHJlbGF0aXZlKSB7XG4gIGlmIChpc1N0cmluZyhyZWxhdGl2ZSkpIHtcbiAgICB2YXIgcmVsID0gbmV3IFVybCgpO1xuICAgIHJlbC5wYXJzZShyZWxhdGl2ZSwgZmFsc2UsIHRydWUpO1xuICAgIHJlbGF0aXZlID0gcmVsO1xuICB9XG5cbiAgdmFyIHJlc3VsdCA9IG5ldyBVcmwoKTtcbiAgT2JqZWN0LmtleXModGhpcykuZm9yRWFjaChmdW5jdGlvbihrKSB7XG4gICAgcmVzdWx0W2tdID0gdGhpc1trXTtcbiAgfSwgdGhpcyk7XG5cbiAgLy8gaGFzaCBpcyBhbHdheXMgb3ZlcnJpZGRlbiwgbm8gbWF0dGVyIHdoYXQuXG4gIC8vIGV2ZW4gaHJlZj1cIlwiIHdpbGwgcmVtb3ZlIGl0LlxuICByZXN1bHQuaGFzaCA9IHJlbGF0aXZlLmhhc2g7XG5cbiAgLy8gaWYgdGhlIHJlbGF0aXZlIHVybCBpcyBlbXB0eSwgdGhlbiB0aGVyZSdzIG5vdGhpbmcgbGVmdCB0byBkbyBoZXJlLlxuICBpZiAocmVsYXRpdmUuaHJlZiA9PT0gJycpIHtcbiAgICByZXN1bHQuaHJlZiA9IHJlc3VsdC5mb3JtYXQoKTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgLy8gaHJlZnMgbGlrZSAvL2Zvby9iYXIgYWx3YXlzIGN1dCB0byB0aGUgcHJvdG9jb2wuXG4gIGlmIChyZWxhdGl2ZS5zbGFzaGVzICYmICFyZWxhdGl2ZS5wcm90b2NvbCkge1xuICAgIC8vIHRha2UgZXZlcnl0aGluZyBleGNlcHQgdGhlIHByb3RvY29sIGZyb20gcmVsYXRpdmVcbiAgICBPYmplY3Qua2V5cyhyZWxhdGl2ZSkuZm9yRWFjaChmdW5jdGlvbihrKSB7XG4gICAgICBpZiAoayAhPT0gJ3Byb3RvY29sJylcbiAgICAgICAgcmVzdWx0W2tdID0gcmVsYXRpdmVba107XG4gICAgfSk7XG5cbiAgICAvL3VybFBhcnNlIGFwcGVuZHMgdHJhaWxpbmcgLyB0byB1cmxzIGxpa2UgaHR0cDovL3d3dy5leGFtcGxlLmNvbVxuICAgIGlmIChzbGFzaGVkUHJvdG9jb2xbcmVzdWx0LnByb3RvY29sXSAmJlxuICAgICAgICByZXN1bHQuaG9zdG5hbWUgJiYgIXJlc3VsdC5wYXRobmFtZSkge1xuICAgICAgcmVzdWx0LnBhdGggPSByZXN1bHQucGF0aG5hbWUgPSAnLyc7XG4gICAgfVxuXG4gICAgcmVzdWx0LmhyZWYgPSByZXN1bHQuZm9ybWF0KCk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIGlmIChyZWxhdGl2ZS5wcm90b2NvbCAmJiByZWxhdGl2ZS5wcm90b2NvbCAhPT0gcmVzdWx0LnByb3RvY29sKSB7XG4gICAgLy8gaWYgaXQncyBhIGtub3duIHVybCBwcm90b2NvbCwgdGhlbiBjaGFuZ2luZ1xuICAgIC8vIHRoZSBwcm90b2NvbCBkb2VzIHdlaXJkIHRoaW5nc1xuICAgIC8vIGZpcnN0LCBpZiBpdCdzIG5vdCBmaWxlOiwgdGhlbiB3ZSBNVVNUIGhhdmUgYSBob3N0LFxuICAgIC8vIGFuZCBpZiB0aGVyZSB3YXMgYSBwYXRoXG4gICAgLy8gdG8gYmVnaW4gd2l0aCwgdGhlbiB3ZSBNVVNUIGhhdmUgYSBwYXRoLlxuICAgIC8vIGlmIGl0IGlzIGZpbGU6LCB0aGVuIHRoZSBob3N0IGlzIGRyb3BwZWQsXG4gICAgLy8gYmVjYXVzZSB0aGF0J3Mga25vd24gdG8gYmUgaG9zdGxlc3MuXG4gICAgLy8gYW55dGhpbmcgZWxzZSBpcyBhc3N1bWVkIHRvIGJlIGFic29sdXRlLlxuICAgIGlmICghc2xhc2hlZFByb3RvY29sW3JlbGF0aXZlLnByb3RvY29sXSkge1xuICAgICAgT2JqZWN0LmtleXMocmVsYXRpdmUpLmZvckVhY2goZnVuY3Rpb24oaykge1xuICAgICAgICByZXN1bHRba10gPSByZWxhdGl2ZVtrXTtcbiAgICAgIH0pO1xuICAgICAgcmVzdWx0LmhyZWYgPSByZXN1bHQuZm9ybWF0KCk7XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuICAgIHJlc3VsdC5wcm90b2NvbCA9IHJlbGF0aXZlLnByb3RvY29sO1xuICAgIGlmICghcmVsYXRpdmUuaG9zdCAmJiAhaG9zdGxlc3NQcm90b2NvbFtyZWxhdGl2ZS5wcm90b2NvbF0pIHtcbiAgICAgIHZhciByZWxQYXRoID0gKHJlbGF0aXZlLnBhdGhuYW1lIHx8ICcnKS5zcGxpdCgnLycpO1xuICAgICAgd2hpbGUgKHJlbFBhdGgubGVuZ3RoICYmICEocmVsYXRpdmUuaG9zdCA9IHJlbFBhdGguc2hpZnQoKSkpO1xuICAgICAgaWYgKCFyZWxhdGl2ZS5ob3N0KSByZWxhdGl2ZS5ob3N0ID0gJyc7XG4gICAgICBpZiAoIXJlbGF0aXZlLmhvc3RuYW1lKSByZWxhdGl2ZS5ob3N0bmFtZSA9ICcnO1xuICAgICAgaWYgKHJlbFBhdGhbMF0gIT09ICcnKSByZWxQYXRoLnVuc2hpZnQoJycpO1xuICAgICAgaWYgKHJlbFBhdGgubGVuZ3RoIDwgMikgcmVsUGF0aC51bnNoaWZ0KCcnKTtcbiAgICAgIHJlc3VsdC5wYXRobmFtZSA9IHJlbFBhdGguam9pbignLycpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXN1bHQucGF0aG5hbWUgPSByZWxhdGl2ZS5wYXRobmFtZTtcbiAgICB9XG4gICAgcmVzdWx0LnNlYXJjaCA9IHJlbGF0aXZlLnNlYXJjaDtcbiAgICByZXN1bHQucXVlcnkgPSByZWxhdGl2ZS5xdWVyeTtcbiAgICByZXN1bHQuaG9zdCA9IHJlbGF0aXZlLmhvc3QgfHwgJyc7XG4gICAgcmVzdWx0LmF1dGggPSByZWxhdGl2ZS5hdXRoO1xuICAgIHJlc3VsdC5ob3N0bmFtZSA9IHJlbGF0aXZlLmhvc3RuYW1lIHx8IHJlbGF0aXZlLmhvc3Q7XG4gICAgcmVzdWx0LnBvcnQgPSByZWxhdGl2ZS5wb3J0O1xuICAgIC8vIHRvIHN1cHBvcnQgaHR0cC5yZXF1ZXN0XG4gICAgaWYgKHJlc3VsdC5wYXRobmFtZSB8fCByZXN1bHQuc2VhcmNoKSB7XG4gICAgICB2YXIgcCA9IHJlc3VsdC5wYXRobmFtZSB8fCAnJztcbiAgICAgIHZhciBzID0gcmVzdWx0LnNlYXJjaCB8fCAnJztcbiAgICAgIHJlc3VsdC5wYXRoID0gcCArIHM7XG4gICAgfVxuICAgIHJlc3VsdC5zbGFzaGVzID0gcmVzdWx0LnNsYXNoZXMgfHwgcmVsYXRpdmUuc2xhc2hlcztcbiAgICByZXN1bHQuaHJlZiA9IHJlc3VsdC5mb3JtYXQoKTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgdmFyIGlzU291cmNlQWJzID0gKHJlc3VsdC5wYXRobmFtZSAmJiByZXN1bHQucGF0aG5hbWUuY2hhckF0KDApID09PSAnLycpLFxuICAgICAgaXNSZWxBYnMgPSAoXG4gICAgICAgICAgcmVsYXRpdmUuaG9zdCB8fFxuICAgICAgICAgIHJlbGF0aXZlLnBhdGhuYW1lICYmIHJlbGF0aXZlLnBhdGhuYW1lLmNoYXJBdCgwKSA9PT0gJy8nXG4gICAgICApLFxuICAgICAgbXVzdEVuZEFicyA9IChpc1JlbEFicyB8fCBpc1NvdXJjZUFicyB8fFxuICAgICAgICAgICAgICAgICAgICAocmVzdWx0Lmhvc3QgJiYgcmVsYXRpdmUucGF0aG5hbWUpKSxcbiAgICAgIHJlbW92ZUFsbERvdHMgPSBtdXN0RW5kQWJzLFxuICAgICAgc3JjUGF0aCA9IHJlc3VsdC5wYXRobmFtZSAmJiByZXN1bHQucGF0aG5hbWUuc3BsaXQoJy8nKSB8fCBbXSxcbiAgICAgIHJlbFBhdGggPSByZWxhdGl2ZS5wYXRobmFtZSAmJiByZWxhdGl2ZS5wYXRobmFtZS5zcGxpdCgnLycpIHx8IFtdLFxuICAgICAgcHN5Y2hvdGljID0gcmVzdWx0LnByb3RvY29sICYmICFzbGFzaGVkUHJvdG9jb2xbcmVzdWx0LnByb3RvY29sXTtcblxuICAvLyBpZiB0aGUgdXJsIGlzIGEgbm9uLXNsYXNoZWQgdXJsLCB0aGVuIHJlbGF0aXZlXG4gIC8vIGxpbmtzIGxpa2UgLi4vLi4gc2hvdWxkIGJlIGFibGVcbiAgLy8gdG8gY3Jhd2wgdXAgdG8gdGhlIGhvc3RuYW1lLCBhcyB3ZWxsLiAgVGhpcyBpcyBzdHJhbmdlLlxuICAvLyByZXN1bHQucHJvdG9jb2wgaGFzIGFscmVhZHkgYmVlbiBzZXQgYnkgbm93LlxuICAvLyBMYXRlciBvbiwgcHV0IHRoZSBmaXJzdCBwYXRoIHBhcnQgaW50byB0aGUgaG9zdCBmaWVsZC5cbiAgaWYgKHBzeWNob3RpYykge1xuICAgIHJlc3VsdC5ob3N0bmFtZSA9ICcnO1xuICAgIHJlc3VsdC5wb3J0ID0gbnVsbDtcbiAgICBpZiAocmVzdWx0Lmhvc3QpIHtcbiAgICAgIGlmIChzcmNQYXRoWzBdID09PSAnJykgc3JjUGF0aFswXSA9IHJlc3VsdC5ob3N0O1xuICAgICAgZWxzZSBzcmNQYXRoLnVuc2hpZnQocmVzdWx0Lmhvc3QpO1xuICAgIH1cbiAgICByZXN1bHQuaG9zdCA9ICcnO1xuICAgIGlmIChyZWxhdGl2ZS5wcm90b2NvbCkge1xuICAgICAgcmVsYXRpdmUuaG9zdG5hbWUgPSBudWxsO1xuICAgICAgcmVsYXRpdmUucG9ydCA9IG51bGw7XG4gICAgICBpZiAocmVsYXRpdmUuaG9zdCkge1xuICAgICAgICBpZiAocmVsUGF0aFswXSA9PT0gJycpIHJlbFBhdGhbMF0gPSByZWxhdGl2ZS5ob3N0O1xuICAgICAgICBlbHNlIHJlbFBhdGgudW5zaGlmdChyZWxhdGl2ZS5ob3N0KTtcbiAgICAgIH1cbiAgICAgIHJlbGF0aXZlLmhvc3QgPSBudWxsO1xuICAgIH1cbiAgICBtdXN0RW5kQWJzID0gbXVzdEVuZEFicyAmJiAocmVsUGF0aFswXSA9PT0gJycgfHwgc3JjUGF0aFswXSA9PT0gJycpO1xuICB9XG5cbiAgaWYgKGlzUmVsQWJzKSB7XG4gICAgLy8gaXQncyBhYnNvbHV0ZS5cbiAgICByZXN1bHQuaG9zdCA9IChyZWxhdGl2ZS5ob3N0IHx8IHJlbGF0aXZlLmhvc3QgPT09ICcnKSA/XG4gICAgICAgICAgICAgICAgICByZWxhdGl2ZS5ob3N0IDogcmVzdWx0Lmhvc3Q7XG4gICAgcmVzdWx0Lmhvc3RuYW1lID0gKHJlbGF0aXZlLmhvc3RuYW1lIHx8IHJlbGF0aXZlLmhvc3RuYW1lID09PSAnJykgP1xuICAgICAgICAgICAgICAgICAgICAgIHJlbGF0aXZlLmhvc3RuYW1lIDogcmVzdWx0Lmhvc3RuYW1lO1xuICAgIHJlc3VsdC5zZWFyY2ggPSByZWxhdGl2ZS5zZWFyY2g7XG4gICAgcmVzdWx0LnF1ZXJ5ID0gcmVsYXRpdmUucXVlcnk7XG4gICAgc3JjUGF0aCA9IHJlbFBhdGg7XG4gICAgLy8gZmFsbCB0aHJvdWdoIHRvIHRoZSBkb3QtaGFuZGxpbmcgYmVsb3cuXG4gIH0gZWxzZSBpZiAocmVsUGF0aC5sZW5ndGgpIHtcbiAgICAvLyBpdCdzIHJlbGF0aXZlXG4gICAgLy8gdGhyb3cgYXdheSB0aGUgZXhpc3RpbmcgZmlsZSwgYW5kIHRha2UgdGhlIG5ldyBwYXRoIGluc3RlYWQuXG4gICAgaWYgKCFzcmNQYXRoKSBzcmNQYXRoID0gW107XG4gICAgc3JjUGF0aC5wb3AoKTtcbiAgICBzcmNQYXRoID0gc3JjUGF0aC5jb25jYXQocmVsUGF0aCk7XG4gICAgcmVzdWx0LnNlYXJjaCA9IHJlbGF0aXZlLnNlYXJjaDtcbiAgICByZXN1bHQucXVlcnkgPSByZWxhdGl2ZS5xdWVyeTtcbiAgfSBlbHNlIGlmICghaXNOdWxsT3JVbmRlZmluZWQocmVsYXRpdmUuc2VhcmNoKSkge1xuICAgIC8vIGp1c3QgcHVsbCBvdXQgdGhlIHNlYXJjaC5cbiAgICAvLyBsaWtlIGhyZWY9Jz9mb28nLlxuICAgIC8vIFB1dCB0aGlzIGFmdGVyIHRoZSBvdGhlciB0d28gY2FzZXMgYmVjYXVzZSBpdCBzaW1wbGlmaWVzIHRoZSBib29sZWFuc1xuICAgIGlmIChwc3ljaG90aWMpIHtcbiAgICAgIHJlc3VsdC5ob3N0bmFtZSA9IHJlc3VsdC5ob3N0ID0gc3JjUGF0aC5zaGlmdCgpO1xuICAgICAgLy9vY2NhdGlvbmFseSB0aGUgYXV0aCBjYW4gZ2V0IHN0dWNrIG9ubHkgaW4gaG9zdFxuICAgICAgLy90aGlzIGVzcGVjaWFseSBoYXBwZW5zIGluIGNhc2VzIGxpa2VcbiAgICAgIC8vdXJsLnJlc29sdmVPYmplY3QoJ21haWx0bzpsb2NhbDFAZG9tYWluMScsICdsb2NhbDJAZG9tYWluMicpXG4gICAgICB2YXIgYXV0aEluSG9zdCA9IHJlc3VsdC5ob3N0ICYmIHJlc3VsdC5ob3N0LmluZGV4T2YoJ0AnKSA+IDAgP1xuICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQuaG9zdC5zcGxpdCgnQCcpIDogZmFsc2U7XG4gICAgICBpZiAoYXV0aEluSG9zdCkge1xuICAgICAgICByZXN1bHQuYXV0aCA9IGF1dGhJbkhvc3Quc2hpZnQoKTtcbiAgICAgICAgcmVzdWx0Lmhvc3QgPSByZXN1bHQuaG9zdG5hbWUgPSBhdXRoSW5Ib3N0LnNoaWZ0KCk7XG4gICAgICB9XG4gICAgfVxuICAgIHJlc3VsdC5zZWFyY2ggPSByZWxhdGl2ZS5zZWFyY2g7XG4gICAgcmVzdWx0LnF1ZXJ5ID0gcmVsYXRpdmUucXVlcnk7XG4gICAgLy90byBzdXBwb3J0IGh0dHAucmVxdWVzdFxuICAgIGlmICghaXNOdWxsKHJlc3VsdC5wYXRobmFtZSkgfHwgIWlzTnVsbChyZXN1bHQuc2VhcmNoKSkge1xuICAgICAgcmVzdWx0LnBhdGggPSAocmVzdWx0LnBhdGhuYW1lID8gcmVzdWx0LnBhdGhuYW1lIDogJycpICtcbiAgICAgICAgICAgICAgICAgICAgKHJlc3VsdC5zZWFyY2ggPyByZXN1bHQuc2VhcmNoIDogJycpO1xuICAgIH1cbiAgICByZXN1bHQuaHJlZiA9IHJlc3VsdC5mb3JtYXQoKTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgaWYgKCFzcmNQYXRoLmxlbmd0aCkge1xuICAgIC8vIG5vIHBhdGggYXQgYWxsLiAgZWFzeS5cbiAgICAvLyB3ZSd2ZSBhbHJlYWR5IGhhbmRsZWQgdGhlIG90aGVyIHN0dWZmIGFib3ZlLlxuICAgIHJlc3VsdC5wYXRobmFtZSA9IG51bGw7XG4gICAgLy90byBzdXBwb3J0IGh0dHAucmVxdWVzdFxuICAgIGlmIChyZXN1bHQuc2VhcmNoKSB7XG4gICAgICByZXN1bHQucGF0aCA9ICcvJyArIHJlc3VsdC5zZWFyY2g7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJlc3VsdC5wYXRoID0gbnVsbDtcbiAgICB9XG4gICAgcmVzdWx0LmhyZWYgPSByZXN1bHQuZm9ybWF0KCk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIC8vIGlmIGEgdXJsIEVORHMgaW4gLiBvciAuLiwgdGhlbiBpdCBtdXN0IGdldCBhIHRyYWlsaW5nIHNsYXNoLlxuICAvLyBob3dldmVyLCBpZiBpdCBlbmRzIGluIGFueXRoaW5nIGVsc2Ugbm9uLXNsYXNoeSxcbiAgLy8gdGhlbiBpdCBtdXN0IE5PVCBnZXQgYSB0cmFpbGluZyBzbGFzaC5cbiAgdmFyIGxhc3QgPSBzcmNQYXRoLnNsaWNlKC0xKVswXTtcbiAgdmFyIGhhc1RyYWlsaW5nU2xhc2ggPSAoXG4gICAgICAocmVzdWx0Lmhvc3QgfHwgcmVsYXRpdmUuaG9zdCkgJiYgKGxhc3QgPT09ICcuJyB8fCBsYXN0ID09PSAnLi4nKSB8fFxuICAgICAgbGFzdCA9PT0gJycpO1xuXG4gIC8vIHN0cmlwIHNpbmdsZSBkb3RzLCByZXNvbHZlIGRvdWJsZSBkb3RzIHRvIHBhcmVudCBkaXJcbiAgLy8gaWYgdGhlIHBhdGggdHJpZXMgdG8gZ28gYWJvdmUgdGhlIHJvb3QsIGB1cGAgZW5kcyB1cCA+IDBcbiAgdmFyIHVwID0gMDtcbiAgZm9yICh2YXIgaSA9IHNyY1BhdGgubGVuZ3RoOyBpID49IDA7IGktLSkge1xuICAgIGxhc3QgPSBzcmNQYXRoW2ldO1xuICAgIGlmIChsYXN0ID09ICcuJykge1xuICAgICAgc3JjUGF0aC5zcGxpY2UoaSwgMSk7XG4gICAgfSBlbHNlIGlmIChsYXN0ID09PSAnLi4nKSB7XG4gICAgICBzcmNQYXRoLnNwbGljZShpLCAxKTtcbiAgICAgIHVwKys7XG4gICAgfSBlbHNlIGlmICh1cCkge1xuICAgICAgc3JjUGF0aC5zcGxpY2UoaSwgMSk7XG4gICAgICB1cC0tO1xuICAgIH1cbiAgfVxuXG4gIC8vIGlmIHRoZSBwYXRoIGlzIGFsbG93ZWQgdG8gZ28gYWJvdmUgdGhlIHJvb3QsIHJlc3RvcmUgbGVhZGluZyAuLnNcbiAgaWYgKCFtdXN0RW5kQWJzICYmICFyZW1vdmVBbGxEb3RzKSB7XG4gICAgZm9yICg7IHVwLS07IHVwKSB7XG4gICAgICBzcmNQYXRoLnVuc2hpZnQoJy4uJyk7XG4gICAgfVxuICB9XG5cbiAgaWYgKG11c3RFbmRBYnMgJiYgc3JjUGF0aFswXSAhPT0gJycgJiZcbiAgICAgICghc3JjUGF0aFswXSB8fCBzcmNQYXRoWzBdLmNoYXJBdCgwKSAhPT0gJy8nKSkge1xuICAgIHNyY1BhdGgudW5zaGlmdCgnJyk7XG4gIH1cblxuICBpZiAoaGFzVHJhaWxpbmdTbGFzaCAmJiAoc3JjUGF0aC5qb2luKCcvJykuc3Vic3RyKC0xKSAhPT0gJy8nKSkge1xuICAgIHNyY1BhdGgucHVzaCgnJyk7XG4gIH1cblxuICB2YXIgaXNBYnNvbHV0ZSA9IHNyY1BhdGhbMF0gPT09ICcnIHx8XG4gICAgICAoc3JjUGF0aFswXSAmJiBzcmNQYXRoWzBdLmNoYXJBdCgwKSA9PT0gJy8nKTtcblxuICAvLyBwdXQgdGhlIGhvc3QgYmFja1xuICBpZiAocHN5Y2hvdGljKSB7XG4gICAgcmVzdWx0Lmhvc3RuYW1lID0gcmVzdWx0Lmhvc3QgPSBpc0Fic29sdXRlID8gJycgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3JjUGF0aC5sZW5ndGggPyBzcmNQYXRoLnNoaWZ0KCkgOiAnJztcbiAgICAvL29jY2F0aW9uYWx5IHRoZSBhdXRoIGNhbiBnZXQgc3R1Y2sgb25seSBpbiBob3N0XG4gICAgLy90aGlzIGVzcGVjaWFseSBoYXBwZW5zIGluIGNhc2VzIGxpa2VcbiAgICAvL3VybC5yZXNvbHZlT2JqZWN0KCdtYWlsdG86bG9jYWwxQGRvbWFpbjEnLCAnbG9jYWwyQGRvbWFpbjInKVxuICAgIHZhciBhdXRoSW5Ib3N0ID0gcmVzdWx0Lmhvc3QgJiYgcmVzdWx0Lmhvc3QuaW5kZXhPZignQCcpID4gMCA/XG4gICAgICAgICAgICAgICAgICAgICByZXN1bHQuaG9zdC5zcGxpdCgnQCcpIDogZmFsc2U7XG4gICAgaWYgKGF1dGhJbkhvc3QpIHtcbiAgICAgIHJlc3VsdC5hdXRoID0gYXV0aEluSG9zdC5zaGlmdCgpO1xuICAgICAgcmVzdWx0Lmhvc3QgPSByZXN1bHQuaG9zdG5hbWUgPSBhdXRoSW5Ib3N0LnNoaWZ0KCk7XG4gICAgfVxuICB9XG5cbiAgbXVzdEVuZEFicyA9IG11c3RFbmRBYnMgfHwgKHJlc3VsdC5ob3N0ICYmIHNyY1BhdGgubGVuZ3RoKTtcblxuICBpZiAobXVzdEVuZEFicyAmJiAhaXNBYnNvbHV0ZSkge1xuICAgIHNyY1BhdGgudW5zaGlmdCgnJyk7XG4gIH1cblxuICBpZiAoIXNyY1BhdGgubGVuZ3RoKSB7XG4gICAgcmVzdWx0LnBhdGhuYW1lID0gbnVsbDtcbiAgICByZXN1bHQucGF0aCA9IG51bGw7XG4gIH0gZWxzZSB7XG4gICAgcmVzdWx0LnBhdGhuYW1lID0gc3JjUGF0aC5qb2luKCcvJyk7XG4gIH1cblxuICAvL3RvIHN1cHBvcnQgcmVxdWVzdC5odHRwXG4gIGlmICghaXNOdWxsKHJlc3VsdC5wYXRobmFtZSkgfHwgIWlzTnVsbChyZXN1bHQuc2VhcmNoKSkge1xuICAgIHJlc3VsdC5wYXRoID0gKHJlc3VsdC5wYXRobmFtZSA/IHJlc3VsdC5wYXRobmFtZSA6ICcnKSArXG4gICAgICAgICAgICAgICAgICAocmVzdWx0LnNlYXJjaCA/IHJlc3VsdC5zZWFyY2ggOiAnJyk7XG4gIH1cbiAgcmVzdWx0LmF1dGggPSByZWxhdGl2ZS5hdXRoIHx8IHJlc3VsdC5hdXRoO1xuICByZXN1bHQuc2xhc2hlcyA9IHJlc3VsdC5zbGFzaGVzIHx8IHJlbGF0aXZlLnNsYXNoZXM7XG4gIHJlc3VsdC5ocmVmID0gcmVzdWx0LmZvcm1hdCgpO1xuICByZXR1cm4gcmVzdWx0O1xufTtcblxuVXJsLnByb3RvdHlwZS5wYXJzZUhvc3QgPSBmdW5jdGlvbigpIHtcbiAgdmFyIGhvc3QgPSB0aGlzLmhvc3Q7XG4gIHZhciBwb3J0ID0gcG9ydFBhdHRlcm4uZXhlYyhob3N0KTtcbiAgaWYgKHBvcnQpIHtcbiAgICBwb3J0ID0gcG9ydFswXTtcbiAgICBpZiAocG9ydCAhPT0gJzonKSB7XG4gICAgICB0aGlzLnBvcnQgPSBwb3J0LnN1YnN0cigxKTtcbiAgICB9XG4gICAgaG9zdCA9IGhvc3Quc3Vic3RyKDAsIGhvc3QubGVuZ3RoIC0gcG9ydC5sZW5ndGgpO1xuICB9XG4gIGlmIChob3N0KSB0aGlzLmhvc3RuYW1lID0gaG9zdDtcbn07XG5cbmZ1bmN0aW9uIGlzU3RyaW5nKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gXCJzdHJpbmdcIjtcbn1cblxuZnVuY3Rpb24gaXNPYmplY3QoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnb2JqZWN0JyAmJiBhcmcgIT09IG51bGw7XG59XG5cbmZ1bmN0aW9uIGlzTnVsbChhcmcpIHtcbiAgcmV0dXJuIGFyZyA9PT0gbnVsbDtcbn1cbmZ1bmN0aW9uIGlzTnVsbE9yVW5kZWZpbmVkKGFyZykge1xuICByZXR1cm4gIGFyZyA9PSBudWxsO1xufVxuIl19
