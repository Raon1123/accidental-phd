// v3.5 공식의 참조 구현(테스트 전용). 출처는 docs/oracle/v35-recon.md 의 "Key formulas", "Field MODEL table",
// "Statistics constants" 이다. 식을 그 문서가 적은 그대로 옮겼고, 엔진 코드는 import 하지 않는다.
// 정찰 기록이 값을 정하지 않은 입력(energyFactor, advisor.factor, rand)은 호출하는 쪽이 넘긴다.
// v3.5 금액은 만원/월 이다. 엔진은 원/년 이므로 `annualKrw` 로 바꿔 비교한다.

export type V35Field = 'cs' | 'math' | 'bio' | 'engineering' | 'social' | 'humanities';

/** Field MODEL 표: rate, 심사 개월 [lo, hi], 등록금 만원/학기 [lo, hi], 필요 논문 수, evidence target. */
export const FIELD_MODEL: Record<V35Field, { rate: number; review: [number, number]; tuition: [number, number]; papersReq: number[]; evidence: number }> = {
  cs: { rate: 7, review: [2, 6], tuition: [320, 570], papersReq: [1, 2, 2, 3], evidence: 180 },
  math: { rate: 5.9, review: [4, 10], tuition: [280, 460], papersReq: [1, 1, 2], evidence: 175 },
  bio: { rate: 5.8, review: [3, 8], tuition: [350, 620], papersReq: [1, 2, 2], evidence: 180 },
  engineering: { rate: 6.5, review: [3, 7], tuition: [330, 590], papersReq: [1, 2, 2], evidence: 185 },
  social: { rate: 5.5, review: [4, 9], tuition: [260, 470], papersReq: [1, 1, 2], evidence: 175 },
  humanities: { rate: 5.2, review: [4, 10], tuition: [250, 450], papersReq: [0, 1, 1], evidence: 180 },
};

const clamp = (x: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, x));

// ── 박사과정 ──

/** researchTime = max(0.12, (44 − dutyHours − jobHours − 6·coursework) / 44). coursework 는 수업 중이면 1. */
export function researchTime(dutyHours: number, jobHours: number, coursework: number): number {
  return Math.max(0.12, (44 - dutyHours - jobHours - 6 * coursework) / 44);
}

/** 막힘: math 분야 24%/월, 그 밖 16%. */
export function stall(field: V35Field): number {
  return field === 'math' ? 0.24 : 0.16;
}

/** progress gain = base × (0.65 + rand×0.85) × (0.65 + skill/140) × researchTime × energyFactor × advisor.factor × (0.2 if blocked). */
export function progressGain(p: {
  base: number; rand: number; skill: number; researchTime: number; energyFactor: number; advisorFactor: number; blocked: boolean;
}): number {
  return p.base * (0.65 + p.rand * 0.85) * (0.65 + p.skill / 140) * p.researchTime * p.energyFactor * p.advisorFactor * (p.blocked ? 0.2 : 1);
}

/** quality0 = 30 + skill×0.45 + relationship×0.08 + U(−9, 9). noise 는 [−9, 9] 안의 값. */
export function paperQuality0(skill: number, relationship: number, noise: number): number {
  return 30 + skill * 0.45 + relationship * 0.08 + noise;
}

/** accept = clamp(0.15 + q×0.005 + (attempts − 1)×0.07, 0.25, 0.88). */
export function accept(quality: number, attempts: number): number {
  return clamp(0.15 + quality * 0.005 + (attempts - 1) * 0.07, 0.25, 0.88);
}

/** 판정: roll < accept 채택, roll < min(0.95, accept + 0.29) 수정 요구, 그 밖 거절. */
export function verdict(roll: number, acceptP: number): 'accepted' | 'revision' | 'rejected' {
  if (roll < acceptP) return 'accepted';
  return roll < Math.min(0.95, acceptP + 0.29) ? 'revision' : 'rejected';
}

export const REVIEW_DELAY_P = 0.18;
export const REVIEW_DELAY_MONTHS: [number, number] = [1, 3];

/** 자격시험 응시: 12개월째부터 6개월마다. */
export const QUAL_FIRST_MONTH = 12;
export const QUAL_INTERVAL_MONTHS = 6;
/** 자격시험은 skill ≥ 44 여야 응시한다. */
export const qualEligible = (skill: number): boolean => skill >= 44;
/** 합격 확률 min(0.95, 0.65 + attempts×0.05). 정찰 기록은 attempts 를 이번 응시 번호(첫 응시 = 1)로 쓴다. */
export const qualPass = (attempts: number): number => Math.min(0.95, 0.65 + attempts * 0.05);

