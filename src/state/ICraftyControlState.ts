export enum TemperatureUnit {
    'F',
    'C'
}

export interface ICraftyControlState {
    readonly settings: {
        units: TemperatureUnit;
    };
    readonly info: {
        serial: string;
        version: string;
        model: string;
        hoursOfOperation: number;
        data: (string|number)[];
    }
    readonly connecting: boolean;
    readonly connected: boolean;
    readonly updating: boolean;
    readonly temperature: number;
    readonly setPoint: number;
    readonly boost: number;
    readonly batteryPercent: number;
    readonly craftySettings: number;
    readonly led: number;
}