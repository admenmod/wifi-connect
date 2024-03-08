import { Event, EventDispatcher } from 'ver/events';
import { Vector2 } from 'ver/Vector2';
import { typeOf, type Fn } from 'ver/helpers';


type StringToNumber<T extends `${number}`> = T extends `${infer R extends number}` ? R : never;

const __metadata__ = [
	'UNKNOWN',
	'REF',
	'undefined',
	'null',
	'object',
	'array',
	'number',
	'string',
	'boolean',
	'bigint',
	'Vector2'
] as const;
type __metadata__ = Omit<typeof __metadata__, keyof []>;

export const METADATA: {
	[K in keyof __metadata__ as __metadata__[K]]: StringToNumber<K>;
	//@ts-ignore
} = __metadata__.reduce((p, v, i) => (p[v] = i, p), {} as typeof METADATA);

type METADATA = typeof METADATA[keyof typeof METADATA];


type IPackValue = [type: number, value: any];
type IPackData = IPackValue[];


interface ICodec<T = unknown> {
	type?: number,
	pack(instance: T): IPackValue | void;
	unpack(pack: IPackValue): T;
}


const _codec: ICodec<any>[] = [];

export const addExtension = <T>(codec: ICodec<T>) => _codec.push(codec) + __metadata__.length-1;

export class DataPacker extends EventDispatcher {
	public '@unknown' = new Event<DataPacker, [value: unknown]>(this);
	public '@symbol' = new Event<DataPacker, [value: symbol]>(this);
	public '@function' = new Event<DataPacker, [value: Fn]>(this);

	public '@pack' = new Event<DataPacker, []>(this);
	public '@unpack' = new Event<DataPacker, []>(this);

	public '@encode' = this['@pack'];
	public '@decode' = this['@unpack'];

	public pack(this: DataPacker, instance: Record<string | number, any>): IPackData {
		const refs: object[] = [];
		const pack_data: IPackData = [];

		const pack = (value: unknown): IPackValue | void => {
			const type = typeOf(value);

			if(type === 'object' || type === 'array') {
				let ref_id = refs.indexOf(value as object);
				if(~ref_id) return [METADATA.REF, ref_id];
				else ref_id = refs.push(value as object)-1;

				if(value instanceof Vector2) pack_data.push([METADATA.Vector2, [value[0], value[1]]]);
				else {
					for(let i = 0; i < _codec.length; i++) {
						const data = _codec[i].pack(value);
						if(data) pack_data.push([__metadata__.length+i, data]);
					}


					const props: Record<string, IPackValue> = {};
					pack_data.push([METADATA[type], props]);

					for(const [_key, _value] of Object.entries(value as object)) {
						const data = pack(_value);
						if(data) props[_key] = data;
					}
				}

				return [METADATA.REF, ref_id];
			}

			if(type === 'symbol') return void this.emit('symbol', value as any);
			if(type === 'function') return void this.emit('function', value as any);

			if(type === 'undefined') return [METADATA.undefined] as any as IPackValue;

			if(type === 'null' || type === 'string' || type === 'number' || type === 'boolean' || type === 'bigint') {
				return [METADATA[type], value];
			}

			this.emit('unknown', value);
			return [METADATA.UNKNOWN, value];
		};

		pack(instance);

		return pack_data;
	}

	public unpack(pack_data: IPackData) {
		const instances: Record<string | number, any>[] = [];

		const push = <T extends Record<string | number, any>>(o: T): T => (instances.unshift(o), o);

		const unpack = ([type, value]: IPackValue): any => {
			if(type === METADATA.UNKNOWN) return value;
			if(type === METADATA.REF) return [type, value];

			if(type === METADATA.Vector2) return push(new Vector2(value[0], value[1]));
			if(type === METADATA.array || type === METADATA.object) {
				const props: Record<string | number, any> = type === METADATA.array ? [] : {};
				push(props);

				for(const [_key, _value] of Object.entries(value as object)) props[_key] = unpack(_value);

				return props;
			}

			if(
				type === METADATA.undefined ||
				type === METADATA.null ||
				type === METADATA.number ||
				type === METADATA.string ||
				type === METADATA.boolean ||
				type === METADATA.bigint
			) return value;

			if(type < __metadata__.length-1 + _codec.length) {
				const ins = _codec[type - __metadata__.length].unpack(value);
				if(ins) return push(ins);
			}

			throw new Error('unpack error');
		};

		for(let i = pack_data.length-1; i >= 0; i--) unpack(pack_data[i]);

		for(const instance of instances) {
			for(const key in instance) {
				if(instance[key][0] === METADATA.REF) instance[key] = instances[instance[key][1]];
			}
		}

			return instances[0];
	}


	public encode = this.pack;
	public decode = this.unpack;
};


// const data_packer = new DataPacker();
//
// const test_obj = {
// 	get self1() { return this; },
// 	position: new Vector2(100, 120),
// 	position2: new Vector2(2, 5),
// 	get self2() { return this; },
// 	get position3() { return this.position; },
// 	propertys: {
// 		size: new Vector2(70, 40),
// 		get self3() { return this; },
// 		toString() { return 'Propertys'; }
// 	},
// 	toString() { return 'Main'; }
// };
//
// const unpacked_data = JSONcopy(data_packer.pack([test_obj, { soksj: 83 }]));
//
// console.log(test_obj);
// console.log(unpacked_data);
//
// console.log('unpack:', data_packer.unpack(unpacked_data));
