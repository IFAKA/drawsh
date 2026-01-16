class Drawsh {
  constructor() {
    this.isActive = false;
    this.isDrawing = false;
    this.currentColor = '#ffffff';
    this.currentAlpha = 1;
    this.currentSize = 3;
    this.currentTool = 'pen';
    this.points = [];
    this.strokes = [];
    this.redoStack = [];
    this.canvas = null;
    this.ctx = null;
    this.toolbar = null;
    this.startPoint = null;
    this.textInput = null;

    this.colors = [
      { name: 'auto', value: 'auto', auto: true },
      { name: 'black', value: '#000000' },
      { name: 'white', value: '#ffffff' },
      { name: 'red', value: '#ef4444' },
      { name: 'blue', value: '#3b82f6' },
      { name: 'green', value: '#22c55e' },
      { name: 'yellow', value: '#fbbf24', alpha: 0.4 },
      { name: 'orange', value: '#f97316' },
      { name: 'purple', value: '#a855f7' }
    ];
    this.isAutoContrast = true;

    this.sizes = [
      { name: 'thin', value: 2 },
      { name: 'medium', value: 4 },
      { name: 'thick', value: 8 }
    ];

    this.tools = ['pen', 'line', 'arrow', 'rect', 'circle', 'text', 'eraser'];
    this.shiftHeld = false;

    // Smooth stroke settings
    this.lastTime = 0;
    this.lastVelocity = 0;
    this.smoothingFactor = 0.3; // Lower = smoother, higher = more responsive

    this.init();
  }

  init() {
    this.createCanvas();
    this.createToolbar();
    this.bindEvents();
    this.loadState();
  }

  createCanvas() {
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'drawsh-canvas';
    document.body.appendChild(this.canvas);

    this.ctx = this.canvas.getContext('2d');
    this.resizeCanvas();

    window.addEventListener('resize', () => this.resizeCanvas());
  }

  resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;
    this.canvas.style.width = window.innerWidth + 'px';
    this.canvas.style.height = window.innerHeight + 'px';
    this.ctx.scale(dpr, dpr);
    this.redraw();
  }

  createToolbar() {
    this.toolbar = document.createElement('div');
    this.toolbar.id = 'drawsh-toolbar';

    // Colors
    this.colors.forEach((color, i) => {
      const btn = document.createElement('button');
      btn.className = 'drawsh-color' + (i === 0 ? ' active' : '');
      if (color.auto) {
        // Auto-contrast button: half black, half white
        btn.style.background = 'linear-gradient(135deg, #ffffff 50%, #000000 50%)';
        btn.style.border = '2px solid #666';
        btn.title = 'Auto contrast (press 1)';
      } else {
        btn.style.background = color.value;
        btn.title = color.name + ' (press ' + (i + 1) + ')';
        if (color.alpha) {
          btn.style.opacity = '0.7';
        }
        if (color.name === 'white') {
          btn.style.border = '2px solid #666';
        }
      }
      btn.dataset.color = color.value;
      btn.dataset.alpha = color.alpha || '1';
      btn.dataset.auto = color.auto || false;
      btn.addEventListener('click', () => this.selectColor(btn, color));
      this.toolbar.appendChild(btn);
    });

    this.toolbar.appendChild(this.createDivider());

    // Sizes
    this.sizes.forEach((size, i) => {
      const btn = document.createElement('button');
      btn.className = 'drawsh-size' + (i === 1 ? ' active' : '');
      const dot = document.createElement('span');
      dot.className = 'drawsh-size-dot';
      dot.style.width = size.value + 'px';
      dot.style.height = size.value + 'px';
      btn.appendChild(dot);
      btn.dataset.size = size.value;
      btn.addEventListener('click', () => this.selectSize(btn, size.value));
      this.toolbar.appendChild(btn);
    });

    this.toolbar.appendChild(this.createDivider());

    // Tool buttons
    const toolButtons = [
      { id: 'pen', icon: this.getPenIcon(), title: 'Pen (P)', default: true },
      { id: 'line', icon: this.getLineIcon(), title: 'Line (L)' },
      { id: 'arrow', icon: this.getArrowIcon(), title: 'Arrow (A)' },
      { id: 'rect', icon: this.getRectIcon(), title: 'Rectangle (R)' },
      { id: 'circle', icon: this.getCircleIcon(), title: 'Circle (C)' },
      { id: 'text', icon: this.getTextIcon(), title: 'Text (T)' },
      { id: 'eraser', icon: this.getEraserIcon(), title: 'Eraser (E)' }
    ];

    toolButtons.forEach(tool => {
      const btn = document.createElement('button');
      btn.className = 'drawsh-btn' + (tool.default ? ' active' : '');
      btn.id = 'drawsh-' + tool.id;
      btn.innerHTML = tool.icon;
      btn.title = tool.title;
      btn.addEventListener('click', () => this.selectTool(tool.id));
      this.toolbar.appendChild(btn);
    });

    this.toolbar.appendChild(this.createDivider());

    // Undo
    const undoBtn = document.createElement('button');
    undoBtn.className = 'drawsh-btn';
    undoBtn.id = 'drawsh-undo';
    undoBtn.innerHTML = this.getUndoIcon();
    undoBtn.title = 'Undo (Ctrl+Z)';
    undoBtn.addEventListener('click', () => this.undo());
    this.toolbar.appendChild(undoBtn);

    // Redo
    const redoBtn = document.createElement('button');
    redoBtn.className = 'drawsh-btn';
    redoBtn.id = 'drawsh-redo';
    redoBtn.innerHTML = this.getRedoIcon();
    redoBtn.title = 'Redo (Ctrl+Shift+Z)';
    redoBtn.addEventListener('click', () => this.redo());
    this.toolbar.appendChild(redoBtn);

    // Screenshot
    const screenshotBtn = document.createElement('button');
    screenshotBtn.className = 'drawsh-btn';
    screenshotBtn.id = 'drawsh-screenshot';
    screenshotBtn.innerHTML = this.getScreenshotIcon();
    screenshotBtn.title = 'Copy to clipboard (S)';
    screenshotBtn.addEventListener('click', () => this.screenshot());
    this.toolbar.appendChild(screenshotBtn);

    // Clear
    const clearBtn = document.createElement('button');
    clearBtn.className = 'drawsh-btn';
    clearBtn.innerHTML = this.getClearIcon();
    clearBtn.title = 'Clear all';
    clearBtn.addEventListener('click', () => this.clear());
    this.toolbar.appendChild(clearBtn);

    this.toolbar.appendChild(this.createDivider());

    // Close
    const closeBtn = document.createElement('button');
    closeBtn.className = 'drawsh-btn';
    closeBtn.innerHTML = this.getCloseIcon();
    closeBtn.title = 'Close (Esc)';
    closeBtn.addEventListener('click', () => this.toggle());
    this.toolbar.appendChild(closeBtn);

    document.body.appendChild(this.toolbar);
  }

  createDivider() {
    const div = document.createElement('div');
    div.className = 'drawsh-divider';
    return div;
  }

  // Tool Icons
  getPenIcon() {
    return `<svg class="drawsh-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M12 19l7-7 3 3-7 7-3-3z"/>
      <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/>
      <path d="M2 2l7.586 7.586"/>
      <circle cx="11" cy="11" r="2"/>
    </svg>`;
  }

  getLineIcon() {
    return `<svg class="drawsh-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <line x1="5" y1="19" x2="19" y2="5"/>
    </svg>`;
  }

  getArrowIcon() {
    return `<svg class="drawsh-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <line x1="5" y1="19" x2="19" y2="5"/>
      <polyline points="10,5 19,5 19,14"/>
    </svg>`;
  }

  getRectIcon() {
    return `<svg class="drawsh-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
    </svg>`;
  }

  getCircleIcon() {
    return `<svg class="drawsh-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="9"/>
    </svg>`;
  }

  getTextIcon() {
    return `<svg class="drawsh-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M4 7V4h16v3"/>
      <line x1="12" y1="4" x2="12" y2="20"/>
      <line x1="8" y1="20" x2="16" y2="20"/>
    </svg>`;
  }

  getEraserIcon() {
    return `<svg class="drawsh-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M20 20H7L3 16c-.6-.6-.6-1.5 0-2.1l10-10c.6-.6 1.5-.6 2.1 0l6 6c.6.6.6 1.5 0 2.1l-7 7"/>
      <path d="M6 11l7 7"/>
    </svg>`;
  }

  getClearIcon() {
    return `<svg class="drawsh-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"/>
    </svg>`;
  }

  getUndoIcon() {
    return `<svg class="drawsh-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M3 10h10a5 5 0 015 5v2M3 10l5-5M3 10l5 5"/>
    </svg>`;
  }

  getRedoIcon() {
    return `<svg class="drawsh-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M21 10H11a5 5 0 00-5 5v2M21 10l-5-5M21 10l-5 5"/>
    </svg>`;
  }

  getScreenshotIcon() {
    return `<svg class="drawsh-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <circle cx="8.5" cy="8.5" r="1.5"/>
      <path d="M21 15l-5-5L5 21"/>
    </svg>`;
  }

  getCloseIcon() {
    return `<svg class="drawsh-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M18 6L6 18M6 6l12 12"/>
    </svg>`;
  }

  selectColor(btn, color) {
    this.toolbar.querySelectorAll('.drawsh-color').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    this.isAutoContrast = color.auto || false;
    this.currentColor = color.auto ? '#ffffff' : color.value;
    this.currentAlpha = color.alpha || 1;
    if (this.currentTool === 'eraser') {
      this.selectTool('pen');
    }
  }

  selectSize(btn, size) {
    this.toolbar.querySelectorAll('.drawsh-size').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    this.currentSize = size;
  }

  selectTool(toolId) {
    this.tools.forEach(t => {
      const btn = document.getElementById('drawsh-' + t);
      if (btn) {
        btn.classList.toggle('active', t === toolId);
      }
    });
    this.currentTool = toolId;

    // Update cursor
    if (toolId === 'text') {
      this.canvas.style.cursor = 'text';
    } else {
      this.canvas.style.cursor = 'crosshair';
    }
  }

  bindEvents() {
    // Pointer events for drawing
    this.canvas.addEventListener('pointerdown', (e) => this.startDrawing(e));
    this.canvas.addEventListener('pointermove', (e) => this.draw(e));
    this.canvas.addEventListener('pointerup', (e) => this.stopDrawing(e));
    this.canvas.addEventListener('pointerleave', () => {
      if (this.currentTool === 'pen' || this.currentTool === 'eraser') {
        this.stopDrawing();
      }
    });

    // Prevent default touch behavior
    this.canvas.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
    this.canvas.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });

    // Track shift key for snapping
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Shift') this.shiftHeld = true;
    });
    document.addEventListener('keyup', (e) => {
      if (e.key === 'Shift') this.shiftHeld = false;
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (!this.isActive) return;

      if (e.key === 'Escape') {
        if (this.textInput) {
          this.cancelTextInput();
        } else {
          this.toggle();
        }
        return;
      }

      // Don't handle shortcuts while typing text
      if (this.textInput) return;

      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        this.redo();
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        this.undo();
        return;
      }

      // Screenshot shortcut
      if (e.key.toLowerCase() === 's' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        this.screenshot();
        return;
      }

      // Tool shortcuts
      const toolShortcuts = {
        'p': 'pen',
        'l': 'line',
        'a': 'arrow',
        'r': 'rect',
        'c': 'circle',
        't': 'text',
        'e': 'eraser'
      };

      const tool = toolShortcuts[e.key.toLowerCase()];
      if (tool && !e.metaKey && !e.ctrlKey) {
        this.selectTool(tool);
        return;
      }

      // Color shortcuts (1-8)
      const num = parseInt(e.key);
      if (num >= 1 && num <= this.colors.length && !e.metaKey && !e.ctrlKey) {
        const colorBtns = this.toolbar.querySelectorAll('.drawsh-color');
        if (colorBtns[num - 1]) {
          this.selectColor(colorBtns[num - 1], this.colors[num - 1]);
        }
      }
    });
  }

  startDrawing(e) {
    if (!this.isActive) return;

    // Reset velocity tracking for new stroke
    this.lastTime = performance.now();
    this.lastVelocity = 0;

    const point = this.getPoint(e);
    this.startPoint = point;

    if (this.currentTool === 'text') {
      this.createTextInput(point);
      return;
    }

    this.isDrawing = true;
    this.points = [point];
    this.redoStack = []; // Clear redo stack on new action

    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    if (this.currentTool === 'eraser') {
      this.ctx.globalCompositeOperation = 'destination-out';
      this.ctx.strokeStyle = 'rgba(0,0,0,1)';
      this.ctx.lineWidth = this.currentSize * 4;
    } else {
      this.ctx.globalCompositeOperation = 'source-over';
      this.ctx.strokeStyle = this.currentColor;
      this.ctx.globalAlpha = this.currentAlpha;
      this.ctx.lineWidth = this.currentSize;
    }
  }

  // Draw stroke with outline for auto-contrast mode
  drawWithOutline(drawFn) {
    // Draw black outline first (thicker)
    this.ctx.strokeStyle = '#000000';
    this.ctx.lineWidth = this.currentSize + 2;
    drawFn();
    // Draw white stroke on top
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = this.currentSize;
    drawFn();
  }

  draw(e) {
    if (!this.isDrawing || !this.isActive) return;

    let point = this.getPoint(e);

    if (this.currentTool === 'pen' || this.currentTool === 'eraser') {
      // Apply smoothing to reduce jitter
      point = this.smoothPoint(point, this.points.length);
      this.points.push(point);

      if (this.isAutoContrast && this.currentTool === 'pen') {
        // Redraw everything to properly layer the outline
        this.redraw();
        this.drawNaturalStrokeWithOutline(this.points, this.currentSize);
      } else if (this.currentTool === 'pen') {
        // Draw natural stroke with variable width
        this.redraw();
        this.drawNaturalStroke(this.ctx, this.points, this.currentSize, this.currentColor, this.currentAlpha);
      } else {
        this.drawFreehand();
      }
    } else {
      // Apply shift modifiers for shapes
      if (this.shiftHeld && this.startPoint) {
        if (this.currentTool === 'line' || this.currentTool === 'arrow') {
          // Snap to 45-degree angles
          point = this.snapToAngle(this.startPoint, point);
        } else if (this.currentTool === 'rect' || this.currentTool === 'circle') {
          // Constrain to 1:1 aspect ratio
          point = this.constrainAspectRatio(this.startPoint, point);
        }
      }
      // For shapes, redraw everything and show preview
      this.redraw();
      this.drawShapePreview(this.startPoint, point);
    }
  }

  drawFreehand() {
    const points = this.points;
    if (points.length < 2) return;

    this.ctx.beginPath();

    if (points.length < 3) {
      this.ctx.moveTo(points[0].x, points[0].y);
      this.ctx.lineTo(points[1].x, points[1].y);
    } else {
      const lastTwo = points.slice(-3);
      this.ctx.moveTo(lastTwo[0].x, lastTwo[0].y);

      const midX = (lastTwo[1].x + lastTwo[2].x) / 2;
      const midY = (lastTwo[1].y + lastTwo[2].y) / 2;

      this.ctx.quadraticCurveTo(lastTwo[1].x, lastTwo[1].y, midX, midY);
    }

    this.ctx.stroke();
  }

  drawFreehandWithOutline(points) {
    if (!points || points.length < 2) return;

    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.globalCompositeOperation = 'source-over';
    this.ctx.globalAlpha = this.currentAlpha;

    // Draw black outline first
    this.ctx.strokeStyle = '#000000';
    this.ctx.lineWidth = this.currentSize + 2;
    this.drawStrokePoints(points);

    // Draw white stroke on top
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = this.currentSize;
    this.drawStrokePoints(points);
  }

  // Draw a natural stroke with variable width based on pressure/velocity
  drawNaturalStroke(ctx, points, baseSize, color, alpha) {
    if (!points || points.length < 2) return;

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const totalPoints = points.length;

    // Draw circles at each point with variable radius
    for (let i = 0; i < totalPoints; i++) {
      const point = points[i];
      const taper = this.calculateTaper(i, totalPoints);
      const width = this.calculateWidth(point, baseSize) * taper;
      const radius = Math.max(width / 2, 0.5);

      ctx.beginPath();
      ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
      ctx.fill();

      // Connect to previous point with a quad that tapers
      if (i > 0) {
        const prevPoint = points[i - 1];
        const prevTaper = this.calculateTaper(i - 1, totalPoints);
        const prevWidth = this.calculateWidth(prevPoint, baseSize) * prevTaper;
        const prevRadius = Math.max(prevWidth / 2, 0.5);

        this.drawTaperedLine(ctx, prevPoint, point, prevRadius, radius, color);
      }
    }
  }

  // Draw a line segment that tapers from one width to another
  drawTaperedLine(ctx, p1, p2, r1, r2, color) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 0.1) return;

    // Perpendicular vector
    const px = -dy / dist;
    const py = dx / dist;

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(p1.x + px * r1, p1.y + py * r1);
    ctx.lineTo(p2.x + px * r2, p2.y + py * r2);
    ctx.lineTo(p2.x - px * r2, p2.y - py * r2);
    ctx.lineTo(p1.x - px * r1, p1.y - py * r1);
    ctx.closePath();
    ctx.fill();
  }

  // Draw natural stroke with auto-contrast outline
  drawNaturalStrokeWithOutline(points, baseSize) {
    if (!points || points.length < 2) return;

    this.ctx.globalCompositeOperation = 'source-over';
    this.ctx.globalAlpha = this.currentAlpha;

    // Draw black outline (slightly larger)
    this.drawNaturalStroke(this.ctx, points, baseSize + 2, '#000000', this.currentAlpha);
    // Draw white stroke on top
    this.drawNaturalStroke(this.ctx, points, baseSize, '#ffffff', this.currentAlpha);
  }

  drawShapePreview(start, end) {
    this.ctx.globalCompositeOperation = 'source-over';
    this.ctx.globalAlpha = this.currentAlpha;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    if (this.isAutoContrast) {
      // Draw black outline first
      this.ctx.strokeStyle = '#000000';
      this.ctx.lineWidth = this.currentSize + 2;
      this.drawShape(this.currentTool, start, end);
      // Draw white stroke on top
      this.ctx.strokeStyle = '#ffffff';
      this.ctx.lineWidth = this.currentSize;
      this.drawShape(this.currentTool, start, end);
    } else {
      this.ctx.strokeStyle = this.currentColor;
      this.ctx.lineWidth = this.currentSize;
      this.drawShape(this.currentTool, start, end);
    }
  }

  drawShape(tool, start, end) {
    this.ctx.beginPath();

    switch (tool) {
      case 'line':
        this.ctx.moveTo(start.x, start.y);
        this.ctx.lineTo(end.x, end.y);
        this.ctx.stroke();
        break;

      case 'arrow':
        this.drawArrow(start, end);
        break;

      case 'rect':
        const width = end.x - start.x;
        const height = end.y - start.y;
        this.ctx.strokeRect(start.x, start.y, width, height);
        break;

      case 'circle':
        const radiusX = Math.abs(end.x - start.x) / 2;
        const radiusY = Math.abs(end.y - start.y) / 2;
        const centerX = start.x + (end.x - start.x) / 2;
        const centerY = start.y + (end.y - start.y) / 2;
        this.ctx.beginPath();
        this.ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
        this.ctx.stroke();
        break;
    }
  }

  drawArrow(start, end) {
    const headLength = Math.max(15, this.currentSize * 4);
    const angle = Math.atan2(end.y - start.y, end.x - start.x);

    // Draw the line
    this.ctx.moveTo(start.x, start.y);
    this.ctx.lineTo(end.x, end.y);
    this.ctx.stroke();

    // Draw the arrowhead
    this.ctx.beginPath();
    this.ctx.moveTo(end.x, end.y);
    this.ctx.lineTo(
      end.x - headLength * Math.cos(angle - Math.PI / 6),
      end.y - headLength * Math.sin(angle - Math.PI / 6)
    );
    this.ctx.moveTo(end.x, end.y);
    this.ctx.lineTo(
      end.x - headLength * Math.cos(angle + Math.PI / 6),
      end.y - headLength * Math.sin(angle + Math.PI / 6)
    );
    this.ctx.stroke();
  }

  stopDrawing(e) {
    if (!this.isDrawing) return;

    let endPoint = e ? this.getPoint(e) : this.points[this.points.length - 1];

    if (this.currentTool === 'pen' || this.currentTool === 'eraser') {
      if (this.points.length > 0) {
        this.strokes.push({
          type: this.currentTool,
          points: [...this.points],
          color: this.currentColor,
          alpha: this.currentAlpha,
          size: this.currentSize,
          autoContrast: this.isAutoContrast && this.currentTool === 'pen'
        });
      }
    } else if (this.startPoint && endPoint) {
      // Apply shift modifiers for final shape
      if (this.shiftHeld) {
        if (this.currentTool === 'line' || this.currentTool === 'arrow') {
          endPoint = this.snapToAngle(this.startPoint, endPoint);
        } else if (this.currentTool === 'rect' || this.currentTool === 'circle') {
          endPoint = this.constrainAspectRatio(this.startPoint, endPoint);
        }
      }
      // Save shape stroke
      this.strokes.push({
        type: this.currentTool,
        start: this.startPoint,
        end: endPoint,
        color: this.currentColor,
        alpha: this.currentAlpha,
        size: this.currentSize,
        autoContrast: this.isAutoContrast
      });
    }

    this.isDrawing = false;
    this.points = [];
    this.startPoint = null;
    this.ctx.globalAlpha = 1;
    this.redraw();
  }

  createTextInput(point) {
    if (this.textInput) {
      this.finishTextInput();
    }

    this.textInput = document.createElement('input');
    this.textInput.type = 'text';
    this.textInput.className = 'drawsh-text-input';
    this.textInput.style.left = point.x + 'px';
    this.textInput.style.top = point.y + 'px';
    this.textInput.style.fontSize = (16 + this.currentSize * 2) + 'px';
    if (this.isAutoContrast) {
      this.textInput.style.color = '#ffffff';
      this.textInput.style.textShadow = '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000';
    } else {
      this.textInput.style.color = this.currentColor;
    }

    this.textInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.finishTextInput();
      } else if (e.key === 'Escape') {
        this.cancelTextInput();
      }
      e.stopPropagation();
    });

    this.textInput.addEventListener('blur', () => {
      // Small delay to allow click elsewhere to work
      setTimeout(() => {
        if (this.textInput) {
          this.finishTextInput();
        }
      }, 100);
    });

    document.body.appendChild(this.textInput);
    this.textInput.focus();
    this.textInputPoint = point;
  }

  finishTextInput() {
    if (!this.textInput) return;

    const text = this.textInput.value.trim();
    if (text) {
      this.redoStack = [];
      this.strokes.push({
        type: 'text',
        text: text,
        point: this.textInputPoint,
        color: this.currentColor,
        alpha: this.currentAlpha,
        size: this.currentSize,
        autoContrast: this.isAutoContrast
      });
      this.redraw();
    }

    this.textInput.remove();
    this.textInput = null;
    this.textInputPoint = null;
  }

  cancelTextInput() {
    if (this.textInput) {
      this.textInput.remove();
      this.textInput = null;
      this.textInputPoint = null;
    }
  }

  getPoint(e) {
    const rect = this.canvas.getBoundingClientRect();
    const now = performance.now();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const pressure = e.pressure || 0.5;

    // Calculate velocity
    let velocity = 0;
    if (this.points.length > 0) {
      const lastPoint = this.points[this.points.length - 1];
      const dx = x - lastPoint.x;
      const dy = y - lastPoint.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const timeDelta = Math.max(now - this.lastTime, 1);
      velocity = distance / timeDelta;
      // Smooth velocity to avoid sudden changes
      velocity = this.lastVelocity * 0.7 + velocity * 0.3;
    }

    this.lastTime = now;
    this.lastVelocity = velocity;

    return { x, y, pressure, velocity, time: now };
  }

  // Smooth a point based on previous points (exponential moving average)
  smoothPoint(point, index) {
    if (index < 2 || !this.points[index - 1]) return point;

    const prev = this.points[index - 1];
    const smoothed = {
      x: prev.x * this.smoothingFactor + point.x * (1 - this.smoothingFactor),
      y: prev.y * this.smoothingFactor + point.y * (1 - this.smoothingFactor),
      pressure: point.pressure,
      velocity: point.velocity,
      time: point.time
    };
    return smoothed;
  }

  // Calculate line width based on pressure and velocity
  calculateWidth(point, baseSize) {
    // Handle points without pressure/velocity data (backwards compatibility)
    const pressure = point.pressure ?? 0.5;
    const velocity = point.velocity ?? 0;

    // Pressure: 0-1, where higher = thicker
    const pressureFactor = 0.5 + pressure * 0.8;

    // Velocity: faster = thinner (capped to reasonable range)
    const velocityNorm = Math.min(velocity / 2, 1); // Normalize velocity
    const velocityFactor = 1 - velocityNorm * 0.5; // 0.5 to 1.0

    return baseSize * pressureFactor * velocityFactor;
  }

  // Calculate taper factor for start/end of stroke
  calculateTaper(index, totalPoints) {
    const taperLength = Math.min(8, totalPoints / 4); // Taper over first/last N points

    // Start taper
    if (index < taperLength) {
      return 0.3 + (index / taperLength) * 0.7;
    }

    // End taper
    const distFromEnd = totalPoints - 1 - index;
    if (distFromEnd < taperLength) {
      return 0.3 + (distFromEnd / taperLength) * 0.7;
    }

    return 1;
  }

  // Snap endpoint to nearest 15-degree angle from start
  snapToAngle(start, end) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);

    // Snap to nearest 15 degrees (0, 15, 30, 45, 60, 75, 90, ...)
    const snapIncrement = Math.PI / 12; // 15 degrees
    const snapAngle = Math.round(angle / snapIncrement) * snapIncrement;

    return {
      x: start.x + distance * Math.cos(snapAngle),
      y: start.y + distance * Math.sin(snapAngle)
    };
  }

  // Constrain to 1:1 aspect ratio (square/circle)
  constrainAspectRatio(start, end) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const size = Math.max(Math.abs(dx), Math.abs(dy));

    return {
      x: start.x + size * Math.sign(dx || 1),
      y: start.y + size * Math.sign(dy || 1)
    };
  }

  undo() {
    if (this.strokes.length > 0) {
      const stroke = this.strokes.pop();
      this.redoStack.push(stroke);
      this.redraw();
    }
  }

  redo() {
    if (this.redoStack.length > 0) {
      const stroke = this.redoStack.pop();
      this.strokes.push(stroke);
      this.redraw();
    }
  }

  clear() {
    if (this.strokes.length > 0) {
      this.redoStack = [...this.strokes];
      this.strokes = [];
    }
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  async screenshot() {
    if (this.strokes.length === 0) {
      this.showToast('Nothing to copy');
      return;
    }

    try {
      // Create a temporary canvas with just the drawing (transparent background)
      const tempCanvas = document.createElement('canvas');
      const dpr = window.devicePixelRatio || 1;
      tempCanvas.width = this.canvas.width;
      tempCanvas.height = this.canvas.height;
      const tempCtx = tempCanvas.getContext('2d');
      tempCtx.scale(dpr, dpr);

      // Redraw all strokes on the temp canvas
      this.strokes.forEach(stroke => {
        tempCtx.lineCap = 'round';
        tempCtx.lineJoin = 'round';

        if (stroke.type === 'eraser') {
          // Skip eraser strokes - they only make sense with the original
          return;
        } else if (stroke.type === 'pen') {
          tempCtx.globalCompositeOperation = 'source-over';
          if (stroke.autoContrast) {
            this.drawNaturalStroke(tempCtx, stroke.points, stroke.size + 2, '#000000', stroke.alpha);
            this.drawNaturalStroke(tempCtx, stroke.points, stroke.size, '#ffffff', stroke.alpha);
          } else {
            this.drawNaturalStroke(tempCtx, stroke.points, stroke.size, stroke.color, stroke.alpha);
          }
        } else if (stroke.type === 'text') {
          tempCtx.globalCompositeOperation = 'source-over';
          tempCtx.globalAlpha = stroke.alpha;
          tempCtx.font = `${16 + stroke.size * 2}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
          if (stroke.autoContrast) {
            tempCtx.strokeStyle = '#000000';
            tempCtx.lineWidth = 3;
            tempCtx.strokeText(stroke.text, stroke.point.x, stroke.point.y);
            tempCtx.fillStyle = '#ffffff';
            tempCtx.fillText(stroke.text, stroke.point.x, stroke.point.y);
          } else {
            tempCtx.fillStyle = stroke.color;
            tempCtx.fillText(stroke.text, stroke.point.x, stroke.point.y);
          }
        } else {
          tempCtx.globalCompositeOperation = 'source-over';
          tempCtx.globalAlpha = stroke.alpha;
          if (stroke.autoContrast) {
            tempCtx.strokeStyle = '#000000';
            tempCtx.lineWidth = stroke.size + 2;
            this.drawShapeOn(tempCtx, stroke.type, stroke.start, stroke.end);
            tempCtx.strokeStyle = '#ffffff';
            tempCtx.lineWidth = stroke.size;
            this.drawShapeOn(tempCtx, stroke.type, stroke.start, stroke.end);
          } else {
            tempCtx.strokeStyle = stroke.color;
            tempCtx.lineWidth = stroke.size;
            this.drawShapeOn(tempCtx, stroke.type, stroke.start, stroke.end);
          }
        }
      });

      // Convert to blob and copy to clipboard
      const blob = await new Promise(resolve => tempCanvas.toBlob(resolve, 'image/png'));
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);

      this.showToast('Copied to clipboard');
    } catch (err) {
      console.error('Screenshot failed:', err);
      this.showToast('Failed to copy');
    }
  }

  drawStrokePointsOn(ctx, points) {
    if (!points || points.length < 2) return;

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);

    for (let i = 1; i < points.length - 1; i++) {
      const midX = (points[i].x + points[i + 1].x) / 2;
      const midY = (points[i].y + points[i + 1].y) / 2;
      ctx.quadraticCurveTo(points[i].x, points[i].y, midX, midY);
    }

    const last = points[points.length - 1];
    ctx.lineTo(last.x, last.y);
    ctx.stroke();
  }

  drawShapeOn(ctx, tool, start, end) {
    ctx.beginPath();

    switch (tool) {
      case 'line':
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
        break;

      case 'arrow':
        const headLength = Math.max(15, ctx.lineWidth * 4);
        const angle = Math.atan2(end.y - start.y, end.x - start.x);
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(end.x, end.y);
        ctx.lineTo(
          end.x - headLength * Math.cos(angle - Math.PI / 6),
          end.y - headLength * Math.sin(angle - Math.PI / 6)
        );
        ctx.moveTo(end.x, end.y);
        ctx.lineTo(
          end.x - headLength * Math.cos(angle + Math.PI / 6),
          end.y - headLength * Math.sin(angle + Math.PI / 6)
        );
        ctx.stroke();
        break;

      case 'rect':
        const width = end.x - start.x;
        const height = end.y - start.y;
        ctx.strokeRect(start.x, start.y, width, height);
        break;

      case 'circle':
        const radiusX = Math.abs(end.x - start.x) / 2;
        const radiusY = Math.abs(end.y - start.y) / 2;
        const centerX = start.x + (end.x - start.x) / 2;
        const centerY = start.y + (end.y - start.y) / 2;
        ctx.beginPath();
        ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
        ctx.stroke();
        break;
    }
  }

  showToast(message) {
    // Remove existing toast
    const existing = document.getElementById('drawsh-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'drawsh-toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    // Trigger animation
    requestAnimationFrame(() => {
      toast.classList.add('visible');
    });

    setTimeout(() => {
      toast.classList.remove('visible');
      setTimeout(() => toast.remove(), 200);
    }, 1500);
  }

  redraw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.strokes.forEach(stroke => {
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';

      if (stroke.type === 'eraser') {
        this.ctx.globalCompositeOperation = 'destination-out';
        this.ctx.strokeStyle = 'rgba(0,0,0,1)';
        this.ctx.lineWidth = stroke.size * 4;
        this.ctx.globalAlpha = 1;
        this.drawStrokePoints(stroke.points);
      } else if (stroke.type === 'pen') {
        this.ctx.globalCompositeOperation = 'source-over';
        if (stroke.autoContrast) {
          // Draw black outline first, then white on top
          this.drawNaturalStroke(this.ctx, stroke.points, stroke.size + 2, '#000000', stroke.alpha);
          this.drawNaturalStroke(this.ctx, stroke.points, stroke.size, '#ffffff', stroke.alpha);
        } else {
          this.drawNaturalStroke(this.ctx, stroke.points, stroke.size, stroke.color, stroke.alpha);
        }
      } else if (stroke.type === 'text') {
        this.ctx.globalCompositeOperation = 'source-over';
        this.ctx.globalAlpha = stroke.alpha;
        this.ctx.font = `${16 + stroke.size * 2}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
        if (stroke.autoContrast) {
          // Draw black outline for text
          this.ctx.strokeStyle = '#000000';
          this.ctx.lineWidth = 3;
          this.ctx.strokeText(stroke.text, stroke.point.x, stroke.point.y);
          // Draw white fill on top
          this.ctx.fillStyle = '#ffffff';
          this.ctx.fillText(stroke.text, stroke.point.x, stroke.point.y);
        } else {
          this.ctx.fillStyle = stroke.color;
          this.ctx.fillText(stroke.text, stroke.point.x, stroke.point.y);
        }
      } else {
        // Shapes: line, arrow, rect, circle
        this.ctx.globalCompositeOperation = 'source-over';
        this.ctx.globalAlpha = stroke.alpha;
        if (stroke.autoContrast) {
          // Draw black outline first
          this.ctx.strokeStyle = '#000000';
          this.ctx.lineWidth = stroke.size + 2;
          this.drawShape(stroke.type, stroke.start, stroke.end);
          // Draw white stroke on top
          this.ctx.strokeStyle = '#ffffff';
          this.ctx.lineWidth = stroke.size;
          this.drawShape(stroke.type, stroke.start, stroke.end);
        } else {
          this.ctx.strokeStyle = stroke.color;
          this.ctx.lineWidth = stroke.size;
          this.drawShape(stroke.type, stroke.start, stroke.end);
        }
      }
    });

    this.ctx.globalAlpha = 1;
    this.ctx.globalCompositeOperation = 'source-over';
  }

  drawStrokePoints(points) {
    if (!points || points.length < 2) return;

    this.ctx.beginPath();
    this.ctx.moveTo(points[0].x, points[0].y);

    for (let i = 1; i < points.length - 1; i++) {
      const midX = (points[i].x + points[i + 1].x) / 2;
      const midY = (points[i].y + points[i + 1].y) / 2;
      this.ctx.quadraticCurveTo(points[i].x, points[i].y, midX, midY);
    }

    const last = points[points.length - 1];
    this.ctx.lineTo(last.x, last.y);
    this.ctx.stroke();
  }

  toggle() {
    this.isActive = !this.isActive;
    this.updateUI();
    this.saveState();
  }

  updateUI() {
    if (this.isActive) {
      this.canvas.classList.add('active');
      this.toolbar.classList.add('visible');
    } else {
      this.canvas.classList.remove('active');
      this.toolbar.classList.remove('visible');
      this.cancelTextInput();
    }
  }

  loadState() {
    chrome.storage.local.get(['drawshActive'], (result) => {
      this.isActive = result.drawshActive || false;
      this.updateUI();
    });
  }

  saveState() {
    chrome.storage.local.set({ drawshActive: this.isActive });
  }

}

// Initialize
const drawsh = new Drawsh();

// Handle messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'toggle') {
    drawsh.toggle();
    sendResponse({ active: drawsh.isActive });
    return true;
  }
});
