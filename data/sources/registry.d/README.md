# registry.d

수집 issue마다 출처 파일 하나를 둔다: `data/sources/registry.d/<issue-number>-<topic>.json` (registry.json과 같은 배열 형식). 검증기는 `registry.json`과 이 디렉터리의 모든 `.json`을 합쳐 읽고, id 중복을 거부한다. 여러 PR이 `registry.json` 한 파일에 덧붙이며 생기던 머지 충돌을 막기 위한 구조다(결정 기록 0012, Wave 2 회고). 기존 `registry.json`은 그대로 두고, Wave 3부터 새 출처는 이 디렉터리에 추가한다.
