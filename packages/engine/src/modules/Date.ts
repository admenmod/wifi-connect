export class Date extends globalThis.Date {
    constructor();
    constructor(value: number | string);
    constructor(year: number, monthIndex: number, date?: number, hours?: number, minutes?: number, seconds?: number, ms?: number);
	constructor(...args: any[]) {
		//@ts-ignore
		super(...args);
	}

	public getTimeString(): string {
		return `${
			this.getHours().toString().padStart(2, '0')
		}:${
			this.getMinutes().toString().padStart(2, '0')
		}:${
			this.getSeconds().toString().padStart(2, '0')
		}`;
	}
}
