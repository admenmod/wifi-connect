import type { Viewport } from 'ver/Viewport';
import { Vector2 } from 'ver/Vector2';
import { math as Math } from 'ver/helpers';

import { Node2D } from '../Node2D.js';


export class GridMap extends Node2D {
	public scroll = new Vector2();

	public tile = new Vector2(50, 50);
	public tile_scale = new Vector2(1, 1);
	public tile_offset = new Vector2(0, 0, (x, y) => {
		this.tile_offset[0] = Math.clamped(-this.tile.x, x, this.tile.x);
		this.tile_offset[1] = Math.clamped(-this.tile.y, y, this.tile.y);
	});

	public size: Vector2 = new Vector2(0, 0, (x, y) => this.draw_distance = this.size.module);
	public scale = new Vector2(1, 1);
	public offset = new Vector2();

	public padding = new Vector2(5, 5);

	public lineWidth: number = 0.2;
	public lineColor: string = '#ffffff';

	public coordinates: boolean = false;
	public fontSize: number = 10;
	public fontUnit: string = 'px';
	public fontFamily: string = 'monospace';

	constructor() {
		super();

		this.size.set(350, 200);
	}

	protected _draw({ ctx, scale }: Viewport): void {
		const size = this.size.buf();
		const zero = size.buf().div(2).invert().add(this.offset);
		const tile = this.tile.buf().inc(this.tile_scale);

		const scroll = this.scroll.buf().add(this.tile_offset.buf().inc(this.tile_scale)).add(this.offset);
		const counts = size.buf().div(tile).div(2).add(1).ceilToZero();


		// clip area
		ctx.beginPath();
		ctx.rect(zero.x, zero.y, size.x, size.y);
		ctx.clip();


		// draw grid
		ctx.beginPath();
		if(this.lineWidth < 1) {
			ctx.globalAlpha = this.lineWidth;
			ctx.lineWidth = 1 * scale.x;
		} else ctx.lineWidth = this.lineWidth * scale.x;

		ctx.strokeStyle = this.lineColor;


		for(let dx = -counts.x; dx < counts.x; dx++) {
			const x = dx*tile.x - scroll.x%tile.x + this.offset.x;
			ctx.moveTo(x, zero.y);
			ctx.lineTo(x, zero.y + size.y);
		}

		for(let dy = -counts.y; dy < counts.y; dy++) {
			const y = dy*tile.y - scroll.y%tile.y + this.offset.y;
			ctx.moveTo(zero.x, y);
			ctx.lineTo(zero.x + size.x, y);
		}

		ctx.stroke();


		// area stroke
		ctx.beginPath();
		ctx.strokeStyle = '#44ff44';
		ctx.strokeRect(zero.x, zero.y, size.x, size.y);


		// coordinates
		if(this.coordinates) {
			const pad = this.padding;

			ctx.beginPath();
			ctx.fillStyle = '#ffff00';
			ctx.globalAlpha = 0.4;
			ctx.font = `${this.fontSize * scale.y}${this.fontUnit} ${this.fontFamily}`;
			ctx.textAlign = 'left';
			ctx.textBaseline = 'top';

			for(let dx = -counts.x; dx < counts.x; dx++) {
				const coord = (Math.floorToZero(scroll.x/tile.x) + dx) * tile.x;
				ctx.fillText(coord.toFixed(0), (dx*tile.x - scroll.x%tile.x) + (this.offset.x+pad.x), zero.y+pad.y);
			}

			for(let dy = -counts.y; dy < counts.y; dy++) {
				const coord = (Math.floorToZero(scroll.y/tile.y) + dy) * tile.y;
				ctx.fillText(coord.toFixed(0), zero.x+pad.x, (dy*tile.y - scroll.y%tile.y) + (this.offset.y+pad.y));
			}
		}
	}
}
