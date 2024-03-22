import { Vector2 } from 'ver/Vector2';
import { Event } from 'ver/events';
import { math as Math, tag } from 'ver/helpers';
import { Animation } from 'ver/Animation';
import { codeShell } from 'ver/codeShell';
import type { Viewport } from 'ver/Viewport';
import type { Touch } from 'ver/TouchesController';

import { GridMap } from 'engine/scenes/gui/GridMap.js';
import { SensorCamera } from 'engine/modules/SensorCamera.js';
import { Control } from 'engine/scenes/Control.js';
import { Node2D } from 'engine/scenes/Node2D.js';
import { Camera2D } from 'engine/scenes/Camera2D.js';
import { SystemInfo } from 'engine/scenes/gui/SystemInfo.js';
import { Button } from 'engine/scenes/gui/Button.js';
import { TextObjectContainer } from 'src/scenes/TextObject.js';
import { type Player, PlayerContainer } from './Player.js';
import { MapSystem } from 'src/modules/map.js';

import { socket, user } from 'src/socket.js';
import { touches, viewport } from 'src/canvas-space.js';
import { kii } from 'src/components/CodeEdit.js';


const HTML = (str: TemplateStringsArray, ...args: any[]) => {
	const root = document.createElement('div');

	root.innerHTML = tag.raw(str, ...args);

	// console.log(root);

	return root;
};


const dom = HTML`
<div id="root">
	<div>kwkd</div>
</div>
<div id="end"></div>`;

// document.body.append(dom);


const map = new MapSystem();

// map.on('create:resource', resource => map.loadResources(r => r === resource));
map.on('load:resources', resources => resources.forEach(r => r.auto()));
map.on('resolve:image', image => document.body.append(image));


class Info extends Node2D {
	public self!: MainScene;
	protected async _init(): Promise<void> { this.draw_distance = Math.INF; }
	protected _ready(): void { this.zIndex = 10000; }

	protected _draw({ ctx }: Viewport): void {
		for(const object of map.extra_objects) {
			const api = map.getApi(object.link_id);
			if(!api || !api.draw) continue; 

			const pos = object.position.buf();

			ctx.translate(pos.x, pos.y);
			ctx.beginPath();

			api.draw({ ctx } as Viewport);

			ctx.translate(-pos.x, -pos.y);
		}


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
	}
}


let touch: Touch;
let isDrawing: boolean = false;

export class MainScene extends Control {
	protected static async _load(scene: typeof this): Promise<void> {
		await Promise.all([
			super._load(scene)
		]);
	}

	public anims: Animation[] = [];
	private sensor_camera = new SensorCamera();

