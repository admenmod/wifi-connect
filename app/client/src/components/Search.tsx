import type { FunctionComponent as FC } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { socket } from 'src/socket.js';
import type { IResourceMetadata } from 'shared/types/mapeditor.js';


const list: IResourceMetadata[] = [];

export const Search: FC = () => {
	const [loaded, setLoaded] = useState(false);
	const [searchedList, setSearchedList] = useState<IResourceMetadata[]>([]);

	useEffect(() => {
		socket.emit('get:list', data => {
			list.push(...data);
			setLoaded(true);
		});
	}, []);

	return <div>
		<input type='search'
			onKeyUp={e => e.key === 'Enter'}
			onInput={e => setSearchedList(list.filter(i => ~i.name.search(e.currentTarget.value)))}
		/>

		{loaded ? searchedList.map(i => <div>{i.name}: {i.size}</div>) : <div>loading...</div>}
	</div>
};
