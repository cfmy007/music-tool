<script lang="ts">
  import { onMount } from 'svelte';
  import Tuner from '$lib/components/Tuner/Tuner.svelte';
  import FolderTree from '$lib/components/ScoreLibrary/FolderTree.svelte';
  import NoteEditor from '$lib/components/ScoreLibrary/NoteEditor.svelte';
  import { db } from '$lib/db/indexedDB';
  import { scoreStore } from '$lib/stores/scoreStore';
  import type { Note, AppSettings } from '$lib/db/schema';

  let currentTab = $state<'tuner' | 'library'>('tuner');
  let libraryView = $state<'tree' | 'editor'>('tree');
  let selectedNote = $state<Note | null>(null);
  let isLandscape = $state(false);
  let dbReady = $state(false);
  let appSettings = $state<AppSettings | null>(null);

  let windowWidth = $state(0);
  let windowHeight = $state(0);

  onMount(async () => {
    try {
      await db.init();
      dbReady = true;

      // 从存储恢复上次的设置
      appSettings = await db.getAppSettings();
      if (appSettings?.lastActiveTab === 'tuner' || appSettings?.lastActiveTab === 'library') {
        currentTab = appSettings.lastActiveTab;
      }

      // 如果上次在编辑笔记，恢复状态
      if (appSettings?.lastActiveNoteId) {
        const note = await db.getNoteById(appSettings.lastActiveNoteId);
        if (note) {
          selectedNote = note;
          libraryView = 'editor';
          scoreStore.setCurrentNote(note);
        }
      }
    } catch (error) {
      console.error('数据库初始化失败:', error);
    }

    checkOrientation();
  });

  function checkOrientation() {
    isLandscape = windowWidth > windowHeight;
  }

  async function handleTabChange(tab: 'tuner' | 'library') {
    currentTab = tab;
    await saveAppSettings();
  }

  function handleOpenNote(note: Note) {
    selectedNote = note;
    libraryView = 'editor';
    scoreStore.setCurrentNote(note);
    saveAppSettings();
  }

  function handleBackFromEditor() {
    libraryView = 'tree';
    selectedNote = null;
    scoreStore.clearCurrentNote();
    saveAppSettings();
  }

  async function saveAppSettings() {
    try {
      let settings = await db.getAppSettings();
      if (!settings) {
        settings = {
          key: 'global',
          lastActiveTab: currentTab,
          lastActiveNoteId: selectedNote?.id || null,
          tunerMode: 'chromatic',
          metronomeSettings: {
            bpm: 120,
            timeSignature: '4/4',
            sound: 'beep'
          },
          exportFormat: 'json',
          updatedAt: Date.now()
        };
      } else {
        settings.lastActiveTab = currentTab;
        settings.lastActiveNoteId = selectedNote?.id || null;
        settings.updatedAt = Date.now();
      }
      await db.updateAppSettings(settings);
    } catch (error) {
      console.error('保存应用设置失败:', error);
    }
  }
</script>

<svelte:window
  bind:innerWidth={windowWidth}
  bind:innerHeight={windowHeight}
  onresize={checkOrientation}
/>

