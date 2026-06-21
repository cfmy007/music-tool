<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import {
    DrawingEngine,
    type DrawTool,
    type CanvasSnapshot,
    type ToolSettings
  } from '$lib/utils/drawingEngine';
  import { DrawingToolbar } from '$lib/components/DrawingToolbar';
  import { db } from '$lib/db/indexedDB';
  import type { ScorePage, NoteLayer } from '$lib/db/schema';

  interface Props {
    scorePage: ScorePage;
    noteId: string;
    layerVisible?: boolean;
    onLayersChange?: (layers: NoteLayer[]) => void;
  }

  let { scorePage, noteId, layerVisible = true, onLayersChange = () => {} }: Props = $props();

  let containerEl = $state<HTMLDivElement | null>(null);
  let imageEl = $state<HTMLImageElement | null>(null);
  let canvasEl = $state<HTMLCanvasElement | null>(null);
  let engine: DrawingEngine | null = null;

  let tool = $state<DrawTool>('pen');
  let penColor = $state('#000000');
  let penSize = $state(3);
  let eraserSize = $state(20);

  let canUndo = $state(false);
  let canRedo = $state(false);
  let isLoading = $state(true);
  let imageLoaded = $state(false);

  let imageWidth = $state(0);
  let imageHeight = $state(0);

  let saveTimer: ReturnType<typeof setTimeout> | null = null;
  let currentDisplayPageId = $state('');

  let currentSize = $derived(tool === 'eraser' ? eraserSize : penSize);

  // 直接派生图片 URL
  let imageUrl = $derived.by(() => {
    const blob = scorePage.imageBlob;
    if (blob && blob instanceof Blob && blob.size > 0) {
      return URL.createObjectURL(blob);
    }
    return '';
  });

  // 检测页面变化并重置状态
  $effect.pre(() => {
    const pageId = scorePage.id;
    if (pageId !== currentDisplayPageId) {
      currentDisplayPageId = pageId;
      imageLoaded = false;
      imageWidth = 0;
      imageHeight = 0;
      engine = null;
      isLoading = true;
    }
  });

  onDestroy(() => {
    if (saveTimer) clearTimeout(saveTimer);
    if (imageUrl) {
      URL.revokeObjectURL(imageUrl);
    }
    engine?.destroy();
  });

  function handleImageLoad() {
    if (!imageEl) return;

    imageWidth = imageEl.naturalWidth;
    imageHeight = imageEl.naturalHeight;
    imageLoaded = true;

    requestAnimationFrame(() => {
      initCanvas();
    });
  }

  async function initCanvas() {
    if (!canvasEl || imageWidth === 0 || imageHeight === 0) return;

    canvasEl.width = imageWidth;
    canvasEl.height = imageHeight;

    engine = new DrawingEngine(canvasEl, handleDrawingChange, handleSettingsChange);

    const savedSettings = localStorage.getItem('drawingToolSettings');
    if (savedSettings) {
      try {
        const settings: ToolSettings = JSON.parse(savedSettings);
        engine.loadSettings(settings);
        penSize = settings.penSize;
        penColor = settings.penColor;
        eraserSize = settings.eraserSize;
      } catch (e) {
        // 忽略
      }
    }

    await loadSavedDrawing();
    isLoading = false;
  }

  function handleDrawingChange() {
    if (!engine) return;
    canUndo = engine.canUndo();
    canRedo = engine.canRedo();
    debouncedSave();
  }

  function handleSettingsChange(settings: ToolSettings) {
    penSize = settings.penSize;
    penColor = settings.penColor;
    eraserSize = settings.eraserSize;
    localStorage.setItem('drawingToolSettings', JSON.stringify(settings));
  }

  function debouncedSave() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saveDrawing();
    }, 300);
  }

  async function saveDrawing() {
    if (!engine) return;

    try {
      const snapshot = engine.getSnapshot();
      const snapshotJson = JSON.stringify(snapshot);

      const existingLayers = await db.getLayersByScorePage(scorePage.id);
      let layer = existingLayers.find((l) => l.noteId === noteId);

      if (layer) {
        layer.tldrawSnapshot = snapshotJson;
        layer.updatedAt = Date.now();
        await db.updateNoteLayer(layer);
      } else {
        const newLayer: NoteLayer = {
          id: crypto.randomUUID(),
          noteId,
          scorePageId: scorePage.id,
          layerIndex: 0,
          layerName: '默认图层',
          canvasData: '',
          tldrawSnapshot: snapshotJson,
          visible: true,
          opacity: 1,
          blendMode: 'normal',
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        await db.createNoteLayer(newLayer);
      }

      const layers = await db.getLayersByScorePage(scorePage.id);
      onLayersChange(layers);
    } catch (error) {
      console.error('保存绘图失败:', error);
    }
  }

  async function loadSavedDrawing() {
    if (!engine) return;

    try {
      let layers = await db.getLayersByScorePage(scorePage.id);

      if (layers.length === 0) {
        const newLayer: NoteLayer = {
          id: crypto.randomUUID(),
          noteId,
          scorePageId: scorePage.id,
          layerIndex: 0,
          layerName: '默认图层',
          canvasData: '',
          tldrawSnapshot: '',
          visible: true,
          opacity: 1,
          blendMode: 'normal',
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        await db.createNoteLayer(newLayer);
        layers = [newLayer];
      }

      const layer = layers.find((l) => l.noteId === noteId);

      if (layer && layer.tldrawSnapshot) {
        const snapshot: CanvasSnapshot = JSON.parse(layer.tldrawSnapshot);
        engine.loadSnapshot(snapshot);
      }

      onLayersChange(layers);
    } catch (error) {
      console.error('加载绘图失败:', error);
    }
  }

  function handleToolChange(newTool: DrawTool) {
    tool = newTool;
    engine?.setTool(newTool);
  }

  function handleColorChange(newColor: string) {
    penColor = newColor;
    engine?.setColor(newColor);
  }

  function handleSizeChange(newSize: number) {
    if (tool === 'eraser') {
      eraserSize = newSize;
    } else {
      penSize = newSize;
    }
    engine?.setSize(newSize);
  }

  function handleUndo() {
    engine?.undo();
  }

  function handleRedo() {
    engine?.redo();
  }

  function handleClear() {
    engine?.clear();
  }

  onMount(() => {
    // 检查图片是否已缓存
    setTimeout(() => {
      if (imageEl && imageEl.complete && imageEl.naturalWidth > 0) {
        handleImageLoad();
      }
    }, 100);
  });
</script>

<div class="canvas-drawing">
  <DrawingToolbar
    {tool}
    color={penColor}
    size={currentSize}
    {canUndo}
    {canRedo}
    onToolChange={handleToolChange}
    onColorChange={handleColorChange}
    onSizeChange={handleSizeChange}
    onUndo={handleUndo}
    onRedo={handleRedo}
    onClear={handleClear}
  />

  <div class="canvas-area" bind:this={containerEl}>
    {#if imageUrl}
      <img
        bind:this={imageEl}
        src={imageUrl}
        alt="score"
        class="score-image"
        onload={handleImageLoad}
        draggable="false"
      />
    {:else}
      <div class="no-image">暂无图片</div>
    {/if}

    {#if imageLoaded && imageWidth > 0 && imageHeight > 0}
      <canvas bind:this={canvasEl} class="drawing-canvas" class:hidden={!layerVisible}></canvas>
    {/if}

    {#if isLoading && !imageLoaded && imageUrl}
      <div class="loading-overlay">
        <div class="spinner"></div>
        <p>加载中...</p>
      </div>
    {/if}
  </div>
</div>

<style>
  .canvas-drawing {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    position: relative;
  }

  .canvas-area {
    flex: 1;
    position: relative;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f5f5f5;
  }

  .score-image {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    pointer-events: none;
    user-select: none;
  }

  .no-image {
    color: #999;
    font-size: 16px;
  }

  .drawing-canvas {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    cursor: crosshair;
    touch-action: none;
  }

  .drawing-canvas.hidden {
    display: none;
  }

  .loading-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.9);
    z-index: 100;
    gap: 12px;
  }

  .spinner {
    width: 40px;
    height: 40px;
    border: 4px solid #e0e0e0;
    border-radius: 50%;
    border-top-color: #667eea;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .loading-overlay p {
    color: #666;
    font-size: 14px;
  }
</style>
