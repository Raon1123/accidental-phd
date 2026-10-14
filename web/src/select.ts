// 입학 전 선택(#54). 사용자 결정(2026-10-14): 하고 싶은 분야(전공군)만 고르고, 나머지 다섯 단계는 운에 맡긴다.
// 엔진 createLife 는 여섯 단계 설정을 모두 받으므로, 단계를 더 열 때는 lifeConfig 에 키를 더하면 된다.
import { TRACKS, groupOf, indexDepartments, unitsForTrack, type DataBundle, type Group, type LifeConfig } from '../../engine/src/browser';
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

/** 학교별 개설 전공군. createLife 가 후보를 거르는 규칙(대표 단위의 학교)과 같다(#69). */
export interface Offerings { tracksOf: Map<string, Set<string>>; schoolsOf: Map<string, Set<string>> }

export function offerings(data: DataBundle): Offerings {
  const idx = indexDepartments(data);
  const tracksOf = new Map<string, Set<string>>();
  const schoolsOf = new Map<string, Set<string>>();
  for (const track of TRACKS) {
    const schools = new Set<string>();
    for (const rep of unitsForTrack(idx, track)) {
      const school = idx.records.get(rep)!.school;
      schools.add(school);
      let ts = tracksOf.get(school);
      if (!ts) { ts = new Set(); tracksOf.set(school, ts); }
      ts.add(track);
    }
    schoolsOf.set(track, schools);
  }
  return { tracksOf, schoolsOf };
}

/** 두 선택이 함께 가능한가. 하나라도 비어 있으면(운에 맡김) 가능하다. */
export function compatible(o: Offerings, track: string | null, school: string | null): boolean {
  if (track === null || school === null) return true;
  return o.schoolsOf.get(track)?.has(school) ?? false;
}

/** 학교 선택지: 표시 순서는 이름표(schoolNames) 순서다. 엔진에 단위가 없는 학교는 뺀다. */
export function schoolIds(o: Offerings, t: Strings): string[] {
  return Object.keys(t.schoolNames).filter(id => o.tracksOf.has(id));
}

/** 고른 전공군·학교(없으면 null = 운에 맡김)를 createLife 설정으로 바꾼다. */
export function lifeConfig(track: string | null, school: string | null = null): LifeConfig {
  return { ...(track === null ? {} : { track }), ...(school === null ? {} : { school }) };
}
