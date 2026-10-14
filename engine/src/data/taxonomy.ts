// 트랙 26종의 계열·분야·교육통계 대응(선택권 §1)과 세부전공 선택지(선택권 §2.3), 번호 접미 학과의 엔진 키(선택권 §11).
import type { DataBundle } from './bundle';
import type { Field, Group, Kedi, Ksced } from '../types';

interface TrackInfo { group: Group; field: Field; kedi: Kedi; ksced: Ksced }

// 선택권 §1 표를 트랙 단위로 풀어 쓴 것. 순서가 곧 TRACKS 의 순서다(인문사회 10, 이공 16).
// kedi 는 트랙 primary 의 NRF 대분류에서 정한다(A 인문, B 사회, C 자연, D 공학).
const TRACK_INFO: Record<string, TrackInfo> = {
  history: { group: '인문사회', field: 'humanities', kedi: 'humanities', ksced: 'arts-humanities' },
  philosophy: { group: '인문사회', field: 'humanities', kedi: 'humanities', ksced: 'arts-humanities' },
  korean_literature: { group: '인문사회', field: 'humanities', kedi: 'humanities', ksced: 'arts-humanities' },
  english_literature: { group: '인문사회', field: 'humanities', kedi: 'humanities', ksced: 'arts-humanities' },
  linguistics: { group: '인문사회', field: 'humanities', kedi: 'humanities', ksced: 'arts-humanities' },
  sociology: { group: '인문사회', field: 'social', kedi: 'social', ksced: 'social' },
  political: { group: '인문사회', field: 'social', kedi: 'social', ksced: 'social' },
  psychology: { group: '인문사회', field: 'social', kedi: 'social', ksced: 'social' },
  economics: { group: '인문사회', field: 'social', kedi: 'social', ksced: 'business-law' },
  public_administration: { group: '인문사회', field: 'social', kedi: 'social', ksced: 'business-law' },
  computer: { group: '이공', field: 'cs', kedi: 'engineering', ksced: 'ict' },
  ai: { group: '이공', field: 'cs', kedi: 'engineering', ksced: 'ict' },
  mathematics: { group: '이공', field: 'math', kedi: 'natural', ksced: 'natural-math' },
  statistics: { group: '이공', field: 'math', kedi: 'natural', ksced: 'natural-math' },
  life_science: { group: '이공', field: 'bio', kedi: 'natural', ksced: 'natural-math' },
  neuroscience: { group: '이공', field: 'bio', kedi: 'natural', ksced: 'natural-math' },
  systems_biology: { group: '이공', field: 'bio', kedi: 'natural', ksced: 'natural-math' },
  bioengineering: { group: '이공', field: 'bio', kedi: 'engineering', ksced: 'engineering' },
  mechanical: { group: '이공', field: 'engineering', kedi: 'engineering', ksced: 'engineering' },
  electrical: { group: '이공', field: 'engineering', kedi: 'engineering', ksced: 'engineering' },
  chemical: { group: '이공', field: 'engineering', kedi: 'engineering', ksced: 'engineering' },
  materials: { group: '이공', field: 'engineering', kedi: 'engineering', ksced: 'engineering' },
  civil: { group: '이공', field: 'engineering', kedi: 'engineering', ksced: 'engineering' },
  environmental: { group: '이공', field: 'engineering', kedi: 'engineering', ksced: 'engineering' },
  energy: { group: '이공', field: 'engineering', kedi: 'engineering', ksced: 'engineering' },
  semiconductor: { group: '이공', field: 'engineering', kedi: 'engineering', ksced: 'engineering' },
};

export const TRACKS: readonly string[] = Object.keys(TRACK_INFO);

function info(track: string): TrackInfo {
  const i = TRACK_INFO[track];
  if (!i) throw new Error(`unknown track: ${track}`);
  return i;
}

export const groupOf = (track: string): Group => info(track).group;
export const fieldOf = (track: string): Field => info(track).field;
export const kediOf = (track: string): Kedi => info(track).kedi;
export const kscedOf = (track: string): Ksced => info(track).ksced;
export const tracksOf = (group: Group): string[] => TRACKS.filter(t => TRACK_INFO[t]!.group === group);

