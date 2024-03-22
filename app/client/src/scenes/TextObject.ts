import { Vector2 } from 'ver/Vector2';
import { Event } from 'ver/events';
import type { Viewport } from 'ver/Viewport';

import { Container } from 'engine/modules/Container.js';
import { Node2D } from 'engine/scenes/Node2D.js';
import type { ITextData } from 'shared/types/transfer.js';

import { socket } from 'src/socket.js';


type IData = ITextData;


export class TextObject extends Node2D implements IData {
	public id: string = '';
	public author: string = '';
	public text: string = '';
	public size = new Vector2(1, 1);
	public timeout: number = 3000;
	private _catchTextMetrics: TextMetrics | null = null;


	protected _process(dt: number): void {
		if(this.timeout < 0) this.alpha -= 0.02;
		else this.timeout -= dt;
	}

	protected _draw({ ctx }: Viewport): void {
		ctx.globalAlpha = this.alpha;

		ctx.fillStyle = '#222222';
		ctx.fillRect(-this.size.x/2, -this.size.y/2, this.size.x, this.size.y);
		ctx.strokeStyle = '#995577';
		ctx.strokeRect(-this.size.x/2, -this.size.y/2, this.size.x, this.size.y);

		ctx.fillStyle = '#eeeeee';
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.font = '15px arkhip';

		if(!this._catchTextMetrics) {
			ctx.font = '15px arkhip';
			const m = ctx.measureText(this.text);

			this.size.set(m.width+40, 30);
		}

		ctx.fillText(this.text, 0, 0);
	}
}


export class TextObjectContainer extends Node2D {
	protected static async _load(scene: typeof this): Promise<void> {
		await Promise.all([
			super._load(scene),
			TextObject.load()
		]);
	}


	public '@server#init' = new Event<TextObjectContainer, [collection: IData[]]>(this);
	public '@server#create' = new Event<TextObjectContainer, [data: IData]>(this);
	public '@server#delete' = new Event<TextObjectContainer, [id: string]>(this);
	public '@server#update' = new Event<TextObjectContainer, [collection: IData[]]>(this);


	public c = new Container<typeof TextObject, IData>(TextObject, 30, async (item, data) => {
		this.c.assign(item, data);
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


	protected async _init(this: TextObjectContainer): Promise<void> {
		await super._init();

		socket.on('text:create', (...args) => this.emit('server#create', ...args));
		socket.on('text:delete', (...args) => this.emit('server#delete', ...args));
	}


	public async setup_socket(this: TextObjectContainer, socket: socket) {
		return new Promise<void>(res => socket.on('texts:init', async (...args) => {
			res(await this.await_emit('server#init', ...args));
		}));
	}


	public update(collection: IData[]) {
		for(const data of collection) {
			const item = this.c.items.find(i => i.id === data.id);
			if(!item) throw new Error(`unknown text (id: ${data.id})`);

			this.c.setup(item, data);
		}
	}


	protected _process(dt: number): void {
		for(const item of this.c.items) {
			item.process(dt);

			if(item.alpha <= 0) this.c.delete(item.id);
		}
	}

	protected _render(viewport: Viewport): void {
		super._render(viewport);
		for(const item of this.c.items) item.render(viewport);
	}
}
