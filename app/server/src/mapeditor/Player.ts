import { Vector2 } from 'ver/Vector2';
import { Event } from 'ver/events';
import { math as Math } from 'ver/helpers';

import { Container } from 'engine/modules/Container.js';
import { Node } from 'engine/scenes/Node.js';
import type { IPlayerData } from 'shared/types/mapeditor.js';

import { type socket, PIXEL_DENSITY, physicsBox2DSystem } from '../main.js';
import { b2ContactImpulse, b2Contacts, b2Manifold, b2Shapes, b2Vec2 } from 'engine/modules/Box2DWrapper.js';


type IData = IPlayerData;


export class Player extends Node implements IData {
	public socket!: socket;

	public id!: string;
	public color!: string;
	public username!: string;

	public size = new Vector2(1, 1);
	public scale = new Vector2(1, 1);
	public position = new Vector2();
	public rotation: number = 0;


	public getSocketData(): IData {
		return {
			id: this.id,
			username: this.username,
			position: this.position.buf(),
			rotation: this.rotation,
			size: this.size.buf(),
			scale: this.scale.buf(),
			color: this.color
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
		item.position.set(data.position);
		item.scale.set(data.scale);
		item.size.set(data.size);

		if(!item.isInited) await item.init();
	});


	protected static async _load(scene: typeof this): Promise<void> {
		await super._load(scene);
		await Player.load();
	}

	protected async _init(this: PlayerContainer): Promise<void> {
	}


	public async create(data: IData, socket: socket) {
		const item = await this.c.create(data);
		item.socket = socket;
		return item;
	}


	public getSocketData(): IData[] { return this.c.items.map(i => i.getSocketData()); }


	protected _process(dt: number): void {
		for(const item of this.c.items) {
			item.process(dt);
		}
	}
}
