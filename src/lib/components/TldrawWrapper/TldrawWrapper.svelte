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

  interface LayerCanvas {
    layerId: string;
    canvas: HTMLCanvasElement;
    engine: DrawingEngine;
  }

  interface Props {
    scorePage: ScorePage;
    noteId: string;
    layers?: NoteLayer[];
    selectedLayerId?: string | null;
    onLayersChange?: (layers: NoteLayer[]) => void;
  }

  let {
    scorePage,
    noteId,
    layers = [],
    selectedLayerId = null,
    onLayersChange = () => {}
  }: Props = $props();

  let containerEl = $state<HTMLDivElement | null>(null);
  let imageEl = $state<HTMLImageElement | null>(null);
  let canvasContainerEl = $state<HTMLDivElement | null>(null);

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
  let layerCanvases = $state<LayerCanvas[]>([]);
  let activeEngine = $state<DrawingEngine | null>(null);

  let currentSize = $derived(tool === 'eraser' ? eraserSize : penSize);

  let imageUrl = $derived.by(() => {
    const blob = scorePage.imageBlob;
    if (blob && blob instanceof Blob && blob.size > 0) {
      return URL.createObjectURL(blob);
    }
    return '';
  });

  // 页面变化时重置
  $effect.pre(() => {
    const pageId = scorePage.id;
    if (pageId !== currentDisplayPageId) {
      currentDisplayPageId = pageId;
      imageLoaded = false;
      imageWidth = 0;
      imageHeight = 0;
      destroyAllCanvases();
      isLoading = true;
    }
  });

  // 选中图层变化时切换活跃引擎
  $effect(() => {
    if (selectedLayerId && layerCanvases.length > 0) {
      const lc = layerCanvases.find((c) => c.layerId === selectedLayerId);
      if (lc) {
        activeEngine = lc.engine;
        updateToolbarState(lc.engine);
      } else {
        activeEngine = null;
      }
    }
  });

  // 图层可见性变化时更新 canvas 显示
  $effect(() => {
    // 建立对 layers 数组的依赖
    const visibilities = layers.map((l) => ({ id: l.id, visible: l.visible }));
    if (canvasContainerEl && layerCanvases.length > 0) {
      for (const lc of layerCanvases) {
        const layer = layers.find((l) => l.id === lc.layerId);
        const canvas = lc.canvas;
        if (layer) {
          if (layer.visible) {
            canvas.classList.remove('hidden');
          } else {
            canvas.classList.add('hidden');
          }
        }
      }
    }
  });

  function destroyAllCanvases() {
    for (const lc of layerCanvases) {
      lc.engine.destroy();
    }
    layerCanvases = [];
    activeEngine = null;
  }

  onDestroy(() => {
    if (saveTimer) clearTimeout(saveTimer);
    if (imageUrl) {
      URL.revokeObjectURL(imageUrl);
    }
    destroyAllCanvases();
  });

  function handleImageLoad() {
    if (!imageEl) return;

    imageWidth = imageEl.naturalWidth;
    imageHeight = imageEl.naturalHeight;
    imageLoaded = true;

    requestAnimationFrame(() => {
      initLayerCanvases();
    });
  }

  async function initLayerCanvases() {
    if (!canvasContainerEl || imageWidth === 0 || imageHeight === 0) return;

    destroyAllCanvases();

    // 确保有图层数据
    let currentLayers = layers;
    if (currentLayers.length === 0) {
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
      currentLayers = [newLayer];
      onLayersChange(currentLayers);
    }

    // 加载保存的工具设置
    let savedPenSize = penSize;
    let savedPenColor = penColor;
    let savedEraserSize = eraserSize;
    const savedSettings = localStorage.getItem('drawingToolSettings');
    if (savedSettings) {
      try {
        const settings: ToolSettings = JSON.parse(savedSettings);
        savedPenSize = settings.penSize;
        savedPenColor = settings.penColor;
        savedEraserSize = settings.eraserSize;
      } catch (e) {
        // 忽略
      }
    }

    // 为每个图层创建 canvas
    const newCanvases: LayerCanvas[] = [];
    for (const layer of currentLayers) {
      const canvas = document.createElement('canvas');
      canvas.width = imageWidth;
      canvas.height = imageHeight;
      canvas.className = 'layer-canvas';
      canvas.dataset.layerId = layer.id;

      const engine = new DrawingEngine(canvas, handleDrawingChange, handleSettingsChange);
      engine.loadSettings({
        penSize: savedPenSize,
        penColor: savedPenColor,
        eraserSize: savedEraserSize
      });

      // 加载保存的绘图
      if (layer.tldrawSnapshot) {
        try {
          const snapshot: CanvasSnapshot = JSON.parse(layer.tldrawSnapshot);
          engine.loadSnapshot(snapshot);
        } catch (e) {
          console.error('加载图层绘图失败:', e);
        }
      }

      newCanvases.push({ layerId: layer.id, canvas, engine });
      canvasContainerEl.appendChild(canvas);
    }

    layerCanvases = newCanvases;

    // 设置活跃引擎
    if (selectedLayerId) {
      const lc = newCanvases.find((c) => c.layerId === selectedLayerId);
      if (lc) {
        activeEngine = lc.engine;
      }
    } else if (newCanvases.length > 0) {
      activeEngine = newCanvases[0].engine;
    }

    isLoading = false;
  }

  function updateToolbarState(engine: DrawingEngine) {
    canUndo = engine.canUndo();
    canRedo = engine.canRedo();
  }

  function handleDrawingChange() {
    if (!activeEngine) return;
    canUndo = activeEngine.canUndo();
    canRedo = activeEngine.canRedo();
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
      saveAllLayers();
    }, 300);
  }

  async function saveAllLayers() {
    try {
      for (const lc of layerCanvases) {
        const snapshot = lc.engine.getSnapshot();
        const snapshotJson = JSON.stringify(snapshot);

        const layer = layers.find((l) => l.id === lc.layerId);
        if (layer) {
          layer.tldrawSnapshot = snapshotJson;
          layer.updatedAt = Date.now();
          await db.updateNoteLayer(layer);
        }
      }

      const updatedLayers = await db.getLayersByScorePage(scorePage.id);
      onLayersChange(updatedLayers);
    } catch (error) {
      console.error('保存图层失败:', error);
    }
  }

  function handleToolChange(newTool: DrawTool) {
    tool = newTool;
    activeEngine?.setTool(newTool);
  }

  function handleColorChange(newColor: string) {
    penColor = newColor;
    activeEngine?.setColor(newColor);
  }

  function handleSizeChange(newSize: number) {
    if (tool === 'eraser') {
      eraserSize = newSize;
    } else {
      penSize = newSize;
    }
    activeEngine?.setSize(newSize);
  }

  function handleUndo() {
    activeEngine?.undo();
  }

  function handleRedo() {
    activeEngine?.redo();
  }

  function handleClear() {
    activeEngine?.clear();
  }

  onMount(() => {
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
      <div class="image-wrapper">
        <img
          bind:this={imageEl}
          src={imageUrl}
          alt="score"
          class="score-image"
          onload={handleImageLoad}
          draggable="false"
        />
        {#if imageLoaded && imageWidth > 0 && imageHeight > 0}
          <div class="canvas-container" bind:this={canvasContainerEl}></div>
        {/if}
      </div>
    {:else}
      <div class="no-image">暂无图片</div>
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

  .image-wrapper {
    position: relative;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .score-image {
    width: 100%;
    height: 100%;
    object-fit: contain;
    pointer-events: none;
    user-select: none;
  }

  .canvas-container {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }

  .canvas-container :global(.layer-canvas) {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: auto;
    cursor: crosshair;
    touch-action: none;
  }

  .canvas-container :global(.layer-canvas.hidden) {
    display: none;
  }

  .no-image {
    color: #999;
    font-size: 16px;
    padding: 40px;
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
