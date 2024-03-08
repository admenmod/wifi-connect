import { Vector2 } from 'ver/Vector2';
import { Event } from 'ver/events';
import { math as Math } from 'ver/helpers';
import type { Viewport } from 'ver/Viewport';

import { Container } from 'engine/modules/Container.js';
import { Node2D } from 'engine/scenes/Node2D.js';
import { Sprite } from 'engine/scenes/Sprite.js';

import type { IPlayerData } from 'shared/types/transfer.js';


type IData = IPlayerData;


export class Player extends Sprite implements IData {
	public id: string = Math.random().toString();
	public team: number = 0;
	public username: string = '';

	public velosity = new Vector2();

	public size = new Vector2(1, 1);
	public color: string = '#000000';

	public HP!: number;
	public bullets!: number;


	public TREE() { return {
		Body: Sprite
	}}

	public get $body() { return this.get('Body'); }


	protected async _init(this: Player): Promise<void> {
		await super._init();

		await this.$body.load('./assets/img/shooter.png');
		this.$body.scale.inc(0.2);
		this.$body.offset_angle -= Math.PI/2;


		this.$body.on('PreRender', ({ ctx }) => {
			ctx.save();

			const scale = this.$body.globalScale;
			const rot = this.$body.offset_angle
			ctx.rotate(-rot);
			ctx.scale(1/scale.x, 1/scale.y);


			const radiusA = this.size.x;
			const radiusB = radiusA*1.5;

			ctx.beginPath();
			ctx.globalAlpha = 0.2;

			const gradient = ctx.createRadialGradient(0, 0, radiusA, 0, 0, radiusB);
			gradient.addColorStop(0, '#333333');
			gradient.addColorStop(1, this.color);
			// gradient.addColorStop(1, '#7777ee');

			ctx.fillStyle = gradient;
			ctx.arc(0, 0, radiusB, 0, Math.TAU);
			ctx.fill();

			ctx.restore();

			const shadow = new Vector2().moveAngle(5, -this.globalRotation);

			ctx.beginPath();
			ctx.globalAlpha = 1;
			ctx.shadowOffsetX = shadow.x;
			ctx.shadowOffsetY = shadow.y;
			ctx.shadowBlur = 5;
			ctx.shadowColor = '#000000';
		});

		this.$body.on('PostRender', ({ ctx }) => {
			ctx.shadowOffsetX = 0;
			ctx.shadowOffsetY = 0;
			ctx.shadowBlur = 0;
			ctx.shadowColor = '#000000';

			ctx.save();

			const scale = this.$body.globalScale;
			const rot = this.$body.offset_angle;
			ctx.rotate(-rot);
			ctx.scale(1/scale.x, 1/scale.y);

			ctx.beginPath();
			ctx.globalAlpha = 1;

			ctx.textAlign = 'center';
			ctx.textBaseline = 'middle';

			ctx.font = `20px Arial`;
			ctx.fillStyle = '#33ee33';
			ctx.fillText(this.HP.toString(), 0, this.size.y/2 + 20);

			ctx.restore();
		});
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
			for(const child of item.getChildrenOf(Node2D)) child.render(viewport);
		}
	}
}
