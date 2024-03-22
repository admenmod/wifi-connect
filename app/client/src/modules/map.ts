import { Vector2 } from 'ver/Vector2';
import { Event, EventDispatcher } from 'ver/events';
import { JSONcopy, math as Math } from 'ver/helpers';
import { codeShell } from 'ver/codeShell';
import type { Viewport } from 'ver/Viewport';

import type { IExtraObject, IMainObject, IMap, IResourceMetadata } from 'shared/types/mapeditor.js';

import { socket } from 'src/socket.js';


const generateID = () => Math.random().toString();


const BASE_ENV = Object.assign(Object.create(null), {
	Boolean, String, Number, Symbol, Promise,
	Object, Array,
	Vector2, Math
});


interface API {
	setup?(data: IExtraObject['extra_properties']): IExtraObject['extra_properties'];
	draw?(viewport: Viewport): void;
}


export class Resource extends EventDispatcher {
	public '@load' = new Event<Resource, [resource: Resource]>(this);

	public '@resolve:blob' = new Event<Resource, [blob: Blob]>(this);
	public '@resolve:text' = new Event<Resource, [text: string]>(this);
	public '@resolve:image' = new Event<Resource, [image: HTMLImageElement]>(this);


	protected _loaded: boolean = false;
	public loaded() { return this._loaded; }

	public readonly buffer?: ArrayBufferLike;
	public readonly metadata!: Readonly<IResourceMetadata>;

	constructor(metadata: IResourceMetadata) {
		super();

		Object.defineProperty(this, 'metadata', {
			value: Object.freeze(JSONcopy(metadata)), writable: false, enumerable: true, configurable: false
		});
	}

	public async load(buffer: ArrayBufferLike): Promise<this> {
		Object.defineProperty(this, 'buffer', {
			value: buffer, writable: false, enumerable: true, configurable: false
		});

		await this['@load'].await_emit(this);

		return this;
	}

