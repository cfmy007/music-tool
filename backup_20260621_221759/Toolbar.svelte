<script lang="ts">
  import type { Note, ScorePage } from '$lib/db/schema';
  import Metronome from '../Metronome/Metronome.svelte';

  let {
    viewMode = 'score',
    selectedNote,
    scorePages,
    currentPageIndex,
    onchangeViewMode,
    onback,
    onaddImage,
    ondeleteImage,
    onnextPage,
    onprevPage,
    onlayerPanelOpen
  } = $props<{
    viewMode?: 'score' | 'note';
    selectedNote: Note;
    scorePages: ScorePage[];
    currentPageIndex: number;
    onchangeViewMode: (mode: 'score' | 'note') => void;
    onback: () => void;
    onaddImage: (file: File) => void;
    ondeleteImage: (pageId: string) => void;
    onnextPage: () => void;
    onprevPage: () => void;
    onlayerPanelOpen: () => void;
  }>();

  let fileInput: HTMLInputElement;
  let showMetronome = $state(false);

  function handleFileSelect(e: Event) {
    const target = e.target as HTMLInputElement;
    const files = target.files;
    if (files && files.length > 0) {
      onaddImage(files[0]);
      target.value = '';
    }
  }

  function handleViewModeChange(mode: 'score' | 'note') {
    onchangeViewMode(mode);
  }

  function handleDeleteImage() {
    if (scorePages.length > currentPageIndex) {
      ondeleteImage(scorePages[currentPageIndex].id);
    }
  }
</script>

