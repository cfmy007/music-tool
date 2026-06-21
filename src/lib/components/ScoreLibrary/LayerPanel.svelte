<script lang="ts">
  import type { NoteLayer } from '$lib/db/schema';

  interface Props {
    noteId: string;
    scorePageId: string;
    layers: NoteLayer[];
    selectedLayerId: string | null;
    onSelectLayer?: (layerId: string) => void;
    onToggleVisibility?: (layerId: string, visible: boolean) => void;
    onAddLayer?: (layerName: string) => void;
    onDeleteLayer?: (layerId: string) => void;
    onRenameLayer?: (layerId: string, newName: string) => void;
    onMergeLayers?: (layerIds: string[]) => void;
    onClose?: () => void;
  }

  let {
    layers = [],
    selectedLayerId = null,
    onSelectLayer = () => {},
    onToggleVisibility = () => {},
    onAddLayer = () => {},
    onDeleteLayer = () => {},
    onRenameLayer = () => {},
    onMergeLayers = () => {},
    onClose = () => {}
  }: Props = $props();

  let newLayerName = $state('');
  let editingLayerId = $state<string | null>(null);
  let editingName = $state('');
  let selectedForMerge = $state<Set<string>>(new Set());
  let isMergeMode = $state(false);

  function handleAddLayer() {
    const name = newLayerName.trim() || `图层 ${layers.length + 1}`;
    onAddLayer(name);
    newLayerName = '';
  }

  function handleDeleteLayer(layerId: string) {
    if (layers.length <= 1) {
      alert('至少需要保留一个图层');
      return;
    }
    if (confirm('确定要删除此图层吗？')) {
      onDeleteLayer(layerId);
    }
  }

  function startRename(layerId: string, currentName: string) {
    editingLayerId = layerId;
    editingName = currentName;
  }

  function finishRename() {
    if (editingLayerId && editingName.trim()) {
      onRenameLayer(editingLayerId, editingName.trim());
    }
    editingLayerId = null;
    editingName = '';
  }

  function cancelRename() {
    editingLayerId = null;
    editingName = '';
  }

  function toggleMergeSelection(layerId: string) {
    const newSet = new Set(selectedForMerge);
    if (newSet.has(layerId)) {
      newSet.delete(layerId);
    } else {
      newSet.add(layerId);
    }
    selectedForMerge = newSet;
  }

  function handleMerge() {
    if (selectedForMerge.size < 2) {
      alert('请选择至少两个图层进行合并');
      return;
    }
    if (confirm(`确定要合并选中的 ${selectedForMerge.size} 个图层吗？`)) {
      onMergeLayers(Array.from(selectedForMerge));
      selectedForMerge = new Set();
      isMergeMode = false;
    }
  }

  function toggleMergeMode() {
    isMergeMode = !isMergeMode;
    if (!isMergeMode) {
      selectedForMerge = new Set();
    }
  }
</script>

