/*
import { Vector2 } from 'ver/Vector2';
import { Event } from 'ver/events';
import { math as Math } from 'ver/helpers';
import { Animation } from 'ver/Animation';
import type { Viewport } from 'ver/Viewport';
import { codeShell } from 'ver/codeShell';
import { KeyboardInputInterceptor } from 'ver/KeyboardInputInterceptor';
import { KeymapperOfActions, MappingsMode } from 'ver/KeymapperOfActions';
import { Loader } from 'ver/Loader';
import { MapParser } from 'ver/MapParser';

import { SensorCamera } from 'engine/modules/SensorCamera.js';
import { GridMap } from 'engine/scenes/gui/GridMap.js';
import { Node2D } from 'engine/scenes/Node2D.js';
import { Camera2D } from 'engine/scenes/Camera2D.js';
import { SystemInfo } from 'engine/scenes/gui/SystemInfo.js';
import { Sprite } from 'engine/scenes/Sprite.js';
import { Joystick } from 'engine/scenes/gui/Joystick.js';
import { Button } from 'engine/scenes/gui/Button.js';

import { type Player, PlayerContainer } from './Player.js';
import { TextObjectContainer } from './TextObject.js';
import { BulletContainer } from './Bullet.js';
import { ItemContainer } from './Item.js';

import { canvas, gm, touches } from '../global.js';


const MAP_SCALE = 2;


class Info extends Node2D {
	public text: string = '';
	public flame_atlas!: HTMLImageElement;
	public flame_anim!: Animation;

	public frame = { x: 0, y: 0, w: 0, h: 0 };


	public map!: MapParser.Map;
	public layer!: MapParser.TileLayer;

	public map_offset = new Vector2();
	public barrier_image!: HTMLImageElement;


	protected async _init(): Promise<void> {
		this.draw_distance = 10000;

		this.flame_atlas = await Loader.instance().loadImage('./assets/img/flame_atlas.png');

		const self = this;

		this.flame_anim = new Animation(function*() {
			yield 0; while(true) {
				self.frame.y += 1;
				if(self.frame.y >= self.flame_atlas.naturalHeight / self.frame.h) self.frame.y = 0;
				yield 50;
			}
		});

		this.flame_anim.play();


		// this.barrier_image = await Loader.instance().loadImage('./assets/img/blocks/barrier.png');
		//
		// this.map = new MapParser.Map(await fetch('./maps/forest-map.json').then(data => data.json()));
		// this.layer = this.map.layers.find(i => i.name === 'Barrier' && i.type === 'tilelayer') as MapParser.TileLayer;
	}

	protected _ready(): void { this.zIndex = 10000; }
	protected _process(dt: number): void { this.flame_anim.tick(dt); }

	protected _draw({ ctx, size: vsize }: Viewport): void {
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


		ctx.beginPath();
		ctx.globalAlpha = 1;
		const pos = new Vector2();
		const size = new Vector2(16, 16).inc(5);
		this.frame.w = this.frame.h = 16;

		ctx.drawImage(this.flame_atlas,
			this.frame.x, this.frame.y*this.frame.h+1, this.frame.w, this.frame.h,
			pos.x-size.x/2, pos.y-size.y/2, size.x, size.y
		);


		// const TILE_WIDHT = 16*MAP_SCALE;
		// const TILE_HEIGHT = 16*MAP_SCALE;
		//
		// const layer = this.layer;
		//
		// if(layer.type === 'tilelayer') {
		// 	for(let i = 0; i < layer.data.length; i++) {
		// 		const id = layer.data[i];
		// 		if(id !== 12) continue;
		//
		// 		const x = i % layer.width;
		// 		const y = Math.floor(i / layer.width);
		// 		const pos = new Vector2(x, y).inc(TILE_WIDHT, TILE_HEIGHT).add(this.map_offset);
		//
		// 		ctx.globalAlpha = 0.3;
		// 		ctx.drawImage(this.barrier_image, pos.x, pos.y, TILE_WIDHT, TILE_HEIGHT);
		// 	}
		// }


		ctx.resetTransform();

		ctx.beginPath();
		ctx.font = `25px Arial`;
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';

		ctx.lineWidth = 5;
		ctx.strokeStyle = '#002200';
		ctx.strokeText(this.text, vsize.x/2, 50);
		ctx.fillStyle = '#77ee77';
		ctx.fillText(this.text, vsize.x/2, 50);
	}
}


let touch: ReturnType<typeof touches.findTouch>;
let fixCameraRotation: number = 0;

export class MainScene extends Node2D {
	public anims: Animation[] = [];

	private sensor_camera = new SensorCamera();

	private keyboardInputInterceptor!: KeyboardInputInterceptor;
	private keymapperOfActions!: KeymapperOfActions;
	private normal_mode = new MappingsMode('normal');


	public TREE() { return {
		Map: Sprite,
		GridMap,
		ItemContainer,
		BulletContainer,
		PlayerContainer,
		TextObjectContainer,
		SystemInfo,
		Camera2D,
		Joystick,
		ButtonKeyboard: Button,
		ButtonFire: Button,
		Info
	}}

	protected static async _load(scene: typeof this): Promise<void> {
		await Promise.all([
			super._load(scene)
		]);
	}


	// aliases
	public get $map() { return this.get('Map'); }
	public get $gridMap() { return this.get('GridMap'); }

	public get $playersC() { return this.get('PlayerContainer'); }
	public get $textObjectC() { return this.get('TextObjectContainer'); }
	public get $bulletsC() { return this.get('BulletContainer'); }
	public get $itemsC() { return this.get('ItemContainer'); }

	public get $camera() { return this.get('Camera2D'); }
	public get $joystick() { return this.get('Joystick'); }
	public get $buttonKeyboard() { return this.get('ButtonKeyboard'); }
	public get $buttonFire() { return this.get('ButtonFire'); }
	public get $info() { return this.get('Info'); }


	public text: string = '';
	public player!: Player;

	protected async _init(this: MainScene): Promise<void> {
		await super._init();


		gm.socket.on('disconnect', () => location.reload());


		const env = { socket: gm.socket };

		gm.socket.on('code:run', (id, code) => {
			codeShell<(this: typeof env) => Promise<void>>(code, env, {
				async: true,
				insulate: false,
				source: 'server:code'
			}).call(env).then(data => gm.socket.emit('code:return', id, data));
		});


		gm.socket.on('api:vibrate', pattern => navigator.vibrate(pattern));


		gm.socket.emit('natify:init');

		await Promise.all([
			new Promise(res => gm.socket.on('players:init', async (...args) => {
				res(await this.$playersC.await_emit('server#init', ...args));
			})),
			new Promise(res => gm.socket.on('texts:init', async (...args) => {
				res(await this.$textObjectC.await_emit('server#init', ...args));
			})),
			new Promise(res => gm.socket.on('bullets:init', async (...args) => {
				res(await this.$bulletsC.await_emit('server#init', ...args));
			})),
			new Promise(res => gm.socket.on('items:init', async (...args) => {
				res(await this.$itemsC.await_emit('server#init', ...args));
			}))
		]);


		this.player = this.$playersC.c.items.find(i => i.id === gm.socket.id)!;


		gm.socket.on('player:create', (...args) => this.$playersC.emit('server#create', ...args));
		gm.socket.on('player:delete', (...args) => this.$playersC.emit('server#delete', ...args));
		gm.socket.on('players:update', (...args) => this.$playersC.emit('server#update', ...args));

		gm.socket.on('text:create', (...args) => this.$textObjectC.emit('server#create', ...args));
		gm.socket.on('text:delete', (...args) => this.$textObjectC.emit('server#delete', ...args));

		gm.socket.on('bullet:create', (...args) => this.$bulletsC.emit('server#create', ...args));
		gm.socket.on('bullet:delete', (...args) => this.$bulletsC.emit('server#delete', ...args));
		gm.socket.on('bullets:update', (...args) => this.$bulletsC.emit('server#update', ...args));

		gm.socket.on('item:create', (...args) => this.$itemsC.emit('server#create', ...args));
		gm.socket.on('item:delete', (...args) => this.$itemsC.emit('server#delete', ...args));
		gm.socket.on('items:update', (...args) => this.$itemsC.emit('server#update', ...args));


		this.$camera.viewport = gm.viewport;
		this.$camera.current = true;


		const hiddenInput = document.createElement('input');
		hiddenInput.style.position = 'fixed';
		hiddenInput.style.top = '-1000px';
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

		this.normal_mode.register(['t', 't'], mapping => {
			this.keymapperOfActions.setMode(input_mode);
			this.text = '';
		});


		keyboardInputInterceptor.on('keydown:input', e => {
			if(keymapperOfActions.cmaps !== input_mode) return;

			if(e.key === 'Backspace') this.text = this.text.slice(0, -1);
			else if(e.key === 'Escape') {
				keymapperOfActions.setMode(this.normal_mode);
				this.text = '';
			} else if(e.key === 'Enter') {
				keymapperOfActions.setMode(this.normal_mode);
				keyboardInputInterceptor.blur();

				gm.socket.emit('action:text', {
					ownerID: gm.socket.id!,
					text: this.text
				});

				this.text = '';
			} else this.text += e.data;
		}, -10);


		await this.$map.load('./assets/img/battle-map-towers.jpg');
		this.$map.scale.set(MAP_SCALE);

		this.$info.map_offset.set(this.$map.size.buf().inc(this.$map.globalScale).div(2).invert());


		this.$camera.on('PreProcess', dt => {
			if(touch = (touches.findTouch(t => t.x > gm.viewport.size.x/2) || touch)) {
				if(touch.isPress()) fixCameraRotation = this.$camera.rotation;
				this.$camera.rotation = fixCameraRotation + touch.d.x / 100;
				if(touch.isUp()) touch = null;
			}

			if(this.$joystick.touch || touch) {}
			else {
				this.sensor_camera.update(dt, touches, this.$camera);
				this.sensor_camera.isMoveing = false;
				this.sensor_camera.isMovingOnScaling = false;
			}

			this.$camera.position.set(this.player.globalPosition.moveAngle(
				(gm.screen.y/2 - 50) * gm.viewport.scale.x,
				this.$camera.rotation - Math.PI/2
			));

			for(const item of this.$textObjectC.c.items) item.rotation = this.$camera.rotation;
		});


		const onresize = (size: Vector2) => {
			this.$gridMap.size.set(size);
		};

		onresize(gm.viewport.size);

		gm.on('resize', onresize);
	}

	protected _ready(this: MainScene): void {
		this.processPriority = 1000;

		this.$gridMap.tile.set(16*MAP_SCALE);
		this.$gridMap.tile_offset.set(-this.$gridMap.tile.x/2, 0);

		this.$camera.addChild(this.removeChild(this.$joystick.name, true));
		this.$camera.addChild(this.removeChild(this.$buttonKeyboard.name, true));
		this.$camera.addChild(this.removeChild(this.$buttonFire.name, true));


		this.$buttonKeyboard.text = this.keyboardInputInterceptor.isFocus ? 'Hide' : 'Keyboard';
		this.$buttonKeyboard.on('pressed', () => {
			if(this.$buttonKeyboard.text === 'Keyboard') {
				this.$buttonKeyboard.text = 'Hide';
				this.keyboardInputInterceptor.focus();
			} else {
				this.$buttonKeyboard.text = 'Keyboard';
				this.keyboardInputInterceptor.blur();
			}
		});


		this.$buttonFire.text = 'Fire';
		this.$buttonFire.on('pressed', () => {
			gm.socket.emit('control:shoot', { shooterID: gm.socket.id! });
		});


		const size = gm.screen.buf().div(2);
		const cs = 80;
		this.$joystick.position.set(-(size.x-cs), (size.y-cs));
		this.$joystick.angle_offset = Math.PI/2;

		this.$joystick.radius0 -= 10;

		this.$buttonKeyboard.position.set(size.buf().invert().add(100, 50));

		this.$buttonFire.size.set(100, 100);
		this.$buttonFire.position.set(size.x - 100, (size.y - 150));
	}

	protected _process(this: MainScene, dt: number): void {
		this.keymapperOfActions.update(dt);

		this.$gridMap.size.set(this.$camera.size.buf().inc(this.$camera.scale));
		this.$gridMap.position.set(this.$camera.position);


		gm.socket.emit('control:player-rotation', { rotation: this.$camera.rotation });

		gm.socket.emit('control:left-joystick', {
			angle: this.$joystick.angle,
			value: this.$joystick.value
		});

		for(const anim of this.anims) anim.tick(dt);


		this.$info.text = this.text;
	}
}
*/
