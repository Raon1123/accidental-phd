# 결정 기록

설계 선택 하나당 파일 하나. 파일명은 `NNNN-<slug>.md`, 번호는 순차. 네 헤딩(`## 상태`, `## 맥락`, `## 결정`, `## 결과`)이 전부 있어야 `npm run validate`가 통과한다. 결정을 뒤집을 때는 새 번호로 쓰고 옛 기록의 상태를 `대체됨(→ NNNN)`으로 바꾼다.

## 템플릿

```markdown
# NNNN. <제목>

## 상태
제안됨 | 승인됨 | 대체됨(→ NNNN) · <YYYY-MM-DD>

## 맥락
<왜 결정이 필요했나. 출처·수치가 있으면 링크>

## 결정
<무엇을 하기로 했나. 한 문단>

## 결과
<얻는 것 / 잃는 것 / 다시 볼 조건>
```

## 목록

- [0001 기술 스택](0001-tech-stack.md)
- [0002 fork 대신 재구현](0002-reimplement-not-fork.md)
- [0003 공개 학술지·학회 지표만 사용](0003-open-venue-metrics.md)
- [0004 학교 표시명 가상 유지](0004-fictional-school-display-names.md)
- [0005 무작위보다 선택](0005-agency-over-randomness.md)
- [0006 Sonnet의 ChatGPT 대응 등급은 Luna](0006-sonnet-chatgpt-tier-luna.md)
- [0007 분류 기준은 NRF 학술연구분야분류, 계열은 대분류에서 유도](0007-nrf-classification-backbone.md)
- [0008 트랙 26개 ↔ NRF 코드 매핑 판정](0008-track-mapping-judgments.md)
- [0009 KEDI 학과 분류 ↔ NRF 코드 매핑 판정](0009-kedi-mapping-judgments.md)
- [0010 Wave 운영 규칙 보완](0010-wave-operating-rules.md)
- [0011 모집 단위 범위 483개와 NRF 코드 판정](0011-departments-scope-judgments.md)
- [0012 출처 등록부를 issue 단위 파일로 분할](0012-registry-split-per-issue.md)
- [0013 Wave 3 스펙 작성 전 판정](0013-wave3-pre-spec-judgments.md)
- [0014 Wave 3 엔진 스펙의 설계 가정(assumed) 전체 목록](0014-assumed-probabilities.md)
- [0015 Wave 3 회고 반영: 감사 변경 반영 주체, 데이터 수정 검사, 감사자 독립성, 보정 값 변경 절차, 결정 기록 승인 시점](0015-wave3-retro-rules.md)
- [0016 Wave 4 회고 반영: 묶음 PR 병합 방식, 스펙과 구현이 다를 때의 정본, 보정에서 자동 정책의 지위](0016-wave4-retro-rules.md)
- [0017 웹 빌드: Vite, 브라우저용 엔진 진입점, 데이터 한 파일 내보내기](0017-web-build-vite.md)
- [0018 Wave 5 회고 반영: 플레이어 선택 범위, 실명 금지 범위, 기록 다시 쓰기 전 판정, 병렬 세션의 공유 파일 책임](0018-wave5-retro-rules.md)
- [0019 학교 akj의 운 추첨 가중치: 단위 수 가중치 유지](0019-akj-luck-weight.md)
- [0020 실명 기록 삭제 때 커밋 해시 인용 처리: 대응표 커밋과 인용 치환, PR 번호 유지](0020-history-rewrite-hash-citations.md)
- [0021 재정 파탄 목표와 일반 대출 한도: 4,200만 유지, 목표를 이탈 레코드에서 유도](0021-financial-target-loan-limit.md)
- [0022 자비 경로 수입 구성: 입학 때 조교 추첨(P_TA 0.265, 생활비 재원 조사 레코드)](0022-self-funding-income.md)
- [0023 재정 위기 강제 만료의 선택지: A는 끝나는 자금에만, C는 살아 있는 자금 유지, 종료 규칙은 그대로](0023-crisis-expiry-options.md)
- [0024 재정 위기 유예와 종료 조건: 3+3·현금 잔액 기준 유지, 종료 규칙은 재정 파탄 목표의 손잡이가 아님](0024-crisis-grace-ending.md)
- [0025 자동 정책의 근로 시작 조건: 지난달 정산에 부족분(대출)이 있으면 근로 시작, 정책 변경으로 보고하고 M̄는 따로 재유도](0025-auto-work-start.md)
- [0026 조교 상태의 경로 표식: B와 입학 조교 추첨이 같은 자비·의무 시간 상태, C는 조교 상태 유지(구현 고침)](0026-ta-state-route.md)
- [0027 조교 상태에서의 funding-expiry B: `already-ta`로 닫음, 정책 가중치는 재정규화에 맡김(규칙 변경)](0027-already-ta.md)
- [0028 이공 학위 기간: 집필 속도를 성장 배수 아래서 재유도(12 → 25), M̄ 실현값에 휴학 달 포함(0.279 → 0.242), 환경 상수 재적합](0028-degree-length-writing-mbar.md)
- [0029 자동 정책의 첫 초고 규칙: 자격시험 첫 응시 창(재학 12개월)이 열리면 writeP 0.6으로 첫 초고 시작, 새 상수 없음, 정책 변경으로 보고(재판정으로 채택, 취업 칸은 #182 2단계로)](0029-first-draft-rule.md)
- [0030 학부·석사 단계: 삶을 학부 입학에서 시작하고 두 단계 모두 월 단위로 진행](0030-undergrad-master-stages.md)
