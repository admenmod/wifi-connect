import { TouchesController } from 'ver/TouchesController';
import { MainLoop } from 'ver/MainLoop';
import { Viewport } from 'ver/Viewport';
import { CanvasLayers } from 'ver/CanvasLayers';

import { Node } from 'engine/scenes/Node.js';
import { ProcessSystem } from 'engine/scenes/Node.js';
import { RenderSystem } from 'engine/scenes/CanvasItem.js';
import { ControllersSystem } from 'engine/scenes/Control.js';

import { $canvas, $preact_root } from 'src/dom.js';
export { $app } from 'src/dom.js';
import { MainScene } from './mapeditor/MainScene.js';


(navigator as any).virtualKeyboard.overlaysContent = true;

export const canvas = new CanvasLayers($canvas);
export const layers = { main: canvas.create('main').canvas.getContext('2d')! };
export const touches = new TouchesController($preact_root, e => e.currentTarget === e.target);
export const viewport = new Viewport(layers.main);

canvas.on('resize', size => viewport.size.set(size));


export const mainLoop = new MainLoop({ fps: 60 });

export const processSystem = new ProcessSystem();
export const renderSystem = new RenderSystem();
export const controllersSystem = new ControllersSystem(touches, viewport);

mainLoop.on('update', dt => controllersSystem.update(dt), -10);
mainLoop.on('update', dt => processSystem.update(dt), -25);
mainLoop.on('update', () => renderSystem.update(viewport), -50);
mainLoop.on('update', () => canvas.render(), -60);
mainLoop.on('update', dt => touches.nullify(dt), -10000);


export const setup = async () => {
	await Node.load();
	const root_node = new Node();
	await root_node.init();

	processSystem.addRoot(root_node);
	renderSystem.addRoot(root_node);
	controllersSystem.addRoot(root_node);

	await MainScene.load();
	const main_scene = new MainScene();
	await main_scene.init();

	root_node.addChild(main_scene);

	mainLoop.start();
};

export const start = () => mainLoop.start();
export const stop = () => mainLoop.stop();


/*
const ctx = new AudioContext();
const gain = ctx.createGain();

const audio_buffer = await fetch('assets/audio/play.wav')
	.then(data => data.arrayBuffer())
	.then(buffer => ctx.decodeAudioData(buffer));


gain.gain.value = 0.1;

gain.connect(ctx.destination);


// canvas.onclick = () => {
// 	const sound = ctx.createBufferSource();
// 	sound.buffer = audio_buffer;
// 	sound.connect(gain);
//
// 	sound.start(ctx.currentTime);
// };
*/
