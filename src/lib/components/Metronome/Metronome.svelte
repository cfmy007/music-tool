<script lang="ts">
  import { onMount } from 'svelte';
  import { metronomeStore } from '$lib/stores/metronomeStore';

  let { onclose } = $props<{ onclose: () => void }>();

  let bpm = $state(120);
  let timeSignature = $state('4/4');
  let sound = $state<'beep' | 'bell' | 'click'>('beep');
  let isPlaying = $state(false);

  const timeSignatures = ['2/4', '3/4', '4/4', '6/8'];

  // 从 store 同步状态
  let unsubscribe: (() => void) | null = null;

  onMount(() => {
    metronomeStore.loadSettings();

    unsubscribe = metronomeStore.subscribe((state) => {
      bpm = state.bpm;
      timeSignature = state.timeSignature;
      sound = state.sound;
      isPlaying = state.isPlaying;
    });
  });

  function handleBpmChange(value: number) {
    metronomeStore.setBpm(value);
    metronomeStore.restartIfPlaying();
  }

  function handleTimeSignatureChange(ts: string) {
    metronomeStore.setTimeSignature(ts);
    metronomeStore.restartIfPlaying();
  }

  function handleSoundChange(s: 'beep' | 'bell' | 'click') {
    metronomeStore.setSound(s);
  }

  function toggle() {
    metronomeStore.toggle();
  }
</script>

<div class="metronome-panel">
  <div class="panel-header">
    <h3>节拍器</h3>
    <button class="close-btn" aria-label="关闭对话框" onclick={onclose}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M6 18L18 6M6 6l12 12"
        />
      </svg>
    </button>
  </div>

  <div class="panel-content">
    <!-- BPM控制 -->
    <div class="control-group">
      <label for="bpm">BPM</label>
      <div class="bpm-control">
        <button onclick={() => handleBpmChange(bpm - 1)}>−</button>
        <input
          type="number"
          id="bpm"
          value={bpm}
          oninput={(e) => handleBpmChange(parseInt(e.currentTarget.value) || 120)}
          min="30"
          max="300"
        />
        <button onclick={() => handleBpmChange(bpm + 1)}>+</button>
      </div>
    </div>

    <!-- 拍号选择 -->
    <div class="control-group">
      <label for="time-sig">拍号</label>
      <select
        id="time-sig"
        value={timeSignature}
        onchange={(e) => handleTimeSignatureChange(e.currentTarget.value)}
      >
        {#each timeSignatures as sig}
          <option value={sig}>{sig}</option>
        {/each}
      </select>
    </div>

    <!-- 音色选择 -->
    <div class="control-group">
      <label for="sound">音色</label>
      <select
        id="sound"
        value={sound}
        onchange={(e) => handleSoundChange(e.currentTarget.value as any)}
      >
        <option value="beep">嘟声</option>
        <option value="bell">铃声</option>
        <option value="click">点击</option>
      </select>
    </div>

    <!-- 启动/暂停按钮 -->
    <button class="play-btn" class:playing={isPlaying} onclick={toggle}>
      {#if isPlaying}
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
        </svg>
        暂停
      {:else}
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5v14l11-7z" />
        </svg>
        开始
      {/if}
    </button>
  </div>
</div>

<style>
  .metronome-panel {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: white;
    border-top: 1px solid #e0e0e0;
    box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.1);
    z-index: 100;
    max-height: 60vh;
    animation: slideUp 0.3s ease-out;
  }

  @keyframes slideUp {
    from {
      transform: translateY(100%);
    }
    to {
      transform: translateY(0);
    }
  }

  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px;
    border-bottom: 1px solid #e0e0e0;
  }

  .panel-header h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: #333;
  }

  .close-btn {
    width: 32px;
    height: 32px;
    border: none;
    background: #f0f0f0;
    border-radius: 6px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #666;
    transition: all 0.2s;
  }

  .close-btn:hover {
    background: #e0e0e0;
  }

  .close-btn svg {
    width: 18px;
    height: 18px;
  }

  .panel-content {
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .control-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .control-group label {
    font-size: 12px;
    font-weight: 600;
    color: #666;
  }

  .bpm-control {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .bpm-control button {
    width: 36px;
    height: 36px;
    border: 1px solid #ddd;
    background: white;
    border-radius: 4px;
    cursor: pointer;
    font-size: 18px;
    font-weight: bold;
    color: #667eea;
    transition: all 0.2s;
  }

  .bpm-control button:hover {
    border-color: #667eea;
    background: #f5f5f5;
  }

  .bpm-control input {
    flex: 1;
    padding: 8px 12px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 16px;
    font-weight: bold;
    text-align: center;
    color: #333;
    background: white;
  }

  .bpm-control input:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }

  select {
    padding: 8px 12px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 14px;
    background: white;
    color: #333;
    cursor: pointer;
  }

  select:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }

  .play-btn {
    padding: 12px 24px;
    background: #667eea;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    transition: all 0.2s;
  }

  .play-btn:hover {
    background: #5568d3;
  }

  .play-btn.playing {
    background: #f87171;
  }

  .play-btn svg {
    width: 18px;
    height: 18px;
  }

  @media (max-width: 480px) {
    .metronome-panel {
      max-height: 70vh;
    }

    .panel-header {
      padding: 12px;
    }

    .panel-content {
      padding: 12px;
      gap: 12px;
    }

    .bpm-control button,
    .bpm-control input {
      font-size: 14px;
    }

    .play-btn {
      padding: 10px 20px;
      font-size: 13px;
    }
  }
</style>
