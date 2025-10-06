// Vector Practice App (front-end only)
// No frameworks. Two plots: standard position and tip-to-tail.

(function () {
  'use strict';

  // Elements
  const axEl = document.getElementById('ax');
  const ayEl = document.getElementById('ay');
  const bxEl = document.getElementById('bx');
  const byEl = document.getElementById('by');
  const minRangeEl = document.getElementById('minRange');
  const maxRangeEl = document.getElementById('maxRange');
  const randomizeBtn = document.getElementById('randomize');
  const revealBtn = document.getElementById('reveal');
  const hideBtn = document.getElementById('hide');
  const answerSummary = document.getElementById('answerSummary');
  const sumText = document.getElementById('sumText');
  const plotsSection = document.getElementById('plots');
  const standardCanvas = document.getElementById('standardCanvas');
  const tipCanvas = document.getElementById('tipCanvas');

  // Colors
  const colors = {
    grid: '#1f2937',
    axis: '#6b7280',
    a: '#60a5fa',
    b: '#f472b6',
    sum: '#34d399',
  };

  // Helpers
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const toInt = (el) => parseInt(el.value, 10) || 0;
  const setSumText = (ax, ay, bx, by) => {
    const sx = ax + bx;
    const sy = ay + by;
    sumText.textContent = `(${sx}, ${sy})`;
  };

  function randInt(min, max) {
    const lo = Math.ceil(Math.min(min, max));
    const hi = Math.floor(Math.max(min, max));
    return Math.floor(Math.random() * (hi - lo + 1)) + lo;
  }

  function generateVectors() {
    const min = parseInt(minRangeEl.value, 10);
    const max = parseInt(maxRangeEl.value, 10);
    const safeMin = Math.min(min, max);
    const safeMax = Math.max(min, max);
    // Avoid all-zero vectors; re-roll if both a and b are zero or if sum is zero to keep it interesting
    let ax, ay, bx, by;
    do {
      ax = randInt(safeMin, safeMax);
      ay = randInt(safeMin, safeMax);
      bx = randInt(safeMin, safeMax);
      by = randInt(safeMin, safeMax);
    } while ((ax === 0 && ay === 0) || (bx === 0 && by === 0) || (ax + bx === 0 && ay + by === 0));

    axEl.value = ax;
    ayEl.value = ay;
    bxEl.value = bx;
    byEl.value = by;

    return { ax, ay, bx, by };
  }

  // Drawing utilities
  function withHiDPI(canvas, ctx) {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    // If style sets CSS size separately, respect attribute sizes as base
    const cssW = rect.width || canvas.width;
    const cssH = rect.height || canvas.height;
    if (canvas.width !== Math.floor(cssW * dpr) || canvas.height !== Math.floor(cssH * dpr)) {
      canvas.width = Math.floor(cssW * dpr);
      canvas.height = Math.floor(cssH * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { w: cssW, h: cssH, dpr };
  }

  function drawGrid(ctx, w, h, unitPx) {
    ctx.save();
    ctx.clearRect(0, 0, w, h);
    ctx.lineWidth = 1;
    ctx.strokeStyle = colors.grid;
    // Grid spacing at unitPx with lighter lines
    ctx.beginPath();
    for (let x = Math.round(w / 2 % unitPx); x <= w; x += unitPx) {
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, h);
    }
    for (let y = Math.round(h / 2 % unitPx); y <= h; y += unitPx) {
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(w, y + 0.5);
    }
    ctx.stroke();
    // Axes
    ctx.strokeStyle = colors.axis;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, h / 2 + 0.5);
    ctx.lineTo(w, h / 2 + 0.5);
    ctx.moveTo(w / 2 + 0.5, 0);
    ctx.lineTo(w / 2 + 0.5, h);
    ctx.stroke();
    ctx.restore();
  }

  function drawArrow(ctx, fromX, fromY, toX, toY, color) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 2.5;
    // Shaft
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();
    // Arrowhead
    const angle = Math.atan2(toY - fromY, toX - fromX);
    const len = Math.hypot(toX - fromX, toY - fromY);
    const headLen = Math.min(14, Math.max(8, len * 0.12));
    const headAngle = Math.PI / 7;
    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - headLen * Math.cos(angle - headAngle), toY - headLen * Math.sin(angle - headAngle));
    ctx.lineTo(toX - headLen * Math.cos(angle + headAngle), toY - headLen * Math.sin(angle + headAngle));
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function autoscaleUnitPx({ ax, ay, bx, by }, w, h) {
    const sx = ax + bx;
    const sy = ay + by;
    const maxAbs = Math.max(
      1,
      Math.abs(ax), Math.abs(ay),
      Math.abs(bx), Math.abs(by),
      Math.abs(sx), Math.abs(sy)
    );
    // Want vectors to fit comfortably: leave 20% margin
    const margin = 0.15;
    const halfW = w * (1 - margin) / 2;
    const halfH = h * (1 - margin) / 2;
    const unitX = halfW / maxAbs;
    const unitY = halfH / maxAbs;
    // Target pleasant grid sizes: 20-40 px per unit.
    let unitPx = Math.floor(Math.max(20, Math.min(40, Math.min(unitX, unitY))));
    if (!isFinite(unitPx) || unitPx <= 0) unitPx = 30;
    return unitPx;
  }

  function worldToCanvas(cx, cy, unitPx, w, h) {
    // World origin at center, x right, y up
    const x = w / 2 + cx * unitPx;
    const y = h / 2 - cy * unitPx;
    return { x, y };
  }

  function renderStandard(canvas, vectors) {
    const ctx = canvas.getContext('2d');
    const { w, h } = withHiDPI(canvas, ctx);
    const unitPx = autoscaleUnitPx(vectors, w, h);
    drawGrid(ctx, w, h, unitPx);

    // Draw a, b, sum from origin
    const { ax, ay, bx, by } = vectors;
    const { x: ox, y: oy } = worldToCanvas(0, 0, unitPx, w, h);
    const aEnd = worldToCanvas(ax, ay, unitPx, w, h);
    const bEnd = worldToCanvas(bx, by, unitPx, w, h);
    const sEnd = worldToCanvas(ax + bx, ay + by, unitPx, w, h);

    drawArrow(ctx, ox, oy, aEnd.x, aEnd.y, colors.a);
    drawArrow(ctx, ox, oy, bEnd.x, bEnd.y, colors.b);
    drawArrow(ctx, ox, oy, sEnd.x, sEnd.y, colors.sum);

    // Legends
    labelVector(ctx, aEnd.x, aEnd.y, 'a', colors.a);
    labelVector(ctx, bEnd.x, bEnd.y, 'b', colors.b);
    labelVector(ctx, sEnd.x, sEnd.y, 'a+b', colors.sum);
  }

  function renderTipToTail(canvas, vectors) {
    const ctx = canvas.getContext('2d');
    const { w, h } = withHiDPI(canvas, ctx);
    const unitPx = autoscaleUnitPx(vectors, w, h);
    drawGrid(ctx, w, h, unitPx);

    const { ax, ay, bx, by } = vectors;
    const { x: ox, y: oy } = worldToCanvas(0, 0, unitPx, w, h);
    const aEnd = worldToCanvas(ax, ay, unitPx, w, h);
    // Tip of a is tail of b
    const bTipCanvas = worldToCanvas(ax + bx, ay + by, unitPx, w, h);
    drawArrow(ctx, ox, oy, aEnd.x, aEnd.y, colors.a);
    drawArrow(ctx, aEnd.x, aEnd.y, bTipCanvas.x, bTipCanvas.y, colors.b);
    drawArrow(ctx, ox, oy, bTipCanvas.x, bTipCanvas.y, colors.sum);

    // Legends
    labelVector(ctx, aEnd.x, aEnd.y, 'a', colors.a);
    labelVector(ctx, bTipCanvas.x, bTipCanvas.y, 'a+b', colors.sum);
  }

  function labelVector(ctx, endX, endY, text, color) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.font = '600 13px system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell';
    const pad = 6;
    const bg = 'rgba(0,0,0,0.35)';
    // Slight offset away from endpoint
    const tx = endX + 8;
    const ty = endY - 6;
    const metrics = ctx.measureText(text);
    const w = metrics.width + pad * 2;
    const h = 18;
    ctx.fillStyle = bg;
    ctx.beginPath();
    roundRect(ctx, tx - pad, ty - h + 4, w, h, 6);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.fillText(text, tx, ty);
    ctx.restore();
  }

  function roundRect(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.moveTo(x + rr, y);
    ctx.lineTo(x + w - rr, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
    ctx.lineTo(x + w, y + h - rr);
    ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
    ctx.lineTo(x + rr, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
    ctx.lineTo(x, y + rr);
    ctx.quadraticCurveTo(x, y, x + rr, y);
  }

  function currentVectors() {
    return { ax: toInt(axEl), ay: toInt(ayEl), bx: toInt(bxEl), by: toInt(byEl) };
  }

  function renderAll() {
    const v = currentVectors();
    setSumText(v.ax, v.ay, v.bx, v.by);
    if (!plotsSection.hasAttribute('hidden')) {
      renderStandard(standardCanvas, v);
      renderTipToTail(tipCanvas, v);
    }
  }

  // Events
  function hookEvents() {
    [axEl, ayEl, bxEl, byEl].forEach((el) => {
      el.addEventListener('input', () => {
        // sanitize to integer
        el.value = String(parseInt(el.value || '0', 10) || 0);
        renderAll();
      });
    });

    [minRangeEl, maxRangeEl].forEach((el) => {
      el.addEventListener('input', () => {
        const min = parseInt(minRangeEl.value, 10);
        const max = parseInt(maxRangeEl.value, 10);
        if (!Number.isFinite(min) || !Number.isFinite(max)) return;
        // keep min <= max by auto-correcting
        if (min > max) {
          if (el === minRangeEl) maxRangeEl.value = String(min);
          else minRangeEl.value = String(max);
        }
      });
    });

    randomizeBtn.addEventListener('click', () => {
      generateVectors();
      renderAll();
      if (!plotsSection.hasAttribute('hidden')) {
        // keep answer visible; re-rendered already
      }
    });

    revealBtn.addEventListener('click', () => {
      answerSummary.removeAttribute('hidden');
      plotsSection.removeAttribute('hidden');
      revealBtn.setAttribute('disabled', '');
      hideBtn.removeAttribute('disabled');
      renderAll();
    });

    hideBtn.addEventListener('click', () => {
      answerSummary.setAttribute('hidden', '');
      plotsSection.setAttribute('hidden', '');
      hideBtn.setAttribute('disabled', '');
      revealBtn.removeAttribute('disabled');
    });

    // Redraw on resize for crisp HiDPI
    window.addEventListener('resize', () => {
      if (!plotsSection.hasAttribute('hidden')) renderAll();
    });
  }

  // Init
  function init() {
    // Start with fields' current values
    setSumText(toInt(axEl), toInt(ayEl), toInt(bxEl), toInt(byEl));
    hookEvents();
  }

  init();
})();