<div class="toolbar">
  <div class="toolbar-left">
    <button class="toolbar-btn back-btn" title="返回" onclick={onback} aria-label="返回">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
      </svg>
    </button>

    <div class="toolbar-title">{selectedNote.title}</div>
  </div>

  <div class="toolbar-center">
    <!-- 看谱/笔记模式切换 -->
    <div class="mode-toggle">
      <button
        class="toggle-btn"
        class:active={viewMode === 'score'}
        onclick={() => handleViewModeChange('score')}
        title="看谱模式"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z"
          />
        </svg>
        <span>看谱</span>
      </button>

      <button
        class="toggle-btn"
        class:active={viewMode === 'note'}
        onclick={() => handleViewModeChange('note')}
        title="笔记模式"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
          />
        </svg>
        <span>笔记</span>
      </button>
    </div>

    <!-- 分隔符 -->
    <div class="divider"></div>

    <!-- 页码导航 -->
    {#if scorePages.length > 0}
      <div class="page-nav">
        <button
          aria-label="上一页"
          class="nav-btn"
          disabled={currentPageIndex === 0}
          onclick={onprevPage}
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

        <span class="page-info">
          {currentPageIndex + 1} / {scorePages.length}
        </span>

        <button
          aria-label="下一页"
          class="nav-btn"
          disabled={currentPageIndex === scorePages.length - 1}
          onclick={onnextPage}
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
      </div>

      <div class="divider"></div>
    {/if}

    <!-- 图层管理 -->
    <button
      class="toolbar-btn layer-manager-btn"
      title="图层管理"
      onclick={onlayerPanelOpen}
      aria-label="打开图层管理"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h10a4 4 0 004-4v-3a6 6 0 00-5.197-5.917A1 1 0 0014.92 6H12a1 1 0 00-.997 1.083A6 6 0 006 13v3a4 4 0 004 4z"
        />
      </svg>
    </button>
  </div>

  <div class="toolbar-right">
    <!-- 节拍器 -->
    {#if viewMode === 'score'}
      <button
        class="toolbar-btn"
        class:active={showMetronome}
        title="节拍器"
        onclick={() => (showMetronome = !showMetronome)}
        aria-label="节拍器"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 8v4l3 3M12 2a10 10 0 110 20 10 10 0 010-20z"
          />
        </svg>
      </button>
    {/if}

    <!-- 添加图片 -->
    <button
      class="toolbar-btn"
      title="添加图片"
      onclick={() => fileInput.click()}
      aria-label="添加图片"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M12 4v16m-8-8h16"
        />
      </svg>
    </button>

    <!-- 删除当前页面 -->
    {#if scorePages.length > 0}
      <button
        class="toolbar-btn danger"
        title="删除页面"
        onclick={handleDeleteImage}
        aria-label="删除页面"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3H4v2h16V7h-3z"
          />
        </svg>
      </button>
    {/if}
  </div>

  <!-- 隐藏的文件输入 -->
  <input
    type="file"
    bind:this={fileInput}
    accept="image/*"
    onchange={handleFileSelect}
    style="display: none"
  />
</div>

{#if showMetronome}
  <Metronome onclose={() => (showMetronome = false)} />
{/if}

<style>
  .toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    background: white;
    border-bottom: 1px solid #e0e0e0;
    gap: 16px;
    flex-wrap: wrap;
  }

  .toolbar-left,
  .toolbar-center,
  .toolbar-right {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .toolbar-left {
    flex: 0 0 auto;
  }

  .toolbar-center {
    flex: 1;
    min-width: 0;
    overflow-x: auto;
  }

  .toolbar-right {
    flex: 0 0 auto;
  }

  .back-btn {
    background: #f0f0f0;
  }

  .back-btn:hover {
    background: #e0e0e0;
  }

  .toolbar-title {
    font-size: 14px;
    font-weight: 600;
    color: #333;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 200px;
  }

  .toolbar-btn {
    width: 36px;
    height: 36px;
    border: none;
    background: #f0f0f0;
    border-radius: 6px;
    cursor: pointer;
    color: #333;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    flex-shrink: 0;
  }

  .toolbar-btn:hover:not(:disabled) {
    background: #e0e0e0;
  }

  .toolbar-btn.active {
    background: #667eea;
    color: white;
  }

  .toolbar-btn.danger {
    color: #f87171;
  }

  .toolbar-btn.danger:hover {
    background: #fee;
  }

  .toolbar-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .toolbar-btn svg {
    width: 18px;
    height: 18px;
  }

  .mode-toggle {
    display: flex;
    gap: 2px;
    background: #f0f0f0;
    padding: 2px;
    border-radius: 6px;
    flex-shrink: 0;
  }

  .toggle-btn {
    padding: 6px 12px;
    border: none;
    background: transparent;
    color: #666;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    gap: 4px;
    white-space: nowrap;
  }

  .toggle-btn:hover {
    background: #e0e0e0;
  }

  .toggle-btn.active {
    background: white;
    color: #667eea;
    font-weight: 600;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .toggle-btn svg {
    width: 16px;
    height: 16px;
  }

  .divider {
    width: 1px;
    height: 24px;
    background: #ddd;
    flex-shrink: 0;
  }

  .page-nav {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }

  .nav-btn {
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

  .nav-btn:hover:not(:disabled) {
    border-color: #667eea;
    color: #667eea;
  }

  .nav-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .nav-btn svg {
    width: 16px;
    height: 16px;
  }

  .page-info {
    font-size: 12px;
    color: #666;
    min-width: 50px;
    text-align: center;
    font-weight: 500;
  }

  .layer-manager-btn {
    background: white;
    border: 1px solid #ddd;
  }

  .layer-manager-btn:hover {
    border-color: #667eea;
    color: #667eea;
  }

  @media (max-width: 768px) {
    .toolbar {
      padding: 10px 12px;
      gap: 8px;
    }

    .toolbar-left {
      flex: 0 0 auto;
    }

    .toolbar-center {
      order: 3;
      flex: 0 0 100%;
      overflow-x: auto;
    }

    .toolbar-right {
      order: 2;
    }

    .toolbar-title {
      max-width: 150px;
      font-size: 13px;
    }

    .toggle-btn {
      padding: 4px 8px;
      font-size: 11px;
    }

    .toggle-btn span {
      display: none;
    }

    .toolbar-btn {
      width: 32px;
      height: 32px;
    }

    .page-info {
      font-size: 11px;
    }

    .nav-btn {
      width: 28px;
      height: 28px;
    }
  }

  @media (max-width: 480px) {
    .toolbar {
      padding: 8px;
      flex-direction: column;
      align-items: stretch;
    }

    .toolbar-left,
    .toolbar-center,
    .toolbar-right {
      width: 100%;
    }

    .toolbar-left {
      justify-content: space-between;
    }

    .toolbar-right {
      justify-content: flex-end;
    }

    .toolbar-title {
      font-size: 12px;
      max-width: 120px;
    }

    .toolbar-btn {
      width: 28px;
      height: 28px;
    }

    .toolbar-btn svg {
      width: 16px;
      height: 16px;
    }
  }
</style>