{#if !dbReady}
  <div class="loading-container">
    <div class="spinner"></div>
    <p>初始化数据库中...</p>
  </div>
{:else}
  <div class="app-container" class:landscape={isLandscape} class:portrait={!isLandscape}>
    <!-- 横屏：左侧导航栏 -->
    {#if isLandscape}
      <nav class="navbar navbar-landscape">
        <div class="nav-content">
          <button
            class="nav-item"
            class:active={currentTab === 'tuner'}
            onclick={() => handleTabChange('tuner')}
            title="调音器"
          >
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z"
              />
            </svg>
            <span>调音器</span>
          </button>

          <button
            class="nav-item"
            class:active={currentTab === 'library'}
            onclick={() => handleTabChange('library')}
            title="乐谱库"
          >
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 6.253v13m0-13C6.5 6.253 2 10.753 2 16.5S6.5 26.747 12 26.747s10-4.5 10-10.247S17.5 6.253 12 6.253z"
              />
            </svg>
            <span>乐谱库</span>
          </button>
        </div>
      </nav>

      <!-- 横屏：主内容区域 -->
      <main class="main-content">
        {#if currentTab === 'tuner'}
          <Tuner />
        {:else if currentTab === 'library'}
          {#if libraryView === 'tree'}
            <FolderTree onopenNote={handleOpenNote} />
          {:else if libraryView === 'editor' && selectedNote}
            <NoteEditor {selectedNote} onback={handleBackFromEditor} />
          {/if}
        {/if}
      </main>
    {:else}
      <!-- 竖屏：主内容区域 -->
      <main class="main-content portrait-main">
        {#if currentTab === 'tuner'}
          <Tuner />
        {:else if currentTab === 'library'}
          {#if libraryView === 'tree'}
            <FolderTree onopenNote={handleOpenNote} />
          {:else if libraryView === 'editor' && selectedNote}
            <NoteEditor {selectedNote} onback={handleBackFromEditor} />
          {/if}
        {/if}
      </main>

      <!-- 竖屏：底部导航栏 -->
      <nav class="navbar navbar-portrait">
        <button
          class="nav-item"
          class:active={currentTab === 'tuner'}
          onclick={() => handleTabChange('tuner')}
          title="调音器"
        >
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z"
            />
          </svg>
          <span>调音器</span>
        </button>

        <button
          class="nav-item"
          class:active={currentTab === 'library'}
          onclick={() => handleTabChange('library')}
          title="乐谱库"
        >
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 6.253v13m0-13C6.5 6.253 2 10.753 2 16.5S6.5 26.747 12 26.747s10-4.5 10-10.247S17.5 6.253 12 6.253z"
            />
          </svg>
          <span>乐谱库</span>
        </button>
      </nav>
    {/if}
  </div>
{/if}

<style>
  :global(*) {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  :global(body) {
    font-family:
      -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    background-color: #f5f5f5;
  }

  .loading-container {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    height: 100vh;
    width: 100vw;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
  }

  .spinner {
    width: 50px;
    height: 50px;
    border: 4px solid rgba(255, 255, 255, 0.3);
    border-radius: 50%;
    border-top-color: white;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .loading-container p {
    margin-top: 16px;
    font-size: 16px;
  }

  .app-container {
    display: flex;
    height: 100vh;
    width: 100vw;
    background-color: #f5f5f5;
  }

  .app-container.landscape {
    flex-direction: row;
  }

  .app-container.portrait {
    flex-direction: column;
  }

  /* ============ 横屏导航栏 ============ */
  .navbar-landscape {
    width: 80px;
    background: linear-gradient(180deg, #667eea 0%, #764ba2 100%);
    display: flex;
    flex-direction: column;
    align-items: center;
    padding-top: 16px;
    box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1);
    z-index: 100;
  }

  .navbar-landscape .nav-content {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .navbar-landscape .nav-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    background: none;
    border: none;
    color: rgba(255, 255, 255, 0.7);
    cursor: pointer;
    transition: all 0.3s ease;
    padding: 12px;
    border-radius: 12px;
    font-size: 12px;
  }

  .navbar-landscape .nav-item:hover {
    color: white;
    background: rgba(255, 255, 255, 0.1);
  }

  .navbar-landscape .nav-item.active {
    color: white;
    background: rgba(255, 255, 255, 0.25);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  /* ============ 竖屏导航栏 ============ */
  .navbar-portrait {
    height: 70px;
    background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
    display: flex;
    justify-content: space-around;
    align-items: center;
    box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.1);
    z-index: 100;
  }

  .navbar-portrait .nav-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    background: none;
    border: none;
    color: rgba(255, 255, 255, 0.7);
    cursor: pointer;
    transition: all 0.3s ease;
    padding: 8px;
    border-radius: 8px;
    font-size: 11px;
    flex: 1;
    height: 100%;
    justify-content: center;
  }

  .navbar-portrait .nav-item:hover {
    color: white;
    background: rgba(255, 255, 255, 0.1);
  }

  .navbar-portrait .nav-item.active {
    color: white;
    background: rgba(255, 255, 255, 0.25);
  }

  /* ============ 导航项共同样式 ============ */
  .nav-item {
    outline: none;
  }

  .nav-item:focus-visible {
    outline: 2px solid rgba(255, 255, 255, 0.5);
    outline-offset: 2px;
  }

  .nav-icon {
    width: 24px;
    height: 24px;
  }

  /* ============ 主内容区域 ============ */
  .main-content {
    flex: 1;
    overflow: hidden;
    background-color: #f5f5f5;
  }

  .portrait-main {
    flex: 1;
  }

  /* ============ 响应式调整 ============ */
  @media (max-width: 768px) {
    .navbar-landscape {
      width: 70px;
      padding-top: 12px;
    }

    .navbar-landscape .nav-content {
      gap: 16px;
    }

    .navbar-landscape .nav-item {
      font-size: 10px;
      padding: 8px;
      gap: 6px;
    }

    .nav-icon {
      width: 20px;
      height: 20px;
    }
  }

  @media (max-width: 480px) {
    .navbar-portrait {
      height: 60px;
    }

    .navbar-portrait .nav-item {
      font-size: 9px;
      gap: 2px;
      padding: 6px;
    }

    .nav-icon {
      width: 18px;
      height: 18px;
    }
  }
</style>
