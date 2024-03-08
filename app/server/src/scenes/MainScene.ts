/*
// TODO: Update containers (Player & locals) _deletedItems

// NOTE: частичное совпадениe
// NOTE: консоль
import fs from 'node:fs';

import { Vector2 } from 'ver/Vector2';
import { Event } from 'ver/events';
import { math as Math } from 'ver/helpers';
import { MapParser } from 'ver/MapParser';

import { Node } from 'engine/scenes/Node.js';
import { Player, PlayerContainer } from './Player.js';
import { TextObjectContainer } from './TextObject.js';
import { Bullet, BulletContainer } from './Bullet.js';
import { ItemContainer } from './Item.js';

import { b2BodyDef, b2FixtureDef, b2Shapes, b2Vec2 } from 'engine/modules/Box2DWrapper.js';
import { PIXEL_DENSITY, io, physicsBox2DSystem } from '../main.js';


const PLAYERS_TAEM = 1;


export class MainScene extends Node {
	public TREE() { return {
		PlayerContainer,
		TextObjectContainer,
		BulletContainer,
		ItemContainer
	}}


	// aliases
	public get $playersC() { return this.get('PlayerContainer'); }
	public get $textsC() { return this.get('TextObjectContainer'); }
	public get $bulletsC() { return this.get('BulletContainer'); }
	public get $itemsC() { return this.get('ItemContainer'); }


	protected async _init(this: MainScene): Promise<void> {
		await super._init();

		const MAP_SCALE = 2;
		const BARRIER_ID = 2;

		const TILE_WIDTH = 16/PIXEL_DENSITY * MAP_SCALE;
		const TILE_HEIGHT = 16/PIXEL_DENSITY * MAP_SCALE;


		const map = new MapParser.Map(JSON.parse(fs.readFileSync('./src/maps/battle-map-towers.json', { encoding: 'utf8' })));
		const layer = map.layers.find(i => i.name === 'Barrier')! as MapParser.TileLayer;

		const map_offset = new Vector2().set(layer.width, layer.height).inc(TILE_WIDTH, TILE_HEIGHT).div(2).invert();

		const b2bodyDef = new b2BodyDef();
		const b2fixtureDef = new b2FixtureDef();

		b2bodyDef.type = 1;

		b2fixtureDef.density = 1;
		b2fixtureDef.friction = 0.2;
		b2fixtureDef.restitution = 0.9;

		const data = {};


		if(layer.type === 'tilelayer') {
			for(let i = 0; i < layer.data.length; i++) {
				const id = layer.data[i];
				if(id !== BARRIER_ID) continue;

				const x = i % layer.width;
				const y = Math.floor(i / layer.width);
				const pos = new Vector2(x, y).inc(TILE_WIDTH, TILE_HEIGHT).add(map_offset);


				b2fixtureDef.userData = b2bodyDef.userData = data;

				b2bodyDef.position.Set(pos.x + TILE_WIDTH/2, pos.y + TILE_HEIGHT/2);

				const shape = new b2Shapes.b2PolygonShape();
				shape.SetAsBox(TILE_WIDTH/2, TILE_HEIGHT/2);

				b2fixtureDef.shape = shape;


				const b2body = physicsBox2DSystem.world.CreateBody(b2bodyDef);
				const b2fixture = b2body.CreateFixture(b2fixtureDef);
			}
		}


		const items_names = [
			'apple',
			// 'arrow',
			// 'bread',
			// 'beef_cooked',
			// 'book_written',
			// 'cookie'
		];

		setInterval(() => {
			for(const item of this.$itemsC.c.items) item.position.moveTo(Vector2.ZERO, 50);

			const len = 0 - this.$itemsC.c.items.length;
			// const len = this.$itemsC.c.max_items - this.$itemsC.c.items.length;

			for(let i = 0; i < len; i++) {
				const name = items_names[Math.randomInt(0, items_names.length-1)];

				const C = 500;

				this.$itemsC.c.create({
					id: Math.random().toString(),
					rotation: Math.randomFloat(-Math.PI, Math.PI),
					position: new Vector2(Math.randomInt(-C, C), Math.randomInt(-C, C)),
					radius: 16/2,
					item_id: name,
					item_name: name,
					item_label: name,
					item_count: 1
				});
			}
		}, 10000);


		this.$playersC.c.on('create', (_, data) => io.emit('player:create', data));
		this.$playersC.c.on('deleted', id => io.emit('player:delete', id));

		this.$textsC.c.on('create', (_, data) => io.emit('text:create', data));
		this.$textsC.c.on('deleted', id => io.emit('text:delete', id));

		this.$bulletsC.c.on('create', (_, data) => io.emit('bullet:create', data));
		this.$bulletsC.c.on('deleted', id => io.emit('bullet:delete', id));

		this.$itemsC.c.on('create', (_, data) => io.emit('item:create', data));
		this.$itemsC.c.on('deleted', id => io.emit('item:delete', id));


		io.on('connection', async socket => {
			socket.on('disconnecting', reason => this.$playersC.c.delete(socket.id!));


			const C = 500/PIXEL_DENSITY;
			const player = await this.$playersC.create({
				id: socket.id!,
				team: PLAYERS_TAEM,
				position: new Vector2(Math.randomInt(-C, C), Math.randomInt(-C, C)),
				velosity: new Vector2(),
				rotation: 0,
				size: new Vector2(1, 1),
				color: `rgb(${Math.randomInt(0, 255)}, ${Math.randomInt(0, 255)}, ${Math.randomInt(0, 255)})`,
				HP: 100,
				bullets: 0
			}, socket);

			socket.on('natify:init', () => {
				socket.emit('players:init', this.$playersC.getSocketData());
				socket.emit('texts:init', this.$textsC.getSocketData());
				socket.emit('bullets:init', this.$bulletsC.getSocketData());
				socket.emit('items:init', this.$itemsC.getSocketData());
			});


			socket.on('control:left-joystick', ({ angle, value }) => {
				player.joystick_data.value = value;
				player.joystick_data.angle = angle + player.rotation;
			});

			socket.on('control:player-rotation', data => player.target_rotation = data.rotation);


			socket.on('action:text', ({ text, ownerID }) => {
				// TODO: add text object
				console.log(`[${socket.id}] say: ${text}`);

				this.$textsC.c.create({
					id: Math.random().toString(),
					author: player.name,
					text,
					position: player.position,
					rotation: player.rotation
				});
			});


			socket.on('control:shoot', ({ shooterID }) => {
				const rot = player.rotation - Math.PI/2;

				this.$bulletsC.c.create({
					id: Math.random().toString(),
					shooterID,
					position: player.position.div(PIXEL_DENSITY),
					rotation: rot,
					velosity: new Vector2().add(player.velosity).moveAngle(0.5, rot).div(PIXEL_DENSITY),
					radius: 0.2,
					damage: 10
				});

				player.socket.emit('api:vibrate', [30])
			});
		});


		this.$playersC.on('PreSolve', c => {
			const a = c.GetFixtureA().GetUserData();
			const b = c.GetFixtureB().GetUserData();

			let player: Player | null = null;
			let bullet: Bullet | null = null;

			if(a instanceof Player) {
				player = a;
				if(b instanceof Bullet) bullet = b;
			} else if(b instanceof Player) {
				player = b;
				if(a instanceof Bullet) bullet = a;
			}

			if(player && bullet) {
				if(bullet.shooterID === player.id) c.SetEnabled(false);
				else {
					player.HP -= bullet.damage;
					physicsBox2DSystem.once('end', () => this.$bulletsC.c.delete(bullet!.id));
				}
			}
		});


		this.$playersC.c.on('create', player => {
			player.on('damage', (damage, HP) => {
				player.socket.emit('api:vibrate', [damage*3, damage]);
			})

			player.on('HP=0', () => {
				player.socket.emit('api:vibrate', [100, 50, 200]);

				physicsBox2DSystem.once('end', () => {
					player.b2body!.SetPosition(new b2Vec2(Math.randomInt(-10, 10), Math.randomInt(-10, 10)));
					player.HP = 100;
				});
			});
		});
	}

	protected _process(this: MainScene, dt: number): void {
		for(const item of this.$itemsC.c.items) {
			for(const player of this.$playersC.c.items) {
				if(player.position.getDistance(item.position) < 20) {
					if(item.item_name === 'apple') player.HP += 20;
					else continue;

					this.$itemsC.c.delete(item.id);
				}
			}
		}

		for(const player of this.$playersC.c.items) player.b2_angle = player.target_rotation;


		io.emit('players:update', this.$playersC.getSocketData());
		io.emit('bullets:update', this.$bulletsC.getSocketData());
		io.emit('items:update', this.$itemsC.getSocketData());
	}
}
*/
