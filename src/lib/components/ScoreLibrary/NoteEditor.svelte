<script lang="ts">
  import { onMount } from 'svelte';
  import type { Note, ScorePage, NoteLayer } from '$lib/db/schema';
  import { db } from '$lib/db/indexedDB';
  import Toolbar from './Toolbar.svelte';
  import TldrawWrapper from '../TldrawWrapper/TldrawWrapper.svelte';
  import LayerPanel from './LayerPanel.svelte';

  interface Props {
    selectedNote: Note;
    onback?: () => void;
  }

  let { selectedNote, onback = () => {} }: Props = $props();

  let scorePages = $state<ScorePage[]>([]);
  let currentPageIndex = $state(0);
  let isLoading = $state(true);
  let showLayerPanel = $state(false);
  let layers = $state<NoteLayer[]>([]);
  let selectedLayerId = $state<string | null>(null);

  onMount(async () => {
    await loadPages();
    await loadLayers();
  });

  async function loadPages() {
    try {
      isLoading = true;
      scorePages = await db.getScorePagesByNote(selectedNote.id);
    } catch (error) {
      console.error('加载乐谱页面失败:', error);
    } finally {
      isLoading = false;
    }
  }

  async function loadLayers() {
    if (scorePages.length === 0) return;
    const pageId = scorePages[currentPageIndex].id;
    try {
      let loadedLayers = await db.getLayersByScorePage(pageId);
      if (loadedLayers.length === 0) {
        const newLayer: NoteLayer = {
          id: crypto.randomUUID(),
          noteId: selectedNote.id,
          scorePageId: pageId,
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
        loadedLayers = [newLayer];
      }
      layers = loadedLayers;
      if (!selectedLayerId && layers.length > 0) {
        selectedLayerId = layers[0].id;
      }
    } catch (error) {
      console.error('加载图层失败:', error);
    }
  }

  function handleBack() {
    onback();
  }

  async function handleAddImage(file: File) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const blob = new Blob([arrayBuffer], { type: file.type });

      const newPage: ScorePage = {
        id: crypto.randomUUID(),
        noteId: selectedNote.id,
        pageIndex: scorePages.length,
        imageBlob: blob,
        zoomLevel: 1.0,
        scrollX: 0,
        scrollY: 0,
        lastViewedAt: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      await db.createScorePage(newPage);
      scorePages = [...scorePages, newPage];
      currentPageIndex = scorePages.length - 1;
      await loadLayers();
    } catch (error) {
      console.error('添加图片失败:', error);
    }
  }

  async function handleDeleteImage(pageId: string) {
    if (!confirm('确定要删除此页面吗？')) return;

    try {
      await db.deleteScorePage(pageId);
      scorePages = scorePages.filter((p) => p.id !== pageId);
      if (currentPageIndex >= scorePages.length) {
        currentPageIndex = Math.max(0, scorePages.length - 1);
      }
      await loadLayers();
    } catch (error) {
      console.error('删除页面失败:', error);
    }
  }

  async function handleNextPage() {
    if (currentPageIndex < scorePages.length - 1) {
      currentPageIndex++;
      await loadLayers();
    }
  }

  async function handlePrevPage() {
    if (currentPageIndex > 0) {
      currentPageIndex--;
      await loadLayers();
    }
  }

  function handleLayersChange(newLayers: NoteLayer[]) {
    layers = newLayers;
    if (newLayers.length > 0 && !selectedLayerId) {
      selectedLayerId = newLayers[0].id;
    }
  }

  function handleSelectLayer(layerId: string) {
    selectedLayerId = layerId;
  }

  async function handleToggleVisibility(layerId: string, visible: boolean) {
    try {
      await db.updateLayerVisibility(layerId, visible);
      layers = layers.map((l) => (l.id === layerId ? { ...l, visible } : l));
    } catch (error) {
      console.error('更新图层可见性失败:', error);
    }
  }

  async function handleAddLayer(layerName: string) {
    if (scorePages.length === 0) return;

    try {
      const newLayer: NoteLayer = {
        id: crypto.randomUUID(),
        noteId: selectedNote.id,
        scorePageId: scorePages[currentPageIndex].id,
        layerIndex: layers.length,
        layerName,
        canvasData: '',
        tldrawSnapshot: '',
        visible: true,
        opacity: 1,
        blendMode: 'normal',
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      await db.createNoteLayer(newLayer);
      layers = [...layers, newLayer];
      selectedLayerId = newLayer.id;
    } catch (error) {
      console.error('添加图层失败:', error);
    }
  }

  async function handleDeleteLayer(layerId: string) {
    try {
      await db.deleteNoteLayer(layerId);
      layers = layers.filter((l) => l.id !== layerId);
      if (selectedLayerId === layerId) {
        selectedLayerId = layers.length > 0 ? layers[0].id : null;
      }
    } catch (error) {
      console.error('删除图层失败:', error);
    }
  }

  async function handleRenameLayer(layerId: string, newName: string) {
    try {
      const layer = layers.find((l) => l.id === layerId);
      if (layer) {
        const updatedLayer = { ...layer, layerName: newName, updatedAt: Date.now() };
        await db.updateNoteLayer(updatedLayer);
        layers = layers.map((l) => (l.id === layerId ? updatedLayer : l));
      }
    } catch (error) {
      console.error('重命名图层失败:', error);
    }
  }

  async function handleMergeLayers(layerIds: string[]) {
    try {
      const layersToMerge = layers.filter((l) => layerIds.includes(l.id));
      if (layersToMerge.length < 2) return;

      const targetLayer = layersToMerge[0];
      const otherLayers = layersToMerge.slice(1);

      for (const layer of otherLayers) {
        await db.deleteNoteLayer(layer.id);
      }

      layers = layers.filter((l) => !layerIds.slice(1).includes(l.id));
      selectedLayerId = targetLayer.id;
    } catch (error) {
      console.error('合并图层失败:', error);
    }
  }
</script>

<div class="note-editor">
  <Toolbar
    {selectedNote}
    {scorePages}
    {currentPageIndex}
    onback={handleBack}
    onaddImage={handleAddImage}
    ondeleteImage={handleDeleteImage}
    onnextPage={handleNextPage}
    onprevPage={handlePrevPage}
    onlayerPanelOpen={() => {
      showLayerPanel = !showLayerPanel;
      if (showLayerPanel && layers.length === 0) {
        loadLayers();
      }
    }}
  />

  <div class="editor-content">
    {#if isLoading}
      <div class="loading">
        <div class="spinner"></div>
        <p>加载中...</p>
      </div>
    {:else if scorePages.length === 0}
      <div class="empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 4v16m-8-8h16"
          />
        </svg>
        <p>暂无乐谱</p>
        <small>点击工具栏的"添加图片"按钮上传乐谱</small>
      </div>
    {:else}
      <div class="viewer-wrapper">
        <TldrawWrapper
          scorePage={scorePages[currentPageIndex]}
          noteId={selectedNote.id}
          {layers}
          {selectedLayerId}
          onLayersChange={handleLayersChange}
        />

        <!-- 左右翻页按钮 -->
        <button
          class="page-btn left"
          disabled={currentPageIndex === 0}
          onclick={handlePrevPage}
          title="上一页"
          aria-label="上一页"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>

        <button
          class="page-btn right"
          disabled={currentPageIndex === scorePages.length - 1}
          onclick={handleNextPage}
          title="下一页"
          aria-label="下一页"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>

        {#if showLayerPanel}
          <LayerPanel
            noteId={selectedNote.id}
            scorePageId={scorePages[currentPageIndex].id}
            {layers}
            {selectedLayerId}
            onSelectLayer={handleSelectLayer}
            onToggleVisibility={handleToggleVisibility}
            onAddLayer={handleAddLayer}
            onDeleteLayer={handleDeleteLayer}
            onRenameLayer={handleRenameLayer}
            onMergeLayers={handleMergeLayers}
            onClose={() => (showLayerPanel = false)}
          />
        {/if}
      </div>
    {/if}
  </div>
</div>

<style>
  .note-editor {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .editor-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: #f5f5f5;
  }

  .viewer-wrapper {
    flex: 1;
    position: relative;
    display: flex;
    overflow: hidden;
  }

  .loading,
  .empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    gap: 12px;
    color: #999;
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

  .empty p {
    font-size: 16px;
    font-weight: 500;
  }

  .empty small {
    font-size: 12px;
    opacity: 0.7;
  }

  .page-btn {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    width: 44px;
    height: 44px;
    border: none;
    background: rgba(102, 126, 234, 0.85);
    color: white;
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    z-index: 10;
  }

  .page-btn.left {
    left: 12px;
  }

  .page-btn.right {
    right: 12px;
  }

  .page-btn:hover:not(:disabled) {
    background: rgba(102, 126, 234, 1);
    transform: translateY(-50%) scale(1.1);
  }

  .page-btn:active:not(:disabled) {
    transform: translateY(-50%) scale(0.95);
  }

  .page-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .page-btn svg {
    width: 22px;
    height: 22px;
  }

  @media (max-width: 768px) {
    .page-btn {
      width: 38px;
      height: 38px;
    }

    .page-btn svg {
      width: 18px;
      height: 18px;
    }
  }
</style>
