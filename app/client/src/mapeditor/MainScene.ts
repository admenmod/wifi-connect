import { Vector2 } from 'ver/Vector2';
import { Event, EventDispatcher } from 'ver/events';
import { math as Math } from 'ver/helpers';
import { Path } from 'ver/Path';
import { Animation } from 'ver/Animation';
import type { Viewport } from 'ver/Viewport';
import { codeShell } from 'ver/codeShell';
import { KeyboardInputInterceptor } from 'ver/KeyboardInputInterceptor';
import { KeymapperOfActions, MappingsMode } from 'ver/KeymapperOfActions';
import { Loader } from 'ver/Loader';

import { DataPacker } from 'engine/modules/DataPacker.js';
import { GridMap } from 'engine/scenes/gui/GridMap.js';
import { SensorCamera } from 'engine/modules/SensorCamera.js';
import { Control } from 'engine/scenes/Control.js';
import { Node2D } from 'engine/scenes/Node2D.js';
import { Camera2D } from 'engine/scenes/Camera2D.js';
import { SystemInfo } from 'engine/scenes/gui/SystemInfo.js';
import { Sprite } from 'engine/scenes/Sprite.js';
import { Button } from 'engine/scenes/gui/Button.js';
import { TextObjectContainer } from '../scenes/TextObject.js';
import { type Player, PlayerContainer } from './Player.js';

import type { IResourceData, IMap, IExtraObject, IMainObject, IObject } from 'shared/types/mapeditor.js';

import { canvas, gm, touches } from '../global.js';


const data_packer = new DataPacker();

// const pack = <T extends any[]>(...args: T): T => data_packer.pack(args) as T;
// const unpack = <T extends any[]>(...args: T): T => data_packer.unpack(args) as T;

const em = new class extends EventDispatcher {
	public '@map:init' = new Event<this, [data: IMap]>(this);
	public '@resources:init' = new Event<this, [collection: IResourceData[]]>(this);

	public '@resource:new' = new Event<this, [data: IResourceData]>(this);

	public '@image:load' = new Event<this, [data: IResourceData & { url: string }]>(this);


	public '@object:create' = new Event<this, [main: IMainObject, extra: IExtraObject]>(this);
}


const pasteToInput = (input: HTMLInputElement | HTMLTextAreaElement, text: string) => {
	const { value, selectionStart, selectionEnd } = input;
	input.value = value.substring(0, selectionStart!) + text + value.substring(selectionEnd!);
	input.selectionStart = input.selectionEnd = selectionStart! + text.length;
};


const $editor = document.createElement('div');
const $editor_styles: Partial<CSSStyleDeclaration> = {
	opacity: '0.8',
	display: 'grid',
	margin: '10px 5px',
	padding: '5px 5px',
	alignSelf: 'start',
	justifySelf: 'center',
};
Object.assign($editor.style, $editor_styles);

const $input = document.createElement('textarea');
const $error = document.createElement('textarea');

const styles: Partial<CSSStyleDeclaration> = {
	fontSize: '15px',
	fontFamily: 'monospace',
	margin: '10px 5px',
	padding: '5px 5px',
	width: '90vw',
	height: '40vh',
	alignSelf: 'start',
	justifySelf: 'center',
	color: '#eeeeee',
	background: '#222222'
};

Object.assign($input.style, styles);
Object.assign($error.style, styles, {
	height: '10vh'
});

$error.style.color = '#ff3333';

$editor.append($input);
$editor.append($error);

const STORAGE_KEY = '$input.value';
$input.value = localStorage?.getItem(STORAGE_KEY) || '';
window.addEventListener('beforeunload', () => localStorage?.setItem(STORAGE_KEY, $input.value));


const kii = new KeyboardInputInterceptor($input, { notPreventDefault: true });
kii.init();

kii.on('focus', () => {
	$editor.style.position = '';
	$editor.style.left = '';
});
kii.on('blur', () => {
	$editor.style.position = 'fixed';
	$editor.style.left = '-1000vw';
});


// let map: Map;


