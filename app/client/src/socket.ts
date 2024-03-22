import { type Socket, io } from 'socket.io-client';
export { io } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from 'shared/types/mapeditor.js';


export type socket = Socket<ServerToClientEvents, ClientToServerEvents>;
export let socket!: socket;
export const user: {
	name?: string;
} = {};

export const socket_connect = (address: string) => new Promise((res, rej) => {
	socket = io(address);
	socket.on('connect', () => res(socket));
});
