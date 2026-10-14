// 웹 진입점. 데이터(data.json)를 받아 DataBundle 을 만들고, 분야 선택·지금 삶(진행 화면)·기록 보관 화면을 그린다.
// 진행 로직(한 칸, 자동 모드, 결정 지점, 연구노트, 인생 지도)은 play.ts, 동기·분기는 cohort.ts 에 있고, 여기는 DOM 과 타이머만 다룬다.
import { bundleFromWebData, createLife, decide, newSeed, type DataBundle, type Focus, type LifeState, type WebDataFile, type WebSource } from '../../engine/src/browser';
import { loadLife, readArchive, saveLife, type KeyValueStore } from './archive';
import { branchPoints, catchUp, cohortRows, compareRows, createCohort, fill, openBranch, runUntilHalt, sharedPrefix } from './cohort';
import { FOCUSES, SPEEDS, autoRuleText, decisionView, halted, intervalMs, ledgerRows, lifeMap, moneyView, notes, setAuto, step, wonText, type Speed } from './play';
import { lifeConfig, trackGroups } from './select';
import { confidenceOf, footerLines, moneyRows, stipendGuarantee } from './sources';
import { ko as t } from './strings.ko';
import { detailRows, glanceRows, statBars } from './view';

const store: KeyValueStore = window.localStorage;
let data: DataBundle | undefined;
let sources: Record<string, WebSource> = {};
let shownIds: string[] = [];   // 지금 화면에 보인 값의 근거 id(출처 footer 가 읽는다)
let life: LifeState | undefined;
let cohort: LifeState[] = [];
let branched: LifeState | undefined;   // "다른 선택 보기"로 연 분기
let branchedFrom: { month: number; chosen: string } | undefined;
let running = false;
let speed: Speed = 1;
let statMark: { seed: string; stats: LifeState['stats'] } | undefined;   // 직전에 그린 능력치(차분 계산용)
let statPrev: LifeState['stats'] | undefined;                            // 능력치가 마지막으로 바뀌기 전 값
let focus: Focus | undefined;   // undefined = 지금 포커스 유지
let timer: ReturnType<typeof setTimeout> | undefined;

function el<K extends keyof HTMLElementTagNameMap>(tag: K, text?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (text !== undefined) e.textContent = text;
  if (tag === 'h2' || tag === 'h3') e.tabIndex = -1;   // 스크립트가 포커스를 옮길 수 있게(Tab 순서에는 넣지 않는다)
  return e;
}

/** `key`(data-k)는 다시 그린 뒤 키보드 포커스를 같은 조작으로 되돌릴 때 쓴다(#61). 없으면 글자. */
function button(text: string, onClick: () => void, disabled = false, key = text): HTMLButtonElement {
  const b = el('button', text);
  b.type = 'button';
  b.disabled = disabled;
  b.dataset.k = key;
  b.addEventListener('click', onClick);
  return b;
}

/** 눌린 상태를 보조기기에도 알린다. 같은 묶음 안에서 하나만 눌려 있다. */
function pressed(b: HTMLButtonElement, on: boolean): HTMLButtonElement {
  b.setAttribute('aria-pressed', String(on));
  return b;
}

// ── 타이머: 한 칸 진행 뒤 멈출 일이 없을 때만 다시 건다 ──
function stop(): void {
  running = false;
  if (timer !== undefined) clearTimeout(timer);
  timer = undefined;
}

function tick(): void {
  if (!life || !data || !running) return;
  life = step(life, data, focus);
  if (halted(life)) stop();
  render();
  if (running) timer = setTimeout(tick, intervalMs(speed));
}

function run(): void {
  if (!life || halted(life)) return;
  running = true;
  timer = setTimeout(tick, intervalMs(speed));
  render();
}

