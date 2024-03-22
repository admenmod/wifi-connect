// TODO: Update containers (Player & locals) _deletedItems
// NOTE: частичное совпадениe

import fs from 'node:fs';
import fs_promises from 'node:fs/promises';

import { Vector2 } from 'ver/Vector2';
import { Event } from 'ver/events';
import { math as Math } from 'ver/helpers';
import { Path } from 'ver/Path';

import { DataPacker } from 'engine/modules/DataPacker.js';
import { Node } from 'engine/scenes/Node.js';
import { Player, PlayerContainer } from './Player.js';
import { TextObjectContainer } from '../scenes/TextObject.js';

import type { IMap, IResourceMetadata, IMainObject, IExtraObject } from 'shared/types/mapeditor.js';
import { io } from '../main.js';


const ROOT_PATH_RESOURCES = `assets/img/`;
const ROOT_PATH_RESOURCES_METADATA = `assets/img/metadata/`;
const ROOT_PATH_MAPS = `maps/`;

const path_resource = (path: string) => `${ROOT_PATH_RESOURCES}${path}`;
const path_resource_metadata = (path: string) => `${ROOT_PATH_RESOURCES_METADATA}${path}.json`;
const path_map = (name: string) => `${ROOT_PATH_MAPS}${name}.json`;


const resources = await (async (metadata_dir) => {
	const resources: IResourceMetadata[] = [];
	const paths = fs.readdirSync(metadata_dir);
	const proms: Promise<IResourceMetadata>[] = [];

	for(const path of paths) {
		fs_promises.readFile(`${metadata_dir}${path}`, { encoding: 'utf8' })
		.then(json => JSON.parse(json) as IResourceMetadata)
		.then(data => resources.push(data));
	}

	await Promise.all(proms);

	return resources;
})(ROOT_PATH_RESOURCES_METADATA);


const map: IMap = {
	version: 'v1.0.0',
	resources,
	main_objects: [],
	extra_objects: []
};


export class MainScene extends Node {
	public TREE() { return {
		PlayerContainer,
		TextObjectContainer
	}}

	// aliases
	public get $playersC() { return this.get('PlayerContainer'); }
	public get $textsC() { return this.get('TextObjectContainer'); }

	protected async _init(this: MainScene): Promise<void> {
		await super._init();

		this.$playersC.c.on('create', (_, data) => io.emit('player:create', data));
		this.$playersC.c.on('deleted', id => io.emit('player:delete', id));

		this.$textsC.c.on('create', (_, data) => io.emit('text:create', data));
		this.$textsC.c.on('deleted', id => io.emit('text:delete', id));


		io.on('connection', async socket => {
			socket.on('disconnecting', reason => this.$playersC.c.delete(socket.id!));

			socket.on('get:list', cb => cb(resources));


			const player = await new Promise<Player>(res => socket.on('natify:init', async (data) => {
				const { id, username, color, position, size, scale, rotation } = data;

				res(await this.$playersC.create({
					id: socket.id!,
					username, color,
					position, scale, size, rotation
				}, socket));
			}));

			socket.emit('players:init', this.$playersC.getSocketData());
			socket.emit('texts:init', this.$textsC.getSocketData());
			socket.emit('map:init', map);


			socket.on('code:spawn', (ownerID, code) => {
				io.emit('code:sync', ownerID, code);
			});


			socket.on('action:text', ({ text, ownerID }) => {
				// TODO: add text object
				console.log(`[${socket.id}] say: ${text}`);

				this.$textsC.c.create({
					id: Math.random().toString(),
					author: player.name,
					text,
					position: player.position,
					rotation: player.rotation
				});
			});


			socket.on('player:edit', (editorID, data) => {
				const player = this.$playersC.c.getById(data.id);
				if(!player) throw new Error('player is not defined');

				if(data.color) player.color = data.color;
				if(data.rotation) player.rotation = data.rotation;
				if(data.position) player.position.set(data.position);
				if(data.scale) player.scale.set(data.scale);
				if(data.size) player.size.set(data.size);
			});


			socket.on('resource:load', (id, cb) => {
				const data = resources.find(i => i.id === id);
				if(!data) throw new Error(`resource is not fined [${id}]`);

				const file_path = path_resource(data.name);

				console.log(file_path, data);

				fs_promises.readFile(file_path, {}).then(buffer => cb(data, buffer.buffer)).catch(console.error);
			});

			socket.on('resource:register', async (ownerID, data, cb) => {
				const id = Math.random().toString();
				const name = Path.relative(data.name, '/').slice(1);

				if(/https?:\/\//.test(data.src)) {
					const file = await fetch(data.src).then(data => data.blob());

					// HACK: chack file size
					// if(file.size < 2 * 1024 * 1024) ;

					const buffer = await file.arrayBuffer();
					const file_path = path_resource(name);
					const metadata_path = path_resource_metadata(name+'.json');

					if(fs.existsSync(file_path)) {
						cb('file exists', null);
					} else {
						const json: IResourceMetadata = { id, name, type: data.type || file.type, size: file.size };
						await fs_promises.writeFile(metadata_path, JSON.stringify(json));
						await fs_promises.writeFile(file_path, new Uint8Array(buffer));

						resources.push(json);

						cb(null, json);

						io.emit('resource:new', json);
					}
				}
			});

			socket.on('map:edit', (editorID, data) => {
				data;
			});
		});
	}

	protected _process(this: MainScene, dt: number): void {
		io.volatile.emit('players:update', this.$playersC.getSocketData());
	}
}
