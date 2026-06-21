/**
 * Canvas绘画工具类
 * 注意：此类将被 tldraw 替代，保留用于兼容性
 */
export class DrawingCanvas {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private isDrawing = false;
  private lastX = 0;
  private lastY = 0;
  private drawingColor = '#000000';
  private drawingSize = 3;
  private drawingOpacity = 1;
  private undoStack: ImageData[] = [];
  private redoStack: ImageData[] = [];
  private maxUndoSteps = 50;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');
    this.ctx = ctx;

    this.setupEventListeners();
  }

  private setupEventListeners() {
    this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    this.canvas.addEventListener('mouseup', () => this.handleMouseUp());
    this.canvas.addEventListener('mouseleave', () => this.handleMouseUp());

    this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e));
    this.canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e));
    this.canvas.addEventListener('touchend', () => this.handleTouchEnd());
  }

  private getCanvasCoords(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  }

  private handleMouseDown(e: MouseEvent) {
    this.isDrawing = true;
    const coords = this.getCanvasCoords(e.clientX, e.clientY);
    this.lastX = coords.x;
    this.lastY = coords.y;
    this.saveState();
  }

  private handleMouseMove(e: MouseEvent) {
    if (!this.isDrawing) return;

    const coords = this.getCanvasCoords(e.clientX, e.clientY);
    this.drawLine(this.lastX, this.lastY, coords.x, coords.y);
    this.lastX = coords.x;
    this.lastY = coords.y;
  }

  private handleMouseUp() {
    this.isDrawing = false;
  }

  private handleTouchStart(e: TouchEvent) {
    if (e.touches.length === 1) {
      this.isDrawing = true;
      const coords = this.getCanvasCoords(e.touches[0].clientX, e.touches[0].clientY);
      this.lastX = coords.x;
      this.lastY = coords.y;
      this.saveState();
    }
  }

  private handleTouchMove(e: TouchEvent) {
    if (!this.isDrawing || e.touches.length !== 1) return;

    const coords = this.getCanvasCoords(e.touches[0].clientX, e.touches[0].clientY);
    this.drawLine(this.lastX, this.lastY, coords.x, coords.y);
    this.lastX = coords.x;
    this.lastY = coords.y;
    e.preventDefault();
  }

  private handleTouchEnd() {
    this.isDrawing = false;
  }

  private drawLine(fromX: number, fromY: number, toX: number, toY: number) {
    this.ctx.strokeStyle = this.drawingColor;
    this.ctx.lineWidth = this.drawingSize;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.globalAlpha = this.drawingOpacity;

    this.ctx.beginPath();
    this.ctx.moveTo(fromX, fromY);
    this.ctx.lineTo(toX, toY);
    this.ctx.stroke();

    this.ctx.globalAlpha = 1;
  }

  public setColor(color: string) {
    this.drawingColor = color;
  }

  public setSize(size: number) {
    this.drawingSize = size;
  }

  public setOpacity(opacity: number) {
    this.drawingOpacity = Math.max(0, Math.min(1, opacity));
  }

  public clear() {
    this.saveState();
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  private saveState() {
    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    this.undoStack.push(imageData);

    if (this.undoStack.length > this.maxUndoSteps) {
      this.undoStack.shift();
    }

    this.redoStack = [];
  }

  public undo() {
    if (this.undoStack.length === 0) return;

    const currentState = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    this.redoStack.push(currentState);

    const previousState = this.undoStack.pop();
    if (previousState) {
      this.ctx.putImageData(previousState, 0, 0);
    }
  }

  public redo() {
    if (this.redoStack.length === 0) return;

    const currentState = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    this.undoStack.push(currentState);

    const nextState = this.redoStack.pop();
    if (nextState) {
      this.ctx.putImageData(nextState, 0, 0);
    }
  }

  public canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  public canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  public exportImage(): string {
    return this.canvas.toDataURL('image/png');
  }

  public resize(width: number, height: number) {
    this.canvas.width = width;
    this.canvas.height = height;
  }

  public destroy() {
    // 清理事件监听器（如果需要）
    this.undoStack = [];
    this.redoStack = [];
  }
}
