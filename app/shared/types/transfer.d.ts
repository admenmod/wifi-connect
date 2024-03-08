import type { Vector2_t } from '../server/src/ver/Vector2';


interface IBaseNode2D {
	id: string;
	position: Vector2_t;
	rotation: number;
}

export interface IUnitData extends IBaseNode2D {
	team: number;
	velosity: Vector2_t;
	HP: number;
}

export interface IPlayerData extends IUnitData {
	size: Vector2_t;
	color: string;
	bullets: number;
}

export interface IEnemyData extends IUnitData {
	radius: number;
}

export interface ITextData extends IBaseNode2D {
	text: string;
	author: string;
}

export interface IBulletData extends IBaseNode2D {
	shooterID: string;
	velosity: Vector2_t;
	radius: number;
	damage: number;
}

export interface ITreeData extends IBaseNode2D {
	radius: number;
}

export interface IItemData extends IBaseNode2D {
	item_id: string;
	item_name: string;
	item_label: string;
	item_count: number;
	radius: number;
}


export interface IControlData {
	angle: number;
	value: number;
}

export type IShootData = { shooterID: string };
export type ITextActionData = { ownerID: string; text: string; };


export interface ServerToClientEvents {
	'code:run': (id: number, code: string) => any;

	'players:init': (data: IPlayerData[]) => any;
	'player:create': (data: IPlayerData) => any;
	'player:delete': (id: string) => any;
	'players:update': (data: IPlayerData[]) => any;

	'texts:init': (data: ITextData[]) => any;
	'text:delete': (id: string) => any;
	'text:create': (data: ITextData) => any;

	'bullets:init': (data: IBulletData[]) => any;
	'bullet:create': (data: IBulletData) => any;
	'bullet:delete': (id: string) => any;
	'bullets:update': (data: IBulletData[]) => any;

	'items:init': (data: IItemData[]) => any;
	'item:create': (data: IItemData) => any;
	'item:delete': (id: string) => any;
	'items:update': (data: IItemData[]) => any;

	'api:vibrate': (pattern: number | number[]) => any;
}

export interface ClientToServerEvents {
	'natify:init': () => any;

	'code:return': (id: number, data: unknown) => any;

	'control:left-joystick': (data: IControlData) => any;
	'control:player-rotation': (data: { rotation: number }) => any;
	'action:text': (data: ITextActionData) => any;
	'control:shoot': (data: IShootData) => any;
}
