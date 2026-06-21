import {
  DB_NAME,
  DB_VERSION,
  STORES,
  type Folder,
  type Note,
  type ScorePage,
  type NoteLayer,
  type DrawingSettings,
  type PageMemory,
  type HistoryRecord,
  type AppSettings,
  type LayerGrouping
} from './schema';

class MusicToolDB {
  private db: IDBDatabase | null = null;
  private dbPromise: Promise<IDBDatabase> | null = null;

  async init(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // 创建所有Store
        Object.entries(STORES).forEach(([storeName, config]) => {
          if (!db.objectStoreNames.contains(storeName)) {
            const store = db.createObjectStore(storeName, {
              keyPath: config.keyPath
            });

            // 创建索引
            if ('indexes' in config && config.indexes) {
              config.indexes.forEach((index) => {
                store.createIndex(index.name, index.keyPath, index.options);
              });
            }
          }
        });
      };
    });

    return this.dbPromise;
  }

  private getStore(storeName: string, mode: 'readonly' | 'readwrite') {
    if (!this.db) throw new Error('数据库未初始化');
    const transaction = this.db.transaction(storeName, mode);
    return transaction.objectStore(storeName);
  }

  private multiStoreTransaction(storeNames: string[], mode: 'readonly' | 'readwrite') {
    if (!this.db) throw new Error('数据库未初始化');
    return this.db.transaction(storeNames, mode);
  }

  // ===== Folder操作 =====
  async createFolder(folder: Folder): Promise<string> {
    const store = this.getStore('folders', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.add(folder);
      request.onsuccess = () => resolve(request.result as string);
      request.onerror = () => reject(request.error);
    });
  }

  async getFoldersByParent(parentId: string | null): Promise<Folder[]> {
    const store = this.getStore('folders', 'readonly');
    const index = store.index('parentId');
    return new Promise((resolve, reject) => {
      const request = index.getAll(parentId);
      request.onsuccess = () => resolve(request.result.sort((a, b) => a.sortIndex - b.sortIndex));
      request.onerror = () => reject(request.error);
    });
  }

  async getFolderById(folderId: string): Promise<Folder | undefined> {
    const store = this.getStore('folders', 'readonly');
    return new Promise((resolve, reject) => {
      const request = store.get(folderId);
      request.onsuccess = () => resolve(request.result as Folder | undefined);
      request.onerror = () => reject(request.error);
    });
  }

  async updateFolder(folder: Folder): Promise<void> {
    const store = this.getStore('folders', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put(folder);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async updateFolderSort(folderIds: string[], startIndex: number = 0): Promise<void> {
    const store = this.getStore('folders', 'readwrite');
    return new Promise((resolve, reject) => {
      let completed = 0;
      folderIds.forEach((id, idx) => {
        const request = store.get(id);
        request.onsuccess = () => {
          const folder = request.result as Folder;
          folder.sortIndex = startIndex + idx;
          folder.updatedAt = Date.now();
          store.put(folder);
          if (++completed === folderIds.length) resolve();
        };
        request.onerror = () => reject(request.error);
      });
    });
  }

  async deleteFolder(folderId: string): Promise<void> {
    const store = this.getStore('folders', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.delete(folderId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // ===== Note操作 =====
  async createNote(note: Note): Promise<string> {
    const store = this.getStore('notes', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.add(note);
      request.onsuccess = () => resolve(request.result as string);
      request.onerror = () => reject(request.error);
    });
  }

  async getNoteById(noteId: string): Promise<Note | undefined> {
    const store = this.getStore('notes', 'readonly');
    return new Promise((resolve, reject) => {
      const request = store.get(noteId);
      request.onsuccess = () => resolve(request.result as Note | undefined);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllNotes(): Promise<Note[]> {
    const store = this.getStore('notes', 'readonly');
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () =>
        resolve((request.result as Note[]).sort((a, b) => a.sortIndex - b.sortIndex));
      request.onerror = () => reject(request.error);
    });
  }

  async getNotesByFolder(folderId: string): Promise<Note[]> {
    const store = this.getStore('notes', 'readonly');
    const index = store.index('folderId');
    return new Promise((resolve, reject) => {
      const request = index.getAll(folderId);
      request.onsuccess = () =>
        resolve((request.result as Note[]).sort((a, b) => a.sortIndex - b.sortIndex));
      request.onerror = () => reject(request.error);
    });
  }

  async updateNote(note: Note): Promise<void> {
    const store = this.getStore('notes', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put(note);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async updateNoteSort(noteIds: string[], startIndex: number = 0): Promise<void> {
    const store = this.getStore('notes', 'readwrite');
    return new Promise((resolve, reject) => {
      let completed = 0;
      noteIds.forEach((id, idx) => {
        const request = store.get(id);
        request.onsuccess = () => {
          const note = request.result as Note;
          note.sortIndex = startIndex + idx;
          note.updatedAt = Date.now();
          store.put(note);
          if (++completed === noteIds.length) resolve();
        };
        request.onerror = () => reject(request.error);
      });
    });
  }

  async updateNoteMode(noteId: string, mode: 'score' | 'note'): Promise<void> {
    const store = this.getStore('notes', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.get(noteId);
      request.onsuccess = () => {
        const note = request.result as Note;
        note.viewMode = mode;
        note.updatedAt = Date.now();
        store.put(note);
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  async deleteNote(noteId: string): Promise<void> {
    const store = this.getStore('notes', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.delete(noteId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // ===== ScorePage操作 =====
  async createScorePage(page: ScorePage): Promise<string> {
    const store = this.getStore('scorePages', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.add(page);
      request.onsuccess = () => resolve(request.result as string);
      request.onerror = () => reject(request.error);
    });
  }

  async getScorePage(pageId: string): Promise<ScorePage | undefined> {
    const store = this.getStore('scorePages', 'readonly');
    return new Promise((resolve, reject) => {
      const request = store.get(pageId);
      request.onsuccess = () => resolve(request.result as ScorePage | undefined);
      request.onerror = () => reject(request.error);
    });
  }

  async getScorePagesByNote(noteId: string): Promise<ScorePage[]> {
    const store = this.getStore('scorePages', 'readonly');
    const index = store.index('noteId');
    return new Promise((resolve, reject) => {
      const request = index.getAll(noteId);
      request.onsuccess = () =>
        resolve((request.result as ScorePage[]).sort((a, b) => a.pageIndex - b.pageIndex));
      request.onerror = () => reject(request.error);
    });
  }

  async updateScorePage(page: ScorePage): Promise<void> {
    const store = this.getStore('scorePages', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put(page);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async updateScorePageMemory(scorePageId: string, updates: Partial<ScorePage>): Promise<void> {
    const store = this.getStore('scorePages', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.get(scorePageId);
      request.onsuccess = () => {
        const page = request.result as ScorePage;
        Object.assign(page, updates, { updatedAt: Date.now() });
        store.put(page);
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  async deleteScorePage(scorePageId: string): Promise<void> {
    const store = this.getStore('scorePages', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.delete(scorePageId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // ===== NoteLayer操作 =====
  async createNoteLayer(layer: NoteLayer): Promise<string> {
    const store = this.getStore('noteLayers', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.add(layer);
      request.onsuccess = () => resolve(request.result as string);
      request.onerror = () => reject(request.error);
    });
  }

  async getNoteLayer(layerId: string): Promise<NoteLayer | undefined> {
    const store = this.getStore('noteLayers', 'readonly');
    return new Promise((resolve, reject) => {
      const request = store.get(layerId);
      request.onsuccess = () => resolve(request.result as NoteLayer | undefined);
      request.onerror = () => reject(request.error);
    });
  }

  async getLayersByNote(noteId: string): Promise<NoteLayer[]> {
    const store = this.getStore('noteLayers', 'readonly');
    const index = store.index('noteId');
    return new Promise((resolve, reject) => {
      const request = index.getAll(noteId);
      request.onsuccess = () =>
        resolve((request.result as NoteLayer[]).sort((a, b) => a.layerIndex - b.layerIndex));
      request.onerror = () => reject(request.error);
    });
  }

  async getLayersByScorePage(scorePageId: string): Promise<NoteLayer[]> {
    const store = this.getStore('noteLayers', 'readonly');
    const index = store.index('scorePageId');
    return new Promise((resolve, reject) => {
      const request = index.getAll(scorePageId);
      request.onsuccess = () =>
        resolve((request.result as NoteLayer[]).sort((a, b) => a.layerIndex - b.layerIndex));
      request.onerror = () => reject(request.error);
    });
  }

  async updateNoteLayer(layer: NoteLayer): Promise<void> {
    const store = this.getStore('noteLayers', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put(layer);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async updateLayerVisibility(layerId: string, visible: boolean): Promise<void> {
    const store = this.getStore('noteLayers', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.get(layerId);
      request.onsuccess = () => {
        const layer = request.result as NoteLayer;
        layer.visible = visible;
        layer.updatedAt = Date.now();
        store.put(layer);
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  async updateLayerSort(layerIds: string[], startIndex: number = 0): Promise<void> {
    const store = this.getStore('noteLayers', 'readwrite');
    return new Promise((resolve, reject) => {
      let completed = 0;
      layerIds.forEach((id, idx) => {
        const request = store.get(id);
        request.onsuccess = () => {
          const layer = request.result as NoteLayer;
          layer.layerIndex = startIndex + idx;
          layer.updatedAt = Date.now();
          store.put(layer);
          if (++completed === layerIds.length) resolve();
        };
        request.onerror = () => reject(request.error);
      });
    });
  }

  async deleteNoteLayer(layerId: string): Promise<void> {
    const store = this.getStore('noteLayers', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.delete(layerId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // ===== DrawingSettings操作 =====
  async updateDrawingSettings(settings: DrawingSettings): Promise<void> {
    const store = this.getStore('drawingSettings', 'readwrite');
    settings.updatedAt = Date.now();
    return new Promise((resolve, reject) => {
      const request = store.put(settings);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getDrawingSettings(noteId: string): Promise<DrawingSettings | undefined> {
    const store = this.getStore('drawingSettings', 'readonly');
    return new Promise((resolve, reject) => {
      const request = store.get(noteId);
      request.onsuccess = () => resolve(request.result as DrawingSettings | undefined);
      request.onerror = () => reject(request.error);
    });
  }

  // ===== History操作 =====
  async addToHistory(record: HistoryRecord): Promise<void> {
    const store = this.getStore('history', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put(record);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getHistory(limit: number = 50): Promise<HistoryRecord[]> {
    const store = this.getStore('history', 'readonly');
    const index = store.index('lastAccessTime');
    return new Promise((resolve, reject) => {
      const request = index.getAll();
      request.onsuccess = () => {
        const records = (request.result as HistoryRecord[])
          .sort((a, b) => b.lastAccessTime - a.lastAccessTime)
          .slice(0, limit);
        resolve(records);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async clearHistory(): Promise<void> {
    const store = this.getStore('history', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // ===== AppSettings操作 =====
  async updateAppSettings(settings: AppSettings): Promise<void> {
    const store = this.getStore('appSettings', 'readwrite');
    settings.updatedAt = Date.now();
    return new Promise((resolve, reject) => {
      const request = store.put(settings);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getAppSettings(): Promise<AppSettings | undefined> {
    const store = this.getStore('appSettings', 'readonly');
    return new Promise((resolve, reject) => {
      const request = store.get('global');
      request.onsuccess = () => resolve(request.result as AppSettings | undefined);
      request.onerror = () => reject(request.error);
    });
  }

  // ===== 数据导出 =====
  async exportAllData(): Promise<any> {
    const data: any = {};
    for (const storeName of Object.keys(STORES)) {
      const store = this.getStore(storeName, 'readonly');
      data[storeName] = await new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }
    return data;
  }

  // ===== 数据导入 =====
  async importAllData(data: any): Promise<void> {
    for (const storeName of Object.keys(STORES)) {
      if (!data[storeName]) continue;
      const store = this.getStore(storeName, 'readwrite');
      for (const record of data[storeName]) {
        await new Promise<void>((resolve, reject) => {
          const request = store.put(record);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      }
    }
  }

  // ===== 清空数据库 =====
  async clearAll(): Promise<void> {
    for (const storeName of Object.keys(STORES)) {
      const store = this.getStore(storeName, 'readwrite');
      await new Promise<void>((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }
  }

  // ===== 查询统计 =====
  async getStatistics(): Promise<{
    noteCount: number;
    pageCount: number;
    layerCount: number;
    totalSize: number;
  }> {
    const noteStore = this.getStore('notes', 'readonly');
    const pageStore = this.getStore('scorePages', 'readonly');
    const layerStore = this.getStore('noteLayers', 'readonly');

    const [noteCount, pageCount, layerCount] = await Promise.all([
      new Promise<number>((resolve, reject) => {
        const request = noteStore.count();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      }),
      new Promise<number>((resolve, reject) => {
        const request = pageStore.count();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      }),
      new Promise<number>((resolve, reject) => {
        const request = layerStore.count();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      })
    ]);

    return {
      noteCount,
      pageCount,
      layerCount,
      totalSize: 0 // IndexedDB不提供直接获取大小的方法
    };
  }
}

export const db = new MusicToolDB();

db.init().catch((error) => console.error('数据库初始化失败:', error));
