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
