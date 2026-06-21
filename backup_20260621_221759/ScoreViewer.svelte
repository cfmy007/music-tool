<script lang="ts">
  import { onDestroy } from 'svelte';
  import type { ScorePage, NoteLayer } from '$lib/db/schema';
  import { db } from '$lib/db/indexedDB';
  import { TldrawWrapper } from '$lib/components/TldrawWrapper';

  interface Props {
    scorePage: ScorePage;
    viewMode: 'score' | 'note';
    noteId: string;
    allPages?: ScorePage[];
    layerVisible?: boolean;
    onNextPage?: () => void;
    onPrevPage?: () => void;
    onLayersChange?: (layers: NoteLayer[]) => void;
  }

  let {
    scorePage,
    viewMode,
    noteId,
    allPages = [],
    layerVisible = true,
    onNextPage = () => {},
    onPrevPage = () => {},
    onLayersChange = () => {}
  }: Props = $props();

  let containerElement = $state<HTMLDivElement | null>(null);
  let imageElement = $state<HTMLImageElement | null>(null);

  let zoomLevel = $state(1.0);
  let offsetX = $state(0);
  let offsetY = $state(0);
  let isDragging = $state(false);
  let dragStartX = $state(0);
  let dragStartY = $state(0);

  let imageWidth = $state(0);
  let imageHeight = $state(0);
  let imageLoaded = $state(false);

  let saveTimer: ReturnType<typeof setTimeout> | null = null;

  // 记录当前显示的页面 ID，用于检测页面切换
  let currentDisplayPageId = $state('');

  // 生成图片 URL - 直接派生，简单可靠
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
      zoomLevel = scorePage.zoomLevel || 1.0;
      offsetX = scorePage.scrollX || 0;
      offsetY = scorePage.scrollY || 0;
    }
  });

  onDestroy(() => {
    if (saveTimer) clearTimeout(saveTimer);
    // 清理 URL
    if (imageUrl) {
      URL.revokeObjectURL(imageUrl);
    }
  });

  function handlePointerDown(e: PointerEvent) {
    if (viewMode !== 'score' || e.button !== 0) return;

    const target = e.target as HTMLElement;
    if (target.closest('button, input, select, a')) return;

    isDragging = true;
    dragStartX = e.clientX - offsetX;
    dragStartY = e.clientY - offsetY;
    containerElement?.setPointerCapture(e.pointerId);
    e.preventDefault();
  }

  function handlePointerMove(e: PointerEvent) {
    if (!isDragging) return;

    offsetX = e.clientX - dragStartX;
    offsetY = e.clientY - dragStartY;
    e.preventDefault();
  }

  function handlePointerUp() {
    if (!isDragging) return;
    isDragging = false;
    saveMemory();
  }

  function handleWheel(e: WheelEvent) {
    if (viewMode !== 'score') return;
    e.preventDefault();

    const delta = e.deltaY > 0 ? 0.95 : 1.05;
    const newZoom = Math.max(0.5, Math.min(5.0, zoomLevel * delta));

    const rect = containerElement?.getBoundingClientRect();
    if (rect) {
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const scaleChange = newZoom / zoomLevel;
      offsetX = mouseX - (mouseX - offsetX) * scaleChange;
      offsetY = mouseY - (mouseY - offsetY) * scaleChange;
    }

    zoomLevel = newZoom;
  }

  function handleNextPage() {
    saveMemory();
    onNextPage();
  }

  function handlePrevPage() {
    saveMemory();
    onPrevPage();
  }

  function saveMemory() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      try {
        await db.updateScorePageMemory(scorePage.id, {
          zoomLevel,
          scrollX: offsetX,
          scrollY: offsetY,
          lastViewedAt: Date.now()
        });
      } catch (error) {
        console.error('保存记忆失败:', error);
      }
    }, 500);
  }

  function handleLayersChange(newLayers: NoteLayer[]) {
    onLayersChange(newLayers);
  }

  function handleImageLoad() {
    if (imageElement) {
      imageWidth = imageElement.naturalWidth;
      imageHeight = imageElement.naturalHeight;
      imageLoaded = true;
    }
  }

  function resetView() {
    zoomLevel = 1.0;
    offsetX = 0;
    offsetY = 0;
  }

  function zoomIn() {
    zoomLevel = Math.min(5.0, zoomLevel * 1.2);
  }

  function zoomOut() {
    zoomLevel = Math.max(0.5, zoomLevel / 1.2);
  }
