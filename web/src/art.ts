// 그림 설정(#151, docs/design/pixel-scenes.md §5): 모두 / 간단히(아이콘만) / 끄기. 선택은 이 브라우저에만 남는다.
import type { KeyValueStore } from './archive';

export const ART_MODES = ['full', 'lite', 'off'] as const;
export type ArtMode = typeof ART_MODES[number];
export const ART_KEY = 'aphd-art';

export function loadArt(store: KeyValueStore | undefined): ArtMode {
  try {
    const v = store?.getItem(ART_KEY) ?? '';
    return (ART_MODES as readonly string[]).includes(v) ? (v as ArtMode) : 'full';
  } catch { return 'full'; }
}

export function saveArt(store: KeyValueStore | undefined, mode: ArtMode): void {
  try { store?.setItem(ART_KEY, mode); } catch { /* 저장이 막힌 환경은 이번 화면에만 적용한다 */ }
}
