// 디자인 실험 변형(A/B). 사용법과 기록 규약은 docs/design/experiments/README.md.
// 예: 실험 이름이 layout 이면 ?layout=b 처럼 쓰면 <html data-layout="b"> 가 되고, style.css 의 html[data-layout="b"] 규칙이 켜진다.
// 정해 두지 않으면 기준(a)이다. 선택은 같은 브라우저 안에서 localStorage 에 남는다. ?ab=1 이면 전환 막대가 뜬다.
// 진행 중인 실험이 없으면 비워 둔다. 새 실험은 { 이름: ['a', 'b', ...] } 로 더한다(첫 항목이 기준).
const EXPERIMENTS: Record<string, string[]> = {};
const KEY = 'aphd-design-variants';

function load(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '{}') as Record<string, string>; } catch { return {}; }
}
function save(v: Record<string, string>): void {
  try { localStorage.setItem(KEY, JSON.stringify(v)); } catch { /* 저장 불가 환경은 URL 값만 쓴다 */ }
}

const params = new URLSearchParams(location.search);
const chosen = load();
for (const [name, options] of Object.entries(EXPERIMENTS)) {
  const fromUrl = params.get(name);
  if (fromUrl && options.includes(fromUrl)) chosen[name] = fromUrl;
  document.documentElement.dataset[name] = chosen[name] && options.includes(chosen[name]!) ? chosen[name] : options[0]!;
}
save(chosen);

if (params.get('ab') === '1' && Object.keys(EXPERIMENTS).length > 0) {
  const bar = document.createElement('div');
  bar.setAttribute('role', 'group');
  bar.setAttribute('aria-label', 'variants');
  bar.style.cssText = 'position:fixed;right:.5rem;bottom:.5rem;z-index:10;display:flex;gap:.5rem;padding:.4rem .6rem;background:var(--bg);color:var(--fg);border:1px solid var(--muted);font:.85rem system-ui,sans-serif';
  for (const [name, options] of Object.entries(EXPERIMENTS)) {
    const label = document.createElement('span');
    label.textContent = name;
    bar.append(label);
    for (const o of options) {
      const b = document.createElement('button');
      b.textContent = o;
      b.dataset.exp = name;
      b.setAttribute('aria-pressed', String(document.documentElement.dataset[name] === o));
      b.addEventListener('click', () => {
        const v = load();
        v[name] = o;
        save(v);
        document.documentElement.dataset[name] = o;
        bar.querySelectorAll<HTMLElement>(`button[data-exp="${name}"]`).forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      });
      bar.append(b);
    }
  }
  document.body.append(bar);
}
