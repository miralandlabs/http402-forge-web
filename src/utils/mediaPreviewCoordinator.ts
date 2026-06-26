/** Pause other card previews when one audio/video element starts playing. */
let active: HTMLMediaElement | null = null;

export function onCardMediaPlay(el: HTMLMediaElement): void {
  if (active && active !== el && !active.paused) {
    active.pause();
  }
  active = el;
}

export function onCardMediaPause(el: HTMLMediaElement): void {
  if (active === el) {
    active = null;
  }
}
