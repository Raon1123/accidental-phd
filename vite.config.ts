import { defineConfig } from 'vite';
// GitHub Pages 는 저장소 이름 아래 경로에서 열리므로 상대 base 를 쓴다.
export default defineConfig({ root: 'web', base: './', build: { outDir: '../dist/web', emptyOutDir: true } });
