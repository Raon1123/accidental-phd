# 0012. 출처 등록부를 issue 단위 파일로 분할

## 상태
승인됨 · 2026-10-13 (사용자 지적: "registry.json에서 conflict이 자주 나는 것 같다")

## 맥락
Wave 2에서 13개 수집 PR이 전부 `data/sources/registry.json` 배열 끝에 출처를 덧붙였다. 머지 순서상 #34를 뺀 12개 PR이 연속으로 충돌했고, 같은 이유로 팩별 `records.json`과 README의 같은 앵커(`**담당 issue.**` 앞)도 충돌했다. 충돌은 id 합집합·양쪽 유지로 기계적으로 풀렸지만, 사람이 GitHub에서 클릭 머지할 수 없는 상태였다.

## 결정
- 새 출처는 `data/sources/registry.d/<issue-number>-<topic>.json`에 issue 단위 파일로 추가한다. 형식은 `registry.json`과 같은 배열이다. 검증기는 `registry.json`과 `registry.d/*.json`을 합쳐 읽고 id 중복을 거부한다(테스트 2건).
- 기존 `registry.json`(266건)은 그대로 둔다. 분할 이관은 하지 않는다.
- 팩 레코드는 당분간 팩당 `records.json` 하나를 유지한다. Wave 3에서 같은 팩을 여러 issue가 동시에 수집할 계획이 생기면 같은 방식(`records.d/`)으로 나눈다.
- README 추가 문단은 파일 끝의 `## 판정 로그` 절에 날짜순으로 덧붙인다(앵커 앞 삽입 금지). 프롬프트 `stat-collector-wave2.md`와 팩 README에 반영.

## 결과
얻는 것: 수집 PR끼리 출처 파일 충돌이 사라져 GitHub에서 바로 머지 가능. 잃는 것: 출처가 두 곳에 흩어짐(검증기가 합치므로 조회는 동일). 다시 볼 조건: 팩 레코드 충돌이 다시 문제가 될 때(`records.d/` 도입).
