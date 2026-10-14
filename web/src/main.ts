// 웹 진입점. 데이터(data.json)를 받아 DataBundle 을 만들고, 분야 선택·지금 삶(진행 화면)·기록 보관 화면을 그린다.
// 진행 로직(한 칸, 자동 모드, 결정 지점, 연구노트, 인생 지도)은 play.ts, 동기·분기는 cohort.ts 에 있고, 여기는 DOM 과 타이머만 다룬다.
import { bundleFromWebData, createLife, decide, newSeed, type DataBundle, type Focus, type LifeState, type WebDataFile } from '../../engine/src/browser';
import { loadLife, readArchive, saveLife, type KeyValueStore } from './archive';
import { branchPoints, catchUp, cohortRows, compareRows, createCohort, fill, openBranch, runUntilHalt, sharedPrefix } from './cohort';
import { FOCUSES, SPEEDS, autoRuleText, decisionView, halted, intervalMs, lifeMap, notes, setAuto, step, type Speed } from './play';
import { compatible, lifeConfig, offerings, schoolIds, trackGroups, type Offerings } from './select';
import { schoolDisplayName } from './schoolName';
import { ko as t } from './strings.ko';
import { summaryRows } from './view';

const store: KeyValueStore = window.localStorage;
let data: DataBundle | undefined;
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
  return e;
}

function button(text: string, onClick: () => void, disabled = false): HTMLButtonElement {
  const b = el('button', text);
  b.type = 'button';
  b.disabled = disabled;
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
    running ? button(t.play.pause, () => { stop(); render(); }) : button(t.play.run, run, halted(s)),
    button(t.play.stepOnce, () => { if (life && data) { life = step(life, data, focus); render(); } }, running || halted(s)),
  );
  const sp = el('label', `${t.play.speed} `);
  const sel = el('select');
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
  cb.type = 'checkbox';
  cb.checked = s.auto;
  cb.addEventListener('change', () => { if (life && data) { life = setAuto(life, data, cb.checked); render(); } });
  au.append(cb, ` ${t.play.auto}`);
  bar.append(sp, au);
  root.append(bar, el('p', autoRuleText(t)));

  if (s.stage === 'phd' && s.phd) {
    const fl = el('label', `${t.play.focus} `);
    const fs = el('select');
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
    li.append(button(t.open, () => { stop(); focus = undefined; life = loadLife(store, e.id); resetSide(); render(); }));
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
    button(t.cohort.branchRun, () => { if (branched && data) { branched = runUntilHalt(branched, data); render(); } }, halted(b)),
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

function render(): void {
  renderCurrent(document.getElementById('current')!);
  renderCohort(document.getElementById('cohort')!);
  renderBranch(document.getElementById('branch')!);
  renderArchive(document.getElementById('archive')!);
}

/** 새 삶이나 불러온 삶: 동기를 다시 만들고 열린 분기를 닫는다. */
function resetSide(): void {
  cohort = life && data ? createCohort(life, data) : [];
  branched = undefined;
  branchedFrom = undefined;
}

function startLife(track: string | null, school: string | null): void {
  if (!data) return;
  stop();
  focus = undefined;
  life = createLife(lifeConfig(track, school), newSeed(`${Date.now()}-${Math.random()}`), data);
  resetSide();
  render();
  document.getElementById('current')!.scrollIntoView();
}

/** 선택 화면. 분야와 학교는 서로를 거른다: 맞지 않는 쪽 버튼은 꺼진다(#69). 같은 버튼을 다시 누르면 선택이 풀린다. */
function renderSelect(root: HTMLElement, o: Offerings, track: string | null = null, school: string | null = null): void {
  const redo = (tr: string | null, sc: string | null): void => {
    renderSelect(root, o, tr, sc);
    root.querySelector<HTMLButtonElement>('button[aria-pressed="true"]')?.focus();
  };
  const toggle = (b: HTMLButtonElement, on: boolean): HTMLButtonElement => { b.setAttribute('aria-pressed', String(on)); return b; };
  root.replaceChildren(el('h2', t.selectHeading), el('p', t.selectHelp));
  for (const g of trackGroups(t)) {
    const fs = el('fieldset');
    fs.append(el('legend', g.label));
    for (const tr of g.tracks) {
      const on = track === tr.track;
      fs.append(toggle(button(tr.label, () => redo(on ? null : tr.track, school), !compatible(o, tr.track, school)), on));
    }
    root.append(fs);
  }
  const sfs = el('fieldset');
  sfs.append(el('legend', t.schoolHeading));
  for (const id of schoolIds(o, t)) {
    const on = school === id;
    sfs.append(toggle(button(schoolDisplayName(id, t), () => redo(track, on ? null : id), !compatible(o, track, id)), on));
  }
  root.append(sfs);
  const name = (v: string | null, f: (x: string) => string): string => (v === null ? t.selectedNone : f(v));
  root.append(el('p', `${t.selectedTrack}: ${name(track, x => t.trackNames[x as keyof typeof t.trackNames])} · ${t.selectedSchool}: ${name(school, x => schoolDisplayName(x, t))}`));
  root.append(button(t.startLife, () => startLife(track, school)));
  root.append(button(t.trackAllLuck, () => startLife(null, null)));
}

async function start(): Promise<void> {
  const status = document.getElementById('status')!;
  status.textContent = t.loading;
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}data.json`);
    data = bundleFromWebData((await res.json()) as WebDataFile);
    status.textContent = '';
  } catch {
    status.textContent = t.loadFailed;
    return;
  }
  renderSelect(document.getElementById('select')!, offerings(data));
  render();
}

document.title = t.title;
document.getElementById('title')!.textContent = t.title;
document.getElementById('skip')!.textContent = t.skipToMain;
document.getElementById('notice')!.textContent = t.creativeNotice;
void start();
