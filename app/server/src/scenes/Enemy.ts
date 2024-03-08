import { Vector2 } from 'ver/Vector2';
import { Event } from 'ver/events';
import { math as Math } from 'ver/helpers';

import { Container } from 'engine/modules/Container.js';
import { Node } from 'engine/scenes/Node.js';
import { PhysicsBox2DItem } from 'engine/scenes/PhysicsBox2DItem.js';
import type { IEnemyData } from 'shared/types/transfer.js';

import { b2Shapes, b2Vec2 } from 'engine/modules/Box2DWrapper.js';
import { PIXEL_DENSITY, physicsBox2DSystem } from '../main.js';

import { MAX_HP_OF_PLAYER } from './Player.js';


export const MAX_BULLET_DAMAGE = MAX_HP_OF_PLAYER;
export const MAX_BULLET_RECOVERY = -MAX_HP_OF_PLAYER;


type IData = IEnemyData;

export class Enemy extends PhysicsBox2DItem implements IData {
	public id!: string;
	public team: number = 0;
	public radius!: number;
	public HP!: number;

	public life_timer: number = 30000;

	public get position() { return Vector2.from(this.b2_position).inc(PIXEL_DENSITY); }
	public get velosity() { return Vector2.from(this.b2_velosity).inc(PIXEL_DENSITY); }
	public get rotation() { return this.b2_angle; }


	public _damage: number = 10;
	public get damage() { return this._damage; }
	public set damage(v) { this._damage = Math.clamped(MAX_BULLET_RECOVERY, v, MAX_BULLET_DAMAGE); }


	protected async _init(): Promise<void> {
		await super._init();

		this.b2bodyDef.type = 2;
		this.b2bodyDef.bullet = true;
		this.b2bodyDef.allowSleep = false;
		this.b2bodyDef.fixedRotation = true;

		const shape = new b2Shapes.b2CircleShape();
		shape.SetRadius(this.radius);

		this.b2fixtureDef.shape = shape;
		this.b2fixtureDef.density = 0.1;
	}


	public getSocketData(): IData { return {
		id: this.id,
		team: this.team,
		position: this.position,
		velosity: this.velosity,
		rotation: this.rotation,
		radius: this.radius * PIXEL_DENSITY,
		HP: this.HP
	}; }
}

export class EnemyContainer extends Node {
	protected static async _load(scene: typeof this): Promise<void> {
		await super._load(scene);
		await Enemy.load();
	}


	public c = new Container<typeof Enemy, IData>(Enemy, 30, async (item, data, isNewItem) => {
		this.c.assign(item, data);

		item.b2body!.SetActive(true);

		if(!item.isInited) {
			await item.init();
			physicsBox2DSystem.add(item);
		}

		item.b2_angle = data.rotation;
		item.b2body!.SetPosition(new b2Vec2(data.position[0], data.position[1]));
		item.b2body!.SetLinearVelocity(new b2Vec2(data.velosity[0], data.velosity[1]));
	});


	constructor() {
		super();

		this.c.on('deleteing', item => {
			item.b2body!.SetActive(false);
		});
	}


	protected _process(dt: number): void {
		for(const item of this.c.items) {
			item.life_timer -= dt;
			if(item.life_timer <= 0) this.c.delete(item.id);

			item.process(dt);
		}
	}
}
