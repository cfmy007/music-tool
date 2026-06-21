import type { Note, ScorePage, NoteLayer } from '../db/schema';
import { db } from '../db/indexedDB';

export interface ExportOptions {
  format: 'json' | 'pdf' | 'png' | 'zip';
  quality?: 'low' | 'medium' | 'high';
  includeMetadata?: boolean;
  includeHistory?: boolean;
}

export interface ExportData {
  version: string;
  timestamp: number;
  note: Note;
  pages: ScorePage[];
  layers: NoteLayer[];
  metadata?: {
    author?: string;
    description?: string;
    tags?: string[];
  };
}

/**
 * 导出服务
 */
export class ExportService {
  /**
   * 导出为JSON格式
   */
  static async exportAsJSON(
    noteId: string,
    options: ExportOptions = { format: 'json' }
  ): Promise<Blob> {
    const note = await db.getNoteById(noteId);
    if (!note) throw new Error('笔记不存在');

    const pages = await db.getScorePagesByNote(noteId);
    const layers = await db.getLayersByNote(noteId);

    // 处理页面数据（移除blob，保留URL）
    const processedPages = await Promise.all(
      pages.map(async (page) => {
        const processedPage = { ...page };
        // 如果不包含元数据，清空blob相关信息
        if (!options.includeMetadata) {
          processedPage.imageBlob = undefined as any;
        }
        return processedPage;
      })
    );

    const exportData: ExportData = {
      version: '1.0.0',
      timestamp: Date.now(),
      note,
      pages: processedPages,
      layers
    };

    const json = JSON.stringify(exportData, null, 2);
    return new Blob([json], { type: 'application/json' });
  }

