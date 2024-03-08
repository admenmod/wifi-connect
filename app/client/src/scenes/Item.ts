import { Event } from 'ver/events';
import { Vector2 } from 'ver/Vector2';
import { math as Math } from 'ver/helpers';
import { Loader } from 'ver/Loader';
import type { Viewport } from 'ver/Viewport';
import { Container } from 'engine/modules/Container.js';
import { Node2D } from 'engine/scenes/Node2D.js';
import { Sprite } from 'engine/scenes/Sprite.js';
import { IItemData } from 'shared/types/transfer.js';


type IData = IItemData;

export class Item extends Sprite implements IData {
	public id!: string;
	public item_id!: string;
	public item_name!: string;
	public item_label!: string;
	public item_count!: number;
	public radius!: number;

	protected async _init(): Promise<void> {
		await super._init();
		await this.load(`assets/img/items/${this.item_name}.png`);
	}

	protected _draw(viewport: Viewport): void {
		const { ctx, scale } = viewport;

		const radius = this.radius*2 * scale.x;

		ctx.beginPath();
		ctx.globalAlpha = 0.2;

		const gradient = ctx.createRadialGradient(0, 0, this.radius, 0, 0, radius);
		gradient.addColorStop(0, '#333377');
		gradient.addColorStop(1, '#7777ee');

		ctx.fillStyle = gradient;
		ctx.arc(0, 0, radius, 0, Math.TAU);
		ctx.fill();

		ctx.globalAlpha = 1;

		ctx.beginPath();
		ctx.globalAlpha = 1;
		ctx.shadowOffsetX = 5;
		ctx.shadowOffsetY = 5;
		ctx.shadowBlur = 5;
		ctx.shadowColor = '#222222';

		super._draw(viewport);
	}
}


export class ItemContainer extends Node2D {
	public '@server#init' = new Event<ItemContainer, [collection: IData[]]>(this);
	public '@server#create' = new Event<ItemContainer, [data: IData]>(this);
	public '@server#delete' = new Event<ItemContainer, [id: string]>(this);
	public '@server#update' = new Event<ItemContainer, [collection: IData[]]>(this);


	protected static async _load(scene: typeof this): Promise<void> {
		await super._load(scene);
		await Item.load();
	}


	public c = new Container<typeof Item, IItemData>(Item, 100, async (item, data, isNewItem) => {
		this.c.assign(item, data);
		item.position.set(data.position);

		item.visible = true;

		if(isNewItem) await item.init();
		else await item.load(`./assets/img/items/${item.item_name}.png`);
	});


	constructor() {
		super();

		this.draw_distance = 1000;

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
			if(!item) throw new Error(`unknown item [${collection.indexOf(data)}](${data.id})`);

			this.c.setup(item, data);
		}
	}


	protected _process(dt: number): void {
		for(const item of this.c.items) item.process(dt);
	}

	protected _render(viewport: Viewport): void {
		super._render(viewport);
		for(let i = 0; i < this.c.items.length; i++) this.c.items[i].render(viewport);
	}
}


	//
	// protected _draw(viewport: Viewport): void {
	// 	const { ctx, scale } = viewport;
	//
	// 	const radiusA = 8;
	// 	const radiusB = radiusA*2 * scale.x;
	//
	// 	for(const item of this.c.items) {
	// 		const pos = item.position.buf();
	// 		const image = this.getImage(item.item_name);
	//
	// 		ctx.beginPath();
	// 		ctx.globalAlpha = 0.2;
	//
	// 		const gradient = ctx.createRadialGradient(pos.x, pos.y, radiusA, pos.x, pos.y, radiusB);
	// 		gradient.addColorStop(0, '#333377');
	// 		gradient.addColorStop(1, '#7777ee');
	//
	// 		ctx.fillStyle = gradient;
	// 		ctx.arc(pos.x, pos.y, radiusB, 0, Math.TAU);
	// 		ctx.fill();
	//
	//
	// 		ctx.beginPath();
	// 		ctx.globalAlpha = 1;
	// 		// ctx.shadowOffsetX = 5;
	// 		// ctx.shadowOffsetY = 5;
	// 		// ctx.shadowBlur = 5;
	// 		// ctx.shadowColor = '#222222';
	// 		if(image) ctx.drawImage(image, pos.x-radiusA, pos.y-radiusA, 20, 20);
	// 	}
	// }
