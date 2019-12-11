import { ICharacteristicInfo } from './ICraftyControlState';

export interface IAction {
    readonly type: string;   
    readonly payload?: 
        number
        | string
        | ICharacteristicInfo
}