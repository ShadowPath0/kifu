const SEVERITY_RING = { mineure: 2, moyenne: 3.5, critique: 5 };
const GOBAN_COL_LETTERS = "ABCDEFGHJKLMNOPQRSTUVWXYZ";

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
    this.margin = 34;
    this.cell = (this.canvasSize - 2 * this.margin) / (size - 1);
    canvas.width = this.canvasSize;
    canvas.height = this.canvasSize;
  }

  drawCoordinates() {
    const ctx = this.ctx;
    ctx.fillStyle = "#5a4322";
    ctx.font = `${Math.max(9, Math.round(this.cell * 0.26))}px sans-serif`;
    ctx.textBaseline = "middle";
    for (let c = 0; c < this.size; c++) {
      const label = GOBAN_COL_LETTERS[c] || "?";
      const x = this.margin + c * this.cell;
      ctx.textAlign = "center";
      ctx.fillText(label, x, this.margin * 0.45);
      ctx.fillText(label, x, this.canvasSize - this.margin * 0.45);
    }
    for (let r = 0; r < this.size; r++) {
      const label = String(r + 1);
      const y = this.margin + (this.size - 1 - r) * this.cell;
      ctx.textAlign = "right";
      ctx.fillText(label, this.margin * 0.64, y);
      ctx.textAlign = "left";
      ctx.fillText(label, this.canvasSize - this.margin * 0.64, y);
    }
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

  draw(stones, lastMove, markers, suggestions, symbols) {
    const ctx = this.ctx;
    const s = this.canvasSize;
    ctx.clearRect(0, 0, s, s);
    this.drawCoordinates();

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

    // bandeau "PASSE" bien visible : un clic sur ce coup ne change rien sur le
    // plateau, sans ce bandeau on pourrait croire qu'un coup a été sauté.
    if (lastMove && lastMove.pass) {
      const cx = this.canvasSize / 2;
      const cy = this.margin + (this.canvasSize - 2 * this.margin) * 0.5;
      const label = `${lastMove.color === "b" ? "Noir" : "Blanc"} passe`;
      ctx.font = "bold 20px sans-serif";
      const textWidth = ctx.measureText(label).width;
      const paddingX = 18;
      const boxW = textWidth + paddingX * 2;
      const boxH = 40;
      ctx.fillStyle = "rgba(20,18,12,0.82)";
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(cx - boxW / 2, cy - boxH / 2, boxW, boxH, 8) : ctx.rect(cx - boxW / 2, cy - boxH / 2, boxW, boxH);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, cx, cy + 1);
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

    // symboles libres façon OGS (triangle, carré, cercle, croix, lettre, chiffre)
    const stoneAt = (row, col) => (stones || []).find((s) => s.row === row && s.col === col);
    for (const sym of symbols || []) {
      const [x, y] = this.posToPixel(sym.row, sym.col);
      const occupying = stoneAt(sym.row, sym.col);
      const color = occupying ? (occupying.color === "b" ? "#ffffff" : "#000000") : "#1d4ed8";
      drawSymbol(ctx, sym.symbol, sym.label, x, y, radius, color);
    }
  }
}

function drawSymbol(ctx, symbol, label, cx, cy, radius, color) {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2;
  const r = radius * 0.62;
  if (symbol === "triangle") {
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const angle = -Math.PI / 2 + (i * 2 * Math.PI) / 3;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
  } else if (symbol === "square") {
    ctx.strokeRect(cx - r * 0.8, cy - r * 0.8, r * 1.6, r * 1.6);
  } else if (symbol === "circle") {
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.75, 0, Math.PI * 2);
    ctx.stroke();
  } else if (symbol === "cross") {
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.7, cy - r * 0.7);
    ctx.lineTo(cx + r * 0.7, cy + r * 0.7);
    ctx.moveTo(cx + r * 0.7, cy - r * 0.7);
    ctx.lineTo(cx - r * 0.7, cy + r * 0.7);
    ctx.stroke();
  } else if (symbol === "letter" || symbol === "number") {
    ctx.font = `bold ${Math.round(radius * 1.05)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label || "", cx, cy + 1);
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
