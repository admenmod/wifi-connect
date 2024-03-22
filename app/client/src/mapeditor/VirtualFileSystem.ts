import { Event, EventDispatcher } from 'ver/events';

export class VirtualFileSystem extends EventDispatcher {
	public '@init' = new Event<VirtualFileSystem, [buffer: ArrayBufferLike]>(this);


	constructor(protected buffer: ArrayBufferLike) {
		super();
	}

	public init(this: VirtualFileSystem) {
		this.emit('init', this.buffer);
	}
}


// const blob = new Blob([], { type: 'image/png' });
// const stream = blob.stream();
//
//
// const user_stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
// const recorder = new MediaRecorder(user_stream);
//
// const decoder = new VideoDecoder({
// 	error: error => console.error(error),
// 	output: videoframe => gm.viewport.ctx.drawImage(videoframe, 0, 0)
// });
//
// recorder.ondataavailable = async e => {
// 	decoder.decode(await e.data.arrayBuffer());
// };
// recorder.start();
//
//
// const video = document.createElement('video');
// video.srcObject;


// const $div = document.createElement('div');
// canvas.append($div);
// $div.innerHTML = `<input id="input" type="file" multiple />`;
// const $input_file = document.querySelector<HTMLInputElement>('#input')!;
// console.log($input_file);
// $input_file.onchange = e => {
// 	const files = $input_file.files;
// 	if(!files) throw new Error("files not selected");
//
// 	for(const file of files) {
// 		console.log(file);
// 	}
// };
