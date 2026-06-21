<script lang="ts">
  import { onMount } from 'svelte';
  import { db } from '$lib/db/indexedDB';
  import type { HistoryRecord, Note } from '$lib/db/schema';

  let historyRecords: Array<HistoryRecord & { note?: Note }> = [];
  let isLoading = true;

  onMount(async () => {
    await loadHistory();
  });

  async function loadHistory() {
    try {
      const records = await db.getHistory(50);
      historyRecords = records;
      isLoading = false;
    } catch (error) {
      console.error('加载历史记录失败:', error);
      isLoading = false;
    }
  }

  async function clearHistory() {
    if (confirm('确定要清空所有历史记录吗？')) {
      // 实现清空逻辑
      historyRecords = [];
    }
  }
</script>

<div class="history-container">
  <div class="history-header">
    <h2>最近访问</h2>
    {#if historyRecords.length > 0}
      <button class="clear-btn" on:click={clearHistory}>清空</button>
    {/if}
  </div>

  <div class="history-content">
    {#if isLoading}
      <div class="loading">加载中...</div>
    {:else if historyRecords.length === 0}
      <div class="empty">
        <p>暂无历史记录</p>
      </div>
    {:else}
      <div class="history-list">
        {#each historyRecords as record (record.id)}
          <div class="history-item">
            <span class="time">
              {new Date(record.lastAccessTime).toLocaleString()}
            </span>
            <span class="title">{record.id}</span>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  .history-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    background-color: #f5f5f5;
  }

  .history-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px;
    background: white;
    border-bottom: 1px solid #e0e0e0;
  }

  .history-header h2 {
    margin: 0;
    font-size: 18px;
    color: #333;
  }

  .clear-btn {
    padding: 6px 12px;
    border: 1px solid #f87171;
    background: white;
    color: #f87171;
    border-radius: 6px;
    cursor: pointer;
    font-size: 12px;
    transition: all 0.2s;
  }

  .clear-btn:hover {
    background: #f87171;
    color: white;
  }

  .history-content {
    flex: 1;
    overflow-y: auto;
  }

  .loading,
  .empty {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: #999;
  }

  .history-list {
    padding: 12px;
  }

  .history-item {
    display: flex;
    flex-direction: column;
    padding: 12px;
    background: white;
    border-radius: 8px;
    margin-bottom: 8px;
    border-left: 4px solid #667eea;
  }

  .history-item:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .time {
    font-size: 12px;
    color: #999;
  }

  .title {
    font-size: 14px;
    color: #333;
    margin-top: 4px;
    font-weight: 500;
  }

  @media (max-width: 480px) {
    .history-header {
      padding: 12px;
    }

    .history-header h2 {
      font-size: 16px;
    }

    .history-item {
      padding: 10px;
      margin-bottom: 6px;
    }
  }
</style>
