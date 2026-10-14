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
