module.exports = {
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
  }
};
