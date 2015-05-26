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

game.click(function (e) {
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
  grd.addColorStop(0.000, 'rgba(0, 127, 255, 0.200)');
  grd.addColorStop(0.100, 'rgba(255, 255, 255, 0.200)');
  grd.addColorStop(0.200, 'rgba(0, 127, 255, 0.200)');
  grd.addColorStop(0.500, 'rgba(255, 255, 255, 0.200)');
  grd.addColorStop(0.600, 'rgba(0, 127, 255, 0.200)');
  grd.addColorStop(0.800, 'rgba(255, 255, 255, 0.200)');
  grd.addColorStop(1.000, 'rgba(0, 127, 255, 0.200)');
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

},{"./helpers":2,"gesso":10}],2:[function(require,module,exports){
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
var Controller = require('./controller');
var Delegate = require('./delegate');
var lowLevel = require('./lowLevel');
var logging = require('./logging');


function Gesso(options) {
  options = options || {};
  this.contextType = options.contextType || '2d';
  this.contextAttributes = options.contextAttributes;
  this.fps = options.fps || 60;
  this.autoplay = options.autoplay || true;
  this.setup = new Delegate();
  this.start = new Delegate();
  this.stop = new Delegate();
  this.update = new Delegate();
  this.render = new Delegate();
  this.click = new Delegate(function (handler) {
    // TODO: Use the canvas passed into run()
    var handlerWrapper = function (e) {
      e.preventDefault();
      handler(e);
      return false;
    };
    Gesso.getCanvas().addEventListener('touchstart', handlerWrapper, false);
    Gesso.getCanvas().addEventListener('mousedown', handlerWrapper, false);
    return handlerWrapper;
  }, function (handler, handlerWrapper) {
    Gesso.getCanvas().removeEventListener('touchstart', handlerWrapper || handler);
    Gesso.getCanvas().removeEventListener('mousedown', handlerWrapper || handler);
  });
  this.width = options.width || 640;    // TODO: allow 'null' to use width of target canvas
  this.height = options.height || 480;  // TODO: allow 'null' to use height of target canvas
  this._initialized = false;
}
Gesso.Controller = Controller;
Gesso.Delegate = Delegate;
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
  return this.update.invoke();
};
Gesso.prototype.renderTo = function renderTo(context) {
  return this.render.invoke(context);
};
Gesso.prototype.run = function run(canvas) {
  var controller = new Controller(this, canvas);
  controller.start();
  return controller;
};


module.exports = Gesso;

},{"./controller":3,"./delegate":4,"./logging":7,"./lowLevel":8}],6:[function(require,module,exports){
var Gesso = require('./gesso');

// TODO: Delete this
window.Gesso = Gesso;

module.exports = Gesso;

},{"./gesso":5}],7:[function(require,module,exports){
/* globals $ */


// TODO: Logger class
// TODO: Pluggable log backend, e.g. console.log


function _send(level, args) {
  // TODO: Inspect object instead of sending [object Object]
  // TODO: Remove the implied jQuery dependency
  $.post('/log', {
    level: level,
    message: args.join(' ')
  }).fail(function(xhr, textStatus, errorThrown) {
    // TODO: Notify user on the page and show message if console.log doesn't exist
    if (console && console.log) {
      console.log(xhr.responseText);
    }
  });
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
var util = require('./util');


var raf = (function () {
  // Raf polyfill by Erik Möller. fixes from Paul Irish and Tino Zijdel
  // Adapted by Joe Esposito
  // Origin: http://paulirish.com/2011/requestanimationframe-for-smart-animating/
  //         http://my.opera.com/emoller/blog/2011/12/20/requestanimationframe-for-smart-er-animating
  // MIT license

  var requestAnimationFrame = typeof window !== 'undefined' ? window.requestAnimationFrame : null;
  var cancelAnimationFrame = typeof window !== 'undefined' ? window.cancelAnimationFrame : null;

  var vendors = ['ms', 'moz', 'webkit', 'o'];
  for(var x = 0; x < vendors.length && !requestAnimationFrame; ++x) {
    requestAnimationFrame = window[vendors[x] + 'RequestAnimationFrame'];
    cancelAnimationFrame = window[vendors[x] + 'CancelAnimationFrame'] || window[vendors[x] + 'CancelRequestAnimationFrame'];
  }

  if (!requestAnimationFrame) {
    var lastTime = 0;
    requestAnimationFrame = function(callback) {
      var currTime = new Date().getTime();
      var timeToCall = Math.max(0, 16 - (currTime - lastTime));
      var id = setTimeout(function() { callback(currTime + timeToCall); }, timeToCall);
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
  getCanvas: getCanvas,
  getContext2D: getContext2D,
  getWebGLContext: getWebGLContext
};

},{"./util":9}],9:[function(require,module,exports){
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
  console.log(tagName);
  console.log(newElement);
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

},{"./client":6}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uXFwuLlxcLi5cXC4uXFxQcm9qZWN0c1xcR2Vzc28uanNcXG5vZGVfbW9kdWxlc1xcYnJvd3NlcmlmeVxcbm9kZV9tb2R1bGVzXFxicm93c2VyLXBhY2tcXF9wcmVsdWRlLmpzIiwiaW5kZXguanMiLCJoZWxwZXJzLmpzIiwibm9kZV9tb2R1bGVzL2dlc3NvL2NsaWVudC9jb250cm9sbGVyLmpzIiwibm9kZV9tb2R1bGVzL2dlc3NvL2NsaWVudC9kZWxlZ2F0ZS5qcyIsIm5vZGVfbW9kdWxlcy9nZXNzby9jbGllbnQvZ2Vzc28uanMiLCJub2RlX21vZHVsZXMvZ2Vzc28vY2xpZW50L2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2dlc3NvL2NsaWVudC9sb2dnaW5nLmpzIiwibm9kZV9tb2R1bGVzL2dlc3NvL2NsaWVudC9sb3dMZXZlbC5qcyIsIm5vZGVfbW9kdWxlcy9nZXNzby9jbGllbnQvdXRpbC5qcyIsIm5vZGVfbW9kdWxlcy9nZXNzby9pbmRleC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4aEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25GQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciBHZXNzbyA9IHJlcXVpcmUoJ2dlc3NvJyk7XHJcbnZhciBoZWxwZXJzID0gcmVxdWlyZSgnLi9oZWxwZXJzJyk7XHJcblxyXG52YXIgZ2FtZSA9IG5ldyBHZXNzbygpO1xyXG52YXIgZ3Jhdml0eSA9IDAuMztcclxudmFyIHNlYUxldmVsID0gODA7XHJcbnZhciBwbGF5ZXIgPSBudWxsO1xyXG52YXIgcm9ja3MgPSBbXTtcclxudmFyIGJ1cnN0SXRlbSA9IG51bGw7XHJcbnZhciBidXJzdEl0ZW1TZWVuID0gZmFsc2U7XHJcbnZhciBidXJzdFNwZWVkID0gMjtcclxudmFyIGJ1cnN0Q291bnQgPSAwO1xyXG52YXIgYnVyc3RNb2RlID0gZmFsc2U7XHJcbnZhciBidXJzdE1vZGVDb3VudCA9IDA7XHJcbnZhciBidXJzdE1vZGVNYXhDb3VudCA9IDUwMDtcclxudmFyIGxvbmdKdW1wID0gZmFsc2U7XHJcbnZhciBsb25nSnVtcENvbXBsZXRlQ291bnQgPSAwO1xyXG52YXIgbG9uZ0p1bXBDb21wbGV0ZU1heENvdW50ID0gMTIwO1xyXG52YXIgbG9uZ0p1bXBDb21wbGV0ZVNjb3JlID0gMTAwMDAwMDtcclxudmFyIGJhZEp1bXAgPSBmYWxzZTtcclxudmFyIGZyYW1lQ291bnQgPSAwO1xyXG52YXIgY3VycmVudExldmVsID0gLTE7XHJcbnZhciBzY29yZUZyYW1lQ291bnQgPSA2O1xyXG52YXIgc2NvcmVJbmNyZW1lbnQgPSAxMDA7XHJcbnZhciBoaWdoU2NvcmUgPSAwO1xyXG52YXIgaGlnaFNjb3JlVGltZSA9IDA7XHJcbnZhciBoaWdoU2NvcmVNYXhUaW1lID0gNjA7XHJcbnZhciBwYXJ0aWNsZXMgPSBbXTtcclxudmFyIGVuZEdhbWVQYXJ0aWNsZUNvdW50ID0gMTAwO1xyXG52YXIgYm90dG9tTGVld2F5ID0gNjA7XHJcbnZhciBidWJibGVzID0gW107XHJcbnZhciBzcGxhc2ggPSBbXTtcclxudmFyIGNsaWNrTG9jayA9IDA7XHJcbnZhciByZXNwYXduRGFuZ2VyID0gMDtcclxudmFyIGludmluY2liaWxpdHkgPSAwO1xyXG52YXIgaW52aW5jaWJpbGl0eUJsaW5rID0gMzA7XHJcblxyXG52YXIgbGV2ZWxTdGFydEZyYW1lcyA9IFswLCAxMjAsIDY2MCwgMTI2MCwgMjAwMCwgMzIwMCwgNDQwMCwgNTYwMCwgNjgwMF07XHJcbnZhciBsZXZlbFN0YXJ0U2NvcmUgPSBbXTtcclxuZm9yICh2YXIgbGV2ZWxTdGFydFNjb3JlSW5kZXggPSAwOyBsZXZlbFN0YXJ0U2NvcmVJbmRleCA8IGxldmVsU3RhcnRGcmFtZXMubGVuZ3RoOyBsZXZlbFN0YXJ0U2NvcmVJbmRleCsrKSB7XHJcbiAgbGV2ZWxTdGFydFNjb3JlLnB1c2goTWF0aC5mbG9vcihsZXZlbFN0YXJ0RnJhbWVzW2xldmVsU3RhcnRTY29yZUluZGV4XSAvIHNjb3JlRnJhbWVDb3VudCAqIHNjb3JlSW5jcmVtZW50IC8gMiAvIDEwMCkgKiAxMDApO1xyXG59XHJcbnZhciBsZXZlbHMgPSB7XHJcbiAgMDoge3NwZWVkOiA0LCBuZXdSb2NrTWF4V2lkdGg6IDEwMCwgbmV3Um9ja0ZyYW1lQ291bnQ6IDYwLCBuZXdCdXJzdEl0ZW1GcmFtZUNvdW50OiBudWxsfSxcclxuICAxOiB7c3BlZWQ6IDQsIG5ld1JvY2tNYXhXaWR0aDogMTAwLCBuZXdSb2NrRnJhbWVDb3VudDogMjAwLCBuZXdCdXJzdEl0ZW1GcmFtZUNvdW50OiBudWxsfSxcclxuICAyOiB7c3BlZWQ6IDQuMiwgbmV3Um9ja01heFdpZHRoOiAxMDAsIG5ld1JvY2tGcmFtZUNvdW50OiAxMDAsIG5ld0J1cnN0SXRlbUZyYW1lQ291bnQ6IG51bGx9LFxyXG4gIDM6IHtzcGVlZDogNC40LCBuZXdSb2NrTWF4V2lkdGg6IDEwMCwgbmV3Um9ja0ZyYW1lQ291bnQ6IDgwLCBuZXdCdXJzdEl0ZW1GcmFtZUNvdW50OiBudWxsfSxcclxuICA0OiB7c3BlZWQ6IDUsIG5ld1JvY2tNYXhXaWR0aDogMTIwLCBuZXdSb2NrRnJhbWVDb3VudDogNzUsIG5ld0J1cnN0SXRlbUZyYW1lQ291bnQ6IG51bGx9LFxyXG4gIDU6IHtzcGVlZDogNiwgbmV3Um9ja01heFdpZHRoOiAxNTAsIG5ld1JvY2tGcmFtZUNvdW50OiA3NSwgbmV3QnVyc3RJdGVtRnJhbWVDb3VudDogbnVsbH0sXHJcbiAgNjoge3NwZWVkOiA3LCBuZXdSb2NrTWF4V2lkdGg6IDE1MCwgbmV3Um9ja0ZyYW1lQ291bnQ6IDY1LCBuZXdCdXJzdEl0ZW1GcmFtZUNvdW50OiBudWxsfSxcclxuICA3OiB7c3BlZWQ6IDgsIG5ld1JvY2tNYXhXaWR0aDogMjI1LCBuZXdSb2NrRnJhbWVDb3VudDogNjUsIG5ld0J1cnN0SXRlbUZyYW1lQ291bnQ6IG51bGx9LFxyXG4gIDg6IHtzcGVlZDogOCwgbmV3Um9ja01heFdpZHRoOiAyNTAsIG5ld1JvY2tGcmFtZUNvdW50OiA2NSwgbmV3QnVyc3RJdGVtRnJhbWVDb3VudDogMTIwLCBuZXdCdXJzdEl0ZW1GcmFtZVJlcGVhdDogMTIwMH1cclxufTtcclxuXHJcbmZ1bmN0aW9uIG5ld0dhbWUoKSB7XHJcbiAgLy8gRmlyc3QgcGxheVxyXG4gIGlmIChjdXJyZW50TGV2ZWwgPT09IC0xKSB7XHJcbiAgICBjdXJyZW50TGV2ZWwgPSAwO1xyXG4gIH1cclxuICAvLyBSZWR1Y2UgbGV2ZWxcclxuICBpZiAoY3VycmVudExldmVsID4gMCkge1xyXG4gICAgY3VycmVudExldmVsIC09IDE7XHJcbiAgfVxyXG4gIC8vIENyZWF0ZSBwbGF5ZXJcclxuICBwbGF5ZXIgPSB7XHJcbiAgICB4OiAxMDAsXHJcbiAgICB5OiAyMDAsXHJcbiAgICBzeTogMSxcclxuICAgIHZlbG9jaXR5OiAtMTAsXHJcbiAgICBqdW1wVmVsb2NpdHk6IDgsXHJcbiAgICB0ZXJtaW5hbFZlbG9jaXR5OiA3LFxyXG4gICAgbGV2ZWxVcEJ1YmJsZXM6IDAsXHJcbiAgICBzY29yZTogbGV2ZWxTdGFydFNjb3JlW2N1cnJlbnRMZXZlbF1cclxuICB9O1xyXG4gIC8vIFJlc2V0IGZyYW1lIGNvdW50XHJcbiAgZnJhbWVDb3VudCA9IGxldmVsU3RhcnRGcmFtZXNbY3VycmVudExldmVsXTtcclxuICAvLyBSZXNldCBidXJzdCBtb2RlXHJcbiAgYnVyc3RJdGVtU2VlbiA9IGZhbHNlO1xyXG4gIGJ1cnN0Q291bnQgPSAwO1xyXG4gIGJ1cnN0TW9kZSA9IGZhbHNlO1xyXG4gIGJ1cnN0TW9kZUNvdW50ID0gMDtcclxuICBsb25nSnVtcCA9IGZhbHNlO1xyXG4gIGJhZEp1bXAgPSBmYWxzZTtcclxuICAvLyBSZXNldCB3aXRoIGludmluY2liaWxpdHkgaWYgaW4gZGFuZ2VyXHJcbiAgaWYgKHJlc3Bhd25EYW5nZXIgPiAwKSB7XHJcbiAgICBpbnZpbmNpYmlsaXR5ID0gNjAgKiAzO1xyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gZW5kR2FtZSgpIHtcclxuICBpZiAoIXBsYXllcikge1xyXG4gICAgcmV0dXJuO1xyXG4gIH1cclxuXHJcbiAgLy8gU2V0IHRoZSBuZXcgaGlnaCBzY29yZSwgYW5pbWF0aW5nIGl0LCBpZiB0aGUgcmVjb3JkIHdhcyBicm9rZW5cclxuICBpZiAocGxheWVyLnNjb3JlID4gaGlnaFNjb3JlKSB7XHJcbiAgICBoaWdoU2NvcmUgPSBwbGF5ZXIuc2NvcmU7XHJcbiAgICBoaWdoU2NvcmVUaW1lID0gaGlnaFNjb3JlTWF4VGltZTtcclxuICB9XHJcblxyXG4gIC8vIEV4cGxvZGVcclxuICBmb3IgKHZhciBpbmRleCA9IDA7IGluZGV4IDwgZW5kR2FtZVBhcnRpY2xlQ291bnQ7IGluZGV4KyspIHtcclxuICAgIHZhciBhbmdsZSA9IGhlbHBlcnMucmFuZEludCgwLCAzNjApO1xyXG4gICAgdmFyIHZlbG9jaXR5ID0gaGVscGVycy5yYW5kSW50KDEwLCAyMCk7XHJcbiAgICBwYXJ0aWNsZXMucHVzaCh7XHJcbiAgICAgIHg6IHBsYXllci54LFxyXG4gICAgICB5OiBwbGF5ZXIueSxcclxuICAgICAgdng6IE1hdGguY29zKGFuZ2xlICogTWF0aC5QSSAvIDE4MCkgKiB2ZWxvY2l0eSAtIDYsXHJcbiAgICAgIHZ5OiBNYXRoLnNpbihhbmdsZSAqIE1hdGguUEkgLyAxODApICogdmVsb2NpdHlcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgLy8gQmFkIGp1bXAgaWYgaW4gYnVyc3QgbW9kZVxyXG4gIGlmIChidXJzdE1vZGUgfHwgbG9uZ0p1bXApIHtcclxuICAgIGJhZEp1bXAgPSB0cnVlO1xyXG4gIH1cclxuXHJcbiAgLy8gVXNlIGludmluY2liaWxpdHkgdW50aWwgYWxsIHJvY2tzIHBhc3NcclxuICByZXNwYXduRGFuZ2VyID0gZ2FtZS53aWR0aCAtIHBsYXllci54ICsgbGV2ZWxzW2N1cnJlbnRMZXZlbF0ubmV3Um9ja01heFdpZHRoO1xyXG5cclxuICAvLyBTZXQgdG8gbm90IHBsYXlpbmdcclxuICBwbGF5ZXIgPSBudWxsO1xyXG4gIGNsaWNrTG9jayA9IDMwO1xyXG59XHJcblxyXG5mdW5jdGlvbiBuZXdTcGxhc2goKSB7XHJcbiAgZm9yICh2YXIgcyA9IDA7IHMgPCAyMDsgcysrKSB7XHJcbiAgICB2YXIgYXggPSBNYXRoLnJhbmRvbSgpICogNCAtIDM7XHJcbiAgICB2YXIgYXkgPSAtKE1hdGgucmFuZG9tKCkgKiAyICsgMSk7XHJcbiAgICBzcGxhc2gucHVzaCh7eDogcGxheWVyLnggKyBheCwgeTogc2VhTGV2ZWwsIHZ4OiBheCwgdnk6IGF5LCByOiBoZWxwZXJzLnJhbmRJbnQoMSwgMil9KTtcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIG5ld0J1YmJsZShwcm9iYWJpbGl0eSkge1xyXG4gIGlmIChwbGF5ZXIgJiYgaGVscGVycy5yYW5kSW50KDEsIHByb2JhYmlsaXR5KSA9PT0gMSkge1xyXG4gICAgYnViYmxlcy5wdXNoKHt4OiBwbGF5ZXIueCwgeTogcGxheWVyLnksIHI6IGhlbHBlcnMucmFuZEludCgyLCA0KX0pO1xyXG4gIH1cclxufVxyXG5cclxuZ2FtZS5jbGljayhmdW5jdGlvbiAoZSkge1xyXG4gIC8vIFByZXZlbnQgYWNjaWRlbnRhbCBuZXcgZ2FtZSBjbGlja1xyXG4gIGlmIChjbGlja0xvY2sgPiAwIHx8IGxvbmdKdW1wKSB7XHJcbiAgICByZXR1cm4gZmFsc2U7XHJcbiAgfVxyXG5cclxuICAvLyBDcmVhdGUgbmV3IHBsYXllciwgaWYgbm90IGN1cnJlbnRseSBwbGF5aW5nXHJcbiAgaWYgKCFwbGF5ZXIpIHtcclxuICAgIG5ld0dhbWUoKTtcclxuICAgIHJldHVybiBmYWxzZTtcclxuICB9XHJcblxyXG4gIC8vIFN3aW0gLyBqdW1wXHJcbiAgaWYgKHBsYXllci55ICsgNSA+IHNlYUxldmVsKSB7XHJcbiAgICBwbGF5ZXIudmVsb2NpdHkgPSAtcGxheWVyLmp1bXBWZWxvY2l0eTtcclxuICAgIHBsYXllci5zeSA9IDEuNjtcclxuICAgIG5ld0J1YmJsZSgxMCk7XHJcbiAgfVxyXG59KTtcclxuXHJcbmdhbWUudXBkYXRlKGZ1bmN0aW9uICgpIHtcclxuICAvLyBVcGRhdGUgZnJhbWUgY291bnQsIHdoaWNoIHJlcHJlc2VudHMgdGltZSBwYXNzZWRcclxuICBmcmFtZUNvdW50ICs9IDE7XHJcblxyXG4gIGlmIChjbGlja0xvY2sgPiAwKSB7XHJcbiAgICBjbGlja0xvY2sgLT0gMTtcclxuICB9XHJcblxyXG4gIC8vIERvIG5vdGhpbmcgZWxzZSBpZiB0aGlzIGlzIHRoZSBmaXJzdCB0aW1lIHBsYXlpbmdcclxuICBpZiAoY3VycmVudExldmVsID09PSAtMSkge1xyXG4gICAgcmV0dXJuO1xyXG4gIH1cclxuXHJcbiAgLy8gU2V0IGRpZmZpY3VsdHkgYXMgYSBmdW5jdGlvbiBvZiB0aW1lXHJcbiAgaWYgKHBsYXllcikge1xyXG4gICAgaWYgKGN1cnJlbnRMZXZlbCArIDEgPCBsZXZlbFN0YXJ0RnJhbWVzLmxlbmd0aCAmJiBmcmFtZUNvdW50ID49IGxldmVsU3RhcnRGcmFtZXNbY3VycmVudExldmVsICsgMV0pIHtcclxuICAgICAgY3VycmVudExldmVsICs9IDE7XHJcbiAgICAgIHBsYXllci5sZXZlbFVwQnViYmxlcyA9IDIwICogY3VycmVudExldmVsICsgMTA7XHJcbiAgICB9XHJcbiAgICAvLyBTaG93IGxldmVsIHVwIGVmZmVjdFxyXG4gICAgaWYgKHBsYXllci5sZXZlbFVwQnViYmxlcyA+IDApIHtcclxuICAgICAgcGxheWVyLmxldmVsVXBCdWJibGVzIC09IDE7XHJcbiAgICAgIGZvciAodmFyIHUgPSAwOyB1IDwgMTA7IHUrKykge1xyXG4gICAgICAgIG5ld0J1YmJsZSgxMCk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8vIEdldCBjdXJyZW50IGxldmVsXHJcbiAgdmFyIGxldmVsID0gbGV2ZWxzW2N1cnJlbnRMZXZlbF07XHJcblxyXG4gIC8vIEFkanVzdCBpbnZpbmNpYmlsaXR5XHJcbiAgaWYgKGludmluY2liaWxpdHkgPiAwKSB7XHJcbiAgICBpbnZpbmNpYmlsaXR5IC09IDE7XHJcbiAgfVxyXG4gIC8vIEFkanVzdCByZS1zcGF3biBkYW5nZXIsIGFkanVzdGVkIGZvciB0aGUgY3VycmVudCBzcGVlZFxyXG4gIGlmIChyZXNwYXduRGFuZ2VyID4gMCkge1xyXG4gICAgcmVzcGF3bkRhbmdlciA9IE1hdGgubWF4KHJlc3Bhd25EYW5nZXIgLSBsZXZlbC5zcGVlZCwgMCk7XHJcbiAgfVxyXG5cclxuICAvLyBDcmVhdGUgbmV3IGJ1cnN0IGl0ZW1cclxuICBpZiAocGxheWVyICYmIGxldmVsLm5ld0J1cnN0SXRlbUZyYW1lQ291bnQgJiYgIWJ1cnN0TW9kZSkge1xyXG4gICAgYnVyc3RDb3VudCArPSAxO1xyXG4gICAgLy8gQWRkIHRoZSBidXJzdCBpdGVtIHN1Y2ggdGhhdCBpdCBjYW4gYmUgaW50ZXJzZWN0ZWQgcmlnaHQgYWZ0ZXIgYSBsb25nIGp1bXBcclxuICAgIGlmICghYnVyc3RJdGVtICYmXHJcbiAgICAgICAgKGJ1cnN0Q291bnQgPj0gKCFidXJzdEl0ZW1TZWVuID8gbGV2ZWwubmV3QnVyc3RJdGVtRnJhbWVDb3VudCA6IGxldmVsLm5ld0J1cnN0SXRlbUZyYW1lUmVwZWF0KSkgJiZcclxuICAgICAgICAoZnJhbWVDb3VudCAtIGxldmVsLm5ld1JvY2tGcmFtZUNvdW50ICogKGxldmVsLnNwZWVkIC8gYnVyc3RTcGVlZCkgLSBsZXZlbC5uZXdSb2NrTWF4V2lkdGggLSA0KSAlIGxldmVsLm5ld1JvY2tGcmFtZUNvdW50ID09PSAwKSB7XHJcbiAgICAgIGJ1cnN0SXRlbSA9IHt4OiBnYW1lLndpZHRoLCB5OiAzNiwgcjogNn07XHJcbiAgICAgIGJ1cnN0SXRlbVNlZW4gPSB0cnVlO1xyXG4gICAgICBidXJzdENvdW50ID0gMDtcclxuICAgIH1cclxuICB9XHJcbiAgLy8gVXBkYXRlIGJ1cnN0IGl0ZW1cclxuICBpZiAoYnVyc3RJdGVtKSB7XHJcbiAgICBidXJzdEl0ZW0ueCAtPSBidXJzdFNwZWVkO1xyXG4gICAgYnVyc3RJdGVtLnkgPSBzZWFMZXZlbCAtIDE2IC0gTWF0aC5hYnMoTWF0aC5zaW4oZnJhbWVDb3VudCAvIDEyKSkgKiAyNDtcclxuICAgIC8vIERlbGV0ZSBidXJzdCBpdGVtIHdoZW4gb3V0IG9mIGJvdW5kc1xyXG4gICAgaWYgKGJ1cnN0SXRlbS54ICsgYnVyc3RJdGVtLnIgPCAwKSB7XHJcbiAgICAgIGJ1cnN0SXRlbSA9IG51bGw7XHJcbiAgICB9XHJcbiAgfVxyXG4gIC8vIENoZWNrIGZvciBpbnRlcnNlY3Rpb24gd2l0aCBwbGF5ZXJcclxuICBpZiAocGxheWVyICYmIGJ1cnN0SXRlbSAmJlxyXG4gICAgICBoZWxwZXJzLmludGVyc2VjdGVkKHt4OiBwbGF5ZXIueCAtIDEwLCB5OiBwbGF5ZXIueSAtIDEwLCB3aWR0aDogNDAsIGhlaWdodDogMjB9LFxyXG4gICAgICAgIHt4OiBidXJzdEl0ZW0ueCwgeTogYnVyc3RJdGVtLnksIHdpZHRoOiBidXJzdEl0ZW0uciwgaGVpZ2h0OiBidXJzdEl0ZW0ucn0pKSB7XHJcbiAgICBidXJzdE1vZGUgPSB0cnVlO1xyXG4gICAgYnVyc3RNb2RlQ291bnQgPSAwO1xyXG4gICAgYnVyc3RJdGVtID0gbnVsbDtcclxuICB9XHJcblxyXG4gIC8vIFVwZGF0ZSByb2Nrc1xyXG4gIGZvciAodmFyIHIgPSAwOyByIDwgcm9ja3MubGVuZ3RoOyByKyspIHtcclxuICAgIHJvY2tzW3JdLnggLT0gbGV2ZWwuc3BlZWQ7XHJcbiAgICBpZiAoYnVyc3RNb2RlKSB7XHJcbiAgICAgIHJvY2tzW3JdLnggLT0gYnVyc3RNb2RlQ291bnQgLyA4O1xyXG4gICAgfSBlbHNlIGlmIChsb25nSnVtcCkge1xyXG4gICAgICByb2Nrc1tyXS54IC09IDEwMCArIGxldmVsLnNwZWVkO1xyXG4gICAgfVxyXG4gICAgLy8gRGVsZXRlIHJvY2sgd2hlbiBvdXQgb2YgYm91bmRzXHJcbiAgICBpZiAocm9ja3Nbcl0ueCArIHJvY2tzW3JdLndpZHRoIDwgMCkge1xyXG4gICAgICByb2Nrcy5zcGxpY2UociwgMSk7XHJcbiAgICAgIHItLTtcclxuICAgIH1cclxuICB9XHJcbiAgLy8gQ2hlY2sgZm9yIGVuZCBvZiBsb25nIGp1bXBcclxuICBpZiAobG9uZ0p1bXAgJiYgcm9ja3MubGVuZ3RoID09PSAwKSB7XHJcbiAgICBsb25nSnVtcCA9IGZhbHNlO1xyXG4gICAgaWYgKCFiYWRKdW1wKSB7XHJcbiAgICAgIGxvbmdKdW1wQ29tcGxldGVDb3VudCA9IGxvbmdKdW1wQ29tcGxldGVNYXhDb3VudDtcclxuICAgICAgLy8gVE9ETzogQW5pbWF0ZVxyXG4gICAgICBwbGF5ZXIuc2NvcmUgKz0gbG9uZ0p1bXBDb21wbGV0ZVNjb3JlO1xyXG4gICAgfVxyXG4gIH1cclxuICAvLyBDcmVhdGUgYSBuZXcgcm9ja1xyXG4gIGlmICghYnVyc3RNb2RlICYmICFsb25nSnVtcCkge1xyXG4gICAgaWYgKGZyYW1lQ291bnQgJSBsZXZlbC5uZXdSb2NrRnJhbWVDb3VudCA9PT0gMCkge1xyXG4gICAgICB2YXIgZmxvYXRlciA9IHBsYXllciA/ICEhaGVscGVycy5yYW5kSW50KDAsIDEpIDogZmFsc2U7XHJcbiAgICAgIHZhciBoZWlnaHQgPSBoZWxwZXJzLnJhbmRJbnQoMjAwLCBwbGF5ZXIgPyAzMDAgOiAyNTApO1xyXG4gICAgICByb2Nrcy5wdXNoKHtcclxuICAgICAgICB4OiBnYW1lLndpZHRoLFxyXG4gICAgICAgIHk6IGZsb2F0ZXIgPyBzZWFMZXZlbCAtICgxMCAqIGhlbHBlcnMucmFuZEludCgxLCAyKSkgOiBnYW1lLmhlaWdodCAtIGhlaWdodCxcclxuICAgICAgICB3aWR0aDogaGVscGVycy5yYW5kSW50KDMwLCBsZXZlbC5uZXdSb2NrTWF4V2lkdGgpLFxyXG4gICAgICAgIGhlaWdodDogaGVpZ2h0XHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG4gIH0gZWxzZSBpZiAoIWxvbmdKdW1wKSB7XHJcbiAgICB2YXIgdiA9IE1hdGguZmxvb3IoYnVyc3RNb2RlQ291bnQgLyBidXJzdE1vZGVNYXhDb3VudCAqIDQpO1xyXG4gICAgaWYgKGJ1cnN0TW9kZUNvdW50ICUgOCA9PT0gMCkge1xyXG4gICAgICB2YXIgaCA9IDYwICsgdiAqIDYwO1xyXG4gICAgICByb2Nrcy5wdXNoKHtcclxuICAgICAgICB4OiBnYW1lLndpZHRoLFxyXG4gICAgICAgIHk6IGdhbWUuaGVpZ2h0IC0gaCxcclxuICAgICAgICB3aWR0aDogMzAgKyB2ICogNTAsXHJcbiAgICAgICAgaGVpZ2h0OiBoXHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG4gICAgYnVyc3RNb2RlQ291bnQgKz0gMTtcclxuICAgIGlmIChidXJzdE1vZGVDb3VudCA+PSBidXJzdE1vZGVNYXhDb3VudCkge1xyXG4gICAgICBidXJzdE1vZGUgPSBmYWxzZTtcclxuICAgICAgYnVyc3RNb2RlQ291bnQgPSAwO1xyXG4gICAgICBsb25nSnVtcCA9IHRydWU7XHJcbiAgICAgIHJvY2tzLnB1c2goe1xyXG4gICAgICAgIHg6IGdhbWUud2lkdGgsXHJcbiAgICAgICAgeTogc2VhTGV2ZWwgLSAyMCxcclxuICAgICAgICB3aWR0aDogMzAwMCxcclxuICAgICAgICBoZWlnaHQ6IGdhbWUuaGVpZ2h0IC0gc2VhTGV2ZWxcclxuICAgICAgfSk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvLyBVcGRhdGUgYnViYmxlc1xyXG4gIGZvciAodmFyIGIgPSAwOyBiIDwgYnViYmxlcy5sZW5ndGg7IGIrKykge1xyXG4gICAgYnViYmxlc1tiXS54IC09IDM7XHJcbiAgICBpZiAoYnVyc3RNb2RlIHx8IGxvbmdKdW1wKSB7XHJcbiAgICAgIGJ1YmJsZXNbYl0ueCAtPSAoKGJ1cnN0TW9kZUNvdW50KSAvIGJ1cnN0TW9kZU1heENvdW50KSAqIDEwO1xyXG4gICAgfVxyXG4gICAgaWYgKGhlbHBlcnMucmFuZEludCgxLCAzKSA9PT0gMSkge1xyXG4gICAgICBidWJibGVzW2JdLnggLT0gMTtcclxuICAgIH1cclxuICAgIGlmIChoZWxwZXJzLnJhbmRJbnQoMSwgNSkpIHtcclxuICAgICAgYnViYmxlc1tiXS55ICs9IGhlbHBlcnMucmFuZEludCgtMywgMSk7XHJcbiAgICB9XHJcbiAgICAvLyBEZWxldGUgYnViYmxlIHdoZW4gb3V0IG9mIGJvdW5kc1xyXG4gICAgaWYgKGJ1YmJsZXNbYl0ueCArIGJ1YmJsZXNbYl0uciA8IDAgfHwgYnViYmxlc1tiXS55IDw9IHNlYUxldmVsKSB7XHJcbiAgICAgIGJ1YmJsZXMuc3BsaWNlKGIsIDEpO1xyXG4gICAgICBiLS07XHJcbiAgICB9XHJcbiAgfVxyXG4gIC8vIFJhbmRvbWx5IGFkZCBhIG5ldyBidWJibGVcclxuICBpZiAocGxheWVyKSB7XHJcbiAgICBuZXdCdWJibGUoMTAwKTtcclxuICB9XHJcbiAgLy8gQWRkIGJ1YmJsZXMgaW4gYnVyc3QgbW9kZVxyXG4gIGlmIChidXJzdE1vZGUpIHtcclxuICAgIGZvciAodmFyIGJ1ID0gMDsgYnUgPCAxMDsgYnUrKykge1xyXG4gICAgICBuZXdCdWJibGUoMTApO1xyXG4gICAgfVxyXG4gIH1cclxuICAvLyBDaGVjayBmb3Igcm9jayAvIGJ1YmJsZSBjb2xsaXNpb25zXHJcbiAgZm9yIChyID0gMDsgciA8IHJvY2tzLmxlbmd0aDsgcisrKSB7XHJcbiAgICBmb3IgKGIgPSAwOyBiIDwgYnViYmxlcy5sZW5ndGg7IGIrKykge1xyXG4gICAgICBpZiAoaGVscGVycy5pbnRlcnNlY3RlZCh7eDogYnViYmxlc1tiXS54LCB5OiBidWJibGVzW2JdLnksIHdpZHRoOiBidWJibGVzW2JdLnIsIGhlaWdodDogYnViYmxlc1tiXS5yfSwgcm9ja3Nbcl0pKSB7XHJcbiAgICAgICAgYnViYmxlcy5zcGxpY2UoYiwgMSk7XHJcbiAgICAgICAgYi0tO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvLyBVcGRhdGUgc3BsYXNoXHJcbiAgZm9yICh2YXIgcyA9IDA7IHMgPCBzcGxhc2gubGVuZ3RoOyBzKyspIHtcclxuICAgIHNwbGFzaFtzXS54ICs9IHNwbGFzaFtzXS52eDtcclxuICAgIHNwbGFzaFtzXS55ICs9IHNwbGFzaFtzXS52eTtcclxuICAgIHNwbGFzaFtzXS52eSArPSBncmF2aXR5O1xyXG4gICAgLy8gRGVsZXRlIHNwbGFzaFxyXG4gICAgaWYgKHNwbGFzaFtzXS55ID4gc2VhTGV2ZWwpIHtcclxuICAgICAgc3BsYXNoLnNwbGljZShzLCAxKTtcclxuICAgICAgcy0tO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLy8gVXBkYXRlIHBhcnRpY2xlc1xyXG4gIGZvciAodmFyIHAgPSAwOyBwIDwgcGFydGljbGVzLmxlbmd0aDsgcCsrKSB7XHJcbiAgICBwYXJ0aWNsZXNbcF0ueCAtPSBwYXJ0aWNsZXNbcF0udng7XHJcbiAgICBwYXJ0aWNsZXNbcF0ueSAtPSBwYXJ0aWNsZXNbcF0udnk7XHJcbiAgICAvLyBEZWxldGUgcGFydGljbGUgd2hlbiBvdXQgb2YgYm91bmRzXHJcbiAgICBpZiAocGFydGljbGVzW3BdLnggKyAzIDwgMCB8fCBwYXJ0aWNsZXNbcF0ueSArIDMgPCAwIHx8XHJcbiAgICAgICAgcGFydGljbGVzW3BdLnggLSAzID4gZ2FtZS53aWR0aCB8fCBwYXJ0aWNsZXNbcF0ueSAtIDMgPiBnYW1lLmhlaWdodCArIGJvdHRvbUxlZXdheSkge1xyXG4gICAgICBwYXJ0aWNsZXMuc3BsaWNlKHAsIDEpO1xyXG4gICAgICBwLS07XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvLyBVcGRhdGUgaGlnaCBzY29yZSBhbmltYXRpb25cclxuICBpZiAoaGlnaFNjb3JlVGltZSA+IDApIHtcclxuICAgIGhpZ2hTY29yZVRpbWUgLT0gMTtcclxuICB9XHJcblxyXG4gIC8vIFNraXAgcGxheWVyIGxvZ2ljIGlmIG5vdCBjdXJyZW50bHkgcGxheWluZ1xyXG4gIGlmICghcGxheWVyKSB7XHJcbiAgICByZXR1cm47XHJcbiAgfVxyXG5cclxuICAvLyBDaGVjayBmb3IgY29sbGlzaW9uc1xyXG4gIGZvciAociA9IDA7IHIgPCByb2Nrcy5sZW5ndGg7IHIrKykge1xyXG4gICAgaWYgKGludmluY2liaWxpdHkgPT09IDAgJiYgaGVscGVycy5pbnRlcnNlY3RlZCh7eDogcGxheWVyLngsIHk6IHBsYXllci55LCB3aWR0aDogMjAsIGhlaWdodDogMTB9LCByb2Nrc1tyXSkpIHtcclxuICAgICAgZW5kR2FtZSgpO1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvLyBVcGRhdGUgcGxheWVyXHJcbiAgaWYgKGZyYW1lQ291bnQgJSBzY29yZUZyYW1lQ291bnQgPT09IDApIHtcclxuICAgIHBsYXllci5zY29yZSArPSBzY29yZUluY3JlbWVudDtcclxuICB9XHJcbiAgaWYgKHBsYXllci5zeSA+IDEpIHtcclxuICAgIHBsYXllci5zeSAtPSAwLjE7XHJcbiAgfVxyXG4gIGlmIChwbGF5ZXIuYmVzdCAmJiBwbGF5ZXIuc2NvcmUgPiBwbGF5ZXIuYmVzdCkge1xyXG4gICAgcGxheWVyLmJlc3QgPSBwbGF5ZXIuc2NvcmU7XHJcbiAgfVxyXG4gIHBsYXllci52ZWxvY2l0eSArPSBncmF2aXR5O1xyXG4gIGlmIChwbGF5ZXIudmVsb2NpdHkgPiBwbGF5ZXIudGVybWluYWxWZWxvY2l0eSkge1xyXG4gICAgcGxheWVyLnZlbG9jaXR5ID0gcGxheWVyLnRlcm1pbmFsVmVsb2NpdHk7XHJcbiAgfVxyXG4gIHBsYXllci55ICs9IHBsYXllci52ZWxvY2l0eTtcclxuICBpZiAocGxheWVyLnkgPj0gZ2FtZS5oZWlnaHQgKyBib3R0b21MZWV3YXkpIHtcclxuICAgIGVuZEdhbWUoKTtcclxuICAgIHJldHVybjtcclxuICB9XHJcbiAgaWYgKChwbGF5ZXIueSAtIHBsYXllci52ZWxvY2l0eSA+PSBzZWFMZXZlbCAmJiBwbGF5ZXIueSA8IHNlYUxldmVsKSB8fFxyXG4gICAgICAocGxheWVyLnkgLSBwbGF5ZXIudmVsb2NpdHkgPD0gc2VhTGV2ZWwgJiYgcGxheWVyLnkgPiBzZWFMZXZlbCkpIHtcclxuICAgIG5ld1NwbGFzaCgpO1xyXG4gIH1cclxufSk7XHJcblxyXG5nYW1lLnJlbmRlcihmdW5jdGlvbiAoY3R4KSB7XHJcbiAgLy8gRHJhdyBiYWNrZ3JvdW5kXHJcbiAgY3R4LmZpbGxTdHlsZSA9ICcjZWNlJztcclxuICBjdHguZmlsbFJlY3QoMCwgMCwgZ2FtZS53aWR0aCwgZ2FtZS5oZWlnaHQpO1xyXG5cclxuICAvLyBEcmF3IHNreVxyXG4gIHZhciBncmQgPSBjdHguY3JlYXRlTGluZWFyR3JhZGllbnQoZ2FtZS53aWR0aCAvIDIsIDAuMDAwLCBnYW1lLndpZHRoIC8gMiwgc2VhTGV2ZWwpO1xyXG4gIGdyZC5hZGRDb2xvclN0b3AoMC4wMDAsICcjODBiZWZjJyk7XHJcbiAgZ3JkLmFkZENvbG9yU3RvcCgxLjAwMCwgJyNjYmNmZWQnKTtcclxuICBjdHguZmlsbFN0eWxlID0gZ3JkO1xyXG4gIGN0eC5maWxsUmVjdCgwLCAwLCBnYW1lLndpZHRoLCBzZWFMZXZlbCk7XHJcblxyXG4gIC8vIERyYXcgd2F0ZXJcclxuICBncmQgPSBjdHguY3JlYXRlTGluZWFyR3JhZGllbnQoZ2FtZS53aWR0aCAvIDIsIHNlYUxldmVsLCBnYW1lLndpZHRoIC8gMiwgZ2FtZS5oZWlnaHQgLSBzZWFMZXZlbCk7XHJcbiAgZ3JkLmFkZENvbG9yU3RvcCgwLjAwMCwgJyM3RUJERkMnKTtcclxuICBncmQuYWRkQ29sb3JTdG9wKDAuMTAwLCAnIzAwN2ZmZicpO1xyXG4gIGdyZC5hZGRDb2xvclN0b3AoMS4wMDAsICcjMDAzZjdmJyk7XHJcbiAgY3R4LmZpbGxTdHlsZSA9IGdyZDtcclxuICBjdHguZmlsbFJlY3QoMCwgc2VhTGV2ZWwsIGdhbWUud2lkdGgsIGdhbWUuaGVpZ2h0IC0gc2VhTGV2ZWwpO1xyXG5cclxuICAvLyBXYXRlciBsaWdodGluZyAobm90ZTogY29vcmRpbmF0ZXMgYXJlIG9mZiwgYnV0IHRoZSBtaXN0YWtlIGxvb2tzIGJldHRlcilcclxuICBncmQgPSBjdHguY3JlYXRlTGluZWFyR3JhZGllbnQoMCwgMCwgZ2FtZS53aWR0aCwgZ2FtZS5oZWlnaHQgLSBzZWFMZXZlbCk7XHJcbiAgZ3JkLmFkZENvbG9yU3RvcCgwLjAwMCwgJ3JnYmEoMCwgMTI3LCAyNTUsIDAuMjAwKScpO1xyXG4gIGdyZC5hZGRDb2xvclN0b3AoMC4xMDAsICdyZ2JhKDI1NSwgMjU1LCAyNTUsIDAuMjAwKScpO1xyXG4gIGdyZC5hZGRDb2xvclN0b3AoMC4yMDAsICdyZ2JhKDAsIDEyNywgMjU1LCAwLjIwMCknKTtcclxuICBncmQuYWRkQ29sb3JTdG9wKDAuNTAwLCAncmdiYSgyNTUsIDI1NSwgMjU1LCAwLjIwMCknKTtcclxuICBncmQuYWRkQ29sb3JTdG9wKDAuNjAwLCAncmdiYSgwLCAxMjcsIDI1NSwgMC4yMDApJyk7XHJcbiAgZ3JkLmFkZENvbG9yU3RvcCgwLjgwMCwgJ3JnYmEoMjU1LCAyNTUsIDI1NSwgMC4yMDApJyk7XHJcbiAgZ3JkLmFkZENvbG9yU3RvcCgxLjAwMCwgJ3JnYmEoMCwgMTI3LCAyNTUsIDAuMjAwKScpO1xyXG4gIGN0eC5maWxsU3R5bGUgPSBncmQ7XHJcbiAgY3R4LmZpbGxSZWN0KDAsIHNlYUxldmVsLCBnYW1lLndpZHRoLCBnYW1lLmhlaWdodCAtIHNlYUxldmVsKTtcclxuXHJcbiAgLy8gRHJhdyBidXJzdCBpdGVtXHJcbiAgaWYgKGJ1cnN0SXRlbSkge1xyXG4gICAgaGVscGVycy5maWxsQ2lyY2xlKGN0eCwgYnVyc3RJdGVtLngsIGJ1cnN0SXRlbS55LCBidXJzdEl0ZW0uciwgJyNEMzQzODQnKTtcclxuICB9XHJcblxyXG4gIC8vIERyYXcgc3BsYXNoXHJcbiAgZm9yICh2YXIgcyA9IDA7IHMgPCBzcGxhc2gubGVuZ3RoOyBzKyspIHtcclxuICAgIGhlbHBlcnMuZmlsbENpcmNsZShjdHgsIHNwbGFzaFtzXS54LCBzcGxhc2hbc10ueSwgc3BsYXNoW3NdLnIsICcjN0VCREZDJyk7XHJcbiAgfVxyXG5cclxuICAvLyBEcmF3IGJ1YmJsZXNcclxuICBmb3IgKHZhciBiID0gMDsgYiA8IGJ1YmJsZXMubGVuZ3RoOyBiKyspIHtcclxuICAgIGhlbHBlcnMuZmlsbENpcmNsZShjdHgsIGJ1YmJsZXNbYl0ueCwgYnViYmxlc1tiXS55LCBidWJibGVzW2JdLnIsICdyZ2JhKDI1NSwgMjU1LCAyNTUsIDAuOCknKTtcclxuICB9XHJcblxyXG4gIC8vIERyYXcgcm9ja3NcclxuICBmb3IgKHZhciByID0gMDsgciA8IHJvY2tzLmxlbmd0aDsgcisrKSB7XHJcbiAgICBjdHguZmlsbFN0eWxlID0gJyM1ZDQnO1xyXG4gICAgY3R4LmZpbGxSZWN0KHJvY2tzW3JdLngsIHJvY2tzW3JdLnksIHJvY2tzW3JdLndpZHRoLCByb2Nrc1tyXS5oZWlnaHQpO1xyXG4gIH1cclxuXHJcbiAgLy8gRHJhdyBwYXJ0aWNsZXNcclxuICBmb3IgKHZhciBwID0gMDsgcCA8IHBhcnRpY2xlcy5sZW5ndGg7IHArKykge1xyXG4gICAgaGVscGVycy5maWxsQ2lyY2xlKGN0eCwgcGFydGljbGVzW3BdLngsIHBhcnRpY2xlc1twXS55LCAzLCAnI2ZmNCcpO1xyXG4gIH1cclxuXHJcbiAgLy8gRHJhdyBzY29yZVxyXG4gIGlmIChwbGF5ZXIgfHwgaGlnaFNjb3JlKSB7XHJcbiAgICBjdHguZm9udCA9ICdib2xkIDIwcHggc2Fucy1zZXJpZic7XHJcbiAgICBjdHgudGV4dEFsaWduID0gJ2NlbnRlcic7XHJcbiAgICBoZWxwZXJzLm91dGxpbmVUZXh0KGN0eCwgcGxheWVyID8gcGxheWVyLnNjb3JlIDogJ0hpZ2ggU2NvcmUnLCBnYW1lLndpZHRoIC8gMiwgMjIsICcjMzMzJywgJyNmZmYnKTtcclxuICB9XHJcbiAgaWYgKGhpZ2hTY29yZSkge1xyXG4gICAgY3R4LmZvbnQgPSAnYm9sZCAyMHB4IHNhbnMtc2VyaWYnO1xyXG4gICAgaGVscGVycy5vdXRsaW5lVGV4dChjdHgsIGhpZ2hTY29yZSwgZ2FtZS53aWR0aCAvIDIsIDUxLCAnIzMzMycsICcjZmZmJyk7XHJcbiAgICBpZiAoaGlnaFNjb3JlVGltZSA+IDApIHtcclxuICAgICAgdmFyIG9mZnNldCA9IChoaWdoU2NvcmVUaW1lKSAqIDI7XHJcbiAgICAgIHZhciBmYWRlID0gKGhpZ2hTY29yZVRpbWUgLyBoaWdoU2NvcmVNYXhUaW1lICogMik7XHJcbiAgICAgIGN0eC5mb250ID0gJ2JvbGQgJyArICgyNCArIG9mZnNldCkgKyAncHggc2Fucy1zZXJpZic7XHJcbiAgICAgIGN0eC5maWxsU3R5bGUgPSAncmdiYSgyNTUsIDI1NSwgMjU1LCAnICsgZmFkZSArICcpJztcclxuICAgICAgY3R4LmZpbGxUZXh0KGhpZ2hTY29yZSwgZ2FtZS53aWR0aCAvIDIsIDY0ICsgKG9mZnNldCAqIDEuNSkpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLy8gRHJhdyBsZXZlbCBiYWRnZXNcclxuICBmb3IgKHZhciBiYWRnZSA9IDA7IGJhZGdlIDwgY3VycmVudExldmVsOyBiYWRnZSsrKSB7XHJcbiAgICB2YXIgeCA9IChnYW1lLndpZHRoIC0gKGJhZGdlICUgNCkgKiAyOCAtIDE2KTtcclxuICAgIHZhciB5ID0gMTYgKyAoMjQgKiBNYXRoLmZsb29yKGJhZGdlIC8gNCkpO1xyXG4gICAgY3R4LmZpbGxTdHlsZSA9ICcjZmY0JztcclxuICAgIGN0eC5iZWdpblBhdGgoKTtcclxuICAgIGN0eC5tb3ZlVG8oeCArIDgsIHkpO1xyXG4gICAgY3R4LmxpbmVUbyh4LCB5ICsgOCk7XHJcbiAgICBjdHgubGluZVRvKHgsIHkgLSA4KTtcclxuICAgIGN0eC5maWxsKCk7XHJcbiAgICBjdHgubW92ZVRvKHgsIHkpO1xyXG4gICAgY3R4LmxpbmVUbyh4IC0gOCwgeSArIDgpO1xyXG4gICAgY3R4LmxpbmVUbyh4IC0gOCwgeSAtIDgpO1xyXG4gICAgY3R4LmZpbGwoKTtcclxuICB9XHJcblxyXG4gIC8vIERyYXcgYnVyc3QgbW9kZSBtZXRlclxyXG4gIGlmIChidXJzdE1vZGUpIHtcclxuICAgIHZhciBidyA9IDE1MztcclxuICAgIGhlbHBlcnMuZHJhd01ldGVyKGN0eCwgZ2FtZS53aWR0aCAtIGJ3IC0gNSwgc2VhTGV2ZWwgLSAyMiwgYncsIDEyLCBidXJzdE1vZGVNYXhDb3VudCAtIGJ1cnN0TW9kZUNvdW50LCBidXJzdE1vZGVNYXhDb3VudCwgJyM1ZDQnKTtcclxuICB9XHJcblxyXG4gIC8vIERyYXcgcGxheWVyXHJcbiAgaWYgKHBsYXllciAmJiAoaW52aW5jaWJpbGl0eSAlIGludmluY2liaWxpdHlCbGluayA8IGludmluY2liaWxpdHlCbGluayAtIDQpKSB7XHJcbiAgICBoZWxwZXJzLmZpbGxFbGxpcHNlKGN0eCwgcGxheWVyLngsIHBsYXllci55LCAxMCwgMiwgcGxheWVyLnN5LCBpbnZpbmNpYmlsaXR5ID8gJ3JnYmEoMjU1LCAyNTUsIDY4LCAwLjUpJyA6ICcjZmY0Jyk7XHJcbiAgICBoZWxwZXJzLmZpbGxDaXJjbGUoY3R4LCBwbGF5ZXIueCArIDUsIHBsYXllci55IC0gMiwgMywgJyMzMzAnKTtcclxuICB9XHJcblxyXG4gIC8vIERyYXcgd2F0ZXIgZGVwdGggZ3JhZGllbnRcclxuICBncmQgPSBjdHguY3JlYXRlTGluZWFyR3JhZGllbnQoZ2FtZS53aWR0aCAvIDIsIHNlYUxldmVsLCBnYW1lLndpZHRoIC8gMiwgZ2FtZS5oZWlnaHQpO1xyXG4gIGdyZC5hZGRDb2xvclN0b3AoMC4wMDAsICdyZ2JhKDAsIDEyNywgMjU1LCAwLjEwMCknKTtcclxuICBncmQuYWRkQ29sb3JTdG9wKDAuNzAwLCAncmdiYSgwLCA2MywgMTI3LCAwLjEwMCknKTtcclxuICBncmQuYWRkQ29sb3JTdG9wKDEuMDAwLCAncmdiYSgwLCA2MywgMTI3LCAwLjYwMCknKTtcclxuICBjdHguZmlsbFN0eWxlID0gZ3JkO1xyXG4gIGN0eC5maWxsUmVjdCgwLCBzZWFMZXZlbCwgZ2FtZS53aWR0aCwgZ2FtZS5oZWlnaHQgLSBzZWFMZXZlbCk7XHJcblxyXG4gIGlmICghcGxheWVyKSB7XHJcbiAgICAvLyBEcmF3IHByZS1nYW1lIHRleHRcclxuICAgIGlmICgoZnJhbWVDb3VudCAlIDEyMCA+IDUgJiYgZnJhbWVDb3VudCAlIDEyMCA8IDIwKSB8fCBmcmFtZUNvdW50ICUgMTIwID4gMjUpIHtcclxuICAgICAgY3R4LmZvbnQgPSAnYm9sZCA2NHB4IHNhbnMtc2VyaWYnO1xyXG4gICAgICBjdHgudGV4dEFsaWduID0gJ2NlbnRlcic7XHJcbiAgICAgIGlmIChoaWdoU2NvcmUpIHtcclxuICAgICAgICBoZWxwZXJzLm91dGxpbmVUZXh0KGN0eCwgJ0dhbWUgb3ZlciEnLCBnYW1lLndpZHRoIC8gMiwgZ2FtZS5oZWlnaHQgLyAyIC0gMzAsICcjMzMzJywgJyNmZmYnKTtcclxuICAgICAgICBoZWxwZXJzLm91dGxpbmVUZXh0KGN0eCwgJ0NsaWNrIGFnYWluIScsIGdhbWUud2lkdGggLyAyLCBnYW1lLmhlaWdodCAvIDIgKyA0MCwgJyMzMzMnLCAnI2ZmZicpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGhlbHBlcnMub3V0bGluZVRleHQoY3R4LCAnQ2xpY2sgdG8gc3RhcnQhJywgZ2FtZS53aWR0aCAvIDIsIGdhbWUuaGVpZ2h0IC8gMiwgJyMzMzMnLCAnI2ZmZicpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBpZiAocGxheWVyICYmIGxvbmdKdW1wQ29tcGxldGVDb3VudCA+IDApIHtcclxuICAgIC8vIERyYXcgbWVzc2FnZVxyXG4gICAgbG9uZ0p1bXBDb21wbGV0ZUNvdW50IC09IDE7XHJcbiAgICBjdHguZm9udCA9ICdib2xkIDcycHggc2Fucy1zZXJpZic7XHJcbiAgICBjdHgudGV4dEFsaWduID0gJ2NlbnRlcic7XHJcbiAgICBpZiAobG9uZ0p1bXBDb21wbGV0ZUNvdW50ICUgMjAgPiA1KSB7XHJcbiAgICAgIGhlbHBlcnMub3V0bGluZVRleHQoY3R4LCAnTmljZSBqdW1wIScsIGdhbWUud2lkdGggLyAyLCBnYW1lLmhlaWdodCAvIDIsICcjMzMzJywgJyNmZmYnKTtcclxuICAgIH1cclxuICB9XHJcbn0pO1xyXG5cclxuLy8gVE9ETzogRGVsZXRlIHRoaXNcclxuZ2FtZS5ydW4oKTtcclxuXHJcbi8vIFRPRE86IEdldCB0aGUgcnVudGltZSB0byBleHBvc2UgdGhpcyBvYmplY3QgdGhyb3VnaCBhIGdlc3NvLmN1cnJlbnQgZ2xvYmFsXHJcbm1vZHVsZS5leHBvcnRzID0gZ2FtZTtcclxuIiwibW9kdWxlLmV4cG9ydHMgPSB7XHJcbiAgcmFuZEludDogZnVuY3Rpb24gKG1pbiwgbWF4KSB7XHJcbiAgICByZXR1cm4gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogKG1heCAtIG1pbiArIDEpKSArIG1pbjtcclxuICB9LFxyXG4gIGZpbGxDaXJjbGU6IGZ1bmN0aW9uIChjdHgsIHgsIHksIHIsIGNvbG9yKSB7XHJcbiAgICBjdHguYmVnaW5QYXRoKCk7XHJcbiAgICBjdHguYXJjKHgsIHksIHIsIDAsIDIgKiBNYXRoLlBJLCBmYWxzZSk7XHJcbiAgICBjdHguZmlsbFN0eWxlID0gY29sb3I7XHJcbiAgICBjdHguZmlsbCgpO1xyXG4gIH0sXHJcbiAgZmlsbEVsbGlwc2U6IGZ1bmN0aW9uIChjdHgsIHgsIHksIHIsIHN4LCBzeSwgY29sb3IpIHtcclxuICAgIGN0eC5zYXZlKCk7XHJcbiAgICBjdHgudHJhbnNsYXRlKC14ICogKHN4IC0gMSksIC15ICogKHN5IC0gMSkpO1xyXG4gICAgY3R4LnNjYWxlKHN4LCBzeSk7XHJcbiAgICBjdHguYmVnaW5QYXRoKCk7XHJcbiAgICBjdHguYXJjKHgsIHksIHIsIDAsIDIgKiBNYXRoLlBJLCBmYWxzZSk7XHJcbiAgICBjdHgucmVzdG9yZSgpO1xyXG4gICAgY3R4LmZpbGxTdHlsZSA9IGNvbG9yO1xyXG4gICAgY3R4LmZpbGwoKTtcclxuICB9LFxyXG4gIGRyYXdNZXRlcjogZnVuY3Rpb24gKGN0eCwgeCwgeSwgd2lkdGgsIGhlaWdodCwgdmFsdWUsIG1heCwgY29sb3IpIHtcclxuICAgIGN0eC5maWxsU3R5bGUgPSAnI2ZmZic7XHJcbiAgICBjdHguZmlsbFJlY3QoeCwgeSwgd2lkdGgsIGhlaWdodCk7XHJcbiAgICBjdHguZmlsbFN0eWxlID0gJyMwMDAnO1xyXG4gICAgY3R4LmZpbGxSZWN0KHggKyAyLCB5ICsgMiwgd2lkdGggLSA0LCBoZWlnaHQgLSA0KTtcclxuICAgIGN0eC5maWxsU3R5bGUgPSBjb2xvcjtcclxuICAgIHZhciBtZXRlcldpZHRoID0gd2lkdGggLSA4O1xyXG4gICAgY3R4LmZpbGxSZWN0KHggKyA0ICsgKChtYXggLSB2YWx1ZSkgLyBtYXgpICogbWV0ZXJXaWR0aCwgeSArIDQsIG1ldGVyV2lkdGggLSAoKG1heCAtIHZhbHVlKSAvIG1heCkgKiBtZXRlcldpZHRoLCBoZWlnaHQgLSA4KTtcclxuICB9LFxyXG4gIG91dGxpbmVUZXh0OiBmdW5jdGlvbiAoY3R4LCB0ZXh0LCB4LCB5LCBjb2xvciwgb3V0bGluZSkge1xyXG4gICAgY3R4LmZpbGxTdHlsZSA9IGNvbG9yO1xyXG4gICAgY3R4LmZpbGxUZXh0KHRleHQsIHggLSAxLCB5KTtcclxuICAgIGN0eC5maWxsVGV4dCh0ZXh0LCB4ICsgMSwgeSk7XHJcbiAgICBjdHguZmlsbFRleHQodGV4dCwgeCwgeSAtIDEpO1xyXG4gICAgY3R4LmZpbGxUZXh0KHRleHQsIHgsIHkgKyAyKTtcclxuICAgIGN0eC5maWxsU3R5bGUgPSBvdXRsaW5lO1xyXG4gICAgY3R4LmZpbGxUZXh0KHRleHQsIHgsIHkpO1xyXG4gIH0sXHJcbiAgaW50ZXJzZWN0ZWQ6IGZ1bmN0aW9uIChyZWN0MSwgcmVjdDIpIHtcclxuICAgIHJldHVybiAocmVjdDEueCA8IHJlY3QyLnggKyByZWN0Mi53aWR0aCAmJlxyXG4gICAgICByZWN0MS54ICsgcmVjdDEud2lkdGggPiByZWN0Mi54ICYmXHJcbiAgICAgIHJlY3QxLnkgPCByZWN0Mi55ICsgcmVjdDIuaGVpZ2h0ICYmXHJcbiAgICAgIHJlY3QxLmhlaWdodCArIHJlY3QxLnkgPiByZWN0Mi55KTtcclxuICB9XHJcbn07XHJcbiIsInZhciBsb3dMZXZlbCA9IHJlcXVpcmUoJy4vbG93TGV2ZWwnKTtcclxuXHJcblxyXG5mdW5jdGlvbiBDb250cm9sbGVyKGdlc3NvLCBjYW52YXMpIHtcclxuICB0aGlzLmdlc3NvID0gZ2Vzc287XHJcbiAgdGhpcy5jYW52YXMgPSBjYW52YXMgfHwgbG93TGV2ZWwuZ2V0Q2FudmFzKCk7XHJcbiAgdGhpcy5fY29udGV4dCA9IHRoaXMuY2FudmFzLmdldENvbnRleHQoJzJkJyk7XHJcbiAgdGhpcy5fcnVubmluZyA9IG51bGw7XHJcbiAgdGhpcy5fcmVxdWVzdElkID0gbnVsbDtcclxufVxyXG5Db250cm9sbGVyLnByb3RvdHlwZS5zdGVwT25jZSA9IGZ1bmN0aW9uICh0aW1lc3RhbXApIHtcclxuICB0aGlzLmdlc3NvLnN0ZXAodGhpcy5fY29udGV4dCk7XHJcbn07XHJcbkNvbnRyb2xsZXIucHJvdG90eXBlLmNvbnRpbnVlT24gPSBmdW5jdGlvbiAodGltZXN0YW1wKSB7XHJcbiAgdGhpcy5zdGVwT25jZSgpO1xyXG5cclxuICB2YXIgc2VsZiA9IHRoaXM7XHJcbiAgc2VsZi5fcmVxdWVzdElkID0gbG93TGV2ZWwucmVxdWVzdEFuaW1hdGlvbkZyYW1lKGZ1bmN0aW9uICh0aW1lc3RhbXApIHtcclxuICAgIHNlbGYuX3JlcXVlc3RJZCA9IG51bGw7XHJcbiAgICBpZiAoIXNlbGYuX3J1bm5pbmcpIHtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG4gICAgLy8gVE9ETzogRlBTXHJcbiAgICBzZWxmLmNvbnRpbnVlT24oKTtcclxuICB9KTtcclxufTtcclxuQ29udHJvbGxlci5wcm90b3R5cGUuc3RhcnQgPSBmdW5jdGlvbiBzdGFydCgpIHtcclxuICBpZiAodGhpcy5fcnVubmluZykge1xyXG4gICAgcmV0dXJuO1xyXG4gIH1cclxuICB0aGlzLl9ydW5uaW5nID0gdHJ1ZTtcclxuXHJcbiAgdGhpcy5nZXNzby5pbml0aWFsaXplKCk7XHJcbiAgdGhpcy5nZXNzby5zdGFydC5pbnZva2UoKTtcclxuICAvLyBUT0RPOiBVc2UgYSBzY2hlZHVsZXJcclxuICB0aGlzLmNvbnRpbnVlT24oKTtcclxufTtcclxuQ29udHJvbGxlci5wcm90b3R5cGUuc3RvcCA9IGZ1bmN0aW9uIHN0b3AoKSB7XHJcbiAgaWYgKCF0aGlzLl9ydW5uaW5nKSB7XHJcbiAgICByZXR1cm47XHJcbiAgfVxyXG4gIHRoaXMuX3J1bm5pbmcgPSBmYWxzZTtcclxuXHJcbiAgbG93TGV2ZWwuY2FuY2VsQW5pbWF0aW9uRnJhbWUodGhpcy5fcmVxdWVzdElkKTtcclxuICB0aGlzLl9yZXF1ZXN0SWQgPSBudWxsO1xyXG4gIHRoaXMuZ2Vzc28uc3RvcC5pbnZva2UoKTtcclxufTtcclxuXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IENvbnRyb2xsZXI7XHJcbiIsInZhciB1dGlsID0gcmVxdWlyZSgnLi91dGlsJyk7XHJcblxyXG5cclxuLy8gUmV0dXJucyBhIGNhbGxhYmxlIG9iamVjdCB0aGF0LCB3aGVuIGNhbGxlZCB3aXRoIGEgZnVuY3Rpb24sIHN1YnNjcmliZXNcclxuLy8gdG8gdGhlIGRlbGVnYXRlLiBDYWxsIGludm9rZSBvbiB0aGlzIG9iamVjdCB0byBpbnZva2UgZWFjaCBoYW5kbGVyLlxyXG5mdW5jdGlvbiBEZWxlZ2F0ZShzdWJzY3JpYmVkLCB1bnN1YnNjcmliZWQpIHtcclxuICB2YXIgaGFuZGxlcnMgPSBbXTtcclxuXHJcbiAgZnVuY3Rpb24gY2FsbGFibGUoaGFuZGxlcikge1xyXG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggIT09IDEpIHtcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdEZWxlZ2F0ZSB0YWtlcyBleGFjdGx5IDEgYXJndW1lbnQgKCcgKyBhcmd1bWVudHMubGVuZ3RoICsgJyBnaXZlbiknKTtcclxuICAgIH0gZWxzZSBpZiAodHlwZW9mIGhhbmRsZXIgIT09ICdmdW5jdGlvbicpIHtcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdEZWxlZ2F0ZSBhcmd1bWVudCBtdXN0IGJlIGEgRnVuY3Rpb24gb2JqZWN0IChnb3QgJyArIHR5cGVvZiBoYW5kbGVyICsgJyknKTtcclxuICAgIH1cclxuICAgIC8vIEFkZCB0aGUgaGFuZGxlclxyXG4gICAgaGFuZGxlcnMucHVzaChoYW5kbGVyKTtcclxuICAgIC8vIEFsbG93IGN1c3RvbSBsb2dpYyBvbiBzdWJzY3JpYmUsIHBhc3NpbmcgaW4gdGhlIGhhbmRsZXJcclxuICAgIHZhciBzdWJzY3JpYmVkUmVzdWx0O1xyXG4gICAgaWYgKHN1YnNjcmliZWQpIHtcclxuICAgICAgc3Vic2NyaWJlZFJlc3VsdCA9IHN1YnNjcmliZWQoaGFuZGxlcik7XHJcbiAgICB9XHJcbiAgICAvLyBSZXR1cm4gdGhlIHVuc3Vic2NyaWJlIGZ1bmN0aW9uXHJcbiAgICByZXR1cm4gZnVuY3Rpb24gdW5zdWJzY3JpYmUoKSB7XHJcbiAgICAgIHZhciBpbml0aWFsSGFuZGxlciA9IHV0aWwucmVtb3ZlTGFzdChoYW5kbGVycywgaGFuZGxlcik7XHJcbiAgICAgIC8vIEFsbG93IGN1c3RvbSBsb2dpYyBvbiB1bnN1YnNjcmliZSwgcGFzc2luZyBpbiB0aGUgb3JpZ2luYWwgaGFuZGxlclxyXG4gICAgICBpZiAodW5zdWJzY3JpYmVkKSB7XHJcbiAgICAgICAgdW5zdWJzY3JpYmVkKGluaXRpYWxIYW5kbGVyLCBzdWJzY3JpYmVkUmVzdWx0KTtcclxuICAgICAgfVxyXG4gICAgICAvLyBSZXR1cm4gdGhlIG9yaWdpbmFsIGhhbmRsZXJcclxuICAgICAgcmV0dXJuIGluaXRpYWxIYW5kbGVyO1xyXG4gICAgfTtcclxuICB9XHJcbiAgY2FsbGFibGUuaW52b2tlID0gZnVuY3Rpb24gaW52b2tlKCkge1xyXG4gICAgdmFyIGFyZ3MgPSBhcmd1bWVudHM7XHJcbiAgICB1dGlsLmZvckVhY2goaGFuZGxlcnMsIGZ1bmN0aW9uIChoYW5kbGVyKSB7XHJcbiAgICAgIGhhbmRsZXIuYXBwbHkobnVsbCwgYXJncyk7XHJcbiAgICB9KTtcclxuICB9O1xyXG4gIC8vIEV4cG9zZSBoYW5kbGVycyBmb3IgaW5zcGVjdGlvblxyXG4gIGNhbGxhYmxlLmhhbmRsZXJzID0gaGFuZGxlcnM7XHJcblxyXG4gIHJldHVybiBjYWxsYWJsZTtcclxufVxyXG5cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gRGVsZWdhdGU7XHJcbiIsInZhciBDb250cm9sbGVyID0gcmVxdWlyZSgnLi9jb250cm9sbGVyJyk7XHJcbnZhciBEZWxlZ2F0ZSA9IHJlcXVpcmUoJy4vZGVsZWdhdGUnKTtcclxudmFyIGxvd0xldmVsID0gcmVxdWlyZSgnLi9sb3dMZXZlbCcpO1xyXG52YXIgbG9nZ2luZyA9IHJlcXVpcmUoJy4vbG9nZ2luZycpO1xyXG5cclxuXHJcbmZ1bmN0aW9uIEdlc3NvKG9wdGlvbnMpIHtcclxuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcclxuICB0aGlzLmNvbnRleHRUeXBlID0gb3B0aW9ucy5jb250ZXh0VHlwZSB8fCAnMmQnO1xyXG4gIHRoaXMuY29udGV4dEF0dHJpYnV0ZXMgPSBvcHRpb25zLmNvbnRleHRBdHRyaWJ1dGVzO1xyXG4gIHRoaXMuZnBzID0gb3B0aW9ucy5mcHMgfHwgNjA7XHJcbiAgdGhpcy5hdXRvcGxheSA9IG9wdGlvbnMuYXV0b3BsYXkgfHwgdHJ1ZTtcclxuICB0aGlzLnNldHVwID0gbmV3IERlbGVnYXRlKCk7XHJcbiAgdGhpcy5zdGFydCA9IG5ldyBEZWxlZ2F0ZSgpO1xyXG4gIHRoaXMuc3RvcCA9IG5ldyBEZWxlZ2F0ZSgpO1xyXG4gIHRoaXMudXBkYXRlID0gbmV3IERlbGVnYXRlKCk7XHJcbiAgdGhpcy5yZW5kZXIgPSBuZXcgRGVsZWdhdGUoKTtcclxuICB0aGlzLmNsaWNrID0gbmV3IERlbGVnYXRlKGZ1bmN0aW9uIChoYW5kbGVyKSB7XHJcbiAgICAvLyBUT0RPOiBVc2UgdGhlIGNhbnZhcyBwYXNzZWQgaW50byBydW4oKVxyXG4gICAgdmFyIGhhbmRsZXJXcmFwcGVyID0gZnVuY3Rpb24gKGUpIHtcclxuICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICBoYW5kbGVyKGUpO1xyXG4gICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9O1xyXG4gICAgR2Vzc28uZ2V0Q2FudmFzKCkuYWRkRXZlbnRMaXN0ZW5lcigndG91Y2hzdGFydCcsIGhhbmRsZXJXcmFwcGVyLCBmYWxzZSk7XHJcbiAgICBHZXNzby5nZXRDYW52YXMoKS5hZGRFdmVudExpc3RlbmVyKCdtb3VzZWRvd24nLCBoYW5kbGVyV3JhcHBlciwgZmFsc2UpO1xyXG4gICAgcmV0dXJuIGhhbmRsZXJXcmFwcGVyO1xyXG4gIH0sIGZ1bmN0aW9uIChoYW5kbGVyLCBoYW5kbGVyV3JhcHBlcikge1xyXG4gICAgR2Vzc28uZ2V0Q2FudmFzKCkucmVtb3ZlRXZlbnRMaXN0ZW5lcigndG91Y2hzdGFydCcsIGhhbmRsZXJXcmFwcGVyIHx8IGhhbmRsZXIpO1xyXG4gICAgR2Vzc28uZ2V0Q2FudmFzKCkucmVtb3ZlRXZlbnRMaXN0ZW5lcignbW91c2Vkb3duJywgaGFuZGxlcldyYXBwZXIgfHwgaGFuZGxlcik7XHJcbiAgfSk7XHJcbiAgdGhpcy53aWR0aCA9IG9wdGlvbnMud2lkdGggfHwgNjQwOyAgICAvLyBUT0RPOiBhbGxvdyAnbnVsbCcgdG8gdXNlIHdpZHRoIG9mIHRhcmdldCBjYW52YXNcclxuICB0aGlzLmhlaWdodCA9IG9wdGlvbnMuaGVpZ2h0IHx8IDQ4MDsgIC8vIFRPRE86IGFsbG93ICdudWxsJyB0byB1c2UgaGVpZ2h0IG9mIHRhcmdldCBjYW52YXNcclxuICB0aGlzLl9pbml0aWFsaXplZCA9IGZhbHNlO1xyXG59XHJcbkdlc3NvLkNvbnRyb2xsZXIgPSBDb250cm9sbGVyO1xyXG5HZXNzby5EZWxlZ2F0ZSA9IERlbGVnYXRlO1xyXG5HZXNzby5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUgPSBsb3dMZXZlbC5yZXF1ZXN0QW5pbWF0aW9uRnJhbWU7XHJcbkdlc3NvLmNhbmNlbEFuaW1hdGlvbkZyYW1lID0gbG93TGV2ZWwuY2FuY2VsQW5pbWF0aW9uRnJhbWU7XHJcbkdlc3NvLmdldENhbnZhcyA9IGxvd0xldmVsLmdldENhbnZhcztcclxuR2Vzc28uZ2V0Q29udGV4dDJEID0gbG93TGV2ZWwuZ2V0Q29udGV4dDJEO1xyXG5HZXNzby5nZXRXZWJHTENvbnRleHQgPSBsb3dMZXZlbC5nZXRXZWJHTENvbnRleHQ7XHJcbkdlc3NvLmVycm9yID0gbG9nZ2luZy5lcnJvcjtcclxuR2Vzc28uaW5mbyA9IGxvZ2dpbmcuaW5mbztcclxuR2Vzc28ubG9nID0gbG9nZ2luZy5sb2c7XHJcbkdlc3NvLndhcm4gPSBsb2dnaW5nLndhcm47XHJcbkdlc3NvLnByb3RvdHlwZS5pbml0aWFsaXplID0gZnVuY3Rpb24gaW5pdGlhbGl6ZSgpIHtcclxuICBpZiAodGhpcy5faW5pdGlhbGl6ZWQpIHtcclxuICAgIHJldHVybjtcclxuICB9XHJcbiAgdGhpcy5faW5pdGlhbGl6ZWQgPSB0cnVlO1xyXG4gIHRoaXMuc2V0dXAuaW52b2tlKCk7XHJcbn07XHJcbkdlc3NvLnByb3RvdHlwZS5zdGVwID0gZnVuY3Rpb24gc3RlcChjb250ZXh0KSB7XHJcbiAgdGhpcy5uZXh0RnJhbWUoKTtcclxuICB0aGlzLnJlbmRlclRvKGNvbnRleHQpO1xyXG59O1xyXG5HZXNzby5wcm90b3R5cGUubmV4dEZyYW1lID0gZnVuY3Rpb24gbmV4dEZyYW1lKCkge1xyXG4gIHJldHVybiB0aGlzLnVwZGF0ZS5pbnZva2UoKTtcclxufTtcclxuR2Vzc28ucHJvdG90eXBlLnJlbmRlclRvID0gZnVuY3Rpb24gcmVuZGVyVG8oY29udGV4dCkge1xyXG4gIHJldHVybiB0aGlzLnJlbmRlci5pbnZva2UoY29udGV4dCk7XHJcbn07XHJcbkdlc3NvLnByb3RvdHlwZS5ydW4gPSBmdW5jdGlvbiBydW4oY2FudmFzKSB7XHJcbiAgdmFyIGNvbnRyb2xsZXIgPSBuZXcgQ29udHJvbGxlcih0aGlzLCBjYW52YXMpO1xyXG4gIGNvbnRyb2xsZXIuc3RhcnQoKTtcclxuICByZXR1cm4gY29udHJvbGxlcjtcclxufTtcclxuXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEdlc3NvO1xyXG4iLCJ2YXIgR2Vzc28gPSByZXF1aXJlKCcuL2dlc3NvJyk7XHJcblxyXG4vLyBUT0RPOiBEZWxldGUgdGhpc1xyXG53aW5kb3cuR2Vzc28gPSBHZXNzbztcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gR2Vzc287XHJcbiIsIi8qIGdsb2JhbHMgJCAqL1xyXG5cclxuXHJcbi8vIFRPRE86IExvZ2dlciBjbGFzc1xyXG4vLyBUT0RPOiBQbHVnZ2FibGUgbG9nIGJhY2tlbmQsIGUuZy4gY29uc29sZS5sb2dcclxuXHJcblxyXG5mdW5jdGlvbiBfc2VuZChsZXZlbCwgYXJncykge1xyXG4gIC8vIFRPRE86IEluc3BlY3Qgb2JqZWN0IGluc3RlYWQgb2Ygc2VuZGluZyBbb2JqZWN0IE9iamVjdF1cclxuICAvLyBUT0RPOiBSZW1vdmUgdGhlIGltcGxpZWQgalF1ZXJ5IGRlcGVuZGVuY3lcclxuICAkLnBvc3QoJy9sb2cnLCB7XHJcbiAgICBsZXZlbDogbGV2ZWwsXHJcbiAgICBtZXNzYWdlOiBhcmdzLmpvaW4oJyAnKVxyXG4gIH0pLmZhaWwoZnVuY3Rpb24oeGhyLCB0ZXh0U3RhdHVzLCBlcnJvclRocm93bikge1xyXG4gICAgLy8gVE9ETzogTm90aWZ5IHVzZXIgb24gdGhlIHBhZ2UgYW5kIHNob3cgbWVzc2FnZSBpZiBjb25zb2xlLmxvZyBkb2Vzbid0IGV4aXN0XHJcbiAgICBpZiAoY29uc29sZSAmJiBjb25zb2xlLmxvZykge1xyXG4gICAgICBjb25zb2xlLmxvZyh4aHIucmVzcG9uc2VUZXh0KTtcclxuICAgIH1cclxuICB9KTtcclxufVxyXG5cclxuXHJcbmZ1bmN0aW9uIGVycm9yKG1lc3NhZ2UpIHtcclxuICByZXR1cm4gX3NlbmQoJ2Vycm9yJywgQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzKSk7XHJcbn1cclxuXHJcblxyXG5mdW5jdGlvbiBpbmZvKG1lc3NhZ2UpIHtcclxuICByZXR1cm4gX3NlbmQoJ2luZm8nLCBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpKTtcclxufVxyXG5cclxuXHJcbmZ1bmN0aW9uIGxvZyhtZXNzYWdlKSB7XHJcbiAgcmV0dXJuIF9zZW5kKCdsb2cnLCBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpKTtcclxufVxyXG5cclxuXHJcbmZ1bmN0aW9uIHdhcm4obWVzc2FnZSkge1xyXG4gIHJldHVybiBfc2VuZCgnd2FybicsIEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cykpO1xyXG59XHJcblxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSB7XHJcbiAgZXJyb3I6IGVycm9yLFxyXG4gIGluZm86IGluZm8sXHJcbiAgbG9nOiBsb2csXHJcbiAgd2Fybjogd2FyblxyXG59O1xyXG4iLCJ2YXIgdXRpbCA9IHJlcXVpcmUoJy4vdXRpbCcpO1xyXG5cclxuXHJcbnZhciByYWYgPSAoZnVuY3Rpb24gKCkge1xyXG4gIC8vIFJhZiBwb2x5ZmlsbCBieSBFcmlrIE3DtmxsZXIuIGZpeGVzIGZyb20gUGF1bCBJcmlzaCBhbmQgVGlubyBaaWpkZWxcclxuICAvLyBBZGFwdGVkIGJ5IEpvZSBFc3Bvc2l0b1xyXG4gIC8vIE9yaWdpbjogaHR0cDovL3BhdWxpcmlzaC5jb20vMjAxMS9yZXF1ZXN0YW5pbWF0aW9uZnJhbWUtZm9yLXNtYXJ0LWFuaW1hdGluZy9cclxuICAvLyAgICAgICAgIGh0dHA6Ly9teS5vcGVyYS5jb20vZW1vbGxlci9ibG9nLzIwMTEvMTIvMjAvcmVxdWVzdGFuaW1hdGlvbmZyYW1lLWZvci1zbWFydC1lci1hbmltYXRpbmdcclxuICAvLyBNSVQgbGljZW5zZVxyXG5cclxuICB2YXIgcmVxdWVzdEFuaW1hdGlvbkZyYW1lID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcgPyB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lIDogbnVsbDtcclxuICB2YXIgY2FuY2VsQW5pbWF0aW9uRnJhbWUgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyA/IHdpbmRvdy5jYW5jZWxBbmltYXRpb25GcmFtZSA6IG51bGw7XHJcblxyXG4gIHZhciB2ZW5kb3JzID0gWydtcycsICdtb3onLCAnd2Via2l0JywgJ28nXTtcclxuICBmb3IodmFyIHggPSAwOyB4IDwgdmVuZG9ycy5sZW5ndGggJiYgIXJlcXVlc3RBbmltYXRpb25GcmFtZTsgKyt4KSB7XHJcbiAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUgPSB3aW5kb3dbdmVuZG9yc1t4XSArICdSZXF1ZXN0QW5pbWF0aW9uRnJhbWUnXTtcclxuICAgIGNhbmNlbEFuaW1hdGlvbkZyYW1lID0gd2luZG93W3ZlbmRvcnNbeF0gKyAnQ2FuY2VsQW5pbWF0aW9uRnJhbWUnXSB8fCB3aW5kb3dbdmVuZG9yc1t4XSArICdDYW5jZWxSZXF1ZXN0QW5pbWF0aW9uRnJhbWUnXTtcclxuICB9XHJcblxyXG4gIGlmICghcmVxdWVzdEFuaW1hdGlvbkZyYW1lKSB7XHJcbiAgICB2YXIgbGFzdFRpbWUgPSAwO1xyXG4gICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lID0gZnVuY3Rpb24oY2FsbGJhY2spIHtcclxuICAgICAgdmFyIGN1cnJUaW1lID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XHJcbiAgICAgIHZhciB0aW1lVG9DYWxsID0gTWF0aC5tYXgoMCwgMTYgLSAoY3VyclRpbWUgLSBsYXN0VGltZSkpO1xyXG4gICAgICB2YXIgaWQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkgeyBjYWxsYmFjayhjdXJyVGltZSArIHRpbWVUb0NhbGwpOyB9LCB0aW1lVG9DYWxsKTtcclxuICAgICAgbGFzdFRpbWUgPSBjdXJyVGltZSArIHRpbWVUb0NhbGw7XHJcbiAgICAgIHJldHVybiBpZDtcclxuICAgIH07XHJcblxyXG4gICAgY2FuY2VsQW5pbWF0aW9uRnJhbWUgPSBmdW5jdGlvbihpZCkge1xyXG4gICAgICBjbGVhclRpbWVvdXQoaWQpO1xyXG4gICAgfTtcclxuICB9XHJcblxyXG4gIHJldHVybiB7XHJcbiAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWU6IGZ1bmN0aW9uKGNhbGxiYWNrKSB7IHJldHVybiByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoY2FsbGJhY2spOyB9LFxyXG4gICAgY2FuY2VsQW5pbWF0aW9uRnJhbWU6IGZ1bmN0aW9uKHJlcXVlc3RJRCkgeyByZXR1cm4gY2FuY2VsQW5pbWF0aW9uRnJhbWUocmVxdWVzdElEKTsgfVxyXG4gIH07XHJcbn0pKCk7XHJcblxyXG5cclxuZnVuY3Rpb24gZ2V0Q2FudmFzKCkge1xyXG4gIC8vIFRPRE86IEV4dHJhY3QgdGhpcyBvdXQgdG8gYnJlYWsgZGVwZW5kZW5jeVxyXG4gIGlmICh0eXBlb2Ygd2luZG93ID09PSAndW5kZWZpbmVkJykge1xyXG4gICAgdGhyb3cgbmV3IEVycm9yKCdDYW5ub3QgZ2V0IGNhbnZhcyBvdXRzaWRlIG9mIGJyb3dzZXIgY29udGV4dC4nKTtcclxuICB9XHJcblxyXG4gIC8vIFRPRE86IFJlYWQgdGhlIHByb2plY3Qgc2V0dGluZ3MgdXNlIHRoZSByaWdodCBJRFxyXG4gIHZhciBjYW52YXMgPSB3aW5kb3cuZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2dlc3NvLXRhcmdldCcpO1xyXG5cclxuICAvLyBSZXBsYWNlIGltYWdlIHBsYWNlaG9sZGVyIHdpdGggY2FudmFzXHJcbiAgaWYgKGNhbnZhcyAmJiBjYW52YXMudGFnTmFtZSA9PT0gJ0lNRycpIHtcclxuICAgIGNhbnZhcyA9IHV0aWwuY2hhbmdlVGFnTmFtZShjYW52YXMsICdjYW52YXMnKTtcclxuICB9XHJcblxyXG4gIC8vIERlZmF1bHQgdG8gdXNpbmcgdGhlIG9ubHkgY2FudmFzIG9uIHRoZSBwYWdlLCBpZiBhdmFpbGFibGVcclxuICBpZiAoIWNhbnZhcykge1xyXG4gICAgdmFyIGNhbnZhc2VzID0gd2luZG93LmRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdjYW52YXMnKTtcclxuICAgIGlmIChjYW52YXNlcy5sZW5ndGggPT09IDEpIHtcclxuICAgICAgY2FudmFzID0gY2FudmFzZXNbMF07XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvLyBSYWlzZSBlcnJvciBpZiBubyB1c2FibGUgY2FudmFzZXMgd2VyZSBmb3VuZFxyXG4gIGlmICghY2FudmFzKSB7XHJcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0NhbnZhcyBub3QgZm91bmQuJyk7XHJcbiAgfVxyXG5cclxuICByZXR1cm4gY2FudmFzO1xyXG59XHJcblxyXG5cclxuZnVuY3Rpb24gZ2V0Q29udGV4dDJEKCkge1xyXG4gIHJldHVybiBnZXRDYW52YXMoKS5nZXRDb250ZXh0KCcyZCcpO1xyXG59XHJcblxyXG5cclxuZnVuY3Rpb24gZ2V0V2ViR0xDb250ZXh0KCkge1xyXG4gIHJldHVybiBnZXRDYW52YXMoKS5nZXRDb250ZXh0KCd3ZWJnbCcpO1xyXG59XHJcblxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSB7XHJcbiAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lOiByYWYucmVxdWVzdEFuaW1hdGlvbkZyYW1lLFxyXG4gIGNhbmNlbEFuaW1hdGlvbkZyYW1lOiByYWYuY2FuY2VsQW5pbWF0aW9uRnJhbWUsXHJcbiAgZ2V0Q2FudmFzOiBnZXRDYW52YXMsXHJcbiAgZ2V0Q29udGV4dDJEOiBnZXRDb250ZXh0MkQsXHJcbiAgZ2V0V2ViR0xDb250ZXh0OiBnZXRXZWJHTENvbnRleHRcclxufTtcclxuIiwiZnVuY3Rpb24gZm9yRWFjaChhcnJheSwgc3RlcEZ1bmN0aW9uKSB7XHJcbiAgZm9yICh2YXIgaW5kZXggPSAwOyBpbmRleCA8IGFycmF5Lmxlbmd0aDsgaW5kZXgrKykge1xyXG4gICAgc3RlcEZ1bmN0aW9uKGFycmF5W2luZGV4XSk7XHJcbiAgfVxyXG59XHJcblxyXG5cclxuZnVuY3Rpb24gcG9wKGFycmF5LCBpbmRleCkge1xyXG4gIHJldHVybiB0eXBlb2YgaW5kZXggPT09ICd1bmRlZmluZWQnID8gYXJyYXkucG9wKCkgOiBhcnJheS5zcGxpY2UoaW5kZXgsIDEpWzBdO1xyXG59XHJcblxyXG5cclxuZnVuY3Rpb24gaW5kZXhPZihhcnJheSwgaXRlbSwgc3RhcnRJbmRleCkge1xyXG4gIGZvciAodmFyIGluZGV4ID0gc3RhcnRJbmRleCB8fCAwOyBpbmRleCA8IGFycmF5Lmxlbmd0aDsgaW5kZXgrKykge1xyXG4gICAgaWYgKGFycmF5W2luZGV4XSA9PT0gaXRlbSkge1xyXG4gICAgICByZXR1cm4gaW5kZXg7XHJcbiAgICB9XHJcbiAgfVxyXG4gIHJldHVybiAtMTtcclxufVxyXG5cclxuXHJcbmZ1bmN0aW9uIGxhc3RJbmRleE9mKGFycmF5LCBpdGVtLCBzdGFydEluZGV4KSB7XHJcbiAgZm9yICh2YXIgaW5kZXggPSBzdGFydEluZGV4IHx8IGFycmF5Lmxlbmd0aCAtIDE7IGluZGV4ID49IDA7IGluZGV4LS0pIHtcclxuICAgIGlmIChhcnJheVtpbmRleF0gPT09IGl0ZW0pIHtcclxuICAgICAgcmV0dXJuIGluZGV4O1xyXG4gICAgfVxyXG4gIH1cclxuICByZXR1cm4gLTE7XHJcbn1cclxuXHJcblxyXG5mdW5jdGlvbiByZW1vdmUoYXJyYXksIGl0ZW0pIHtcclxuICB2YXIgaW5kZXggPSBpbmRleE9mKGFycmF5LCBpdGVtKTtcclxuICByZXR1cm4gaW5kZXggIT09IC0xID8gcG9wKGFycmF5LCBpbmRleCkgOiBudWxsO1xyXG59XHJcblxyXG5cclxuZnVuY3Rpb24gcmVtb3ZlTGFzdChhcnJheSwgaXRlbSkge1xyXG4gIHZhciBpbmRleCA9IGxhc3RJbmRleE9mKGFycmF5LCBpdGVtKTtcclxuICByZXR1cm4gaW5kZXggIT09IC0xID8gcG9wKGFycmF5LCBpbmRleCkgOiBudWxsO1xyXG59XHJcblxyXG5cclxuZnVuY3Rpb24gY2hhbmdlVGFnTmFtZShlbGVtZW50LCB0YWdOYW1lKSB7XHJcbiAgaWYgKGVsZW1lbnQudGFnTmFtZSA9PT0gdGFnTmFtZS50b1VwcGVyQ2FzZSgpKSB7XHJcbiAgICByZXR1cm4gZWxlbWVudDtcclxuICB9XHJcblxyXG4gIC8vIFRyeSBjaGFuZ2luZyB0aGUgdHlwZSBmaXJzdCAobW9kZXJuIGJyb3dzZXJzLCBleGNlcHQgSUUpXHJcbiAgZWxlbWVudC50YWdOYW1lID0gdGFnTmFtZTtcclxuICBpZiAoZWxlbWVudC50YWdOYW1lID09PSB0YWdOYW1lLnRvVXBwZXJDYXNlKCkpIHtcclxuICAgIHJldHVybiBlbGVtZW50O1xyXG4gIH1cclxuXHJcbiAgLy8gQ3JlYXRlIG5ldyBlbGVtZW50XHJcbiAgdmFyIG5ld0VsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KHRhZ05hbWUpO1xyXG4gIGNvbnNvbGUubG9nKHRhZ05hbWUpO1xyXG4gIGNvbnNvbGUubG9nKG5ld0VsZW1lbnQpO1xyXG4gIC8vIENvcHkgYXR0cmlidXRlc1xyXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgZWxlbWVudC5hdHRyaWJ1dGVzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICBuZXdFbGVtZW50LnNldEF0dHJpYnV0ZShlbGVtZW50LmF0dHJpYnV0ZXNbaV0ubmFtZSwgZWxlbWVudC5hdHRyaWJ1dGVzW2ldLnZhbHVlKTtcclxuICB9XHJcbiAgLy8gQ29weSBjaGlsZCBub2Rlc1xyXG4gIHdoaWxlIChlbGVtZW50LmZpcnN0Q2hpbGQpIHtcclxuICAgIG5ld0VsZW1lbnQuYXBwZW5kQ2hpbGQoZWxlbWVudC5maXJzdENoaWxkKTtcclxuICB9XHJcbiAgLy8gUmVwbGFjZSBlbGVtZW50XHJcbiAgZWxlbWVudC5wYXJlbnROb2RlLnJlcGxhY2VDaGlsZChuZXdFbGVtZW50LCBlbGVtZW50KTtcclxuXHJcbiAgcmV0dXJuIG5ld0VsZW1lbnQ7XHJcbn1cclxuXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IHtcclxuICBmb3JFYWNoOiBmb3JFYWNoLFxyXG4gIHBvcDogcG9wLFxyXG4gIGluZGV4T2Y6IGluZGV4T2YsXHJcbiAgbGFzdEluZGV4T2Y6IGxhc3RJbmRleE9mLFxyXG4gIHJlbW92ZTogcmVtb3ZlLFxyXG4gIHJlbW92ZUxhc3Q6IHJlbW92ZUxhc3QsXHJcbiAgY2hhbmdlVGFnTmFtZTogY2hhbmdlVGFnTmFtZVxyXG59O1xyXG4iLCIvLyBHZXNzbyBFbnRyeSBQb2ludFxyXG4vLyBEZXRlY3Qgd2hldGhlciB0aGlzIGlzIGNhbGxlZCBmcm9tIHRoZSBicm93c2VyLCBvciBmcm9tIHRoZSBDTEkuXHJcblxyXG5cclxuaWYgKHR5cGVvZiB3aW5kb3cgPT09ICd1bmRlZmluZWQnKSB7XHJcbiAgLy8gVXNlIG1vZHVsZS5yZXF1aXJlIHNvIHRoZSBjbGllbnQtc2lkZSBidWlsZCBza2lwcyBvdmVyIHNlcnZlciBjb2RlLFxyXG4gIC8vIHdoaWNoIHdpbGwgd29yayBwcm9wZXJseSBhdCBydW50aW1lIHNpbmNlIG5vIHdpbmRvdyBnbG9iYWwgaXMgZGVmaW5lZFxyXG4gIG1vZHVsZS5leHBvcnRzID0gbW9kdWxlLnJlcXVpcmUoJy4vZ2Vzc28nKTtcclxufSBlbHNlIHtcclxuICAvLyBJbmNsdWRlIGluIGNsaWVudC1zaWRlIGJ1aWxkLFxyXG4gIC8vIHdoaWNoIHdpbGwgaGF2ZSBhIHdpbmRvdyBnbG9iYWwgZGVmaW5lZCBhdCBydW50aW1lXHJcbiAgbW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKCcuL2NsaWVudCcpO1xyXG59XHJcbiJdfQ==