<div class="layer-panel">
  <div class="panel-header">
    <h3>图层管理</h3>
    <div class="header-actions">
      {#if layers.length > 1}
        <button
          class="merge-btn"
          class:active={isMergeMode}
          onclick={toggleMergeMode}
          title="合并图层"
          aria-label="合并图层"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
            />
          </svg>
        </button>
      {/if}
      <button class="close-btn" onclick={onClose} title="关闭" aria-label="关闭面板">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
  </div>

  <div class="add-layer">
    <input
      type="text"
      bind:value={newLayerName}
      placeholder="新图层名称"
      onkeydown={(e) => e.key === 'Enter' && handleAddLayer()}
      class="layer-name-input"
    />
    <button onclick={handleAddLayer} class="add-btn" title="添加图层" aria-label="添加图层">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M12 4v16m-8-8h16"
        />
      </svg>
    </button>
  </div>

  {#if isMergeMode}
    <div class="merge-hint">
      <p>选择要合并的图层（至少2个）</p>
      {#if selectedForMerge.size >= 2}
        <button onclick={handleMerge} class="merge-confirm-btn">
          合并 ({selectedForMerge.size})
        </button>
      {/if}
    </div>
  {/if}

  <div class="layer-list">
    {#each layers as layer (layer.id)}
      <div
        class="layer-item"
        class:selected={selectedLayerId === layer.id}
        class:merge-selected={selectedForMerge.has(layer.id)}
        class:hidden={!layer.visible}
      >
        {#if isMergeMode}
          <label class="merge-checkbox">
            <input
              type="checkbox"
              checked={selectedForMerge.has(layer.id)}
              onchange={() => toggleMergeSelection(layer.id)}
            />
          </label>
        {/if}

        <button
          class="visibility-btn"
          onclick={() => onToggleVisibility(layer.id, !layer.visible)}
          title={layer.visible ? '隐藏图层' : '显示图层'}
          aria-label={layer.visible ? '隐藏图层' : '显示图层'}
        >
          {#if layer.visible}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
          {:else}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
              />
            </svg>
          {/if}
        </button>

        <button
          class="layer-content"
          onclick={() => !isMergeMode && onSelectLayer(layer.id)}
          ondblclick={() => startRename(layer.id, layer.layerName)}
        >
          {#if editingLayerId === layer.id}
            <input
              type="text"
              bind:value={editingName}
              onblur={finishRename}
              onkeydown={(e) => {
                if (e.key === 'Enter') finishRename();
                if (e.key === 'Escape') cancelRename();
              }}
              class="rename-input"
            />
          {:else}
            <span class="layer-name">{layer.layerName}</span>
          {/if}
        </button>

        {#if !isMergeMode}
          <button
            class="delete-btn"
            onclick={() => handleDeleteLayer(layer.id)}
            title="删除图层"
            aria-label="删除图层"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        {/if}
      </div>
    {/each}
  </div>
</div>

<style>
  .layer-panel {
    position: absolute;
    right: 0;
    top: 0;
    bottom: 0;
    width: 280px;
    background: white;
    border-left: 1px solid #e0e0e0;
    display: flex;
    flex-direction: column;
    z-index: 100;
    box-shadow: -2px 0 8px rgba(0, 0, 0, 0.1);
  }

  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    border-bottom: 1px solid #e0e0e0;
    background: #f8f9fa;
  }

  .panel-header h3 {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: #333;
  }

  .header-actions {
    display: flex;
    gap: 8px;
  }

  .merge-btn,
  .close-btn {
    width: 28px;
    height: 28px;
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

  .merge-btn:hover,
  .close-btn:hover {
    border-color: #667eea;
    color: #667eea;
  }

  .merge-btn.active {
    background: #667eea;
    color: white;
    border-color: #667eea;
  }

  .merge-btn svg,
  .close-btn svg {
    width: 14px;
    height: 14px;
  }

  .add-layer {
    display: flex;
    gap: 8px;
    padding: 12px 16px;
    border-bottom: 1px solid #e0e0e0;
  }

  .layer-name-input {
    flex: 1;
    padding: 6px 10px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 12px;
    outline: none;
    transition: border-color 0.2s;
  }

  .layer-name-input:focus {
    border-color: #667eea;
  }

  .add-btn {
    width: 32px;
    height: 32px;
    border: 1px solid #667eea;
    background: white;
    border-radius: 4px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #667eea;
    transition: all 0.2s;
  }

  .add-btn:hover {
    background: #667eea;
    color: white;
  }

  .add-btn svg {
    width: 16px;
    height: 16px;
  }

  .merge-hint {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 16px;
    background: #fff3cd;
    border-bottom: 1px solid #ffc107;
    font-size: 12px;
    color: #856404;
  }

  .merge-confirm-btn {
    padding: 4px 12px;
    background: #667eea;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    transition: background 0.2s;
  }

  .merge-confirm-btn:hover {
    background: #5a6fd6;
  }

  .layer-list {
    flex: 1;
    overflow-y: auto;
    padding: 8px 0;
  }

  .layer-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    border-bottom: 1px solid #f0f0f0;
    transition: background 0.2s;
    cursor: pointer;
  }

  .layer-item:hover {
    background: #f8f9fa;
  }

  .layer-item.selected {
    background: #e8f0fe;
    border-left: 3px solid #667eea;
  }

  .layer-item.merge-selected {
    background: #fff3cd;
  }

  .layer-item.hidden {
    opacity: 0.5;
  }

  .merge-checkbox {
    display: flex;
    align-items: center;
    cursor: pointer;
  }

  .merge-checkbox input {
    width: 16px;
    height: 16px;
    cursor: pointer;
  }

  .visibility-btn {
    width: 28px;
    height: 28px;
    border: none;
    background: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #666;
    transition: color 0.2s;
    padding: 0;
  }

  .visibility-btn:hover {
    color: #667eea;
  }

  .visibility-btn svg {
    width: 16px;
    height: 16px;
  }

  .layer-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
    background: none;
    border: none;
    cursor: pointer;
    text-align: left;
    padding: 0;
  }

  .layer-name {
    font-size: 13px;
    font-weight: 500;
    color: #333;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .rename-input {
    width: 100%;
    padding: 2px 6px;
    border: 1px solid #667eea;
    border-radius: 3px;
    font-size: 13px;
    outline: none;
  }

  .delete-btn {
    width: 28px;
    height: 28px;
    border: none;
    background: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #999;
    transition: color 0.2s;
    padding: 0;
  }

  .delete-btn:hover {
    color: #dc3545;
  }

  .delete-btn svg {
    width: 14px;
    height: 14px;
  }
</style>
