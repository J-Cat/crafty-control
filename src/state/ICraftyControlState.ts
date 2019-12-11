export interface ICharacteristicInfo {
    uuid: string;
    label: string; 
    type: string; 
    suffix?: string;
    value?: string|number;
    divider?: number;
}

export enum TemperatureUnit {
    'F',
    'C'
}

export interface ICraftyControlState {
    readonly settings: {
        readonly units: TemperatureUnit;
        readonly setPointStep: number;
        readonly boostStep: number;
    };
    readonly info: {
        serial: string;
        version: string;
        model: string;
        hoursOfOperation: number;
        powerState: number;
        data: { 
            [uuid: string]: ICharacteristicInfo;
        };
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