import { Vector2 } from 'ver/Vector2';
import { Event } from 'ver/events';
import type { Viewport } from 'ver/Viewport';
import { Loader } from 'ver/Loader';
import { Node2D } from './Node2D.js';


type Image = InstanceType<typeof Image>;


export class Sprite extends Node2D {
	public image?: Image;

	public get src() { return this.image?.src || ''; }
	public get width() { return this.image?.naturalWidth || 0; }
	public get height() { return this.image?.naturalHeight || 0; }

	public offset = new Vector2();
	public offset_angle: number = 0;
	public size: Vector2 = new Vector2(0, 0, (x, y) => (this.draw_distance = this.globalScale.inc(this.size).module));

	public async load(...args: Parameters<Loader['loadImage']>): Promise<void> {
		this.image = await Loader.instance().loadImage(...args);
		this.size.set(this.width, this.height);
	}

	protected _draw({ ctx }: Viewport): void {
		if(!this.image) return;

		if(this.offset_angle !== 0) ctx.rotate(this.offset_angle);

		ctx.drawImage(this.image,
			this.offset.x - this.size.x/2, this.offset.y -this.size.y/2,
			this.size.x, this.size.y
		);
	}
}
