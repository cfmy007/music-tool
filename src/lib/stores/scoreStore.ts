import { writable, derived } from 'svelte/store';
import type { Note, ScorePage, NoteLayer } from '../db/schema';

interface ScoreState {
  currentNote: Note | null;
  currentPages: ScorePage[];
  currentLayers: NoteLayer[];
  currentPageIndex: number;
  selectedLayerId: string | null;
  isDrawing: boolean;
  drawingColor: string;
  drawingSize: number;
  viewMode: 'score' | 'note';
  zoomLevel: number;
  scrollX: number;
  scrollY: number;
}

function createScoreStore() {
  const initialState: ScoreState = {
    currentNote: null,
    currentPages: [],
    currentLayers: [],
    currentPageIndex: 0,
    selectedLayerId: null,
    isDrawing: false,
    drawingColor: '#000000',
    drawingSize: 3,
    viewMode: 'score',
    zoomLevel: 1,
    scrollX: 0,
    scrollY: 0
  };

  const { subscribe, set, update } = writable<ScoreState>(initialState);

  const baseStore = {
    subscribe,

    // ============ 笔记操作 ============
    setCurrentNote: (note: Note) =>
      update((state) => ({
        ...state,
        currentNote: note,
        viewMode: note.viewMode
      })),

    clearCurrentNote: () => set(initialState),

    updateNoteTitle: (title: string) =>
      update((state) => {
        if (state.currentNote) {
          state.currentNote.title = title;
        }
        return state;
      }),

    updateNoteViewMode: (viewMode: 'score' | 'note') =>
      update((state) => ({
        ...state,
        viewMode,
        currentNote: state.currentNote ? { ...state.currentNote, viewMode } : null
      })),

    // ============ 页面操作 ============
    setCurrentPages: (pages: ScorePage[]) =>
      update((state) => ({
        ...state,
        currentPages: pages,
        currentPageIndex: 0
      })),

    addPage: (page: ScorePage) =>
      update((state) => ({
        ...state,
        currentPages: [...state.currentPages, page]
      })),

    removePage: (pageId: string) =>
      update((state) => {
        const newPages = state.currentPages.filter((p) => p.id !== pageId);
        return {
          ...state,
          currentPages: newPages,
          currentPageIndex: Math.min(state.currentPageIndex, Math.max(0, newPages.length - 1))
        };
      }),

    updatePage: (pageId: string, updates: Partial<ScorePage>) =>
      update((state) => ({
        ...state,
        currentPages: state.currentPages.map((p) => (p.id === pageId ? { ...p, ...updates } : p))
      })),

    setCurrentPageIndex: (index: number) =>
      update((state) => ({
        ...state,
        currentPageIndex: Math.max(0, Math.min(index, state.currentPages.length - 1))
      })),

    nextPage: () =>
      update((state) => ({
        ...state,
        currentPageIndex: Math.min(state.currentPageIndex + 1, state.currentPages.length - 1)
      })),

    prevPage: () =>
      update((state) => ({
        ...state,
        currentPageIndex: Math.max(state.currentPageIndex - 1, 0)
      })),

    goToPage: (index: number) =>
      update((state) => ({
        ...state,
        currentPageIndex: Math.max(0, Math.min(index, state.currentPages.length - 1))
      })),

    reorderPages: (fromIndex: number, toIndex: number) =>
      update((state) => {
        const newPages = [...state.currentPages];
        const [removed] = newPages.splice(fromIndex, 1);
        newPages.splice(toIndex, 0, removed);
        return {
          ...state,
          currentPages: newPages,
          currentPageIndex: state.currentPageIndex === fromIndex ? toIndex : state.currentPageIndex
        };
      }),

    updatePageZoom: (zoomLevel: number) =>
      update((state) => ({
        ...state,
        zoomLevel: Math.max(0.5, Math.min(3, zoomLevel))
      })),

    updatePageScroll: (scrollX: number, scrollY: number) =>
      update((state) => ({
        ...state,
        scrollX,
        scrollY
      })),

    // ============ 图层操作 ============
    setCurrentLayers: (layers: NoteLayer[]) =>
      update((state) => ({
        ...state,
        currentLayers: layers,
        selectedLayerId: layers.length > 0 ? layers[0].id : null
      })),

    addLayer: (layer: NoteLayer) =>
      update((state) => ({
        ...state,
        currentLayers: [...state.currentLayers, layer],
        selectedLayerId: layer.id
      })),

    removeLayer: (layerId: string) =>
      update((state) => {
        const newLayers = state.currentLayers.filter((l) => l.id !== layerId);
        return {
          ...state,
          currentLayers: newLayers,
          selectedLayerId:
            state.selectedLayerId === layerId
              ? newLayers.length > 0
                ? newLayers[0].id
                : null
              : state.selectedLayerId
        };
      }),

    updateLayer: (layerId: string, updates: Partial<NoteLayer>) =>
      update((state) => ({
        ...state,
        currentLayers: state.currentLayers.map((l) => (l.id === layerId ? { ...l, ...updates } : l))
      })),

    selectLayer: (layerId: string | null) =>
      update((state) => ({
        ...state,
        selectedLayerId: layerId
      })),

    toggleLayerVisibility: (layerId: string) =>
      update((state) => ({
        ...state,
        currentLayers: state.currentLayers.map((l) =>
          l.id === layerId ? { ...l, visible: !l.visible } : l
        )
      })),

    reorderLayers: (fromIndex: number, toIndex: number) =>
      update((state) => {
        const newLayers = [...state.currentLayers];
        const [removed] = newLayers.splice(fromIndex, 1);
        newLayers.splice(toIndex, 0, removed);
        return {
          ...state,
          currentLayers: newLayers
        };
      }),

    // ============ 绘画操作 ============
    setDrawingColor: (color: string) =>
      update((state) => ({
        ...state,
        drawingColor: color
      })),

    setDrawingSize: (size: number) =>
      update((state) => ({
        ...state,
        drawingSize: Math.max(1, Math.min(50, size))
      })),

    startDrawing: () =>
      update((state) => ({
        ...state,
        isDrawing: true
      })),

    stopDrawing: () =>
      update((state) => ({
        ...state,
        isDrawing: false
      })),

    // ============ 重置 ============
    reset: () => set(initialState)
  };

  // 派生存储：当前页面
  const currentPage = derived<typeof baseStore, ScorePage | null>(baseStore, ($state) => {
    if (!$state.currentPages || $state.currentPages.length === 0) {
      return null;
    }
    return $state.currentPages[$state.currentPageIndex] || null;
  });

  // 派生存储：当前图层
  const currentLayer = derived<typeof baseStore, NoteLayer | null>(baseStore, ($state) => {
    if (!$state.currentLayers || !$state.selectedLayerId) {
      return null;
    }
    return $state.currentLayers.find((layer) => layer.id === $state.selectedLayerId) || null;
  });

  // 派生存储：页面总数
  const pageCount = derived<typeof baseStore, number>(baseStore, ($state) => {
    return $state.currentPages?.length || 0;
  });

  // 派生存储：图层总数
  const layerCount = derived<typeof baseStore, number>(baseStore, ($state) => {
    return $state.currentLayers?.length || 0;
  });

  return { ...baseStore, currentPage, currentLayer, pageCount, layerCount };
}

export const scoreStore = createScoreStore();
