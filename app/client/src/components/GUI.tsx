import 'src/style.css';

import type { FunctionComponent as FC } from 'preact';
import { useState, useRef } from 'preact/hooks';

import { ConnectForm } from './ConnectForm.js';
// import { CodeEdit } from './CodeEdit.js';
import { Search } from './Search.js';

import { socket_connect, user } from 'src/socket.js';
import { setup } from 'src/canvas-space.js';


export const GUI: FC = () => {
	const [isConnected, setIsConnected] = useState(false);

	const onconnect = async (address: string, username: string) => {
		user.name = username;
		await socket_connect(address);
		setIsConnected(true);
		await setup();
	};

	const rootRef = useRef<HTMLDivElement | null>(null);

	return <div ref={rootRef} className='GUI'>
		{ isConnected ? <Search /> : <ConnectForm onConnect={onconnect} /> }
	</div>
};