// ── 화면 조각 ──
function renderControls(root: HTMLElement, s: LifeState): void {
  const bar = el('div');
  bar.className = 'controls';
  bar.append(
    running ? button(t.play.pause, () => { stop(); render(); }, false, 'run') : button(t.play.run, run, halted(s), 'run'),
    button(t.play.stepOnce, () => { if (life && data) { life = step(life, data, focus); render(); } }, running || halted(s)),
  );
  const sp = el('fieldset');
  sp.append(el('legend', t.play.speed));
  for (const v of SPEEDS) sp.append(pressed(button(`${v}×`, () => { speed = v; render(); }, false, `speed:${v}`), speed === v));

  const au = el('label');
  const cb = el('input');
  cb.dataset.k = 'auto';
  cb.type = 'checkbox';
  cb.checked = s.auto;
  cb.addEventListener('change', () => { if (life && data) { life = setAuto(life, data, cb.checked); render(); } });
  au.append(cb, ` ${t.play.auto}`);
  bar.append(sp, au);
  root.append(bar, el('p', autoRuleText(t)));

  if (s.stage === 'phd' && s.phd) {
    const fl = el('fieldset');
    fl.append(el('legend', t.play.focus));
    fl.append(pressed(button(`${t.play.focusKeep} (${t.play.focusNames[s.phd.focus]})`, () => { focus = undefined; render(); }, false, 'focus:keep'), focus === undefined));
    for (const f of FOCUSES) {
      fl.append(pressed(button(t.play.focusNames[f], () => { focus = f; render(); }, f === 'thesis' && !s.phd.qualified, `focus:${f}`), focus === f));
    }
    root.append(fl);
  }
}

function renderDecision(root: HTMLElement, s: LifeState, onChoose: (index: number) => void, note?: string): void {
  if (!s.pending || !data) return;
  const v = decisionView(s, data, t);
  const box = el('section');
  box.className = 'decision';
  box.setAttribute('role', 'group');
  box.append(el('h3', t.play.decision), el('p', v.prompt));
  const ol = el('ul');
  for (const o of v.options) {
    const li = el('li');
    li.append(button(`${o.key}. ${o.label}`, () => onChoose(o.index), o.unavailable !== undefined));
    if (o.hint) li.append(el('span', ` ${o.hint}`));
    if (o.unavailable) li.append(el('span', ` ${o.unavailable}`));
    ol.append(li);
  }
  box.append(ol);
  if (note) box.append(el('p', note));
  root.append(box);
}

function renderMap(root: HTMLElement, s: LifeState): void {
  const m = lifeMap(s);
  root.append(el('h3', t.play.map));
  const row = (label: string, n: number, cls: string) => {
    const p = el('p', `${label}: ${n}`);
    const cells = el('div');
    cells.className = `map ${cls}`;
    cells.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < n; i++) cells.append(el('span'));
    root.append(p, cells);
  };
  row(t.play.mapPhd, m.phdMonths, 'map-phd');
  if (s.career) row(t.play.mapCareer, m.careerYears, 'map-career');
}

function renderNotes(root: HTMLElement, s: LifeState): void {
  root.append(el('h3', t.play.notes));
  const list = notes(s, t);
  if (list.length === 0) { root.append(el('p', t.play.notesEmpty)); return; }
  const ol = el('ol');
  ol.className = 'notes';
  ol.tabIndex = 0;   // 스크롤 영역을 키보드로 내릴 수 있게
  ol.setAttribute('aria-label', t.play.notes);
  for (const n of list) {
    const li = el('li', `${n.month}${t.play.monthSuffix} · ${n.text}`);
    if (n.creative) li.append(el('span', ` [${t.play.creative}]`));
    ol.append(li);
  }
  root.append(ol);
  if (s.log.some(e => e.textKey.startsWith('news.'))) root.append(el('p', t.news.disclaimer));
}

/** 수입은 `+`, 지출은 `−`. 0 이면 부호를 붙이지 않는다. */
function signedWon(amount: number, sign: 1 | -1): string {
  if (amount === 0) return wonText(0, t);
  return `${sign === 1 ? '+' : '−'}${wonText(amount, t)}`;
}

/** 능력치: 숫자 옆에 막대. 직전 변화는 연한 색 구간과 ▲▼ 숫자로 함께 보인다(색만으로 뜻을 전하지 않는다, #89). */
function renderStatBars(): HTMLElement {
  const box = el('div');
  box.className = 'stats';
  if (!life) return box;
  for (const b of statBars(life, statPrev, t)) {
    const row = el('div');
    row.className = 'stat';
    const name = el('span', b.label);
    name.className = 'stat-name';
    const num = el('span', String(b.value));
    num.className = 'stat-num';
    const dl = el('span', b.delta === 0 ? '' : `${b.delta > 0 ? '▲' : '▼'}${Math.abs(b.delta)}`);
    dl.className = 'stat-delta';
    const bar = el('span');
    bar.className = 'bar';
    bar.setAttribute('role', 'meter');
    bar.setAttribute('aria-valuemin', '0');
    bar.setAttribute('aria-valuemax', '100');
    bar.setAttribute('aria-valuenow', String(b.value));
    bar.setAttribute('aria-label', `${b.label} ${b.value}`);
    const fill = el('span');
    fill.className = 'bar-fill';
    fill.style.width = `${b.base}%`;
    const chg = el('span');
    chg.className = 'bar-delta';
    chg.style.width = `${b.changed}%`;
    bar.append(fill, chg);
    row.append(name, num, dl, bar);
    box.append(row);
  }
  return box;
}

