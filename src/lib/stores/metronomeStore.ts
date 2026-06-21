import { writable, derived } from 'svelte/store';
import { db } from '$lib/db/indexedDB';

interface MetronomeState {
  bpm: number;
  timeSignature: string;
  sound: 'beep' | 'bell' | 'click';
  isPlaying: boolean;
}

const initialState: MetronomeState = {
  bpm: 120,
  timeSignature: '4/4',
  sound: 'beep',
  isPlaying: false
};

function createMetronomeStore() {
  const { subscribe, set, update } = writable<MetronomeState>(initialState);

  let audioContext: AudioContext | null = null;
  let gain: GainNode | null = null;
  let beatCount = 0;
  let beatTimer: ReturnType<typeof setInterval> | null = null;

  async function initAudio() {
    if (!audioContext) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      audioContext = new AudioContextClass();
      gain = audioContext.createGain();
      gain.connect(audioContext.destination);
    }
  }

  async function playBeat(isAccent: boolean, sound: 'beep' | 'bell' | 'click') {
    await initAudio();
    if (!audioContext || !gain) return;

    const now = audioContext.currentTime;
    const duration = 0.1;

    const oscillator = audioContext.createOscillator();
    const tempGain = audioContext.createGain();
    tempGain.connect(gain!);

    tempGain.gain.setValueAtTime(0.3, now);

    if (sound === 'beep') {
      oscillator.type = 'sine';
      oscillator.frequency.value = isAccent ? 1000 : 800;
      tempGain.gain.exponentialRampToValueAtTime(0.01, now + duration);
    } else if (sound === 'bell') {
      oscillator.type = 'triangle';
      oscillator.frequency.value = isAccent ? 1500 : 1200;
      tempGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    } else if (sound === 'click') {
      oscillator.type = 'square';
      oscillator.frequency.value = isAccent ? 600 : 400;
      tempGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    }

    oscillator.connect(tempGain);
    oscillator.start(now);
    oscillator.stop(now + (sound === 'bell' ? 0.15 : 0.1));
  }

  function stopTimer() {
    if (beatTimer) {
      clearInterval(beatTimer);
      beatTimer = null;
    }
  }

  return {
    subscribe,

    async loadSettings() {
      const settings = await db.getAppSettings();
      if (settings?.metronomeSettings) {
        update((state) => ({
          ...state,
          bpm: settings.metronomeSettings.bpm,
          timeSignature: settings.metronomeSettings.timeSignature,
          sound: settings.metronomeSettings.sound
        }));
      }
    },

    async saveSettings() {
      let settings = await db.getAppSettings();
      if (settings) {
        let currentState: MetronomeState = initialState;
        const unsub = subscribe((s) => (currentState = s))();
        settings.metronomeSettings = {
          bpm: currentState.bpm,
          timeSignature: currentState.timeSignature,
          sound: currentState.sound
        };
        await db.updateAppSettings(settings);
      }
    },

    setBpm(bpm: number) {
      update((state) => ({ ...state, bpm: Math.max(30, Math.min(300, bpm)) }));
    },

    setTimeSignature(ts: string) {
      update((state) => ({ ...state, timeSignature: ts }));
    },

    setSound(sound: 'beep' | 'bell' | 'click') {
      update((state) => ({ ...state, sound }));
    },

    start() {
      update((state) => {
        if (state.isPlaying) return state;

        beatCount = 0;
        const beatDuration = (60 / state.bpm) * 1000;
        const beats = parseInt(state.timeSignature.split('/')[0]);

        beatTimer = setInterval(() => {
          const isAccent = beatCount % beats === 0;
          playBeat(isAccent, state.sound);
          beatCount++;
        }, beatDuration);

        return { ...state, isPlaying: true };
      });

      this.saveSettings();
    },

    stop() {
      stopTimer();
      update((state) => ({ ...state, isPlaying: false }));
    },

    toggle() {
      let currentState: MetronomeState = initialState;
      const unsub = subscribe((s) => (currentState = s))();

      if (currentState.isPlaying) {
        this.stop();
      } else {
        this.start();
      }
    },

    // 用于切换 BPM 时重启
    restartIfPlaying() {
      let currentState: MetronomeState = initialState;
      const unsub = subscribe((s) => (currentState = s))();

      if (currentState.isPlaying) {
        stopTimer();
        beatCount = 0;
        const beatDuration = (60 / currentState.bpm) * 1000;
        const beats = parseInt(currentState.timeSignature.split('/')[0]);

        beatTimer = setInterval(() => {
          const isAccent = beatCount % beats === 0;
          playBeat(isAccent, currentState.sound);
          beatCount++;
        }, beatDuration);
      }
    }
  };
}

export const metronomeStore = createMetronomeStore();
