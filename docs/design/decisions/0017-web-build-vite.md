# 0017. 웹 빌드: Vite, 브라우저용 엔진 진입점, 데이터 한 파일 내보내기

## 상태
승인됨 · 2026-10-14 (issue #53; PR #63 머지로 승인, 결정 기록 0010 §3 (b))

## 맥락
결정 기록 0001은 UI를 TypeScript ES 모듈과 GitHub Pages 정적 배포로 정했지만 번들러는 정하지 않았다. Wave 4 엔진의 데이터 적재기(`engine/src/data/load.ts`)와 분류 모듈은 Node 파일 시스템과 해시 모듈을 직접 써서 브라우저에서 돌 수 없었다.

## 결정
1. 번들러는 Vite다. Vitest가 이미 같은 Vite에 의존하므로 새 도구 계열이 늘지 않는다. 개발 의존성 `vite`를 명시하고 `vite.config.ts`의 root는 `web/`, base는 상대 경로(`./`)다.
2. 엔진 데이터 계층을 둘로 나눈다. `engine/src/data/bundle.ts`는 Node 모듈 없이 묶음 타입·조회 함수·`bundleFromTexts`를 둔다. `load.ts`는 Node 전용으로 파일을 읽고 dataRevision을 계산한다. 분류 모듈은 `mapping-tracks.json`을 파일이 아니라 묶음의 `mappingTracks`에서 읽는다. dataRevision 계산 대상 파일과 순서는 바뀌지 않는다.
3. 브라우저용 진입점은 `engine/src/browser.ts`다. `index.ts`와 같은 공개 API에서 `loadData`만 빼고 `bundleFromWebData`를 더한다. `web/`은 이 진입점만 가져오며, 테스트(`web/test/boundary.test.ts`)가 이를 검사한다.
4. 데이터는 빌드 때 `engine/sim/export-web-data.ts`가 팩 파일 텍스트와 dataRevision을 `web/public/data.json` 한 파일로 쓴다. 이 파일은 커밋하지 않는다.

## 결과
얻는 것: 엔진 코드 한 벌이 Node 테스트·보정과 브라우저에서 같이 돈다. 브라우저 묶음과 Node 묶음이 같은 레코드·dataRevision을 갖는지 테스트가 확인한다(`web/test/webdata.test.ts`).
잃는 것: 데이터 파일이 압축 전 약 2.3MB라 첫 로딩이 느릴 수 있다. 팩을 나눠 받는 방식은 성능 문제가 관측되면 다시 본다.
다시 볼 조건: 첫 화면 로딩이 느리다는 플레이테스트 기록이 생기거나, 서사·뉴스 텍스트 팩(#57·#58)으로 데이터 파일이 두 배 이상 커질 때.
