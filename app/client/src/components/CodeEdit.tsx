import type { FunctionComponent as FC } from 'preact';
import { useEffect, useRef } from 'preact/hooks';

import { KeyboardInputInterceptor } from 'ver/KeyboardInputInterceptor';
import { KeymapperOfActions, MappingsMode } from 'ver/KeymapperOfActions';
import { codeShell } from 'ver/codeShell';

import { pasteToInput } from 'src/modules/input-control.js';


const STORAGE_KEY = '$input.value';


export const kii = new KeyboardInputInterceptor();

const env = {
	loadImageObject: (name: string, src: string) => {
		// map.loadImageObject(name, src);
	}
};

const api = {};

const execute_code = (code: string) => {
	try {
		const result = codeShell<(this: typeof api) => unknown>(code, env, { source: 'code' }).call(api);
		console.log({ result });
	} catch(err) {
		console.error(err);

		// if(err instanceof Error) $error.value = err.stack || err.name;
		// if(typeof err === 'string') $error.value = err;
	}
};


kii.on('keydown:input', e => {
	if(e.key === 'Tab') {
		pasteToInput(e.input, '\t');
		e.preventDefault();
	} else if(e.ctrl && e.key === 'v') navigator.clipboard.read();
	else if(e.ctrl && e.key === 't') {
		e.preventDefault();

		const template =
`// image
this.url = 'https://image.png';

function setup(state) {
	this.type = state.type;
}

const size = new Vector2(100, 100);

function draw({ ctx }) {
	ctx.fillRect(-size.x/2, -size.y/2, size.x, size.y);
}`;

		pasteToInput(e.input, template);
	} else if(e.key === 'Enter' && e.ctrl) execute_code(e.input.value);
	else if(e.key === 'Escape') kii.blur();
});


export const CodeEdit: FC = () => {
	let $editor = useRef<HTMLDivElement | null>(null);
	let $input = useRef<HTMLTextAreaElement | null>(null);
	let $error = useRef<HTMLTextAreaElement | null>(null);

	useEffect(() => {
		kii.init($input.current!);

		kii.on('focus', () => {
			$editor.current!.style.position = '';
			$editor.current!.style.left = '';
		});
		kii.on('blur', () => {
			$editor.current!.style.position = 'fixed';
			$editor.current!.style.left = '-1000vw';
		});

		$input.current!.value = localStorage?.getItem(STORAGE_KEY) || '';
		window.addEventListener('beforeunload', () => localStorage?.setItem(STORAGE_KEY, $input.current!.value));
	}, []);

	return <div ref={$editor} className='editor' style={{
		opacity: '0.8',
		display: 'grid',
		margin: '10px 5px',
		padding: '5px 5px',
		alignSelf: 'start',
		justifySelf: 'center',
	}}>
		<textarea ref={$input} className='code-input' style={{
			fontSize: '15px',
			fontFamily: 'monospace',
			margin: '10px 5px',
			padding: '5px 5px',
			width: '90vw',
			height: '40vh',
			alignSelf: 'start',
			justifySelf: 'center',
			color: '#eeeeee',
			background: '#222222'
		}}></textarea>

		<textarea ref={$error} className='code-error' style={{
			fontSize: '15px',
			fontFamily: 'monospace',
			margin: '10px 5px',
			padding: '5px 5px',
			width: '90vw',
			height: '10vh',
			alignSelf: 'start',
			justifySelf: 'center',
			color: '#ff3333',
			background: '#222222'
		}}></textarea>
	</div>
};
