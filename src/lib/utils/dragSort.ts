/**
 * 拖拽排序配置
 */
export interface DragSortConfig {
  draggableClass: string;
  dragOverClass: string;
  ghostClass: string;
  animationDuration: number;
  onDragStart?: (item: any, index: number) => void;
  onDragEnd?: (fromIndex: number, toIndex: number) => void;
  onDragCancel?: () => void;
}

/**
 * 拖拽排序管理器
 */
export class DragSortManager {
  private config: DragSortConfig;
  private draggedElement: HTMLElement | null = null;
  private draggedIndex: number = -1;
  private ghostElement: HTMLElement | null = null;
  private dropZones: HTMLElement[] = [];
  private container: HTMLElement;

  constructor(container: HTMLElement, config: Partial<DragSortConfig> = {}) {
    this.container = container;
    this.config = {
      draggableClass: 'draggable',
      dragOverClass: 'drag-over',
      ghostClass: 'ghost',
      animationDuration: 150,
      ...config
    };

    this.initialize();
  }

  private initialize() {
    this.setupEventListeners();
    this.enable();
  }

  private setupEventListeners() {
    this.container.addEventListener('dragstart', (e) => this.handleDragStart(e));
    this.container.addEventListener('dragover', (e) => this.handleDragOver(e));
    this.container.addEventListener('drop', (e) => this.handleDrop(e));
    this.container.addEventListener('dragend', (e) => this.handleDragEnd(e));
    this.container.addEventListener('dragleave', (e) => this.handleDragLeave(e));
  }

  private handleDragStart(e: DragEvent) {
    const target = (e.target as HTMLElement)?.closest(`.${this.config.draggableClass}`);
    if (!target) return;

    this.draggedElement = target as HTMLElement;
    this.draggedIndex = Array.from(this.container.children).indexOf(this.draggedElement);

    this.draggedElement.classList.add(this.config.ghostClass);

    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/html', this.draggedElement.innerHTML);
    }

    this.config.onDragStart?.(this.draggedElement, this.draggedIndex);
  }

  private handleDragOver(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (!this.draggedElement) return;

    const target = (e.target as HTMLElement)?.closest(`.${this.config.draggableClass}`);
    if (!target || target === this.draggedElement) {
      // 清理所有dragOver样式
      document.querySelectorAll(`.${this.config.dragOverClass}`).forEach((el) => {
        el.classList.remove(this.config.dragOverClass);
      });
      return;
    }

    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move';
    }

    // 清理之前的dragOver样式
    document.querySelectorAll(`.${this.config.dragOverClass}`).forEach((el) => {
      el.classList.remove(this.config.dragOverClass);
    });

    // 添加新的dragOver样式
    target.classList.add(this.config.dragOverClass);

    // 交换位置预览
    const rect = target.getBoundingClientRect();
    const mouseY = e.clientY;
    const threshold = rect.height / 2;

    if (mouseY - rect.top < threshold) {
      this.container.insertBefore(this.draggedElement, target);
    } else {
      this.container.insertBefore(this.draggedElement, target.nextSibling);
    }
  }

  private handleDragLeave(e: DragEvent) {
    const target = e.target as HTMLElement;
    // 只在完全离开时移除
    if (target.classList.contains(this.config.draggableClass)) {
      target.classList.remove(this.config.dragOverClass);
    }
  }

  private handleDrop(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (!this.draggedElement) return;

    const newIndex = Array.from(this.container.children).indexOf(this.draggedElement);

    if (this.draggedIndex !== newIndex && this.config.onDragEnd) {
      this.config.onDragEnd(this.draggedIndex, newIndex);
    }

    // 清理所有拖拽样式
    document.querySelectorAll(`.${this.config.dragOverClass}`).forEach((el) => {
      el.classList.remove(this.config.dragOverClass);
    });
  }

  private handleDragEnd(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (this.draggedElement) {
      this.draggedElement.classList.remove(this.config.ghostClass);
    }

    document.querySelectorAll(`.${this.config.dragOverClass}`).forEach((el) => {
      el.classList.remove(this.config.dragOverClass);
    });

    this.draggedElement = null;
    this.draggedIndex = -1;
  }

  /**
   * 启用拖拽
   */
  enable() {
    this.container.style.userSelect = 'none';
    document.querySelectorAll(`.${this.config.draggableClass}`).forEach((el) => {
      (el as HTMLElement).draggable = true;
    });
  }

  /**
   * 禁用拖拽
   */
  disable() {
    document.querySelectorAll(`.${this.config.draggableClass}`).forEach((el) => {
      (el as HTMLElement).draggable = false;
    });
  }

  /**
   * 销毁
   */
  destroy() {
    this.disable();
    this.container.removeEventListener('dragstart', (e) => this.handleDragStart(e));
    this.container.removeEventListener('dragover', (e) => this.handleDragOver(e));
    this.container.removeEventListener('drop', (e) => this.handleDrop(e));
    this.container.removeEventListener('dragend', (e) => this.handleDragEnd(e));
  }
}

