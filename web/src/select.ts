// 입학 전 선택(#54). 사용자 결정(2026-10-14): 하고 싶은 분야(전공군)만 고르고, 나머지 다섯 단계는 운에 맡긴다.
// 엔진 createLife 는 여섯 단계 설정을 모두 받으므로, 단계를 더 열 때는 lifeConfig 에 키를 더하면 된다.
import { TRACKS, groupOf, type Group, type LifeConfig } from '../../engine/src/browser';
import type { Strings } from './strings.ko';

export interface TrackGroup { group: Group; label: string; tracks: { track: string; label: string }[] }

export function trackLabel(track: string, t: Strings): string {
  const names: Readonly<Record<string, string>> = t.trackNames;
  const name = Object.hasOwn(names, track) ? names[track] : undefined;
  if (name === undefined) throw new Error(`no label for track: ${track}`);
  return name;
}

/** 계열별로 묶은 전공군 선택지. 순서는 엔진 TRACKS 순서(인문사회 10, 이공 16)다. */
export function trackGroups(t: Strings): TrackGroup[] {
  const out: TrackGroup[] = [];
  for (const track of TRACKS) {
    const group = groupOf(track);
    let g = out.find(x => x.group === group);
    if (!g) { g = { group, label: t.groupNames[group], tracks: [] }; out.push(g); }
    g.tracks.push({ track, label: trackLabel(track, t) });
  }
  return out;
}

/** 고른 전공군(없으면 null = 분야도 운에 맡김)을 createLife 설정으로 바꾼다. */
export function lifeConfig(track: string | null): LifeConfig {
  return track === null ? {} : { track };
}