// let current_layer: string = '';
// let current_tile: number = 0;
//
// const selectTile = (id: number) => {
// 	const tile = map.getTile(id)?.tile;
//
// 	if(!tile) $error.value = `tile is not defined (${id})`;
// 	else current_tile = tile.id;
// };
// const selectLayer = (name: string) => {
// 	const layer = map.getLayer(name);
//
// 	if(!layer) $error.value = `layer is not defined (${name}) [${map.layers.map(i => i.name)}]`;
// 	else current_layer = layer.name;
// };
//
// const getCurrentTile = () => map.getTile(current_tile)?.tile;
// const getCurrentLayer = () => map.getLayer(current_layer);

/*
function __main__(this: {
	init(): void;
	process(dt: number): void;
}) { this.init = init; this.process = process; function init() {

	}

	function process(dt: number) {

	}

}
*/

const map: IMap = {
	version: '',
	resources: [],
	main_objects: [],
	extra_objects: []
};
// const resources: IResourceData[] = [];
const images: (IResourceData & { url: string })[] = [];

const loadResource = (data: IResourceData) => new Promise<IResourceData>(res => {
	gm.socket.emit('resource:load', data.id, (data, buffer) => {
		if(data.type.split('/')[0] !== 'image') return;

		const blob = new Blob([buffer], { type: data.type });
		const url = URL.createObjectURL(blob);

		const image_data = Object.assign(data, { url });
		images.push(image_data);

		res(image_data);

		em.emit('image:load', image_data);
	});
});

const loadImageObject = (name: string, src: string): Promise<IResourceData> => new Promise((res, rej) => {
	gm.socket.emit('resource:register', gm.socket.id!, { name, src }, (err, data) => {
		if(!data) return rej(err);

		map.resources.push(data);

		loadResource(data).then(res);
	});
});


em.on('map:init', data => {
	map.version = data.version;

	for(const resource of data.resources) {
		map.resources.push(resource);
		loadResource(resource);
	}
	for(const object of data.main_objects) map.main_objects.push(object);
	for(const object of data.extra_objects) map.extra_objects.push(object);
});

em.on('resource:new', data => loadResource(data));
// em.on('resources:init', collection => {
// 	for(const data of collection) loadResource(data);
// });
em.on('image:load', async data => {
	const img = await Loader.instance().loadImage(data.url);
	document.body.append(img);
});


const generateObject = (main: IMainObject, extra: IExtraObject): IObject => {
	const o: IObject = Object.create(main, Object.getOwnPropertyDescriptors(extra));

	o.position = new Vector2().set(o.position);

	return o;
};

em.on('object:create', (main: IMainObject, extra: IExtraObject) => {
	const o = generateObject(main, extra);
	console.log(o);


	const env = {
		position: new Vector2(o.position[0], o.position[1], (x, y) => {})
	};

	const api = Object.create(null, Object.getOwnPropertyDescriptors(extra.extra_properties));

	const res = codeShell<(this: typeof api) => unknown>(
		`this.init = init || () => {}; this.destroy = destroy || () => {}; ${main.script}`,
	env, {
		source: `[${extra.link_id}](${extra.id})`
	}).call(api);
});


export class MapNode extends Node2D {
	// public map!: Map;
	public tilesets_images: Record<string, HTMLImageElement> = {};

	protected async _init(): Promise<void> {
		// this.draw_distance = this.map.size.buf().inc(this.map.tile_size).module;
	}

/*
	protected _draw({ ctx }: Viewport): void {
		for(const layer of this.map.layers) {
			if(layer.type === 'tilelayer') {
				for(let i = 0; i < layer.data.length; i++) {
					if(layer.data[i] === 0) continue;

					const { tile, tileset } = map.getTile(layer.data[i]);
					if(!tile || !tileset) continue;

					const mapsize = this.map.size.buf();
					const tile_size = this.map.tile_size.buf();
					const dx = i % mapsize.x + 1, dy = Math.floor(i / mapsize.x) + 1;
					const sx = (tile.id-1) % tileset.columns, sy = Math.floor((tile.id-1) / tileset.columns);

					ctx.drawImage(
						tileset.imagedata,
						sx * tileset.tile_size.x, sy * tileset.tile_size.y, tileset.tile_size.x, tileset.tile_size.y,
						dx * tile_size.x, dy * tile_size.y, tile_size.x, tile_size.y
					)
				}
			}
		}
	}
*/
}