	public TREE() { return {
		Camera2D,
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
	public get $gridMap() { return this.get('GridMap'); }
	public get $buttonKeyboard() { return this.get('ButtonKeyboard'); }
	public get $info() { return this.get('Info'); }
	public get $players() { return this.get('PlayerContainer'); }
	public get $texts() { return this.get('TextObjectContainer'); }

	public player!: Player;

	protected async _init(this: MainScene): Promise<void> {
		socket.on('resource:new', data => map.createResource(data));

		await super._init();

		// canvas.append($editor);

		this.$players.c.on('create', item => item.alpha = 0.5);


		socket.emit('natify:init', ({
			id: socket.id!,
			username: user.name!,
			color: `hsl(${Math.randomInt(0, 359)}, ${Math.randomInt(70, 90)}%, ${Math.randomInt(70, 90)}%)`,
			position: viewport.position.buf(),
			rotation: viewport.rotation,
			size: viewport.size.buf(),
			scale: viewport.scale.buf()
		}));

		await Promise.all([
			this.$players.setup_socket(socket),
			this.$texts.setup_socket(socket),

			new Promise<void>(res => socket.on('map:init', async data => {
				res(await map.await_emit('server#init', data));
			}))
		]);


		this.player = this.$players.c.items.find(i => i.id === socket.id)!;


		socket.on('code:sync', async (ownerID, code) => {
			const env = {
				map, kii
			};
			const api = this;

			try {
				await codeShell<() => Promise<unknown>>(code, env, {
					insulate: false,
					async: true,
					source: 'server:code'
				}).call(api).then(res => {
					console.log(`ownerID: [${ownerID}] server:code res`, res);
					// cb(res);
				});
			} catch(err) { console.error(err); }
		});


		this.$camera.viewport = viewport;
		this.$camera.current = true;
		this.$camera.on('PreProcess', dt => !isDrawing && this.sensor_camera.update(dt, touches, this.$camera));

		this.$gridMap.size.set(viewport.size.buf().inc(2));
		this.$gridMap.tile.set(30, 30);

		this.$info.self = this;

		// const k = kii;
		// this.$buttonKeyboard.text = k.isFocus ? 'Hide' : 'Keyboard';
		// k.on('focus', () => this.$buttonKeyboard.text = 'Hide');
		// k.on('blur', () => this.$buttonKeyboard.text = 'Keyboard');
		//
		// this.$buttonKeyboard.on('click', () => {
		// 	if(k.isFocus) {
		// 		this.$buttonKeyboard.text = 'Hide';
		// 		k.blur();
		// 	} else {
		// 		this.$buttonKeyboard.text = 'Keyboard';
		// 		k.focus();
		// 	}
		// });


		const bCreate = this.get('ButtonCreate');
		bCreate.text = 'Create';

		bCreate.on('click', async () => {
			const code = `
				const player = this.$players.c.getById('${this.player.id}');
				if(!player) return;

				const main = map.create(kii.input.value, {});

				map.spawn(main.id, player.position.buf(), {});
			`;

			socket.emit('code:spawn', socket.id!, code);

			// if(this.awaitor !== bCreate) {
			// 	this.sckip = 1;
			//
			// 	this.awaitor = bCreate;
			// 	this.mode = 'draw';
			//
			// 	this.awaitor.alpha = 0.5;
			// } else {
			// 	this.awaitor.alpha = 1;
			//
			// 	this.sckip = 1;
			//
			// 	this.awaitor = null;
			// 	this.mode = null;
			// }
		});


		// this.$gridMap.tile.set(this.$map.map.size);
		// this.$gridMap.size.set(this.$map.map.size.buf().inc(this.$map.map.tile_size));
		// this.$gridMap.offset.set(this.$gridMap.size.buf().div(2));

		viewport.on('resize', size => {
			const s = size.buf().div(2);

			this.$buttonKeyboard.position.set(s.buf().invert().add(100, 50));
			bCreate.position.set(+(s.x - 100), -(s.y - 50));
		}).call(viewport, viewport.size);
	}


	public sckip: number = 0;
	public mode: 'await_position' | 'draw' | null = null;
	public awaitor: Button | null = null;
	public '@cell:set' = new Event<MainScene, [i: number, cell: Vector2, pos: Vector2]>(this);

	protected _ready(this: MainScene): void {
		this.processPriority = 1000;


		this.$camera.addChild(this.removeChild(this.$buttonKeyboard.name, true));
		this.$camera.addChild(this.removeChild(this.get('ButtonCreate').name, true));

/*
		this.on('cell:set', async (i, cell, pos) => {
			const tile = getCurrentTile();
			const clayer = getCurrentLayer();
			if(!clayer || clayer.type !== 'tilelayer') return alert('d');

			clayer.data[i] = tile?.id || 0;

			const { name } = clayer;

			socket.emit('edit:map', socket.id!, {
				layers: [{ name, data: [
					[i, clayer.data[i]]
				] }]
			});
		});
*/

		// this.on('input:click', async ({ pos }) => {
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
		// keymapperOfActions.update(dt);

/*
		(() => {
			if(this.awaitor && (touch = touches.findTouch() || touch)) {
				if(touch.isTimeDown(300)) isDrawing = true;

				if(!touch.isClick() && !isDrawing) return;

				let pos = viewport.transformFromScreenToViewport(touch.pos.buf());

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


		socket.volatile.emit('player:edit', this.player.id, {
			id: socket.id!,
			username: user.name,
			color: this.player.color,
			rotation: this.player.rotation,
			position: this.player.position.buf(),
			scale: this.player.scale.buf(),
			size: this.player.size.buf()
		});


		for(const anim of this.anims) anim.tick(dt);
	}
}
