import { Vector2 } from 'ver/Vector2';
import { Event, EventDispatcher } from 'ver/events';
import { math as Math } from 'ver/helpers';

import { Container } from 'engine/modules/Container.js';
import { Node } from 'engine/scenes/Node.js';
import type { IItemData } from 'shared/types/mapeditor.js';


type IData = IItemData;

export class Item extends EventDispatcher implements IData {
	public id!: string;
	public life_timer: number = 5 * 60*1000;

	public item_id!: string;
	public item_name!: string;
	public item_label!: string;
	public item_count!: number;
	public radius!: number;

	public rotation: number = 0;
	public position = new Vector2();

	public getSocketData(): IData { return {
		id: this.id,
		position: this.position,
		rotation: this.rotation,
		radius: this.radius,
		item_id: this.item_id,
		item_name: this.item_name,
		item_label: this.item_label,
		item_count: this.item_count
	}; }
}

export class ItemContainer extends Node {
	public c = new Container<typeof Item, IData>(Item, 100, (item, data) => {
		this.c.assign(item, data);
		item.position.set(data.position);
	});


	public getSocketData(): IData[] { return this.c.items.map(i => i.getSocketData()); }

	protected _process(dt: number): void {
		for(const item of this.c.items) {
			item.life_timer -= dt;
			if(item.life_timer <= 0) this.c.delete(item.id);
		}
	}
}