class Info extends Node2D {
	public self!: MainScene;

	protected async _init(): Promise<void> { this.draw_distance = Math.INF; }

	protected _ready(): void { this.zIndex = 10000; }

	protected _draw({ ctx, size }: Viewport): void {
		const center = Vector2.ZERO;
		const a = 30;

		ctx.beginPath();
		ctx.globalAlpha = 0.2;
		ctx.strokeStyle = '#ffff00';
		ctx.moveTo(center.x, center.y-a);
		ctx.lineTo(center.x, center.y+a);
		ctx.moveTo(center.x-a, center.y);
		ctx.lineTo(center.x+a, center.y);
		ctx.stroke();


		ctx.resetTransform();

		ctx.beginPath();
		ctx.font = `15px arkhip`;
		ctx.textAlign = 'center';
		ctx.textBaseline = 'top';
		ctx.fillStyle = '#ffffff';
		// ctx.fillText(getCurrentLayer()!.name, size.x/2, 5);
	}
}


let touch: ReturnType<typeof touches['findTouch']>;
let isDrawing: boolean = false;

export class MainScene extends Control {
	protected static async _load(scene: typeof this): Promise<void> {
		await Promise.all([
			super._load(scene)
		]);
	}


	public anims: Animation[] = [];

	private sensor_camera = new SensorCamera();

	private keyboardInputInterceptor!: KeyboardInputInterceptor;
	private keymapperOfActions!: KeymapperOfActions;
	private normal_mode = new MappingsMode('normal');


	public TREE() { return {
		Camera2D,
		MapNode,
		GridMap,
		PlayerContainer,
		TextObjectContainer,
		SystemInfo,
		ButtonKeyboard: Button,
		ButtonCreate: Button,
		Info
	}}

	// aliases
	public get $camera() { return this.get('Camera2D'); }
	public get $map() { return this.get('MapNode'); }
	public get $gridMap() { return this.get('GridMap'); }
	public get $buttonKeyboard() { return this.get('ButtonKeyboard'); }
	public get $info() { return this.get('Info'); }
	public get $playersC() { return this.get('PlayerContainer'); }
	public get $textsC() { return this.get('TextObjectContainer'); }

	public player!: Player;

