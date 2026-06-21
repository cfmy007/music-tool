import { writable, derived } from 'svelte/store';

interface UIState {
  currentTab: 'tuner' | 'library';
  isMobile: boolean;
  isLandscape: boolean;
  sidebarCollapsed: boolean;
  toolbarVisible: boolean;
  showMetronome: boolean;
  showLayerPanel: boolean;
  showHistoryPanel: boolean;
  selectedMenu: string | null;
  notification: {
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
    visible: boolean;
  } | null;
}

function createUIStore() {
  const initialState: UIState = {
    currentTab: 'tuner',
    isMobile: false,
    isLandscape: false,
    sidebarCollapsed: false,
    toolbarVisible: true,
    showMetronome: false,
    showLayerPanel: false,
    showHistoryPanel: false,
    selectedMenu: null,
    notification: null
  };

  const { subscribe, set, update } = writable<UIState>(initialState);

  // 创建基础store对象
  const baseStore = {
    subscribe,

    // ============ 标签页操作 ============
    setCurrentTab: (tab: 'tuner' | 'library') =>
      update((state) => ({
        ...state,
        currentTab: tab
      })),

    // ============ 响应式操作 ============
    setIsMobile: (isMobile: boolean) =>
      update((state) => ({
        ...state,
        isMobile,
        sidebarCollapsed: isMobile ? true : state.sidebarCollapsed
      })),

    setIsLandscape: (isLandscape: boolean) =>
      update((state) => ({
        ...state,
        isLandscape
      })),

    setOrientation: (width: number, height: number) =>
      update((state) => {
        const isMobile = width < 768;
        const isLandscape = width > height;
        return {
          ...state,
          isMobile,
          isLandscape,
          sidebarCollapsed: isMobile ? true : state.sidebarCollapsed
        };
      }),

    // ============ 侧边栏操作 ============
    toggleSidebar: () =>
      update((state) => ({
        ...state,
        sidebarCollapsed: !state.sidebarCollapsed
      })),

    collapseSidebar: () =>
      update((state) => ({
        ...state,
        sidebarCollapsed: true
      })),

    expandSidebar: () =>
      update((state) => ({
        ...state,
        sidebarCollapsed: false
      })),

    // ============ 工具栏操作 ============
    toggleToolbar: () =>
      update((state) => ({
        ...state,
        toolbarVisible: !state.toolbarVisible
      })),

    showToolbar: () =>
      update((state) => ({
        ...state,
        toolbarVisible: true
      })),

    hideToolbar: () =>
      update((state) => ({
        ...state,
        toolbarVisible: false
      })),

    // ============ 面板操作 ============
    toggleMetronome: () =>
      update((state) => ({
        ...state,
        showMetronome: !state.showMetronome
      })),

    openMetronome: () =>
      update((state) => ({
        ...state,
        showMetronome: true
      })),

    closeMetronome: () =>
      update((state) => ({
        ...state,
        showMetronome: false
      })),

    toggleLayerPanel: () =>
      update((state) => ({
        ...state,
        showLayerPanel: !state.showLayerPanel
      })),

    openLayerPanel: () =>
      update((state) => ({
        ...state,
        showLayerPanel: true
      })),

    closeLayerPanel: () =>
      update((state) => ({
        ...state,
        showLayerPanel: false
      })),

    toggleHistoryPanel: () =>
      update((state) => ({
        ...state,
        showHistoryPanel: !state.showHistoryPanel
      })),

    openHistoryPanel: () =>
      update((state) => ({
        ...state,
        showHistoryPanel: true
      })),

    closeHistoryPanel: () =>
      update((state) => ({
        ...state,
        showHistoryPanel: false
      })),

    // ============ 菜单操作 ============
    selectMenu: (menu: string | null) =>
      update((state) => ({
        ...state,
        selectedMenu: menu
      })),

    // ============ 通知操作 ============
    showNotification: (
      message: string,
      type: 'success' | 'error' | 'info' | 'warning' = 'info',
      duration: number = 3000
    ) => {
      update((state) => ({
        ...state,
        notification: {
          message,
          type,
          visible: true
        }
      }));

      if (duration > 0) {
        setTimeout(() => {
          update((state) => ({
            ...state,
            notification: state.notification ? { ...state.notification, visible: false } : null
          }));
        }, duration);
      }
    },

    hideNotification: () =>
      update((state) => ({
        ...state,
        notification: null
      })),

    // ============ 重置 ============
    reset: () => set(initialState)
  };

  // 派生存储：主题
  const theme = derived<typeof baseStore, 'light' | 'dark'>(baseStore, ($state) => {
    if (typeof window !== 'undefined') {
      const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
      return prefersDark ? 'dark' : 'light';
    }
    return 'light';
  });

  // 派生存储：是否显示移动导航
  const showMobileNav = derived(baseStore, ($state) => $state.isMobile);

  // 派生存储：是否显示侧边栏
  const showSidebar = derived(baseStore, ($state) => !$state.sidebarCollapsed);

  // 派生存储：总面板数（已打开）
  const openPanelCount = derived(baseStore, ($state) => {
    let count = 0;
    if ($state.showMetronome) count++;
    if ($state.showLayerPanel) count++;
    if ($state.showHistoryPanel) count++;
    return count;
  });

  // 派生存储：是否有通知
  const hasNotification = derived(baseStore, ($state) => {
    return $state.notification?.visible || false;
  });

  return {
    ...baseStore,
    theme,
    showMobileNav,
    showSidebar,
    openPanelCount,
    hasNotification
  };
}

export const uiStore = createUIStore();

// 导出类型供外部使用
export type UIStoreType = ReturnType<typeof createUIStore>;
export type UIStateType = UIState;
