import { Vector2 } from 'ver/Vector2';
import { math as Math } from 'ver/helpers';


const GObject = globalThis.Object;


export interface IProperty {
	name: string;
	type: string;
	value: string;
}

export interface IBaseLayer {
	id: number;
	name: string;
	type: string;

	visible: boolean;
	opacity: number;

	offsetx: number;
	offsety: number;
}

export interface ITile {
	id: number;
	properties: IProperty[];
}

export interface ITileLayer extends IBaseLayer {
	readonly type: 'tilelayer';

	data: Uint8Array | Uint16Array | Uint32Array;

	x: number;
	y: number;

	width: number;
	height: number;

	properties: IProperty[];
}

export interface IObject {
	id: number;
	name: string;
	type: string;

	visible: boolean;

	rotation: number;

	x: number;
	y: number;

	width: number;
	height: number;

	properties: IProperty[];
}

export interface IObjectGroup extends IBaseLayer {
	readonly type: 'objectgroup';

	draworder: string;

	objects: IObject[];
}

export interface ITileset {
	name: string;

	image: string;
	imagewidth: number;
	imageheight: number;

	firstgid: number;
	columns: number;
	// margin: number;
	// spacing: number;

	tilecount: number;
	tilewidth: number;
	tileheight: number;

	tiles: ITile[];

	properties: IProperty[];
}

export interface IMap {
	// version: number;
	// type: string;

	width: number;
	height: number;

	// nextlayerid: number;
	// nextobjectid: number;
	// infinite: boolean;
	// orientation: string;
	// renderorder: string;

	// tiledversion: string;
	tilewidth: number;
	tileheight: number;

	layers: (ITileLayer | IObjectGroup)[];
	tilesets: ITileset[];
	properties: IProperty[];
}


export class Property implements IProperty {
	public name: string;
	public type: string;
	public value: string;

	constructor(o: IProperty) {
		this.name = o.name;
		this.type = o.type;
		this.value = o.value;
	}
}

export class BaseLayer implements IBaseLayer {
	public id: number;
	public name: string;
	public type: string;

	public visible: boolean;
	public opacity: number;

	public offsetx: number;
	public offsety: number;
	public offset: Readonly<Vector2>;


	constructor(o: IBaseLayer) {
		this.id = o.id;
		this.name = o.name;
		this.type = o.type;

		this.visible = o.visible;
		this.opacity = o.opacity;

		this.offsetx = o.offsetx;
		this.offsety = o.offsety;
		this.offset = GObject.freeze(new Vector2(this.offsetx, this.offsety));
	}
}

export class Tile implements ITile {
	readonly id: number;
	readonly properties: Property[] = [];

	constructor(o: ITile) {
		this.id = o.id;

		for(let i = 0; i < o.properties.length; i++) {
			this.properties[i] = new Property(o.properties[i]);
		}
	}
}

export class TileLayer extends BaseLayer implements ITileLayer {
	public readonly type: 'tilelayer';

	public data: Uint8Array | Uint16Array | Uint32Array;

	public x: number;
	public y: number;
	public position: Readonly<Vector2>;

	public width: number;
	public height: number;
	public size: Readonly<Vector2>;

	public properties: Property[] = [];


	constructor(o: ITileLayer) {
		super(o);

		this.type = 'tilelayer';

		this.data = new Uint16Array(o.data);


		this.x = o.x;
		this.y = o.y;
		this.position = GObject.freeze(new Vector2(this.x, this.y));

		this.width = o.width;
		this.height = o.height;
		this.size = GObject.freeze(new Vector2(this.width, this.height));

		for(let i = 0; i < o.properties.length; i++) {
			this.properties[i] = new Property(o.properties[i]);
		}
	}
}

export class Object implements IObject {
	public id: number;
	public name: string;
	public type: string;

	public visible: boolean;

	public rotation: number;

	public x: number;
	public y: number;
	public position: Readonly<Vector2>;

	public width: number;
	public height: number;
	public size: Readonly<Vector2>;

	public properties: IProperty[] = [];


	constructor(o: IObject) {
		this.id = o.id;
		this.name = o.name;
		this.type = o.type;

		this.visible = o.visible;

		this.rotation = o.rotation;

		this.x = o.x;
		this.y = o.y;
		this.position = GObject.freeze(new Vector2(this.x, this.y));

		this.width = o.width;
		this.height = o.height;
		this.size = GObject.freeze(new Vector2(this.width, this.height));

		for(let i = 0; i < o.properties.length; i++) {
			this.properties[i] = new Property(o.properties[i]);
		}
	}
}

