import { writable, derived } from 'svelte/store';
import type { AppSettings } from '../db/schema';

interface SettingsState {
  tunerSettings: {
    mode: 'chromatic' | 'standard';
    a4Frequency: number;
    displayCents: boolean;
    soundEnabled: boolean;
  };
  metronomeSettings: {
    bpm: number;
    timeSignature: string;
    sound: 'beep' | 'bell' | 'click';
    volumeLevel: number;
  };
  editorSettings: {
    autoSave: boolean;
    autoSaveInterval: number;
    brushSize: number;
    brushColor: string;
    brushOpacity: number;
  };
  displaySettings: {
    theme: 'light' | 'dark' | 'auto';
    fontSize: number;
    compactMode: boolean;
    showGridlines: boolean;
  };
  exportSettings: {
    format: 'json' | 'pdf' | 'png' | 'svg';
    quality: 'low' | 'medium' | 'high';
    includeMetadata: boolean;
  };
}

function createSettingsStore() {
  const initialState: SettingsState = {
    tunerSettings: {
      mode: 'chromatic',
      a4Frequency: 440,
      displayCents: true,
      soundEnabled: true
    },
    metronomeSettings: {
      bpm: 120,
      timeSignature: '4/4',
      sound: 'beep',
      volumeLevel: 50
    },
    editorSettings: {
      autoSave: true,
      autoSaveInterval: 30000,
      brushSize: 3,
      brushColor: '#000000',
      brushOpacity: 1
    },
    displaySettings: {
      theme: 'light',
      fontSize: 14,
      compactMode: false,
      showGridlines: false
    },
    exportSettings: {
      format: 'json',
      quality: 'high',
      includeMetadata: true
    }
  };

  const { subscribe, set, update } = writable<SettingsState>(initialState);

  const settingsStore = {
    subscribe,

    // ============ 调音器设置 ============
    updateTunerMode: (mode: 'chromatic' | 'standard') =>
      update((state) => ({
        ...state,
        tunerSettings: { ...state.tunerSettings, mode }
      })),

    updateA4Frequency: (frequency: number) =>
      update((state) => ({
        ...state,
        tunerSettings: {
          ...state.tunerSettings,
          a4Frequency: Math.max(400, Math.min(480, frequency))
        }
      })),

    toggleTunerCentsDisplay: () =>
      update((state) => ({
        ...state,
        tunerSettings: {
          ...state.tunerSettings,
          displayCents: !state.tunerSettings.displayCents
        }
      })),

    toggleTunerSound: () =>
      update((state) => ({
        ...state,
        tunerSettings: {
          ...state.tunerSettings,
          soundEnabled: !state.tunerSettings.soundEnabled
        }
      })),

    updateTunerSettings: (settings: Partial<SettingsState['tunerSettings']>) =>
      update((state) => ({
        ...state,
        tunerSettings: { ...state.tunerSettings, ...settings }
      })),

    // ============ 节拍器设置 ============
    updateBPM: (bpm: number) =>
      update((state) => ({
        ...state,
        metronomeSettings: {
          ...state.metronomeSettings,
          bpm: Math.max(30, Math.min(300, bpm))
        }
      })),

    updateTimeSignature: (timeSignature: string) =>
      update((state) => ({
        ...state,
        metronomeSettings: { ...state.metronomeSettings, timeSignature }
      })),

    updateMetronomeSound: (sound: 'beep' | 'bell' | 'click') =>
      update((state) => ({
        ...state,
        metronomeSettings: { ...state.metronomeSettings, sound }
      })),

    updateMetronomeVolume: (volumeLevel: number) =>
      update((state) => ({
        ...state,
        metronomeSettings: {
          ...state.metronomeSettings,
          volumeLevel: Math.max(0, Math.min(100, volumeLevel))
        }
      })),

    updateMetronomeSettings: (settings: Partial<SettingsState['metronomeSettings']>) =>
      update((state) => ({
        ...state,
        metronomeSettings: { ...state.metronomeSettings, ...settings }
      })),

    // ============ 编辑器设置 ============
    toggleAutoSave: () =>
      update((state) => ({
        ...state,
        editorSettings: { ...state.editorSettings, autoSave: !state.editorSettings.autoSave }
      })),

    updateAutoSaveInterval: (interval: number) =>
      update((state) => ({
        ...state,
        editorSettings: {
          ...state.editorSettings,
          autoSaveInterval: Math.max(5000, interval)
        }
      })),

    updateBrushSize: (size: number) =>
      update((state) => ({
        ...state,
        editorSettings: {
          ...state.editorSettings,
          brushSize: Math.max(1, Math.min(50, size))
        }
      })),

    updateBrushColor: (color: string) =>
      update((state) => ({
        ...state,
        editorSettings: { ...state.editorSettings, brushColor: color }
      })),

    updateBrushOpacity: (opacity: number) =>
      update((state) => ({
        ...state,
        editorSettings: {
          ...state.editorSettings,
          brushOpacity: Math.max(0, Math.min(1, opacity))
        }
      })),

    updateEditorSettings: (settings: Partial<SettingsState['editorSettings']>) =>
      update((state) => ({
        ...state,
        editorSettings: { ...state.editorSettings, ...settings }
      })),

    // ============ 显示设置 ============
    updateTheme: (theme: 'light' | 'dark' | 'auto') =>
      update((state) => ({
        ...state,
        displaySettings: { ...state.displaySettings, theme }
      })),

    updateFontSize: (fontSize: number) =>
      update((state) => ({
        ...state,
        displaySettings: {
          ...state.displaySettings,
          fontSize: Math.max(10, Math.min(24, fontSize))
        }
      })),

    toggleCompactMode: () =>
      update((state) => ({
        ...state,
        displaySettings: {
          ...state.displaySettings,
          compactMode: !state.displaySettings.compactMode
        }
      })),

    toggleGridlines: () =>
      update((state) => ({
        ...state,
        displaySettings: {
          ...state.displaySettings,
          showGridlines: !state.displaySettings.showGridlines
        }
      })),

    updateDisplaySettings: (settings: Partial<SettingsState['displaySettings']>) =>
      update((state) => ({
        ...state,
        displaySettings: { ...state.displaySettings, ...settings }
      })),

    // ============ 导出设置 ============
    updateExportFormat: (format: 'json' | 'pdf' | 'png' | 'svg') =>
      update((state) => ({
        ...state,
        exportSettings: { ...state.exportSettings, format }
      })),

    updateExportQuality: (quality: 'low' | 'medium' | 'high') =>
      update((state) => ({
        ...state,
        exportSettings: { ...state.exportSettings, quality }
      })),

    toggleExportMetadata: () =>
      update((state) => ({
        ...state,
        exportSettings: {
          ...state.exportSettings,
          includeMetadata: !state.exportSettings.includeMetadata
        }
      })),

    updateExportSettings: (settings: Partial<SettingsState['exportSettings']>) =>
      update((state) => ({
        ...state,
        exportSettings: { ...state.exportSettings, ...settings }
      })),

    // ============ 批量更新 ============
    updateAllSettings: (newSettings: Partial<SettingsState>) =>
      update((state) => ({
        ...state,
        ...newSettings
      })),

    loadSettingsFromDB: (dbSettings: AppSettings) =>
      update((state) => {
        const result = { ...state };

        if (dbSettings.tunerMode) {
          result.tunerSettings.mode = dbSettings.tunerMode as 'chromatic' | 'standard';
        }

        if (dbSettings.metronomeSettings) {
          result.metronomeSettings = {
            ...state.metronomeSettings,
            ...dbSettings.metronomeSettings
          };
        }

        return result;
      }),

    // ============ 重置 ============
    reset: () => set(initialState),

    resetTunerSettings: () =>
      update((state) => ({
        ...state,
        tunerSettings: initialState.tunerSettings
      })),

    resetMetronomeSettings: () =>
      update((state) => ({
        ...state,
        metronomeSettings: initialState.metronomeSettings
      })),

    resetEditorSettings: () =>
      update((state) => ({
        ...state,
        editorSettings: initialState.editorSettings
      })),

    resetDisplaySettings: () =>
      update((state) => ({
        ...state,
        displaySettings: initialState.displaySettings
      })),

    resetExportSettings: () =>
      update((state) => ({
        ...state,
        exportSettings: initialState.exportSettings
      })),

    resetAll: () => set(initialState)
  };

  // 派生存储：是否暗黑模式
  const isDarkMode = derived<typeof settingsStore, boolean>(settingsStore, ($state) => {
    if ($state.displaySettings.theme === 'dark') return true;
    if ($state.displaySettings.theme === 'auto') {
      return window.matchMedia?.('(prefers-color-scheme: dark)').matches || false;
    }
    return false;
  });

  // 派生存储：有效BPM范围
  const bpmRange = derived<typeof settingsStore, { min: number; max: number }>(
    settingsStore,
    () => ({
      min: 30,
      max: 300
    })
  );

  return { ...settingsStore, isDarkMode, bpmRange };
}

export const settingsStore = createSettingsStore();
