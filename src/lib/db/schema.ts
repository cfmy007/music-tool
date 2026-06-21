/**
 * IndexedDB 数据库schema定义
 * 数据库名: MusicToolDB
 * 版本: 2
 */

export const DB_NAME = 'MusicToolDB';
export const DB_VERSION = 2;

// ============ Store 1: folders (文件夹) ============
export interface Folder {
  id: string; // UUID
  parentId: string | null; // 父文件夹ID，null表示根目录
  name: string; // 文件夹名称
  sortIndex: number; // 排序索引（自由排序）
  createdAt: number; // 创建时间戳
  updatedAt: number; // 更新时间戳
}

// ============ Store 2: notes (笔记/乐谱) ============
export interface Note {
  id: string; // UUID
  folderId: string; // 所属文件夹ID
  title: string; // 笔记标题
  sortIndex: number; // 排序索引（自由排序）
  viewMode: 'score' | 'note'; // 当前模式：看谱或笔记
  createdAt: number;
  updatedAt: number;
}

// ============ Store 3: scorePages (乐谱页面) ============
export interface ScorePage {
  id: string; // UUID
  noteId: string; // 所属笔记ID
  pageIndex: number; // 页序（排序依据）
  imageBlob: Blob; // 乐谱图片二进制

  // 每张图片的独立记忆设置
  zoomLevel: number; // 缩放比例 0.5-2.0 (default: 1.0)
  scrollX: number; // 水平滚动位置
  scrollY: number; // 竖直滚动位置
  lastViewedAt: number; // 上次查看时间

  createdAt: number;
  updatedAt: number;
}

// ============ Store 4: noteLayers (笔记图层) ============
export interface NoteLayer {
  id: string; // UUID
  noteId: string; // 所属笔记ID（关键：跟随笔记变化）
  scorePageId: string; // 所属乐谱页面ID（关键：跟随图片变化）
  layerIndex: number; // 图层序号（0=底层，支持自由排序）

  layerName: string; // 图层名称（如"主旋律"、"标记"）
  canvasData: string; // canvas绘图数据（JSON字符串或base64）- 旧版兼容
  tldrawSnapshot: string; // tldraw snapshot JSON 数据

  visible: boolean; // 是否显示该图层
  opacity: number; // 透明度 0-1 (default: 1)
  blendMode: string; // 混合模式 'normal' | 'multiply' | 'screen'

  createdAt: number;
  updatedAt: number;
}

// ============ Store 5: drawingSettings (绘画设置) ============
export interface DrawingSettings {
  noteId: string; // 主键：所属笔记ID

  penColor: string; // 笔颜色 (#RRGGBB)
  penSize: number; // 笔大小 1-20px
  penOpacity: number; // 笔透明度 0-1

  updatedAt: number;
}

// ============ Store 6: pageMemory (页面记忆) ============
export interface PageMemory {
  scorePageId: string; // 主键：所属乐谱页面ID

  zoomLevel: number; // 该页的缩放等级
  scrollX: number; // 该页的水平滚动
  scrollY: number; // 该页的竖直滚动

  // 每页的可见图层组合
  visibleLayers: string[]; // 可见的layerId数组

  lastViewedAt: number;
  updatedAt: number;
}

// ============ Store 7: history (历史记录) ============
export interface HistoryRecord {
  id: string; // UUID
  noteId: string; // 访问的笔记ID
  timestamp: number; // 访问时间戳
  lastAccessTime: number; // 上次访问时间（用于排序）
}

// ============ Store 8: appSettings (应用设置) ============
export interface AppSettings {
  key: 'global'; // 主键：固定值'global'

  // UI状态
  lastActiveTab: 'tuner' | 'library' | 'metronome';
  lastActiveNoteId: string | null;

  // 调音器设置
  tunerMode: 'chromatic' | 'note';

  // 节拍器设置
  metronomeSettings: {
    bpm: number;
    timeSignature: string; // 如 "4/4", "3/4", "6/8"
    sound: 'beep' | 'bell' | 'click';
  };

  // 导出设置
  exportFormat: 'json' | 'zip';

  updatedAt: number;
}

// ============ Store 9: layerGroupings (图层分组) ============
export interface LayerGrouping {
  id: string; // UUID
  noteId: string; // 所属笔记ID
  groupName: string; // 分组名称（如"主旋律层"）
  layerIds: string[]; // 该分组包含的layerId数组
  sortIndex: number; // 分组排序索引

  createdAt: number;
  updatedAt: number;
}

// ============ IndexedDB Store 配置 ============
// 1. 明确定义索引的结构
interface IndexConfig {
  name: string;
  keyPath: string;
  options?: IDBIndexParameters;
}

// 2. 明确 Store 的配置结构
interface StoreConfig {
  keyPath: string;
  indexes?: IndexConfig[];
}

// 3. 声明 STORES 时使用 Record 类型
export const STORES: Record<string, StoreConfig> = {
  folders: {
    keyPath: 'id',
    indexes: [
      { name: 'parentId', keyPath: 'parentId' },
      { name: 'sortIndex', keyPath: 'sortIndex' }
    ]
  },
  notes: {
    keyPath: 'id',
    indexes: [
      { name: 'folderId', keyPath: 'folderId' },
      { name: 'sortIndex', keyPath: 'sortIndex' }
    ]
  },
  scorePages: {
    keyPath: 'id',
    indexes: [
      { name: 'noteId', keyPath: 'noteId' },
      { name: 'pageIndex', keyPath: 'pageIndex' },
      { name: 'lastViewedAt', keyPath: 'lastViewedAt' }
    ]
  },
  noteLayers: {
    keyPath: 'id',
    indexes: [
      { name: 'noteId', keyPath: 'noteId' },
      { name: 'scorePageId', keyPath: 'scorePageId' },
      { name: 'layerIndex', keyPath: 'layerIndex' }
    ]
  },
  drawingSettings: {
    keyPath: 'noteId'
  },
  pageMemory: {
    keyPath: 'scorePageId'
  },
  history: {
    keyPath: 'id',
    indexes: [
      {
        name: 'lastAccessTime',
        keyPath: 'lastAccessTime',
        options: { unique: false }
      },
      { name: 'noteId', keyPath: 'noteId' }
    ]
  },
  appSettings: {
    keyPath: 'key'
  },
  layerGroupings: {
    keyPath: 'id',
    indexes: [
      { name: 'noteId', keyPath: 'noteId' },
      { name: 'sortIndex', keyPath: 'sortIndex' }
    ]
  }
};
