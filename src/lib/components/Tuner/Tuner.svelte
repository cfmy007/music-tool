<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { PitchDetector } from 'pitchy';

  interface Instrument {
    name: string;
    strings: string[];
  }

  const instruments: Instrument[] = [
    { name: '吉他', strings: ['E', 'A', 'D', 'G', 'B', 'E'] },
    { name: '贝斯', strings: ['E', 'A', 'D', 'G'] },
    { name: '尤克里里', strings: ['G', 'C', 'E', 'A'] },
    { name: '斑鸠琴', strings: ['G', 'D', 'G', 'B', 'D'] },
    { name: '曼陀铃', strings: ['G', 'G', 'D', 'D', 'A', 'A', 'E', 'E'] },
    { name: '小提琴', strings: ['G', 'D', 'A', 'E'] },
    { name: '中提琴', strings: ['C', 'G', 'D', 'A'] },
    { name: '大提琴', strings: ['C', 'G', 'D', 'A'] },
    { name: '低音提琴', strings: ['E', 'A', 'D', 'G'] }
  ];

  const noteNames = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];

  let selectedInstrument = instruments[0];
  let a4Frequency = 440;
  let displayNote = '--';
  let displayOctave = '0';
  let displayFrequency = '0.00';
  let displayCents = 0;
  let confidence = 0;
  let isRecording = false;
  let isTuning = false;
  let tuningError = '';

  let mediaStream: MediaStream | null = null;
  let audioContext: AudioContext | null = null;
  let analyser: AnalyserNode | null = null;
  let detector: PitchDetector<Float32Array> | null = null;

  let rafId: number | null = null;
  let lastNote = '';
  let lastCents = 0;
  let lastConfidence = 0;

  onDestroy(() => {
    stopRecording();
    if (rafId) cancelAnimationFrame(rafId);
  });

  async function startTuning() {
    if (isTuning) return;

    try {
      tuningError = '';
      isTuning = true;

      mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      audioContext = new AudioContextClass();
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 4096;
      analyser.smoothingTimeConstant = 0.3;

      const source = audioContext.createMediaStreamSource(mediaStream);
      source.connect(analyser);

      // 使用Pitchy创建检测器
      detector = PitchDetector.forFloat32Array(analyser.fftSize);

      startFrequencyDetection();
      isRecording = true;
    } catch (error: any) {
      console.error('音频错误:', error);
      isTuning = false;
      isRecording = false;

      if (error.name === 'NotAllowedError') {
        tuningError = '无法访问麦克风，请检查权限设置';
      } else if (error.name === 'NotFoundError') {
        tuningError = '未找到麦克风设备';
      } else if (error.name === 'NotReadableError') {
        tuningError = '麦克风被其他应用占用';
      } else {
        tuningError = '启动麦克风失败，请重试';
      }
    }
  }

  function startFrequencyDetection() {
    if (!analyser || !audioContext || !detector) return;

    const dataArray = new Float32Array(analyser.fftSize);
    const sampleRate = audioContext.sampleRate;

    if (rafId) cancelAnimationFrame(rafId);

    function detect() {
      if (!analyser || !isTuning || !detector) {
        rafId = null;
        return;
      }

      analyser.getFloatTimeDomainData(dataArray);

      const [frequency, clarity] = detector.findPitch(dataArray, sampleRate);

      if (clarity > 0.85 && frequency > 20 && frequency < 4000) {
        analyzeFrequency(frequency, clarity);
      }

      rafId = requestAnimationFrame(detect);
    }

    detect();
  }

  function analyzeFrequency(frequency: number, clarity: number) {
    // 根据a4Frequency计算音符
    const ln2 = Math.LN2;
    const semiTonesFromA4 = 12 * (Math.log(frequency / a4Frequency) / ln2);
    const closestSemiTone = Math.round(semiTonesFromA4);
    const targetFrequency = a4Frequency * Math.pow(2, closestSemiTone / 12);
    const cents = 1200 * (Math.log(frequency / targetFrequency) / ln2);

    let noteIndex = (9 + closestSemiTone) % 12;
    if (noteIndex < 0) noteIndex += 12;

    const octave = Math.floor((closestSemiTone + 9) / 12) + 4;
    const newNote = noteNames[noteIndex];
    const newCents = Math.round(cents * 10) / 10;
    const newFrequency = Math.round(frequency * 100) / 100;

    // 更新显示
    if (newNote !== lastNote || Math.abs(newCents - lastCents) > 1 || clarity !== lastConfidence) {
      lastNote = newNote;
      lastCents = newCents;
      lastConfidence = clarity;

      displayNote = newNote;
      displayOctave = octave.toString();
      displayFrequency = newFrequency.toFixed(2);
      displayCents = newCents;
      confidence = Math.round(clarity * 100);
    }
  }

  function stopTuning() {
    isTuning = false;
    stopRecording();
    displayNote = '--';
    displayOctave = '0';
    displayFrequency = '0.00';
    displayCents = 0;
    confidence = 0;
    tuningError = '';
    lastNote = '';
    lastCents = 0;
    lastConfidence = 0;

    if (rafId) cancelAnimationFrame(rafId);
  }

  function stopRecording() {
    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => track.stop());
      mediaStream = null;
    }
    if (audioContext) {
      audioContext.close();
      audioContext = null;
    }
    isRecording = false;
  }

  function getCentsColor(): string {
    if (displayNote === '--') return '#999';
    const absCents = Math.abs(displayCents);
    if (absCents < 5) return '#4ade80'; // 绿色：正常
    if (displayCents < 0) return '#f87171'; // 红色：偏低
    return '#60a5fa'; // 蓝色：偏高
  }

  function getConfidenceBarStyle(): string {
    const percentage = Math.max(0, Math.min(100, confidence));
    return `width: ${percentage}%`;
  }

  function getIndicatorPosition(): number {
    if (displayNote === '--') return 50;
    return 50 + Math.max(-48, Math.min(48, displayCents));
  }
