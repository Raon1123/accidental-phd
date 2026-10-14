// 웹 진입점. 데이터(data.json)를 받아 DataBundle 을 만들고, 새 삶·저장·기록 보관 화면을 그린다.
// 진행 화면(#55)과 입학 전 선택 화면(#54)은 이 골격 위에 더한다.
import { bundleFromWebData, createLife, newSeed, type DataBundle, type LifeState, type WebDataFile } from '../../engine/src/browser';
import { loadLife, readArchive, saveLife, type KeyValueStore } from './archive';
import { ko as t } from './strings.ko';
import { summaryRows } from './view';

const store: KeyValueStore = window.localStorage;
let data: DataBundle | undefined;
let life: LifeState | undefined;

function el<K extends keyof HTMLElementTagNameMap>(tag: K, text?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (text !== undefined) e.textContent = text;
  return e;
}

function renderCurrent(root: HTMLElement): void {
  root.replaceChildren(el('h2', t.currentHeading));
  if (!life) { root.append(el('p', t.noLife)); return; }
  const dl = el('dl');
  for (const [k, v] of summaryRows(life, t)) dl.append(el('dt', k), el('dd', v));
  const save = el('button', t.saveNow);
  save.type = 'button';
  save.addEventListener('click', () => { if (life) { saveLife(store, life.seed, life); render(); } });
  root.append(dl, save);
}

function renderArchive(root: HTMLElement): void {
  root.replaceChildren(el('h2', t.archiveHeading));
  const entries = readArchive(store);
  if (entries.length === 0) { root.append(el('p', t.archiveEmpty)); return; }
  const ul = el('ul');
  for (const e of entries) {
    const li = el('li', `${e.id} · ${t.savedAt} ${e.savedAt.slice(0, 16).replace('T', ' ')} `);
    const b = el('button', t.open);
    b.type = 'button';
    b.addEventListener('click', () => { life = loadLife(store, e.id); render(); });
    li.append(b);
    ul.append(li);
  }
  root.append(ul);
}

function render(): void {
  renderCurrent(document.getElementById('current')!);
  renderArchive(document.getElementById('archive')!);
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
  const btn = document.getElementById('new-life') as HTMLButtonElement;
  btn.textContent = t.newLifeAllLuck;
  btn.disabled = false;
  btn.addEventListener('click', () => {
    if (!data) return;
    life = createLife({}, newSeed(`${Date.now()}-${Math.random()}`), data);
    render();
  });
  render();
}

document.title = t.title;
document.getElementById('title')!.textContent = t.title;
document.getElementById('skip')!.textContent = t.skipToMain;
document.getElementById('notice')!.textContent = t.creativeNotice;
void start();
