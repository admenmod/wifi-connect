import { math as Math } from 'ver/helpers';
import { Path } from 'ver/Path';
import { KeyboardInputInterceptor } from 'ver/KeyboardInputInterceptor';
import { KeymapperOfActions, MappingsMode } from 'ver/KeymapperOfActions';
import { codeShell } from 'ver/codeShell';


export const pasteToInput = (input: HTMLInputElement | HTMLTextAreaElement, text: string) => {
	const { value, selectionStart, selectionEnd } = input;
	input.value = value.substring(0, selectionStart!) + text + value.substring(selectionEnd!);
	input.selectionStart = input.selectionEnd = selectionStart! + text.length;
};


export const hiddeninput = (() => {
	const $input = document.createElement('input');
	$input.style.position = 'fixed';
	$input.style.top = '-1000vw';

	const kii = new KeyboardInputInterceptor({ preventDefault: true }).init($input);

	const normal_mode = new MappingsMode('normal');
	const input_mode = new MappingsMode('input');


	normal_mode.register(['Escape'], mapping => kii.blur());


	const keymapperOfActions = new KeymapperOfActions(normal_mode);
	keymapperOfActions.init(kii);
	keymapperOfActions.enable();

	return { $input, kii, normal_mode, input_mode, keymapperOfActions };
})();
