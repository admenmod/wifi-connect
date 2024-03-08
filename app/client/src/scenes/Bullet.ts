import { Event } from 'ver/events';
import { Vector2 } from 'ver/Vector2';
import { math as Math } from 'ver/helpers';
import type { Viewport } from 'ver/Viewport';

import { Container } from 'engine/modules/Container.js';
import { Node2D } from 'engine/scenes/Node2D.js';
import { IBulletData } from 'shared/types/transfer.js';


type IData = IBulletData;


export class Bullet extends Node2D implements IData {
	public id!: string;
	public shooterID!: string;
	public velosity = new Vector2();

	public radius!: number;
	public damage!: number;


	protected _draw({ ctx }: Viewport) {
		ctx.beginPath();
		ctx.fillStyle = '#ee1111';
		ctx.arc(0, 0, this.radius, 0, Math.TAU);
		ctx.fill();
	}
}

export class BulletContainer extends Node2D {
	protected static async _load(scene: typeof this): Promise<void> {
		await super._load(scene);
		await Bullet.load();
	}


	public '@server#init' = new Event<BulletContainer, [collection: IData[]]>(this);
	public '@server#create' = new Event<BulletContainer, [data: IData]>(this);
	public '@server#delete' = new Event<BulletContainer, [id: string]>(this);
	public '@server#update' = new Event<BulletContainer, [collection: IData[]]>(this);


	public c = new Container<typeof Bullet, IData>(Bullet, 30, async (item, data) => {
		this.c.assign(item, data);
		item.position.set(data.position);
		item.velosity.set(data.velosity);

		item.visible = true;

		await item.init();
	});


	constructor() {
		super();

		this.c.on('deleteing', item => item.visible = false);

		this['@server#init'].on(async collection => {
			const arr = [];
			for(const data of collection) arr.push(this.c.create(data));
			await Promise.all(arr);
		});
		this['@server#create'].on(data => this.c.create(data));
		this['@server#delete'].on(id => this.c.delete(id));
		this['@server#update'].on(collection => this.update(collection));
	}


	public update(collection: IData[]) {
		for(const data of collection) {
			const item = this.c.getById(data.id);
			if(!item) throw new Error('unknown bullet');

			this.c.setup(item, data);
		}
	}


	protected _process(dt: number): void {
		for(const item of this.c.items) item.process(dt);
	}

	protected _render(viewport: Viewport): void {
		super._render(viewport);
		for(const item of this.c.items) item.render(viewport);
	}
}
