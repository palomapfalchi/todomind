export function triggerHaptic(type: 'check' | 'timer' | 'reset'): void {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') {
    return;
  }

  try {
    if (type === 'check') {
      navigator.vibrate(14);
    } else if (type === 'reset') {
      navigator.vibrate([12, 30, 12]);
    } else if (type === 'timer') {
      navigator.vibrate([25, 60, 25, 60, 40]);
    }
  } catch {
    // Alguns navegadores bloqueiam vibração sem gesto recente
  }
}