export class ObjectGroup extends BaseLayer implements IObjectGroup {
	public readonly type: 'objectgroup';

	public draworder: string;

	public objects: IObject[] = [];

	constructor(o: IObjectGroup) {
		super(o);

		this.type = o.type;

		this.draworder = o.draworder;

		for(let i = 0; i < o.objects.length; i++) {
			this.objects[i] = new Object(o.objects[i]);
		}
	}
}

export class Tileset implements ITileset {
	public name: string;

	public image: string;
	public imagewidth: number;
	public imageheight: number;
	public image_size: Readonly<Vector2>;

	public firstgid: number;
	public columns: number;
	// public margin: number;
	// public spacing: number;

	public tilecount: number;
	public tilewidth: number;
	public tileheight: number;
	public tile_size: Readonly<Vector2>;

	public tiles: Tile[] = [];
	public properties: Property[] = [];

	constructor(o: ITileset) {
		this.name = o.name;

		this.image = o.image;
		this.imagewidth = o.imagewidth;
		this.imageheight = o.imageheight;
		this.image_size = GObject.freeze(new Vector2(this.imagewidth, this.imageheight));

		this.firstgid = o.firstgid;
		this.columns = o.columns;
		// this.margin = o.margin;
		// this.spacing = o.spacing;

		this.tilecount = o.tilecount;
		this.tilewidth = o.tilewidth;
		this.tileheight = o.tileheight;
		this.tile_size = GObject.freeze(new Vector2(this.tilewidth, this.tileheight));

		for(let i = 0; i < o.tiles.length; i++) {
			this.tiles[i] = new Tile(o.tiles[i]);
		}

		for(let i = 0; i < o.properties.length; i++) {
			this.properties[i] = new Property(o.properties[i]);
		}
	}


	public getTile(id: number): Tile | void { this.tiles[id-1]; }
}

export class Map implements IMap {
	// public version: number;
	// public type: string;

	public width: number;
	public height: number;
	public size: Readonly<Vector2>;

	public tilescount: number = 0;
	// public nextlayerid: number;
	// public nextobjectid: number;
	// public infinite: boolean;
	// public orientation: string;
	// public renderorder: string;

	// public tiledversion: string;
	public tilewidth: number;
	public tileheight: number;
	public tile_size: Readonly<Vector2>;

	public layers: (TileLayer | ObjectGroup)[] = [];
	public tilesets: Tileset[] = [];
	public properties: Property[] = [];

	constructor(o: IMap) {
		// this.version = o.version;
		// this.type = o.type;

		this.width = o.width;
		this.height = o.height;
		this.size = GObject.freeze(new Vector2(this.width, this.height));

		// this.nextlayerid = o.nextlayerid;
		// this.nextobjectid = o.nextobjectid;
		// this.infinite = o.infinite;
		// this.orientation = o.orientation;
		// this.renderorder = o.renderorder;

		// this.tiledversion = o.tiledversion;
		this.tilewidth = o.tilewidth;
		this.tileheight = o.tileheight;
		this.tile_size = GObject.freeze(new Vector2(this.tilewidth, this.tileheight));


		for(let i = 0; i < o.layers.length; i++) {
			const layer = o.layers[i];
			if(layer.type === 'tilelayer') this.layers[i] = new TileLayer(layer);
			else if(layer.type === 'objectgroup') this.layers[i] = new ObjectGroup(layer);
			else console.log(layer);
		}

		for(let i = 0; i < o.tilesets.length; i++) {
			this.tilesets[i] = new Tileset(o.tilesets[i]);
		}

		for(let i = 0; i < o.properties.length; i++) {
			this.properties[i] = new Property(o.properties[i]);
		}
	}

	public getLayer(name: string, id: number = 0): TileLayer | ObjectGroup | void {
		for(const layer of this.layers) {
			if(id && layer.id === id || name === layer.name) return layer;
		}
	}

	public getTileset(name: string): Tileset | void {
		for(const tileset of this.tilesets) {
			if(tileset.name === name) return tileset;
		}
	}

	public getTile(id: number): { tile: Tile, tileset: Tileset } | { tile: void, tileset: void } {
		for(const tileset of this.tilesets) {
			if(id < tileset.firstgid) continue;

			for(const tile of tileset.tiles) {
				if(tileset.firstgid + tile.id === id) return { tile, tileset };
			}
		}

		return { tile: void 0, tileset: void 0 };
	}
}
