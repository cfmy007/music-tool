import { writable, derived } from 'svelte/store';

interface HistoryItem {
  id: string;
  type: 'note' | 'folder' | 'page' | 'layer';
  action: 'create' | 'update' | 'delete' | 'open';
  title: string;
  timestamp: number;
  icon?: string;
  metadata?: Record<string, unknown>;
}

interface HistoryState {
  items: HistoryItem[];
  maxItems: number;
  currentIndex: number;
}

function createHistoryStore() {
  const initialState: HistoryState = {
    items: [],
    maxItems: 100,
    currentIndex: -1
  };

  const { subscribe, set, update } = writable<HistoryState>(initialState);

  const historyStore = {
    subscribe,

    // ============ 历史记录操作 ============
    addItem: (item: Omit<HistoryItem, 'id' | 'timestamp'>) =>
      update((state) => {
        const newItem: HistoryItem = {
          id: `${Date.now()}-${Math.random()}`,
          timestamp: Date.now(),
          ...item
        };

        // 移除当前索引后的所有项（重做历史）
        const newItems = [...state.items.slice(0, state.currentIndex + 1), newItem];

        // 限制最大记录数
        if (newItems.length > state.maxItems) {
          newItems.shift();
        }

        return {
          ...state,
          items: newItems,
          currentIndex: newItems.length - 1
        };
      }),

    addNoteHistory: (noteTitle: string, action: 'create' | 'update' | 'delete' | 'open') =>
      update((state) => {
        const newItem: HistoryItem = {
          id: `${Date.now()}-${Math.random()}`,
          type: 'note',
          action,
          title: noteTitle,
          timestamp: Date.now(),
          icon: '📝'
        };

        const newItems = [...state.items.slice(0, state.currentIndex + 1), newItem];
        if (newItems.length > state.maxItems) newItems.shift();

        return {
          ...state,
          items: newItems,
          currentIndex: newItems.length - 1
        };
      }),

    addFolderHistory: (folderName: string, action: 'create' | 'update' | 'delete') =>
      update((state) => {
        const newItem: HistoryItem = {
          id: `${Date.now()}-${Math.random()}`,
          type: 'folder',
          action,
          title: folderName,
          timestamp: Date.now(),
          icon: '📁'
        };

        const newItems = [...state.items.slice(0, state.currentIndex + 1), newItem];
        if (newItems.length > state.maxItems) newItems.shift();

        return {
          ...state,
          items: newItems,
          currentIndex: newItems.length - 1
        };
      }),

    addPageHistory: (pageName: string, action: 'create' | 'delete') =>
      update((state) => {
        const newItem: HistoryItem = {
          id: `${Date.now()}-${Math.random()}`,
          type: 'page',
          action,
          title: pageName,
          timestamp: Date.now(),
          icon: '📄'
        };

        const newItems = [...state.items.slice(0, state.currentIndex + 1), newItem];
        if (newItems.length > state.maxItems) newItems.shift();

        return {
          ...state,
          items: newItems,
          currentIndex: newItems.length - 1
        };
      }),

    addLayerHistory: (layerName: string, action: 'create' | 'delete') =>
      update((state) => {
        const newItem: HistoryItem = {
          id: `${Date.now()}-${Math.random()}`,
          type: 'layer',
          action,
          title: layerName,
          timestamp: Date.now(),
          icon: '🎨'
        };

        const newItems = [...state.items.slice(0, state.currentIndex + 1), newItem];
        if (newItems.length > state.maxItems) newItems.shift();

        return {
          ...state,
          items: newItems,
          currentIndex: newItems.length - 1
        };
      }),

    // ============ 撤销/重做 ============
    undo: () =>
      update((state) => ({
        ...state,
        currentIndex: Math.max(0, state.currentIndex - 1)
      })),

    redo: () =>
      update((state) => ({
        ...state,
        currentIndex: Math.min(state.items.length - 1, state.currentIndex + 1)
      })),

    goToItem: (index: number) =>
      update((state) => ({
        ...state,
        currentIndex: Math.max(0, Math.min(index, state.items.length - 1))
      })),

    // ============ 历史记录管理 ============
    clearHistory: () =>
      update((state) => ({
        ...state,
        items: [],
        currentIndex: -1
      })),

    removeItem: (itemId: string) =>
      update((state) => {
        const newItems = state.items.filter((item) => item.id !== itemId);
        return {
          ...state,
          items: newItems,
          currentIndex: Math.min(state.currentIndex, newItems.length - 1)
        };
      }),

    setMaxItems: (maxItems: number) =>
      update((state) => {
        const newItems = state.items.slice(Math.max(0, state.items.length - maxItems));
        return {
          ...state,
          items: newItems,
          maxItems,
          currentIndex: Math.min(state.currentIndex, newItems.length - 1)
        };
      }),

    // ============ 搜索和过滤 ============
    searchHistory: (query: string): HistoryItem[] => {
      let state: HistoryState;
      subscribe((s) => (state = s))();

      return state!.items.filter(
        (item) =>
          item.title.toLowerCase().includes(query.toLowerCase()) ||
          item.type.includes(query.toLowerCase()) ||
          item.action.includes(query.toLowerCase())
      );
    },

    filterByType: (type: 'note' | 'folder' | 'page' | 'layer'): HistoryItem[] => {
      let state: HistoryState;
      subscribe((s) => (state = s))();
      return state!.items.filter((item) => item.type === type);
    },

    filterByAction: (action: 'create' | 'update' | 'delete' | 'open'): HistoryItem[] => {
      let state: HistoryState;
      subscribe((s) => (state = s))();
      return state!.items.filter((item) => item.action === action);
    },

    getItemsByDateRange: (startDate: Date, endDate: Date): HistoryItem[] => {
      let state: HistoryState;
      subscribe((s) => (state = s))();
      const start = startDate.getTime();
      const end = endDate.getTime();
      return state!.items.filter((item) => item.timestamp >= start && item.timestamp <= end);
    },

    // ============ 导出 ============
    exportHistory: (): string => {
      let state: HistoryState;
      subscribe((s) => (state = s))();
      return JSON.stringify(state!.items, null, 2);
    },

    // ============ 重置 ============
    reset: () => set(initialState)
  };

  // 派生存储：是否可撤销
  const canUndo = derived<typeof historyStore, boolean>(
    historyStore,
    ($state) => $state.currentIndex > 0
  );

  // 派生存储：是否可重做
  const canRedo = derived<typeof historyStore, boolean>(
    historyStore,
    ($state) => $state.currentIndex < $state.items.length - 1
  );

  // 派生存储：最近访问
  const recentItems = derived<typeof historyStore, HistoryItem[]>(historyStore, ($state) => {
    return $state.items.filter((item) => item.action === 'open').slice(0, 10);
  });

  // 派生存储：按日期分组
  const groupedByDate = derived<typeof historyStore, Map<string, HistoryItem[]>>(
    historyStore,
    ($state) => {
      const grouped = new Map<string, HistoryItem[]>();

      $state.items.forEach((item) => {
        const date = new Date(item.timestamp).toLocaleDateString('zh-CN');
        if (!grouped.has(date)) {
          grouped.set(date, []);
        }
        grouped.get(date)!.push(item);
      });

      return grouped;
    }
  );

  return {
    ...historyStore,
    canUndo,
    canRedo,
    recentItems,
    groupedByDate
  };
}

export const historyStore = createHistoryStore();
