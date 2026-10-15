// 입학 전 선택(#54). 사용자 결정(2026-10-14): 하고 싶은 분야(전공군)만 고르고, 나머지 다섯 단계는 운에 맡긴다.
// 엔진 createLife 는 여섯 단계 설정을 모두 받으므로, 단계를 더 열 때는 lifeConfig 에 키를 더하면 된다.
import { TRACKS, groupOf, selfTaProbability, type DataBundle, type Group, type LifeConfig } from '../../engine/src/browser';
import type { Strings } from './strings.ko';

export interface TrackGroup { group: Group; label: string; tracks: { track: string; label: string }[] }

export function trackLabel(track: string, t: Strings): string {
  const names: Readonly<Record<string, string>> = t.trackNames;
  const name = Object.hasOwn(names, track) ? names[track] : undefined;
  if (name === undefined) throw new Error(`no label for track: ${track}`);
  return name;
}

const firstToken = (note: string): string => note.split(' · ')[0]!.trim();

/**
 * 삶이 시작된 뒤의 학과 표기: `학과명 (세부전공)`(#88). 학과명은 학과 레코드 note 의 첫 토큰, 세부전공은 NRF 분류 레코드 note 의 첫 토큰이다.
 * 데이터가 없거나 레코드를 못 찾으면(예: 옛 저장본) 전공군 이름으로 되돌아간다. 학교 이름은 여기서 내지 않는다(0004).
 */
/** 세부전공 이름(NRF 분류 레코드 note 의 첫 토큰). 레코드가 없으면 빈 문자열. */
export function subfieldName(subfield: string, data: DataBundle | undefined): string {
  const rec = data?.records.get(`taxonomy-nrf-${subfield.toLowerCase()}`);
  return rec ? firstToken(rec.note) : '';
}

export function departmentLabel(c: { track: string; departmentRecord: string; subfield: string }, data: DataBundle | undefined, t: Strings): string {
  const fallback = trackLabel(c.track, t);
  if (!data) return fallback;
  const dept = data.records.get(c.departmentRecord);
  if (!dept) return fallback;
  const name = firstToken(dept.note);
  const sub = data.records.get(`taxonomy-nrf-${c.subfield.toLowerCase()}`);
  const subName = sub ? firstToken(sub.note) : '';
  return subName && subName !== name ? `${name} (${subName})` : name;
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

/** 입학 전 안내: 자비로 정해질 때 조교 자리를 얻을 확률(엔진 selfTaProbability, 결정 기록 0022)과 조교는 제안이라는 문구. */
export function selfTaNote(data: DataBundle, t: Strings): string {
  const p = Math.round(selfTaProbability(data).value * 1000) / 10;
  return `${t.selfTa.odds.replace('{p}', String(p))} ${t.selfTa.offer}`;
}
