<script lang="ts">
  import type { DrawTool } from '$lib/utils/drawingEngine';

  interface Props {
    tool: DrawTool;
    color: string;
    size: number;
    canUndo: boolean;
    canRedo: boolean;
    onToolChange: (tool: DrawTool) => void;
    onColorChange: (color: string) => void;
    onSizeChange: (size: number) => void;
    onUndo: () => void;
    onRedo: () => void;
    onClear: () => void;
  }

  let {
    tool,
    color,
    size,
    canUndo,
    canRedo,
    onToolChange,
    onColorChange,
    onSizeChange,
    onUndo,
    onRedo,
    onClear
  }: Props = $props();

  const presetColors = [
    '#000000',
    '#ffffff',
    '#ff0000',
    '#00ff00',
    '#0000ff',
    '#ffff00',
    '#ff00ff',
    '#00ffff',
    '#ff8800',
    '#8800ff'
  ];
</script>

<div class="drawing-toolbar">
  <div class="tool-group">
    <button
      class="tool-btn"
      class:active={tool === 'pen'}
      onclick={() => onToolChange('pen')}
      title="画笔"
      aria-label="画笔工具"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path
          d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path d="m15 5 4 4" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </button>

    <button
      class="tool-btn"
      class:active={tool === 'eraser'}
      onclick={() => onToolChange('eraser')}
      title="橡皮擦"
      aria-label="橡皮擦工具"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path
          d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path d="M22 21H7" stroke-linecap="round" stroke-linejoin="round" />
        <path d="m5 11 9 9" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </button>
  </div>

  <div class="separator"></div>

  <div class="tool-group">
    <div class="color-picker-wrapper">
      <input
        type="color"
        value={color}
        oninput={(e) => onColorChange(e.currentTarget.value)}
        class="color-input"
        title="选择颜色"
        aria-label="选择颜色"
      />
      <div class="color-preview" style="background-color: {color}"></div>
    </div>

    <div class="preset-colors">
      {#each presetColors as presetColor}
        <button
          class="preset-color"
          class:active={color === presetColor}
          style="background-color: {presetColor}"
          onclick={() => onColorChange(presetColor)}
          title={presetColor}
          aria-label="颜色 {presetColor}"
        ></button>
      {/each}
    </div>
  </div>

  <div class="separator"></div>

  <div class="tool-group size-group">
    <label class="size-label" for="brush-size">大小</label>
    <input
      id="brush-size"
      type="range"
      min="1"
      max="50"
      value={size}
      oninput={(e) => onSizeChange(parseInt(e.currentTarget.value))}
      class="size-slider"
      aria-label="画笔大小"
    />
    <span class="size-value">{size}</span>
  </div>

  <div class="separator"></div>

  <div class="tool-group">
    <button class="tool-btn" disabled={!canUndo} onclick={onUndo} title="撤销" aria-label="撤销">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M3 7v6h6" stroke-linecap="round" stroke-linejoin="round" />
        <path
          d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </button>

    <button class="tool-btn" disabled={!canRedo} onclick={onRedo} title="重做" aria-label="重做">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 7v6h-6" stroke-linecap="round" stroke-linejoin="round" />
        <path
          d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </button>

    <button
      class="tool-btn danger"
      onclick={() => {
        if (confirm('确定要清空所有绘图吗？')) {
          onClear();
        }
      }}
      title="清空"
      aria-label="清空绘图"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M3 6h18" stroke-linecap="round" stroke-linejoin="round" />
        <path
          d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </button>
  </div>
</div>

<style>
  .drawing-toolbar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 12px;
    background: white;
    border-bottom: 1px solid #e0e0e0;
    flex-wrap: wrap;
    z-index: 20;
    min-height: 44px;
  }

  .tool-group {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .separator {
    width: 1px;
    height: 24px;
    background: #e0e0e0;
    margin: 0 4px;
  }

  .tool-btn {
    width: 32px;
    height: 32px;
    border: 1px solid #ddd;
    background: white;
    border-radius: 6px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #555;
    transition: all 0.15s;
  }

  .tool-btn:hover:not(:disabled) {
    border-color: #667eea;
    color: #667eea;
    background: #f0f4ff;
  }

  .tool-btn.active {
    background: #667eea;
    color: white;
    border-color: #667eea;
  }

  .tool-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .tool-btn.danger:hover {
    border-color: #e53e3e;
    color: #e53e3e;
    background: #fff5f5;
  }

  .tool-btn svg {
    width: 16px;
    height: 16px;
  }

  .color-picker-wrapper {
    position: relative;
    width: 32px;
    height: 32px;
  }

  .color-input {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    opacity: 0;
    cursor: pointer;
  }

  .color-preview {
    width: 32px;
    height: 32px;
    border: 2px solid #ddd;
    border-radius: 6px;
    pointer-events: none;
  }

  .preset-colors {
    display: flex;
    gap: 2px;
  }

  .preset-color {
    width: 18px;
    height: 18px;
    border: 2px solid transparent;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.15s;
    padding: 0;
  }

  .preset-color:hover {
    transform: scale(1.2);
  }

  .preset-color.active {
    border-color: #667eea;
    box-shadow:
      0 0 0 1px white,
      0 0 0 3px #667eea;
  }

  .size-group {
    gap: 6px;
  }

  .size-label {
    font-size: 11px;
    color: #888;
    min-width: 28px;
  }

  .size-slider {
    width: 60px;
    height: 18px;
    cursor: pointer;
    accent-color: #667eea;
  }

  .size-value {
    font-size: 11px;
    color: #555;
    min-width: 24px;
    text-align: center;
    font-weight: 600;
  }

  @media (max-width: 768px) {
    .drawing-toolbar {
      padding: 4px 8px;
      gap: 6px;
    }

    .preset-colors {
      display: none;
    }

    .size-slider {
      width: 40px;
    }

    .tool-btn {
      width: 28px;
      height: 28px;
    }

    .tool-btn svg {
      width: 14px;
      height: 14px;
    }
  }
</style>
