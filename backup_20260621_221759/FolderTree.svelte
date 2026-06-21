<script lang="ts">
  import { onMount } from 'svelte';
  import type { Folder, Note } from '$lib/db/schema';
  import { db } from '$lib/db/indexedDB';
  import { dragSort } from '$lib/utils/dragSort';
  import { v4 as uuidv4 } from 'uuid';

  let folders = $state<Folder[]>([]);
  let notes = $state<Note[]>([]);
  let currentParentId = $state<string | null>(null);
  let navigationStack = $state<Array<{ id: string | null; name: string }>>([
    { id: null, name: '根目录' }
  ]);

  let showNewFolderDialog = $state(false);
  let showNewNoteDialog = $state(false);
  let newName = $state('');
  let editingId = $state<string | null>(null);
  let treeListContainer = $state<HTMLElement | null>(null);
  let isLoading = $state(true);

  let { onopenNote } = $props<{
    onopenNote: (note: Note) => void;
  }>();

  function selectOnFocus(node: HTMLInputElement) {
    node.focus();
    node.select();
  }

  onMount(async () => {
    // 确保数据库已初始化
    try {
      await db.init();
    } catch (error) {
      console.error('数据库初始化失败:', error);
    }

    await loadCurrentLevel();
    isLoading = false;
  });

  async function loadCurrentLevel() {
    try {
      isLoading = true;

      const parentIdForQuery = currentParentId === null ? '' : currentParentId;
      folders = await db.getFoldersByParent(parentIdForQuery);

      const notesParentId = currentParentId === null ? '' : currentParentId;
      notes = await db.getNotesByFolder(notesParentId);

      // 合并后再排序
      await updateTreeListOrder();
    } catch (error) {
      console.error('加载失败:', error);
      folders = [];
      notes = [];
    } finally {
      isLoading = false;
    }
  }

  /**
   * 更新树列表排序
   */
  async function updateTreeListOrder() {
    // 获取所有项并按sortIndex排序
    const allItems = [
      ...folders.map((f) => ({ ...f, type: 'folder' as const })),
      ...notes.map((n) => ({ ...n, type: 'note' as const }))
    ];

    // 按sortIndex排序
    allItems.sort((a, b) => a.sortIndex - b.sortIndex);

    // 分离回文件夹和笔记
    folders = allItems.filter((item) => item.type === 'folder') as any;
    notes = allItems.filter((item) => item.type === 'note') as any;
  }

  async function createNewFolder() {
    if (!newName.trim()) return;

    const folder: Folder = {
      id: uuidv4(),
      parentId: currentParentId || '',
      name: newName,
      sortIndex: folders.length + notes.length,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    try {
      await db.createFolder(folder);
      folders = [...folders, folder];
      newName = '';
      showNewFolderDialog = false;
    } catch (error) {
      console.error('创建文件夹失败:', error);
    }
  }

  async function createNewNote() {
    if (!newName.trim()) return;

    const note: Note = {
      id: uuidv4(),
      folderId: currentParentId || '',
      title: newName,
      sortIndex: folders.length + notes.length,
      viewMode: 'score',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    try {
      await db.createNote(note);
      notes = [...notes, note];
      newName = '';
      showNewNoteDialog = false;
    } catch (error) {
      console.error('创建笔记失败:', error);
    }
  }

  /**
   * 递归删除文件夹及其所有内容
   */
  async function recursiveDeleteFolder(folderId: string): Promise<void> {
    // 获取该文件夹的所有子文件夹
    const subFolders = await db.getFoldersByParent(folderId);

    // 递归删除所有子文件夹
    for (const subFolder of subFolders) {
      await recursiveDeleteFolder(subFolder.id);
    }

    // 获取该文件夹的所有笔记并删除
    const notesInFolder = await db.getNotesByFolder(folderId);
    for (const note of notesInFolder) {
      await db.deleteNote(note.id);
    }

    // 删除文件夹本身
    await db.deleteFolder(folderId);
  }

  async function deleteFolder(folderId: string) {
    if (!confirm('确定要删除此文件夹及其所有内容吗？')) return;

    try {
      await recursiveDeleteFolder(folderId);
      folders = folders.filter((f) => f.id !== folderId);
    } catch (error) {
      console.error('删除文件夹失败:', error);
    }
  }

  async function deleteNote(noteId: string) {
    if (!confirm('确定要删除此笔记吗？')) return;

    try {
      await db.deleteNote(noteId);
      notes = notes.filter((n) => n.id !== noteId);
    } catch (error) {
      console.error('删除笔记失败:', error);
    }
  }

  /**
   * 重命名项目（文件夹或笔记）
   */
  async function renameItem(id: string, newItemName: string, isFolder: boolean): Promise<void> {
    if (!newItemName.trim()) {
      editingId = null;
      return;
    }

    try {
      if (isFolder) {
        const folder = folders.find((f) => f.id === id);
        if (folder) {
          folder.name = newItemName;
          folder.updatedAt = Date.now();
          await db.updateFolder($state.snapshot(folder));
          folders = [...folders];
        }
      } else {
        const note = notes.find((n) => n.id === id);
        if (note) {
          note.title = newItemName;
          note.updatedAt = Date.now();
          await db.updateNote($state.snapshot(note));
          notes = [...notes];
        }
      }
      editingId = null;
    } catch (error) {
      console.error('重命名失败:', error);
    }
  }

  function openFolder(folder: Folder) {
    currentParentId = folder.id;
    navigationStack = [...navigationStack, { id: folder.id, name: folder.name }];
    loadCurrentLevel();
  }

  function goToFolder(index: number) {
    navigationStack = navigationStack.slice(0, index + 1);
    currentParentId = navigationStack[index].id;
    loadCurrentLevel();
  }

  function handleOpenNote(note: Note) {
    onopenNote(note);
  }

  function goBack() {
    if (navigationStack.length > 1) {
      navigationStack = navigationStack.slice(0, -1);
      currentParentId = navigationStack[navigationStack.length - 1].id;
      loadCurrentLevel();
    }
  }

  /**
   * 处理拖拽结束
   */
  async function handleDragEnd(fromIndex: number, toIndex: number) {
    if (fromIndex === toIndex) return;

    try {
      const allItems = getCombinedItems();

      if (fromIndex >= allItems.length || toIndex >= allItems.length) return;

      const draggedItem = allItems[fromIndex];
      const targetItem = allItems[toIndex];

      let newSortIndex: number;
      if (toIndex > fromIndex) {
        newSortIndex = targetItem.data.sortIndex + 0.5;
      } else {
        newSortIndex = targetItem.data.sortIndex - 0.5;
      }

      draggedItem.data.sortIndex = newSortIndex;
      draggedItem.data.updatedAt = Date.now();

      if (draggedItem.type === 'folder') {
        await db.updateFolder(draggedItem.data as Folder);
      } else {
        await db.updateNote(draggedItem.data as Note);
      }

      await loadCurrentLevel();
    } catch (error) {
      console.error('拖拽排序失败:', error);
    }
  }

  /**
   * 获取组合列表（文件夹 + 笔记）
   */
  function getCombinedItems() {
    const items: Array<{
      id: string;
      name: string;
      type: 'folder' | 'note';
      data: Folder | Note;
    }> = [];

    folders.forEach((folder) => {
      items.push({
        id: folder.id,
        name: folder.name,
        type: 'folder',
        data: folder
      });
    });

    notes.forEach((note) => {
      items.push({
        id: note.id,
        name: note.title,
        type: 'note',
        data: note
      });
    });

    items.sort((a, b) => a.data.sortIndex - b.data.sortIndex);
    return items;
  }
</script>

<div class="folder-tree">
  <div class="tree-header">
    <div class="breadcrumb">
      {#each navigationStack as crumb, index (crumb.id)}
        <button
          class="breadcrumb-item"
          class:active={index === navigationStack.length - 1}
          onclick={() => goToFolder(index)}
        >
          {crumb.name}
        </button>
        {#if index < navigationStack.length - 1}
          <span class="separator">/</span>
        {/if}
      {/each}
    </div>

    <div class="header-actions">
      {#if navigationStack.length > 1}
        <button class="action-btn back-btn" title="返回上级" onclick={goBack} aria-label="返回上级">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
      {/if}

      <button
        class="action-btn"
        title="新建文件夹"
        onclick={() => (showNewFolderDialog = true)}
        aria-label="新建文件夹"
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
      <button
        class="action-btn"
        title="新建笔记"
        onclick={() => (showNewNoteDialog = true)}
        aria-label="新建笔记"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
          />
        </svg>
      </button>
    </div>
  </div>

  <div class="tree-content">
    {#if isLoading}
      <div class="loading-state">
        <div class="spinner"></div>
        <p>加载中...</p>
      </div>
    {:else if getCombinedItems().length === 0}
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z"
          />
        </svg>
        <p>暂无内容</p>
        <small>点击上方按钮创建新内容</small>
      </div>
    {:else}
      <div
        class="tree-list"
        bind:this={treeListContainer}
        use:dragSort={{
          draggableClass: 'draggable-item',
          dragOverClass: 'drag-over',
          ghostClass: 'ghost',
          animationDuration: 150,
          onDragEnd: handleDragEnd
        }}
      >
        {#each getCombinedItems() as item (item.id)}
          <div
            class="tree-item draggable-item"
            class:folder-item={item.type === 'folder'}
            class:note-item={item.type === 'note'}
          >
            {#if editingId === item.id}
              <div class="edit-container" role="presentation" onclick={(e) => e.stopPropagation()}>
                <input
                  type="text"
                  bind:value={item.name}
                  use:selectOnFocus
                  onblur={() => {
                    renameItem(item.id, item.name, item.type === 'folder');
                  }}
                  onkeydown={(e) => {
                    if (e.key === 'Enter') {
                      renameItem(item.id, item.name, item.type === 'folder');
                    } else if (e.key === 'Escape') {
                      editingId = null;
                    }
                  }}
                />
                <button
                  class="btn-save"
                  onclick={() => renameItem(item.id, item.name, item.type === 'folder')}
                  title="保存"
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="16"
                    height="16"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="3"
                  >
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </button>
              </div>
            {:else if item.type === 'folder'}
              <button class="item-content" onclick={() => openFolder(item.data as Folder)}>
                <svg class="item-icon" viewBox="0 0 24 24" fill="currentColor">
                  <path
                    d="M3 3h8l2 2h8a2 2 0 012 2v12a2 2 0 01-2 2H3a2 2 0 01-2-2V5a2 2 0 012-2z"
                  />
                </svg>
                <span class="item-name">{item.name}</span>
              </button>

              <div class="item-actions">
                <button
                  class="action-icon"
                  title="重命名"
                  onclick={() => (editingId = item.id)}
                  aria-label="重命名"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                </button>
                <button
                  class="action-icon danger"
                  title="删除"
                  onclick={() => deleteFolder(item.id)}
                  aria-label="删除文件夹"
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
              </div>
            {:else}
              <div
                class="item-content"
                onclick={() => handleOpenNote(item.data as Note)}
                role="button"
                onkeydown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleOpenNote(item.data as Note);
                  }
                }}
                tabindex="0"
              >
                <svg class="item-icon" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9 3H5a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V9h-6V3z" />
                </svg>
                <span class="item-name">{item.name}</span>
              </div>

              <div class="item-actions">
                <button
                  class="action-icon"
                  title="重命名"
                  onclick={() => (editingId = item.id)}
                  aria-label="重命名"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                </button>
                <button
                  class="action-icon danger"
                  title="删除"
                  onclick={(e) => {
                    e.stopPropagation();
                    deleteNote(item.id);
                  }}
                  aria-label="删除笔记"
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
              </div>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>

<!-- 新建文件夹对话框 -->
{#if showNewFolderDialog}
  <div
    class="dialog-overlay"
    role="button"
    tabindex="0"
    onclick={() => (showNewFolderDialog = false)}
    onkeydown={(e) => e.key === 'Escape' && (showNewFolderDialog = false)}
  >
    <div role="presentation" class="dialog" onclick={(e) => e.stopPropagation()}>
      <h3>新建文件夹</h3>
      <input
        type="text"
        placeholder="输入文件夹名称"
        bind:value={newName}
        use:selectOnFocus
        onkeydown={(e) => {
          if (e.key === 'Enter') {
            createNewFolder();
          } else if (e.key === 'Escape') {
            showNewFolderDialog = false;
          }
        }}
      />
      <div class="dialog-actions">
        <button class="btn-cancel" onclick={() => (showNewFolderDialog = false)}> 取消 </button>
        <button class="btn-primary" onclick={createNewFolder}>创建</button>
      </div>
    </div>
  </div>
{/if}

<!-- 新建笔记对话框 -->
{#if showNewNoteDialog}
  <div
    class="dialog-overlay"
    role="button"
    tabindex="0"
    onclick={() => (showNewNoteDialog = false)}
    onkeydown={(e) => e.key === 'Escape' && (showNewNoteDialog = false)}
  >
    <div class="dialog" onclick={(e) => e.stopPropagation()} role="presentation">
      <h3>新建笔记</h3>
      <input
        type="text"
        placeholder="输入笔记名称"
        bind:value={newName}
        use:selectOnFocus
        onkeydown={(e) => {
          if (e.key === 'Enter') {
            createNewNote();
          } else if (e.key === 'Escape') {
            showNewNoteDialog = false;
          }
        }}
      />
      <div class="dialog-actions">
        <button class="btn-cancel" onclick={() => (showNewNoteDialog = false)}> 取消 </button>
        <button class="btn-primary" onclick={createNewNote}>创建</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .folder-tree {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .tree-header {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    background: white;
    border-bottom: 1px solid #e0e0e0;
    gap: 16px;
  }

  .breadcrumb {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .breadcrumb-item {
    padding: 4px 8px;
    background: #f5f5f5;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    color: #666;
    transition: all 0.2s;
  }

  .breadcrumb-item:hover {
    background: #e0e0e0;
  }

  .breadcrumb-item.active {
    background: #667eea;
    color: white;
    font-weight: 600;
  }

  .separator {
    color: #999;
    font-size: 12px;
  }

  .header-actions {
    display: flex;
    gap: 8px;
  }

  .action-btn {
    width: 36px;
    height: 36px;
    border: none;
    background: #667eea;
    border-radius: 6px;
    cursor: pointer;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
  }

  .action-btn:hover {
    background: #5568d3;
    transform: scale(1.05);
  }

  .action-btn.back-btn {
    background: #764ba2;
  }

  .action-btn.back-btn:hover {
    background: #6a3d92;
  }

  .action-btn svg {
    width: 18px;
    height: 18px;
  }

  .tree-content {
    flex: 1;
    overflow-y: auto;
    padding: 8px;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: #999;
    gap: 12px;
  }

  .empty-state svg {
    width: 64px;
    height: 64px;
    opacity: 0.3;
  }

  .empty-state p {
    margin: 0;
    font-size: 16px;
    font-weight: 500;
  }

  .empty-state small {
    font-size: 12px;
    opacity: 0.7;
  }

  .tree-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .tree-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    background: white;
    border-radius: 6px;
    border-left: 4px solid #667eea;
    transition: all 0.2s;
    cursor: move;
  }

  .tree-item.folder-item {
    border-left-color: #667eea;
  }

  .tree-item.note-item {
    border-left-color: #764ba2;
    cursor: pointer;
  }

  .tree-item:hover {
    background: #f9f9f9;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
  }

  .item-content {
    display: flex;
    align-items: center;
    gap: 12px;
    flex: 1;
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
  }

  .item-icon {
    width: 20px;
    height: 20px;
    color: #667eea;
    flex-shrink: 0;
  }

  .tree-item.note-item .item-icon {
    color: #764ba2;
  }

  .item-name {
    font-size: 14px;
    color: #333;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    text-align: left;
  }

  .item-actions {
    display: flex;
    gap: 6px;
    opacity: 0;
    transition: opacity 0.2s;
  }

  .tree-item:hover .item-actions {
    opacity: 1;
  }

  .action-icon {
    width: 28px;
    height: 28px;
    border: none;
    background: transparent;
    border-radius: 4px;
    cursor: pointer;
    color: #666;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    flex-shrink: 0;
  }

  .action-icon:hover {
    background: #f0f0f0;
    color: #333;
  }

  .action-icon.danger:hover {
    background: #fee;
    color: #f87171;
  }

  .action-icon svg {
    width: 16px;
    height: 16px;
  }

  .tree-item input {
    flex: 1;
    padding: 6px 8px;
    border: 1px solid #667eea;
    border-radius: 4px;
    font-size: 14px;
  }

  .tree-item input:focus {
    outline: none;
    border-color: #764ba2;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }

  /* 对话框 */
  .dialog-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .dialog {
    background: white;
    border-radius: 12px;
    padding: 24px;
    min-width: 300px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
    animation: slideUp 0.3s ease-out;
  }

  @keyframes slideUp {
    from {
      transform: translateY(20px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  .dialog h3 {
    margin: 0 0 16px 0;
    font-size: 18px;
    color: #333;
  }

  .dialog input {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid #ddd;
    border-radius: 6px;
    font-size: 14px;
    margin-bottom: 16px;
    box-sizing: border-box;
  }

  .dialog input:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }

  .dialog-actions {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
  }

  .btn-cancel,
  .btn-primary {
    padding: 8px 16px;
    border: 1px solid #ddd;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.2s;
  }

  .btn-cancel {
    background: white;
    color: #666;
  }

  .btn-cancel:hover {
    background: #f5f5f5;
  }

  .btn-primary {
    background: #667eea;
    color: white;
    border-color: #667eea;
  }

  .btn-primary:hover {
    background: #5568d3;
  }

  @media (max-width: 480px) {
    .tree-header {
      padding: 8px 12px;
      gap: 8px;
    }

    .action-btn {
      width: 32px;
      height: 32px;
    }

    .breadcrumb {
      gap: 4px;
    }

    .breadcrumb-item {
      padding: 2px 6px;
      font-size: 11px;
    }

    .tree-item {
      padding: 8px 10px;
    }

    .item-content {
      gap: 8px;
    }

    .item-icon {
      width: 18px;
      height: 18px;
    }

    .item-name {
      font-size: 13px;
    }

    .dialog {
      min-width: 280px;
      padding: 16px;
    }

    .dialog h3 {
      font-size: 16px;
      margin-bottom: 12px;
    }
  }

  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    gap: 16px;
  }

  .spinner {
    width: 40px;
    height: 40px;
    border: 4px solid #f3f3f3;
    border-top: 4px solid #667eea;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }

  .loading-state p {
    color: #999;
    font-size: 14px;
  }
</style>
