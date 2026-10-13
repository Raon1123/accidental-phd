# 0001. 기술 스택

## 상태
승인됨 · 2026-10-13

## 맥락
참고 대상 두 게임(1in8b.life, 어쩌다 박사 v3.5) 모두 백엔드 없는 정적 사이트이고 저장은 브라우저 localStorage다. 협업자 중 ChatGPT는 코드를 실행하지 못하므로 데이터 팩은 사람이 붙여넣을 수 있는 JSON이어야 한다. Wave 0~3은 코드보다 문서·데이터가 중심이라 빌드 도구가 필요 없다.

## 결정
- 엔진·UI(Wave 4 이후): TypeScript ES 모듈, Vitest, GitHub Pages 정적 배포, 백엔드 없음, 저장은 localStorage.
- Wave 0~3 스크립트(검증기 등): 의존성 없는 Node 20+ ESM 스크립트와 내장 `node:test`. `package.json`에 devDependency를 두지 않는다.
- 문자열은 코드와 분리해 한국어 우선으로 쓰고, 영어·일본어를 나중에 붙일 수 있게 한다.

## 결과
얻는 것: 서버 비용 0, 설치 없이 `npm test`·`npm run validate` 실행, ChatGPT 기여 경로 단순. 잃는 것: 기기 간 동기화 없음, 공유 기능은 URL 인코딩이나 카드 이미지로 한정. 다시 볼 조건: 공유·메모리얼 기능(1in8b.life의 "Shared lives")을 넣기로 할 때.
