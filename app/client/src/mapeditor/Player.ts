import { Vector2 } from 'ver/Vector2';
import { Event } from 'ver/events';
import { math as Math, generateImage } from 'ver/helpers';
import type { Viewport } from 'ver/Viewport';

import { Container } from 'engine/modules/Container.js';
import { Node2D } from 'engine/scenes/Node2D.js';

import type { IPlayerData } from 'shared/types/mapeditor.js';


type IData = IPlayerData;


export class Player extends Node2D implements IData {
	public id: string = Math.random().toString();
	public username: string = '';

	public size: Vector2 = new Vector2(1, 1, (x, y) => this.draw_distance = this.size.module);
	public color: string = '#000000';

	private _username_image!: HTMLImageElement | null;

	protected _draw({ ctx, scale }: Viewport): void {
		scale = scale.buf().div(this.globalScale);

		const size = this.size;

		const a = 30*scale.x;

		ctx.lineWidth = 1 * scale.x;
		ctx.strokeStyle = this.color;
		ctx.strokeRect(-size.x/2, -size.y/2, size.x, size.y);

		ctx.beginPath();
		ctx.moveTo(0, -a);
		ctx.lineTo(0, a);
		ctx.moveTo(-a, 0);
		ctx.lineTo(a, 0);
		ctx.stroke();

		if(this._username_image) {
			ctx.drawImage(this._username_image, -size.x/2, -size.y/2,
						  this._username_image.naturalWidth * scale.x,
						  this._username_image.naturalHeight * scale.y);
		} else if(this._username_image !== null) {
			const fontSize = 15;
			ctx.font = `bold ${fontSize}px arkhip`;
			ctx.textAlign = 'left';
			ctx.textBaseline = 'top';
			const { width } = ctx.measureText(this.username);
			const pad = new Vector2(20, 5);

			this._username_image = null;

			generateImage(width + pad.x*2, fontSize + pad.y*2, (ctx, w, h) => {
				ctx.font = `bold ${fontSize}px arkhip`;
				ctx.textAlign = 'left';
				ctx.textBaseline = 'top';

				ctx.fillStyle = this.color;
				ctx.fillRect(0, 0, width + pad.x*2, fontSize + pad.y*2);

				ctx.globalCompositeOperation = 'destination-out';
				ctx.fillText(this.username, pad.x, pad.y);
			}).then(img => this._username_image = img);
		}
	}
}


export class PlayerContainer extends Node2D {
	protected static async _load(scene: typeof this): Promise<void> {
		await Promise.all([
			super._load(scene),
			Player.load()
		]);
	}


	public '@server#init' = new Event<PlayerContainer, [collection: IData[]]>(this);
	public '@server#create' = new Event<PlayerContainer, [data: IData]>(this);
	public '@server#delete' = new Event<PlayerContainer, [id: string]>(this);
	public '@server#update' = new Event<PlayerContainer, [collection: IData[]]>(this);


	public c = new Container<typeof Player, IData>(Player, 10, async (item, data) => {
		this.c.assign(item, data);

		item.size.set(data.size);
		item.scale.set(data.scale);
		item.position.set(data.position);

		item.visible = true;

		if(!item.isInited) await item.init();
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
			if(!item) throw new Error(`unknown player (id: ${data.id})`);

			this.c.setup(item, data);
		}
	}


	protected _process(dt: number): void {
		for(const item of this.c.items) item.process(dt);
	}

	protected _render(viewport: Viewport): void {
		super._render(viewport);

		for(const item of this.c.items) {
			item.render(viewport);
		}
	}
}
