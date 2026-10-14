// 웹 진입점. 데이터(data.json)를 받아 DataBundle 을 만들고, 분야 선택·지금 삶(진행 화면)·기록 보관 화면을 그린다.
// 진행 로직(한 칸, 자동 모드, 결정 지점, 연구노트, 인생 지도)은 play.ts, 동기·분기는 cohort.ts 에 있고, 여기는 DOM 과 타이머만 다룬다.
import { bundleFromWebData, createLife, decide, newSeed, type DataBundle, type Focus, type LifeState, type WebDataFile, type WebSource } from '../../engine/src/browser';
import { loadLife, readArchive, saveLife, type KeyValueStore } from './archive';
import { branchPoints, catchUp, cohortRows, compareRows, createCohort, fill, openBranch, runUntilHalt, sharedPrefix } from './cohort';
import { FOCUSES, SPEEDS, autoRuleText, decisionView, halted, intervalMs, lifeMap, notes, setAuto, step, type Speed } from './play';
import { lifeConfig, trackGroups } from './select';
import { footerLines, moneyRows } from './sources';
import { ko as t } from './strings.ko';
import { summaryRows } from './view';

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
  const sp = el('label', `${t.play.speed} `);
  const sel = el('select');
  sel.dataset.k = 'speed';
  for (const v of SPEEDS) {
    const o = el('option', `${v}×`);
    o.value = String(v);
    o.selected = v === speed;
    sel.append(o);
  }
  sel.addEventListener('change', () => { speed = Number(sel.value) as Speed; });
  sp.append(sel);

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
    const fl = el('label', `${t.play.focus} `);
    const fs = el('select');
    fs.dataset.k = 'focus';
    const keep = el('option', `${t.play.focusKeep} (${t.play.focusNames[s.phd.focus]})`);
    keep.value = '';
    fs.append(keep);
    for (const f of FOCUSES) {
      const o = el('option', t.play.focusNames[f]);
      o.value = f;
      o.disabled = f === 'thesis' && !s.phd.qualified;
      o.selected = f === focus;
      fs.append(o);
    }
    fs.addEventListener('change', () => { focus = fs.value === '' ? undefined : (fs.value as Focus); });
    fl.append(fs);
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
}

function renderCurrent(root: HTMLElement): void {
  root.replaceChildren(el('h2', t.currentHeading));
  if (!life) { root.append(el('p', t.noLife)); return; }
  const dl = el('dl');
  for (const [k, v] of summaryRows(life, t)) dl.append(el('dt', k), el('dd', v));
  root.append(dl);
  if (life.stage === 'end') root.append(el('p', t.play.ended));
  renderControls(root, life);
  renderDecision(root, life, i => { if (life && data) { life = decide(life, data, i); render(); } });
  root.append(button(t.saveNow, () => { if (life) { saveLife(store, life.seed, life); render(); } }));
  renderMoney(root, life);
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
    li.append(button(t.open, () => { stop(); focus = undefined; life = loadLife(store, e.id); resetSide(); render(); focusCurrent(); }, false, `open:${e.id}`));
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
  for (const r of cohortRows(cohort, t)) {
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

function renderMoney(root: HTMLElement, s: LifeState): void {
  if (!data) return;
  root.append(el('h3', t.sources.moneyHeading));
  const dl = el('dl');
  for (const r of moneyRows(s, data, t)) {
    const dd = el('dd', r.value);
    if (r.mark) { const m = el('span', ` [${r.mark}]`); m.className = 'mark'; dd.append(m); }
    dl.append(el('dt', r.label), dd);
    shownIds.push(...r.ids);
  }
  root.append(dl);
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

function renderInner(): void {
  shownIds = [];
  renderCurrent(document.getElementById('current')!);
  renderCohort(document.getElementById('cohort')!);
  renderBranch(document.getElementById('branch')!);
  renderArchive(document.getElementById('archive')!);
  renderSources(document.getElementById('sources')!);
}

/** 새 삶이나 불러온 삶: 동기를 다시 만들고 열린 분기를 닫는다. */
function resetSide(): void {
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
  render();
  focusCurrent();
}

function renderSelect(root: HTMLElement): void {
  root.replaceChildren(el('h2', t.selectHeading), el('p', t.selectHelp));
  for (const g of trackGroups(t)) {
    const fs = el('fieldset');
    fs.append(el('legend', g.label));
    for (const tr of g.tracks) fs.append(button(tr.label, () => startLife(tr.track)));
    root.append(fs);
  }
  root.append(button(t.trackAllLuck, () => startLife(null)));
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
