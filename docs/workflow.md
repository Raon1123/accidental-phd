# 협업 계약

이 프로젝트의 상태는 repo 파일과 GitHub issue에만 둔다. 채팅 세션, 개인 메모, 대화 기억에만 있는 정보는 없는 것으로 친다. 어떤 agent(Claude, ChatGPT)나 사람이 작업을 멈춰도 다음 사람은 `docs/waves/STATUS.md`, 해당 issue, 해당 wave 파일만 읽고 이어갈 수 있어야 한다.

근거 문서: [설계 스펙](superpowers/specs/2026-10-13-accidental-phd-planning-design.md) · [Wave 0 계획](superpowers/plans/2026-10-13-wave-0-planning.md)

## 역할과 모델

| 역할 | Claude | ChatGPT | 기본 effort |
|---|---|---|---|
| 판정·스펙 감사·모호한 결정 재판정 | fable | Astra | high |
| 엮기·회고·결정 기록 작성 | opus | Sol | medium~high |
| 출처 독해·통계 추출 초안 | sonnet | Sol (ChatGPT 대응 확인 필요, issue 참조) | medium |
| 스키마 검증·일괄 정형화 | haiku | Luna | low |

Claude에서 하위 agent를 띄울 때는 항상 literal `model:`을 넘긴다. 생략하면 세션 모델을 상속해 비용이 최상급이 된다. wave 파일의 모델·effort 표가 이 표보다 우선한다.

## 라벨

| 라벨 | 뜻 | 누가 붙이나 |
|---|---|---|
| `wave/0` … `wave/6` | 어느 wave의 작업인가 | issue 작성자 |
| `area/taxonomy` `area/schools` `area/departments` `area/venues` `area/salaries` `area/statistics` `area/narratives` `area/engine` `area/ui` `area/workflow` `area/docs` | 어느 영역인가 | issue 작성자 |
| `claimed` | 누군가 진행 중 | claim한 사람 |
| `blocked` | 외부 요인으로 막힘. 댓글에 이유 | 막힌 사람 |
| `needs-judge` | 모호한 판정. fable/Astra가 재판정 | 누구나 |
| `stale` | 7일 무활동. 재claim 가능 | 누구나 |
| `chatgpt-ready` | 프롬프트 파일만으로 ChatGPT가 수행 가능 | issue 작성자 |

라벨 생성·갱신: `bash scripts/setup-labels.sh` (멱등).

## claim 규약

1. issue에 자신을 assignee로 지정하고 `claimed` 라벨을 붙인다.
2. 댓글을 남긴다: `claimed by <이름 또는 agent> on <YYYY-MM-DD>`.
3. 7일 동안 댓글·커밋이 없으면 누구나 `claimed`를 떼고 `stale`을 붙일 수 있다. `stale`인 issue는 누구나 다시 claim한다.
4. 세션을 끝낼 때는 아래 handoff 댓글을 반드시 남긴다. handoff 댓글이 있으면 7일 규칙을 14일로 늘린다.

## handoff 댓글 형식

```
### Handoff <YYYY-MM-DD>
- 한 일:
- 남은 일:
- 막힌 것:
- 다음 사람이 처음 읽을 파일:
- 브랜치/worktree:
```

## 통계 수집 규약

issue 1건 = 세션 1개 = worktree 1개 = PR 1개.

```bash
# 저장소 루트에서
git worktree add ../aphd-stats-<topic> -b stats/<topic>
cd ../aphd-stats-<topic>
# 수집 → data/sources/registry.json, data/packs/<pack>/records.json 편집
npm run validate && npm test
git push -u origin stats/<topic>
gh pr create --fill
```

PR은 `validate-data`와 `test` 워크플로우를 통과해야 한다. 수치 레코드 규칙은 [data/packs](../data/packs/) 각 README와 [스키마](../data/schema/)를 따른다. 서사(narratives) 팩은 원문을 저장하지 않는다.

## 브랜치·PR 규약

- 브랜치 이름: `wave-N/<slug>`, `stats/<topic>`, `adr/<slug>`.
- PR 본문은 `.github/pull_request_template.md`를 채운다. 연결 issue를 `Closes #N`으로 적는다.
- 머지는 squash. 머지 후 `docs/waves/STATUS.md`를 같은 PR에서 갱신했는지 확인한다.

## needs-judge

출처가 서로 다르거나, 분류 매핑이 1:N이거나, 확률 근거가 없는 항목은 `needs-judge`를 붙이고 멈춘다. fable(Astra)이 [judge 프롬프트](prompts/judge-any.md)로 재판정하고 결과를 `docs/design/decisions/`에 결정 기록으로 남긴다. 판정 전까지는 `confidence: assumed`로 두고 진행할 수 있다.

## ChatGPT 협업

ChatGPT는 `gh`와 git에 접근하지 못한다. [프롬프트 세트](prompts/README.md)의 파일 하나를 통째로 붙여넣고 맥락 블록을 채우면, 출력은 issue 댓글이나 PR에 사람이 붙여넣을 수 있는 markdown·JSON으로 나온다. `chatgpt-ready` 라벨이 붙은 issue가 대상이다.

## 용어집

독립 단위(issue 본문, 프롬프트 파일, 팩 README)에서 약어는 첫 등장에 풀어쓰거나 이 절을 링크한다.

| 약어 | 뜻 |
|---|---|
| NRF | 한국연구재단(National Research Foundation of Korea). 학술연구분야분류와 KCI 운영 |
| KEDI | 한국교육개발원. 교육통계(학과 분류, 교원·학생 통계) |
| KRIVET | 한국직업능력연구원. 국내 신규 박사학위 취득자 조사 |
| KISTEP | 한국과학기술기획평가원. 이공계인력 지표집 |
| KCI | 한국학술지인용색인(Korea Citation Index). 국내 학술지 등재 여부 |
| SJR | Scimago Journal Rank. 공개 저널 지표, 사분위 Q1~Q4 |
| CORE | Computing Research and Education Association of Australasia. 학회 등급 A*/A/B/C |
| JCR | Journal Citation Reports(Clarivate). 유료, 이 프로젝트는 쓰지 않음(결정 기록 0003) |
| BK21 | 두뇌한국21(Brain Korea 21). 교육부 대학원 지원 사업, 연구장려금 하한의 출처 |
| ALIO | 공공기관 경영정보 공개시스템. 출연연 보수 공시 |
| ADR | 결정 기록(architecture decision record). `docs/design/decisions/` |
| CI | 지속적 통합(continuous integration). GitHub Actions 워크플로우 |
| TDD | 테스트 주도 개발(test-driven development). 실패하는 테스트 → 구현 → 통과 |
| i18n | 국제화(internationalization). 문자열을 코드와 분리해 다국어 지원 |
| PR | pull request. 브랜치 병합 요청 |

## effort 조절

기본값은 위 역할 표다. wave마다 난이도가 다르므로 각 wave 파일의 모델·effort 표에서 덮어쓴다. 프롬프트 파일 머리의 `effort:` 줄도 wave 파일이 우선한다. 올리는 기준: 판정이 필요하거나 출처가 충돌할 때. 내리는 기준: 정형화·검증·반복 작업.
