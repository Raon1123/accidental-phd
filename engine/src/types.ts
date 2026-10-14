// 엔진 공유 타입. 이름이 정본이다(계획 "공유 인터페이스"). 바꾸려면 계획을 먼저 고친다.
export type Group = '인문사회' | '이공';
export type Field = 'cs' | 'math' | 'bio' | 'engineering' | 'social' | 'humanities';
export type Kedi = 'humanities' | 'social' | 'natural' | 'engineering';
export type Ksced = 'ict' | 'natural-math' | 'engineering' | 'social' | 'business-law' | 'arts-humanities';
export type Stage = 'pre' | 'phd' | 'career' | 'retired' | 'end';
export type Focus = 'research' | 'write' | 'network' | 'work' | 'rest' | 'thesis';
export type FundingRoute = 'scholarship' | 'project' | 'self';
export type AdvisorType = 'support' | 'strict' | 'free' | 'connected';
export type Path = 'academia' | 'industry' | 'public' | 'startup';
export type Route = 'professor' | 'nontenure' | 'lecturer' | 'postdoc' | 'institute' | 'public' | 'industry' | 'startup' | 'bridge' | 'none';
export type Tier = 'T1' | 'T2' | 'T3' | 'T4';
export type DecisionId = 'post-qualifying' | 'first-paper-verdict' | 'funding-expiry' | 'pre-graduation-path' | 'career-5y' | 'career-10y' | 'pre-retirement';
export type EndReason = 'degree' | 'dropout' | 'residence' | 'financial' | 'exit-master' | 'age80';
export type Confidence = 'verified' | 'indexed' | 'assumed';
export type Stream = 'init' | 'luck' | 'progress' | 'paper' | 'exam' | 'hazard' | 'funding' | 'labor' | 'news' | 'life' | 'policy';

export interface Stats { health: number; mind: number; skill: number; relation: number; network: number }
export interface Choices {
  group: Group; track: string; subfield: string; department: string; departmentRecord: string; school: string;
  funding: FundingRoute; advisorPref: AdvisorType; kedi: Kedi; ksced: Ksced; field: Field;
  byLuck: { group: boolean; track: boolean; subfield: boolean; department: boolean; funding: boolean; advisorPref: boolean };
}
export interface Paper { id: string; status: 'draft' | 'submitted' | 'revision' | 'accepted' | 'rejected' | 'dropped'; writing: number; quality: number; tier?: Tier; venueId?: string; attempts: number; dueMonth?: number; submittedMonth?: number; logitBonus: number }
export interface FundingState { route: FundingRoute; monthly: number; tuitionWaiver: number; until: number; dutyHours: number; recordIds: string[] }
export interface PhdState {
  enrolledMonths: number; leave: { active: boolean; until: number; totalMonths: number }; coursework: boolean;
  project: number; blocked: boolean; qualified: boolean; qualAttempts: number; defenseAttempts: number;
  papers: Paper[]; requiredPapers: number; advisor: { type: AdvisorType; support: number; rigor: number; network: number };
  fundingState: FundingState; focus: Focus; focusHistory: { from: number; focus: Focus }[]; path?: Path;
  crisisMonths: number; postCrisisMonths: number; familySupport: number; nextDefenseMonth?: number; graduationMonth?: number;
  deferredFirstVerdict?: { paperId: string; verdict: 'accepted' | 'revision' | 'rejected' };   // 같은 달 더 높은 우선순위 결정에 밀린 첫 판정. 프롬프트를 열 때 지운다
  statCarry: Stats;   // 능력치의 소수 변화 누적분(stats 는 정수). |carry| ≥ 1 이면 stats 로 옮긴다
  participation?: number;   // 과제 참여율(#79). 학기마다 추첨(drawParticipation, 0014#130). 없으면 자금 경로 기본값(과제 0.5, 그 밖 0)
  partTime?: PartTime;      // 근로 설정(#79). 없으면 근로하지 않는다
}
export interface CareerState {
  degreeMonth: number; degree: 'phd' | 'master-exit' | 'none'; route: Route; rank?: string;
  employer?: { kind: 'university' | 'institute' | 'government' | 'company' | 'self'; schoolId?: string; instituteId?: string; national?: boolean };
  annualPay: number; step?: number; yearsInRoute: number; workYears: number; academicMonths: number;
  searching?: { routes: Route[]; since: number; penalty: number }; retireAge?: number; pensionMonthly?: number;
  contractUntil?: number; paperScore: number; careerPapers: number; postRetireResearchUntil?: number;
  researchFocusYear?: boolean;   // career-10y B(연구 집중)가 켠다. 그해 yearEnd 의 경력 논문 추첨이 paperP0 를 쓰고, 추첨 뒤 지운다
}
export interface NewsEffect { id: string; type: string; startMonth: number; untilMonth: number; effect: number; target: { kind: 'group' | 'kedi' | 'track' | 'nrf2' | 'all'; values: string[] }; routes: Route[] }
export interface PendingDecision { dp: DecisionId; month: number; context: Record<string, unknown>; options: { key: string; textKey: string }[] }
export interface Snapshot { dp: DecisionId; month: number; decisionIndex: number; state: LifeState }
export interface LifeState {
  version: 1; engineRevision: string; dataRevision: string; seed: string; stage: Stage; month: number; ageMonths: number;
  stats: Stats; choices: Choices; money: { cash: number; debt: number; loanLimit: number };
  ledger: { month: number; kind: string; amount: number; recordId?: string }[];
  news: NewsEffect[]; decisions: { dp: DecisionId; month: number; option: string; byPolicy: boolean }[];
  log: { month: number; textKey: string; tags: string[]; creative: boolean }[];
  phd?: PhdState; career?: CareerState; end?: { reason: EndReason; month: number };
  pending: PendingDecision | null; snapshots: Snapshot[]; auto: boolean;
  newsSeed: string;   // 뉴스 추첨에 쓰는 seed. 플레이어는 자기 seed, 동기(상태 §6.4)는 플레이어 seed — 그래서 다섯 명이 같은 뉴스를 겪는다
}
export interface LifeConfig {
  group?: Group; track?: string; subfield?: string; department?: string; school?: string; funding?: FundingRoute; advisorPref?: AdvisorType;
  // 비어 있는 항목은 "운에 맡기기" (선택권 §2)
  auto?: boolean;  // 자동 진행(동기 정책) — 기본 false
  cohortOf?: string;  // 동기(상태 §6.4)일 때 플레이어 seed. 주어지면 group 은 플레이어와 같아야 하고 newsSeed = cohortOf
}
export type PartTimeKind = 'job' | 'lecture';
/** 박사과정 중 근로(#79, 선택권 §4.7): 아르바이트(`job`, hours = 주당 근무 시간) 또는 강의(`lecture`, hours = 주당 담당 시수). */
export interface PartTime { kind: PartTimeKind; hours: number }
export interface MonthInput {
  focus?: Focus; takeExam?: boolean; apply?: Partial<Record<Route, boolean>>;
  /** 근로 설정. 상한(`partTimeCap`)을 넘으면 던진다. hours 0 이면 그만둔다(#79). */
  partTime?: PartTime;
}
