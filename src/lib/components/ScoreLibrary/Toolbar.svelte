<script lang="ts">
  import type { Note, ScorePage } from '$lib/db/schema';
  import Metronome from '../Metronome/Metronome.svelte';

  let {
    selectedNote,
    scorePages,
    currentPageIndex,
    onback,
    onaddImage,
    ondeleteImage,
    onnextPage,
    onprevPage,
    onlayerPanelOpen
  } = $props<{
    selectedNote: Note;
    scorePages: ScorePage[];
    currentPageIndex: number;
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
    <!-- 页码显示 -->
    {#if scorePages.length > 0}
      <div class="page-info">
        {currentPageIndex + 1} / {scorePages.length}
      </div>
    {/if}
  </div>

  <div class="toolbar-right">
    <!-- 节拍器 -->
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
    justify-content: center;
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

  .page-info {
    font-size: 13px;
    color: #666;
    font-weight: 600;
    background: #f0f0f0;
    padding: 4px 12px;
    border-radius: 12px;
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

    .toolbar-title {
      max-width: 150px;
      font-size: 13px;
    }

    .toolbar-btn {
      width: 32px;
      height: 32px;
    }

    .toolbar-btn svg {
      width: 16px;
      height: 16px;
    }
  }
</style>
