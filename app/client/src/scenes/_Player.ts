import { Vector2 } from '@ver/Vector2';
import { Event } from '@ver/events';
import type { Viewport } from '@ver/Viewport';

import { PhysicsBox2DItem } from '@/scenes/PhysicsBox2DItem';
import { Sprite } from '@/scenes/nodes/Sprite';
import type { Joystick } from '@/scenes/gui/Joystick';

import { b2Shapes, b2Vec2 } from '@/modules/Box2DWrapper';


export class Player extends PhysicsBox2DItem {
	public '@shoot' = new Event<Player, [o: Player]>(this);


	public size = new Vector2(20, 20);


	public TREE() { return {
		Body: Sprite,
		Head: Sprite
	}}

	public get $body() { return this.get('Body'); }
	public get $head() { return this.get('Head'); }


	protected async _init(this: Player): Promise<void> {
		await super._init();

		this.b2bodyDef.allowSleep = false;
		this.b2bodyDef.type = 2;

		const shape = new b2Shapes.b2CircleShape();
		shape.SetRadius(this.size.y/this.pixelDensity/2);

		this.b2bodyDef.fixedRotation = true;

		this.b2fixtureDef.shape = shape;


		await this.$body.load('assets/img/player.png');
		this.$body.scale.inc(2);

		await this.$head.load('assets/img/player.png');
		this.$head.offset.set(0, -5);
		this.$head.scale.inc(0.5, 3);
	}

	protected _process(dt: number): void {
		if(this.timer_shoot > 0) this.timer_shoot -= dt;

		this.b2_angularVelocity *= 0.95;
		this.b2_velosity.Multiply(0.95);
	}

	protected _draw({ ctx }: Viewport) {
		;
	}


	public moveAngle({ value, angle }: Joystick): void {
		value /= 2000

		this.b2_velosity.x += value * Math.cos(angle - Math.PI/2);
		this.b2_velosity.y += value * Math.sin(angle - Math.PI/2);
	}


	private timer_shoot: number = 0;

	public headMove(joystick: Joystick): void {
		this.$head.rotation = joystick.angle;

		if(joystick.value === 1 && joystick.touch && this.timer_shoot <= 0) {
			this.$head.offset.set(0, -1);

			const ha = this.$head.rotation;
			this.b2_velosity.x -= Math.cos(ha - Math.PI/2) * 0.001;
			this.b2_velosity.y -= Math.sin(ha - Math.PI/2) * 0.001;

			this['@shoot'].emit(this);

			this.timer_shoot = 1000;
		} else this.$head.offset.moveTime(new Vector2(0, -5), 10);
	}
}