	#blob?: Blob;
	public async blob(force: boolean = false) {
		if(!this.buffer) throw new Error('resolve before loading');
		if(!force && this.#blob) return this.#blob;

		const blob = this.#blob = new Blob([this.buffer], { type: this.metadata.type });
		await this['@resolve:blob'].await_emit(blob);

		return blob;
	}

	#text?: string;
	public async text(force: boolean = false) {
		if(!this.buffer) throw new Error('resolve before loading');
		if(!force && this.#text) return this.#text;

		const blob = this.#blob || new Blob([this.buffer], { type: this.metadata.type });

		const text = await blob.text();
		await this['@resolve:text'].await_emit(text);

		return text;
	}

	#image?: HTMLImageElement;
	public async image(force: boolean = false): Promise<HTMLImageElement> {
		if(!this.buffer) throw new Error('resolve before loading');
		if(!force && this.#image) return this.#image;

		const blob = new Blob([this.buffer], { type: this.metadata.type });
		const url = URL.createObjectURL(blob);

		const image = await new Promise<HTMLImageElement>((res, rej) => {
			const image = new Image();
			image.src = url;
			image.onload = () => res(image);
			image.onerror = e => rej(e);
		});

		URL.revokeObjectURL(url);

		await this['@resolve:image'].await_emit(image);

		return image;
	}


	public async auto(force: boolean = false) {
		let [_, type, subtype, params] = this.metadata.type.match(/(\w+)\/(\w+)(?:;((?:\w+=\w+)+))?/i)! as [string, string, string, string?];
		type = type?.toLowerCase();
		subtype = subtype?.toLowerCase();
		params = params?.toLowerCase(); 

		if(type === 'image') return this.image(force);
		if(type === 'text') return this.text(force);
		if(type === 'application' && subtype === 'json') return this.text(force).then<object>(text => JSON.parse(text));

		return this.blob(force);
	}
}


export class MapSystem extends EventDispatcher {
	public '@server#init' = new Event<MapSystem, [map: IMap]>(this);

	public '@server#create:mainobject' = new Event<MapSystem, [main: IMainObject]>(this);
	public '@server#create:extraobject' = new Event<MapSystem, [extra: IExtraObject]>(this);
	public '@server#delete:mainobject' = new Event<MapSystem, [id: string]>(this);
	public '@server#delete:extraobject' = new Event<MapSystem, [id: string]>(this);

	public '@create:resource' = new Event<MapSystem, [resource: Resource]>(this);
	public '@register:resource' = new Event<MapSystem, [resource: Resource]>(this);
	public '@load:resources' = new Event<MapSystem, [resources: Resource[]]>(this);
	public '@resolve:image' = new Event<MapSystem, [image: HTMLImageElement, resource: Resource]>(this);

	public '@create:mainobject' = new Event<MapSystem, [main: IMainObject]>(this);
	public '@create:extraobject' = new Event<MapSystem, [main: IMainObject, extra: IExtraObject]>(this);
	public '@delete:mainobject' = new Event<MapSystem, [mainID: string]>(this);
	public '@delete:extraobject' = new Event<MapSystem, [mainID: string, extraID: string]>(this);


	public version: string = 'v1.0.0';
	public main_objects: IMainObject[] = [];
	public extra_objects: IExtraObject[] = [];

	public objects_api: Record<string, API> = {};

	public resources: Resource[] = [];


	constructor() {
		super();

		this['@server#init'].on(data => {
			this.version = data.version;

			for(const resource of data.resources) this.createResource(resource);
			for(const object of data.main_objects) this.main_objects.push(object);
			for(const object of data.extra_objects) this.extra_objects.push(object);
		});

		this['@server#create:mainobject'].on(main => {
			this;
		});
		this['@server#create:extraobject'].on(extra => {

		});
	}


	public async createResource(metadata: IResourceMetadata): Promise<Resource> {
		const _ = this.resources.find(i => i.metadata.id === metadata.id);
		if(_) throw new Error('resource is registred');

		const resource = new Resource(metadata);
		resource.once('resolve:image', image => this['@resolve:image'].emit(image, resource));
		this.resources.push(resource);

		await this['@create:resource'].await_emit(resource);

		return resource;
	}

	public async registerResource({ name, src }: { name: string, src: string }): Promise<Resource> {
		const metadata = await new Promise<IResourceMetadata>((res, rej) => {
			socket.emit('resource:register', socket.id!, { name, src }, (err, data) => {
				if(!data) return rej(err);
				res(data);
			});
		});

		const resource = await this.createResource(metadata);

		await this['@register:resource'].await_emit(resource);

		return resource;
	}

	public async loadResources(predicate: (value: Resource, index: number, array: Resource[]) => unknown = () => true) {
		const resources = this.resources.filter(predicate);

		const proms: Promise<Resource>[] = [];
		for(const resource of resources) {
			proms.push(new Promise<Resource>(res => {
				socket.emit('resource:load', resource.metadata.id, (_, buffer) => {
					resource.load(buffer);
					res(resource);
				});
			}));
		}

		await Promise.all(proms);
		await this['@load:resources'].await_emit(resources);

		return resources;
	}


	public getApi(id: string): API | void { return this.objects_api[id]; }

	public createMainObject(script: string, main_properties: IMainObject['main_properties']): IMainObject {
		const main: IMainObject = {
			id: generateID(),
			script, main_properties
		};

		this['@create:mainobject'].emit(main);

		const api: API = Object.create(null);
		const env = Object.assign(Object.create(BASE_ENV), {});
		Object.defineProperty(env, '__setup__', {
			set: (v: any) => api.setup = v, enumerable: false, configurable: true
		});
		Object.defineProperty(env, '__draw__', {
			set: (v: any) => api.draw = v, enumerable: false, configurable: true
		});

		const res = codeShell<(this: IMainObject['main_properties']) => Record<string, unknown> | void>(
			`__setup__ = setup; __draw__ = draw; ${main.script}`, env, {
			source: `script [${main.id}]`
		}).call(main.main_properties);

		this.main_objects.push(main);
		this.objects_api[main.id] = api;

		return main;
	}

	public spawn(mainID: string, position: Vector2, extra_properties: IExtraObject['extra_properties']): IExtraObject {
		const main = this.main_objects.find(i => i.id === mainID);
		if(!main) throw new Error('main object not found');

		const extra: IExtraObject = {
			id: generateID(),
			link_id: main.id,
			position: new Vector2().set(position),
			extra_properties
		};

		const save_extra_properties = this.getApi(main.id)?.setup?.call({}, extra.extra_properties) || extra.extra_properties;

		this.extra_objects.push(extra);

		return extra;
	}

	public remove(extraID: string) {
		const extra = this.extra_objects.find(i => i.id === extraID);
		if(!extra) throw new Error('extra object not found');

		const main = this.main_objects.find(i => i.id === extra.link_id);
		if(!main) throw new Error('main object not found');
	}
}



/*
type IData = { id: string, name: string };


l#c +> s#c ≈> l#c
l#r _> s#c => l#c

s#c => l#c
s#r => l#c


class XX {
	// создание на сервере
	public '@server#create' = new Event<XX, [data: IData]>(this);
	public '@server#delete' = new Event<XX, [id: string]>(this);

	// регистрация (на сервер)
	public '@register' = new Event<XX, [name: string]>(this);
	public '@create' = new Event<XX, [data: IData]>(this);
	public '@delete' = new Event<XX, [id: string]>(this);

	constructor() {
		this['@server#create'].on(data => this.create(data));
		this['@server#delete'].on(id => this.delete(id));
	}

	// регистрация (на сервер)
	public register(name: string) { this['@register'].emit(name); }
	public create(data: IData) { this['@create'].emit(data); }
	public delete(id: string) { this['@delete'].emit(id); }
}
*/
