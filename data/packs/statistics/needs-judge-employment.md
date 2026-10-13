# statistics/employment — 사용 시 판정 필요 항목 (→ Wave 3, issue #18)

2026-10-13 수집(#12). 수치는 모두 출처 표와 일치하며 어쩌다 박사 v3.5가 쓴 값과도 같다. 아래는 데이터 오류가 아니라 **게임이 이 수치를 어떻게 쓸지**의 판정이다. Wave 3 엔진 스펙(#18)에서 결정 기록으로 정한다.

| 항목 | 쟁점 | 후보 | 판정 |
|---|---|---|---|
| 전공계열 매핑 | 출처는 한국표준교육분류(KSCED) 10계열, 게임은 NRF 계열·트랙 | cs→정보통신기술, math·bio→자연과학·수학·통계, social→사회과학·언론·정보학, humanities→예술 및 인문학(v3.5 방식). 경영·행정·법(40.8), 교육(62.7), 보건(60.0), 농림어업·수의학(52.5)은 미사용 | [결정 기록 0013 §1](../../../docs/design/decisions/0013-wave3-pre-spec-judgments.md) |
| 연도 | 2024 단년 vs 2021–2024 합산(ICT 61.5, social 38.4, humanities 34.0) | 기본 2024 단년, 합산은 변동폭 표시용 | [결정 기록 0013 §1](../../../docs/design/decisions/0013-wave3-pre-spec-judgments.md) |
| 취업 정의 | 취업자에 박사후연구원·시간강사 포함(표 7 주) | 게임의 "취업" = 박사후 포함, 경력 단계 분기는 별도 확률 | [결정 기록 0013 §1](../../../docs/design/decisions/0013-wave3-pre-spec-judgments.md) |
| 고용형태 | 비정규직(풀타임)은 기간제로 정의되지 않음; 계열별 아님 | 계열별은 그림 11 정규직 비율 사용 | [결정 기록 0013 §1](../../../docs/design/decisions/0013-wave3-pre-spec-judgments.md) |
| 휴학 | KISTEP 과학기술인력 = 자연·공학·의약학(STEM과 다름) | 이공 대리값으로 사용, assumed 표시 | [결정 기록 0013 §1](../../../docs/design/decisions/0013-wave3-pre-spec-judgments.md) |
| 박사후 재원 | 과학기술인력만, 전 분야 행 없음; 재원인지 소속기관인지 불명확 | 이공만 적용, 인문사회는 assumed | [결정 기록 0013 §1](../../../docs/design/decisions/0013-wave3-pre-spec-judgments.md) |
| 분모 | 취업률·종사상 지위·근로 형태의 N 미공개(표 7에서 유도한 근사 N은 derived 표시) | 그대로 사용, UI에 표본 미공개 표기 | [결정 기록 0013 §1](../../../docs/design/decisions/0013-wave3-pre-spec-judgments.md) |