</script>

<div class="tuner-container">
  <div class="tuner-header">
    <h1>🎵 调音器</h1>
  </div>

  <div class="tuner-content">
    {#if !isTuning}
      <!-- 未开始调音状态 -->
      <div class="welcome-section">
        <h2>开始调音</h2>
        <p>选择您的乐器，调整参考频率后开始调音</p>
      </div>

      <div class="controls-panel">
        <!-- 乐器选择 -->
        <div class="control-group">
          <label for="instrument">选择乐器</label>
          <select id="instrument" bind:value={selectedInstrument} class="instrument-select">
            {#each instruments as inst (inst.name)}
              <option value={inst}>{inst.name}</option>
            {/each}
          </select>
        </div>

        <!-- 参考弦 -->
        <div class="control-group">
          <p class="reference-strings">
            参考弦: <span>{selectedInstrument.strings.join(' · ')}</span>
          </p>
        </div>

        <!-- A4 频率设置 -->
        <div class="control-group">
          <label for="a4-freq">A4 频率 (Hz)</label>
          <div class="frequency-input">
            <input
              id="a4-freq"
              type="number"
              bind:value={a4Frequency}
              min="400"
              max="480"
              step="1"
              class="freq-input"
            />
            <span class="freq-unit">Hz</span>
          </div>
        </div>

        <!-- 错误提示 -->
        {#if tuningError}
          <div class="error-message">
            <span class="error-icon">⚠️</span>
            <span>{tuningError}</span>
          </div>
        {/if}

        <!-- 开始按钮 -->
        <button class="start-button" on:click={startTuning}>
          <span class="button-icon">▶️</span>
          <span>开始调音</span>
        </button>
      </div>
    {:else}
      <!-- 调音中状态 -->
      <div class="tuner-header-compact">
        <div class="tuner-info">
          <span class="instrument-badge">{selectedInstrument.name}</span>
          <span class="frequency-badge">A4: {a4Frequency}Hz</span>
          <span class="frequency-badge"
            >参考弦: <span>{selectedInstrument.strings.join(' · ')}</span></span
          >
        </div>
      </div>

      <!-- 核心显示区域 -->
      <div class="display-area">
        <!-- 大音符显示 -->
        <div class="note-display-container">
          <div class="note-display">
            <div class="note-number">{displayNote}</div>
            {#if displayNote !== '--'}
              <div class="note-octave">
                <sup>{displayOctave}</sup>
              </div>
            {/if}
          </div>
        </div>

        <!-- 频率和Cents显示 -->
        <div class="frequency-info">
          <div class="info-item">
            <span class="label">频率</span>
            <span class="value">{displayFrequency} Hz</span>
          </div>
          <div class="info-item">
            <span class="label">偏离</span>
            <span class="value" style="color: {getCentsColor()}">
              {displayCents > 0 ? '+' : ''}{displayCents.toFixed(1)} ¢
            </span>
          </div>
        </div>

        <!-- 指示器 -->
        <div class="indicator-section">
          <div class="indicator-bar">
            <div class="indicator-track">
              <div
                class="indicator-needle"
                style="left: calc({getIndicatorPosition()}% - 2px)"
              ></div>
            </div>
            <div class="indicator-labels">
              <span>♭ 低</span>
              <span class="center-mark">正</span>
              <span>高 ♯</span>
            </div>
          </div>
        </div>

        <!-- 清晰度指示器 -->
        <div class="clarity-section">
          <div class="clarity-label">
            <span>信号清晰度</span>
            <span class="clarity-value">{confidence}%</span>
          </div>
          <div class="clarity-bar">
            <div class="clarity-fill" style={getConfidenceBarStyle()}></div>
          </div>
        </div>
      </div>

      <!-- 状态指示 -->
      <div class="status-bar">
        <span class="status-dot recording"></span>
        <span class="status-text">正在监听麦克风</span>
      </div>

      <!-- 停止按钮 -->
      <button class="stop-button" on:click={stopTuning}>
        <span class="button-icon">⏹️</span>
        <span>停止调音</span>
      </button>
    {/if}
  </div>
</div>

<style>
  .tuner-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    overflow: hidden;
  }

  .tuner-header {
    padding: 24px 16px;
    text-align: center;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  .tuner-header h1 {
    margin: 0;
    font-size: 28px;
    font-weight: 600;
    letter-spacing: 0.5px;
  }

  .tuner-header-compact {
    padding: 12px 16px;
    background: rgba(255, 255, 255, 0.05);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  .tuner-info {
    display: flex;
    gap: 12px;
    justify-content: center;
    flex-wrap: wrap;
  }

  .instrument-badge,
  .frequency-badge {
    padding: 6px 12px;
    background: rgba(255, 255, 255, 0.15);
    border-radius: 20px;
    font-size: 13px;
    font-weight: 600;
    border: 1px solid rgba(255, 255, 255, 0.3);
  }

  .tuner-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 24px 16px;
    gap: 24px;
    overflow-y: auto;
  }

  /* ============ 欢迎界面 ============ */
  .welcome-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    text-align: center;
    margin-bottom: 12px;
  }

  @keyframes float {
    0%,
    100% {
      transform: translateY(0px);
    }
    50% {
      transform: translateY(-10px);
    }
  }

  .welcome-section h2 {
    margin: 0;
    font-size: 24px;
    font-weight: 600;
  }

  .welcome-section p {
    margin: 0;
    font-size: 14px;
    opacity: 0.8;
  }

  /* ============ 控制面板 ============ */
  .controls-panel {
    display: flex;
    flex-direction: column;
    gap: 16px;
    background: rgba(255, 255, 255, 0.1);
    padding: 20px;
    border-radius: 16px;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.15);
  }

  .control-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .control-group label {
    font-size: 14px;
    font-weight: 500;
    opacity: 0.9;
  }

  .instrument-select {
    padding: 12px 14px;
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.05);
    color: white;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .instrument-select:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.5);
  }

  .instrument-select:focus {
    outline: none;
    background: rgba(255, 255, 255, 0.15);
    border-color: rgba(255, 255, 255, 0.6);
    box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.2);
  }

  .instrument-select option {
    background: #333;
    color: white;
  }

  .reference-strings {
    margin: 0;
    font-size: 14px;
    opacity: 0.85;
    line-height: 1.4;
  }

  .reference-strings span {
    font-weight: 600;
    letter-spacing: 1px;
  }

  .frequency-input {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .freq-input {
    flex: 1;
    padding: 12px 14px;
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.05);
    color: white;
    font-size: 16px;
    font-weight: bold;
    text-align: center;
    transition: all 0.3s ease;
  }

  .freq-input:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  .freq-input:focus {
    outline: none;
    background: rgba(255, 255, 255, 0.15);
    border-color: rgba(255, 255, 255, 0.5);
    box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.2);
  }

  .freq-unit {
    font-size: 14px;
    opacity: 0.7;
  }

  /* ============ 错误提示 ============ */
  .error-message {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 14px;
    background: rgba(239, 68, 68, 0.2);
    border: 1px solid rgba(239, 68, 68, 0.5);
    border-radius: 8px;
    font-size: 13px;
    animation: slideIn 0.3s ease-out;
  }

  .error-icon {
    font-size: 16px;
    flex-shrink: 0;
  }

  @keyframes slideIn {
    from {
      transform: translateY(-10px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  /* ============ 按钮 ============ */
  .start-button,
  .stop-button {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 14px 24px;
    border: none;
    border-radius: 12px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .start-button {
    background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%);
    color: white;
    box-shadow: 0 4px 15px rgba(74, 222, 128, 0.3);
  }

  .start-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(74, 222, 128, 0.4);
  }

  .start-button:active {
    transform: translateY(0);
  }

  .stop-button {
    background: linear-gradient(135deg, #f87171 0%, #ef4444 100%);
    color: white;
    box-shadow: 0 4px 15px rgba(248, 113, 113, 0.3);
  }

  .stop-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(248, 113, 113, 0.4);
  }

  .stop-button:active {
    transform: translateY(0);
  }

  .button-icon {
    font-size: 18px;
  }

  /* ============ 显示区域 ============ */
  .display-area {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 24px;
    min-height: 280px;
  }

  .note-display-container {
    display: flex;
    justify-content: center;
    align-items: flex-start;
  }

  .note-display {
    display: flex;
    align-items: flex-start;
    gap: 0;
  }

  .note-number {
    font-size: clamp(80px, 18vw, 160px);
    font-weight: 800;
    line-height: 1;
    letter-spacing: -6px;
    text-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
    animation: fadeIn 0.2s ease-out;
  }

  .note-octave {
    font-size: clamp(24px, 6vw, 48px);
    font-weight: 700;
    margin-top: 12px;
    margin-left: 4px;
  }

  @keyframes fadeIn {
    from {
      opacity: 0.5;
      transform: scale(0.95);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  /* ============ 频率信息 ============ */
  .frequency-info {
    display: flex;
    gap: 24px;
    justify-content: center;
    flex-wrap: wrap;
  }

  .info-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
  }

  .info-item .label {
    font-size: 12px;
    opacity: 0.8;
    text-transform: uppercase;
    letter-spacing: 1px;
    font-weight: 600;
  }

  .info-item .value {
    font-size: 24px;
    font-weight: bold;
    letter-spacing: 0.5px;
    transition: color 0.15s ease;
  }

  /* ============ 指示器 ============ */
  .indicator-section {
    width: 100%;
    max-width: 400px;
  }

  .indicator-bar {
    width: 100%;
  }

  .indicator-track {
    position: relative;
    height: 12px;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 6px;
    overflow: hidden;
    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.2);
  }

  .indicator-needle {
    position: absolute;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 5px;
    height: 28px;
    background: white;
    border-radius: 3px;
    transition: left 0.08s ease-out;
    box-shadow:
      0 0 12px rgba(255, 255, 255, 0.8),
      0 0 24px rgba(255, 255, 255, 0.4);
  }

  .indicator-labels {
    display: flex;
    justify-content: space-between;
    margin-top: 12px;
    font-size: 12px;
    opacity: 0.85;
    font-weight: 600;
  }

  .indicator-labels .center-mark {
    font-weight: 700;
  }

  /* ============ 清晰度 ============ */
  .clarity-section {
    width: 100%;
    max-width: 400px;
  }

  .clarity-label {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
    font-size: 12px;
    opacity: 0.85;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .clarity-value {
    font-weight: 700;
    font-size: 14px;
  }

  .clarity-bar {
    height: 6px;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 3px;
    overflow: hidden;
  }

  .clarity-fill {
    height: 100%;
    background: linear-gradient(90deg, #60a5fa 0%, #4ade80 50%, #fbbf24 100%);
    transition: width 0.2s ease;
    border-radius: 3px;
  }

  /* ============ 状态栏 ============ */
  .status-bar {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    font-size: 14px;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .status-dot {
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .status-dot.recording {
    background: #4ade80;
    animation: pulse 1.5s ease-in-out infinite;
    box-shadow: 0 0 8px rgba(74, 222, 128, 0.6);
  }

  .status-text {
    flex: 1;
  }

  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
      box-shadow: 0 0 8px rgba(74, 222, 128, 0.6);
    }
    50% {
      opacity: 0.5;
      box-shadow: 0 0 4px rgba(74, 222, 128, 0.3);
    }
  }

  /* ============ 响应式 ============ */
  @media (max-width: 768px) {
    .tuner-content {
      gap: 16px;
      padding: 16px;
    }

    .controls-panel {
      padding: 16px;
      gap: 14px;
    }

    .welcome-section h2 {
      font-size: 20px;
    }

    .display-area {
      gap: 20px;
      min-height: 240px;
    }

    .start-button,
    .stop-button {
      padding: 12px 20px;
      font-size: 14px;
    }
  }

  @media (max-width: 480px) {
    .tuner-header h1 {
      font-size: 20px;
    }

    .tuner-content {
      gap: 12px;
      padding: 12px;
    }

    .controls-panel {
      padding: 14px;
      gap: 12px;
      border-radius: 12px;
    }

    .control-group label {
      font-size: 13px;
    }

    .reference-strings {
      font-size: 13px;
    }

    .instrument-select,
    .freq-input {
      font-size: 13px;
      padding: 10px 12px;
    }

    .welcome-section h2 {
      font-size: 18px;
    }

    .welcome-section p {
      font-size: 12px;
    }

    .display-area {
      gap: 16px;
      min-height: 200px;
    }

    .note-number {
      font-size: clamp(60px, 15vw, 120px);
      letter-spacing: -4px;
    }

    .note-octave {
      font-size: clamp(20px, 5vw, 36px);
    }

    .info-item .value {
      font-size: 20px;
    }

    .indicator-section,
    .clarity-section {
      max-width: 100%;
    }

    .status-bar {
      font-size: 12px;
      padding: 10px 12px;
    }

    .error-message {
      font-size: 12px;
      padding: 10px 12px;
    }

    .start-button,
    .stop-button {
      padding: 11px 18px;
      font-size: 13px;
      gap: 8px;
    }

    .button-icon {
      font-size: 16px;
    }
  }

  @media (max-height: 600px) {
    .tuner-header {
      padding: 12px 16px;
    }

    .tuner-header h1 {
      font-size: 18px;
    }

    .tuner-content {
      gap: 8px;
      padding: 12px;
    }

    .controls-panel {
      padding: 12px;
      gap: 10px;
    }

    .display-area {
      gap: 12px;
      min-height: 160px;
    }
  }
</style>
