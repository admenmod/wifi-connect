import { Vector2 } from 'ver/Vector2';
import { Event } from 'ver/events';
import { math as Math } from 'ver/helpers';

import { Container } from 'engine/modules/Container.js';
import { Node } from 'engine/scenes/Node.js';
import { PhysicsBox2DItem } from 'engine/scenes/PhysicsBox2DItem.js';
import type { IPlayerData } from 'shared/types/transfer.js';

import { type socket, PIXEL_DENSITY, FRICTION, physicsBox2DSystem } from '../main.js';
import { b2ContactImpulse, b2Contacts, b2Manifold, b2Shapes, b2Vec2 } from 'engine/modules/Box2DWrapper.js';


export const MAX_HP_OF_PLAYER = 1000000;

type IData = IPlayerData;


export class Player extends PhysicsBox2DItem implements IPlayerData {
	public '@HP=0' = new Event<Player, []>(this);
	public '@HP=MAX' = new Event<Player, []>(this);

	public '@damage' = new Event<Player, [value: number, HP: number, prev: number]>(this);
	public '@recavery' = new Event<Player, [value: number, HP: number, prev: number]>(this);


	public socket!: socket;

	public id!: string;
	public team: number = 0;
	public color!: string;

	public size = new Vector2(1, 1);
	public get position() { return Vector2.from(this.b2body!.GetPosition()).inc(PIXEL_DENSITY); }
	public get velosity() { return Vector2.from(this.b2body!.GetLinearVelocity()).inc(PIXEL_DENSITY); }
	public get rotation() { return this.b2body?.GetAngle() || 0; }
	public set rotation(v) { this.b2body?.SetAngle(v); }
	public target_rotation: number = 0;


	public _HP: number = 100;
	public get HP() { return this._HP; }
	public set HP(v) {
		const prev = this._HP;
		const diff = v-prev;

		if(this._HP === v || diff === 0) return;
		this._HP = Math.clamped(0, v, MAX_HP_OF_PLAYER);

		if(diff < 0) this['@damage'].emit(-diff, this._HP, prev);
		else if(diff > 0) this['@recavery'].emit(diff, this._HP, prev);

		if(this._HP === 0) this['@HP=0'].emit();
		else if(this._HP === MAX_HP_OF_PLAYER) this['@HP=MAX'].emit();
	}

	public bullets!: number;


	public joystick_data = { value: 0, angle: 0 };


	protected async _init(): Promise<void> {
		await super._init();

		this.b2bodyDef.type = 2;
		this.b2bodyDef.allowSleep = false;
		this.b2bodyDef.fixedRotation = true;

		const shape = new b2Shapes.b2PolygonShape();
		shape.SetAsBox(this.size.x/2, this.size.y/2);

		this.b2fixtureDef.shape = shape;
	}


	protected _process(dt: number): void {
		this.b2_velosity.Multiply(FRICTION);

		this.moveAngle(this.joystick_data.value, this.joystick_data.angle);
	}


	public moveAngle(value: number, angle: number): void {
		value /= 2000

		this.b2_velosity.x += value * Math.cos(angle - Math.PI/2);
		this.b2_velosity.y += value * Math.sin(angle - Math.PI/2);
	}


	public getSocketData(): IPlayerData {
		return {
			id: this.id,
			team: this.team,
			position: this.position,
			velosity: this.velosity,
			rotation: this.rotation,
			size: this.size.buf().inc(PIXEL_DENSITY),
			color: this.color,
			HP: this.HP,
			bullets: this.bullets
		};
	}
}


export class PlayerContainer extends Node {
	public '@BeginContact' = new Event<PlayerContainer, [b2Contacts.b2Contact]>(this);
	public '@EndContact' = new Event<PlayerContainer, [b2Contacts.b2Contact]>(this);
	public '@PostSolve' = new Event<PlayerContainer, [b2Contacts.b2Contact, b2ContactImpulse]>(this);
	public '@PreSolve' = new Event<PlayerContainer, [b2Contacts.b2Contact, b2Manifold]>(this);


	public c = new Container<typeof Player, IData>(Player, 10, async (item, data) => {
		this.c.assign(item, data);
		item.size.set(data.size);

		if(!item.isInited) {
			await item.init();
			physicsBox2DSystem.add(item);
		}

		item.b2body!.SetActive(true);

		item.b2body!.SetAngle(data.rotation);
		item.b2body!.SetPosition(new b2Vec2(data.position[0], data.position[1]));
		item.b2body!.SetLinearVelocity(new b2Vec2(data.velosity[0], data.velosity[1]));
	});


	protected static async _load(scene: typeof this): Promise<void> {
		await super._load(scene);
		await Player.load();
	}

	protected async _init(this: PlayerContainer): Promise<void> {
		const PREORITY = -100;

		this.c.on('deleteing', item => {
			item.b2body!.SetActive(false);
		});

		physicsBox2DSystem.on('BeginContact', c => this.emit('BeginContact', c), PREORITY);
		physicsBox2DSystem.on('EndContact', c => this.emit('EndContact', c), PREORITY);
		physicsBox2DSystem.on('PostSolve', (c, ci) => this.emit('PostSolve', c, ci), PREORITY);
		physicsBox2DSystem.on('PreSolve', (c, m) => this.emit('PreSolve', c, m), PREORITY);
	}


	public async create(data: IPlayerData, socket: socket) {
		const item = await this.c.create(data);
		item.socket = socket;
		return item;
	}


	public getSocketData(): IPlayerData[] { return this.c.items.map(i => i.getSocketData()); }


	protected _process(dt: number): void {
		for(const item of this.c.items) {
			item.process(dt);
		}
	}
}
