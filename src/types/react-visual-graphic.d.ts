module 'react-visual-graphic' {
    export interface IBatteryProps {
        width: number;
        height: number;
        batteryColor: string;
        color: string;
        value: number;
        maxVal: number;
    }
    
    export class Battery extends React.Component<IBatteryProps> {
    }
}