//@ts-ignore
export const requestFullscreen = (el: HTMLElement) => el.webkitRequestFullscreen();

export const $ = document.querySelector;

export type $div = HTMLDivElement;
export type $canvas = HTMLCanvasElement;

document.body.innerHTML = `<div id="app">
	<canvas class="canvas"></canvas>
	<div class="preact-root"></div>
</div>`;

export const $app = document.querySelector<$div>('#app')!;
export const $canvas = document.querySelector<$canvas>('.canvas')!;
export const $preact_root = document.querySelector<$div>('.preact-root')!;

$app.ondblclick = () => requestFullscreen($app);
