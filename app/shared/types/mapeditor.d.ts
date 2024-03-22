import type { Vector2 } from 'ver/Vector2';


interface IBaseNode2D {
	id: string;
	position: Vector2;
	rotation: number;
}

interface IPlayerData extends IBaseNode2D {
	username: string;
	color: string;
	size: Vector2;
	scale: Vector2;
}

export interface ITextData extends IBaseNode2D {
	text: string;
	author: string;
}

export interface IItemData extends IBaseNode2D {
	item_id: string;
	item_name: string;
	item_label: string;
	item_count: number;
	radius: number;
}


export interface ITextActionData { ownerID: string; text: string; };


export interface IDrawMapData {
	layers: {
		name: string;
		data: [i: number, id: number][];
	}[];
}

export interface IResourceMetadata {
	id: string;
	type: string;
	name: string;
	size: number;
	// ownerID: string;
}


export interface IRegisterResourceData {
	type?: string;
	name: string;
	src: string;
}


export interface IMainObject {
	id: string;
	script: string;
	main_properties: Record<string, unknown>;
}
export interface IExtraObject {
	id: string;
	link_id: string;
	position: Vector2;
	extra_properties: Record<string, unknown>;
}

type IObject = IMainObject & IExtraObject;


export interface IMap {
	version: string;
	resources: IResourceMetadata[];
	main_objects: IMainObject[];
	extra_objects: IExtraObject[];
}


type IArgsCallback<Err, Res> = [err: Err, res: null] | [err: null, res: Res];

export interface ServerToClientEvents {
	'code:sync': (ownerID: string, code: string) => any;

	'api:vibrate': (pattern: number | number[]) => any;

	'players:init': (data: IPlayerData[]) => any;
	'player:create': (data: IPlayerData) => any;
	'player:delete': (id: string) => any;
	'players:update': (data: IPlayerData[]) => any;

	'texts:init': (data: ITextData[]) => any;
	'text:delete': (id: string) => any;
	'text:create': (data: ITextData) => any;

	'resources:init': (data: IResourceMetadata[]) => any;
	'resource:new': (data: IResourceMetadata) => any;

	'map:init': (data: IMap) => any;
	'map:create': (editorID: string, data: Partial<IMap>) => any;
	'map:delete': (editorID: string, data: Partial<IMap>) => any;
	'map:update': (editorID: string, data: Partial<IMap>) => any;
}

export interface ClientToServerEvents {
	'natify:init': (data: IPlayerData) => any;

	'code:spawn': (ownerID: string, code: string) => any;

	'action:text': (data: ITextActionData) => any;

	'player:edit': (editorID: string, data: Partial<IPlayerData> & { id: string }) => any;

	'resource:register': (
		ownerID: string,
		data: IRegisterResourceData,
		cb: (...args: IArgsCallback<string, IResourceMetadata>) => any) => any;

	'resource:load': (id: string, cb: (data: IResourceMetadata, buffer: ArrayBuffer) => any) => any;

	'map:edit': (editorID: string, data: Partial<IMap>) => any;


	'get:list': (cb: (list: IResourceMetadata[]) => any) => any;
}