  /**
   * 导出为PNG格式（所有页面合并）
   */
  static async exportAsPNG(
    noteId: string,
    options: ExportOptions = { format: 'png' }
  ): Promise<Blob> {
    const pages = await db.getScorePagesByNote(noteId);
    if (pages.length === 0) throw new Error('没有页面可导出');

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('无法创建 Canvas 上下文');

    let totalHeight = 0;
    const pageImages: { img: HTMLImageElement; loaded: Promise<void> }[] = [];

    // 加载所有图片
    for (const page of pages) {
      const img = new Image();
      const loadPromise = new Promise<void>((resolve, reject) => {
        img.onload = () => {
          totalHeight += img.height;
          resolve();
        };
        img.onerror = reject;
      });

      // 优先使用blob，其次使用URL
      if (page.imageBlob) {
        img.src = URL.createObjectURL(page.imageBlob);
      } else if (page.imageBlobUrl) {
        img.src = page.imageBlobUrl;
      }

      pageImages.push({ img, loaded: loadPromise });
    }

    // 等待所有图片加载
    await Promise.all(pageImages.map((p) => p.loaded));

    // 设置canvas大小
    canvas.width = pageImages[0]?.img.width || 800;
    canvas.height = totalHeight;

    // 绘制所有页面
    let currentY = 0;
    for (const { img } of pageImages) {
      ctx.drawImage(img, 0, currentY);
      currentY += img.height;
    }

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('导出失败'));
          }
        },
        'image/png',
        options.quality === 'high' ? 1 : options.quality === 'medium' ? 0.8 : 0.6
      );
    });
  }

  /**
   * 导出单页为PNG格式
   */
  static async exportPageAsPNG(
    pageId: string,
    options: ExportOptions = { format: 'png' }
  ): Promise<Blob> {
    const page = await db.getScorePage(pageId);
    if (!page) throw new Error('页面不存在');

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('无法创建 Canvas 上下文');

    const img = new Image();

    return new Promise((resolve, reject) => {
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('导出失败'));
            }
          },
          'image/png',
          options.quality === 'high' ? 1 : options.quality === 'medium' ? 0.8 : 0.6
        );
      };

      img.onerror = () => reject(new Error('无法加载页面图片'));

      // 优先使用blob，其次使用URL
      if (page.imageBlob) {
        img.src = URL.createObjectURL(page.imageBlob);
      } else if (page.imageBlobUrl) {
        img.src = page.imageBlobUrl;
      } else {
        reject(new Error('页面没有图片数据'));
      }
    });
  }

  /**
   * 导出为ZIP格式（包含所有资源）
   */
  static async exportAsZIP(
    noteId: string,
    options: ExportOptions = { format: 'zip' }
  ): Promise<Blob> {
    try {
      // 动态导入jszip
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();

      const note = await db.getNoteById(noteId);
      if (!note) throw new Error('笔记不存在');

      const pages = await db.getScorePagesByNote(noteId);
      const layers = await db.getLayersByNote(noteId);

      // 创建metadata.json
      const jsonData: ExportData = {
        version: '1.0.0',
        timestamp: Date.now(),
        note,
        pages: pages.map((p) => ({
          ...p,
          imageBlob: undefined,
          imageBlobUrl: `images/page_${p.pageIndex}.png`
        })) as any,
        layers
      };

      zip.file('metadata.json', JSON.stringify(jsonData, null, 2));

      // 添加所有页面图片
      for (const page of pages) {
        let imageData: Blob | undefined;

        if (page.imageBlob) {
          imageData = page.imageBlob;
        } else if (page.imageBlobUrl) {
          const response = await fetch(page.imageBlobUrl);
          imageData = await response.blob();
        }

        if (imageData) {
          zip.file(`images/page_${page.pageIndex}.png`, imageData);
        }
      }

      // 生成ZIP文件
      return await zip.generateAsync({ type: 'blob' });
    } catch (error) {
      throw new Error(`导出ZIP失败: ${error}`);
    }
  }

  /**
   * 导出为PDF格式
   */
  static async exportAsPDF(
    noteId: string,
    options: ExportOptions = { format: 'pdf' }
  ): Promise<Blob> {
    try {
      // 动态导入pdf-lib
      const { PDFDocument, PDFPage, rgb } = await import('pdf-lib');

      const note = await db.getNoteById(noteId);
      if (!note) throw new Error('笔记不存在');

      const pages = await db.getScorePagesByNote(noteId);
      if (pages.length === 0) throw new Error('没有页面可导出');

      const pdfDoc = await PDFDocument.create();

      // 添加所有页面
      for (const page of pages) {
        let imageData: Uint8Array | undefined;
        let mediaBox: [number, number, number, number] = [0, 0, 800, 600];

        if (page.imageBlob) {
          imageData = new Uint8Array(await page.imageBlob.arrayBuffer());
        } else if (page.imageBlobUrl) {
          const response = await fetch(page.imageBlobUrl);
          imageData = new Uint8Array(await response.arrayBuffer());
        }

        if (imageData) {
          try {
            const image = await pdfDoc.embedPng(imageData);
            const pdfPage = pdfDoc.addPage();
            const { width, height } = image;
            pdfPage.drawImage(image, {
              x: 0,
              y: 0,
              width: Math.min(width, pdfPage.getWidth()),
              height: Math.min(height, pdfPage.getHeight())
            });
          } catch (imgError) {
            console.error(`Failed to embed page ${page.pageIndex}:`, imgError);
          }
        }
      }

      // 添加元数据
      pdfDoc.setTitle(note.title);
      if (options.includeMetadata) {
        pdfDoc.setAuthor('Music Tool');
        pdfDoc.setCreationDate(new Date(note.createdAt));
        pdfDoc.setModificationDate(new Date(note.updatedAt));
      }

      const pdfBytes = await pdfDoc.save();
      return new Blob([pdfBytes], { type: 'application/pdf' });
    } catch (error) {
      throw new Error(`导出PDF失败: ${error}`);
    }
  }

  /**
   * 导出多个笔记
   */
  static async exportMultipleNotes(
    noteIds: string[],
    format: 'json' | 'zip' = 'zip'
  ): Promise<Blob> {
    const allData: any[] = [];

    for (const noteId of noteIds) {
      const note = await db.getNoteById(noteId);
      if (note) {
        const pages = await db.getScorePagesByNote(noteId);
        const layers = await db.getLayersByNote(noteId);

        allData.push({
          version: '1.0.0',
          timestamp: Date.now(),
          note,
          pages: pages.map((p) => ({
            ...p,
            imageBlob: undefined
          })),
          layers
        });
      }
    }

    if (format === 'json') {
      const json = JSON.stringify(allData, null, 2);
      return new Blob([json], { type: 'application/json' });
    }

    // ZIP格式处理
    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();

      for (let i = 0; i < allData.length; i++) {
        zip.file(`note_${i}.json`, JSON.stringify(allData[i], null, 2));
      }

      return await zip.generateAsync({ type: 'blob' });
    } catch (error) {
      throw new Error(`导出失败: ${error}`);
    }
  }

  /**
   * 导出为CSV（元数据）
   */
  static async exportAsCSV(noteIds: string[]): Promise<Blob> {
    let csv = 'ID,标题,创建时间,更新时间,页数\n';

    for (const noteId of noteIds) {
      const note = await db.getNoteById(noteId);
      if (note) {
        const pages = await db.getScorePagesByNote(noteId);
        const createdAt = new Date(note.createdAt).toLocaleString('zh-CN');
        const updatedAt = new Date(note.updatedAt).toLocaleString('zh-CN');

        // CSV转义
        const id = `"${note.id}"`;
        const title = `"${note.title.replace(/"/g, '""')}"`;
        csv += `${id},${title},"${createdAt}","${updatedAt}",${pages.length}\n`;
      }
    }

    return new Blob([csv], { type: 'text/csv;charset=utf-8' });
  }

  /**
   * 生成下载链接
   */
  static downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // 延迟释放URL以确保下载完成
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /**
   * 生成时间戳文件名
   */
  static generateFilename(
    baseName: string,
    format: 'json' | 'pdf' | 'png' | 'zip' | 'csv'
  ): string {
    const timestamp = new Date().toISOString().slice(0, 10);
    const extensions: Record<string, string> = {
      json: 'json',
      pdf: 'pdf',
      png: 'png',
      zip: 'zip',
      csv: 'csv'
    };
    return `${baseName}_${timestamp}.${extensions[format]}`;
  }
}