	protected async _init(this: MainScene): Promise<void> {
		this.$playersC.c.on('create', item => {
			item.alpha = 0.5;
		});

		gm.socket.emit('natify:init', ({ // ...pack({
			id: gm.socket.id!,
			username: gm.username,
			color: `hsl(${Math.randomInt(0, 359)}, ${Math.randomInt(70, 90)}%, ${Math.randomInt(70, 90)}%)`,
			position: gm.viewport.position.buf(),
			rotation: gm.viewport.rotation,
			size: gm.viewport.size.buf(),
			scale: gm.viewport.scale.buf()
		}));

		await Promise.all([
			new Promise(res => gm.socket.on('players:init', async (...args) => {
				res(await this.$playersC.await_emit('server#init', ...args));
			})),
			new Promise(res => gm.socket.on('texts:init', async (...args) => {
				res(await this.$textsC.await_emit('server#init', ...args));
			})),
			new Promise(res => gm.socket.on('map:init', async data => {
				await em.await_emit('map:init', data);
				res(data);
			}))
			// new Promise(res => gm.socket.on('resources:init', async collection => {
			// 	for(const data of collection) resources.push(data);
			// 	await em.await_emit('resources:init', collection);
			// 	res(resources);
			// }))
		]);


		await super._init();


		this.player = this.$playersC.c.items.find(i => i.id === gm.socket.id)!;

		gm.socket.on('code:sync', (ownerID, code) => {
			const env = {};
			const api = {};

			try {
				codeShell<() => Promise<unknown>>(code, env, {
					insulate: false,
					async: true,
					source: 'server:code'
				}).call(api).then(res => {
					console.log(`ownerID: [${ownerID}] server:code res`, res);
					// cb(res);
				});
			} catch(err) { console.error(err); }
		});


		gm.socket.on('player:create', (...args) => this.$playersC.emit('server#create', ...args));
		gm.socket.on('player:delete', (...args) => this.$playersC.emit('server#delete', ...args));
		gm.socket.on('players:update', (...args) => this.$playersC.emit('server#update', ...args));

		gm.socket.on('text:create', (...args) => this.$textsC.emit('server#create', ...args));
		gm.socket.on('text:delete', (...args) => this.$textsC.emit('server#delete', ...args));


		gm.socket.on('resource:new', data => {
			if(map.resources.find(i => i.id === data.id)) throw new Error('resource id error');

			map.resources.push(data);
			em.emit('resource:new', data);
		});


		this.$camera.viewport = gm.viewport;
		this.$camera.current = true;

		this.$camera.on('PreProcess', dt => !isDrawing && this.sensor_camera.update(dt, touches, this.$camera));


		this.$gridMap.coordinates = true;
		this.$gridMap.tile.set(100, 100);


		this.$info.self = this;


		const hiddenInput = document.createElement('input');
		hiddenInput.style.position = 'fixed';
		hiddenInput.style.top = '-1000vw';
		canvas.append(hiddenInput);

		const keyboardInputInterceptor = this.keyboardInputInterceptor = new KeyboardInputInterceptor(hiddenInput);
		keyboardInputInterceptor.init();

		const keymapperOfActions = this.keymapperOfActions = new KeymapperOfActions(this.normal_mode);
		keymapperOfActions.init(keyboardInputInterceptor);
		keymapperOfActions.enable();


		const input_mode = new MappingsMode('input');

		this.normal_mode.register(['Escape'], mapping => {
			keyboardInputInterceptor.blur();
		});


		canvas.append($editor);


		const env = {
			loadImageObject: (name: string, src: string) => {
				loadImageObject(name, src);
			}
		};

		const api = {};

		const execute_code = (code: string) => {
			try {
				const res = codeShell<(this: typeof api) => unknown>(code, env, {
					source: 'code'
				}).call(api);

				kii.input.blur();

				console.log('res:', res);
			} catch(err) {
				console.error(err);

				if(err instanceof Error) $error.value = err.stack || err.name;
				if(typeof err === 'string') $error.value = err;
			}
		};

		kii.on('keydown:input', e => {
			if(e.key === 'Tab') {
				pasteToInput(e.input, '\t');
				e.preventDefault();
			} else if(e.ctrl && e.key === 'v') navigator.clipboard.read();
			else if(e.ctrl && e.key === 't') {
				e.preventDefault();

				const template =
`loadImageObject('test.png', 'https://opengameart.org/sites/default/files/example%20%283%29.png');`;

				pasteToInput(e.input, template);
			} else if(e.key === 'Enter' && e.ctrl) execute_code(e.input.value);
			else if(e.key === 'Escape') kii.blur();
		});


		const onresize = (size: Vector2) => {
			// this.$gridMap.size.set(size);
		};

		onresize(gm.viewport.size);

		gm.on('resize', onresize);
	}


	public sckip: number = 0;
	public mode: 'await_position' | 'draw' | null = null;
	public awaitor: Button | null = null;
	public '@cell:set' = new Event<MainScene, [i: number, cell: Vector2, pos: Vector2]>(this);

