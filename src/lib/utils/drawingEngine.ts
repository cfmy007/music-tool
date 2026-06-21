export type DrawTool = 'pen' | 'eraser';

export interface DrawPoint {
  x: number;
  y: number;
}

export interface DrawStroke {
  id: string;
  tool: DrawTool;
  color: string;
  size: number;
  points: DrawPoint[];
}

export interface CanvasSnapshot {
  strokes: DrawStroke[];
}

export interface ToolSettings {
  penSize: number;
  penColor: string;
  eraserSize: number;
}

export class DrawingEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private isDrawing = false;
  private currentStroke: DrawStroke | null = null;
  private strokes: DrawStroke[] = [];
  private redoStack: DrawStroke[] = [];
  private maxUndoSteps = 100;

  private tool: DrawTool = 'pen';
  private penColor = '#000000';
  private penSize = 3;
  private eraserSize = 20;

  private onChange: (() => void) | null = null;
  private onSettingsChange: ((settings: ToolSettings) => void) | null = null;

  constructor(
    canvas: HTMLCanvasElement,
    onChange?: () => void,
    onSettingsChange?: (settings: ToolSettings) => void
  ) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');
    this.ctx = ctx;
    this.onChange = onChange || null;
    this.onSettingsChange = onSettingsChange || null;
    this.setupEventListeners();
  }

  private setupEventListeners() {
    this.canvas.addEventListener('pointerdown', this.handlePointerDown.bind(this));
    this.canvas.addEventListener('pointermove', this.handlePointerMove.bind(this));
    this.canvas.addEventListener('pointerup', this.handlePointerUp.bind(this));
    this.canvas.addEventListener('pointerleave', this.handlePointerUp.bind(this));
  }

  private getCanvasCoords(e: PointerEvent): DrawPoint {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  }

  private getCurrentSize(): number {
    return this.tool === 'eraser' ? Math.max(this.eraserSize, 8) : this.penSize;
  }

  private handlePointerDown(e: PointerEvent) {
    if (e.button !== 0) return;
    e.preventDefault();

    this.isDrawing = true;
    this.canvas.setPointerCapture(e.pointerId);

    const point = this.getCanvasCoords(e);

    this.currentStroke = {
      id: crypto.randomUUID(),
      tool: this.tool,
      color: this.tool === 'eraser' ? '#000000' : this.penColor,
      size: this.getCurrentSize(),
      points: [point]
    };

    this.drawPoint(point);
  }

  private handlePointerMove(e: PointerEvent) {
    if (!this.isDrawing || !this.currentStroke) return;
    e.preventDefault();

    const point = this.getCanvasCoords(e);
    this.currentStroke.points.push(point);

    const prevPoint = this.currentStroke.points[this.currentStroke.points.length - 2];
    this.drawLine(prevPoint, point);
  }

  private handlePointerUp(e?: PointerEvent) {
    if (!this.isDrawing || !this.currentStroke) return;
    this.isDrawing = false;

    if (this.currentStroke.points.length > 0) {
      this.strokes.push(this.currentStroke);
      this.redoStack = [];

      if (this.strokes.length > this.maxUndoSteps) {
        this.strokes.shift();
      }
    }

    this.currentStroke = null;
    this.onChange?.();
  }

  private drawPoint(point: DrawPoint) {
    if (!this.currentStroke) return;

    this.ctx.save();

    if (this.tool === 'eraser') {
      this.ctx.globalCompositeOperation = 'destination-out';
      this.ctx.fillStyle = 'rgba(0,0,0,1)';
    } else {
      this.ctx.globalCompositeOperation = 'source-over';
      this.ctx.fillStyle = this.penColor;
    }

    const radius = this.currentStroke.size / 2;
    this.ctx.beginPath();
    this.ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.restore();
  }

  private drawLine(from: DrawPoint, to: DrawPoint) {
    if (!this.currentStroke) return;

    this.ctx.save();

    if (this.tool === 'eraser') {
      this.ctx.globalCompositeOperation = 'destination-out';
      this.ctx.strokeStyle = 'rgba(0,0,0,1)';
    } else {
      this.ctx.globalCompositeOperation = 'source-over';
      this.ctx.strokeStyle = this.penColor;
    }

    this.ctx.lineWidth = this.currentStroke.size;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.beginPath();
    this.ctx.moveTo(from.x, from.y);
    this.ctx.lineTo(to.x, to.y);
    this.ctx.stroke();
    this.ctx.restore();
  }

  redraw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (const stroke of this.strokes) {
      this.drawStroke(stroke);
    }
  }

  private drawStroke(stroke: DrawStroke) {
    if (stroke.points.length === 0) return;

    this.ctx.save();

    if (stroke.tool === 'eraser') {
      this.ctx.globalCompositeOperation = 'destination-out';
      this.ctx.strokeStyle = 'rgba(0,0,0,1)';
      this.ctx.fillStyle = 'rgba(0,0,0,1)';
    } else {
      this.ctx.globalCompositeOperation = 'source-over';
      this.ctx.strokeStyle = stroke.color;
      this.ctx.fillStyle = stroke.color;
    }

    this.ctx.lineWidth = stroke.size;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    if (stroke.points.length === 1) {
      const p = stroke.points[0];
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, stroke.size / 2, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
      return;
    }

    this.ctx.beginPath();
    this.ctx.moveTo(stroke.points[0].x, stroke.points[0].y);

    for (let i = 1; i < stroke.points.length; i++) {
      const prev = stroke.points[i - 1];
      const curr = stroke.points[i];
      const midX = (prev.x + curr.x) / 2;
      const midY = (prev.y + curr.y) / 2;
      this.ctx.quadraticCurveTo(prev.x, prev.y, midX, midY);
    }

    const last = stroke.points[stroke.points.length - 1];
    this.ctx.lineTo(last.x, last.y);
    this.ctx.stroke();
    this.ctx.restore();
  }

  undo() {
    if (this.strokes.length === 0) return;
    const stroke = this.strokes.pop()!;
    this.redoStack.push(stroke);
    this.redraw();
    this.onChange?.();
  }

  redo() {
    if (this.redoStack.length === 0) return;
    const stroke = this.redoStack.pop()!;
    this.strokes.push(stroke);
    this.redraw();
    this.onChange?.();
  }

  canUndo(): boolean {
    return this.strokes.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  clear() {
    this.strokes = [];
    this.redoStack = [];
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.onChange?.();
  }

  setTool(tool: DrawTool) {
    this.tool = tool;
    this.canvas.style.cursor = tool === 'eraser' ? 'cell' : 'crosshair';
    this.notifySettingsChange();
  }

  setColor(color: string) {
    this.penColor = color;
    this.notifySettingsChange();
  }

  setSize(size: number) {
    if (this.tool === 'eraser') {
      this.eraserSize = size;
    } else {
      this.penSize = size;
    }
    this.notifySettingsChange();
  }

  getTool(): DrawTool {
    return this.tool;
  }

  getSettings(): ToolSettings {
    return {
      penSize: this.penSize,
      penColor: this.penColor,
      eraserSize: this.eraserSize
    };
  }

  loadSettings(settings: ToolSettings) {
    this.penSize = settings.penSize;
    this.penColor = settings.penColor;
    this.eraserSize = settings.eraserSize;
  }

  private notifySettingsChange() {
    if (this.onSettingsChange) {
      this.onSettingsChange(this.getSettings());
    }
  }

  getSnapshot(): CanvasSnapshot {
    return { strokes: [...this.strokes] };
  }

  loadSnapshot(snapshot: CanvasSnapshot) {
    this.strokes = snapshot.strokes || [];
    this.redoStack = [];
    this.redraw();
  }

  destroy() {
    this.canvas.removeEventListener('pointerdown', this.handlePointerDown.bind(this));
    this.canvas.removeEventListener('pointermove', this.handlePointerMove.bind(this));
    this.canvas.removeEventListener('pointerup', this.handlePointerUp.bind(this));
    this.canvas.removeEventListener('pointerleave', this.handlePointerUp.bind(this));
  }
}
