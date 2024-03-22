import { Event } from 'ver/events';
import { math as Math } from 'ver/helpers';
import { codeShell } from 'ver/codeShell';
import { KeyboardInputInterceptor } from 'ver/KeyboardInputInterceptor';


export const pasteToInput = (input: HTMLInputElement | HTMLTextAreaElement, text: string) => {
	const { value, selectionStart, selectionEnd } = input;
	input.value = value.substring(0, selectionStart!) + text + value.substring(selectionEnd!);
	input.selectionStart = input.selectionEnd = selectionStart! + text.length;
};


export interface IEnvObject {
	format: (value: string) => string;
	env: any;
}

export const ENVS: Record<string, IEnvObject> = {
	'math': {
		env: Object.create(Math),
		format: value => `return (${value});`
	},
	'template-string': {
		env: Object.create(Math),
		format: value => `return \`${value}\`;`
	}
};

export class HTMLInputEvalableElement extends HTMLInputElement {
	public '@connectedCallback' = new Event<HTMLInputEvalableElement, []>(this);
	public '@disconnectedCallback' = new Event<HTMLInputEvalableElement, []>(this);

	public '@evaluate' = new Event<HTMLInputEvalableElement, [result: unknown]>(this);

	public '@Enter' = new Event<HTMLInputEvalableElement, [value: string]>(this);
	public '@Escape' = new Event<HTMLInputEvalableElement, [value: string]>(this);


	public isReplaced: boolean = true;
	public isEvaluateOnBlur: boolean = true;

	public keyboardInputInterceptor = new KeyboardInputInterceptor(this);

	public environment_type?: string;

	constructor() {
		super();

		this.style.fontFamily = 'monospace';

		this.inputMode = 'search';
		this.environment_type = 'math';

		this.keyboardInputInterceptor.init();
		this.keyboardInputInterceptor.on('blur', () => this.isEvaluateOnBlur && this.evaluate(this.value));
		this.keyboardInputInterceptor.on('keydown:input', e => {
			const kii = this.keyboardInputInterceptor;

			if(e.key === 'Tab') {
				e.preventDefault();
				pasteToInput(e.input, '\t');
			}
			else if(e.ctrl && e.key === 'v') navigator.clipboard.read();
			else if(e.key === 'Enter') {
				e.preventDefault();
				this['@Enter'].emit(e.input.value);
				this.evaluate(e.input.value);
			} else if(e.key === 'Escape') {
				this['@Escape'].emit(e.input.value);
				kii.input.blur();
			}
		});
	}

	public getEnvironment(type?: string): IEnvObject {
		return type && ENVS[type as keyof typeof ENVS] || {
			env: Object.create(null),
			format: value => value
		};
	}

	public evaluate(value: string) {
		const { env, format } = this.getEnvironment(this.environment_type);
		const ctx = null;

		const result = codeShell<(this: typeof ctx) => unknown>(format(value), env, { source: 'input' }).call(ctx);

		this['@evaluate'].emit(result);

		if(this.isReplaced) this.value = String(result);
	}


	public connectedCallback() {
		this.environment_type = this.environment_type || this.getAttribute('env-type') || void 0;

		this['@connectedCallback'].emit();
	}
	public disconnectedCallback() { this['@disconnectedCallback'].emit(); }

	public static get observedAttributes() { return ['env-type']; }
	public attributeChangedCallback(name: string, prev: string, next: string) {
		if(name === 'env-type') this.environment_type = next;
	}
}


customElements.define('input-evalable', HTMLInputEvalableElement, { extends: 'input' });
