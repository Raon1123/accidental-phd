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