/** defenseChance = clamp(0.35 + skill×0.004 + relationship×0.001 + energy×0.001 + attempts×0.08, 0.40, 0.94). */
export function defense(skill: number, relationship: number, energy: number, attempts: number): number {
  return clamp(0.35 + skill * 0.004 + relationship * 0.001 + energy * 0.001 + attempts * 0.08, 0.40, 0.94);
}

/** 종료: phd / time(month 108) / financial / new-path. 최대 재학 96개월(+연장). */
export const ENDS = { reasons: ['phd', 'time', 'financial', 'new-path'], timeMonth: 108, maxResidence: 96 } as const;

/** 별도 중도 이탈 위험률은 없다(재정·시간·새 경로 종료만). */
export const dropoutHazard = 0;

/** 대출 이자 debt × 0.0025/월(연 3%), 신용 한도 {1800, 3000, 4200} 만원. */
export const loanInterest = (debt: number): number => debt * 0.0025;
export const CREDIT_LIMITS_MANWON: readonly number[] = [1800, 3000, 4200];

// ── 경력 ──

/** 구직 확률 p = 0.07 + skill×0.0007 + network×0.0005 (월, 경로 구분 없음). */
export const jobSearchP = (skill: number, network: number): number => 0.07 + skill * 0.0007 + network * 0.0005;

/** 고용형태 가중치(출처 없음): permanent 32 / fixed 48 / part 15 / self 5. */
export const EMPLOYMENT_FORM_WEIGHTS = { permanent: 32, fixed: 48, part: 15, self: 5 } as const;

/** 박사후 전환: fixed 형태이고 STEM 이면 0.62, 그 밖 0.25. */
export const postdocP = (stem: boolean): number => (stem ? 0.62 : 0.25);

/** 교수 전환: 학계 근무 36개월 이상이면 연 9%, 그 전에는 0. */
export const professorPerYear = (academicMonths: number): number => (academicMonths >= 36 ? 0.09 : 0);

/** 은퇴 나이 U[60, 67] (u ∈ [0, 1)), 기록 종료 나이 80(사망 모형 없음). */
export const RETIRE_RANGE: [number, number] = [60, 67];
export const retireAge = (u: number): number => RETIRE_RANGE[0] + u * (RETIRE_RANGE[1] - RETIRE_RANGE[0]);
export const RECORD_END_AGE = 80;

/** 노후 수입 55 + min(150, workYears×3.5) 만원/월. */
export const pension = (workYears: number): number => 55 + Math.min(150, workYears * 3.5);

/** 월급 범위(만원/월). 게임 가정이며 출처가 없다. */
export const MONTHLY_PAY: Record<string, [number, number]> = {
  postdoc: [250, 380], contract: [240, 360], lecturer: [90, 220], freelance: [100, 240], industry: [320, 520],
  institute: [310, 460], public: [270, 410], independent: [100, 400], professor: [360, 520], bridge: [170, 240],
};

/** 만원/월 범위를 원/년 범위로 바꾼다. */
export function annualKrw(range: [number, number]): [number, number] {
  return [range[0] * 10_000 * 12, range[1] * 10_000 * 12];
}

// ── 통계 상수 ──

/** FIELD_DATA employed (KRIVET 2024 학업전념 박사). */
export const FIELD_DATA_EMPLOYED: Record<V35Field, number> = { cs: 0.682, math: 0.587, bio: 0.587, engineering: 0.625, social: 0.470, humanities: 0.408 };
export const NON_WAGE_SHARE = 0.025;
/** KRIVET 표 10, 단위 %. */
export const EMPLOYMENT_FORMS = { permanent: 45.0, fixed: 44.1, part: 10.9 } as const;
export const LEAVE_REFERENCE = { stem: 0.125, other: 0.188 } as const;
/** KISTEP 2022 박사후 재원, 단위 %. */
export const POSTDOC_FUNDERS = { 대학교: 60.9, 정부기관: 14.5, 공공연구소: 13.7, 민간연구소: 1.8, 민간기업: 3.1, 기타: 6.0 } as const;
