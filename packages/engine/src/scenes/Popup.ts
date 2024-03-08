import { Vector2 } from 'ver/Vector2';
import type { Viewport } from 'ver/Viewport';
import { Node2D } from './Node2D.js';


export class Popup extends Node2D {
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


export class PopupContainer extends Node2D {
	public popups: Popup[] = [];


	public addPopap(popup: Popup): void {
		this.popups.push(popup);
	}

	public createPopap(text: string, pos: Vector2) {
		const popup = new Popup();
		popup.text = text;
		popup.position.set(pos);

		popup.init();

		this.addPopap(popup);
	}


	protected _process(dt: number): void {
		for(let i = 0, len = this.popups.length; i < len; i++) {
			this.popups[i].process(dt);
			const l = this.popups.findIndex(i => i.alpha <= 0);

			if(~l) {
				this.popups.splice(l, 1);
				i--;
				len--;
			}
		}
	}

	protected _render(viewport: Viewport): void {
		super._render(viewport);
		for(let i = 0; i < this.popups.length; i++) this.popups[i].render(viewport);
	}
}
