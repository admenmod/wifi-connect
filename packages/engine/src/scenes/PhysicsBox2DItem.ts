import { Event } from 'ver/events';
import { Vector2 } from 'ver/Vector2';
import { System } from 'ver/System';
import { Node } from './Node.js';
import {
	b2Body, b2BodyDef, b2ContactImpulse, b2ContactListener, b2Contacts,
	b2Fixture, b2FixtureDef, b2Manifold, b2Shapes, b2Vec2, b2World
} from '../modules/Box2DWrapper.js';


export class PhysicsBox2DSystem extends System<typeof PhysicsBox2DItem> {
	public velocityIterations: number = 10;
	public positionIterations: number = 10;

	public gravity = new b2Vec2(0, 0);
	public world = new b2World(this.gravity, true);

	public '@BeginContact' = new Event<PhysicsBox2DSystem, [b2Contacts.b2Contact]>(this);
	public '@EndContact' = new Event<PhysicsBox2DSystem, [b2Contacts.b2Contact]>(this);
	public '@PostSolve' = new Event<PhysicsBox2DSystem, [b2Contacts.b2Contact, b2ContactImpulse]>(this);
	public '@PreSolve' = new Event<PhysicsBox2DSystem, [b2Contacts.b2Contact, b2Manifold]>(this);

	public '@end' = new Event<PhysicsBox2DSystem, [world: b2World]>(this);


	constructor() {
		super(PhysicsBox2DItem);

		this['@add'].on(item => {
			item.b2body = this.world.CreateBody(item.b2bodyDef);
			item.b2fixture = item.b2body.CreateFixture(item.b2fixtureDef);

			item.b2_position = item.b2body.GetPosition();
			item.b2_velosity = item.b2body.GetLinearVelocity();

			item['@PhysicsBox2D:init'].emit();
		});

		this['@removing'].on(item => {
			this.world.DestroyBody(item.b2body!);
		});

		const PREORITY = -100;

		this['@BeginContact'].on(c => {
			for(let i = 0; i < this._items.length; i++) this._items[i]['@BeginContact'].emit(c);
		}, PREORITY);
		this['@EndContact'].on(c => {
			for(let i = 0; i < this._items.length; i++) this._items[i]['@EndContact'].emit(c);
		}, PREORITY);
		this['@PostSolve'].on((c, ci) => {
			for(let i = 0; i < this._items.length; i++) this._items[i]['@PostSolve'].emit(c, ci);
		}, PREORITY);
		this['@PreSolve'].on((c, m) => {
			for(let i = 0; i < this._items.length; i++) this._items[i]['@PreSolve'].emit(c, m);
		}, PREORITY);


		const b2listner = new b2ContactListener();

		b2listner.BeginContact = (contact: b2Contacts.b2Contact) => {
			this['@BeginContact'].emit(contact);
		};
		b2listner.EndContact = (contact: b2Contacts.b2Contact) => {
			this['@EndContact'].emit(contact);
		};
		b2listner.PostSolve = (contact: b2Contacts.b2Contact, impulse: b2ContactImpulse) => {
			this['@PostSolve'].emit(contact, impulse);
		};
		b2listner.PreSolve = (contact: b2Contacts.b2Contact, oldManifold: b2Manifold) => {
			this['@PreSolve'].emit(contact, oldManifold);
		};


		this.world.SetContactListener(b2listner);
	}

	public update(dt: number) {
		this.world.Step(dt, this.velocityIterations, this.positionIterations);
		this.world.ClearForces();
		this['@end'].emit(this.world);
	}
}


const PARENT_CACHE = Symbol('PARENT_CACHE');

export class PhysicsBox2DItem extends Node {
	protected [PARENT_CACHE]: PhysicsBox2DItem[] = [];

	public '@PhysicsBox2D:init' = new Event<PhysicsBox2DItem, []>(this);

	public '@BeginContact' = new Event<PhysicsBox2DItem, [b2Contacts.b2Contact]>(this);
	public '@EndContact' = new Event<PhysicsBox2DItem, [b2Contacts.b2Contact]>(this);
	public '@PostSolve' = new Event<PhysicsBox2DItem, [b2Contacts.b2Contact, b2ContactImpulse]>(this);
	public '@PreSolve' = new Event<PhysicsBox2DItem, [b2Contacts.b2Contact, b2Manifold]>(this);


	public b2bodyDef = new b2BodyDef();
	public b2fixtureDef = new b2FixtureDef();

	public b2body: b2Body | null = null;
	public b2fixture: b2Fixture | null = null;

	public b2_position!: b2Vec2;
	public b2_velosity!: b2Vec2;
	public get b2_angle(): number { return this.b2body?.GetAngle() || 0; };
	public set b2_angle(v: number) { this.b2body?.SetAngle(v); };
	public get b2_angularVelocity(): number { return this.b2body!.GetAngularVelocity(); };
	public set b2_angularVelocity(v: number) { this.b2body!.SetAngularVelocity(v); };


	constructor() {
		super();

		const ontree = () => {
			this[PARENT_CACHE].length = 0;
			this[PARENT_CACHE].push(...this.getChainParentsOf(PhysicsBox2DItem));
		};

		this['@tree_entered'].on(ontree);
		this['@tree_exiting'].on(ontree);
	}


	protected async _init(): Promise<void> {
		await super._init();

		this.b2fixtureDef.userData = this.b2bodyDef.userData = this;

		this.b2fixtureDef.density = 1;
		this.b2fixtureDef.friction = 0.2;
		this.b2fixtureDef.restitution = 0.2;
	}
}