</script>

<div class="score-viewer">
  {#if viewMode === 'note'}
    <div class="note-area">
      <TldrawWrapper {scorePage} {noteId} {layerVisible} onLayersChange={handleLayersChange} />
    </div>
  {:else}
    <div
      class="score-area"
      bind:this={containerElement}
      role="application"
      aria-label="乐谱查看器"
      style="cursor: {isDragging ? 'grabbing' : 'grab'}"
      onpointerdown={handlePointerDown}
      onpointermove={handlePointerMove}
      onpointerup={handlePointerUp}
      onpointerleave={handlePointerUp}
      onwheel={handleWheel}
    >
      <div
        class="image-wrapper"
        style="transform: translate({offsetX}px, {offsetY}px) scale({zoomLevel})"
      >
        {#if imageUrl}
          <img
            bind:this={imageElement}
            src={imageUrl}
            alt="score"
            class="score-image"
            onload={handleImageLoad}
            draggable="false"
          />
        {:else}
          <div class="no-image">暂无图片</div>
        {/if}
      </div>

      <div class="virtual-keys">
        <button class="key-btn prev" onclick={handlePrevPage} title="上一页" aria-label="上一页">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>

        <button class="key-btn next" onclick={handleNextPage} title="下一页" aria-label="下一页">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      </div>

      <div class="zoom-controls">
        <button onclick={zoomOut} title="缩小" aria-label="缩小">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
          </svg>
        </button>
        <span class="zoom-display">{Math.round(zoomLevel * 100)}%</span>
        <button onclick={zoomIn} title="放大" aria-label="放大">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 4v16m-8-8h16"
            />
          </svg>
        </button>
        <button onclick={resetView} title="重置视图" aria-label="重置视图">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>
      </div>
    </div>
  {/if}
</div>

<style>
  .score-viewer {
    display: flex;
    flex-direction: column;
    height: 100%;
    position: relative;
    background: #f5f5f5;
    overflow: hidden;
  }

  .note-area {
    width: 100%;
    height: 100%;
    position: relative;
  }

  .score-area {
    width: 100%;
    height: 100%;
    position: relative;
    overflow: hidden;
    touch-action: none;
  }

  .image-wrapper {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    transform-origin: 0 0;
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
    -webkit-user-drag: none;
  }

  .no-image {
    color: #999;
    font-size: 16px;
  }

  .virtual-keys {
    position: absolute;
    width: 100%;
    height: 100%;
    top: 0;
    left: 0;
    pointer-events: none;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 16px;
    z-index: 5;
  }

  .key-btn {
    width: 48px;
    height: 48px;
    border: none;
    background: rgba(102, 126, 234, 0.8);
    color: white;
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    pointer-events: auto;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  }

  .key-btn:hover {
    background: rgba(102, 126, 234, 1);
    transform: scale(1.1);
  }

  .key-btn:active {
    transform: scale(0.95);
  }

  .key-btn svg {
    width: 24px;
    height: 24px;
  }

  .zoom-controls {
    position: absolute;
    bottom: 16px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 8px;
    background: white;
    padding: 8px 12px;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    z-index: 10;
  }

  .zoom-controls button {
    width: 32px;
    height: 32px;
    border: 1px solid #ddd;
    background: white;
    border-radius: 4px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #666;
    transition: all 0.2s;
  }

  .zoom-controls button:hover {
    border-color: #667eea;
    color: #667eea;
  }

  .zoom-controls button svg {
    width: 16px;
    height: 16px;
  }

  .zoom-display {
    font-size: 12px;
    color: #666;
    min-width: 45px;
    text-align: center;
    font-weight: 600;
  }

  @media (max-width: 768px) {
    .key-btn {
      width: 40px;
      height: 40px;
    }

    .key-btn svg {
      width: 20px;
      height: 20px;
    }

    .zoom-controls {
      bottom: 8px;
      padding: 6px 10px;
    }
  }

  @media (max-width: 480px) {
    .key-btn {
      width: 36px;
      height: 36px;
    }

    .key-btn svg {
      width: 18px;
      height: 18px;
    }
  }
</style>