/**
 * Svelte 5 动作：拖拽排序
 */
export function dragSort(element: HTMLElement, options: Partial<DragSortConfig> = {}) {
  let manager: DragSortManager | null = null;

  const init = () => {
    manager = new DragSortManager(element, options);
  };

  const destroy = () => {
    manager?.destroy();
  };

  init();

  return {
    destroy,
    update(newOptions: Partial<DragSortConfig>) {
      destroy();
      // 延迟重新初始化以确保DOM更新完成
      setTimeout(() => {
        init();
      }, 0);
    }
  };
}

/**
 * 触摸拖拽排序（移动设备）
 */
export class TouchDragSortManager {
  private container: HTMLElement;
  private draggedElement: HTMLElement | null = null;
  private draggedIndex: number = -1;
  private startY: number = 0;
  private offsetY: number = 0;
  private config: DragSortConfig;
  private touchIdentifier: number = -1;

  constructor(container: HTMLElement, config: Partial<DragSortConfig> = {}) {
    this.container = container;
    this.config = {
      draggableClass: 'draggable',
      dragOverClass: 'drag-over',
      ghostClass: 'ghost',
      animationDuration: 150,
      ...config
    };

    this.setupEventListeners();
  }

  private setupEventListeners() {
    this.container.addEventListener('touchstart', (e) => this.handleTouchStart(e));
    this.container.addEventListener('touchmove', (e) => this.handleTouchMove(e));
    this.container.addEventListener('touchend', (e) => this.handleTouchEnd(e));
    this.container.addEventListener('touchcancel', (e) => this.handleTouchCancel(e));
  }

  private handleTouchStart(e: TouchEvent) {
    const target = (e.target as HTMLElement)?.closest(`.${this.config.draggableClass}`);
    if (!target) return;

    this.draggedElement = target as HTMLElement;
    this.draggedIndex = Array.from(this.container.children).indexOf(this.draggedElement);
    this.startY = e.touches[0].clientY;
    this.touchIdentifier = e.touches[0].identifier;

    this.draggedElement.classList.add(this.config.ghostClass);
    this.config.onDragStart?.(this.draggedElement, this.draggedIndex);
  }

  private handleTouchMove(e: TouchEvent) {
    if (!this.draggedElement || this.touchIdentifier === -1) return;

    const touch = Array.from(e.touches).find((t) => t.identifier === this.touchIdentifier);
    if (!touch) return;

    this.offsetY = touch.clientY - this.startY;

    // 计算新位置
    const rect = this.draggedElement.getBoundingClientRect();
    const centerY = rect.top + rect.height / 2 + this.offsetY;

    // 检查与其他元素的重叠
    Array.from(this.container.children).forEach((child, index) => {
      if (child === this.draggedElement) return;

      const childRect = (child as HTMLElement).getBoundingClientRect();
      const childCenterY = childRect.top + childRect.height / 2;

      if (Math.abs(centerY - childCenterY) < childRect.height / 2) {
        if (centerY < childCenterY) {
          this.container.insertBefore(this.draggedElement!, child);
        } else {
          this.container.insertBefore(this.draggedElement!, child.nextSibling);
        }
      }
    });
  }

  private handleTouchEnd(e: TouchEvent) {
    if (!this.draggedElement) return;

    const newIndex = Array.from(this.container.children).indexOf(this.draggedElement);

    if (this.draggedIndex !== newIndex && this.config.onDragEnd) {
      this.config.onDragEnd(this.draggedIndex, newIndex);
    }

    this.cleanup();
  }

  private handleTouchCancel(e: TouchEvent) {
    this.config.onDragCancel?.();
    this.cleanup();
  }

  private cleanup() {
    if (this.draggedElement) {
      this.draggedElement.classList.remove(this.config.ghostClass);
    }

    document.querySelectorAll(`.${this.config.dragOverClass}`).forEach((el) => {
      el.classList.remove(this.config.dragOverClass);
    });

    this.draggedElement = null;
    this.draggedIndex = -1;
    this.touchIdentifier = -1;
  }

  destroy() {
    this.container.removeEventListener('touchstart', (e) => this.handleTouchStart(e));
    this.container.removeEventListener('touchmove', (e) => this.handleTouchMove(e));
    this.container.removeEventListener('touchend', (e) => this.handleTouchEnd(e));
  }
}

/**
 * Svelte 5 动作：触摸拖拽排序
 */
export function touchDragSort(element: HTMLElement, options: Partial<DragSortConfig> = {}) {
  let manager: TouchDragSortManager | null = null;

  const init = () => {
    manager = new TouchDragSortManager(element, options);
  };

  const destroy = () => {
    manager?.destroy();
  };

  init();

  return { destroy };
}