	protected _ready(this: MainScene): void {
		this.processPriority = 1000;


		this.$camera.addChild(this.removeChild(this.$buttonKeyboard.name, true));
		this.$camera.addChild(this.removeChild(this.get('ButtonCreate').name, true));


		const size = gm.screen.buf().div(2);

		const k = kii;
		this.$buttonKeyboard.text = k.isFocus ? 'Hide' : 'Keyboard';
		k.on('focus', () => this.$buttonKeyboard.text = 'Hide');
		k.on('blur', () => this.$buttonKeyboard.text = 'Keyboard');
		this.$buttonKeyboard.position.set(size.buf().invert().add(100, 50));
		this.$buttonKeyboard.on('pressed', () => {
			if(k.isFocus) {
				this.$buttonKeyboard.text = 'Hide';
				kii.input.blur();
			} else {
				this.$buttonKeyboard.text = 'Keyboard';
				kii.input.focus();
			}
		});


		const bCreate = this.get('ButtonCreate');
		bCreate.text = 'Create';
		bCreate.position.set(+(size.x - 100), -(size.y - 50));

		bCreate.on('pressed', async () => {
			gm.socket.emit('code:spawn', gm.socket.id!, `console.log(33);`);

			if(this.awaitor !== bCreate) {
				this.sckip = 1;

				this.awaitor = bCreate;
				this.mode = 'draw';

				this.awaitor.alpha = 0.5;
			} else {
				this.awaitor.alpha = 1;

				this.sckip = 1;

				this.awaitor = null;
				this.mode = null;
			}
		});


		// this.$gridMap.tile.set(this.$map.map.size);
		// this.$gridMap.size.set(this.$map.map.size.buf().inc(this.$map.map.tile_size));
		// this.$gridMap.offset.set(this.$gridMap.size.buf().div(2));

/*
		this.on('cell:set', async (i, cell, pos) => {
			const tile = getCurrentTile();
			const clayer = getCurrentLayer();
			if(!clayer || clayer.type !== 'tilelayer') return alert('d');

			clayer.data[i] = tile?.id || 0;

			const { name } = clayer;

			gm.socket.emit('edit:map', gm.socket.id!, {
				layers: [{ name, data: [
					[i, clayer.data[i]]
				] }]
			});
		});
*/

		// Input.on('click', async (_, pos) => {
		// 	if(!this.awaitor) return;
		// 	if(this.sckip-- > 0) return;
		//
		// 	const tile = this.$gridMap.tile.buf();
		// 	pos = pos.buf().div(tile).floor().add(1).inc(tile).sub(tile.buf().div(2));
		//
		// 	const cell = pos.buf().add(tile.buf().div(2)).div(tile).add(MAP_WIDTH/2, MAP_HEIGHT/2);
		// 	const w = MAP_WIDTH, h = MAP_HEIGHT;
		//
		// 	if(cell.x <= 0 || cell.x > w || cell.y <= 0 || cell.y > h) return;
		// 	const i = (cell.y-1) * w + cell.x-1;
		//
		// 	if(this.mode === 'draw') this.emit('cell:set', i, cell, pos);
		// });
	}

	protected _process(this: MainScene, dt: number): void {
		this.keymapperOfActions.update(dt);

/*
		(() => {
			if(this.awaitor && (touch = touches.findTouch() || touch)) {
				if(touch.isTimeDown(300)) isDrawing = true;

				if(!touch.isClick() && !isDrawing) return;

				let pos = gm.viewport.transformFromScreenToViewport(touch.pos.buf());

				const tile_size = this.$map.map.tile_size.buf();
				pos = pos.buf().div(tile_size).floor().inc(tile_size);

				// const cell = pos.buf().add(tile.buf().div(2)).div(tile).add(MAP_WIDTH/2, MAP_HEIGHT/2);
				const cell = pos.buf().div(tile_size).add(this.$map.map.size.buf().div(2));
				const { x: w, y: h } = this.$map.map.size;

				if(cell.x <= 0 || cell.x > w || cell.y <= 0 || cell.y > h) return;
				const i = (cell.y-1) * w + cell.x-1;

				if(this.mode === 'draw') this.emit('cell:set', i, cell, pos);

				if(touch.isUp()) {
					touch = null;
					isDrawing = false;
				}
			}
		})();
*/

		// this.$gridMap.scroll.set(this.$camera.position);
		// this.$gridMap.size.set(this.$camera.size.buf().inc(this.$camera.scale));
		// this.$gridMap.position.set(this.$camera.position);


		this.player.rotation = this.$camera.rotation;
		this.player.position.set(this.$camera.position);
		this.player.scale.set(this.$camera.scale);
		this.player.size.set(this.$camera.size);


		gm.socket.volatile.emit('player:edit', this.player.id, {
			id: gm.socket.id!,
			username: gm.username,
			color: this.player.color,
			rotation: this.player.rotation,
			position: this.player.position.buf(),
			scale: this.player.scale.buf(),
			size: this.player.size.buf()
		});


		for(const anim of this.anims) anim.tick(dt);
	}
}
