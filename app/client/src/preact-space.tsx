import { h, render } from 'preact';

import { $preact_root } from 'src/dom.js';
import { GUI } from './components/GUI.js';

render(<GUI />, $preact_root);
