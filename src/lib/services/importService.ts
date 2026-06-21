import { db } from '../db/indexedDB';
import type { Note, ScorePage, NoteLayer } from '../db/schema';
import { v4 as uuidv4 } from 'uuid';

export interface ImportOptions {
  mergeWithExisting?: boolean;
  updateExisting?: boolean;
  importMetadata?: boolean;
}

/**
 * 导入服务
 */
export class ImportService {
  /**
   * 从JSON导入
   */
  static async importFromJSON(
    file: File,
    options: ImportOptions = {}
  ): Promise<{ success: boolean; noteId?: string; message: string }> {
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!data.note) {
        return { success: false, message: '无效的导入文件格式：缺少笔记数据' };
      }

      return this.importData(data, options);
    } catch (error) {
      return { success: false, message: `导入失败: ${error}` };
    }
  }

  /**
   * 从ZIP导入
   */
  static async importFromZIP(
    file: File,
    options: ImportOptions = {}
  ): Promise<{ success: boolean; noteIds?: string[]; message: string }> {
    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      await zip.loadAsync(file);

      const noteIds: string[] = [];

      // 查找所有JSON文件
      const jsonFiles = Object.keys(zip.files).filter(
        (name) => name.endsWith('.json') && !name.includes('/')
      );

      if (jsonFiles.length === 0) {
        return { success: false, message: 'ZIP文件中没有找到JSON数据' };
      }

      for (const jsonFileName of jsonFiles) {
        const fileContent = await zip.files[jsonFileName].async('string');
        const data = JSON.parse(fileContent);

        if (data.note) {
          const result = await this.importData(data, options);
          if (result.success && result.noteId) {
            noteIds.push(result.noteId);
          }
        }
      }

      if (noteIds.length === 0) {
        return { success: false, message: '未能导入任何笔记' };
      }

      return {
        success: true,
        noteIds,
        message: `成功导入 ${noteIds.length} 个笔记`
      };
    } catch (error) {
      return { success: false, message: `导入ZIP失败: ${error}` };
    }
  }

  /**
   * 从图片导入（创建新笔记）
   */
  static async importFromImages(
    files: File[],
    noteTitle: string,
    folderId?: string
  ): Promise<{ success: boolean; noteId?: string; message: string }> {
    try {
      const note: Note = {
        id: uuidv4(),
        folderId: folderId || '',
        title: noteTitle,
        sortIndex: 0,
        viewMode: 'score',
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      await db.createNote(note);

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const buffer = await file.arrayBuffer();
        const blob = new Blob([buffer], { type: file.type });
        const blobUrl = URL.createObjectURL(blob);

        const page: ScorePage = {
          id: uuidv4(),
          noteId: note.id,
          pageIndex: i,
          imageBlob: blob,
          imageBlobUrl: blobUrl,
          zoomLevel: 1,
          scrollX: 0,
          scrollY: 0,
          lastViewedAt: Date.now(),
          createdAt: Date.now(),
          updatedAt: Date.now()
        };

        await db.createScorePage(page);
      }

      return { success: true, noteId: note.id, message: `成功导入 ${files.length} 个页面` };
    } catch (error) {
      return { success: false, message: `导入图片失败: ${error}` };
    }
  }

  /**
   * 导入数据
   */
  private static async importData(
    data: any,
    options: ImportOptions
  ): Promise<{ success: boolean; noteId?: string; message: string }> {
    try {
      const { note: importedNote, pages: importedPages = [], layers: importedLayers = [] } = data;

      if (!importedNote) {
        return { success: false, message: '导入数据缺少笔记信息' };
      }

      let note = { ...importedNote };
      let noteId = note.id;

      // 检查笔记是否已存在
      if (options.updateExisting) {
        const existing = await db.getNoteById(note.id);
        if (existing) {
          // 更新现有笔记
          note = { ...existing, ...note, updatedAt: Date.now() };
          await db.updateNote(note);
          noteId = note.id;
        } else {
          // 创建新笔记
          note.id = uuidv4();
          note.createdAt = Date.now();
          note.updatedAt = Date.now();
          noteId = note.id;
          await db.createNote(note);
        }
      } else {
        // 创建新笔记
        note.id = uuidv4();
        note.createdAt = Date.now();
        note.updatedAt = Date.now();
        noteId = note.id;
        await db.createNote(note);
      }

      // 导入页面
      for (const page of importedPages) {
        try {
          let imageBlob: Blob | undefined;

          // 如果原数据中包含imageBlob，使用它
          if (page.imageBlob) {
            if (page.imageBlob instanceof Blob) {
              imageBlob = page.imageBlob;
            } else if (typeof page.imageBlob === 'string') {
              // 如果是base64字符串
              const binaryString = atob(page.imageBlob);
              const bytes = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }
              imageBlob = new Blob([bytes], { type: 'image/png' });
            }
          }

          const imageBlobUrl = imageBlob ? URL.createObjectURL(imageBlob) : '';

          const newPage: ScorePage = {
            ...page,
            id: uuidv4(),
            noteId,
            imageBlob,
            imageBlobUrl,
            createdAt: Date.now(),
            updatedAt: Date.now()
          };

          await db.createScorePage(newPage);
        } catch (pageError) {
          console.error('导入页面失败:', pageError);
        }
      }

      // 导入图层
      for (const layer of importedLayers) {
        try {
          const newLayer: NoteLayer = {
            ...layer,
            id: uuidv4(),
            noteId,
            updatedAt: Date.now()
          };

          await db.createNoteLayer(newLayer);
        } catch (layerError) {
          console.error('导入图层失败:', layerError);
        }
      }

      return {
        success: true,
        noteId,
        message: `成功导入笔记，包含 ${importedPages.length} 个页面和 ${importedLayers.length} 个图层`
      };
    } catch (error) {
      return { success: false, message: `导入失败: ${error}` };
    }
  }

  /**
   * 从CSV导入（元数据）
   */
  static async importFromCSV(file: File): Promise<any[]> {
    const text = await file.text();
    const lines = text.split(/\r?\n/);
    const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));

    const data: any[] = [];
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;

      // 处理CSV转义
      const values = this.parseCSVLine(lines[i]);
      const row: Record<string, string> = {};

      for (let j = 0; j < headers.length; j++) {
        row[headers[j]] = values[j] || '';
      }

      data.push(row);
    }

    return data;
  }

  /**
   * 解析CSV行（处理引号和转义）
   */
  private static parseCSVLine(line: string): string[] {
    const values: string[] = [];
    let current = '';
    let insideQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (insideQuotes && nextChar === '"') {
          current += '"';
          i++; // 跳过下一个引号
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (char === ',' && !insideQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    values.push(current.trim());
    return values;
  }

  /**
   * 批量导入
   */
  static async importMultiple(
    files: File[],
    options: ImportOptions = {}
  ): Promise<{ totalCount: number; successCount: number; failedCount: number; results: any[] }> {
    const results: any[] = [];
    let successCount = 0;
    let failedCount = 0;

    for (const file of files) {
      try {
        const validation = this.validateImportFile(file);
        if (!validation.valid) {
          failedCount++;
          results.push({ success: false, message: validation.message, fileName: file.name });
          continue;
        }

        let result;

        if (file.type === 'application/json') {
          result = await this.importFromJSON(file, options);
        } else if (file.type === 'application/zip') {
          result = await this.importFromZIP(file, options);
        } else if (file.type.startsWith('image/')) {
          // 图片导入
          const noteTitle = file.name.replace(/\.[^/.]+$/, '');
          result = await this.importFromImages([file], noteTitle);
        } else if (file.type === 'text/csv') {
          const csvData = await this.importFromCSV(file);
          result = {
            success: csvData.length > 0,
            message: `成功解析 ${csvData.length} 条记录`,
            data: csvData
          };
        } else {
          result = { success: false, message: '不支持的文件类型' };
        }

        results.push({ ...result, fileName: file.name });

        if (result.success) {
          successCount++;
        } else {
          failedCount++;
        }
      } catch (error) {
        failedCount++;
        results.push({ success: false, message: `${file.name}: 导入失败 - ${error}` });
      }
    }

    return {
      totalCount: files.length,
      successCount,
      failedCount,
      results
    };
  }

  /**
   * 验证导入文件
   */
  static validateImportFile(file: File): { valid: boolean; message: string } {
    const validTypes = [
      'application/json',
      'application/zip',
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/webp',
      'text/csv'
    ];

    if (!validTypes.includes(file.type)) {
      return { valid: false, message: `不支持的文件类型: ${file.type}` };
    }

    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      return {
        valid: false,
        message: `文件过大，请选择小于 ${Math.floor(maxSize / 1024 / 1024)}MB 的文件`
      };
    }

    return { valid: true, message: '文件有效' };
  }

  /**
   * 获取支持的文件类型
   */
  static getSupportedFileTypes(): string[] {
    return ['.json', '.zip', '.png', '.jpg', '.jpeg', '.webp', '.csv'];
  }

  /**
   * 获取文件MIME类型描述
   */
  static getFileTypeDescription(extension: string): string {
    const descriptions: Record<string, string> = {
      json: '乐谱笔记 (JSON)',
      zip: '乐谱笔记包 (ZIP)',
      png: '图片 (PNG)',
      jpg: '图片 (JPG)',
      jpeg: '图片 (JPEG)',
      webp: '图片 (WebP)',
      csv: '数据表格 (CSV)'
    };
    return descriptions[extension.replace('.', '')] || '未知文件类型';
  }
}