const codeOf = (recordId: string): string => recordId.slice('taxonomy-nrf-'.length).toUpperCase();

/** 중분류 코드 아래 소분류 코드 전부(정렬). */
function smallFieldsUnder(data: DataBundle, midCode: string): string[] {
  const out: string[] = [];
  for (const r of data.records.values()) {
    if (r.value === 3 && r.id.startsWith('taxonomy-nrf-') && r.note.includes(`상위 ${midCode}`)) out.push(codeOf(r.id));
  }
  return out.sort();
}

/**
 * 학과(단위)의 세부전공 후보. 학과 레코드의 NRF 코드가 중분류면 그 아래 소분류 전부, 소분류면 그 하나다.
 * 대학마다 학과가 다루는 범위가 다르므로 전공군 목록(subfieldsOf)이 아니라 이 목록에서 뽑는다(#68).
 */
export function subfieldsOfDepartment(data: DataBundle, nrfCode: string): string[] {
  const kids = nrfCode.endsWith('0000') ? smallFieldsUnder(data, nrfCode) : [];
  const out = kids.length > 0 ? kids : [nrfCode];
  return out;
}

/**
 * 세부전공 선택지(NRF 코드, 선택권 §2.3). primary 가 중분류면 그 아래 소분류 전부,
 * 소분류면 그 하나를 앞에 두고, 이어서 보조 후보(primary=false)를 파일 순서대로 붙인다. 중복은 뺀다.
 */
export function subfieldsOf(data: DataBundle, track: string): string[] {
  info(track);
  if (data.mappingTracks.length === 0) throw new Error('mapping-tracks.json not in DataBundle');
  const rows = data.mappingTracks.filter(r => r.track === track);
  const primary = rows.filter(r => r.primary);
  if (primary.length !== 1) throw new Error(`track ${track}: expected 1 primary mapping, got ${primary.length}`);
  const p = primary[0]!;
  const out: string[] = [];
  if (p.level === 2) {
    out.push(...smallFieldsUnder(data, p.nrf_code));
  } else {
    out.push(p.nrf_code);
  }
  for (const r of rows) if (!r.primary && !out.includes(r.nrf_code)) out.push(r.nrf_code);
  return out;
}

/**
 * 번호 접미 레코드 87건의 엔진 키 꼬리(선택권 §11 표의 `엔진 키` 에서 `<학교>/` 뒤).
 * 묶음(§10)에 속한 3건(uos-computer-2, jnu-electrical-2, jnu-energy-2)은 표의 레코드 키 꼬리
 * `<대표 단위 slug>@<track>` 를 그대로 둔다. 단위 slug 는 아니다. departments.ts 가 도출한 레코드 키와 맞는지 검사한다.
 * 개발 때 scripts/md-table.mjs 로 표에서 생성했고, 런타임에는 마크다운을 읽지 않는다.
 */
