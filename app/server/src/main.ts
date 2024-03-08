import os from 'node:os';
import http from 'node:http';
import express from 'express';
import { Server, Socket } from 'socket.io';
import type { ServerToClientEvents, ClientToServerEvents } from 'shared/types/mapeditor.js';

import { Event, EventDispatcher } from 'ver/events';
import { MainLoop } from 'ver/MainLoop';

import { Node, ProcessSystem } from 'engine/scenes/Node.js';
import { PhysicsBox2DSystem } from 'engine/scenes/PhysicsBox2DItem.js';

import { MainScene } from './mapeditor/MainScene.js';


const PORT = 5000;
const HOST = (() => {
	const nets = os.networkInterfaces();

	for(const id in nets) {
		for(const net of nets[id]!) {
			if(net.netmask === '255.255.255.0' && net.family === 'IPv4' && !net.internal) return net.address;
		}
	}

	console.error(new Error('local net not fiend'));

	return 'localhost';
})();


const app = express();
const server = new http.Server(app);
export const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
	cors: {
		origin: '*'
	}
});
// const io = new Server();

app.use('/', express.static('static'));
// res.header('Access-Control-Allow-Origin', '*');
// res.header('Access-Control-Allow-Headers', 'X-Requested-With');


export type socket = Socket<ClientToServerEvents, ServerToClientEvents>;

export const sockets: socket[] = []


const gm = new class GameManager extends EventDispatcher {
	public root!: Node;
}


export const FRICTION = 0.9;
export const PIXEL_DENSITY = 30;


io.on('connection', socket => {
	console.log(sockets.map(({ id }) => ({ id })));

	socket.on('disconnecting', reason => {
		const l = sockets.indexOf(socket);
		if(!~l) return;
		sockets.splice(l, 1);

		console.log(`disconnect (${reason})`, socket.id, sockets.map(({ id }) => id));
	});

	sockets.push(socket);

	console.log('connection', sockets.map(({ id }) => id));
});



export const mainLoop = new MainLoop({ fps: 60 });

export const processSystem = new ProcessSystem();
export const physicsBox2DSystem = new PhysicsBox2DSystem();

mainLoop.on('update', dt => processSystem.update(dt));
mainLoop.on('update', dt => physicsBox2DSystem.update(dt));


(async () => {
	await Node.load();
	await MainScene.load();

	gm.root = new Node();
	await gm.root.init();

	const main_scene = new MainScene();
	await main_scene.init();

	processSystem.addRoot(gm.root);
	physicsBox2DSystem.addRoot(gm.root);

	gm.root.addChild(main_scene);

	mainLoop.start();


	process.stdin.on('data', data => {
		const code = data.toString();
		try { console.log(eval(code)); } catch(e) { console.error(e); }
	});
})();


server.listen(PORT, HOST, () => console.log(`${HOST}:${PORT} Starting...`));
// io.listen(PORT, { cors: { origin: '*' } });
