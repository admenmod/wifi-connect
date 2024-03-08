import { Vector2 } from 'ver/Vector2';
import { Event } from 'ver/events';

import { Container } from 'engine/modules/Container.js';
import { Node } from 'engine/scenes/Node.js';
import type { ITextData } from 'shared/types/mapeditor.js';


type IData = ITextData;


export class TextObject extends Node implements IData {
	public id!: string;
	public author!: string;
	public text: string = '';
	public position = new Vector2();
	public rotation: number = 0;
	public life_timer: number = 3000;

	public getSocketData(): IData {
		return {
			id: this.id,
			author: this.author,
			text: this.text,
			position: this.position,
			rotation: this.rotation
		};
	}
}


export class TextObjectContainer extends Node {
	protected static async _load(scene: typeof this): Promise<void> {
		await super._load(scene);

		await TextObject.load();
	}


	public c = new Container<typeof TextObject, IData>(TextObject, 30, async (item, data) => {
		this.c.assign(item, data);
		item.position.set(data.position);

		if(!item.isInited) await item.init();
	});


	public getSocketData(): IData[] { return this.c.items.map(i => i.getSocketData()); }


	protected _process(dt: number): void {
		for(const item of this.c.items) {
			item.life_timer -= dt;
			if(item.life_timer <= 0) this.c.delete(item.id);

			item.process(dt);
		}
	}
}
