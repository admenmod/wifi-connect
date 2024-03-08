import { Socket, io } from 'socket.io-client';

import { Vector2 } from 'ver/Vector2';
import { EventDispatcher, Event } from 'ver/events';
import { TouchesController, Touch } from 'ver/TouchesController';
import { MainLoop } from 'ver/MainLoop';
import { Viewport } from 'ver/Viewport';
import { HTMLCanvasLayersElement } from 'ver/HTMLCanvasLayersElement';

import { Node } from 'engine/scenes/Node.js';
import { ProcessSystem } from 'engine/scenes/Node.js';
import { RenderSystem } from 'engine/scenes/CanvasItem.js';
import { ClientToServerEvents, ServerToClientEvents } from 'shared/types/mapeditor.js';

import { MainScene } from './mapeditor/MainScene.js';


export const $app = document.querySelector<HTMLDivElement>('#app')!;
if(!$app) throw new Error('app is not found');

export const canvas = new HTMLCanvasLayersElement();
$app.append(canvas);
//@ts-ignore
canvas.ondblclick = () => canvas.webkitRequestFullscreen();


export const layers: Record<string, CanvasRenderingContext2D>= {};
for(let id in canvas.layers) layers[id] = canvas.layers[id].getContext('2d')!;


export const touches = new TouchesController(canvas, e => e.currentTarget === e.target);


export const gm = new class GameManager extends EventDispatcher {
	public '@resize' = new Event<GameManager, [Vector2]>(this);
	public '@camera.scale' = new Event<GameManager, [Vector2]>(this);

	public main_layer = layers.main;

	public viewport: Viewport;

	public get screen() { return new Vector2(this.main_layer.canvas.width, this.main_layer.canvas.height); }

	public root!: Node;

	public stats: Record<string, string> = {};

	public socket!: Socket<ServerToClientEvents, ClientToServerEvents>;
	public username!: string;

	constructor() {
		super();

		this.viewport = new Viewport(layers.main);
		this.viewport.size.set(canvas.size);

		canvas['@resize'].on(size => {
			this.viewport.size.set(size);

			this['@resize'].emit(size);
		});
	}
}


export const Input = new class Input extends EventDispatcher {
	public '@press' = new Event<this, [pos: Vector2, local: Vector2, touch: Touch, viewport: Viewport]>(this);
	public '@up'    = new Event<this, [pos: Vector2, local: Vector2, touch: Touch, viewport: Viewport]>(this);
	public '@move'  = new Event<this, [pos: Vector2, local: Vector2, touch: Touch, viewport: Viewport]>(this);
	public '@click'  = new Event<this, [c: number, pos: Vector2, local: Vector2, touch: Touch, viewport: Viewport]>(this);
	public '@dblclick'  = new Event<this, [pos: Vector2, local: Vector2, touch: Touch, viewport: Viewport]>(this);

	constructor() {
		super();

		touches['@touchstart'].on(t => {
			const pos = gm.viewport.transformFromScreenToViewport(t.pos.buf());
			const local = gm.viewport.transformToLocal(t.pos.buf());
			this['@press'].emit(pos, local, t, gm.viewport);
		});
		touches['@touchend'].on(t => {
			const pos = gm.viewport.transformFromScreenToViewport(t.pos.buf());
			const local = gm.viewport.transformToLocal(t.pos.buf());
			this['@up'].emit(pos, local, t, gm.viewport);
		});
		touches['@touchmove'].on(t => {
			const pos = gm.viewport.transformFromScreenToViewport(t.pos.buf());
			const local = gm.viewport.transformToLocal(t.pos.buf());
			this['@move'].emit(pos, local, t, gm.viewport);
		});
		touches['@touchclick'].on((c, t) => {
			const pos = gm.viewport.transformFromScreenToViewport(t.pos.buf());
			const local = gm.viewport.transformToLocal(t.pos.buf());
			this['@click'].emit(c, pos, local, t, gm.viewport);
		});
		touches['@touchdblclick'].on(t => {
			const pos = gm.viewport.transformFromScreenToViewport(t.pos.buf());
			const local = gm.viewport.transformToLocal(t.pos.buf());
			this['@dblclick'].emit(pos, local, t, gm.viewport);
		});
	}
}


export const mainLoop = new MainLoop({ fps: 60 });


export const processSystem = new ProcessSystem();
export const renderSystem = new RenderSystem();

mainLoop.on('update', dt => processSystem.update(dt), -25);
mainLoop.on('update', () => renderSystem.update(gm.viewport), -50);
mainLoop.on('update', dt => touches.nullify(dt), -10000);


const $wrapper = document.createElement('div');
Object.assign<CSSStyleDeclaration, Partial<CSSStyleDeclaration>>($wrapper.style, {
	display: 'grid',
	margin: '10px 5px',
	padding: '5px 5px',
	alignSelf: 'center',
	justifySelf: 'center',
	gap: '10px',
});


const STORAGE_KEY_USERNAME = '$input_username.value';
const $input_username = document.createElement('input');
$input_username.value = localStorage?.getItem(STORAGE_KEY_USERNAME) || '';
$input_username.placeholder = 'username';

Object.assign<CSSStyleDeclaration, Partial<CSSStyleDeclaration>>($input_username.style, {
	width: 'max-content',
	height: 'max-content',
	alignSelf: 'center',
	justifySelf: 'center'
});


const $input = document.createElement('input');
$input.value = `${location.protocol}//${location.hostname}:5000`;
$input.placeholder = 'address';

Object.assign<CSSStyleDeclaration, Partial<CSSStyleDeclaration>>($input.style, {
	width: 'max-content',
	height: 'max-content',
	alignSelf: 'center',
	justifySelf: 'center'
});


const $button = document.createElement('button');
$button.innerText = 'connect';

Object.assign<CSSStyleDeclaration, Partial<CSSStyleDeclaration>>($button.style, {
	padding: '10px 20px',
	width: 'max-content',
	height: 'max-content',
	alignSelf: 'center',
	justifySelf: 'center'
});


$wrapper.append($input_username);
$wrapper.append($input);
$wrapper.append($button);

canvas.append($wrapper);


(async () => {
	gm.socket = await new Promise(res => {
		$button.onclick = () => {
			const socket = io($input.value);

			gm.username = $input_username.value || performance.now().toString(36);
			localStorage?.setItem(STORAGE_KEY_USERNAME, gm.username);

			res(socket);
		};
	});

	$button.onclick = null;
	canvas.innerHTML = '';

	await Node.load();
	await MainScene.load();

	gm.root = new Node();
	await gm.root.init();

	const main_scene = new MainScene();
	await main_scene.init();

	processSystem.addRoot(gm.root);
	renderSystem.addRoot(gm.root);

	gm.root.addChild(main_scene);

	mainLoop.start();
})();


/*
const ctx = new AudioContext();
const gain = ctx.createGain();

const audio_buffer = await fetch('assets/audio/play.wav')
	.then(data => data.arrayBuffer())
	.then(buffer => ctx.decodeAudioData(buffer));


gain.gain.value = 0.1;

gain.connect(ctx.destination);


// canvas.onclick = () => {
// 	const sound = ctx.createBufferSource();
// 	sound.buffer = audio_buffer;
// 	sound.connect(gain);
//
// 	sound.start(ctx.currentTime);
// };
*/