function renderMoneyCard(root: HTMLElement): void {
  root.replaceChildren();
  if (!life || !data) return;
  const M = t.play.money;
  root.setAttribute('aria-label', M.heading);
  const v = moneyView(life, data);
  const glance = el('dl');
  glance.className = 'glance';
  for (const [k, val] of glanceRows(life, t, data)) glance.append(el('dt', k), el('dd', val));
  root.append(glance, renderStatBars());
  root.append(el('h2', M.heading));
  const dl = el('dl');
  const row = (k: string, val: string): void => { dl.append(el('dt', k), el('dd', val)); };
  row(M.cash, wonText(v.cash, t));
  row(M.debt, `${wonText(v.debt, t)} / ${M.loanLimit} ${wonText(v.loanLimit, t)}`);
  if (v.crisisMonths > 0) row(M.crisis, M.crisisMonths.replace('{n}', String(v.crisisMonths)));
  root.append(dl);
  if (!v.flow) { root.append(el('p', M.noPhd)); return; }
  const f = v.flow;
  root.append(el('h3', M.next));
  const fl = el('dl');
  const frow = (k: string, val: string): void => { fl.append(el('dt', k), el('dd', val)); };
  frow(M.funding, t.play.fundingNames[f.funding]);
  frow(M.until, f.fundingUntil < 0 ? M.untilNone : M.untilMonth.replace('{n}', String(f.fundingUntil)));
  frow(M.stipend, signedWon(f.stipend, 1));
  const ids = life.phd?.fundingState.recordIds ?? [];
  const basis = stipendGuarantee(ids);
  if (basis) {   // 스타이펜드 최소 보장 레코드가 근거일 때: 포함·최소 보장·기관/국가·출처 확인 등급을 값 옆에 적는다(#99)
    const dd = fl.lastElementChild!;
    const grade = ids.filter(id => stipendGuarantee([id])).map(id => confidenceOf(id, data!));
    const checked = grade.every(g => g === 'verified') ? M.stipendChecked : t.sources.marks[grade.includes('assumed') ? 'assumed' : 'indexed'];
    const note = el('span', ` ${M.stipendIncluded} · ${M.stipendBasis[basis]} · ${checked}`);
    note.className = 'mark';
    dd.append(note);
  }
  frow(M.family, signedWon(f.family, 1));
  frow(M.living, signedWon(f.living, -1));
  frow(M.netMonthly, wonText(f.net, t));
  frow(M.tuition, signedWon(f.tuition, -1));
  frow(M.netWithTuition, wonText(f.netWithTuition, t));
  frow(M.duty, `${f.dutyHours} ${M.dutyUnit}`);
  root.append(fl);
  // 근거가 있는 값(월 지원, 최근 등록금, 입학금)은 확인 등급 표지와 함께 한 번 더 보이고, 출처 footer 에 올린다(#60).
  const ev = moneyRows(life, data, t).filter(r => r.ids.length > 0);
  if (ev.length > 0) {
    root.append(el('h3', t.sources.moneyHeading));
    const edl = el('dl');
    for (const r of ev) {
      const dd = el('dd', r.value);
      if (r.mark) { const m = el('span', ` [${r.mark}]`); m.className = 'mark'; dd.append(m); }
      edl.append(el('dt', r.label), dd);
      shownIds.push(...r.ids);
    }
    root.append(edl);
  }
  const rows = ledgerRows(life);
  const det = el('details');
  det.append(el('summary', M.ledgerHeading));
  if (rows.length === 0) det.append(el('p', M.ledgerEmpty));
  else {
    const tbl = el('table');
    const cols = M.cols;
    const keys = ['month', 'stipend', 'family', 'work', 'living', 'tuition', 'interest', 'loan'] as const;
    const head = el('tr');
    for (const k of keys) head.append(el('th', cols[k]));
    tbl.append(head);
    for (const r of rows) {
      const tr = el('tr');
      for (const k of keys) tr.append(el('td', k === 'month' ? String(r.month) : wonText(r[k], t)));
      tbl.append(tr);
    }
    det.append(tbl);
  }
  root.append(det);
}

