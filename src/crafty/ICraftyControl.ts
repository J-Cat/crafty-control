import { TemperatureUnit } from '../state/ICraftyControlState';
import { IAction } from '../state/IAction';

export interface ICraftyControl {
    connect: (units: TemperatureUnit, dispatch: React.Dispatch<IAction>) => Promise<void>;
    updateSetPoint: (value: number) => Promise<void>;
    updateBoost: (value: number) => Promise<void>;
    updateUnits: (units: TemperatureUnit) => Promise<void>;
}