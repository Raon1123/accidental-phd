# 0020. 실명 기록 삭제 때 커밋 해시 인용 처리

## 상태
제안됨 · 2026-10-15 (판정자 fable, 판정 대상 issue #113 · 결정 기록 0018 §3 · wave-06 §Wave 5 회고에서 이관 마지막 줄. 승인은 결정 기록 0010 §3 (b)대로 이 기록을 담은 PR 머지. 실행 시점과 공개 범위는 #113 본문대로 사용자가 정한다.)

## 맥락
용어: PR은 pull request(브랜치 병합 요청), `git filter-repo`는 모든 커밋의 파일 내용과 메시지를 바꿔 기록을 다시 쓰는 도구, 강제 푸시(force push)는 다시 쓴 기록으로 원격 브랜치를 덮어쓰는 것, 대응표(commit-map)는 filter-repo가 남기는 "옛 커밋 해시 → 새 커밋 해시" 두 열 표, CI는 PR마다 자동으로 도는 테스트 워크플로우(`.github/workflows/`)다.

쟁점 한 문장: #113 절차 5단계(`git filter-repo`로 실명을 지우기)는 모든 커밋 해시를 바꾸므로, wave 파일·결정 기록·보정 문서가 완료 근거와 기준점으로 인용한 커밋 해시를 다시 쓴 뒤에도 찾을 수 있게 하는 방법을 하나 정한다.

관련 규칙: 결정 기록 0016 §1과 `docs/workflow.md` §브랜치·PR 규약 70행은 "인용한 커밋 해시가 main에서 도달 가능해야 한다"는 이유로 병합 커밋(merge commit) 방식을 정했다. wave-06 체크리스트의 완료 조건은 "실행 뒤 인용 해시 전부가 main에서 도달 가능하거나 대응표에 있다"이다. 0018 §3은 선택지 (a) 대응표 커밋 + 인용 유지, (b) 인용을 PR 번호·파일 경로로 바꿈, (c) 새 저장소 이전을 들었다.

현황(2026-10-15, 브랜치 `wave-6/check-assumed` HEAD 4c2bf0a 기준, 출처 근거):
- 저장소 추적 텍스트 파일에서 커밋으로 풀리는 해시 인용은 **208곳, 고유 커밋 80개, 파일 18개**다(§COUNTS 표). 문서 16개 외에 `engine/sim/calibrate.ts` 주석 1곳과 `.github/issues/wave-4-seed.json` 3곳이 있다. 208곳 전부가 `origin/main`에서 도달 가능하고, 고유 80개 중 병합 커밋은 17개, 일반 커밋은 63개다.
- 208곳 중 같은 줄에 PR 번호가 있는 것은 114곳, 없는 것은 94곳이다.
- 고유 80개 커밋은 GitHub API(`commits/{sha}/pulls`) 기준 전부 어느 한 PR에 속한다(PR 없는 커밋 0, 두 PR에 걸친 커밋 0). 그러나 한 PR이 인용된 커밋을 여럿 담는다: PR #49에 18개, #36에 7개, #21에 6개, #20에 4개.
- 인용 중 일부는 완료 근거가 아니라 **기계가 읽는 기준점**이다: `node scripts/compare-notes.mjs d00ba5c`(wave-04 62행, 구현 계획 246행), `git diff 50cda9c..b829d57`(wave-04 64행), 보정 기준 "main 22acd0d"·"커밋 8f29487 직전의 값"(`docs/oracle/calibration-wave4.md` 4·349행, `calibration-wave6-step1.md` 9·29행, `engine/sim/calibrate.ts` 440행).
- GitHub 쪽: issue·PR 본문 145건 중 해시를 인용한 본문 7건(고유 8개), 댓글 137건 중 44건(고유 36개). #113 절차 7단계가 이 본문·댓글을 API로 고친다.
- 문서의 PR·issue 번호 참조는 213~709곳이다(`PR #N`·`issue #N` 접두사가 붙은 것만 213곳·고유 번호 59개; 0014 행 참조 `0014 #N`을 뺀 모든 `#N`이 709곳). 저장소는 공개(PUBLIC)이고 GitHub Pages는 main의 workflow로 배포된다(`raon1123.github.io/accidental-phd/`).
- 0018 §3의 "Wave 5 체크리스트만 해시 22개"는 체크 메모 16개 + 회고 추가 6개(wave-05 69행)를 센 것이다. 이 판정의 wave-05 고유 24개는 회고 절의 HEAD 해시 등을 더한 파일 전체 수치다. 두 수는 모순이 아니다.
- `data/` 안의 7~40자 16진수 15곳은 출처 URL의 글 id·게시판 파라미터이며 커밋이 아니다. 해시 인용 검사는 이 조각을 제외해야 한다.
- 이 기계에는 `git filter-repo`가 설치돼 있지 않다(`git: 'filter-repo' is not a git command`).

설계 가정(도구 문서 기준, 실행 전 `git filter-repo --help`로 확인): filter-repo는 `.git/filter-repo/commit-map`(옛 해시 → 새 해시, 40자씩 두 열)과 `ref-map`(옛 ref → 새 ref, 브랜치·태그 이름 포함)을 남긴다. 기본값으로 **커밋 메시지** 안의 옛 해시 참조를 새 해시로 바꾸지만(`--preserve-commit-hashes`를 주면 안 바꿈) **파일 내용** 안의 해시는 바꾸지 않는다. 내용이 비게 된 커밋과 불필요해진 병합 커밋은 기본값으로 쳐내며, 그 행의 새 해시는 0으로 채워진다. 새로 clone하지 않은 저장소에서는 `--force` 없이 돌지 않는다.

## 결정
**(d) 대응표 커밋 + 다시 쓴 뒤 인용 해시 치환 + PR 번호는 그대로.** 순서는 이렇다. (1) `git filter-repo`를 돌리고 commit-map을 저장소 밖에 복사한다. (2) 다시 쓴 main 위에 **보통 커밋 하나**로 두 가지를 올린다: commit-map을 `docs/history/commit-map-<실행일>.tsv`(16진수 두 열만)로 커밋하고, 추적 텍스트 파일 18개(실행 시점에 다시 센다)의 해시 인용 전부를 대응표로 새 해시로 치환한다(같은 자리, 같은 길이의 축약, 접두사가 두 커밋에 걸리면 실패). (3) `scripts/check-hash-citations.mjs`를 새로 만들어 "추적 파일의 모든 커밋 해시 인용이 main에서 도달 가능하거나 대응표 옛 열에 있다"를 검사하고 test 워크플로우에 넣는다. PR·issue 번호 인용(213~709곳)은 손대지 않는다. 같은 저장소 강제 푸시와 새 저장소 이전 중 무엇을 고르든 이 방법은 그대로 쓴다. GitHub issue·PR 본문·댓글의 해시(본문 7건, 댓글 44건)는 #113 절차 7단계에서 실명 치환과 같은 API 편집으로 함께 새 해시로 바꾼다.

대응표 치환을 filter-repo 실행 **안**에서 하지 않는 이유: 새 해시는 파일 내용에서 계산되므로, 내용에 새 해시를 써 넣으면 해시가 또 바뀐다(고정점 없음). 그래서 치환은 다시 쓴 기록 **위의** 보통 커밋으로만 가능하고, 그 커밋 자체는 아무 문서도 인용하지 않으므로 순환이 없다.

대응표 자체의 누출: commit-map은 16진수 두 열뿐이라 실명을 담지 않는다. 옛 열의 해시는 GitHub Support가 지우기 전까지 `refs/pull/N/head`와 캐시 화면으로 옛 커밋을 가리키지만, 이 노출은 (i) 다시 쓴 기록 안의 옛 wave 파일 버전이 어차피 옛 해시를 담고 있고 (ii) #113 6단계가 이미 Support 삭제 요청으로 다룬 것이라 대응표가 새로 더하는 노출이 아니다. ref-map은 브랜치 이름을 담으므로 커밋하지 않고, 실행 때 이름에 실명 해시 검사 0건만 확인한다. PR 번호는 저장소 메타데이터라 강제 푸시 뒤에도 그대로이며(외부 사실, GitHub 문서 기준), 닫힌 PR의 옛 내용 노출은 이 판정과 무관하게 #113 6단계대로 사용자가 Support에 요청한다.

## 결과
얻는 것: 실행 뒤 `git show <인용 해시>`가 조회 없이 바로 된다(0016 §1·workflow 70행의 "main에서 도달 가능" 규칙이 글자 그대로 유지된다). `compare-notes.mjs d00ba5c`·`git diff 50cda9c..b829d57`·보정 기준점처럼 기계가 읽는 인용이 그대로 실행된다. 옛 clone·댓글·외부 메모의 옛 해시는 대응표로 푼다. 검사 스크립트가 CI에서 돌아 wave-06 완료 조건을 기계가 확인한다. 공개 범위 선택(같은 저장소 / 새 저장소)과 독립이다.

잃는 것: 보통 커밋 한 번(파일 18개, 208곳 치환)과 스크립트 두 개(`rewrite-hash-citations.mjs`, `check-hash-citations.mjs`)가 더 든다. PR 번호 인용(적어도 213곳)은 PR 번호만으로 트리 상태를 못 가리키는 한계가 그대로 남는다(해시가 그 역할을 맡는다). 다시 쓰기를 한 번 더 하게 되면 대응표를 이어 붙여야 한다(옛 열이 두 세대가 된다). 치환된 문서는 작성 당시 해시와 달라져, 작성 시점의 GitHub 댓글·PR 본문과 대조할 때 대응표를 거쳐야 한다.

다시 볼 조건: (i) 실행 때 commit-map에서 인용 커밋 80개 중 새 해시가 0인 행이 나오면(빈 커밋·병합 커밋 정리) 치환 전에 멈추고 그 커밋을 `--no-ff`·`--prune-empty=never` 옵션으로 보존할지 다시 판정한다. (ii) 사용자가 (c) 새 저장소를 고르면 PR·issue 번호 참조 213~709곳의 처리(옛 저장소 참조 `Raon1123/accidental-phd#N` 꼴로 바꿀지)를 별도 판정한다. (iii) 두 번째 다시 쓰기가 필요해지면 대응표 세대 관리 규칙을 정한다.

영향 받는 레코드 id: 없음. 영향 받는 파일: `docs/workflow.md` 70행(병합 커밋 규칙에 "다시 쓴 뒤 대응표" 한 절 추가), 결정 기록 0016 §1 상태 줄, `docs/waves/wave-06-balance-retro.md` 이관 항목, 새 파일 `docs/history/commit-map-<실행일>.tsv`, `scripts/rewrite-hash-citations.mjs`, `scripts/check-hash-citations.mjs`, `.github/workflows/test.yml`.

---
### 판정 근거
- (출처) 인용 208곳 중 94곳은 같은 줄에 PR 번호가 없고, 그중 보정 기준·스크립트 인자·`git diff` 범위 같은 기계 입력이 있다(맥락 목록). PR 번호는 트리 상태를 가리키지 못하므로 (b) 단독은 이 인용을 잃는다.
- (출처) 인용 커밋 80개는 전부 PR에 속하지만 PR #49 하나가 18개를 담는다. 같은 PR 안의 두 커밋을 구분하는 인용(예: 0015 §2의 72ad355와 f6e713f 전후 비교)은 PR 번호로 바꾸면 뜻이 사라진다.
- (출처) 문서의 PR·issue 번호 참조는 적어도 213곳(최대 709곳)으로 해시 인용 208곳보다 많다. (c) 새 저장소는 208곳을 살리려고 이 번호 참조와 Pages 주소를 깨뜨리고, 옛 저장소를 공개로 남기면 실명 삭제가 무의미하며 비공개로 돌리면 번호 참조가 공개 독자에게 깨진다.
- (출처) 208곳 전부가 지금 main에서 도달 가능하다(`notmain []`). 0016 §1 규칙은 지금 작동하고 있으므로 규칙을 바꾸지 않고 유지하는 쪽이 비용이 작다. (a) 단독은 `git cat-file`이 실패하는 해시를 문서에 남겨 이 규칙을 글자 그대로는 깨뜨린다(wave-06 완료 조건의 "또는 대응표" 절로만 통과).
- (설계 가정) filter-repo가 커밋 메시지의 해시는 바꾸고 파일 내용의 해시는 바꾸지 않으므로, 파일 쪽 치환을 별도 커밋으로 해야 메시지와 문서가 같은 해시를 가리킨다.
- (출처) 대응표는 16진수만 담는다(filter-repo 출력 형식). ref-map만 브랜치 이름을 담는다.
- (출처) GitHub 본문 7건·댓글 44건의 해시는 #113 7단계의 API 편집 범위 안에 있어 같은 대응표로 함께 바꿀 수 있다.

### 반대 근거
- (a) 대응표만 커밋하고 인용을 그대로 둔다: 치환 커밋과 스크립트가 필요 없고 문서가 작성 당시 그대로 남아 댓글과 대조가 쉽다. 그러나 문서의 모든 해시 인용과 `compare-notes.mjs d00ba5c` 같은 명령이 조회 없이는 실행되지 않고, 0016 §1의 "도달 가능" 규칙을 영구히 "대응표 참조"로 약화시킨다. 한 번의 보통 커밋으로 피할 수 있는 비용이다.
- (b) PR 번호·파일 경로로 바꾼다: 번호는 강제 푸시와 무관하게 안정적이고 대응표도 필요 없다. 그러나 94곳의 기계 기준점을 표현하지 못하고, PR #49의 18개 커밋처럼 한 PR 안의 커밋 구분이 사라지며, 치환 작업량(208곳 손으로 의미 판단)이 (d)의 기계 치환보다 크다. PR 번호를 **함께** 적는 관행은 좋지만 해시를 대체하지는 못한다.
- (c) 새 저장소: 옛 PR 참조와 편집 이력이 공개에서 사라져 Support 요청이 줄고, 옛 저장소에서 해시가 그대로 풀린다. 그러나 PR·issue 번호 참조 213~709곳·Pages 주소가 전부 깨지고, 옛 저장소를 읽기 전용으로 남기면 실명이 남는다. 해시 보존 문제의 답으로는 가장 비싸다. 공개 범위 문제로서의 (c)는 사용자 판단이며, 그 경우에도 (d)는 그대로 적용된다.
- (d) 채택안: 대응표 커밋이 옛 커밋을 가리키는 공개 색인이 된다는 반론이 있다. 그러나 다시 쓴 기록 안의 옛 wave 파일 버전이 어차피 옛 해시를 담고, GitHub 댓글 44건도 그렇다. 또 치환 커밋 뒤 문서 해시가 작성 당시와 달라져 "문서가 쓰였을 때 무엇을 가리켰나"를 대응표 없이는 알 수 없다는 반론이 있다. 대응표를 저장소에 두는 이유가 그것이다. 치환 스크립트가 잘못 바꿀 위험은 "치환 수 = 인용 수, 미해결 0, 접두사 충돌 시 중단" 출력을 PR 본문에 붙이는 것으로 막는다.
- (e) 치환을 filter-repo 안에서 한 번에 한다(`--replace-text`에 대응표를 넣음): 두 번째 실행이 해시를 다시 바꿔 대응표가 어긋난다. 커밋 콜백으로 위상 순서대로 블롭을 고치는 방법은 이론상 가능하나 검증되지 않았고 실패하면 되돌리기 어렵다. 채택하지 않는다.
- (f) 인용 규칙을 아예 "해시 대신 날짜·PR 번호"로 바꾸고 옛 인용은 버린다: 가장 단순하다. 그러나 Wave 1~5 완료 근거와 보정 비교 기준을 잃고, 0016 §1을 폐기해야 한다.

### 근거 부족 시 필요한 것
- 실행 전 `git filter-repo --help`로 (i) commit-map·ref-map 경로와 형식, (ii) 커밋 메시지 해시 치환 기본값, (iii) 빈 커밋·병합 커밋 정리 기본값을 확인한다. 가정과 다르면 §STEPS의 해당 단계를 고치고 이 기록 상태 줄에 적는다.
- 실행 시점의 인용 재집계(파일·줄·해시). 이 판정의 208곳은 2026-10-15 HEAD 4c2bf0a 기준이며 Wave 6 PR이 늘릴 수 있다.
- 사용자 결정: 공개 범위(같은 저장소 강제 푸시 / 새 저장소). 이 판정은 둘 다에 적용되지만 (c)를 고르면 PR·issue 번호 참조 213~709곳의 처리를 별도로 판정한다.

## 실행 절차
전제: #113 절차 1~4단계(열린 PR 정리·다른 세션 중지, 비공개 대응표 완성, 누출 테스트 해시 방식 전환, 데이터 팩 필드 이동)가 끝나 있고, 실명 → 가상명 치환 규칙 파일은 저장소 밖에만 둔다. 모든 실행은 사용자 확인 뒤 main thread가 한다.

1. 도구 준비. `git filter-repo`를 설치한다(이 기계에 없음). `git filter-repo --help`로 commit-map·ref-map 경로, 커밋 메시지 해시 치환 기본값, 빈 커밋·병합 커밋 정리 기본값을 확인하고 결과를 #113 댓글에 적는다.
2. 실행 전 집계(저장소 안, 옛 기록). 새 스크립트 `scripts/check-hash-citations.mjs`를 먼저 커밋한다. 동작: 추적 텍스트 파일(`.md .mjs .ts .js .json .yml`)에서 7~40자 16진수 토큰을 찾아 `git cat-file -t`가 `commit`인 것만 인용으로 세고(데이터 URL 조각 제외), 각 인용이 main 조상인지 확인하며, `--map <tsv>`가 주어지면 옛 열 접두사 일치도 통과로 친다. `docs/history/commit-map-*.tsv` 자체는 검사 대상에서 뺀다(옛 열이 미해결로 잡히지 않게; 확장자 목록이 바뀌어도 유지). 출력: 파일별 (인용 수, 고유 해시 수, 도달 가능 수, 대응표로 푼 수, 미해결 수). HEAD에서 돌려 "미해결 0, 전부 도달 가능"을 확인하고 출력과 고유 해시 전체 목록(40자로 풀어서)을 저장소 밖 작업 폴더에 저장한다. 기대값(2026-10-15 기준): 208곳 / 80개 / 18파일. 늘어났으면 늘어난 수를 적는다.
3. GitHub 쪽 집계. `gh api --paginate repos/{owner}/{repo}/issues?state=all`과 `issues/comments`에서 커밋으로 풀리는 해시를 인용한 본문·댓글 목록(번호, 댓글 id, 해시)을 저장소 밖에 저장한다. 기대값: 본문 7건 / 댓글 44건. 본문·댓글 전문은 실명을 담을 수 있으므로 저장소 안에 두지 않는다.
4. 되돌림 지점. 저장소 밖 비공개 폴더에 `git clone --mirror`로 옛 기록 전체를 보관한다(실명 포함, 비공개). `git rev-parse main`, `git rev-list --count main`, `git rev-list --merges --count main`, `git for-each-ref` 목록을 같은 폴더에 적는다.
5. 다시 쓰기. 먼저 원격 브랜치 46개(`git branch -r`)를 둘로 나눠 적는다: 다시 쓸 것(main과 아직 열린 작업 브랜치)과 지울 것(머지된 작업 브랜치). filter-repo는 새 clone의 로컬 head로 있는 ref만 다시 쓰므로, 다시 쓸 브랜치는 clone 뒤 전부 로컬 브랜치로 만들어 둔다. 그 다음 새로 clone한 사본에서 `git filter-repo --replace-text <비공개 규칙 파일> --replace-message <비공개 규칙 파일>`를 돌린다. `--preserve-commit-hashes`는 주지 않는다(커밋 메시지의 해시가 새 해시로 바뀌게). 빈 커밋·병합 커밋 정리 옵션은 1단계 확인 결과에 따라 보존 쪽으로 준다.
6. 대응표 검사(푸시 전, 저장소 밖에서). `.git/filter-repo/commit-map`과 `ref-map`을 작업 폴더로 복사한 뒤: (i) `grep -vcE '^[0-9a-f]{40} [0-9a-f]{40}$' commit-map` = 0 (첫 줄 헤더가 있으면 그 줄만 예외); (ii) 2단계 고유 해시 전부가 옛 열에 있고 새 열이 0으로만 된 행이 0; (iii) 새 기록의 `git rev-list --count main`·`--merges --count`가 4단계 값과 같다(다르면 멈추고 §결과 다시 볼 조건 (i)); (iv) ref-map의 브랜치·태그 이름에 실명 해시 누출 검사 0건; (v) 새 기록 전체(`git log -p --all`과 모든 커밋 메시지)에 실명 해시 누출 검사 0건(#113 완료 조건 1).
7. 치환 커밋(다시 쓴 main 위, 보통 커밋 하나). 새 스크립트 `scripts/rewrite-hash-citations.mjs <commit-map>`: 2단계와 같은 토큰 규칙으로 인용을 찾아 옛 열에서 접두사가 정확히 한 행에 맞는 경우만 새 해시로 바꾸고, 축약 길이는 원래 길이를 유지하되 새 기록에서 `git rev-parse --short=<길이>`가 유일하지 않으면 길이를 늘린다. 접두사 충돌·미발견이 하나라도 있으면 아무 파일도 쓰지 않고 멈춘다. 치환 범위는 문서 16개 + `engine/sim/calibrate.ts` + `.github/issues/wave-4-seed.json`(실행 시점 재집계 결과 전체). 같은 커밋에 commit-map을 `docs/history/commit-map-<실행일>.tsv`로 넣고(16진수 두 열만, ref-map은 넣지 않음) `docs/history/README.md` 한 줄로 용도를 적는다. 스크립트 출력(파일별 치환 수, 미해결 0)을 PR 본문 또는 #113 댓글에 붙인다. 기대: 파일별 치환 수 = 2단계 인용 수.
8. 기계 검증(푸시 전). `node scripts/check-hash-citations.mjs --map docs/history/commit-map-<실행일>.tsv`가 "미해결 0"이고 "대응표로만 푼 수 0, 전부 main 도달 가능"이다. 이어서 `npm test`(또는 test 워크플로우와 같은 명령)와 `node scripts/check-assumed.mjs`가 exit 0이다. 이 검사 스크립트를 `.github/workflows/test.yml`에 넣는다(wave-06 이관 항목 완료 조건).
9. 푸시(사용자 확인 뒤). filter-repo는 `origin` 원격을 지우므로 다시 추가한다. 브랜치 보호가 있으면 잠시 푼다. `git push --force --all`과 `--tags`로 5단계의 "다시 쓸 것" ref를 덮어쓰고, "지울 것" 원격 브랜치는 `git push origin --delete`로 지운다. Pages workflow가 main에서 다시 배포되는지 확인한다.
9a. 원격 ref 검사(#113 완료 조건 1을 원격에서 확인). `git ls-remote origin`의 모든 ref 해시가 commit-map 새 열에 있거나 7단계 치환 커밋(또는 그 뒤 커밋)이고, 옛 열의 해시와 같은 ref가 0개다. 실패한 ref는 지우거나 다시 쓴 clone에서 다시 푸시한다. 브랜치로 도달 가능한 옛 커밋이 하나라도 남으면 보통 clone에 실명이 그대로 들어오므로 이 검사가 0이 되기 전에는 10단계로 가지 않는다. 그 뒤 새 clone을 받아 실명 해시 누출 검사를 한 번 더 돌린다(0건).
10. GitHub 본문·댓글(#113 7단계). 3단계 목록의 본문 7건·댓글 44건을 실명 치환과 같은 API 편집(`gh api -X PATCH`)으로 새 해시로 바꾼다. PR 번호는 바꾸지 않는다. 편집 이력에 남는 옛 내용 목록을 #113 댓글에 적고, 사용자가 GitHub Support에 옛 커밋·캐시·편집 이력 삭제를 요청한다(#113 6단계).
11. 로컬 정리(#113 8단계). 모든 worktree와 다른 세션의 clone을 지우고 새로 clone한다. 옛 clone에서 푸시하면 옛 해시가 되살아나므로 4단계 mirror만 비공개로 남기고 나머지는 지운다.
12. 사후 반영. `docs/workflow.md` 70행에 "기록을 다시 쓴 뒤에는 치환 커밋과 `docs/history/commit-map-*.tsv`로 도달 가능성을 유지한다"를 더하고, 0016 §1 상태 줄에 이 기록 번호를 적고, wave-06 이관 항목을 `[x]`로 바꾸며, #113을 완료 조건 3개(파일·메시지 누출 0, 본문·댓글 실명 0, CI 해시 검사)와 8단계 출력으로 닫는다.

## 집계 (2026-10-15)
집계 기준: 2026-10-15, 브랜치 `wave-6/check-assumed` HEAD 4c2bf0a, `git ls-files`의 `.md .mjs .ts .js .json .yml .yaml .txt`. 토큰 규칙: 앞뒤가 영숫자·`_`·`.`·`/`·`-`가 아닌 7~40자 16진수이고 a~f를 하나 이상 포함. "커밋"은 `git cat-file -t`가 commit인 것, "main"은 `origin/main`의 조상, "PR 같은 줄"은 같은 줄에 `#숫자`가 있는 경우.

| 파일 | 인용(곳) | 고유 해시 | PR 같은 줄(곳) | 병합 커밋 인용(곳) |
|---|---|---|---|---|
| docs/waves/wave-03-engine-spec.md | 39 | 7 | 14 | 2 |
| docs/waves/wave-04-engine-impl.md | 38 | 22 | 32 | 1 |
| docs/waves/wave-05-ui-narrative.md | 35 | 24 | 29 | 6 |
| docs/waves/wave-02-statistics-packs.md | 33 | 23 | 18 | 21 |
| docs/design/decisions/0016-wave4-retro-rules.md | 16 | 15 | 0 | 0 |
| docs/waves/wave-01-taxonomy-sources.md | 11 | 5 | 5 | 0 |
| docs/design/decisions/0015-wave3-retro-rules.md | 8 | 5 | 4 | 0 |
| docs/design/decisions/0018-wave5-retro-rules.md | 5 | 5 | 5 | 1 |
| docs/superpowers/plans/2026-10-13-wave-4-engine-impl.md | 5 | 4 | 0 | 0 |
| docs/waves/wave-00-planning.md | 3 | 2 | 1 | 0 |
| docs/superpowers/specs/2026-10-14-wave4-divergence-audit.md | 3 | 1 | 1 | 3 |
| .github/issues/wave-4-seed.json | 3 | 3 | 3 | 0 |
| docs/oracle/calibration-wave4.md | 2 | 1 | 0 | 0 |
| docs/oracle/calibration-wave6-step1.md | 2 | 2 | 0 | 0 |
| docs/waves/wave-06-balance-retro.md | 2 | 2 | 1 | 1 |
| docs/waves/STATUS.md | 1 | 1 | 1 | 1 |
| docs/superpowers/specs/2026-10-13-wave3-evidence-index.md | 1 | 1 | 0 | 1 |
| engine/sim/calibrate.ts | 1 | 1 | 0 | 0 |
| **합계** | **208** | **80 (파일 간 중복 제거)** | **114** | **37곳 (고유 커밋 17)** |

- 208곳 전부 `origin/main`에서 도달 가능(미도달 0). 고유 80개 = 병합 커밋 17 + 일반 커밋 63.
- 고유 80개 전부 GitHub API상 PR 하나에 속함(PR 없는 커밋 0). 한 PR에 인용 커밋 여럿: #49 18개, #36 7개, #21 6개, #20 4개, #64 3개, #74·#63·#35·#33·#32·#30·#27 각 2개.
- `data/` 안의 16진수 15곳(`packs/narratives/humanities-social/records.json` 7, `packs/schools/records.json` 3, `sources/registry.json` 2, `sources/registry.d/81-hs-news.json` 2, `sources/registry.d/79-wages.json` 1)은 출처 URL의 글 id·게시판 파라미터이며 커밋이 아니다. 제외.
- GitHub: issue·PR 본문 145건 중 해시 인용 7건(issue 2, PR 5, 고유 해시 8), 댓글 137건 중 44건(고유 해시 36).
- 문서의 PR·issue 번호 참조: `PR #N`·`issue #N` 접두사가 붙은 것 213곳(고유 번호 59개); 0014 행 참조(`0014 #N`)를 뺀 모든 `#N` 709곳. (모든 `#N`은 1,099곳·고유 132개이나 0014 행 번호와 PR 번호 범위가 겹쳐 크기로는 못 나눈다.)
- 이 기록이 인용한 4c2bf0a(브랜치 `wave-6/check-assumed` HEAD)는 이 브랜치의 PR이 머지되기 전까지 main에서 도달 불가로 검사에 잡힌다. 머지 뒤 해소된다.
- 0018 §3의 "Wave 5 해시 22개"는 체크 메모 16 + 회고 추가 6(wave-05 69행)이고, 위 표의 wave-05 고유 24개는 회고 절의 HEAD 해시 등을 더한 파일 전체 수치다.
