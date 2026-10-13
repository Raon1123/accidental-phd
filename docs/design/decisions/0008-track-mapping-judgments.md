# 0008. 트랙 26개 ↔ NRF 코드 매핑 판정

## 상태
승인됨 · 2026-10-13 (issue #3, 판정자 fable/main thread)

## 맥락
수집자(sonnet)가 `data/packs/taxonomy/mapping-tracks.json`에 72행을 만들고 49행에 `needs-judge`를 붙였다. 쟁점은 네 가지였다. (1) primary를 중분류로 둘지 소분류로 둘지. (2) 같은 이름이 두 중분류에 있을 때(반도체 D120100/D090600) 어느 쪽인지. (3) 의약학(E)·복합학(H) 코드(신경과학, 뇌과학, 인지과학)를 넣을지. (4) 이공 트랙에 인문사회 코드(환경사회학 등)를 후보로 둘지.

## 결정
- **primary 수준 규칙.** 트랙이 중분류 하나를 통째로 덮으면 중분류가 primary이고, 그 소분류들이 세부전공 선택지가 된다. 트랙이 중분류의 일부만 가리키면 소분류가 primary다. 결과: 중분류 primary 19개, 소분류 primary 7개(systems_biology, semiconductor, energy, ai, neuroscience 외 2개는 아래 변경으로 중분류로 옮김).
- **변경 2건.** korean_literature → A110000 한국어와문학(중분류), english_literature → A150000 영어와문학(중분류). 모집 단위(국어국문학과, 영어영문학과)가 어학과 문학을 함께 다루므로 소분류 하나(국문학·영문학)를 primary로 두면 어학 전공자가 선택지에서 빠진다.
- **반도체.** D120100(전자/정보통신공학 > 반도체) primary. 소자·집적회로 중심이고 v3.5의 반도체공학과(GIST)가 전자공학 계열이다. D090600은 보조 후보로 남긴다.
- **의약학·복합학 코드 제외.** E300000 신경과학, H070000 뇌과학, H060000 인지과학 행을 삭제한다. 결정 기록 0007의 1차 범위(인문사회·이공) 밖이며, 계열 `기타` 코드가 선택지에 섞이면 계열 분리가 깨진다. neuroscience는 C070600 신경생물학 primary, B210800 신경심리 보조.
- **계열 교차 후보 제외.** environmental의 B081000 환경사회학, B150900 환경/자원정책을 삭제한다. 이공 트랙의 선택지에 인문사회 코드가 들어가면 계열 유도 규칙(0007)과 충돌한다.
- **systems_biology.** NRF에 해당 소분류가 없다. C071600 생물정보학 primary, confidence는 `assumed` 유지(설계 가정). 분자·세포·응용생물학은 보조.
- **energy.** 기계·전기·화공·원자력에 걸친다. D020700 에너지및동력공학 primary(`indexed`), D090900·D050900·D180000·D030900·D150400 보조. 게임에서는 보조 코드도 같은 트랙의 선택지로 노출한다.
- 나머지 보조 후보(ai의 D091100·D120200·D131500·D131700, bioengineering의 D250000·D051100·D092000·D250300, electrical의 D120000, chemical의 C060000, civil의 D150000·D240000, environmental의 C080100·C070700·C100400, public_administration의 B150000, linguistics의 A091900·A091700, korean_literature·english_literature의 하위 소분류)는 그대로 둔다. 모든 행의 `needs-judge` 표기를 지우고 "판정 2026-10-13 (결정 기록 0008)"을 note에 남겼다.

최종 primary 표:

| 트랙 | 코드 | 이름 | 수준 | 신뢰도 |
|---|---|---|---|---|
| systems_biology | C071600 | 생물정보학 | 3 | assumed |
| semiconductor | D120100 | 반도체 | 3 | verified |
| energy | D020700 | 에너지및동력공학 | 3 | indexed |
| computer | D130000 | 컴퓨터학 | 2 | verified |
| ai | D131100 | 인공지능 | 3 | verified |
| mathematics | C020000 | 수학 | 2 | verified |
| statistics | C030000 | 통계학 | 2 | verified |
| life_science | C070000 | 생물학 | 2 | verified |
| bioengineering | D070000 | 생물공학 | 2 | verified |
| neuroscience | C070600 | 신경생물학 | 3 | indexed |
| mechanical | D020000 | 기계공학 | 2 | verified |
| electrical | D090000 | 전기공학 | 2 | verified |
| chemical | D050000 | 화학공학 | 2 | verified |
| materials | D100000 | 재료공학 | 2 | verified |
| civil | D140000 | 토목공학 | 2 | verified |
| environmental | D110000 | 환경공학 | 2 | indexed |
| sociology | B080000 | 사회학 | 2 | verified |
| economics | B030000 | 경제학 | 2 | verified |
| political | B020000 | 정치외교학 | 2 | indexed |
| public_administration | B140000 | 행정학 | 2 | verified |
| psychology | B210000 | 심리과학 | 2 | indexed |
| history | A020000 | 역사학 | 2 | verified |
| philosophy | A030000 | 철학 | 2 | verified |
| korean_literature | A110000 | 한국어와문학 | 2 | verified |
| english_literature | A150000 | 영어와문학 | 2 | verified |
| linguistics | A090000 | 언어학 | 2 | verified |

## 결과
얻는 것: 트랙마다 선택지 목록(primary의 소분류 + 보조 코드)이 정해져 Wave 5 입학 전 선택 화면이 바로 쓸 수 있음. 잃는 것: 의약학·뇌과학·인지과학 연구자는 1차 범위 밖. 다시 볼 조건: NRF 분류 개정, 또는 Wave 6에서 systems_biology·energy처럼 `assumed`/`indexed` primary의 선택지가 어색하다는 피드백.
