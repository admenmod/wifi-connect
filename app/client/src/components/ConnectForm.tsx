import type { FunctionComponent as FC } from 'preact';
import { useState } from 'preact/hooks';


const STORAGE_KEY_USERNAME = '$input_username.value';

export const ConnectForm: FC<{
	onConnect: (addres: string, username: string) => unknown
}> = ({ onConnect }) => {
	const [address, setAddress] = useState(`${location.protocol}//${location.hostname}:5000`);
	const [username, setUsername] = useState(localStorage?.getItem(STORAGE_KEY_USERNAME) || '');

	return <div class='wrapper'>
		<input class='address' placeholder='address' value={address}
			onInput={e => setAddress(e.currentTarget.value)} />
		<input class='username' placeholder='username' value={username}
			onInput={e => setUsername(e.currentTarget.value)} />
		<button class='connect' onClick={() => {
			localStorage.setItem(STORAGE_KEY_USERNAME, username);
			onConnect(address, username);
		}}>connect</button>
	</div>
};
