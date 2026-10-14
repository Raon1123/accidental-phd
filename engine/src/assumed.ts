/**
 * 결정 기록 0014 설계 가정. 줄마다 붙은 번호 주석은 scripts/check-assumed.mjs 와 engine/test/assumed.test.ts 가 센다.
 * 값을 바꾸면 0014 를 함께 고친다. 레코드가 값을 가진 항목은 값을 베끼지 않고 레코드 id 만 둔다(근거는 레코드 하나).
 * 표 모양 항목은 객체·배열이다. 읽기 전용 튜플이므로 쓰는 쪽은 readonly 배열로 받는다.
 * 파일 끝 "구조 상수"는 0014 항목이 아니라 단위 변환·자르기 경계다(번호 주석 없음).
 */
import type { AdvisorType, Focus, Group, Kedi, Route, Tier } from './types';

type NewsTypeShape = {
  id: string; headlineKey: string;
  target: { kind: 'group' | 'kedi' | 'track' | 'all'; values: readonly string[] };
  routes: readonly Route[]; effect: readonly [number, number]; months: readonly [number, number]; weight: number;
};

export const ASSUMED = {
  // ── 상태 모델 (0014 #1–#10) ──
  INIT_STAT_MEAN: 50, INIT_STAT_SD: 8, INIT_STAT_MIN: 30, INIT_STAT_MAX: 70,            // 0014#1
  HEALTH_DRIFT: -0.5, MIND_REVERT: 0.02,                                              // 0014#2
  ENTRY_AGE_DIST: { 25: 0.15, 26: 0.20, 27: 0.20, 28: 0.15, 29: 0.10, 30: 0.05, 31: 0.04, 32: 0.03, 33: 0.03, 34: 0.02, 35: 0.03 }, // 0014#3
  RESIDENCE_MONTHS: 96, RESIDENCE_EXTENSION: 12,                                       // 0014#4
  LEAVE_CAP_MONTHS: 36,                                                                // 0014#5
  COURSEWORK_MONTHS: 24,                                                               // 0014#6
  END_AGE: 80,                                                                         // 0014#7
  INIT_CASH: 5_000_000,                                                                // 0014#8
  ODDS_LO: 0.02, ODDS_HI: 0.95,                                                        // 0014#9
  ARCHIVE_MAX: 20,                                                                     // 0014#10

  // ── 입학 전 선택 (0014 #11–#21) ──
  FAMILY_SUPPORT: [{ monthly: 0, p: 0.5 }, { monthly: 300_000, p: 0.3 }, { monthly: 600_000, p: 0.2 }], // 0014#11
  LUCK_GROUP_P: { '이공': 0.5720, '인문사회': 0.4280 },                                // 0014#12
  LUCK_TRACK_WEIGHTING: 'unique-department-units',                                     // 0014#13 트랙별 고유 학과 단위 수, 묶음은 1/k
  LUCK_SUBFIELD_WEIGHTING: 'uniform',                                                  // 0014#14
  LUCK_UNIT_WEIGHTING: 'uniform',                                                      // 0014#15 트랙 안 고유 단위 균등
  FUNDING_LUCK: {
    stemInstitute: { scholarship: 0.40, project: 0.55, self: 0.05 },                   // 0014#16 이공, 과학기술원 5곳
    stemOther: { scholarship: 0.25, project: 0.55, self: 0.20 },                       // 0014#16 이공, 그 밖의 15곳
    humSoc: { scholarship: 0.30, project: 0.20, self: 0.50 },                          // 0014#16 인문사회
  },
  STEM_INSTITUTE_SCHOOLS: ['kaist', 'postech', 'gist', 'dgist', 'unist'],              // 0014#16
  SELF_FUNDING_MIND_PENALTY: -5,                                                       // 0014#17
  ADVISOR_TYPES: {
    support: { support: 75, rigor: 45, network: 45 },                                  // 0014#18 지원형
    strict: { support: 40, rigor: 80, network: 50 },                                   // 0014#18 엄격형
    free: { support: 30, rigor: 30, network: 35 },                                     // 0014#18 방임형
    connected: { support: 45, rigor: 45, network: 80 },                                // 0014#18 연결형
  } satisfies Record<AdvisorType, { support: number; rigor: number; network: number }>,
  ADVISOR_PREF_P: 0.6, ADVISOR_OTHER_P: 0.4 / 3, ADVISOR_LUCK_P: 0.25,                // 0014#19 선호 일치, 나머지 각 0.4/3, 운에 맡기기 균등
  ADVISOR_A_BASE: 0.75, ADVISOR_A_SUPPORT: 0.003, ADVISOR_A_RIGOR: 0.002,             // 0014#20 진척 배수 A
  ADVISOR_QUALITY_PER_RIGOR: 0.1, ADVISOR_RELATION_PER_SUPPORT: 0.02,                 // 0014#20 질 보정, 관계 월 변화
  ADVISOR_NETWORK_SCALE: 100, ADVISOR_FREE_MIND_PER_MONTH: 0.5,                        // 0014#20 네트워크 이득 × (1 + (network − 50)/100), 방임형 마음
  TUITION_WAIVER_RULE: { scholarship: 'max-rate', project: 'ra-ta-marker', self: 0 },  // 0014#21
  TUITION_WAIVER_RECORD_INFIX: '-scholarship-tuition-rate',                            // 0014#21
  TUITION_WAIVER_PROJECT_MARKERS: ['-ra', '-ta'],                                      // 0014#21

  // ── 돈: 장학·과제·결정 지점 효과 (0014 #22–#36) ──
  SCHOLARSHIP_SELECT_P0: 0.60, SCHOLARSHIP_SELECT_BETA_SKILL: 0.8,                     // 0014#22
  SCHOLARSHIP_RECORD_INFIX: '-scholarship-living-',                                    // 0014#23 학교의 해당 레코드 균등 추첨
  SCHOLARSHIP_MONTHLY_DIVISOR: { semester: 6, year: 12, total: 48 },                   // 0014#23 학기 ÷ 6, 연 ÷ 12, 총액 ÷ 48
  SCHOLARSHIP_MONTHS: 48,                                                              // 0014#24
  PROJECT_ASSIGN_P: { '이공': 0.85, '인문사회': 0.50 },                                // 0014#25
  PROJECT_MONTHS: 24,                                                                  // 0014#26
  HUMSOC_PROJECT_STIPEND: 600_000,                                                     // 0014#27
  INDEXED_STIPEND_RECORDS: ['schools-hanyang-all-scholarship-living-bk21'],            // 0014#28 indexed, 값은 레코드
  POST_QUAL_EFFECTS: {
    passA: { project: 5, mind: -3 },                                                   // 0014#29 합격 A
    passC: { projectMult: 0.6, relationOnFail: -10 },                                  // 0014#29 합격 C
    failA: { skill: 3, mind: -5 },                                                     // 0014#29 불합격 A
  },
  POST_QUAL_REST_LEAVE_MONTHS: 6,                                                      // 0014#29 B: 자발 휴학 6개월(선택권 §3.1)
  ADVISOR_CHANGE: { p0: 0.70, betaNetwork: 0.6, betaRelation: 0.4, lo: 0.2, hi: 0.9 }, // 0014#30
  LEAVE_DROPOUT_MULT: 2,                                                               // 0014#31
  MASTER_EXIT: { hireMult: 0.7, payMult: 0.85, academiaClosed: true },                 // 0014#32
  FIRST_PAPER: {
    rejectC: { project: 3, mind: -5 },                                                 // 0014#33 거절 C
    reviseA: { months: 2, quality: 8, logit: 0.8 },                                    // 0014#33 전면 수정
    reviseB: { months: 1, quality: 2, logit: 0.4 },                                    // 0014#33 최소 수정
    acceptA: { newDraftWriting: 20 },                                                  // 0014#33 채택 A
    acceptB: { network: 8, cash: -500_000 },                                           // 0014#33 채택 B
    acceptC: { project: 5 },                                                           // 0014#33 채택 C
  },
  FUNDING_EXTEND: { p0: 0.50, betaRelation: 0.6, betaSkill: 0.4, gammaPapers: 0.3, papersCap: 2, lo: 0.10, hi: 0.90 }, // 0014#34
  TA_FALLBACK_MONTHLY: 400_000, TA_DUTY_HOURS: 10,                                     // 0014#35
  LEAVE_JOB_INCOME: 2_000_000,                                                         // 0014#36
  PRE_GRAD_PROJECT_MIN: 90, JOB_SEARCH_MONTHS: 6,                                      // 0014#37 심사 준비 단계 진척 ≥ 90, 구직 약 6개월
  CAREER_10Y_RESEARCH: { skill: 5, network: -3, paperP0: 0.70 },                       // 0014#38

  // ── 월 포커스·진척 (0014 #39–#45) ──
  FOCUS: {
    research: { f: 1.0, health: -1.5, mind: -0.5, skill: 0.8, relation: 0, network: 0, cash: 0 },        // 0014#39
    write: { f: 0.3, health: -1.0, mind: 0, skill: 0.3, relation: 0, network: 0, cash: 0 },               // 0014#39
    network: { f: 0.3, health: -0.5, mind: 0.5, skill: 0, relation: 0.5, network: 2.0, cash: -100_000 },  // 0014#39 현금 −10만 원
    work: { f: 0.4, health: -1.0, mind: -0.5, skill: 0, relation: 0, network: 0.3, cash: 1_000_000 },     // 0014#39 0014#40 월 100만 원
    rest: { f: 0, health: 4, mind: 3, skill: 0, relation: 0.5, network: 0, cash: 0 },                     // 0014#39
    thesis: { f: 1.2, health: -2.0, mind: -1.0, skill: 0.3, relation: 0, network: 0, cash: 0 },           // 0014#39
  } satisfies Record<Focus, { f: number; health: number; mind: number; skill: number; relation: number; network: number; cash: number }>,
  JOB_HOURS: 20,                                                                       // 0014#40
  WRITING_RATE_BASE: 12, WRITING_RATE_SKILL: 0.2, WRITING_MAX: 100,                    // 0014#41 writing += 12 + 0.2·skill, 100 이 되면 투고
  PROGRESS_NOISE_LO: 0.65, PROGRESS_NOISE_HI: 1.50,                                    // 0014#42 U(0.65, 1.50)
  PROGRESS_SKILL_BASE: 0.65, PROGRESS_SKILL_DIV: 140,                                  // 0014#42 0.65 + skill/140
  WORK_WEEK_HOURS: 44, COURSEWORK_HOURS: 6, RESEARCH_TIME_MIN: 0.12,                   // 0014#42
  BLOCKED_P: 0.16, BLOCKED_P_MATH: 0.24, BLOCKED_MATH_TRACKS: ['mathematics', 'statistics'], BLOCKED_MULT: 0.2, // 0014#42
  HEALTH_EFFICIENCY_BASE: 0.5, HEALTH_EFFICIENCY_DIV: 100,                             // 0014#43 E = 0.5 + health/100
  DURATION_RECORD_BY_KEDI: {
    humanities: 'statistics-phd-duration-mean-years-humanities',                       // 0014#44 구 7계열 값을 KEDI 대계열 키로 대응
    social: 'statistics-phd-duration-mean-years-social',                               // 0014#44
    natural: 'statistics-phd-duration-mean-years-natural',                             // 0014#44
    engineering: 'statistics-phd-duration-mean-years-engineering',                     // 0014#44
  } satisfies Record<Kedi, string>,
  G_PREP_MONTHS: 6, G_MBAR_INIT: 0.40, PROJECT_MAX: 100,                               // 0014#45 g = 100 / ((12·T − 6) × M̄); 보정 2026-10-14: M̄ 0.68 → 0.40 (실현 평균 0.46–0.48, 중앙값 맞춤 상수; calibration-wave4.md)
  G_INIT: { humanities: 3.79, social: 4.63, natural: 4.17, engineering: 4.17 } satisfies Record<Kedi, number>, // 0014#45 M̄ 0.40 에서의 g (초안 M̄ 0.68: 2.23/2.72/2.45/2.45)

  // ── 자동 진행 정책·위험률 (0014 #46–#52) ──
  POLICY: {
    restThreshold: 30,                                                                 // 0014#46 체력·마음 < 30 → rest
    writeP: 0.6,                                                                       // 0014#46 활성 초고 writing < 100 → write 확률
    postQualFocus: { thesis: 0.3, research: 0.1, write: 0.5, network: 0.1 },           // 0014#46 자격시험 합격 후 (보정 2026-10-14: 0.5/0.2/0.2/0.1 → 집필 가중, calibration-wave4.md)
    jobSearchFocus: { network: 0.3, thesis: 0.7 },                                     // 0014#46 졸업 직전 구직 중
    decisions: {                                                                       // 0014#46 선택지 순서 A, B, C(, D)의 고정 가중치
      'post-qualifying:pass': [0.7, 0.2, 0.1],                                         // 0014#46
      'post-qualifying:fail': [0.7, 0.2, 0.1],                                         // 0014#46
      'first-paper-verdict:reject': [0.3, 0.6, 0.1],                                   // 0014#46
      'first-paper-verdict:revise': [0.6, 0.3, 0.1],                                   // 0014#46
      'first-paper-verdict:accept': [0.5, 0.2, 0.3],                                   // 0014#46
      'funding-expiry': [0.5, 0.3, 0.1, 0.1],                                          // 0014#46
      'career-5y': [0.6, 0.2, 0.1, 0.1],                                               // 0014#46
      'career-10y': [0.5, 0.3, 0.1, 0.1],                                              // 0014#46
      'pre-retirement': [0.6, 0.2, 0.2],                                               // 0014#46
    },
  },
  LEAVE_RATE_RECORD_PREFIX: 'statistics-phd-leave-rate-',                              // 0014#47 재적 대비 연 비율을 연 발생률로 읽고 월 환산
  HAZARD_COEF: { leaveMind: -0.8, leaveHealth: -0.4, dropMind: -0.8, dropRelation: -0.5 }, // 0014#48
  DROPOUT_RATE_RECORD_PREFIX: 'statistics-phd-dropout-rate-',                          // 0014#49
  DROPOUT_BACKGROUND_SHARE: 0.5,                                                       // 0014#49
  LEAVE_DURATIONS: [{ months: 6, p: 0.5 }, { months: 12, p: 0.5 }],                    // 0014#50
  LEAVE_MONTHLY_RECOVERY: { health: 3, mind: 3 },                                      // 0014#50 휴학 중 체력·마음 월 +3(선택권 §4.5)
  BURNOUT: { threshold: 15, p: 0.10, leaveMonths: 6 },                                 // 0014#51
  CALIBRATION_TOL: { degreeYears: 0.5, leaveRel: 0.30, dropoutRel: 0.30, employment: 0.10, demandLo: 0.97, demandHi: 1.03 }, // 0014#52

  // ── 등록금·생활비·대출 (0014 #53–#62) ──
  POST_COURSEWORK_TUITION_RATIO: 0.1,                                                  // 0014#53
  NO_ENTRANCE_FEE_SCHOOLS: ['kaist', 'dgist', 'unist'],                                // 0014#54 입학금 0원
  TUITION_YEAR_ADJUSTMENT: 'none',                                                     // 0014#55 연도 보정 없이 고정
  INDEXED_TUITION_RECORDS: ['schools-postech-all-tuition', 'schools-postech-all-entrance-fee', 'schools-ewha-all-entrance-fee'], // 0014#56
  POSTECH_TUITION_PERIOD: 'semester',                                                  // 0014#56 학기로 읽는다
  TUITION_CS_FROM_ENGINEERING_SCHOOLS: ['hanyang', 'sogang', 'khu', 'pusan', 'uos'],   // 0014#57 cs = schools-{school}-engineering-tuition
  EWHA_ENGINEERING_TUITION: 7_341_000,                                                 // 0014#58 cs·engineering, 서울 사립 8곳 공학 등록금 중앙값
  EWHA_TUITION_REFERENCE_SCHOOLS: ['yonsei', 'korea', 'skku', 'hanyang', 'sogang', 'khu', 'cau', 'konkuk'], // 0014#58
  EWHA_MATH_TUITION: 6_367_500,                                                        // 0014#59 math·bio, 같은 8곳 math 등록금 중앙값
  LIVING_COST: { capital: 1_600_000, regional: 1_300_000 },                            // 0014#60 (경력·은퇴 단계에도 같은 값: 0014#123, #96)
  CAPITAL_SCHOOLS: ['snu', 'yonsei', 'korea', 'skku', 'hanyang', 'sogang', 'khu', 'ewha', 'cau', 'konkuk', 'uos', 'akj'], // 0014#60 수도권
  REGIONAL_SCHOOLS: ['kaist', 'postech', 'gist', 'dgist', 'unist', 'pusan', 'knu', 'jnu', 'cnu'], // 0014#60 비수도권
  LOAN_RATE_ANNUAL: 0.03, LOAN_LIMIT: 42_000_000,                                      // 0014#61 (보정 2026-10-14: 3,000만 → 4,200만, v3.5 최상위 한도; calibration-wave4.md)
  CRISIS_MONTHS: 3, POST_CRISIS_MONTHS: 3,                                             // 0014#62

  // ── 논문 (0014 #63–#71) ──
  REQUIRED_PAPERS: { '이공': { count: 2, minTier: 'T4' }, '인문사회': { count: 1, minTier: 'T3' } } satisfies Record<Group, { count: number; minTier: Tier }>, // 0014#63 이공은 계층 무관
  PAPER_QUALITY: { base: 30, skill: 0.45, relation: 0.08, noise: 9 },                  // 0014#64 30 + 0.45·skill + 0.08·relation + U(−9, 9)
  TRACK_VENUE_GROUP: {
    computer: 'cs-ai', ai: 'cs-ai',                                                    // 0014#65 컴퓨터과학·인공지능
    mathematics: 'math',                                                               // 0014#65 수학
    statistics: 'statistics',                                                          // 0014#65 통계학
    life_science: 'life', neuroscience: 'life', systems_biology: 'life', bioengineering: 'life', // 0014#65 생명과학
    mechanical: 'mech-elec', electrical: 'mech-elec', semiconductor: 'mech-elec', energy: 'mech-elec', // 0014#65 기계·전기전자공학
    chemical: 'chem-mat', materials: 'chem-mat',                                       // 0014#65 화학·재료공학
    civil: 'civil-env', environmental: 'civil-env',                                    // 0014#65 토목·환경공학
    sociology: 'sociology',                                                            // 0014#65 사회학
    economics: 'economics',                                                            // 0014#65 경제학
    political: 'politics-admin', public_administration: 'politics-admin',              // 0014#65 정치학·행정학
    psychology: 'psychology',                                                          // 0014#65 심리학
    history: 'history-philosophy-ko', philosophy: 'history-philosophy-ko', korean_literature: 'history-philosophy-ko', // 0014#65 역사학·철학·한국문학
    english_literature: null, linguistics: null,                                       // 0014#65 분야군 없음: 이름 없는 가상 학술지, 화면에 창작 표시
    law: null,                                                                         // 0014#65 법학(#70): venues 팩에 법학 분야군이 없다 → 가상 학술지
  } as Record<string, string | null>,
  CONFERENCE_TRACKS: ['computer', 'ai'],                                               // 0014#65 학회는 이 트랙에서만 투고처로 나온다(선택권 §6.3)
  TIER_BASE: { T1: 0.25, T2: 0.35, T3: 0.45, T4: 0.60 } satisfies Record<Tier, number>, // 0014#66
  ACCEPT: { gamma: 0.04, center: 55, resubmitLogit: 0.25, lo: 0.05, hi: 0.90 },        // 0014#67
  REVISE_BAND_MAX: 0.29, REVISE_P_CEIL: 0.95,                                          // 0014#68 수정 요구 구간 min(0.95 − p_acc, 0.29)
  REVIEW_MONTHS: {
    cs: [2, 6],                                                                        // 0014#69
    math: [4, 10],                                                                     // 0014#69
    bio: [3, 8],                                                                       // 0014#69
    engineering: [3, 7],                                                               // 0014#69
    social: [4, 9],                                                                    // 0014#69
    humanities: [4, 10],                                                               // 0014#69
  } as const,
  REVIEW_DELAY_P: 0.18, REVIEW_DELAY_MONTHS: [1, 3], REREVIEW_DIVISOR: 2,              // 0014#69 지연 확률, 지연 개월 범위, 재심은 절반(올림)
  INDEXED_VENUE_RECORDS: ['venues-conf-icml-acceptance-2025', 'venues-conf-isscc-core-rank'], // 0014#70
  PAPER_SCORE_WEIGHT: { T1: 3, T2: 2, T3: 1.5, T4: 1 } satisfies Record<Tier, number>, // 0014#71
  FIRST_TIER: { '이공': 'T1', '인문사회': 'T3' } satisfies Record<Group, Tier>,          // 0014#120 첫 투고 계층(Wave 4 추가); 거절 뒤 기본 방침은 한 계층 낮춤

  // ── 자격시험·학위 심사 (0014 #72–#73) ──
  QUAL_EXAM: {
    firstWindowMonths: 12, intervalMonths: 6,                                          // 0014#72 응시 창 12개월째부터 6개월마다
    p0: 0.70, betaSkill: 1.2, betaHealth: 0.3, retryLogit: 0.25, lo: 0.10, hi: 0.95,   // 0014#72
    maxAttempts: 3, autoSkill: 45, autoP: 0.3,                                         // 0014#72 3회 불합격 종료, 자동 응시 skill ≥ 45 또는 확률 0.3
  },
  DEFENSE: { p0: 0.73, betaSkill: 1.0, betaRelation: 0.4, betaHealth: 0.3, retryLogit: 0.6, lo: 0.40, hi: 0.95, retryMonths: 6 }, // 0014#73

  // ── 졸업 직전 진로 분포 (0014 #74–#77) ──
  HUMSOC_NONREG_PATH: { academia: 0.80, public: 0.15, industry: 0.05 },                // 0014#74
  PERM_PATH: {
    '이공': { industry: 0.60, public: 0.25, academia: 0.15 },                          // 0014#75
    '인문사회': { academia: 0.35, public: 0.30, industry: 0.35 },                      // 0014#75
  },
  PERMANENT_RECORD_PREFIX: 'statistics-form-permanent-', PERMANENT_RECORD_SUFFIX: '-2021-2024', // 0014#76 4년 합산판
  STARTUP_P_RECORD: 'statistics-nonwage-share',                                        // 0014#77 비임금근로자 비율을 창업 확률로

  // ── 경력 급여 (0014 #78–#91) ──
  SALARY_RAISE_RATE: 0.03,                                                             // 0014#78
  STEP_INCREMENT: 1,                                                                   // 0014#79
  NONTENURE_PAY_RECORD: 'salaries-faculty-private-nontenure-mean',                     // 0014#80 indexed, 값은 레코드
  POSTDOC_UNIV_PAY: 37_800_000,                                                        // 0014#81
  LECTURE: { hoursPerWeek: 6, weeks: 32 },                                             // 0014#82
  LECTURER_HOURLY_FALLBACK: 'median-of-lecturer-hourly-records',                       // 0014#82 레코드 없는 학교(dgist, unist)는 18건 중앙값을 레코드에서 계산
  HUMSOC_INSTITUTE_PAY_RECORD: 'salaries-entry-nonscitech-annual-current-job-2022',    // 0014#83
  COMPANY_PAY_RECORD: { '이공': 'salaries-entry-scitech-annual-current-job-2021', '인문사회': 'salaries-entry-nonscitech-annual-current-job-2022' }, // 0014#84
  STARTUP: { incomeMedian: 30_000_000, sigma: 0.8, closeP: 0.20 },                     // 0014#85
  BRIDGE_PAY: 24_000_000,                                                              // 0014#86
  PRIVATE_FACULTY_PAY_RECORDS: {
    professor: 'salaries-faculty-private-professor-mean',                              // 0014#87 교수 = 관측값(2024)
    ratio2017: {
      professor: 'salaries-faculty-private-professor-mean-2017',                       // 0014#87 부교수·조교수 = 교수 × 2017 직급 비
      associate: 'salaries-faculty-private-associate-professor-mean-2017',             // 0014#87
      assistant: 'salaries-faculty-private-assistant-professor-mean-2017',             // 0014#87
    },
  },
  NATIONAL_STEP: {
    base: 8, ageBase: 24, doctorBonus: 0, stepMin: 1, stepMax: 33,                     // 0014#88 n0 = clamp(8 + (임용 나이 − 24) + 가감, 1, 33)
    adjustRecords: {
      professor: 'salaries-public-univ-career-adjust-professor',                       // 0014#88 가감은 레코드(교수 −10, 부교수 −7, 조교수 −4)
      associate: 'salaries-public-univ-career-adjust-associate-professor',             // 0014#88
      assistant: 'salaries-public-univ-career-adjust-assistant-professor',             // 0014#88
    },
  },
  ALLOWANCE_MULT: 1.3,                                                                 // 0014#89 월 본봉 × 12 × 1.3
  RESEARCHER_STEP: { adjust: -4, stepMax: 36, officerOffset: -5, officerMin: 1 },      // 0014#90
  NATIONAL_HIRE_SHARE: 0.3,                                                            // 0014#91

  // ── 경력 논문·승진·계약·은퇴 (0014 #92–#101) ──
  CAREER_PAPER: { p0: 0.50, beta: 1.0, tier: 'T2' },                                   // 0014#92
  PROMOTION: { betaSkill: 0.8, betaNetwork: 0.4, betaRelation: 0.4, gammaScore: 0.15, scoreCap: 10, lo: 0.05, hi: 0.95 }, // 0014#93
  PROMOTION_P0: {
    'professor:assistant-to-associate': 0.75,                                          // 0014#94 career-5y
    'professor:associate-to-full': 0.75,                                               // 0014#94 career-10y
    'nontenure:to-tenure-track': 0.15,                                                 // 0014#94 career-5y
    'institute:junior-to-senior': 0.70,                                                // 0014#94 career-5y
    'institute:senior-to-principal': 0.60,                                             // 0014#94 career-10y
    'public:researcher-to-officer': 0.40,                                              // 0014#94 career-10y
    'industry:promotion': 0.60,                                                        // 0014#94 career-5y, career-10y
  },
  INDUSTRY_PROMOTION_RAISE: 0.10,                                                      // 0014#94 기업 승진 +10%
  CONTRACT: {
    postdoc: { years: 2, renewP: 0.50 },                                               // 0014#95
    lecturer: { years: 1, renewP: 0.70 },                                              // 0014#95
  },
  PATH_CHANGE_MULT: 0.8,                                                               // 0014#96
  // 과제 참여율과 박사과정 중 근로(#79, 선택권 §4.7)
  PART_WEEK_HOURS: 40,                                                                 // 0014#124 참여율·근로 시간의 기준 주(사용자 규칙: 주 40시간 중 비율)
  PARTICIPATION: { step: 0.25, projectDefault: 0.5 },                                  // 0014#125 참여율 0–1(0.25 단위), 과제 경로 기본 0.5. 장려금 = 레코드 × r/0.5. 다른 경로는 0
  // 0014#130 참여율 추첨(사용자 규칙 2026-10-15): 학기마다 r = 0.25 단위 반올림(clamp(0.5 × D_연구 × (1 + 0.5·z(relation)) × (1 + 0.3·N), 0, 1)).
  // D_연구 = 연구 직종 경로 수요 계수(뉴스, 노동 §5.1)의 평균
  PARTICIPATION_DRAW: { betaRelation: 0.5, sigma: 0.3, routes: ['professor', 'nontenure', 'postdoc', 'institute'] as const },
  GROWTH_FLOOR: 0,                                                                     // 0014#126 성장 배수 = max(0, 1 − 근로 시간/40 − 참여율/2) (사용자 규칙, 합산)
  WEEKS_PER_MONTH: 4.345, MIN_WAGE_YEAR: 2027,                                       // 0014#127 아르바이트 시급 = 최저시급 레코드(2027) × (1 + 물가 목표 레코드)^(연도 − 2027), 월 4.345주
  PHD_LECTURE: { timeMult: 3, steps: [3, 6, 9] },                                     // 0014#128 박사과정 강의: 주당 시간 = 시수 × 3(사용자 규칙), 강의료 = 시수 × 학교 시간강사 시급 레코드 × (연 32주/12)(0014#82)
  AUTO_PART_TIME: { jobHours: 15, lectureHours: 3, stopCashMonths: 3 },               // 0014#129 자동 정책: 현금 < 0 이면 근로 시작(강의 자격이면 강의), 현금 ≥ 생활비 × 3 이면 그만둔다
  CAREER_REPAY_SHARE: 0.20,                                                          // 0014#122 경력·은퇴 단계 월 상환: 그달 소득의 20%까지 부채를 갚는다(#96)
  CAREER_5Y_STAY_MIND: -5,                                                             // 0014#121 career-5y D "한 번 더 버틴다": 마음 −5 (Wave 4 추가)
  EARLY_RETIRE_MULT: 0.85,                                                             // 0014#97
  POST_RETIRE_RESEARCH: { monthly: 500_000, years: 5, p: 0.6 },                        // 0014#98
  RETIRE_AGE: { professor: 65, institute: 61, public: 60 },                            // 0014#99 교수 65, 출연연 61, 연구직 공무원 60
  RETIRE_AGE_OTHER_RANGE: [60, 67],                                                    // 0014#100 U{60, …, 67}
  PENSION_BASE_MONTHLY: 550_000, PENSION_CAP_RATIO: 0.6,                               // 0014#101 55만 원 + min(0.6·W_last, a·근속·W_last)
  PENSION_ACCRUAL_PUBLIC: 0.019, PENSION_ACCRUAL_OTHER: 0.010,                         // 0014#101
  PENSION_PUBLIC_ROUTES: ['professor', 'public'],                                      // 0014#101 공적연금 경로: 교수·연구직 공무원

  // ── 노동시장 (0014 #102–#118) ──
  LABOR_BASE_YEAR: 2025,                                                               // 0014#102
  NEW_HIRE_ALLOCATION: 'fulltime-stock-share',                                         // 0014#103 신규채용 × 전임 스톡 비중(총량은 레코드)
  PROFESSOR_H: { kappa: 0.5, cap: 0.10 },                                              // 0014#104 h = min(0.10, 0.5 × B_k)
  HONORARY_ALLOCATION: 'fulltime-stock-share',                                         // 0014#105 명예교수 총량은 레코드
  LECTURER_H: { coef: 0.15, lo: 0.20, hi: 0.85 },                                      // 0014#106
  ROUTE_H: {                                                                           // 연 채용 h. 교수·시간강사는 레코드에서 계산(#104, #106)
    postdoc: { '이공': 0.60, '인문사회': 0.25 },                                       // 0014#107
    nontenure: { '이공': 0.10, '인문사회': 0.10 },                                     // 0014#109
    institute: { '이공': 0.12, '인문사회': 0.08 },                                     // 0014#110
    public: { '이공': 0.06, '인문사회': 0.06 },                                        // 0014#111
    industry: { '이공': 0.55, '인문사회': 0.30 },                                      // 0014#112
  },
  POSTDOC_INSTITUTE_SHARE: { '이공': 0.282, '인문사회': 0.15 },                        // 0014#108 이공 출연연 박사후 0.282
  BRIDGE_SEARCH_P: 0.25,                                                               // 0014#113 월, 공고 없이 추첨
  S0: { professor: 0.10, nontenure: 0.20, lecturer: 0.50, postdoc: 0.40, institute: 0.20, public: 0.15, industry: 0.30 }, // 0014#114
  ROUTE_COEF_GROUP: { professor: 'professor', nontenure: 'professor', lecturer: 'lecturer', postdoc: 'postdoc', institute: 'institute', public: 'institute', industry: 'industry' }, // 0014#115
  HIRE_COEF: {
    professor: { betaSkill: 0.8, betaNet: 0.6, gammaS: 0.12, gammaExp: 0.4 },          // 0014#115 교수·비정년
    lecturer: { betaSkill: 0.4, betaNet: 0.6, gammaS: 0.05, gammaExp: 0.2 },           // 0014#115
    postdoc: { betaSkill: 0.8, betaNet: 0.4, gammaS: 0.10, gammaExp: 0 },              // 0014#115
    institute: { betaSkill: 0.6, betaNet: 0.3, gammaS: 0.08, gammaExp: 0.2 },          // 0014#115 출연연·공무원
    industry: { betaSkill: 0.6, betaNet: 0.5, gammaS: 0.03, gammaExp: 0 },             // 0014#115
  },
  S_REF: { '이공': 4, '인문사회': 2 },                                                 // 0014#115
  HIRE_SCORE_CAP: 12, HIRE_EXP_MONTHS: 24,                                             // 0014#115 min(S, 12), 학계 경력 24개월 이상
  POST_BOUNDS: { lo: 0.005, hi: 0.60 }, HIRE_BOUNDS: { lo: 0.01, hi: 0.60 },           // 0014#116
  DEMAND_BOUNDS: { lo: 0.70, hi: 1.30 },                                               // 0014#117
  NEWS_MONTHLY_P: 0.5,                                                                 // 0014#118
  NEWS_TYPES: [
    { id: 'rnd-budget-up', headlineKey: 'news.rnd-budget-up', target: { kind: 'group', values: ['이공'] }, routes: ['professor', 'postdoc', 'institute'], effect: [0.08, 0.15], months: [6, 12], weight: 6 }, // 0014#119 정부, 내년 연구개발 예산 확대 발표
    { id: 'rnd-budget-cut', headlineKey: 'news.rnd-budget-cut', target: { kind: 'group', values: ['이공'] }, routes: ['postdoc', 'institute', 'professor'], effect: [-0.20, -0.10], months: [6, 12], weight: 5 }, // 0014#119 연구개발 예산 조정으로 과제 축소
    { id: 'ai-boom', headlineKey: 'news.ai-boom', target: { kind: 'track', values: ['ai', 'computer'] }, routes: ['industry', 'professor', 'postdoc'], effect: [0.15, 0.30], months: [6, 12], weight: 6 }, // 0014#119 대형 인공지능 투자 잇따라
    { id: 'semi-talent', headlineKey: 'news.semi-talent', target: { kind: 'track', values: ['semiconductor', 'electrical', 'materials'] }, routes: ['industry', 'institute', 'professor'], effect: [0.10, 0.25], months: [6, 9], weight: 5 }, // 0014#119 반도체 인력 양성 사업 공고
    { id: 'battery-shift', headlineKey: 'news.battery-shift', target: { kind: 'track', values: ['energy', 'chemical', 'materials'] }, routes: ['industry', 'institute'], effect: [0.10, 0.20], months: [6, 9], weight: 4 }, // 0014#119 이차전지·에너지 전환 지원책
    { id: 'bio-cluster', headlineKey: 'news.bio-cluster', target: { kind: 'track', values: ['life_science', 'bioengineering', 'systems_biology', 'neuroscience'] }, routes: ['industry', 'postdoc'], effect: [0.10, 0.20], months: [6, 9], weight: 4 }, // 0014#119 바이오 클러스터 새로 지정
    { id: 'climate-program', headlineKey: 'news.climate-program', target: { kind: 'track', values: ['environmental', 'civil', 'energy'] }, routes: ['institute', 'public'], effect: [0.10, 0.20], months: [6, 9], weight: 3 }, // 0014#119 기후 대응 연구사업 시작
    { id: 'data-demand', headlineKey: 'news.data-demand', target: { kind: 'track', values: ['statistics', 'mathematics', 'economics'] }, routes: ['industry', 'public'], effect: [0.10, 0.20], months: [3, 6], weight: 3 }, // 0014#119 데이터·통계 전문 인력 수요 증가
    { id: 'dept-merger', headlineKey: 'news.dept-merger', target: { kind: 'kedi', values: ['humanities', 'social'] }, routes: ['professor', 'lecturer'], effect: [-0.30, -0.15], months: [6, 12], weight: 1 }, // 0014#119 학령인구 감소로 학과 통폐합 확산 (보정 2026-10-14: 5 → 1)
    { id: 'humanities-fund', headlineKey: 'news.humanities-fund', target: { kind: 'kedi', values: ['humanities'] }, routes: ['professor', 'postdoc', 'lecturer'], effect: [0.05, 0.15], months: [3, 6], weight: 6 }, // 0014#119 인문학 진흥 사업 선정 (보정 2026-10-14: 3 → 6)
    { id: 'socsci-project', headlineKey: 'news.socsci-project', target: { kind: 'track', values: ['sociology', 'political', 'public_administration', 'psychology'] }, routes: ['postdoc', 'institute'], effect: [0.10, 0.20], months: [6, 9], weight: 3 }, // 0014#119 사회과학 대형 공동연구 착수
    { id: 'lecturer-policy', headlineKey: 'news.lecturer-policy', target: { kind: 'all', values: [] }, routes: ['lecturer'], effect: [0.10, 0.20], months: [6, 12], weight: 2 }, // 0014#119 강사 강의 배정 확대 방침 (보정 2026-10-14: 3 → 2)
    { id: 'univ-freeze', headlineKey: 'news.univ-freeze', target: { kind: 'all', values: [] }, routes: ['professor', 'nontenure'], effect: [-0.20, -0.10], months: [3, 6], weight: 3 }, // 0014#119 대학 재정 동결, 교원 채용 줄어 (보정 2026-10-14: 4 → 3)
    { id: 'inst-expand', headlineKey: 'news.inst-expand', target: { kind: 'group', values: ['이공'] }, routes: ['institute'], effect: [0.10, 0.25], months: [6, 12], weight: 3 }, // 0014#119 출연연 연구인력 정원 확대
    { id: 'inst-freeze', headlineKey: 'news.inst-freeze', target: { kind: 'group', values: ['이공'] }, routes: ['institute'], effect: [-0.25, -0.10], months: [6, 9], weight: 3 }, // 0014#119 출연연 신규 채용 동결
    { id: 'hiring-chill', headlineKey: 'news.hiring-chill', target: { kind: 'all', values: [] }, routes: ['industry'], effect: [-0.25, -0.10], months: [6, 9], weight: 2 }, // 0014#119 기업 연구소 채용 한파 (보정 2026-10-14: 4 → 2)
    { id: 'policy-research', headlineKey: 'news.policy-research', target: { kind: 'track', values: ['economics', 'public_administration'] }, routes: ['institute', 'public'], effect: [0.10, 0.20], months: [6, 9], weight: 3 }, // 0014#119 정책 연구 수요 증가
  ] as const satisfies readonly NewsTypeShape[],

  // ── 구조 상수 (0014 항목 아님: 단위 변환·자르기 경계. 상태 §1.5, §3, §4, §7) ──
  STAT_MIN: 0, STAT_MAX: 100, STAT_NEUTRAL: 50, Z_SCALE: 50,                            // 능력치 범위 0–100, z(x) = (x − 50) / 50
  MONTHS_PER_YEAR: 12, SEMESTER_MONTHS: 6,                                              // hazardMonth 지수, 학기 경계 달(month mod 6 = 0)
} as const;

export type NewsType = typeof ASSUMED.NEWS_TYPES[number];