export const NUMBERED_SLUGS: Record<string, string> = {
  'departments-snu-computer-2': 'information-security',
  'departments-snu-neuroscience-2': 'brain-science',
  'departments-snu-bioengineering-2': 'applied-bioengineering',
  'departments-snu-life_science-2': 'genetic-engineering',
  'departments-snu-mechanical-2': 'aerospace',
  'departments-snu-mechanical-3': 'naval-ocean',
  'departments-snu-political-2': 'international-studies',
  'departments-snu-history-2': 'asian-history',
  'departments-snu-history-3': 'western-history',
  'departments-kaist-ai-2': 'ai-computing',
  'departments-kaist-ai-3': 'ai-systems',
  'departments-kaist-ai-4': 'ax',
  'departments-kaist-ai-5': 'ai-future',
  'departments-kaist-computer-2': 'information-security',
  'departments-kaist-ai-6': 'data-science',
  'departments-kaist-bioengineering-2': 'engineering-biology',
  'departments-kaist-mechanical-2': 'aerospace',
  'departments-kaist-environmental-2': 'environmental-energy',
  'departments-kaist-semiconductor-2': 'ai-semiconductor',
  'departments-kaist-environmental-3': 'green-growth-sustainability',
  'departments-postech-systems_biology-2': 'synthetic-biology',
  'departments-postech-materials-2': 'advanced-materials',
  'departments-postech-energy-2': 'battery',
  'departments-postech-materials-3': 'steel',
  'departments-gist-ai-2': 'ax',
  'departments-gist-semiconductor-2': 'semiconductor-specialized',
  'departments-unist-energy-2': 'nuclear',
  'departments-unist-energy-3': 'carbon-neutrality',
  'departments-yonsei-civil-2': 'urban-planning',
  'departments-yonsei-civil-3': 'architectural-engineering',
  'departments-yonsei-mechanical-2': 'aerospace',
  'departments-yonsei-energy-2': 'climate-energy-program',
  'departments-yonsei-semiconductor-2': 'semiconductor-program',
  'departments-yonsei-semiconductor-3': 'system-semiconductor',
  'departments-yonsei-energy-3': 'secondary-battery',
  'departments-korea-bioengineering-2': 'convergence-bioengineering',
  'departments-skku-computer-2': 'computer-engineering-general',
  'departments-skku-ai-2': 'ai-systems',
  'departments-skku-ai-3': 'applied-ai',
  'departments-skku-ai-4': 'ai-convergence',
  'departments-skku-bioengineering-2': 'convergence-bioengineering',
  'departments-skku-bioengineering-3': 'biomechatronics',
  'departments-skku-energy-2': 'low-carbon-energy',
  'departments-skku-energy-3': 'energy-science',
  'departments-hanyang-computer-2': 'information-systems',
  'departments-hanyang-ai-2': 'data-science',
  'departments-hanyang-mechanical-2': 'future-automotive',
  'departments-hanyang-electrical-2': 'electrical-engineering',
  'departments-hanyang-materials-2': 'organic-nano',
  'departments-hanyang-energy-2': 'nuclear',
  'departments-hanyang-energy-3': 'battery',
  'departments-hanyang-environmental-2': 'environmental-science',
  'departments-hanyang-semiconductor-2': 'nano-semiconductor',
  'departments-hanyang-public_administration-2': 'policy-studies',
  'departments-khu-computer-2': 'software-convergence',
  'departments-khu-life_science-2': 'genetic-bioengineering',
  'departments-khu-electrical-2': 'electronic-info-convergence',
  'departments-ewha-ai-2': 'data-science',
  'departments-ewha-life_science-2': 'bio-convergence',
  'departments-cau-energy-2': 'intelligent-energy-industry',
  'departments-konkuk-life_science-2': 'biotechnology',
  'departments-konkuk-bioengineering-2': 'biological-engineering',
  'departments-uos-computer-2': 'electrical@computer',
  'departments-uos-public_administration-2': 'urban-administration',
  'departments-pusan-chemical-2': 'chemical-materials',
  'departments-knu-computer-2': 'software',
  'departments-knu-ai-2': 'data-convergence-computing',
  'departments-knu-energy-2': 'energy-climate-change',
  'departments-knu-materials-2': 'metallurgical-materials',
  'departments-knu-materials-3': 'polymer',
  'departments-knu-mechanical-2': 'precision-mechanical',
  'departments-knu-bioengineering-2': 'biomedical-engineering',
  'departments-jnu-life_science-2': 'life-science-technology',
  'departments-jnu-electrical-2': 'computer@electrical',
  'departments-jnu-computer-2': 'intelligent-electronic-computer',
  'departments-jnu-computer-3': 'computer-engineering',
  'departments-jnu-ai-2': 'big-data-science',
  'departments-jnu-materials-2': 'polymer',
  'departments-jnu-energy-2': 'environmental@energy',
  'departments-jnu-civil-2': 'civil-environmental',
  'departments-cnu-history-2': 'korean-history',
  'departments-cnu-electrical-2': 'electrical-engineering',
  'departments-cnu-electrical-3': 'radio-info-communication',
  'departments-cnu-materials-2': 'organic-materials',
  'departments-cnu-materials-3': 'polymer',
  'departments-cnu-mechanical-2': 'mechatronics',
  'departments-cnu-life_science-2': 'biochemistry',
};