function renderCurrent(root: HTMLElement): void {
  root.replaceChildren(el('h2', t.currentHeading));
  if (!life) { root.append(el('p', t.noLife)); return; }
  const dl = el('dl');
  for (const [k, v] of detailRows(life, t, data)) dl.append(el('dt', k), el('dd', v));
  root.append(dl);
  if (life.stage === 'end') root.append(el('p', t.play.ended));
  renderControls(root, life);
  renderDecision(root, life, i => { if (life && data) { life = decide(life, data, i); render(); } });
  root.append(button(t.saveNow, () => { if (life) { saveLife(store, life.seed, life); render(); } }));
  renderMap(root, life);
  renderNotes(root, life);
}

/** 저장 시각(ISO, UTC)을 보는 사람의 지역 시각 `YYYY-MM-DD HH:MM` 으로. */
function localTime(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function renderArchive(root: HTMLElement): void {
  root.replaceChildren(el('h2', t.archiveHeading));
  const entries = readArchive(store);
  if (entries.length === 0) { root.append(el('p', t.archiveEmpty)); return; }
  const ul = el('ul');
  for (const e of entries) {
    const li = el('li', `${e.id} · ${t.savedAt} ${localTime(e.savedAt)} `);
    li.append(button(t.open, () => { stop(); focus = undefined; life = loadLife(store, e.id); resetSide(); collapseSelect(); render(); focusCurrent(); }, false, `open:${e.id}`));
    ul.append(li);
  }
  root.append(ul);
}

function renderCohort(root: HTMLElement): void {
  root.replaceChildren(el('h2', t.cohort.heading), el('p', t.cohort.help));
  if (!life || !data) { root.append(el('p', t.noLife)); return; }
  cohort = catchUp(cohort, life.month, data);
  const table = el('table');
  const head = el('tr');
  for (const h of [t.cohort.name.replace(' {k}', ''), t.cohort.who, t.stage, t.cohort.end]) head.append(el('th', h));
  table.append(head);
  for (const r of cohortRows(cohort, t, data)) {
    const tr = el('tr');
    for (const v of [r.name, r.who, r.stage, r.end]) tr.append(el('td', v));
    table.append(tr);
  }
  root.append(table);
}

function renderBranch(root: HTMLElement): void {
  root.replaceChildren(el('h2', t.cohort.branchHeading), el('p', t.cohort.branchHelp));
  if (!life || !data) return;
  const points = branchPoints(life);
  if (points.length === 0) root.append(el('p', t.cohort.branchNone));
  const ul = el('ul');
  for (const p of points) {
    const label = `${fill(t.cohort.branchAt, { month: p.month })}: ${t.play.prompts[p.prompt as keyof typeof t.play.prompts]}`;
    const li = el('li');
    li.append(button(label, () => { if (life && data) { stop(); branched = openBranch(life, data, p.dp, p.month); branchedFrom = p; render(); } }, running));
    ul.append(li);
  }
  root.append(ul);
  if (!branched || !branchedFrom) return;
  const b = branched;
  renderDecision(root, b, i => { if (branched && data) { branched = decide(branched, data, i); render(); } }, fill(t.cohort.branchChosen, { key: branchedFrom.chosen }));
  const bar = el('div');
  bar.className = 'controls';
  bar.append(
    button(t.cohort.branchStep, () => { if (branched && data) { branched = step(branched, data); render(); } }, halted(b)),
    button(t.cohort.branchRun, () => { if (branched && data) { branched = runUntilHalt(branched, data); render(); } }, halted(b), 'run'),
    button(t.cohort.branchClose, () => { branched = undefined; branchedFrom = undefined; render(); }),
  );
  root.append(bar);
  const table = el('table');
  const head = el('tr');
  for (const h of ['', t.cohort.original, t.cohort.branched]) head.append(el('th', h));
  table.append(head);
  for (const row of compareRows(life, b, t)) {
    const tr = el('tr');
    for (const v of row) tr.append(el('td', v));
    table.append(tr);
  }
  root.append(table, el('p', fill(t.cohort.shared, { n: sharedPrefix(life, b) })));
}

function renderSources(root: HTMLElement): void {
  root.replaceChildren(el('h2', t.sources.heading), el('p', t.sources.help));
  if (!data || shownIds.length === 0) { root.append(el('p', t.sources.none)); return; }
  const ul = el('ul');
  for (const line of footerLines(shownIds, data, sources, t)) ul.append(el('li', line));
  root.append(ul);
}

/** 지금 삶 제목으로 포커스를 옮긴다(새 삶·불러오기 뒤 키보드 사용자가 내용을 이어 읽도록). */
function focusCurrent(): void {
  const h = document.querySelector<HTMLElement>('#current h2');
  h?.scrollIntoView();
  h?.focus();
}

let lastPending = '';   // 직전에 그린 결정 지점(새로 걸리면 그 상자로 포커스를 옮긴다)

function render(): void {
  // 다시 그리면 DOM 이 바뀌므로, 포커스가 있던 조작(data-k)을 기억했다가 되돌린다(#61 키보드 조작).
  const active = document.activeElement as HTMLElement | null;
  const focusKey = active?.dataset.k;
  const focusIn = active?.closest('section[id]')?.id;
  renderInner();
  const pendingKey = life?.pending ? `${life.pending.dp}:${life.pending.month}` : '';
  if (pendingKey && pendingKey !== lastPending) {
    document.querySelector<HTMLElement>('#current .decision h3')?.focus();
  } else if (focusKey !== undefined && focusIn) {
    const same = document.querySelector<HTMLElement>(`#${focusIn} [data-k="${CSS.escape(focusKey)}"]`);
    if (same && !(same as HTMLButtonElement).disabled) same.focus();
    else (document.querySelector<HTMLElement>(`#${focusIn} [data-k="run"]`) ?? document.querySelector<HTMLElement>(`#${focusIn} h2`))?.focus();
  }
  lastPending = pendingKey;
}

function trackStatChange(): void {
  if (!life) { statMark = undefined; statPrev = undefined; return; }
  const cur = life.stats;
  const m = statMark;
  if (!m || m.seed !== life.seed) statPrev = undefined;
  else if ((Object.keys(cur) as (keyof LifeState['stats'])[]).some(k => cur[k] !== m.stats[k])) statPrev = m.stats;
  statMark = { seed: life.seed, stats: cur };
}

function renderInner(): void {
  shownIds = [];
  trackStatChange();
  renderMoneyCard(document.getElementById('money')!);
  renderCurrent(document.getElementById('current')!);
  renderCohort(document.getElementById('cohort')!);
  renderBranch(document.getElementById('branch')!);
  renderArchive(document.getElementById('archive')!);
  renderSources(document.getElementById('sources')!);
}

/** 새 삶이나 불러온 삶: 동기를 다시 만들고 열린 분기를 닫는다. */
function resetSide(): void {
  statMark = undefined;
  statPrev = undefined;
  cohort = life && data ? createCohort(life, data) : [];
  branched = undefined;
  branchedFrom = undefined;
}

function startLife(track: string | null): void {
  if (!data) return;
  stop();
  focus = undefined;
  life = createLife(lifeConfig(track), newSeed(`${Date.now()}-${Math.random()}`), data);
  resetSide();
  collapseSelect();
  render();
  focusCurrent();
}

/** 삶을 고른 뒤에는 분야 선택을 접는다(요약 줄을 누르면 다시 펼쳐 새 삶을 시작할 수 있다). */
function collapseSelect(): void {
  const d = document.querySelector<HTMLDetailsElement>('#select details');
  if (d) d.open = false;
}

function renderSelect(root: HTMLElement): void {
  const det = el('details');
  det.open = true;
  const sum = el('summary');
  sum.append(el('h2', t.selectHeading));
  det.append(sum, el('p', t.selectHelp));
  for (const g of trackGroups(t)) {
    const fs = el('fieldset');
    fs.append(el('legend', g.label));
    for (const tr of g.tracks) fs.append(button(tr.label, () => startLife(tr.track)));
    det.append(fs);
  }
  det.append(button(t.trackAllLuck, () => startLife(null)));
  root.replaceChildren(det);
}

async function start(): Promise<void> {
  const status = document.getElementById('status')!;
  status.textContent = t.loading;
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}data.json`);
    const json = (await res.json()) as WebDataFile;
    data = bundleFromWebData(json);
    sources = json.sources ?? {};
    status.textContent = '';
  } catch {
    status.textContent = t.loadFailed;
    return;
  }
  renderSelect(document.getElementById('select')!);
  render();
}

document.title = t.title;
document.getElementById('title')!.textContent = t.title;
document.getElementById('skip')!.textContent = t.skipToMain;
document.getElementById('notice')!.textContent = t.creativeNotice;
void start();
