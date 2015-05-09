(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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
  e.preventDefault();

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

  return false;
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
    if (subscribed) {
      subscribed(handler);
    }
    // Return the unsubscribe function
    return function unsubscribe() {
      var initialHandler = util.removeLast(handlers, handler);
      // Allow custom logic on unsubscribe, passing in the original handler
      if (unsubscribed) {
        unsubscribed(initialHandler);
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
    Gesso.getCanvas().addEventListener('touchstart', handler, false);
    Gesso.getCanvas().addEventListener('mousedown', handler, false);
  }, function (handler) {
    Gesso.getCanvas().removeEventListener('touchstart', handler);
    Gesso.getCanvas().removeEventListener('mousedown', handler);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uXFwuLlxcLi5cXFByb2plY3RzXFxHZXNzby5qc1xcbm9kZV9tb2R1bGVzXFxicm93c2VyaWZ5XFxub2RlX21vZHVsZXNcXGJyb3dzZXItcGFja1xcX3ByZWx1ZGUuanMiLCJpbmRleC5qcyIsImhlbHBlcnMuanMiLCJub2RlX21vZHVsZXMvZ2Vzc28vY2xpZW50L2NvbnRyb2xsZXIuanMiLCJub2RlX21vZHVsZXMvZ2Vzc28vY2xpZW50L2RlbGVnYXRlLmpzIiwibm9kZV9tb2R1bGVzL2dlc3NvL2NsaWVudC9nZXNzby5qcyIsIm5vZGVfbW9kdWxlcy9nZXNzby9jbGllbnQvaW5kZXguanMiLCJub2RlX21vZHVsZXMvZ2Vzc28vY2xpZW50L2xvZ2dpbmcuanMiLCJub2RlX21vZHVsZXMvZ2Vzc28vY2xpZW50L2xvd0xldmVsLmpzIiwibm9kZV9tb2R1bGVzL2dlc3NvL2NsaWVudC91dGlsLmpzIiwibm9kZV9tb2R1bGVzL2dlc3NvL2luZGV4LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcmZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25GQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciBHZXNzbyA9IHJlcXVpcmUoJ2dlc3NvJyk7XHJcbnZhciBoZWxwZXJzID0gcmVxdWlyZSgnLi9oZWxwZXJzJyk7XHJcblxyXG52YXIgZ2FtZSA9IG5ldyBHZXNzbygpO1xyXG52YXIgZ3Jhdml0eSA9IDAuMztcclxudmFyIHNlYUxldmVsID0gODA7XHJcbnZhciBwbGF5ZXIgPSBudWxsO1xyXG52YXIgcm9ja3MgPSBbXTtcclxudmFyIGJ1cnN0SXRlbSA9IG51bGw7XHJcbnZhciBidXJzdFNwZWVkID0gMjtcclxudmFyIGJ1cnN0Q291bnQgPSAwO1xyXG52YXIgYnVyc3RNb2RlID0gZmFsc2U7XHJcbnZhciBidXJzdE1vZGVDb3VudCA9IDA7XHJcbnZhciBidXJzdE1vZGVNYXhDb3VudCA9IDUwMDtcclxudmFyIGxvbmdKdW1wID0gZmFsc2U7XHJcbnZhciBsb25nSnVtcENvbXBsZXRlQ291bnQgPSAwO1xyXG52YXIgbG9uZ0p1bXBDb21wbGV0ZU1heENvdW50ID0gMTIwO1xyXG52YXIgbG9uZ0p1bXBDb21wbGV0ZVNjb3JlID0gMTAwMDAwMDtcclxudmFyIGZyYW1lQ291bnQgPSAwO1xyXG52YXIgY3VycmVudExldmVsID0gLTE7XHJcbnZhciBzY29yZUZyYW1lQ291bnQgPSA2O1xyXG52YXIgc2NvcmVJbmNyZW1lbnQgPSAxMDA7XHJcbnZhciBoaWdoU2NvcmUgPSAwO1xyXG52YXIgaGlnaFNjb3JlVGltZSA9IDA7XHJcbnZhciBoaWdoU2NvcmVNYXhUaW1lID0gNjA7XHJcbnZhciBwYXJ0aWNsZXMgPSBbXTtcclxudmFyIGVuZEdhbWVQYXJ0aWNsZUNvdW50ID0gMTAwO1xyXG52YXIgYm90dG9tTGVld2F5ID0gNjA7XHJcbnZhciBidWJibGVzID0gW107XHJcbnZhciBzcGxhc2ggPSBbXTtcclxudmFyIGNsaWNrTG9jayA9IDA7XHJcblxyXG52YXIgbGV2ZWxTdGFydEZyYW1lcyA9IFswLCAxMjAsIDY2MCwgMTI2MCwgMjAwMCwgMzIwMCwgNDQwMCwgNTYwMCwgNjgwMF07XHJcbnZhciBsZXZlbFN0YXJ0U2NvcmUgPSBbXTtcclxuZm9yICh2YXIgbGV2ZWxTdGFydFNjb3JlSW5kZXggPSAwOyBsZXZlbFN0YXJ0U2NvcmVJbmRleCA8IGxldmVsU3RhcnRGcmFtZXMubGVuZ3RoOyBsZXZlbFN0YXJ0U2NvcmVJbmRleCsrKSB7XHJcbiAgbGV2ZWxTdGFydFNjb3JlLnB1c2goTWF0aC5mbG9vcihsZXZlbFN0YXJ0RnJhbWVzW2xldmVsU3RhcnRTY29yZUluZGV4XSAvIHNjb3JlRnJhbWVDb3VudCAqIHNjb3JlSW5jcmVtZW50IC8gMiAvIDEwMCkgKiAxMDApO1xyXG59XHJcbnZhciBsZXZlbHMgPSB7XHJcbiAgMDoge3NwZWVkOiA0LCBuZXdSb2NrTWF4V2lkdGg6IDEwMCwgbmV3Um9ja0ZyYW1lQ291bnQ6IDYwLCBuZXdCdXJzdEl0ZW1GcmFtZUNvdW50OiBudWxsfSxcclxuICAxOiB7c3BlZWQ6IDQsIG5ld1JvY2tNYXhXaWR0aDogMTAwLCBuZXdSb2NrRnJhbWVDb3VudDogMjAwLCBuZXdCdXJzdEl0ZW1GcmFtZUNvdW50OiBudWxsfSxcclxuICAyOiB7c3BlZWQ6IDQuMiwgbmV3Um9ja01heFdpZHRoOiAxMDAsIG5ld1JvY2tGcmFtZUNvdW50OiAxMDAsIG5ld0J1cnN0SXRlbUZyYW1lQ291bnQ6IG51bGx9LFxyXG4gIDM6IHtzcGVlZDogNC40LCBuZXdSb2NrTWF4V2lkdGg6IDEwMCwgbmV3Um9ja0ZyYW1lQ291bnQ6IDgwLCBuZXdCdXJzdEl0ZW1GcmFtZUNvdW50OiBudWxsfSxcclxuICA0OiB7c3BlZWQ6IDUsIG5ld1JvY2tNYXhXaWR0aDogMTIwLCBuZXdSb2NrRnJhbWVDb3VudDogNzUsIG5ld0J1cnN0SXRlbUZyYW1lQ291bnQ6IG51bGx9LFxyXG4gIDU6IHtzcGVlZDogNiwgbmV3Um9ja01heFdpZHRoOiAxNTAsIG5ld1JvY2tGcmFtZUNvdW50OiA3NSwgbmV3QnVyc3RJdGVtRnJhbWVDb3VudDogbnVsbH0sXHJcbiAgNjoge3NwZWVkOiA3LCBuZXdSb2NrTWF4V2lkdGg6IDE1MCwgbmV3Um9ja0ZyYW1lQ291bnQ6IDY1LCBuZXdCdXJzdEl0ZW1GcmFtZUNvdW50OiBudWxsfSxcclxuICA3OiB7c3BlZWQ6IDgsIG5ld1JvY2tNYXhXaWR0aDogMjI1LCBuZXdSb2NrRnJhbWVDb3VudDogNjUsIG5ld0J1cnN0SXRlbUZyYW1lQ291bnQ6IG51bGx9LFxyXG4gIDg6IHtzcGVlZDogOCwgbmV3Um9ja01heFdpZHRoOiAyNTAsIG5ld1JvY2tGcmFtZUNvdW50OiA2NSwgbmV3QnVyc3RJdGVtRnJhbWVDb3VudDogMTIwMH1cclxufTtcclxuXHJcbmZ1bmN0aW9uIG5ld0dhbWUoKSB7XHJcbiAgLy8gRmlyc3QgcGxheVxyXG4gIGlmIChjdXJyZW50TGV2ZWwgPT09IC0xKSB7XHJcbiAgICBjdXJyZW50TGV2ZWwgPSAwO1xyXG4gIH1cclxuICAvLyBSZWR1Y2UgbGV2ZWxcclxuICBpZiAoY3VycmVudExldmVsID4gMCkge1xyXG4gICAgY3VycmVudExldmVsIC09IDE7XHJcbiAgfVxyXG4gIC8vIENyZWF0ZSBwbGF5ZXJcclxuICBwbGF5ZXIgPSB7XHJcbiAgICB4OiAxMDAsXHJcbiAgICB5OiAyMDAsXHJcbiAgICBzeTogMSxcclxuICAgIHZlbG9jaXR5OiAtMTAsXHJcbiAgICBqdW1wVmVsb2NpdHk6IDgsXHJcbiAgICB0ZXJtaW5hbFZlbG9jaXR5OiA3LFxyXG4gICAgbGV2ZWxVcEJ1YmJsZXM6IDAsXHJcbiAgICBzY29yZTogbGV2ZWxTdGFydFNjb3JlW2N1cnJlbnRMZXZlbF1cclxuICB9O1xyXG4gIC8vIFJlc2V0IGZyYW1lIGNvdW50XHJcbiAgZnJhbWVDb3VudCA9IGxldmVsU3RhcnRGcmFtZXNbY3VycmVudExldmVsXTtcclxuICAvLyBSZXNldCBidXJzdFxyXG4gIGJ1cnN0Q291bnQgPSAwO1xyXG4gIGJ1cnN0TW9kZSA9IGZhbHNlO1xyXG4gIGJ1cnN0TW9kZUNvdW50ID0gMDtcclxuICBsb25nSnVtcCA9IGZhbHNlO1xyXG59XHJcblxyXG5mdW5jdGlvbiBlbmRHYW1lKCkge1xyXG4gIGlmICghcGxheWVyKSB7XHJcbiAgICByZXR1cm47XHJcbiAgfVxyXG5cclxuICAvLyBTZXQgdGhlIG5ldyBoaWdoIHNjb3JlLCBhbmltYXRpbmcgaXQsIGlmIHRoZSByZWNvcmQgd2FzIGJyb2tlblxyXG4gIGlmIChwbGF5ZXIuc2NvcmUgPiBoaWdoU2NvcmUpIHtcclxuICAgIGhpZ2hTY29yZSA9IHBsYXllci5zY29yZTtcclxuICAgIGhpZ2hTY29yZVRpbWUgPSBoaWdoU2NvcmVNYXhUaW1lO1xyXG4gIH1cclxuXHJcbiAgLy8gRXhwbG9kZVxyXG4gIGZvciAodmFyIGluZGV4ID0gMDsgaW5kZXggPCBlbmRHYW1lUGFydGljbGVDb3VudDsgaW5kZXgrKykge1xyXG4gICAgdmFyIGFuZ2xlID0gaGVscGVycy5yYW5kSW50KDAsIDM2MCk7XHJcbiAgICB2YXIgdmVsb2NpdHkgPSBoZWxwZXJzLnJhbmRJbnQoMTAsIDIwKTtcclxuICAgIHBhcnRpY2xlcy5wdXNoKHtcclxuICAgICAgeDogcGxheWVyLngsXHJcbiAgICAgIHk6IHBsYXllci55LFxyXG4gICAgICB2eDogTWF0aC5jb3MoYW5nbGUgKiBNYXRoLlBJIC8gMTgwKSAqIHZlbG9jaXR5IC0gNixcclxuICAgICAgdnk6IE1hdGguc2luKGFuZ2xlICogTWF0aC5QSSAvIDE4MCkgKiB2ZWxvY2l0eVxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICAvLyBTZXQgdG8gbm90IHBsYXlpbmdcclxuICBwbGF5ZXIgPSBudWxsO1xyXG4gIGNsaWNrTG9jayA9IDMwO1xyXG59XHJcblxyXG5mdW5jdGlvbiBuZXdTcGxhc2goKSB7XHJcbiAgZm9yICh2YXIgcyA9IDA7IHMgPCAyMDsgcysrKSB7XHJcbiAgICB2YXIgYXggPSBNYXRoLnJhbmRvbSgpICogNCAtIDM7XHJcbiAgICB2YXIgYXkgPSAtKE1hdGgucmFuZG9tKCkgKiAyICsgMSk7XHJcbiAgICBzcGxhc2gucHVzaCh7eDogcGxheWVyLnggKyBheCwgeTogc2VhTGV2ZWwsIHZ4OiBheCwgdnk6IGF5LCByOiBoZWxwZXJzLnJhbmRJbnQoMSwgMil9KTtcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIG5ld0J1YmJsZShwcm9iYWJpbGl0eSkge1xyXG4gIGlmIChwbGF5ZXIgJiYgaGVscGVycy5yYW5kSW50KDEsIHByb2JhYmlsaXR5KSA9PT0gMSkge1xyXG4gICAgYnViYmxlcy5wdXNoKHt4OiBwbGF5ZXIueCwgeTogcGxheWVyLnksIHI6IGhlbHBlcnMucmFuZEludCgyLCA0KX0pO1xyXG4gIH1cclxufVxyXG5cclxuZ2FtZS5jbGljayhmdW5jdGlvbiAoZSkge1xyXG4gIGUucHJldmVudERlZmF1bHQoKTtcclxuXHJcbiAgLy8gUHJldmVudCBhY2NpZGVudGFsIG5ldyBnYW1lIGNsaWNrXHJcbiAgaWYgKGNsaWNrTG9jayA+IDApIHtcclxuICAgIHJldHVybiBmYWxzZTtcclxuICB9XHJcblxyXG4gIC8vIENyZWF0ZSBuZXcgcGxheWVyLCBpZiBub3QgY3VycmVudGx5IHBsYXlpbmdcclxuICBpZiAoIXBsYXllcikge1xyXG4gICAgbmV3R2FtZSgpO1xyXG4gICAgcmV0dXJuIGZhbHNlO1xyXG4gIH1cclxuXHJcbiAgLy8gU3dpbSAvIGp1bXBcclxuICBpZiAocGxheWVyLnkgKyA1ID4gc2VhTGV2ZWwpIHtcclxuICAgIHBsYXllci52ZWxvY2l0eSA9IC1wbGF5ZXIuanVtcFZlbG9jaXR5O1xyXG4gICAgcGxheWVyLnN5ID0gMS42O1xyXG4gICAgbmV3QnViYmxlKDEwKTtcclxuICB9XHJcblxyXG4gIHJldHVybiBmYWxzZTtcclxufSk7XHJcblxyXG5nYW1lLnVwZGF0ZShmdW5jdGlvbiAoKSB7XHJcbiAgLy8gVXBkYXRlIGZyYW1lIGNvdW50LCB3aGljaCByZXByZXNlbnRzIHRpbWUgcGFzc2VkXHJcbiAgZnJhbWVDb3VudCArPSAxO1xyXG5cclxuICBpZiAoY2xpY2tMb2NrID4gMCkge1xyXG4gICAgY2xpY2tMb2NrIC09IDE7XHJcbiAgfVxyXG5cclxuICAvLyBEbyBub3RoaW5nIGVsc2UgaWYgdGhpcyBpcyB0aGUgZmlyc3QgdGltZSBwbGF5aW5nXHJcbiAgaWYgKGN1cnJlbnRMZXZlbCA9PT0gLTEpIHtcclxuICAgIHJldHVybjtcclxuICB9XHJcblxyXG4gIC8vIFNldCBkaWZmaWN1bHR5IGFzIGEgZnVuY3Rpb24gb2YgdGltZVxyXG4gIGlmIChwbGF5ZXIpIHtcclxuICAgIGlmIChjdXJyZW50TGV2ZWwgKyAxIDwgbGV2ZWxTdGFydEZyYW1lcy5sZW5ndGggJiYgZnJhbWVDb3VudCA+PSBsZXZlbFN0YXJ0RnJhbWVzW2N1cnJlbnRMZXZlbCArIDFdKSB7XHJcbiAgICAgIGN1cnJlbnRMZXZlbCArPSAxO1xyXG4gICAgICBwbGF5ZXIubGV2ZWxVcEJ1YmJsZXMgPSAyMCAqIGN1cnJlbnRMZXZlbCArIDEwO1xyXG4gICAgfVxyXG4gICAgLy8gU2hvdyBsZXZlbCB1cCBlZmZlY3RcclxuICAgIGlmIChwbGF5ZXIubGV2ZWxVcEJ1YmJsZXMgPiAwKSB7XHJcbiAgICAgIHBsYXllci5sZXZlbFVwQnViYmxlcyAtPSAxO1xyXG4gICAgICBmb3IgKHZhciB1ID0gMDsgdSA8IDEwOyB1KyspIHtcclxuICAgICAgICBuZXdCdWJibGUoMTApO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvLyBHZXQgY3VycmVudCBsZXZlbFxyXG4gIHZhciBsZXZlbCA9IGxldmVsc1tjdXJyZW50TGV2ZWxdO1xyXG5cclxuICAvLyBDcmVhdGUgbmV3IGJ1cnN0IGl0ZW1cclxuICBpZiAocGxheWVyICYmIGxldmVsLm5ld0J1cnN0SXRlbUZyYW1lQ291bnQgJiYgIWJ1cnN0TW9kZSkge1xyXG4gICAgYnVyc3RDb3VudCArPSAxO1xyXG4gICAgLy8gQWRkIHRoZSBidXJzdCBpdGVtIHN1Y2ggdGhhdCBpdCBjYW4gYmUgaW50ZXJzZWN0ZWQgcmlnaHQgYWZ0ZXIgYSBsb25nIGp1bXBcclxuICAgIGlmIChidXJzdENvdW50ID49IGxldmVsLm5ld0J1cnN0SXRlbUZyYW1lQ291bnQgJiYgKGZyYW1lQ291bnQgLSBsZXZlbC5uZXdSb2NrRnJhbWVDb3VudCAqIChsZXZlbC5zcGVlZCAvIGJ1cnN0U3BlZWQpIC0gbGV2ZWwubmV3Um9ja01heFdpZHRoIC0gNCkgJSBsZXZlbC5uZXdSb2NrRnJhbWVDb3VudCA9PT0gMCAmJiAhYnVyc3RJdGVtKSB7XHJcbiAgICAgIGJ1cnN0SXRlbSA9IHt4OiBnYW1lLndpZHRoLCB5OiAzNiwgcjogNn07XHJcbiAgICAgIGJ1cnN0Q291bnQgPSAwO1xyXG4gICAgfVxyXG4gIH1cclxuICAvLyBVcGRhdGUgYnVyc3QgaXRlbVxyXG4gIGlmIChidXJzdEl0ZW0pIHtcclxuICAgIGJ1cnN0SXRlbS54IC09IGJ1cnN0U3BlZWQ7XHJcbiAgICBidXJzdEl0ZW0ueSA9IHNlYUxldmVsIC0gMTYgLSBNYXRoLmFicyhNYXRoLnNpbihmcmFtZUNvdW50IC8gMTIpKSAqIDI0O1xyXG4gICAgLy8gRGVsZXRlIGJ1cnN0IGl0ZW0gd2hlbiBvdXQgb2YgYm91bmRzXHJcbiAgICBpZiAoYnVyc3RJdGVtLnggKyBidXJzdEl0ZW0uciA8IDApIHtcclxuICAgICAgYnVyc3RJdGVtID0gbnVsbDtcclxuICAgIH1cclxuICB9XHJcbiAgLy8gQ2hlY2sgZm9yIGludGVyc2VjdGlvbiB3aXRoIHBsYXllclxyXG4gIGlmIChwbGF5ZXIgJiYgYnVyc3RJdGVtICYmXHJcbiAgICAgIGhlbHBlcnMuaW50ZXJzZWN0ZWQoe3g6IHBsYXllci54IC0gMTAsIHk6IHBsYXllci55IC0gMTAsIHdpZHRoOiA0MCwgaGVpZ2h0OiAyMH0sXHJcbiAgICAgICAge3g6IGJ1cnN0SXRlbS54LCB5OiBidXJzdEl0ZW0ueSwgd2lkdGg6IGJ1cnN0SXRlbS5yLCBoZWlnaHQ6IGJ1cnN0SXRlbS5yfSkpIHtcclxuICAgIGJ1cnN0TW9kZSA9IHRydWU7XHJcbiAgICBidXJzdE1vZGVDb3VudCA9IDA7XHJcbiAgICBidXJzdEl0ZW0gPSBudWxsO1xyXG4gIH1cclxuXHJcbiAgLy8gVXBkYXRlIHJvY2tzXHJcbiAgZm9yICh2YXIgciA9IDA7IHIgPCByb2Nrcy5sZW5ndGg7IHIrKykge1xyXG4gICAgcm9ja3Nbcl0ueCAtPSBsZXZlbC5zcGVlZDtcclxuICAgIGlmIChidXJzdE1vZGUpIHtcclxuICAgICAgcm9ja3Nbcl0ueCAtPSBidXJzdE1vZGVDb3VudCAvIDg7XHJcbiAgICB9IGVsc2UgaWYgKGxvbmdKdW1wKSB7XHJcbiAgICAgIHJvY2tzW3JdLnggLT0gMTAwICsgbGV2ZWwuc3BlZWQ7XHJcbiAgICB9XHJcbiAgICAvLyBEZWxldGUgcm9jayB3aGVuIG91dCBvZiBib3VuZHNcclxuICAgIGlmIChyb2Nrc1tyXS54ICsgcm9ja3Nbcl0ud2lkdGggPCAwKSB7XHJcbiAgICAgIHJvY2tzLnNwbGljZShyLCAxKTtcclxuICAgICAgci0tO1xyXG4gICAgfVxyXG4gIH1cclxuICAvLyBDaGVjayBmb3IgZW5kIG9mIGxvbmcganVtcFxyXG4gIGlmIChsb25nSnVtcCAmJiByb2Nrcy5sZW5ndGggPT09IDApIHtcclxuICAgIGxvbmdKdW1wID0gZmFsc2U7XHJcbiAgICBpZiAocGxheWVyKSB7XHJcbiAgICAgIGxvbmdKdW1wQ29tcGxldGVDb3VudCA9IGxvbmdKdW1wQ29tcGxldGVNYXhDb3VudDtcclxuICAgICAgLy8gVE9ETzogQW5pbWF0ZVxyXG4gICAgICBwbGF5ZXIuc2NvcmUgKz0gbG9uZ0p1bXBDb21wbGV0ZVNjb3JlO1xyXG4gICAgfVxyXG4gIH1cclxuICAvLyBDcmVhdGUgYSBuZXcgcm9ja1xyXG4gIGlmICghYnVyc3RNb2RlICYmICFsb25nSnVtcCkge1xyXG4gICAgaWYgKGZyYW1lQ291bnQgJSBsZXZlbC5uZXdSb2NrRnJhbWVDb3VudCA9PT0gMCkge1xyXG4gICAgICB2YXIgZmxvYXRlciA9IHBsYXllciA/ICEhaGVscGVycy5yYW5kSW50KDAsIDEpIDogZmFsc2U7XHJcbiAgICAgIHZhciBoZWlnaHQgPSBoZWxwZXJzLnJhbmRJbnQoMjAwLCBwbGF5ZXIgPyAzMDAgOiAyNTApO1xyXG4gICAgICByb2Nrcy5wdXNoKHtcclxuICAgICAgICB4OiBnYW1lLndpZHRoLFxyXG4gICAgICAgIHk6IGZsb2F0ZXIgPyBzZWFMZXZlbCAtICgxMCAqIGhlbHBlcnMucmFuZEludCgxLCAyKSkgOiBnYW1lLmhlaWdodCAtIGhlaWdodCxcclxuICAgICAgICB3aWR0aDogaGVscGVycy5yYW5kSW50KDMwLCBsZXZlbC5uZXdSb2NrTWF4V2lkdGgpLFxyXG4gICAgICAgIGhlaWdodDogaGVpZ2h0XHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG4gIH0gZWxzZSBpZiAoIWxvbmdKdW1wKSB7XHJcbiAgICB2YXIgdiA9IE1hdGguZmxvb3IoYnVyc3RNb2RlQ291bnQgLyBidXJzdE1vZGVNYXhDb3VudCAqIDQpO1xyXG4gICAgaWYgKGJ1cnN0TW9kZUNvdW50ICUgOCA9PT0gMCkge1xyXG4gICAgICB2YXIgaCA9IDYwICsgdiAqIDYwO1xyXG4gICAgICByb2Nrcy5wdXNoKHtcclxuICAgICAgICB4OiBnYW1lLndpZHRoLFxyXG4gICAgICAgIHk6IGdhbWUuaGVpZ2h0IC0gaCxcclxuICAgICAgICB3aWR0aDogMzAgKyB2ICogNTAsXHJcbiAgICAgICAgaGVpZ2h0OiBoXHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG4gICAgYnVyc3RNb2RlQ291bnQgKz0gMTtcclxuICAgIGlmIChidXJzdE1vZGVDb3VudCA+PSBidXJzdE1vZGVNYXhDb3VudCkge1xyXG4gICAgICBidXJzdE1vZGUgPSBmYWxzZTtcclxuICAgICAgYnVyc3RNb2RlQ291bnQgPSAwO1xyXG4gICAgICBsb25nSnVtcCA9IHRydWU7XHJcbiAgICAgIHJvY2tzLnB1c2goe1xyXG4gICAgICAgIHg6IGdhbWUud2lkdGgsXHJcbiAgICAgICAgeTogc2VhTGV2ZWwgLSAyMCxcclxuICAgICAgICB3aWR0aDogMzAwMCxcclxuICAgICAgICBoZWlnaHQ6IGdhbWUuaGVpZ2h0IC0gc2VhTGV2ZWxcclxuICAgICAgfSk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvLyBVcGRhdGUgYnViYmxlc1xyXG4gIGZvciAodmFyIGIgPSAwOyBiIDwgYnViYmxlcy5sZW5ndGg7IGIrKykge1xyXG4gICAgYnViYmxlc1tiXS54IC09IDM7XHJcbiAgICBpZiAoYnVyc3RNb2RlIHx8IGxvbmdKdW1wKSB7XHJcbiAgICAgIGJ1YmJsZXNbYl0ueCAtPSAoKGJ1cnN0TW9kZUNvdW50KSAvIGJ1cnN0TW9kZU1heENvdW50KSAqIDEwO1xyXG4gICAgfVxyXG4gICAgaWYgKGhlbHBlcnMucmFuZEludCgxLCAzKSA9PT0gMSkge1xyXG4gICAgICBidWJibGVzW2JdLnggLT0gMTtcclxuICAgIH1cclxuICAgIGlmIChoZWxwZXJzLnJhbmRJbnQoMSwgNSkpIHtcclxuICAgICAgYnViYmxlc1tiXS55ICs9IGhlbHBlcnMucmFuZEludCgtMywgMSk7XHJcbiAgICB9XHJcbiAgICAvLyBEZWxldGUgYnViYmxlIHdoZW4gb3V0IG9mIGJvdW5kc1xyXG4gICAgaWYgKGJ1YmJsZXNbYl0ueCArIGJ1YmJsZXNbYl0uciA8IDAgfHwgYnViYmxlc1tiXS55IDw9IHNlYUxldmVsKSB7XHJcbiAgICAgIGJ1YmJsZXMuc3BsaWNlKGIsIDEpO1xyXG4gICAgICBiLS07XHJcbiAgICB9XHJcbiAgfVxyXG4gIC8vIFJhbmRvbWx5IGFkZCBhIG5ldyBidWJibGVcclxuICBpZiAocGxheWVyKSB7XHJcbiAgICBuZXdCdWJibGUoMTAwKTtcclxuICB9XHJcbiAgLy8gQWRkIGJ1YmJsZXMgaW4gYnVyc3QgbW9kZVxyXG4gIGlmIChidXJzdE1vZGUpIHtcclxuICAgIGZvciAodmFyIGJ1ID0gMDsgYnUgPCAxMDsgYnUrKykge1xyXG4gICAgICBuZXdCdWJibGUoMTApO1xyXG4gICAgfVxyXG4gIH1cclxuICAvLyBDaGVjayBmb3Igcm9jayAvIGJ1YmJsZSBjb2xsaXNpb25zXHJcbiAgZm9yIChyID0gMDsgciA8IHJvY2tzLmxlbmd0aDsgcisrKSB7XHJcbiAgICBmb3IgKGIgPSAwOyBiIDwgYnViYmxlcy5sZW5ndGg7IGIrKykge1xyXG4gICAgICBpZiAoaGVscGVycy5pbnRlcnNlY3RlZCh7eDogYnViYmxlc1tiXS54LCB5OiBidWJibGVzW2JdLnksIHdpZHRoOiBidWJibGVzW2JdLnIsIGhlaWdodDogYnViYmxlc1tiXS5yfSwgcm9ja3Nbcl0pKSB7XHJcbiAgICAgICAgYnViYmxlcy5zcGxpY2UoYiwgMSk7XHJcbiAgICAgICAgYi0tO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvLyBVcGRhdGUgc3BsYXNoXHJcbiAgZm9yICh2YXIgcyA9IDA7IHMgPCBzcGxhc2gubGVuZ3RoOyBzKyspIHtcclxuICAgIHNwbGFzaFtzXS54ICs9IHNwbGFzaFtzXS52eDtcclxuICAgIHNwbGFzaFtzXS55ICs9IHNwbGFzaFtzXS52eTtcclxuICAgIHNwbGFzaFtzXS52eSArPSBncmF2aXR5O1xyXG4gICAgLy8gRGVsZXRlIHNwbGFzaFxyXG4gICAgaWYgKHNwbGFzaFtzXS55ID4gc2VhTGV2ZWwpIHtcclxuICAgICAgc3BsYXNoLnNwbGljZShzLCAxKTtcclxuICAgICAgcy0tO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLy8gVXBkYXRlIHBhcnRpY2xlc1xyXG4gIGZvciAodmFyIHAgPSAwOyBwIDwgcGFydGljbGVzLmxlbmd0aDsgcCsrKSB7XHJcbiAgICBwYXJ0aWNsZXNbcF0ueCAtPSBwYXJ0aWNsZXNbcF0udng7XHJcbiAgICBwYXJ0aWNsZXNbcF0ueSAtPSBwYXJ0aWNsZXNbcF0udnk7XHJcbiAgICAvLyBEZWxldGUgcGFydGljbGUgd2hlbiBvdXQgb2YgYm91bmRzXHJcbiAgICBpZiAocGFydGljbGVzW3BdLnggKyAzIDwgMCB8fCBwYXJ0aWNsZXNbcF0ueSArIDMgPCAwIHx8XHJcbiAgICAgICAgcGFydGljbGVzW3BdLnggLSAzID4gZ2FtZS53aWR0aCB8fCBwYXJ0aWNsZXNbcF0ueSAtIDMgPiBnYW1lLmhlaWdodCArIGJvdHRvbUxlZXdheSkge1xyXG4gICAgICBwYXJ0aWNsZXMuc3BsaWNlKHAsIDEpO1xyXG4gICAgICBwLS07XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvLyBVcGRhdGUgaGlnaCBzY29yZSBhbmltYXRpb25cclxuICBpZiAoaGlnaFNjb3JlVGltZSA+IDApIHtcclxuICAgIGhpZ2hTY29yZVRpbWUgLT0gMTtcclxuICB9XHJcblxyXG4gIC8vIFNraXAgcGxheWVyIGxvZ2ljIGlmIG5vdCBjdXJyZW50bHkgcGxheWluZ1xyXG4gIGlmICghcGxheWVyKSB7XHJcbiAgICByZXR1cm47XHJcbiAgfVxyXG5cclxuICAvLyBDaGVjayBmb3IgY29sbGlzaW9uc1xyXG4gIGZvciAociA9IDA7IHIgPCByb2Nrcy5sZW5ndGg7IHIrKykge1xyXG4gICAgaWYgKGhlbHBlcnMuaW50ZXJzZWN0ZWQoe3g6IHBsYXllci54LCB5OiBwbGF5ZXIueSwgd2lkdGg6IDIwLCBoZWlnaHQ6IDEwfSwgcm9ja3Nbcl0pKSB7XHJcbiAgICAgIGVuZEdhbWUoKTtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLy8gVXBkYXRlIHBsYXllclxyXG4gIGlmIChmcmFtZUNvdW50ICUgc2NvcmVGcmFtZUNvdW50ID09PSAwKSB7XHJcbiAgICBwbGF5ZXIuc2NvcmUgKz0gc2NvcmVJbmNyZW1lbnQ7XHJcbiAgfVxyXG4gIGlmIChwbGF5ZXIuc3kgPiAxKSB7XHJcbiAgICBwbGF5ZXIuc3kgLT0gMC4xO1xyXG4gIH1cclxuICBpZiAocGxheWVyLmJlc3QgJiYgcGxheWVyLnNjb3JlID4gcGxheWVyLmJlc3QpIHtcclxuICAgIHBsYXllci5iZXN0ID0gcGxheWVyLnNjb3JlO1xyXG4gIH1cclxuICBwbGF5ZXIudmVsb2NpdHkgKz0gZ3Jhdml0eTtcclxuICBpZiAocGxheWVyLnZlbG9jaXR5ID4gcGxheWVyLnRlcm1pbmFsVmVsb2NpdHkpIHtcclxuICAgIHBsYXllci52ZWxvY2l0eSA9IHBsYXllci50ZXJtaW5hbFZlbG9jaXR5O1xyXG4gIH1cclxuICBwbGF5ZXIueSArPSBwbGF5ZXIudmVsb2NpdHk7XHJcbiAgaWYgKHBsYXllci55ID49IGdhbWUuaGVpZ2h0ICsgYm90dG9tTGVld2F5KSB7XHJcbiAgICBlbmRHYW1lKCk7XHJcbiAgICByZXR1cm47XHJcbiAgfVxyXG4gIGlmICgocGxheWVyLnkgLSBwbGF5ZXIudmVsb2NpdHkgPj0gc2VhTGV2ZWwgJiYgcGxheWVyLnkgPCBzZWFMZXZlbCkgfHxcclxuICAgICAgKHBsYXllci55IC0gcGxheWVyLnZlbG9jaXR5IDw9IHNlYUxldmVsICYmIHBsYXllci55ID4gc2VhTGV2ZWwpKSB7XHJcbiAgICBuZXdTcGxhc2goKTtcclxuICB9XHJcbn0pO1xyXG5cclxuZ2FtZS5yZW5kZXIoZnVuY3Rpb24gKGN0eCkge1xyXG4gIC8vIERyYXcgYmFja2dyb3VuZFxyXG4gIGN0eC5maWxsU3R5bGUgPSAnI2VjZSc7XHJcbiAgY3R4LmZpbGxSZWN0KDAsIDAsIGdhbWUud2lkdGgsIGdhbWUuaGVpZ2h0KTtcclxuXHJcbiAgLy8gRHJhdyBza3lcclxuICB2YXIgZ3JkID0gY3R4LmNyZWF0ZUxpbmVhckdyYWRpZW50KGdhbWUud2lkdGggLyAyLCAwLjAwMCwgZ2FtZS53aWR0aCAvIDIsIHNlYUxldmVsKTtcclxuICBncmQuYWRkQ29sb3JTdG9wKDAuMDAwLCAnIzgwYmVmYycpO1xyXG4gIGdyZC5hZGRDb2xvclN0b3AoMS4wMDAsICcjY2JjZmVkJyk7XHJcbiAgY3R4LmZpbGxTdHlsZSA9IGdyZDtcclxuICBjdHguZmlsbFJlY3QoMCwgMCwgZ2FtZS53aWR0aCwgc2VhTGV2ZWwpO1xyXG5cclxuICAvLyBEcmF3IHdhdGVyXHJcbiAgZ3JkID0gY3R4LmNyZWF0ZUxpbmVhckdyYWRpZW50KGdhbWUud2lkdGggLyAyLCBzZWFMZXZlbCwgZ2FtZS53aWR0aCAvIDIsIGdhbWUuaGVpZ2h0IC0gc2VhTGV2ZWwpO1xyXG4gIGdyZC5hZGRDb2xvclN0b3AoMC4wMDAsICcjN0VCREZDJyk7XHJcbiAgZ3JkLmFkZENvbG9yU3RvcCgwLjEwMCwgJyMwMDdmZmYnKTtcclxuICBncmQuYWRkQ29sb3JTdG9wKDEuMDAwLCAnIzAwM2Y3ZicpO1xyXG4gIGN0eC5maWxsU3R5bGUgPSBncmQ7XHJcbiAgY3R4LmZpbGxSZWN0KDAsIHNlYUxldmVsLCBnYW1lLndpZHRoLCBnYW1lLmhlaWdodCAtIHNlYUxldmVsKTtcclxuXHJcbiAgLy8gV2F0ZXIgbGlnaHRpbmcgKG5vdGU6IGNvb3JkaW5hdGVzIGFyZSBvZmYsIGJ1dCB0aGUgbWlzdGFrZSBsb29rcyBiZXR0ZXIpXHJcbiAgZ3JkID0gY3R4LmNyZWF0ZUxpbmVhckdyYWRpZW50KDAsIDAsIGdhbWUud2lkdGgsIGdhbWUuaGVpZ2h0IC0gc2VhTGV2ZWwpO1xyXG4gIGdyZC5hZGRDb2xvclN0b3AoMC4wMDAsICdyZ2JhKDAsIDEyNywgMjU1LCAwLjIwMCknKTtcclxuICBncmQuYWRkQ29sb3JTdG9wKDAuMTAwLCAncmdiYSgyNTUsIDI1NSwgMjU1LCAwLjIwMCknKTtcclxuICBncmQuYWRkQ29sb3JTdG9wKDAuMjAwLCAncmdiYSgwLCAxMjcsIDI1NSwgMC4yMDApJyk7XHJcbiAgZ3JkLmFkZENvbG9yU3RvcCgwLjUwMCwgJ3JnYmEoMjU1LCAyNTUsIDI1NSwgMC4yMDApJyk7XHJcbiAgZ3JkLmFkZENvbG9yU3RvcCgwLjYwMCwgJ3JnYmEoMCwgMTI3LCAyNTUsIDAuMjAwKScpO1xyXG4gIGdyZC5hZGRDb2xvclN0b3AoMC44MDAsICdyZ2JhKDI1NSwgMjU1LCAyNTUsIDAuMjAwKScpO1xyXG4gIGdyZC5hZGRDb2xvclN0b3AoMS4wMDAsICdyZ2JhKDAsIDEyNywgMjU1LCAwLjIwMCknKTtcclxuICBjdHguZmlsbFN0eWxlID0gZ3JkO1xyXG4gIGN0eC5maWxsUmVjdCgwLCBzZWFMZXZlbCwgZ2FtZS53aWR0aCwgZ2FtZS5oZWlnaHQgLSBzZWFMZXZlbCk7XHJcblxyXG4gIC8vIERyYXcgYnVyc3RcclxuICBpZiAoYnVyc3RJdGVtKSB7XHJcbiAgICBoZWxwZXJzLmZpbGxDaXJjbGUoY3R4LCBidXJzdEl0ZW0ueCwgYnVyc3RJdGVtLnksIGJ1cnN0SXRlbS5yLCAnI0QzNDM4NCcpO1xyXG4gIH1cclxuXHJcbiAgLy8gRHJhdyBzcGxhc2hcclxuICBmb3IgKHZhciBzID0gMDsgcyA8IHNwbGFzaC5sZW5ndGg7IHMrKykge1xyXG4gICAgaGVscGVycy5maWxsQ2lyY2xlKGN0eCwgc3BsYXNoW3NdLngsIHNwbGFzaFtzXS55LCBzcGxhc2hbc10uciwgJyM3RUJERkMnKTtcclxuICB9XHJcblxyXG4gIC8vIERyYXcgYnViYmxlc1xyXG4gIGZvciAodmFyIGIgPSAwOyBiIDwgYnViYmxlcy5sZW5ndGg7IGIrKykge1xyXG4gICAgaGVscGVycy5maWxsQ2lyY2xlKGN0eCwgYnViYmxlc1tiXS54LCBidWJibGVzW2JdLnksIGJ1YmJsZXNbYl0uciwgJ3JnYmEoMjU1LCAyNTUsIDI1NSwgMC44KScpO1xyXG4gIH1cclxuXHJcbiAgLy8gRHJhdyByb2Nrc1xyXG4gIGZvciAodmFyIHIgPSAwOyByIDwgcm9ja3MubGVuZ3RoOyByKyspIHtcclxuICAgIGN0eC5maWxsU3R5bGUgPSAnIzVkNCc7XHJcbiAgICBjdHguZmlsbFJlY3Qocm9ja3Nbcl0ueCwgcm9ja3Nbcl0ueSwgcm9ja3Nbcl0ud2lkdGgsIHJvY2tzW3JdLmhlaWdodCk7XHJcbiAgfVxyXG5cclxuICAvLyBEcmF3IHBhcnRpY2xlc1xyXG4gIGZvciAodmFyIHAgPSAwOyBwIDwgcGFydGljbGVzLmxlbmd0aDsgcCsrKSB7XHJcbiAgICBoZWxwZXJzLmZpbGxDaXJjbGUoY3R4LCBwYXJ0aWNsZXNbcF0ueCwgcGFydGljbGVzW3BdLnksIDMsICcjZmY0Jyk7XHJcbiAgfVxyXG5cclxuICAvLyBEcmF3IHNjb3JlXHJcbiAgaWYgKHBsYXllciB8fCBoaWdoU2NvcmUpIHtcclxuICAgIGN0eC5mb250ID0gJ2JvbGQgMjBweCBzYW5zLXNlcmlmJztcclxuICAgIGN0eC50ZXh0QWxpZ24gPSAnY2VudGVyJztcclxuICAgIGhlbHBlcnMub3V0bGluZVRleHQoY3R4LCBwbGF5ZXIgPyBwbGF5ZXIuc2NvcmUgOiAnSGlnaCBTY29yZScsIGdhbWUud2lkdGggLyAyLCAyMiwgJyMzMzMnLCAnI2ZmZicpO1xyXG4gIH1cclxuICBpZiAoaGlnaFNjb3JlKSB7XHJcbiAgICBjdHguZm9udCA9ICdib2xkIDIwcHggc2Fucy1zZXJpZic7XHJcbiAgICBoZWxwZXJzLm91dGxpbmVUZXh0KGN0eCwgaGlnaFNjb3JlLCBnYW1lLndpZHRoIC8gMiwgNTEsICcjMzMzJywgJyNmZmYnKTtcclxuICAgIGlmIChoaWdoU2NvcmVUaW1lID4gMCkge1xyXG4gICAgICB2YXIgb2Zmc2V0ID0gKGhpZ2hTY29yZVRpbWUpICogMjtcclxuICAgICAgdmFyIGZhZGUgPSAoaGlnaFNjb3JlVGltZSAvIGhpZ2hTY29yZU1heFRpbWUgKiAyKTtcclxuICAgICAgY3R4LmZvbnQgPSAnYm9sZCAnICsgKDI0ICsgb2Zmc2V0KSArICdweCBzYW5zLXNlcmlmJztcclxuICAgICAgY3R4LmZpbGxTdHlsZSA9ICdyZ2JhKDI1NSwgMjU1LCAyNTUsICcgKyBmYWRlICsgJyknO1xyXG4gICAgICBjdHguZmlsbFRleHQoaGlnaFNjb3JlLCBnYW1lLndpZHRoIC8gMiwgNjQgKyAob2Zmc2V0ICogMS41KSk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvLyBEcmF3IGxldmVsIGJhZGdlc1xyXG4gIGZvciAodmFyIGJhZGdlID0gMDsgYmFkZ2UgPCBjdXJyZW50TGV2ZWw7IGJhZGdlKyspIHtcclxuICAgIHZhciB4ID0gKGdhbWUud2lkdGggLSAoYmFkZ2UgJSA0KSAqIDQwIC0gMjIpO1xyXG4gICAgdmFyIHkgPSAxNiArICgyNCAqIE1hdGguZmxvb3IoYmFkZ2UgLyA0KSk7XHJcbiAgICBoZWxwZXJzLmZpbGxFbGxpcHNlKGN0eCwgeCwgeSwgOCwgMiwgMSwgJyNmZjQnKTtcclxuICAgIGhlbHBlcnMuZmlsbENpcmNsZShjdHgsIHggKyA1LCB5IC0gMiwgMiwgJyMzMzAnKTtcclxuICB9XHJcblxyXG4gIC8vIERyYXcgYnVyc3QgbW9kZSBtZXRlclxyXG4gIGlmIChidXJzdE1vZGUpIHtcclxuICAgIHZhciBidyA9IDE1MztcclxuICAgIGhlbHBlcnMuZHJhd01ldGVyKGN0eCwgZ2FtZS53aWR0aCAtIGJ3IC0gNSwgc2VhTGV2ZWwgLSAyMiwgYncsIDEyLCBidXJzdE1vZGVNYXhDb3VudCAtIGJ1cnN0TW9kZUNvdW50LCBidXJzdE1vZGVNYXhDb3VudCwgJyM1ZDQnKTtcclxuICB9XHJcblxyXG4gIGlmIChwbGF5ZXIpIHtcclxuICAgIC8vIERyYXcgcGxheWVyXHJcbiAgICBoZWxwZXJzLmZpbGxFbGxpcHNlKGN0eCwgcGxheWVyLngsIHBsYXllci55LCAxMCwgMiwgcGxheWVyLnN5LCAnI2ZmNCcpO1xyXG4gICAgaGVscGVycy5maWxsQ2lyY2xlKGN0eCwgcGxheWVyLnggKyA1LCBwbGF5ZXIueSAtIDIsIDMsICcjMzMwJyk7XHJcbiAgfVxyXG5cclxuICAvLyBEcmF3IHdhdGVyIGRlcHRoIGdyYWRpZW50XHJcbiAgZ3JkID0gY3R4LmNyZWF0ZUxpbmVhckdyYWRpZW50KGdhbWUud2lkdGggLyAyLCBzZWFMZXZlbCwgZ2FtZS53aWR0aCAvIDIsIGdhbWUuaGVpZ2h0KTtcclxuICBncmQuYWRkQ29sb3JTdG9wKDAuMDAwLCAncmdiYSgwLCAxMjcsIDI1NSwgMC4xMDApJyk7XHJcbiAgZ3JkLmFkZENvbG9yU3RvcCgwLjcwMCwgJ3JnYmEoMCwgNjMsIDEyNywgMC4xMDApJyk7XHJcbiAgZ3JkLmFkZENvbG9yU3RvcCgxLjAwMCwgJ3JnYmEoMCwgNjMsIDEyNywgMC42MDApJyk7XHJcbiAgY3R4LmZpbGxTdHlsZSA9IGdyZDtcclxuICBjdHguZmlsbFJlY3QoMCwgc2VhTGV2ZWwsIGdhbWUud2lkdGgsIGdhbWUuaGVpZ2h0IC0gc2VhTGV2ZWwpO1xyXG5cclxuICBpZiAoIXBsYXllcikge1xyXG4gICAgLy8gRHJhdyBwcmUtZ2FtZSB0ZXh0XHJcbiAgICBpZiAoKGZyYW1lQ291bnQgJSAxMjAgPiA1ICYmIGZyYW1lQ291bnQgJSAxMjAgPCAyMCkgfHwgZnJhbWVDb3VudCAlIDEyMCA+IDI1KSB7XHJcbiAgICAgIGN0eC5mb250ID0gJ2JvbGQgNjRweCBzYW5zLXNlcmlmJztcclxuICAgICAgY3R4LnRleHRBbGlnbiA9ICdjZW50ZXInO1xyXG4gICAgICBpZiAoaGlnaFNjb3JlKSB7XHJcbiAgICAgICAgaGVscGVycy5vdXRsaW5lVGV4dChjdHgsICdHYW1lIG92ZXIhJywgZ2FtZS53aWR0aCAvIDIsIGdhbWUuaGVpZ2h0IC8gMiAtIDMwLCAnIzMzMycsICcjZmZmJyk7XHJcbiAgICAgICAgaGVscGVycy5vdXRsaW5lVGV4dChjdHgsICdDbGljayBhZ2FpbiEnLCBnYW1lLndpZHRoIC8gMiwgZ2FtZS5oZWlnaHQgLyAyICsgNDAsICcjMzMzJywgJyNmZmYnKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBoZWxwZXJzLm91dGxpbmVUZXh0KGN0eCwgJ0NsaWNrIHRvIHN0YXJ0IScsIGdhbWUud2lkdGggLyAyLCBnYW1lLmhlaWdodCAvIDIsICcjMzMzJywgJyNmZmYnKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgaWYgKHBsYXllciAmJiBsb25nSnVtcENvbXBsZXRlQ291bnQgPiAwKSB7XHJcbiAgICAvLyBEcmF3IG1lc3NhZ2VcclxuICAgIGxvbmdKdW1wQ29tcGxldGVDb3VudCAtPSAxO1xyXG4gICAgY3R4LmZvbnQgPSAnYm9sZCA3MnB4IHNhbnMtc2VyaWYnO1xyXG4gICAgY3R4LnRleHRBbGlnbiA9ICdjZW50ZXInO1xyXG4gICAgaWYgKGxvbmdKdW1wQ29tcGxldGVDb3VudCAlIDIwID4gNSkge1xyXG4gICAgICBoZWxwZXJzLm91dGxpbmVUZXh0KGN0eCwgJ05pY2UganVtcCEnLCBnYW1lLndpZHRoIC8gMiwgZ2FtZS5oZWlnaHQgLyAyLCAnIzMzMycsICcjZmZmJyk7XHJcbiAgICB9XHJcbiAgfVxyXG59KTtcclxuXHJcbi8vIFRPRE86IERlbGV0ZSB0aGlzXHJcbmdhbWUucnVuKCk7XHJcblxyXG4vLyBUT0RPOiBHZXQgdGhlIHJ1bnRpbWUgdG8gZXhwb3NlIHRoaXMgb2JqZWN0IHRocm91Z2ggYSBnZXNzby5jdXJyZW50IGdsb2JhbFxyXG5tb2R1bGUuZXhwb3J0cyA9IGdhbWU7XHJcbiIsIm1vZHVsZS5leHBvcnRzID0ge1xyXG4gIHJhbmRJbnQ6IGZ1bmN0aW9uIChtaW4sIG1heCkge1xyXG4gICAgcmV0dXJuIE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIChtYXggLSBtaW4gKyAxKSkgKyBtaW47XHJcbiAgfSxcclxuICBmaWxsQ2lyY2xlOiBmdW5jdGlvbiAoY3R4LCB4LCB5LCByLCBjb2xvcikge1xyXG4gICAgY3R4LmJlZ2luUGF0aCgpO1xyXG4gICAgY3R4LmFyYyh4LCB5LCByLCAwLCAyICogTWF0aC5QSSwgZmFsc2UpO1xyXG4gICAgY3R4LmZpbGxTdHlsZSA9IGNvbG9yO1xyXG4gICAgY3R4LmZpbGwoKTtcclxuICB9LFxyXG4gIGZpbGxFbGxpcHNlOiBmdW5jdGlvbiAoY3R4LCB4LCB5LCByLCBzeCwgc3ksIGNvbG9yKSB7XHJcbiAgICBjdHguc2F2ZSgpO1xyXG4gICAgY3R4LnRyYW5zbGF0ZSgteCAqIChzeCAtIDEpLCAteSAqIChzeSAtIDEpKTtcclxuICAgIGN0eC5zY2FsZShzeCwgc3kpO1xyXG4gICAgY3R4LmJlZ2luUGF0aCgpO1xyXG4gICAgY3R4LmFyYyh4LCB5LCByLCAwLCAyICogTWF0aC5QSSwgZmFsc2UpO1xyXG4gICAgY3R4LnJlc3RvcmUoKTtcclxuICAgIGN0eC5maWxsU3R5bGUgPSBjb2xvcjtcclxuICAgIGN0eC5maWxsKCk7XHJcbiAgfSxcclxuICBkcmF3TWV0ZXI6IGZ1bmN0aW9uIChjdHgsIHgsIHksIHdpZHRoLCBoZWlnaHQsIHZhbHVlLCBtYXgsIGNvbG9yKSB7XHJcbiAgICBjdHguZmlsbFN0eWxlID0gJyNmZmYnO1xyXG4gICAgY3R4LmZpbGxSZWN0KHgsIHksIHdpZHRoLCBoZWlnaHQpO1xyXG4gICAgY3R4LmZpbGxTdHlsZSA9ICcjMDAwJztcclxuICAgIGN0eC5maWxsUmVjdCh4ICsgMiwgeSArIDIsIHdpZHRoIC0gNCwgaGVpZ2h0IC0gNCk7XHJcbiAgICBjdHguZmlsbFN0eWxlID0gY29sb3I7XHJcbiAgICB2YXIgbWV0ZXJXaWR0aCA9IHdpZHRoIC0gODtcclxuICAgIGN0eC5maWxsUmVjdCh4ICsgNCArICgobWF4IC0gdmFsdWUpIC8gbWF4KSAqIG1ldGVyV2lkdGgsIHkgKyA0LCBtZXRlcldpZHRoIC0gKChtYXggLSB2YWx1ZSkgLyBtYXgpICogbWV0ZXJXaWR0aCwgaGVpZ2h0IC0gOCk7XHJcbiAgfSxcclxuICBvdXRsaW5lVGV4dDogZnVuY3Rpb24gKGN0eCwgdGV4dCwgeCwgeSwgY29sb3IsIG91dGxpbmUpIHtcclxuICAgIGN0eC5maWxsU3R5bGUgPSBjb2xvcjtcclxuICAgIGN0eC5maWxsVGV4dCh0ZXh0LCB4IC0gMSwgeSk7XHJcbiAgICBjdHguZmlsbFRleHQodGV4dCwgeCArIDEsIHkpO1xyXG4gICAgY3R4LmZpbGxUZXh0KHRleHQsIHgsIHkgLSAxKTtcclxuICAgIGN0eC5maWxsVGV4dCh0ZXh0LCB4LCB5ICsgMik7XHJcbiAgICBjdHguZmlsbFN0eWxlID0gb3V0bGluZTtcclxuICAgIGN0eC5maWxsVGV4dCh0ZXh0LCB4LCB5KTtcclxuICB9LFxyXG4gIGludGVyc2VjdGVkOiBmdW5jdGlvbiAocmVjdDEsIHJlY3QyKSB7XHJcbiAgICByZXR1cm4gKHJlY3QxLnggPCByZWN0Mi54ICsgcmVjdDIud2lkdGggJiZcclxuICAgICAgcmVjdDEueCArIHJlY3QxLndpZHRoID4gcmVjdDIueCAmJlxyXG4gICAgICByZWN0MS55IDwgcmVjdDIueSArIHJlY3QyLmhlaWdodCAmJlxyXG4gICAgICByZWN0MS5oZWlnaHQgKyByZWN0MS55ID4gcmVjdDIueSk7XHJcbiAgfVxyXG59O1xyXG4iLCJ2YXIgbG93TGV2ZWwgPSByZXF1aXJlKCcuL2xvd0xldmVsJyk7XHJcblxyXG5cclxuZnVuY3Rpb24gQ29udHJvbGxlcihnZXNzbywgY2FudmFzKSB7XHJcbiAgdGhpcy5nZXNzbyA9IGdlc3NvO1xyXG4gIHRoaXMuY2FudmFzID0gY2FudmFzIHx8IGxvd0xldmVsLmdldENhbnZhcygpO1xyXG4gIHRoaXMuX2NvbnRleHQgPSB0aGlzLmNhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xyXG4gIHRoaXMuX3J1bm5pbmcgPSBudWxsO1xyXG4gIHRoaXMuX3JlcXVlc3RJZCA9IG51bGw7XHJcbn1cclxuQ29udHJvbGxlci5wcm90b3R5cGUuc3RlcE9uY2UgPSBmdW5jdGlvbiAodGltZXN0YW1wKSB7XHJcbiAgdGhpcy5nZXNzby5zdGVwKHRoaXMuX2NvbnRleHQpO1xyXG59O1xyXG5Db250cm9sbGVyLnByb3RvdHlwZS5jb250aW51ZU9uID0gZnVuY3Rpb24gKHRpbWVzdGFtcCkge1xyXG4gIHRoaXMuc3RlcE9uY2UoKTtcclxuXHJcbiAgdmFyIHNlbGYgPSB0aGlzO1xyXG4gIHNlbGYuX3JlcXVlc3RJZCA9IGxvd0xldmVsLnJlcXVlc3RBbmltYXRpb25GcmFtZShmdW5jdGlvbiAodGltZXN0YW1wKSB7XHJcbiAgICBzZWxmLl9yZXF1ZXN0SWQgPSBudWxsO1xyXG4gICAgaWYgKCFzZWxmLl9ydW5uaW5nKSB7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuICAgIC8vIFRPRE86IEZQU1xyXG4gICAgc2VsZi5jb250aW51ZU9uKCk7XHJcbiAgfSk7XHJcbn07XHJcbkNvbnRyb2xsZXIucHJvdG90eXBlLnN0YXJ0ID0gZnVuY3Rpb24gc3RhcnQoKSB7XHJcbiAgaWYgKHRoaXMuX3J1bm5pbmcpIHtcclxuICAgIHJldHVybjtcclxuICB9XHJcbiAgdGhpcy5fcnVubmluZyA9IHRydWU7XHJcblxyXG4gIHRoaXMuZ2Vzc28uaW5pdGlhbGl6ZSgpO1xyXG4gIHRoaXMuZ2Vzc28uc3RhcnQuaW52b2tlKCk7XHJcbiAgLy8gVE9ETzogVXNlIGEgc2NoZWR1bGVyXHJcbiAgdGhpcy5jb250aW51ZU9uKCk7XHJcbn07XHJcbkNvbnRyb2xsZXIucHJvdG90eXBlLnN0b3AgPSBmdW5jdGlvbiBzdG9wKCkge1xyXG4gIGlmICghdGhpcy5fcnVubmluZykge1xyXG4gICAgcmV0dXJuO1xyXG4gIH1cclxuICB0aGlzLl9ydW5uaW5nID0gZmFsc2U7XHJcblxyXG4gIGxvd0xldmVsLmNhbmNlbEFuaW1hdGlvbkZyYW1lKHRoaXMuX3JlcXVlc3RJZCk7XHJcbiAgdGhpcy5fcmVxdWVzdElkID0gbnVsbDtcclxuICB0aGlzLmdlc3NvLnN0b3AuaW52b2tlKCk7XHJcbn07XHJcblxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBDb250cm9sbGVyO1xyXG4iLCJ2YXIgdXRpbCA9IHJlcXVpcmUoJy4vdXRpbCcpO1xyXG5cclxuXHJcbi8vIFJldHVybnMgYSBjYWxsYWJsZSBvYmplY3QgdGhhdCwgd2hlbiBjYWxsZWQgd2l0aCBhIGZ1bmN0aW9uLCBzdWJzY3JpYmVzXHJcbi8vIHRvIHRoZSBkZWxlZ2F0ZS4gQ2FsbCBpbnZva2Ugb24gdGhpcyBvYmplY3QgdG8gaW52b2tlIGVhY2ggaGFuZGxlci5cclxuZnVuY3Rpb24gRGVsZWdhdGUoc3Vic2NyaWJlZCwgdW5zdWJzY3JpYmVkKSB7XHJcbiAgdmFyIGhhbmRsZXJzID0gW107XHJcblxyXG4gIGZ1bmN0aW9uIGNhbGxhYmxlKGhhbmRsZXIpIHtcclxuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoICE9PSAxKSB7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcignRGVsZWdhdGUgdGFrZXMgZXhhY3RseSAxIGFyZ3VtZW50ICgnICsgYXJndW1lbnRzLmxlbmd0aCArICcgZ2l2ZW4pJyk7XHJcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBoYW5kbGVyICE9PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcignRGVsZWdhdGUgYXJndW1lbnQgbXVzdCBiZSBhIEZ1bmN0aW9uIG9iamVjdCAoZ290ICcgKyB0eXBlb2YgaGFuZGxlciArICcpJyk7XHJcbiAgICB9XHJcbiAgICAvLyBBZGQgdGhlIGhhbmRsZXJcclxuICAgIGhhbmRsZXJzLnB1c2goaGFuZGxlcik7XHJcbiAgICAvLyBBbGxvdyBjdXN0b20gbG9naWMgb24gc3Vic2NyaWJlLCBwYXNzaW5nIGluIHRoZSBoYW5kbGVyXHJcbiAgICBpZiAoc3Vic2NyaWJlZCkge1xyXG4gICAgICBzdWJzY3JpYmVkKGhhbmRsZXIpO1xyXG4gICAgfVxyXG4gICAgLy8gUmV0dXJuIHRoZSB1bnN1YnNjcmliZSBmdW5jdGlvblxyXG4gICAgcmV0dXJuIGZ1bmN0aW9uIHVuc3Vic2NyaWJlKCkge1xyXG4gICAgICB2YXIgaW5pdGlhbEhhbmRsZXIgPSB1dGlsLnJlbW92ZUxhc3QoaGFuZGxlcnMsIGhhbmRsZXIpO1xyXG4gICAgICAvLyBBbGxvdyBjdXN0b20gbG9naWMgb24gdW5zdWJzY3JpYmUsIHBhc3NpbmcgaW4gdGhlIG9yaWdpbmFsIGhhbmRsZXJcclxuICAgICAgaWYgKHVuc3Vic2NyaWJlZCkge1xyXG4gICAgICAgIHVuc3Vic2NyaWJlZChpbml0aWFsSGFuZGxlcik7XHJcbiAgICAgIH1cclxuICAgICAgLy8gUmV0dXJuIHRoZSBvcmlnaW5hbCBoYW5kbGVyXHJcbiAgICAgIHJldHVybiBpbml0aWFsSGFuZGxlcjtcclxuICAgIH07XHJcbiAgfVxyXG4gIGNhbGxhYmxlLmludm9rZSA9IGZ1bmN0aW9uIGludm9rZSgpIHtcclxuICAgIHZhciBhcmdzID0gYXJndW1lbnRzO1xyXG4gICAgdXRpbC5mb3JFYWNoKGhhbmRsZXJzLCBmdW5jdGlvbiAoaGFuZGxlcikge1xyXG4gICAgICBoYW5kbGVyLmFwcGx5KG51bGwsIGFyZ3MpO1xyXG4gICAgfSk7XHJcbiAgfTtcclxuICAvLyBFeHBvc2UgaGFuZGxlcnMgZm9yIGluc3BlY3Rpb25cclxuICBjYWxsYWJsZS5oYW5kbGVycyA9IGhhbmRsZXJzO1xyXG5cclxuICByZXR1cm4gY2FsbGFibGU7XHJcbn1cclxuXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IERlbGVnYXRlO1xyXG4iLCJ2YXIgQ29udHJvbGxlciA9IHJlcXVpcmUoJy4vY29udHJvbGxlcicpO1xyXG52YXIgRGVsZWdhdGUgPSByZXF1aXJlKCcuL2RlbGVnYXRlJyk7XHJcbnZhciBsb3dMZXZlbCA9IHJlcXVpcmUoJy4vbG93TGV2ZWwnKTtcclxudmFyIGxvZ2dpbmcgPSByZXF1aXJlKCcuL2xvZ2dpbmcnKTtcclxuXHJcblxyXG5mdW5jdGlvbiBHZXNzbyhvcHRpb25zKSB7XHJcbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XHJcbiAgdGhpcy5jb250ZXh0VHlwZSA9IG9wdGlvbnMuY29udGV4dFR5cGUgfHwgJzJkJztcclxuICB0aGlzLmNvbnRleHRBdHRyaWJ1dGVzID0gb3B0aW9ucy5jb250ZXh0QXR0cmlidXRlcztcclxuICB0aGlzLmZwcyA9IG9wdGlvbnMuZnBzIHx8IDYwO1xyXG4gIHRoaXMuYXV0b3BsYXkgPSBvcHRpb25zLmF1dG9wbGF5IHx8IHRydWU7XHJcbiAgdGhpcy5zZXR1cCA9IG5ldyBEZWxlZ2F0ZSgpO1xyXG4gIHRoaXMuc3RhcnQgPSBuZXcgRGVsZWdhdGUoKTtcclxuICB0aGlzLnN0b3AgPSBuZXcgRGVsZWdhdGUoKTtcclxuICB0aGlzLnVwZGF0ZSA9IG5ldyBEZWxlZ2F0ZSgpO1xyXG4gIHRoaXMucmVuZGVyID0gbmV3IERlbGVnYXRlKCk7XHJcbiAgdGhpcy5jbGljayA9IG5ldyBEZWxlZ2F0ZShmdW5jdGlvbiAoaGFuZGxlcikge1xyXG4gICAgLy8gVE9ETzogVXNlIHRoZSBjYW52YXMgcGFzc2VkIGludG8gcnVuKClcclxuICAgIEdlc3NvLmdldENhbnZhcygpLmFkZEV2ZW50TGlzdGVuZXIoJ3RvdWNoc3RhcnQnLCBoYW5kbGVyLCBmYWxzZSk7XHJcbiAgICBHZXNzby5nZXRDYW52YXMoKS5hZGRFdmVudExpc3RlbmVyKCdtb3VzZWRvd24nLCBoYW5kbGVyLCBmYWxzZSk7XHJcbiAgfSwgZnVuY3Rpb24gKGhhbmRsZXIpIHtcclxuICAgIEdlc3NvLmdldENhbnZhcygpLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3RvdWNoc3RhcnQnLCBoYW5kbGVyKTtcclxuICAgIEdlc3NvLmdldENhbnZhcygpLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ21vdXNlZG93bicsIGhhbmRsZXIpO1xyXG4gIH0pO1xyXG5cclxuICB0aGlzLndpZHRoID0gb3B0aW9ucy53aWR0aCB8fCA2NDA7ICAgIC8vIFRPRE86IGFsbG93ICdudWxsJyB0byB1c2Ugd2lkdGggb2YgdGFyZ2V0IGNhbnZhc1xyXG4gIHRoaXMuaGVpZ2h0ID0gb3B0aW9ucy5oZWlnaHQgfHwgNDgwOyAgLy8gVE9ETzogYWxsb3cgJ251bGwnIHRvIHVzZSBoZWlnaHQgb2YgdGFyZ2V0IGNhbnZhc1xyXG4gIHRoaXMuX2luaXRpYWxpemVkID0gZmFsc2U7XHJcbn1cclxuR2Vzc28uQ29udHJvbGxlciA9IENvbnRyb2xsZXI7XHJcbkdlc3NvLkRlbGVnYXRlID0gRGVsZWdhdGU7XHJcbkdlc3NvLnJlcXVlc3RBbmltYXRpb25GcmFtZSA9IGxvd0xldmVsLnJlcXVlc3RBbmltYXRpb25GcmFtZTtcclxuR2Vzc28uY2FuY2VsQW5pbWF0aW9uRnJhbWUgPSBsb3dMZXZlbC5jYW5jZWxBbmltYXRpb25GcmFtZTtcclxuR2Vzc28uZ2V0Q2FudmFzID0gbG93TGV2ZWwuZ2V0Q2FudmFzO1xyXG5HZXNzby5nZXRDb250ZXh0MkQgPSBsb3dMZXZlbC5nZXRDb250ZXh0MkQ7XHJcbkdlc3NvLmdldFdlYkdMQ29udGV4dCA9IGxvd0xldmVsLmdldFdlYkdMQ29udGV4dDtcclxuR2Vzc28uZXJyb3IgPSBsb2dnaW5nLmVycm9yO1xyXG5HZXNzby5pbmZvID0gbG9nZ2luZy5pbmZvO1xyXG5HZXNzby5sb2cgPSBsb2dnaW5nLmxvZztcclxuR2Vzc28ud2FybiA9IGxvZ2dpbmcud2FybjtcclxuR2Vzc28ucHJvdG90eXBlLmluaXRpYWxpemUgPSBmdW5jdGlvbiBpbml0aWFsaXplKCkge1xyXG4gIGlmICh0aGlzLl9pbml0aWFsaXplZCkge1xyXG4gICAgcmV0dXJuO1xyXG4gIH1cclxuICB0aGlzLl9pbml0aWFsaXplZCA9IHRydWU7XHJcbiAgdGhpcy5zZXR1cC5pbnZva2UoKTtcclxufTtcclxuR2Vzc28ucHJvdG90eXBlLnN0ZXAgPSBmdW5jdGlvbiBzdGVwKGNvbnRleHQpIHtcclxuICB0aGlzLm5leHRGcmFtZSgpO1xyXG4gIHRoaXMucmVuZGVyVG8oY29udGV4dCk7XHJcbn07XHJcbkdlc3NvLnByb3RvdHlwZS5uZXh0RnJhbWUgPSBmdW5jdGlvbiBuZXh0RnJhbWUoKSB7XHJcbiAgcmV0dXJuIHRoaXMudXBkYXRlLmludm9rZSgpO1xyXG59O1xyXG5HZXNzby5wcm90b3R5cGUucmVuZGVyVG8gPSBmdW5jdGlvbiByZW5kZXJUbyhjb250ZXh0KSB7XHJcbiAgcmV0dXJuIHRoaXMucmVuZGVyLmludm9rZShjb250ZXh0KTtcclxufTtcclxuR2Vzc28ucHJvdG90eXBlLnJ1biA9IGZ1bmN0aW9uIHJ1bihjYW52YXMpIHtcclxuICB2YXIgY29udHJvbGxlciA9IG5ldyBDb250cm9sbGVyKHRoaXMsIGNhbnZhcyk7XHJcbiAgY29udHJvbGxlci5zdGFydCgpO1xyXG4gIHJldHVybiBjb250cm9sbGVyO1xyXG59O1xyXG5cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gR2Vzc287XHJcbiIsInZhciBHZXNzbyA9IHJlcXVpcmUoJy4vZ2Vzc28nKTtcclxuXHJcbi8vIFRPRE86IERlbGV0ZSB0aGlzXHJcbndpbmRvdy5HZXNzbyA9IEdlc3NvO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBHZXNzbztcclxuIiwiLyogZ2xvYmFscyAkICovXHJcblxyXG5cclxuLy8gVE9ETzogTG9nZ2VyIGNsYXNzXHJcbi8vIFRPRE86IFBsdWdnYWJsZSBsb2cgYmFja2VuZCwgZS5nLiBjb25zb2xlLmxvZ1xyXG5cclxuXHJcbmZ1bmN0aW9uIF9zZW5kKGxldmVsLCBhcmdzKSB7XHJcbiAgLy8gVE9ETzogSW5zcGVjdCBvYmplY3QgaW5zdGVhZCBvZiBzZW5kaW5nIFtvYmplY3QgT2JqZWN0XVxyXG4gIC8vIFRPRE86IFJlbW92ZSB0aGUgaW1wbGllZCBqUXVlcnkgZGVwZW5kZW5jeVxyXG4gICQucG9zdCgnL2xvZycsIHtcclxuICAgIGxldmVsOiBsZXZlbCxcclxuICAgIG1lc3NhZ2U6IGFyZ3Muam9pbignICcpXHJcbiAgfSkuZmFpbChmdW5jdGlvbih4aHIsIHRleHRTdGF0dXMsIGVycm9yVGhyb3duKSB7XHJcbiAgICAvLyBUT0RPOiBOb3RpZnkgdXNlciBvbiB0aGUgcGFnZSBhbmQgc2hvdyBtZXNzYWdlIGlmIGNvbnNvbGUubG9nIGRvZXNuJ3QgZXhpc3RcclxuICAgIGlmIChjb25zb2xlICYmIGNvbnNvbGUubG9nKSB7XHJcbiAgICAgIGNvbnNvbGUubG9nKHhoci5yZXNwb25zZVRleHQpO1xyXG4gICAgfVxyXG4gIH0pO1xyXG59XHJcblxyXG5cclxuZnVuY3Rpb24gZXJyb3IobWVzc2FnZSkge1xyXG4gIHJldHVybiBfc2VuZCgnZXJyb3InLCBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpKTtcclxufVxyXG5cclxuXHJcbmZ1bmN0aW9uIGluZm8obWVzc2FnZSkge1xyXG4gIHJldHVybiBfc2VuZCgnaW5mbycsIEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cykpO1xyXG59XHJcblxyXG5cclxuZnVuY3Rpb24gbG9nKG1lc3NhZ2UpIHtcclxuICByZXR1cm4gX3NlbmQoJ2xvZycsIEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cykpO1xyXG59XHJcblxyXG5cclxuZnVuY3Rpb24gd2FybihtZXNzYWdlKSB7XHJcbiAgcmV0dXJuIF9zZW5kKCd3YXJuJywgQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzKSk7XHJcbn1cclxuXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IHtcclxuICBlcnJvcjogZXJyb3IsXHJcbiAgaW5mbzogaW5mbyxcclxuICBsb2c6IGxvZyxcclxuICB3YXJuOiB3YXJuXHJcbn07XHJcbiIsInZhciB1dGlsID0gcmVxdWlyZSgnLi91dGlsJyk7XHJcblxyXG5cclxudmFyIHJhZiA9IChmdW5jdGlvbiAoKSB7XHJcbiAgLy8gUmFmIHBvbHlmaWxsIGJ5IEVyaWsgTcO2bGxlci4gZml4ZXMgZnJvbSBQYXVsIElyaXNoIGFuZCBUaW5vIFppamRlbFxyXG4gIC8vIEFkYXB0ZWQgYnkgSm9lIEVzcG9zaXRvXHJcbiAgLy8gT3JpZ2luOiBodHRwOi8vcGF1bGlyaXNoLmNvbS8yMDExL3JlcXVlc3RhbmltYXRpb25mcmFtZS1mb3Itc21hcnQtYW5pbWF0aW5nL1xyXG4gIC8vICAgICAgICAgaHR0cDovL215Lm9wZXJhLmNvbS9lbW9sbGVyL2Jsb2cvMjAxMS8xMi8yMC9yZXF1ZXN0YW5pbWF0aW9uZnJhbWUtZm9yLXNtYXJ0LWVyLWFuaW1hdGluZ1xyXG4gIC8vIE1JVCBsaWNlbnNlXHJcblxyXG4gIHZhciByZXF1ZXN0QW5pbWF0aW9uRnJhbWUgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyA/IHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUgOiBudWxsO1xyXG4gIHZhciBjYW5jZWxBbmltYXRpb25GcmFtZSA9IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnID8gd2luZG93LmNhbmNlbEFuaW1hdGlvbkZyYW1lIDogbnVsbDtcclxuXHJcbiAgdmFyIHZlbmRvcnMgPSBbJ21zJywgJ21veicsICd3ZWJraXQnLCAnbyddO1xyXG4gIGZvcih2YXIgeCA9IDA7IHggPCB2ZW5kb3JzLmxlbmd0aCAmJiAhcmVxdWVzdEFuaW1hdGlvbkZyYW1lOyArK3gpIHtcclxuICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZSA9IHdpbmRvd1t2ZW5kb3JzW3hdICsgJ1JlcXVlc3RBbmltYXRpb25GcmFtZSddO1xyXG4gICAgY2FuY2VsQW5pbWF0aW9uRnJhbWUgPSB3aW5kb3dbdmVuZG9yc1t4XSArICdDYW5jZWxBbmltYXRpb25GcmFtZSddIHx8IHdpbmRvd1t2ZW5kb3JzW3hdICsgJ0NhbmNlbFJlcXVlc3RBbmltYXRpb25GcmFtZSddO1xyXG4gIH1cclxuXHJcbiAgaWYgKCFyZXF1ZXN0QW5pbWF0aW9uRnJhbWUpIHtcclxuICAgIHZhciBsYXN0VGltZSA9IDA7XHJcbiAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUgPSBmdW5jdGlvbihjYWxsYmFjaykge1xyXG4gICAgICB2YXIgY3VyclRpbWUgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcclxuICAgICAgdmFyIHRpbWVUb0NhbGwgPSBNYXRoLm1heCgwLCAxNiAtIChjdXJyVGltZSAtIGxhc3RUaW1lKSk7XHJcbiAgICAgIHZhciBpZCA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7IGNhbGxiYWNrKGN1cnJUaW1lICsgdGltZVRvQ2FsbCk7IH0sIHRpbWVUb0NhbGwpO1xyXG4gICAgICBsYXN0VGltZSA9IGN1cnJUaW1lICsgdGltZVRvQ2FsbDtcclxuICAgICAgcmV0dXJuIGlkO1xyXG4gICAgfTtcclxuXHJcbiAgICBjYW5jZWxBbmltYXRpb25GcmFtZSA9IGZ1bmN0aW9uKGlkKSB7XHJcbiAgICAgIGNsZWFyVGltZW91dChpZCk7XHJcbiAgICB9O1xyXG4gIH1cclxuXHJcbiAgcmV0dXJuIHtcclxuICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZTogZnVuY3Rpb24oY2FsbGJhY2spIHsgcmV0dXJuIHJlcXVlc3RBbmltYXRpb25GcmFtZShjYWxsYmFjayk7IH0sXHJcbiAgICBjYW5jZWxBbmltYXRpb25GcmFtZTogZnVuY3Rpb24ocmVxdWVzdElEKSB7IHJldHVybiBjYW5jZWxBbmltYXRpb25GcmFtZShyZXF1ZXN0SUQpOyB9XHJcbiAgfTtcclxufSkoKTtcclxuXHJcblxyXG5mdW5jdGlvbiBnZXRDYW52YXMoKSB7XHJcbiAgLy8gVE9ETzogRXh0cmFjdCB0aGlzIG91dCB0byBicmVhayBkZXBlbmRlbmN5XHJcbiAgaWYgKHR5cGVvZiB3aW5kb3cgPT09ICd1bmRlZmluZWQnKSB7XHJcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0Nhbm5vdCBnZXQgY2FudmFzIG91dHNpZGUgb2YgYnJvd3NlciBjb250ZXh0LicpO1xyXG4gIH1cclxuXHJcbiAgLy8gVE9ETzogUmVhZCB0aGUgcHJvamVjdCBzZXR0aW5ncyB1c2UgdGhlIHJpZ2h0IElEXHJcbiAgdmFyIGNhbnZhcyA9IHdpbmRvdy5kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZ2Vzc28tdGFyZ2V0Jyk7XHJcblxyXG4gIC8vIFJlcGxhY2UgaW1hZ2UgcGxhY2Vob2xkZXIgd2l0aCBjYW52YXNcclxuICBpZiAoY2FudmFzICYmIGNhbnZhcy50YWdOYW1lID09PSAnSU1HJykge1xyXG4gICAgY2FudmFzID0gdXRpbC5jaGFuZ2VUYWdOYW1lKGNhbnZhcywgJ2NhbnZhcycpO1xyXG4gIH1cclxuXHJcbiAgLy8gRGVmYXVsdCB0byB1c2luZyB0aGUgb25seSBjYW52YXMgb24gdGhlIHBhZ2UsIGlmIGF2YWlsYWJsZVxyXG4gIGlmICghY2FudmFzKSB7XHJcbiAgICB2YXIgY2FudmFzZXMgPSB3aW5kb3cuZG9jdW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ2NhbnZhcycpO1xyXG4gICAgaWYgKGNhbnZhc2VzLmxlbmd0aCA9PT0gMSkge1xyXG4gICAgICBjYW52YXMgPSBjYW52YXNlc1swXTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8vIFJhaXNlIGVycm9yIGlmIG5vIHVzYWJsZSBjYW52YXNlcyB3ZXJlIGZvdW5kXHJcbiAgaWYgKCFjYW52YXMpIHtcclxuICAgIHRocm93IG5ldyBFcnJvcignQ2FudmFzIG5vdCBmb3VuZC4nKTtcclxuICB9XHJcblxyXG4gIHJldHVybiBjYW52YXM7XHJcbn1cclxuXHJcblxyXG5mdW5jdGlvbiBnZXRDb250ZXh0MkQoKSB7XHJcbiAgcmV0dXJuIGdldENhbnZhcygpLmdldENvbnRleHQoJzJkJyk7XHJcbn1cclxuXHJcblxyXG5mdW5jdGlvbiBnZXRXZWJHTENvbnRleHQoKSB7XHJcbiAgcmV0dXJuIGdldENhbnZhcygpLmdldENvbnRleHQoJ3dlYmdsJyk7XHJcbn1cclxuXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IHtcclxuICByZXF1ZXN0QW5pbWF0aW9uRnJhbWU6IHJhZi5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUsXHJcbiAgY2FuY2VsQW5pbWF0aW9uRnJhbWU6IHJhZi5jYW5jZWxBbmltYXRpb25GcmFtZSxcclxuICBnZXRDYW52YXM6IGdldENhbnZhcyxcclxuICBnZXRDb250ZXh0MkQ6IGdldENvbnRleHQyRCxcclxuICBnZXRXZWJHTENvbnRleHQ6IGdldFdlYkdMQ29udGV4dFxyXG59O1xyXG4iLCJmdW5jdGlvbiBmb3JFYWNoKGFycmF5LCBzdGVwRnVuY3Rpb24pIHtcclxuICBmb3IgKHZhciBpbmRleCA9IDA7IGluZGV4IDwgYXJyYXkubGVuZ3RoOyBpbmRleCsrKSB7XHJcbiAgICBzdGVwRnVuY3Rpb24oYXJyYXlbaW5kZXhdKTtcclxuICB9XHJcbn1cclxuXHJcblxyXG5mdW5jdGlvbiBwb3AoYXJyYXksIGluZGV4KSB7XHJcbiAgcmV0dXJuIHR5cGVvZiBpbmRleCA9PT0gJ3VuZGVmaW5lZCcgPyBhcnJheS5wb3AoKSA6IGFycmF5LnNwbGljZShpbmRleCwgMSlbMF07XHJcbn1cclxuXHJcblxyXG5mdW5jdGlvbiBpbmRleE9mKGFycmF5LCBpdGVtLCBzdGFydEluZGV4KSB7XHJcbiAgZm9yICh2YXIgaW5kZXggPSBzdGFydEluZGV4IHx8IDA7IGluZGV4IDwgYXJyYXkubGVuZ3RoOyBpbmRleCsrKSB7XHJcbiAgICBpZiAoYXJyYXlbaW5kZXhdID09PSBpdGVtKSB7XHJcbiAgICAgIHJldHVybiBpbmRleDtcclxuICAgIH1cclxuICB9XHJcbiAgcmV0dXJuIC0xO1xyXG59XHJcblxyXG5cclxuZnVuY3Rpb24gbGFzdEluZGV4T2YoYXJyYXksIGl0ZW0sIHN0YXJ0SW5kZXgpIHtcclxuICBmb3IgKHZhciBpbmRleCA9IHN0YXJ0SW5kZXggfHwgYXJyYXkubGVuZ3RoIC0gMTsgaW5kZXggPj0gMDsgaW5kZXgtLSkge1xyXG4gICAgaWYgKGFycmF5W2luZGV4XSA9PT0gaXRlbSkge1xyXG4gICAgICByZXR1cm4gaW5kZXg7XHJcbiAgICB9XHJcbiAgfVxyXG4gIHJldHVybiAtMTtcclxufVxyXG5cclxuXHJcbmZ1bmN0aW9uIHJlbW92ZShhcnJheSwgaXRlbSkge1xyXG4gIHZhciBpbmRleCA9IGluZGV4T2YoYXJyYXksIGl0ZW0pO1xyXG4gIHJldHVybiBpbmRleCAhPT0gLTEgPyBwb3AoYXJyYXksIGluZGV4KSA6IG51bGw7XHJcbn1cclxuXHJcblxyXG5mdW5jdGlvbiByZW1vdmVMYXN0KGFycmF5LCBpdGVtKSB7XHJcbiAgdmFyIGluZGV4ID0gbGFzdEluZGV4T2YoYXJyYXksIGl0ZW0pO1xyXG4gIHJldHVybiBpbmRleCAhPT0gLTEgPyBwb3AoYXJyYXksIGluZGV4KSA6IG51bGw7XHJcbn1cclxuXHJcblxyXG5mdW5jdGlvbiBjaGFuZ2VUYWdOYW1lKGVsZW1lbnQsIHRhZ05hbWUpIHtcclxuICBpZiAoZWxlbWVudC50YWdOYW1lID09PSB0YWdOYW1lLnRvVXBwZXJDYXNlKCkpIHtcclxuICAgIHJldHVybiBlbGVtZW50O1xyXG4gIH1cclxuXHJcbiAgLy8gVHJ5IGNoYW5naW5nIHRoZSB0eXBlIGZpcnN0IChtb2Rlcm4gYnJvd3NlcnMsIGV4Y2VwdCBJRSlcclxuICBlbGVtZW50LnRhZ05hbWUgPSB0YWdOYW1lO1xyXG4gIGlmIChlbGVtZW50LnRhZ05hbWUgPT09IHRhZ05hbWUudG9VcHBlckNhc2UoKSkge1xyXG4gICAgcmV0dXJuIGVsZW1lbnQ7XHJcbiAgfVxyXG5cclxuICAvLyBDcmVhdGUgbmV3IGVsZW1lbnRcclxuICB2YXIgbmV3RWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQodGFnTmFtZSk7XHJcbiAgY29uc29sZS5sb2codGFnTmFtZSk7XHJcbiAgY29uc29sZS5sb2cobmV3RWxlbWVudCk7XHJcbiAgLy8gQ29weSBhdHRyaWJ1dGVzXHJcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBlbGVtZW50LmF0dHJpYnV0ZXMubGVuZ3RoOyBpKyspIHtcclxuICAgIG5ld0VsZW1lbnQuc2V0QXR0cmlidXRlKGVsZW1lbnQuYXR0cmlidXRlc1tpXS5uYW1lLCBlbGVtZW50LmF0dHJpYnV0ZXNbaV0udmFsdWUpO1xyXG4gIH1cclxuICAvLyBDb3B5IGNoaWxkIG5vZGVzXHJcbiAgd2hpbGUgKGVsZW1lbnQuZmlyc3RDaGlsZCkge1xyXG4gICAgbmV3RWxlbWVudC5hcHBlbmRDaGlsZChlbGVtZW50LmZpcnN0Q2hpbGQpO1xyXG4gIH1cclxuICAvLyBSZXBsYWNlIGVsZW1lbnRcclxuICBlbGVtZW50LnBhcmVudE5vZGUucmVwbGFjZUNoaWxkKG5ld0VsZW1lbnQsIGVsZW1lbnQpO1xyXG5cclxuICByZXR1cm4gbmV3RWxlbWVudDtcclxufVxyXG5cclxuXHJcbm1vZHVsZS5leHBvcnRzID0ge1xyXG4gIGZvckVhY2g6IGZvckVhY2gsXHJcbiAgcG9wOiBwb3AsXHJcbiAgaW5kZXhPZjogaW5kZXhPZixcclxuICBsYXN0SW5kZXhPZjogbGFzdEluZGV4T2YsXHJcbiAgcmVtb3ZlOiByZW1vdmUsXHJcbiAgcmVtb3ZlTGFzdDogcmVtb3ZlTGFzdCxcclxuICBjaGFuZ2VUYWdOYW1lOiBjaGFuZ2VUYWdOYW1lXHJcbn07XHJcbiIsIi8vIEdlc3NvIEVudHJ5IFBvaW50XHJcbi8vIERldGVjdCB3aGV0aGVyIHRoaXMgaXMgY2FsbGVkIGZyb20gdGhlIGJyb3dzZXIsIG9yIGZyb20gdGhlIENMSS5cclxuXHJcblxyXG5pZiAodHlwZW9mIHdpbmRvdyA9PT0gJ3VuZGVmaW5lZCcpIHtcclxuICAvLyBVc2UgbW9kdWxlLnJlcXVpcmUgc28gdGhlIGNsaWVudC1zaWRlIGJ1aWxkIHNraXBzIG92ZXIgc2VydmVyIGNvZGUsXHJcbiAgLy8gd2hpY2ggd2lsbCB3b3JrIHByb3Blcmx5IGF0IHJ1bnRpbWUgc2luY2Ugbm8gd2luZG93IGdsb2JhbCBpcyBkZWZpbmVkXHJcbiAgbW9kdWxlLmV4cG9ydHMgPSBtb2R1bGUucmVxdWlyZSgnLi9nZXNzbycpO1xyXG59IGVsc2Uge1xyXG4gIC8vIEluY2x1ZGUgaW4gY2xpZW50LXNpZGUgYnVpbGQsXHJcbiAgLy8gd2hpY2ggd2lsbCBoYXZlIGEgd2luZG93IGdsb2JhbCBkZWZpbmVkIGF0IHJ1bnRpbWVcclxuICBtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoJy4vY2xpZW50Jyk7XHJcbn1cclxuIl19
