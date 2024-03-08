import { Vector2 } from 'ver/Vector2';
import { Event } from 'ver/events';
import { math as Math } from 'ver/helpers';
import { System } from 'ver/System';
import type { Viewport } from 'ver/Viewport';
import type { Touch, TouchesController } from 'ver/TouchesController';

import { Node2D } from './Node2D.js';


export class ControllersSystem extends System<typeof Control> {
	public '@input:press' = new Event<ControllersSystem, [pos: Vector2, local: Vector2, touch: Touch, viewport: Viewport]>(this);
	public '@input:up'    = new Event<ControllersSystem, [pos: Vector2, local: Vector2, touch: Touch, viewport: Viewport]>(this);
	public '@input:move'  = new Event<ControllersSystem, [pos: Vector2, local: Vector2, touch: Touch, viewport: Viewport]>(this);

	public '@input:click'    = new Event<ControllersSystem, [count: number, pos: Vector2, local: Vector2, touch: Touch, viewport: Viewport]>(this);
	public '@input:dblclick' = new Event<ControllersSystem, [pos: Vector2, local: Vector2, touch: Touch, viewport: Viewport]>(this);


	protected _sort(a: Control, b: Control): number { return a.globalzIndex - b.globalzIndex; }
	constructor(public touches: TouchesController, public viewport: Viewport) {
		super(Control);

		const zIndex = () => this._items.sort(this._sort);

		this['@add'].on(item => {
			item.on('change%zIndex', zIndex);
			zIndex();
		});

		this['@removing'].on(item => item.off('change%zIndex', zIndex));


		const fn_touchstart = touches['@touchstart'].on(touch => {
			const pos = viewport.transformFromScreenToViewport(touch.pos.buf());
			const local = viewport.transformToLocal(touch.pos.buf());

			this['@input:press'].emit(pos, local, touch, viewport);

			for(let i = 0; i < this._items.length; i++) {
				this._items[i]['@input:press'].emit(pos, local, touch, viewport);
			}
		});
		const fn_touchend = touches['@touchend'].on(touch => {
			const pos = viewport.transformFromScreenToViewport(touch.pos.buf());
			const local = viewport.transformToLocal(touch.pos.buf());

			this['@input:up'].emit(pos, local, touch, viewport);

			for(let i = 0; i < this._items.length; i++) {
				this._items[i]['@input:up'].emit(pos, local, touch, viewport);
			}
		});
		const fn_touchmove = touches['@touchmove'].on(touch => {
			const pos = viewport.transformFromScreenToViewport(touch.pos.buf());
			const local = viewport.transformToLocal(touch.pos.buf());

			this['@input:move'].emit(pos, local, touch, viewport);

			for(let i = 0; i < this._items.length; i++) {
				this._items[i]['@input:move'].emit(pos, local, touch, viewport);
			}
		});

		const fn_touchclick = touches['@touchclick'].on((count, touch) => {
			const pos = viewport.transformFromScreenToViewport(touch.pos.buf());
			const local = viewport.transformToLocal(touch.pos.buf());

			this['@input:click'].emit(count, pos, local, touch, viewport);

			for(let i = 0; i < this._items.length; i++) {
				this._items[i]['@input:click'].emit(count, pos, local, touch, viewport);
			}
		});
		const fn_touchdblclick = touches['@touchdblclick'].on(touch => {
			const pos = viewport.transformFromScreenToViewport(touch.pos.buf());
			const local = viewport.transformToLocal(touch.pos.buf());

			this['@input:dblclick'].emit(pos, local, touch, viewport);

			for(let i = 0; i < this._items.length; i++) {
				this._items[i]['@input:dblclick'].emit(pos, local, touch, viewport);
			}
		});

		this['@destroyed'].on(() => {
			touches.off('touchstart', fn_touchstart);
			touches.off('touchend', fn_touchend);
			touches.off('touchmove', fn_touchmove);

			touches.off('touchclick', fn_touchclick);
			touches.off('touchdblclick', fn_touchdblclick);
		});
	}

	public update(touches: TouchesController, viewport: Viewport, dt: number) {
		for(let i = 0; i < this._items.length; i++) {
			this._items[i].input(touches, viewport, dt);
		}
	}
}


const PARENT_CACHE = Symbol('PARENT_CACHE');

export class Control extends Node2D {
	public '@input:press' = new Event<Control, [pos: Vector2, local: Vector2, touch: Touch, viewport: Viewport]>(this);
	public '@input:up'    = new Event<Control, [pos: Vector2, local: Vector2, touch: Touch, viewport: Viewport]>(this);
	public '@input:move'  = new Event<Control, [pos: Vector2, local: Vector2, touch: Touch, viewport: Viewport]>(this);

	public '@input:click'    = new Event<Control, [count: number, pos: Vector2, local: Vector2, touch: Touch, viewport: Viewport]>(this);
	public '@input:dblclick' = new Event<Control, [pos: Vector2, local: Vector2, touch: Touch, viewport: Viewport]>(this);


	protected [PARENT_CACHE]: Control[] = [];


	constructor() {
		super();

		const ontree = () => {
			this[PARENT_CACHE].length = 0;
			this[PARENT_CACHE].push(...this.getChainParentsOf(Control));
		};

		ontree();

		this['@tree_entered'].on(ontree);
		this['@tree_exiting'].on(ontree);
	}


	protected _input(touches: TouchesController, viewport: Viewport, dt: number): void {}

	public input(touches: TouchesController, viewport: Viewport, dt: number): void {
		this._input(touches, viewport, dt);
	}
}
