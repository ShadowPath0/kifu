const SEVERITY_RING = { mineure: 2, moyenne: 3.5, critique: 5 };

const HOSHI = {
  19: [3, 9, 15],
  13: [3, 6, 9],
  9: [2, 4, 6],
};

class Goban {
  constructor(canvas, size) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.size = size;
    this.canvasSize = 600;
    this.margin = 30;
    this.cell = (this.canvasSize - 2 * this.margin) / (size - 1);
    canvas.width = this.canvasSize;
    canvas.height = this.canvasSize;
  }

  posToPixel(row, col) {
    const x = this.margin + col * this.cell;
    const y = this.margin + (this.size - 1 - row) * this.cell;
    return [x, y];
  }

  pixelToPos(offsetX, offsetY) {
    const scaleX = this.canvasSize / this.canvas.clientWidth;
    const scaleY = this.canvasSize / this.canvas.clientHeight;
    const x = offsetX * scaleX;
    const y = offsetY * scaleY;
    const col = Math.round((x - this.margin) / this.cell);
    const row = this.size - 1 - Math.round((y - this.margin) / this.cell);
    if (col < 0 || col >= this.size || row < 0 || row >= this.size) return null;
    return { row, col };
  }

  draw(stones, lastMove, markers, suggestions) {
    const ctx = this.ctx;
    const s = this.canvasSize;
    ctx.clearRect(0, 0, s, s);

    // grid
    ctx.strokeStyle = "#3a2a0d";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < this.size; i++) {
      const [, y] = this.posToPixel(i, 0);
      ctx.moveTo(this.margin, y);
      ctx.lineTo(this.canvasSize - this.margin, y);
    }
    for (let i = 0; i < this.size; i++) {
      const [x] = this.posToPixel(0, i);
      ctx.moveTo(x, this.margin);
      ctx.lineTo(x, this.canvasSize - this.margin);
    }
    ctx.stroke();

    // hoshi
    const pts = HOSHI[this.size] || [];
    ctx.fillStyle = "#3a2a0d";
    for (const r of pts) {
      for (const c of pts) {
        const [x, y] = this.posToPixel(r, c);
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // stones
    const radius = this.cell / 2 - 1;
    for (const st of stones) {
      const [x, y] = this.posToPixel(st.row, st.col);
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      if (st.color === "b") {
        const grad = ctx.createRadialGradient(x - radius * 0.3, y - radius * 0.3, 1, x, y, radius);
        grad.addColorStop(0, "#5a5a5a");
        grad.addColorStop(1, "#0a0a0a");
        ctx.fillStyle = grad;
      } else {
        const grad = ctx.createRadialGradient(x - radius * 0.3, y - radius * 0.3, 1, x, y, radius);
        grad.addColorStop(0, "#ffffff");
        grad.addColorStop(1, "#d8d8d8");
        ctx.fillStyle = grad;
      }
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.35)";
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }

    // last move marker
    if (lastMove && !lastMove.pass) {
      const [x, y] = this.posToPixel(lastMove.row, lastMove.col);
      ctx.beginPath();
      ctx.arc(x, y, radius * 0.4, 0, Math.PI * 2);
      ctx.fillStyle = lastMove.color === "b" ? "#ffffff" : "#000000";
      ctx.fill();
    }

    // error markers
    for (const m of markers || []) {
      const [x, y] = this.posToPixel(m.row, m.col);
      ctx.beginPath();
      ctx.arc(x, y, radius + 4, 0, Math.PI * 2);
      ctx.strokeStyle = m.color;
      ctx.lineWidth = SEVERITY_RING[m.severity] || 2.5;
      ctx.stroke();
    }

    // suggested-move markers (étoiles)
    for (const pt of suggestions || []) {
      const [x, y] = this.posToPixel(pt.row, pt.col);
      drawStar(ctx, x, y, radius * 0.55, pt.dimmed ? "#22c55e88" : "#22c55e");
      if (pt.label) {
        ctx.fillStyle = "#065f46";
        ctx.font = "bold 11px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(pt.label, x, y - radius - 6);
      }
    }
  }
}

function drawStar(ctx, cx, cy, r, color) {
  const spikes = 5;
  const inner = r * 0.45;
  ctx.beginPath();
  for (let i = 0; i < spikes * 2; i++) {
    const radius = i % 2 === 0 ? r : inner;
    const angle = (Math.PI / spikes) * i - Math.PI / 2;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = "#065f46";
  ctx.lineWidth = 1;
  ctx.stroke();
}
