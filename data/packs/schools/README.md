# schools 팩

**목적.** 박사과정 20개교의 분야별 등록금·입학금·연구 지원 제도를 공식 출처로 기록한다. 어쩌다 박사 v3.5와 같은 범위다. 데이터는 실명, 화면 표시는 가상 이름(결정 기록 0004).

**1차 출처 계급.** 각 대학 등록금 공시(대학원 요람·입학 안내), 대학알리미(등록금 현황), 각 대학원 장학 규정. 약어는 [용어집](../../../docs/workflow.md#용어집).

**id 규칙.** `schools-<school_id>-<field>-<item>`. 예: `schools-snu-cs-tuition`, `schools-kaist-all-stipend-min`. `unit`은 `krw`(원) 또는 `krw-10k`(만원). 제도의 조건(선발형·보장형, 최대 학기)은 `note`에.

**가상 표시명 매핑.** UI는 이 표를 통해서만 이름을 내보낸다.

| school_id | 실명 | 표시명 |
|---|---|---|
| snu | 서울대학교 | 서월대학교 |
| kaist | KAIST | 한국과제기술원(KQIST) |
| postech | POSTECH | 포옹공과대학교(POSTASK) |
| gist | GIST | 광주과제기술원(GQIST) |
| dgist | DGIST | 대구경북과제기술원(DGQIST) |
| unist | UNIST | 울산과제기술원(UQIST) |
| yonsei | 연세대학교 | 연새대학교 |
| korea | 고려대학교 | 고래대학교 |
| skku | 성균관대학교 | 성균원대학교 |
| hanyang | 한양대학교 | 한냥대학교 |
| sogang | 서강대학교 | 서광대학교 |
| khu | 경희대학교 | 경이대학교 |
| ewha | 이화여자대학교 | 이파여자대학교 |
| cau | 중앙대학교 | 중양대학교 |
| konkuk | 건국대학교 | 건귤대학교 |
| uos | 서울시립대학교 | 서월시립대학교 |
| pusan | 부산대학교 | 부싼대학교 |
| knu | 경북대학교 | 경붓대학교 |
| jnu | 전남대학교 | 전낭대학교 |
| cnu | 충남대학교 | 충낭대학교 |

**담당 issue.** Wave 2 — #4
