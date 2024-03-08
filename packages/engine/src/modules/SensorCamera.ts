import { Vector2 } from 'ver/Vector2';
import { Event, EventDispatcher } from 'ver/events';
import { math as Math } from 'ver/helpers';
import type { TouchesController, Touch } from 'ver/TouchesController';


export class SensorCamera extends EventDispatcher {
	public '@move' = new Event<SensorCamera, [position: Vector2]>(this);
	public '@scale' = new Event<SensorCamera, [scale: Vector2]>(this);


	public isMoveing: boolean = true;
	public isScaling: boolean = true;
	public isMovingOnScaling: boolean = false;


	public touch: Touch | null = null;
	public fixpos = new Vector2();
	public slidingSpeed = new Vector2();

	public delay: number;
	public maxspeed: number;
	public minspeed: number;

	public maxscale: number;
	public minscale: number;

	public boundingBox?: { l: number, r: number, t: number, b: number } | null = null;

	constructor(p: {
		delay?: number,
		minspeed?: number,
		maxspeed?: number,
		minscale?: number,
		maxscale?: number,
		boundingBox?: { l: number, r: number, t: number, b: number }
	} = {}) {
		super();

		this.delay = p.delay || 10;
		this.maxspeed = p.maxspeed || 10;
		this.minspeed = p.minspeed || 0.02;

		this.maxscale = p.maxscale || 5;
		this.minscale = p.minscale || 0.2;

		this.boundingBox = p.boundingBox || null;
	}

	public touch1: Touch | null = null;
	public touch2: Touch | null = null;

	public fix = {
		position: new Vector2(),
		scale: new Vector2(1, 1),
		rectsize: new Vector2(),
		center: new Vector2(),
		zTouch: new Vector2()
	};

	public update(dt: number, touches: TouchesController, viewport: {
		position: Vector2,
		scale: Vector2
	}) {
		if(this.isMoveing && !this.touch2) {
			if(!this.touch) {
				if(Math.abs(this.slidingSpeed.moduleSq) < this.minspeed) this.slidingSpeed.set(0);

				this.slidingSpeed.moveTime(Vector2.ZERO, this.delay*15 / dt);

				if(!this.slidingSpeed.isSame(Vector2.ZERO)) {
					viewport.position.sub(this.slidingSpeed.buf().inc(viewport.scale));
					(this as SensorCamera).emit('move', viewport.position);
				}

				if(this.touch = touches.findTouch()) this.fixpos = viewport.position.buf();
			} else {
				if(this.touch.isDown() && !this.touch.d.isSame(Vector2.ZERO)) {
					viewport.position.set(this.fixpos.buf().sub(this.touch.d.buf().inc(viewport.scale)));
					(this as SensorCamera).emit('move', viewport.position);
				}

				if(this.touch.isMove()) {
					this.slidingSpeed.set(
						Math.abs(this.touch.s.x) <= this.maxspeed ? this.touch.s.x :Math.sign(this.touch.s.x)*this.maxspeed,
						Math.abs(this.touch.s.y) <= this.maxspeed ? this.touch.s.y :Math.sign(this.touch.s.y)*this.maxspeed
					);
				}

				if(this.touch.isUp()) this.touch = null;
			}
		}

		if(this.isScaling) {
			if(this.touch1?.pos.isSame(Vector2.ZERO) || this.touch2?.pos.isSame(Vector2.ZERO)) return console.log('error');

			if(this.touch1 = touches.findTouch(t => t.id === 0) || this.touch1) {
				if(this.touch2 = touches.findTouch(t => t.id === 1) || this.touch2) {
					const zTouch = new Vector2(
						Math.min(this.touch1.pos.x, this.touch2.pos.x),
						Math.min(this.touch1.pos.y, this.touch2.pos.y)
					);
					const rectsize = this.touch1.pos.buf().sub(this.touch2.pos).abs();
					const center = zTouch.buf().add(rectsize.buf().div(2));

					if(this.touch2.isPress()) {
						this.touch = null;
						this.slidingSpeed.set(0, 0);

						this.fix.position.set(viewport.position);
						this.fix.scale.set(viewport.scale);
						this.fix.rectsize.set(rectsize);
						this.fix.zTouch.set(zTouch);
						this.fix.center.set(center);
					}

					viewport.scale.set(this.fix.scale.buf().inc(this.fix.rectsize.module / rectsize.module));
					viewport.scale.x = Math.clamped(this.minscale, viewport.scale.x, this.maxscale);
					viewport.scale.y = Math.clamped(this.minscale, viewport.scale.y, this.maxscale);
					(this as SensorCamera).emit('scale', viewport.scale.buf());

					if(this.isMoveing || this.isMovingOnScaling) {
						viewport.position.set(this.fix.position.buf().add(
							this.fix.center.buf().sub(center).inc(viewport.scale)
						));
						if(this.boundingBox) {
							viewport.position.x = Math.clamped(this.boundingBox.l, viewport.scale.x, this.boundingBox.r);
							viewport.position.y = Math.clamped(this.boundingBox.t, viewport.scale.y, this.boundingBox.b);
						}
						(this as SensorCamera).emit('move', viewport.position.buf());
					}

					if(this.touch2.isUp()) this.touch1 = this.touch2 = null;
				}

				if(this.touch1?.isUp()) this.touch1 = this.touch2 = null;
			}
		}
	}
}
