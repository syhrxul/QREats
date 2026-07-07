let globalAudioCtx: AudioContext | null = null;

/**
 * Mengambil atau membuat satu instance global AudioContext
 */
function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!globalAudioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      globalAudioCtx = new AudioContextClass();
    }
  }
  return globalAudioCtx;
}

/**
 * Meng-unlock AudioContext menggunakan buffer sunyi pada interaksi pertama user.
 * Ini menyelesaikan pembatasan kebijakan autoplay suara pada browser modern.
 */
export function initAndUnlockAudio(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  
  if (ctx.state === 'suspended') {
    ctx.resume().then(() => {
      const buffer = ctx.createBuffer(1, 1, 22050);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(0);
      console.log('AudioContext berhasil di-unlock secara senyap.');
    }).catch(err => console.warn('Gagal resume AudioContext:', err));
  }
}

/**
 * Mensintesis suara notifikasi lonceng ganda yang menyenangkan
 * menggunakan Web Audio API tanpa bergantung pada aset audio eksternal.
 */
export function playNotificationSound(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    // Nada 1: D5 (587.33Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, ctx.currentTime);
    gain1.gain.setValueAtTime(0.08, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start();
    osc1.stop(ctx.currentTime + 0.35);
    
    // Nada 2: A5 (880Hz), sedikit tertunda
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, ctx.currentTime + 0.12);
    gain2.gain.setValueAtTime(0.08, ctx.currentTime + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.55);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.12);
    osc2.stop(ctx.currentTime + 0.55);
  } catch (err) {
    console.warn('Gagal memutar suara notifikasi:', err);
  }
}
