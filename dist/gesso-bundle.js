(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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
    // Delete rock when out of bounds
    if (rocks[r].x + rocks[r].width < 0) {
      rocks.splice(r, 1);
      r--;
    }
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
    // Delete particle when out of bounds
    if (particles[p].x + 3 < 0 || particles[p].y + 3 < 0 ||
        particles[p].x - 3 > game.width || particles[p].y - 3 > game.height) {
      particles.splice(p, 1);
      p--;
    }
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

},{"./helpers":2,"gesso":10}],2:[function(require,module,exports){
module.exports = {
  randInt: function(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
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
  outlineText: function (ctx, text, x, y, color, outline) {
    ctx.fillStyle = color;
    ctx.fillText(text, x - 1, y);
    ctx.fillText(text, x + 1, y);
    ctx.fillText(text, x, y - 1);
    ctx.fillText(text, x, y + 2);
    ctx.fillStyle = outline;
    ctx.fillText(text, x, y);
  },
  intersected: function(rect1, rect2) {
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
  this._canvas = canvas || lowLevel.getCanvas();
  this._context = this._canvas.getContext('2d');
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
function Delegate() {
  var handlers = [];

  function callable(handler) {
    if (arguments.length !== 1) {
      throw new Error('Delegate takes exactly 1 argument (' + arguments.length + ' given)');
    } else if (typeof handler !== 'function') {
      throw new Error('Delegate argument must be a Function object (got ' + typeof handler + ')');
    }
    handlers.push(handler);
    return function unsubscribe() {
      return util.removeLast(handlers, handler);
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
  this.width = options.width || 640;    // TODO: allow 'null' to use width of target canvas
  this.height = options.height || 640;  // TODO: allow 'null' to use height of target canvas
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

  if (!canvas) {
    var canvases = window.document.getElementsByTagName('canvas');
    if (canvases.length === 1) {
      canvas = canvases[0];
    }
  }

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

},{}],9:[function(require,module,exports){
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


module.exports = {
  forEach: forEach,
  pop: pop,
  indexOf: indexOf,
  lastIndexOf: lastIndexOf,
  remove: remove,
  removeLast: removeLast
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uXFwuLlxcLi5cXFByb2plY3RzXFxHZXNzby5qc1xcbm9kZV9tb2R1bGVzXFxicm93c2VyaWZ5XFxub2RlX21vZHVsZXNcXGJyb3dzZXItcGFja1xcX3ByZWx1ZGUuanMiLCJpbmRleC5qcyIsImhlbHBlcnMuanMiLCJub2RlX21vZHVsZXMvZ2Vzc28vY2xpZW50L2NvbnRyb2xsZXIuanMiLCJub2RlX21vZHVsZXMvZ2Vzc28vY2xpZW50L2RlbGVnYXRlLmpzIiwibm9kZV9tb2R1bGVzL2dlc3NvL2NsaWVudC9nZXNzby5qcyIsIm5vZGVfbW9kdWxlcy9nZXNzby9jbGllbnQvaW5kZXguanMiLCJub2RlX21vZHVsZXMvZ2Vzc28vY2xpZW50L2xvZ2dpbmcuanMiLCJub2RlX21vZHVsZXMvZ2Vzc28vY2xpZW50L2xvd0xldmVsLmpzIiwibm9kZV9tb2R1bGVzL2dlc3NvL2NsaWVudC91dGlsLmpzIiwibm9kZV9tb2R1bGVzL2dlc3NvL2luZGV4LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbE5BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIEdlc3NvID0gcmVxdWlyZSgnZ2Vzc28nKTtcclxudmFyIGhlbHBlcnMgPSByZXF1aXJlKCcuL2hlbHBlcnMnKTtcclxuXHJcbnZhciBnYW1lID0gbmV3IEdlc3NvKCk7XHJcbnZhciBncmF2aXR5ID0gMC4zO1xyXG52YXIgc2VhTGV2ZWwgPSA4MDtcclxudmFyIHBsYXllciA9IG51bGw7XHJcbnZhciByb2NrcyA9IFtdO1xyXG52YXIgZnJhbWVDb3VudCA9IDA7XHJcbnZhciBoaWdoU2NvcmUgPSAwO1xyXG52YXIgaGlnaFNjb3JlVGltZSA9IDA7XHJcbnZhciBoaWdoU2NvcmVNYXhUaW1lID0gNjA7XHJcbnZhciBwYXJ0aWNsZXMgPSBbXTtcclxudmFyIGVuZEdhbWVQYXJ0aWNsZUNvdW50ID0gMTAwO1xyXG5cclxuZnVuY3Rpb24gbmV3R2FtZSgpIHtcclxuICBwbGF5ZXIgPSB7XHJcbiAgICBwbGF5aW5nOiBmYWxzZSxcclxuICAgIHg6IDEwMCxcclxuICAgIHk6IDIwMCxcclxuICAgIHN5OiAxLFxyXG4gICAgdmVsb2NpdHk6IC0xMCxcclxuICAgIGp1bXBWZWxvY2l0eTogOCxcclxuICAgIHRlcm1pbmFsVmVsb2NpdHk6IDcsXHJcbiAgICBzY29yZTogMFxyXG4gIH07XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGVuZEdhbWUoKSB7XHJcbiAgaWYgKCFwbGF5ZXIpIHtcclxuICAgIHJldHVybjtcclxuICB9XHJcblxyXG4gIC8vIFNldCB0aGUgbmV3IGhpZ2ggc2NvcmUsIGFuaW1hdGluZyBpdCwgaWYgdGhlIHJlY29yZCB3YXMgYnJva2VuXHJcbiAgaWYgKHBsYXllci5zY29yZSA+IGhpZ2hTY29yZSkge1xyXG4gICAgaGlnaFNjb3JlID0gcGxheWVyLnNjb3JlO1xyXG4gICAgaGlnaFNjb3JlVGltZSA9IGhpZ2hTY29yZU1heFRpbWU7XHJcbiAgfVxyXG5cclxuICAvLyBFeHBsb2RlXHJcbiAgZm9yICh2YXIgaW5kZXggPSAwOyBpbmRleCA8IGVuZEdhbWVQYXJ0aWNsZUNvdW50OyBpbmRleCsrKSB7XHJcbiAgICB2YXIgYW5nbGUgPSBoZWxwZXJzLnJhbmRJbnQoMCwgMzYwKTtcclxuICAgIHZhciB2ZWxvY2l0eSA9IGhlbHBlcnMucmFuZEludCgxMCwgMjApO1xyXG4gICAgcGFydGljbGVzLnB1c2goe1xyXG4gICAgICB4OiBwbGF5ZXIueCxcclxuICAgICAgeTogcGxheWVyLnksXHJcbiAgICAgIHZ4OiBNYXRoLmNvcyhhbmdsZSAqIE1hdGguUEkgLyAxODApICogdmVsb2NpdHkgLSA2LFxyXG4gICAgICB2eTogTWF0aC5zaW4oYW5nbGUgKiBNYXRoLlBJIC8gMTgwKSAqIHZlbG9jaXR5XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIC8vIFNldCB0byBub3QgcGxheWluZ1xyXG4gIHBsYXllciA9IG51bGw7XHJcbn1cclxuXHJcbkdlc3NvLmdldENhbnZhcygpLmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlZG93bicsIGZ1bmN0aW9uIChlKSB7XHJcbiAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG5cclxuICAvLyBDcmVhdGUgbmV3IHBsYXllciwgaWYgbm90IGN1cnJlbnRseSBwbGF5aW5nXHJcbiAgaWYgKCFwbGF5ZXIpIHtcclxuICAgIG5ld0dhbWUoKTtcclxuICAgIHJldHVybiBmYWxzZTtcclxuICB9XHJcblxyXG4gIC8vIFN3aW0gLyBqdW1wXHJcbiAgaWYgKHBsYXllci55ID4gc2VhTGV2ZWwpIHtcclxuICAgIHBsYXllci52ZWxvY2l0eSA9IC1wbGF5ZXIuanVtcFZlbG9jaXR5O1xyXG4gICAgcGxheWVyLnN5ID0gMS42O1xyXG4gIH1cclxuXHJcbiAgcmV0dXJuIGZhbHNlO1xyXG59KTtcclxuXHJcbmdhbWUudXBkYXRlKGZ1bmN0aW9uICgpIHtcclxuICBmcmFtZUNvdW50ICs9IDE7XHJcblxyXG4gIC8vIFVwZGF0ZSByb2Nrc1xyXG4gIGZvciAodmFyIHIgPSAwOyByIDwgcm9ja3MubGVuZ3RoOyByKyspIHtcclxuICAgIHJvY2tzW3JdLnggLT0gNTtcclxuICAgIC8vIERlbGV0ZSByb2NrIHdoZW4gb3V0IG9mIGJvdW5kc1xyXG4gICAgaWYgKHJvY2tzW3JdLnggKyByb2Nrc1tyXS53aWR0aCA8IDApIHtcclxuICAgICAgcm9ja3Muc3BsaWNlKHIsIDEpO1xyXG4gICAgICByLS07XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvLyBDcmVhdGUgYSBuZXcgcm9ja1xyXG4gIC8vIFRPRE86IERpZmZpY3VsdHlcclxuICAvLyBUT0RPOiBUb3AgLyBib3R0b20gcGF0dGVyblxyXG4gIGlmIChmcmFtZUNvdW50ICUgMTAwID09PSAwKSB7XHJcbiAgICByb2Nrcy5wdXNoKHtcclxuICAgICAgeDogZ2FtZS53aWR0aCxcclxuICAgICAgeTogaGVscGVycy5yYW5kSW50KDUwLCBnYW1lLmhlaWdodCksXHJcbiAgICAgIHdpZHRoOiBoZWxwZXJzLnJhbmRJbnQoMTAwLCAxNTApLFxyXG4gICAgICBoZWlnaHQ6IGhlbHBlcnMucmFuZEludCgyMDAsIDMwMClcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgLy8gVXBkYXRlIHBhcnRpY2xlc1xyXG4gIGZvciAodmFyIHAgPSAwOyBwIDwgcGFydGljbGVzLmxlbmd0aDsgcCsrKSB7XHJcbiAgICBwYXJ0aWNsZXNbcF0ueCAtPSBwYXJ0aWNsZXNbcF0udng7XHJcbiAgICBwYXJ0aWNsZXNbcF0ueSAtPSBwYXJ0aWNsZXNbcF0udnk7XHJcbiAgICAvLyBEZWxldGUgcGFydGljbGUgd2hlbiBvdXQgb2YgYm91bmRzXHJcbiAgICBpZiAocGFydGljbGVzW3BdLnggKyAzIDwgMCB8fCBwYXJ0aWNsZXNbcF0ueSArIDMgPCAwIHx8XHJcbiAgICAgICAgcGFydGljbGVzW3BdLnggLSAzID4gZ2FtZS53aWR0aCB8fCBwYXJ0aWNsZXNbcF0ueSAtIDMgPiBnYW1lLmhlaWdodCkge1xyXG4gICAgICBwYXJ0aWNsZXMuc3BsaWNlKHAsIDEpO1xyXG4gICAgICBwLS07XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvLyBTa2lwIHBsYXllciBsb2dpYyBpZiBub3QgY3VycmVudGx5IHBsYXlpbmdcclxuICBpZiAoIXBsYXllcikge1xyXG4gICAgcmV0dXJuO1xyXG4gIH1cclxuXHJcbiAgLy8gQ2hlY2sgZm9yIGNvbGxpc2lvbnNcclxuICBmb3IgKHIgPSAwOyByIDwgcm9ja3MubGVuZ3RoOyByKyspIHtcclxuICAgIGlmIChoZWxwZXJzLmludGVyc2VjdGVkKHt4OiBwbGF5ZXIueCwgeTogcGxheWVyLnksIHdpZHRoOiAyMCwgaGVpZ2h0OiAxMH0sIHJvY2tzW3JdKSkge1xyXG4gICAgICBlbmRHYW1lKCk7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8vIFVwZGF0ZSBwbGF5ZXJcclxuICBpZiAoZnJhbWVDb3VudCAlIDYgPT09IDApIHtcclxuICAgIHBsYXllci5zY29yZSArPSAxMDA7XHJcbiAgfVxyXG4gIGlmIChwbGF5ZXIuc3kgPiAxKSB7XHJcbiAgICBwbGF5ZXIuc3kgLT0gMC4xO1xyXG4gIH1cclxuICBpZiAocGxheWVyLmJlc3QgJiYgcGxheWVyLnNjb3JlID4gcGxheWVyLmJlc3QpIHtcclxuICAgIHBsYXllci5iZXN0ID0gcGxheWVyLnNjb3JlO1xyXG4gIH1cclxuICBwbGF5ZXIudmVsb2NpdHkgKz0gZ3Jhdml0eTtcclxuICBpZiAocGxheWVyLnZlbG9jaXR5ID4gcGxheWVyLnRlcm1pbmFsVmVsb2NpdHkpIHtcclxuICAgIHBsYXllci52ZWxvY2l0eSA9IHBsYXllci50ZXJtaW5hbFZlbG9jaXR5O1xyXG4gIH1cclxuICBwbGF5ZXIueSArPSBwbGF5ZXIudmVsb2NpdHk7XHJcbiAgaWYgKHBsYXllci55ID49IGdhbWUuaGVpZ2h0KSB7XHJcbiAgICBlbmRHYW1lKCk7XHJcbiAgICByZXR1cm47XHJcbiAgfVxyXG59KTtcclxuXHJcbmdhbWUucmVuZGVyKGZ1bmN0aW9uIChjdHgpIHtcclxuICAvLyBEcmF3IGJhY2tncm91bmRcclxuICBjdHguZmlsbFN0eWxlID0gJyNlY2UnO1xyXG4gIGN0eC5maWxsUmVjdCgwLCAwLCBnYW1lLndpZHRoLCBnYW1lLmhlaWdodCk7XHJcblxyXG4gIC8vIERyYXcgd2F0ZXJcclxuICBjdHguZmlsbFN0eWxlID0gJyMzNWYnO1xyXG4gIGN0eC5maWxsUmVjdCgwLCBzZWFMZXZlbCwgZ2FtZS53aWR0aCwgZ2FtZS5oZWlnaHQgLSBzZWFMZXZlbCk7XHJcblxyXG4gIC8vIERyYXcgcm9ja3NcclxuICBmb3IgKHZhciByID0gMDsgciA8IHJvY2tzLmxlbmd0aDsgcisrKSB7XHJcbiAgICBjdHguZmlsbFN0eWxlID0gJyM1ZDQnO1xyXG4gICAgY3R4LmZpbGxSZWN0KHJvY2tzW3JdLngsIHJvY2tzW3JdLnksIHJvY2tzW3JdLndpZHRoLCByb2Nrc1tyXS5oZWlnaHQpO1xyXG4gIH1cclxuXHJcbiAgLy8gRHJhdyBwYXJ0aWNsZXNcclxuICBmb3IgKHZhciBwID0gMDsgcCA8IHBhcnRpY2xlcy5sZW5ndGg7IHArKykge1xyXG4gICAgaGVscGVycy5maWxsQ2lyY2xlKGN0eCwgcGFydGljbGVzW3BdLngsIHBhcnRpY2xlc1twXS55LCAzLCAnI2ZmNCcpO1xyXG4gIH1cclxuXHJcbiAgLy8gRHJhdyBzY29yZVxyXG4gIGlmIChwbGF5ZXIgfHwgaGlnaFNjb3JlKSB7XHJcbiAgICBjdHguZm9udCA9ICdib2xkIDI0cHggc2Fucy1zZXJpZic7XHJcbiAgICBjdHgudGV4dEFsaWduID0gJ3JpZ2h0JztcclxuICAgIGhlbHBlcnMub3V0bGluZVRleHQoY3R4LCAnU2NvcmU6ICcgKyAocGxheWVyID8gcGxheWVyLnNjb3JlIDogMCksIGdhbWUud2lkdGggLSAzMCwgMzIsICcjMzMzJywgJyNmZmYnKTtcclxuICB9XHJcbiAgaWYgKGhpZ2hTY29yZSkge1xyXG4gICAgY3R4LmZvbnQgPSAnYm9sZCAyNHB4IHNhbnMtc2VyaWYnO1xyXG4gICAgaGVscGVycy5vdXRsaW5lVGV4dChjdHgsICdCZXN0OiAnICsgaGlnaFNjb3JlLCBnYW1lLndpZHRoIC0gMzAsIDY0LCAnIzMzMycsICcjZmZmJyk7XHJcbiAgICBpZiAoaGlnaFNjb3JlVGltZSA+IDApIHtcclxuICAgICAgdmFyIG9mZnNldCA9IChoaWdoU2NvcmVNYXhUaW1lIC0gaGlnaFNjb3JlVGltZSkgLyAyO1xyXG4gICAgICB2YXIgZmFkZSA9IChoaWdoU2NvcmVUaW1lIC8gaGlnaFNjb3JlTWF4VGltZSk7XHJcbiAgICAgIGN0eC5mb250ID0gJ2JvbGQgJyArICgyNCArIG9mZnNldCkgKyAncHggc2Fucy1zZXJpZic7XHJcbiAgICAgIGN0eC5maWxsU3R5bGUgPSAncmdiYSgyNTUsIDI1NSwgMjU1LCAnICsgZmFkZSArICcpJztcclxuICAgICAgY3R4LmZpbGxUZXh0KCdCZXN0OiAnICsgaGlnaFNjb3JlLCBnYW1lLndpZHRoIC0gMzAgKyAob2Zmc2V0ICogMS41KSwgNjQgKyAob2Zmc2V0IC8gMi44KSk7XHJcbiAgICAgIGhpZ2hTY29yZVRpbWUgLT0gMTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8vIERyYXcgcHJlLWdhbWUgdGV4dFxyXG4gIGlmICghcGxheWVyKSB7XHJcbiAgICBpZiAoKGZyYW1lQ291bnQgJSAxMjAgPiA1ICYmIGZyYW1lQ291bnQgJSAxMjAgPCAyMCkgfHwgZnJhbWVDb3VudCAlIDEyMCA+IDI1KSB7XHJcbiAgICAgIGN0eC5mb250ID0gJ2JvbGQgNjRweCBzYW5zLXNlcmlmJztcclxuICAgICAgY3R4LnRleHRBbGlnbiA9ICdjZW50ZXInO1xyXG4gICAgICBpZiAoaGlnaFNjb3JlKSB7XHJcbiAgICAgICAgaGVscGVycy5vdXRsaW5lVGV4dChjdHgsICdHYW1lIG92ZXIhJywgKGdhbWUud2lkdGggLyAyKSwgKGdhbWUuaGVpZ2h0IC8gMikgLSA5MCwgJyMzMzMnLCAnI2ZmZicpO1xyXG4gICAgICAgIGhlbHBlcnMub3V0bGluZVRleHQoY3R4LCAnQ2xpY2sgYWdhaW4hJywgKGdhbWUud2lkdGggLyAyKSwgKGdhbWUuaGVpZ2h0IC8gMikgLSAxMCwgJyMzMzMnLCAnI2ZmZicpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGhlbHBlcnMub3V0bGluZVRleHQoY3R4LCAnQ2xpY2sgdG8gc3RhcnQhJywgKGdhbWUud2lkdGggLyAyKSwgKGdhbWUuaGVpZ2h0IC8gMikgLSA1MCwgJyMzMzMnLCAnI2ZmZicpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICByZXR1cm47XHJcbiAgfVxyXG5cclxuICAvLyBEcmF3IHBsYXllclxyXG4gIGhlbHBlcnMuZmlsbEVsbGlwc2UoY3R4LCBwbGF5ZXIueCwgcGxheWVyLnksIDEwLCAyLCBwbGF5ZXIuc3ksICcjZmY0Jyk7XHJcbiAgaGVscGVycy5maWxsQ2lyY2xlKGN0eCwgcGxheWVyLnggKyA1LCBwbGF5ZXIueSAtIDIsIDMsICcjMzMwJyk7XHJcblxyXG4gIC8vIFRPRE86IERyYXcgYnViYmxlc1xyXG59KTtcclxuXHJcbi8vIFRPRE86IERlbGV0ZSB0aGlzXHJcbmdhbWUucnVuKCk7XHJcblxyXG4vLyBUT0RPOiBHZXQgdGhlIHJ1bnRpbWUgdG8gZXhwb3NlIHRoaXMgb2JqZWN0IHRocm91Z2ggYSBnZXNzby5jdXJyZW50IGdsb2JhbFxyXG5tb2R1bGUuZXhwb3J0cyA9IGdhbWU7XHJcbiIsIm1vZHVsZS5leHBvcnRzID0ge1xyXG4gIHJhbmRJbnQ6IGZ1bmN0aW9uKG1pbiwgbWF4KSB7XHJcbiAgICByZXR1cm4gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogKG1heCAtIG1pbikpICsgbWluO1xyXG4gIH0sXHJcbiAgZmlsbENpcmNsZTogZnVuY3Rpb24gKGN0eCwgeCwgeSwgciwgY29sb3IpIHtcclxuICAgIGN0eC5iZWdpblBhdGgoKTtcclxuICAgIGN0eC5hcmMoeCwgeSwgciwgMCwgMiAqIE1hdGguUEksIGZhbHNlKTtcclxuICAgIGN0eC5maWxsU3R5bGUgPSBjb2xvcjtcclxuICAgIGN0eC5maWxsKCk7XHJcbiAgfSxcclxuICBmaWxsRWxsaXBzZTogZnVuY3Rpb24gKGN0eCwgeCwgeSwgciwgc3gsIHN5LCBjb2xvcikge1xyXG4gICAgY3R4LnNhdmUoKTtcclxuICAgIGN0eC50cmFuc2xhdGUoLXggKiAoc3ggLSAxKSwgLXkgKiAoc3kgLSAxKSk7XHJcbiAgICBjdHguc2NhbGUoc3gsIHN5KTtcclxuICAgIGN0eC5iZWdpblBhdGgoKTtcclxuICAgIGN0eC5hcmMoeCwgeSwgciwgMCwgMiAqIE1hdGguUEksIGZhbHNlKTtcclxuICAgIGN0eC5yZXN0b3JlKCk7XHJcbiAgICBjdHguZmlsbFN0eWxlID0gY29sb3I7XHJcbiAgICBjdHguZmlsbCgpO1xyXG4gIH0sXHJcbiAgb3V0bGluZVRleHQ6IGZ1bmN0aW9uIChjdHgsIHRleHQsIHgsIHksIGNvbG9yLCBvdXRsaW5lKSB7XHJcbiAgICBjdHguZmlsbFN0eWxlID0gY29sb3I7XHJcbiAgICBjdHguZmlsbFRleHQodGV4dCwgeCAtIDEsIHkpO1xyXG4gICAgY3R4LmZpbGxUZXh0KHRleHQsIHggKyAxLCB5KTtcclxuICAgIGN0eC5maWxsVGV4dCh0ZXh0LCB4LCB5IC0gMSk7XHJcbiAgICBjdHguZmlsbFRleHQodGV4dCwgeCwgeSArIDIpO1xyXG4gICAgY3R4LmZpbGxTdHlsZSA9IG91dGxpbmU7XHJcbiAgICBjdHguZmlsbFRleHQodGV4dCwgeCwgeSk7XHJcbiAgfSxcclxuICBpbnRlcnNlY3RlZDogZnVuY3Rpb24ocmVjdDEsIHJlY3QyKSB7XHJcbiAgICByZXR1cm4gKHJlY3QxLnggPCByZWN0Mi54ICsgcmVjdDIud2lkdGggJiZcclxuICAgICAgcmVjdDEueCArIHJlY3QxLndpZHRoID4gcmVjdDIueCAmJlxyXG4gICAgICByZWN0MS55IDwgcmVjdDIueSArIHJlY3QyLmhlaWdodCAmJlxyXG4gICAgICByZWN0MS5oZWlnaHQgKyByZWN0MS55ID4gcmVjdDIueSk7XHJcbiAgfVxyXG59O1xyXG4iLCJ2YXIgbG93TGV2ZWwgPSByZXF1aXJlKCcuL2xvd0xldmVsJyk7XHJcblxyXG5cclxuZnVuY3Rpb24gQ29udHJvbGxlcihnZXNzbywgY2FudmFzKSB7XHJcbiAgdGhpcy5nZXNzbyA9IGdlc3NvO1xyXG4gIHRoaXMuX2NhbnZhcyA9IGNhbnZhcyB8fCBsb3dMZXZlbC5nZXRDYW52YXMoKTtcclxuICB0aGlzLl9jb250ZXh0ID0gdGhpcy5fY2FudmFzLmdldENvbnRleHQoJzJkJyk7XHJcbiAgdGhpcy5fcnVubmluZyA9IG51bGw7XHJcbiAgdGhpcy5fcmVxdWVzdElkID0gbnVsbDtcclxufVxyXG5Db250cm9sbGVyLnByb3RvdHlwZS5zdGVwT25jZSA9IGZ1bmN0aW9uICh0aW1lc3RhbXApIHtcclxuICB0aGlzLmdlc3NvLnN0ZXAodGhpcy5fY29udGV4dCk7XHJcbn07XHJcbkNvbnRyb2xsZXIucHJvdG90eXBlLmNvbnRpbnVlT24gPSBmdW5jdGlvbiAodGltZXN0YW1wKSB7XHJcbiAgdGhpcy5zdGVwT25jZSgpO1xyXG5cclxuICB2YXIgc2VsZiA9IHRoaXM7XHJcbiAgc2VsZi5fcmVxdWVzdElkID0gbG93TGV2ZWwucmVxdWVzdEFuaW1hdGlvbkZyYW1lKGZ1bmN0aW9uICh0aW1lc3RhbXApIHtcclxuICAgIHNlbGYuX3JlcXVlc3RJZCA9IG51bGw7XHJcbiAgICBpZiAoIXNlbGYuX3J1bm5pbmcpIHtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG4gICAgLy8gVE9ETzogRlBTXHJcbiAgICBzZWxmLmNvbnRpbnVlT24oKTtcclxuICB9KTtcclxufTtcclxuQ29udHJvbGxlci5wcm90b3R5cGUuc3RhcnQgPSBmdW5jdGlvbiBzdGFydCgpIHtcclxuICBpZiAodGhpcy5fcnVubmluZykge1xyXG4gICAgcmV0dXJuO1xyXG4gIH1cclxuICB0aGlzLl9ydW5uaW5nID0gdHJ1ZTtcclxuXHJcbiAgdGhpcy5nZXNzby5pbml0aWFsaXplKCk7XHJcbiAgdGhpcy5nZXNzby5zdGFydC5pbnZva2UoKTtcclxuICAvLyBUT0RPOiBVc2UgYSBzY2hlZHVsZXJcclxuICB0aGlzLmNvbnRpbnVlT24oKTtcclxufTtcclxuQ29udHJvbGxlci5wcm90b3R5cGUuc3RvcCA9IGZ1bmN0aW9uIHN0b3AoKSB7XHJcbiAgaWYgKCF0aGlzLl9ydW5uaW5nKSB7XHJcbiAgICByZXR1cm47XHJcbiAgfVxyXG4gIHRoaXMuX3J1bm5pbmcgPSBmYWxzZTtcclxuXHJcbiAgbG93TGV2ZWwuY2FuY2VsQW5pbWF0aW9uRnJhbWUodGhpcy5fcmVxdWVzdElkKTtcclxuICB0aGlzLl9yZXF1ZXN0SWQgPSBudWxsO1xyXG4gIHRoaXMuZ2Vzc28uc3RvcC5pbnZva2UoKTtcclxufTtcclxuXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IENvbnRyb2xsZXI7XHJcbiIsInZhciB1dGlsID0gcmVxdWlyZSgnLi91dGlsJyk7XHJcblxyXG5cclxuLy8gUmV0dXJucyBhIGNhbGxhYmxlIG9iamVjdCB0aGF0LCB3aGVuIGNhbGxlZCB3aXRoIGEgZnVuY3Rpb24sIHN1YnNjcmliZXNcclxuLy8gdG8gdGhlIGRlbGVnYXRlLiBDYWxsIGludm9rZSBvbiB0aGlzIG9iamVjdCB0byBpbnZva2UgZWFjaCBoYW5kbGVyLlxyXG5mdW5jdGlvbiBEZWxlZ2F0ZSgpIHtcclxuICB2YXIgaGFuZGxlcnMgPSBbXTtcclxuXHJcbiAgZnVuY3Rpb24gY2FsbGFibGUoaGFuZGxlcikge1xyXG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggIT09IDEpIHtcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdEZWxlZ2F0ZSB0YWtlcyBleGFjdGx5IDEgYXJndW1lbnQgKCcgKyBhcmd1bWVudHMubGVuZ3RoICsgJyBnaXZlbiknKTtcclxuICAgIH0gZWxzZSBpZiAodHlwZW9mIGhhbmRsZXIgIT09ICdmdW5jdGlvbicpIHtcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdEZWxlZ2F0ZSBhcmd1bWVudCBtdXN0IGJlIGEgRnVuY3Rpb24gb2JqZWN0IChnb3QgJyArIHR5cGVvZiBoYW5kbGVyICsgJyknKTtcclxuICAgIH1cclxuICAgIGhhbmRsZXJzLnB1c2goaGFuZGxlcik7XHJcbiAgICByZXR1cm4gZnVuY3Rpb24gdW5zdWJzY3JpYmUoKSB7XHJcbiAgICAgIHJldHVybiB1dGlsLnJlbW92ZUxhc3QoaGFuZGxlcnMsIGhhbmRsZXIpO1xyXG4gICAgfTtcclxuICB9XHJcbiAgY2FsbGFibGUuaW52b2tlID0gZnVuY3Rpb24gaW52b2tlKCkge1xyXG4gICAgdmFyIGFyZ3MgPSBhcmd1bWVudHM7XHJcbiAgICB1dGlsLmZvckVhY2goaGFuZGxlcnMsIGZ1bmN0aW9uIChoYW5kbGVyKSB7XHJcbiAgICAgIGhhbmRsZXIuYXBwbHkobnVsbCwgYXJncyk7XHJcbiAgICB9KTtcclxuICB9O1xyXG4gIC8vIEV4cG9zZSBoYW5kbGVycyBmb3IgaW5zcGVjdGlvblxyXG4gIGNhbGxhYmxlLmhhbmRsZXJzID0gaGFuZGxlcnM7XHJcblxyXG4gIHJldHVybiBjYWxsYWJsZTtcclxufVxyXG5cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gRGVsZWdhdGU7XHJcbiIsInZhciBDb250cm9sbGVyID0gcmVxdWlyZSgnLi9jb250cm9sbGVyJyk7XHJcbnZhciBEZWxlZ2F0ZSA9IHJlcXVpcmUoJy4vZGVsZWdhdGUnKTtcclxudmFyIGxvd0xldmVsID0gcmVxdWlyZSgnLi9sb3dMZXZlbCcpO1xyXG52YXIgbG9nZ2luZyA9IHJlcXVpcmUoJy4vbG9nZ2luZycpO1xyXG5cclxuXHJcbmZ1bmN0aW9uIEdlc3NvKG9wdGlvbnMpIHtcclxuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcclxuICB0aGlzLmNvbnRleHRUeXBlID0gb3B0aW9ucy5jb250ZXh0VHlwZSB8fCAnMmQnO1xyXG4gIHRoaXMuY29udGV4dEF0dHJpYnV0ZXMgPSBvcHRpb25zLmNvbnRleHRBdHRyaWJ1dGVzO1xyXG4gIHRoaXMuZnBzID0gb3B0aW9ucy5mcHMgfHwgNjA7XHJcbiAgdGhpcy5hdXRvcGxheSA9IG9wdGlvbnMuYXV0b3BsYXkgfHwgdHJ1ZTtcclxuICB0aGlzLnNldHVwID0gbmV3IERlbGVnYXRlKCk7XHJcbiAgdGhpcy5zdGFydCA9IG5ldyBEZWxlZ2F0ZSgpO1xyXG4gIHRoaXMuc3RvcCA9IG5ldyBEZWxlZ2F0ZSgpO1xyXG4gIHRoaXMudXBkYXRlID0gbmV3IERlbGVnYXRlKCk7XHJcbiAgdGhpcy5yZW5kZXIgPSBuZXcgRGVsZWdhdGUoKTtcclxuICB0aGlzLndpZHRoID0gb3B0aW9ucy53aWR0aCB8fCA2NDA7ICAgIC8vIFRPRE86IGFsbG93ICdudWxsJyB0byB1c2Ugd2lkdGggb2YgdGFyZ2V0IGNhbnZhc1xyXG4gIHRoaXMuaGVpZ2h0ID0gb3B0aW9ucy5oZWlnaHQgfHwgNjQwOyAgLy8gVE9ETzogYWxsb3cgJ251bGwnIHRvIHVzZSBoZWlnaHQgb2YgdGFyZ2V0IGNhbnZhc1xyXG4gIHRoaXMuX2luaXRpYWxpemVkID0gZmFsc2U7XHJcbn1cclxuR2Vzc28uQ29udHJvbGxlciA9IENvbnRyb2xsZXI7XHJcbkdlc3NvLkRlbGVnYXRlID0gRGVsZWdhdGU7XHJcbkdlc3NvLnJlcXVlc3RBbmltYXRpb25GcmFtZSA9IGxvd0xldmVsLnJlcXVlc3RBbmltYXRpb25GcmFtZTtcclxuR2Vzc28uY2FuY2VsQW5pbWF0aW9uRnJhbWUgPSBsb3dMZXZlbC5jYW5jZWxBbmltYXRpb25GcmFtZTtcclxuR2Vzc28uZ2V0Q2FudmFzID0gbG93TGV2ZWwuZ2V0Q2FudmFzO1xyXG5HZXNzby5nZXRDb250ZXh0MkQgPSBsb3dMZXZlbC5nZXRDb250ZXh0MkQ7XHJcbkdlc3NvLmdldFdlYkdMQ29udGV4dCA9IGxvd0xldmVsLmdldFdlYkdMQ29udGV4dDtcclxuR2Vzc28uZXJyb3IgPSBsb2dnaW5nLmVycm9yO1xyXG5HZXNzby5pbmZvID0gbG9nZ2luZy5pbmZvO1xyXG5HZXNzby5sb2cgPSBsb2dnaW5nLmxvZztcclxuR2Vzc28ud2FybiA9IGxvZ2dpbmcud2FybjtcclxuR2Vzc28ucHJvdG90eXBlLmluaXRpYWxpemUgPSBmdW5jdGlvbiBpbml0aWFsaXplKCkge1xyXG4gIGlmICh0aGlzLl9pbml0aWFsaXplZCkge1xyXG4gICAgcmV0dXJuO1xyXG4gIH1cclxuICB0aGlzLl9pbml0aWFsaXplZCA9IHRydWU7XHJcbiAgdGhpcy5zZXR1cC5pbnZva2UoKTtcclxufTtcclxuR2Vzc28ucHJvdG90eXBlLnN0ZXAgPSBmdW5jdGlvbiBzdGVwKGNvbnRleHQpIHtcclxuICB0aGlzLm5leHRGcmFtZSgpO1xyXG4gIHRoaXMucmVuZGVyVG8oY29udGV4dCk7XHJcbn07XHJcbkdlc3NvLnByb3RvdHlwZS5uZXh0RnJhbWUgPSBmdW5jdGlvbiBuZXh0RnJhbWUoKSB7XHJcbiAgcmV0dXJuIHRoaXMudXBkYXRlLmludm9rZSgpO1xyXG59O1xyXG5HZXNzby5wcm90b3R5cGUucmVuZGVyVG8gPSBmdW5jdGlvbiByZW5kZXJUbyhjb250ZXh0KSB7XHJcbiAgcmV0dXJuIHRoaXMucmVuZGVyLmludm9rZShjb250ZXh0KTtcclxufTtcclxuR2Vzc28ucHJvdG90eXBlLnJ1biA9IGZ1bmN0aW9uIHJ1bihjYW52YXMpIHtcclxuICB2YXIgY29udHJvbGxlciA9IG5ldyBDb250cm9sbGVyKHRoaXMsIGNhbnZhcyk7XHJcbiAgY29udHJvbGxlci5zdGFydCgpO1xyXG4gIHJldHVybiBjb250cm9sbGVyO1xyXG59O1xyXG5cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gR2Vzc287XHJcbiIsInZhciBHZXNzbyA9IHJlcXVpcmUoJy4vZ2Vzc28nKTtcclxuXHJcbi8vIFRPRE86IERlbGV0ZSB0aGlzXHJcbndpbmRvdy5HZXNzbyA9IEdlc3NvO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBHZXNzbztcclxuIiwiLyogZ2xvYmFscyAkICovXHJcblxyXG5cclxuLy8gVE9ETzogTG9nZ2VyIGNsYXNzXHJcbi8vIFRPRE86IFBsdWdnYWJsZSBsb2cgYmFja2VuZCwgZS5nLiBjb25zb2xlLmxvZ1xyXG5cclxuXHJcbmZ1bmN0aW9uIF9zZW5kKGxldmVsLCBhcmdzKSB7XHJcbiAgLy8gVE9ETzogSW5zcGVjdCBvYmplY3QgaW5zdGVhZCBvZiBzZW5kaW5nIFtvYmplY3QgT2JqZWN0XVxyXG4gIC8vIFRPRE86IFJlbW92ZSB0aGUgaW1wbGllZCBqUXVlcnkgZGVwZW5kZW5jeVxyXG4gICQucG9zdCgnL2xvZycsIHtcclxuICAgIGxldmVsOiBsZXZlbCxcclxuICAgIG1lc3NhZ2U6IGFyZ3Muam9pbignICcpXHJcbiAgfSkuZmFpbChmdW5jdGlvbih4aHIsIHRleHRTdGF0dXMsIGVycm9yVGhyb3duKSB7XHJcbiAgICAvLyBUT0RPOiBOb3RpZnkgdXNlciBvbiB0aGUgcGFnZSBhbmQgc2hvdyBtZXNzYWdlIGlmIGNvbnNvbGUubG9nIGRvZXNuJ3QgZXhpc3RcclxuICAgIGlmIChjb25zb2xlICYmIGNvbnNvbGUubG9nKSB7XHJcbiAgICAgIGNvbnNvbGUubG9nKHhoci5yZXNwb25zZVRleHQpO1xyXG4gICAgfVxyXG4gIH0pO1xyXG59XHJcblxyXG5cclxuZnVuY3Rpb24gZXJyb3IobWVzc2FnZSkge1xyXG4gIHJldHVybiBfc2VuZCgnZXJyb3InLCBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpKTtcclxufVxyXG5cclxuXHJcbmZ1bmN0aW9uIGluZm8obWVzc2FnZSkge1xyXG4gIHJldHVybiBfc2VuZCgnaW5mbycsIEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cykpO1xyXG59XHJcblxyXG5cclxuZnVuY3Rpb24gbG9nKG1lc3NhZ2UpIHtcclxuICByZXR1cm4gX3NlbmQoJ2xvZycsIEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cykpO1xyXG59XHJcblxyXG5cclxuZnVuY3Rpb24gd2FybihtZXNzYWdlKSB7XHJcbiAgcmV0dXJuIF9zZW5kKCd3YXJuJywgQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzKSk7XHJcbn1cclxuXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IHtcclxuICBlcnJvcjogZXJyb3IsXHJcbiAgaW5mbzogaW5mbyxcclxuICBsb2c6IGxvZyxcclxuICB3YXJuOiB3YXJuXHJcbn07XHJcbiIsInZhciByYWYgPSAoZnVuY3Rpb24gKCkge1xyXG4gIC8vIFJhZiBwb2x5ZmlsbCBieSBFcmlrIE3DtmxsZXIuIGZpeGVzIGZyb20gUGF1bCBJcmlzaCBhbmQgVGlubyBaaWpkZWxcclxuICAvLyBBZGFwdGVkIGJ5IEpvZSBFc3Bvc2l0b1xyXG4gIC8vIE9yaWdpbjogaHR0cDovL3BhdWxpcmlzaC5jb20vMjAxMS9yZXF1ZXN0YW5pbWF0aW9uZnJhbWUtZm9yLXNtYXJ0LWFuaW1hdGluZy9cclxuICAvLyAgICAgICAgIGh0dHA6Ly9teS5vcGVyYS5jb20vZW1vbGxlci9ibG9nLzIwMTEvMTIvMjAvcmVxdWVzdGFuaW1hdGlvbmZyYW1lLWZvci1zbWFydC1lci1hbmltYXRpbmdcclxuICAvLyBNSVQgbGljZW5zZVxyXG5cclxuICB2YXIgcmVxdWVzdEFuaW1hdGlvbkZyYW1lID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcgPyB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lIDogbnVsbDtcclxuICB2YXIgY2FuY2VsQW5pbWF0aW9uRnJhbWUgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyA/IHdpbmRvdy5jYW5jZWxBbmltYXRpb25GcmFtZSA6IG51bGw7XHJcblxyXG4gIHZhciB2ZW5kb3JzID0gWydtcycsICdtb3onLCAnd2Via2l0JywgJ28nXTtcclxuICBmb3IodmFyIHggPSAwOyB4IDwgdmVuZG9ycy5sZW5ndGggJiYgIXJlcXVlc3RBbmltYXRpb25GcmFtZTsgKyt4KSB7XHJcbiAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUgPSB3aW5kb3dbdmVuZG9yc1t4XSArICdSZXF1ZXN0QW5pbWF0aW9uRnJhbWUnXTtcclxuICAgIGNhbmNlbEFuaW1hdGlvbkZyYW1lID0gd2luZG93W3ZlbmRvcnNbeF0gKyAnQ2FuY2VsQW5pbWF0aW9uRnJhbWUnXSB8fCB3aW5kb3dbdmVuZG9yc1t4XSArICdDYW5jZWxSZXF1ZXN0QW5pbWF0aW9uRnJhbWUnXTtcclxuICB9XHJcblxyXG4gIGlmICghcmVxdWVzdEFuaW1hdGlvbkZyYW1lKSB7XHJcbiAgICB2YXIgbGFzdFRpbWUgPSAwO1xyXG4gICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lID0gZnVuY3Rpb24oY2FsbGJhY2spIHtcclxuICAgICAgdmFyIGN1cnJUaW1lID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XHJcbiAgICAgIHZhciB0aW1lVG9DYWxsID0gTWF0aC5tYXgoMCwgMTYgLSAoY3VyclRpbWUgLSBsYXN0VGltZSkpO1xyXG4gICAgICB2YXIgaWQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkgeyBjYWxsYmFjayhjdXJyVGltZSArIHRpbWVUb0NhbGwpOyB9LCB0aW1lVG9DYWxsKTtcclxuICAgICAgbGFzdFRpbWUgPSBjdXJyVGltZSArIHRpbWVUb0NhbGw7XHJcbiAgICAgIHJldHVybiBpZDtcclxuICAgIH07XHJcblxyXG4gICAgY2FuY2VsQW5pbWF0aW9uRnJhbWUgPSBmdW5jdGlvbihpZCkge1xyXG4gICAgICBjbGVhclRpbWVvdXQoaWQpO1xyXG4gICAgfTtcclxuICB9XHJcblxyXG4gIHJldHVybiB7XHJcbiAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWU6IGZ1bmN0aW9uKGNhbGxiYWNrKSB7IHJldHVybiByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoY2FsbGJhY2spOyB9LFxyXG4gICAgY2FuY2VsQW5pbWF0aW9uRnJhbWU6IGZ1bmN0aW9uKHJlcXVlc3RJRCkgeyByZXR1cm4gY2FuY2VsQW5pbWF0aW9uRnJhbWUocmVxdWVzdElEKTsgfVxyXG4gIH07XHJcbn0pKCk7XHJcblxyXG5cclxuZnVuY3Rpb24gZ2V0Q2FudmFzKCkge1xyXG4gIC8vIFRPRE86IEV4dHJhY3QgdGhpcyBvdXQgdG8gYnJlYWsgZGVwZW5kZW5jeVxyXG4gIGlmICh0eXBlb2Ygd2luZG93ID09PSAndW5kZWZpbmVkJykge1xyXG4gICAgdGhyb3cgbmV3IEVycm9yKCdDYW5ub3QgZ2V0IGNhbnZhcyBvdXRzaWRlIG9mIGJyb3dzZXIgY29udGV4dC4nKTtcclxuICB9XHJcblxyXG4gIC8vIFRPRE86IFJlYWQgdGhlIHByb2plY3Qgc2V0dGluZ3MgdXNlIHRoZSByaWdodCBJRFxyXG4gIHZhciBjYW52YXMgPSB3aW5kb3cuZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2dlc3NvLXRhcmdldCcpO1xyXG5cclxuICBpZiAoIWNhbnZhcykge1xyXG4gICAgdmFyIGNhbnZhc2VzID0gd2luZG93LmRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdjYW52YXMnKTtcclxuICAgIGlmIChjYW52YXNlcy5sZW5ndGggPT09IDEpIHtcclxuICAgICAgY2FudmFzID0gY2FudmFzZXNbMF07XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBpZiAoIWNhbnZhcykge1xyXG4gICAgdGhyb3cgbmV3IEVycm9yKCdDYW52YXMgbm90IGZvdW5kLicpO1xyXG4gIH1cclxuXHJcbiAgcmV0dXJuIGNhbnZhcztcclxufVxyXG5cclxuXHJcbmZ1bmN0aW9uIGdldENvbnRleHQyRCgpIHtcclxuICByZXR1cm4gZ2V0Q2FudmFzKCkuZ2V0Q29udGV4dCgnMmQnKTtcclxufVxyXG5cclxuXHJcbmZ1bmN0aW9uIGdldFdlYkdMQ29udGV4dCgpIHtcclxuICByZXR1cm4gZ2V0Q2FudmFzKCkuZ2V0Q29udGV4dCgnd2ViZ2wnKTtcclxufVxyXG5cclxuXHJcbm1vZHVsZS5leHBvcnRzID0ge1xyXG4gIHJlcXVlc3RBbmltYXRpb25GcmFtZTogcmFmLnJlcXVlc3RBbmltYXRpb25GcmFtZSxcclxuICBjYW5jZWxBbmltYXRpb25GcmFtZTogcmFmLmNhbmNlbEFuaW1hdGlvbkZyYW1lLFxyXG4gIGdldENhbnZhczogZ2V0Q2FudmFzLFxyXG4gIGdldENvbnRleHQyRDogZ2V0Q29udGV4dDJELFxyXG4gIGdldFdlYkdMQ29udGV4dDogZ2V0V2ViR0xDb250ZXh0XHJcbn07XHJcbiIsImZ1bmN0aW9uIGZvckVhY2goYXJyYXksIHN0ZXBGdW5jdGlvbikge1xyXG4gIGZvciAodmFyIGluZGV4ID0gMDsgaW5kZXggPCBhcnJheS5sZW5ndGg7IGluZGV4KyspIHtcclxuICAgIHN0ZXBGdW5jdGlvbihhcnJheVtpbmRleF0pO1xyXG4gIH1cclxufVxyXG5cclxuXHJcbmZ1bmN0aW9uIHBvcChhcnJheSwgaW5kZXgpIHtcclxuICByZXR1cm4gdHlwZW9mIGluZGV4ID09PSAndW5kZWZpbmVkJyA/IGFycmF5LnBvcCgpIDogYXJyYXkuc3BsaWNlKGluZGV4LCAxKVswXTtcclxufVxyXG5cclxuXHJcbmZ1bmN0aW9uIGluZGV4T2YoYXJyYXksIGl0ZW0sIHN0YXJ0SW5kZXgpIHtcclxuICBmb3IgKHZhciBpbmRleCA9IHN0YXJ0SW5kZXggfHwgMDsgaW5kZXggPCBhcnJheS5sZW5ndGg7IGluZGV4KyspIHtcclxuICAgIGlmIChhcnJheVtpbmRleF0gPT09IGl0ZW0pIHtcclxuICAgICAgcmV0dXJuIGluZGV4O1xyXG4gICAgfVxyXG4gIH1cclxuICByZXR1cm4gLTE7XHJcbn1cclxuXHJcblxyXG5mdW5jdGlvbiBsYXN0SW5kZXhPZihhcnJheSwgaXRlbSwgc3RhcnRJbmRleCkge1xyXG4gIGZvciAodmFyIGluZGV4ID0gc3RhcnRJbmRleCB8fCBhcnJheS5sZW5ndGggLSAxOyBpbmRleCA+PSAwOyBpbmRleC0tKSB7XHJcbiAgICBpZiAoYXJyYXlbaW5kZXhdID09PSBpdGVtKSB7XHJcbiAgICAgIHJldHVybiBpbmRleDtcclxuICAgIH1cclxuICB9XHJcbiAgcmV0dXJuIC0xO1xyXG59XHJcblxyXG5cclxuZnVuY3Rpb24gcmVtb3ZlKGFycmF5LCBpdGVtKSB7XHJcbiAgdmFyIGluZGV4ID0gaW5kZXhPZihhcnJheSwgaXRlbSk7XHJcbiAgcmV0dXJuIGluZGV4ICE9PSAtMSA/IHBvcChhcnJheSwgaW5kZXgpIDogbnVsbDtcclxufVxyXG5cclxuXHJcbmZ1bmN0aW9uIHJlbW92ZUxhc3QoYXJyYXksIGl0ZW0pIHtcclxuICB2YXIgaW5kZXggPSBsYXN0SW5kZXhPZihhcnJheSwgaXRlbSk7XHJcbiAgcmV0dXJuIGluZGV4ICE9PSAtMSA/IHBvcChhcnJheSwgaW5kZXgpIDogbnVsbDtcclxufVxyXG5cclxuXHJcbm1vZHVsZS5leHBvcnRzID0ge1xyXG4gIGZvckVhY2g6IGZvckVhY2gsXHJcbiAgcG9wOiBwb3AsXHJcbiAgaW5kZXhPZjogaW5kZXhPZixcclxuICBsYXN0SW5kZXhPZjogbGFzdEluZGV4T2YsXHJcbiAgcmVtb3ZlOiByZW1vdmUsXHJcbiAgcmVtb3ZlTGFzdDogcmVtb3ZlTGFzdFxyXG59O1xyXG4iLCIvLyBHZXNzbyBFbnRyeSBQb2ludFxyXG4vLyBEZXRlY3Qgd2hldGhlciB0aGlzIGlzIGNhbGxlZCBmcm9tIHRoZSBicm93c2VyLCBvciBmcm9tIHRoZSBDTEkuXHJcblxyXG5cclxuaWYgKHR5cGVvZiB3aW5kb3cgPT09ICd1bmRlZmluZWQnKSB7XHJcbiAgLy8gVXNlIG1vZHVsZS5yZXF1aXJlIHNvIHRoZSBjbGllbnQtc2lkZSBidWlsZCBza2lwcyBvdmVyIHNlcnZlciBjb2RlLFxyXG4gIC8vIHdoaWNoIHdpbGwgd29yayBwcm9wZXJseSBhdCBydW50aW1lIHNpbmNlIG5vIHdpbmRvdyBnbG9iYWwgaXMgZGVmaW5lZFxyXG4gIG1vZHVsZS5leHBvcnRzID0gbW9kdWxlLnJlcXVpcmUoJy4vZ2Vzc28nKTtcclxufSBlbHNlIHtcclxuICAvLyBJbmNsdWRlIGluIGNsaWVudC1zaWRlIGJ1aWxkLFxyXG4gIC8vIHdoaWNoIHdpbGwgaGF2ZSBhIHdpbmRvdyBnbG9iYWwgZGVmaW5lZCBhdCBydW50aW1lXHJcbiAgbW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKCcuL2NsaWVudCcpO1xyXG59XHJcbiJdfQ==
