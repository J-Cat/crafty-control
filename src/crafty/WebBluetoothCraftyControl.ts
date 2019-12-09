import { ICraftyControl } from './ICraftyControl';
import { CraftyUuids } from '../model/craftyUuids';
import { CraftyControlActions } from '../state/CraftyControlActions';
import { TemperatureUnit } from '../state/ICraftyControlState';
import { IAction } from '../state/IAction';
import { isNumber } from 'util';
import { TaskQueue } from 'typescript-task-queue';

class WebBluetoothCraftyControl implements ICraftyControl {
    units: TemperatureUnit = TemperatureUnit.C;
    dispatch?: React.Dispatch<IAction>;
    service?: BluetoothRemoteGATTService;
    setPointCharacteristic?: BluetoothRemoteGATTCharacteristic;
    boostCharacteristic?: BluetoothRemoteGATTCharacteristic;
    temperatureCharacteristic?: BluetoothRemoteGATTCharacteristic;
    settingsCharacteristic?: BluetoothRemoteGATTCharacteristic;
    ledCharacteristic?: BluetoothRemoteGATTCharacteristic;
    batteryCharacteristic?: BluetoothRemoteGATTCharacteristic;

    private queue: TaskQueue = new TaskQueue({ autorun: true, stoppable: false });

    connect = async (units: TemperatureUnit, dispatch: React.Dispatch<IAction>) => {
        this.units = units;
        this.dispatch = dispatch;

        const device = await navigator.bluetooth.requestDevice({
            filters: [{ name: "Storz&Bickel" }, { name: "STORZ&BICKEL" }],
            optionalServices: [CraftyUuids.ServiceUuid, CraftyUuids.MetaDataUuid, CraftyUuids.MiscDataUuid],
            // acceptAllDevices: true
        });

        if (!device || !device.gatt) {
            throw new Error("Failed to retrieve Crafty BLE device.");
        }

        this.dispatch!({ type: CraftyControlActions.connecting });
        const server = await device.gatt.connect();

        if (!server) {
            throw new Error("Failed to retrieve BLE server.");
        }

        const dataService = await server.getPrimaryService(CraftyUuids.ServiceUuid);
        const metaDataService = await server.getPrimaryService(CraftyUuids.MetaDataUuid);
        const miscService = await server.getPrimaryService(CraftyUuids.MiscDataUuid);

        if (!dataService) {
            throw new Error("Failed to retrieve primary data service.");
        }
        if (!metaDataService) {
            throw new Error("Failed to retrieve metadata service.");
        }
        if (!miscService) {
            throw new Error("Failed to retrieve miscellaneous data service.");
        }

        await this.getDataServiceCharacteristics(dataService);
        await this.getMetaDataCharacteristics(metaDataService);
        await this.getMiscCharacteristics(miscService);

        await this.temperatureCharacteristic!.startNotifications();
        this.temperatureCharacteristic!.oncharacteristicvaluechanged = async (event) => {
            this.queue.enqueue(async () => {
                const value = await this.readTemp(this.units, this.temperatureCharacteristic!);
                if (value && isNumber(value)) {
                    this.dispatch!({ type: CraftyControlActions.setCurrentTemperature, payload: value })
                }
            });
        };
        await this.batteryCharacteristic!.startNotifications();
        this.batteryCharacteristic!.oncharacteristicvaluechanged = async (event) => {
            this.queue.enqueue(async () => {
                const value = await this.batteryCharacteristic!.readValue();
                if (value) {
                    const batteryPercent = value.getUint16(0, true);
                    if (batteryPercent && isNumber(batteryPercent)) {
                        this.dispatch!({ type: CraftyControlActions.setBatteryPercent, payload: batteryPercent })
                    }
                }
            });
        }

        this.dispatch!({ type: CraftyControlActions.connected });
    }

    private getDataServiceCharacteristics = async (service: BluetoothRemoteGATTService) => {
        this.temperatureCharacteristic = await service.getCharacteristic(CraftyUuids.TemperatureUuid)
        if (!this.temperatureCharacteristic) {
            throw new Error("Failed to retrieve temperature characteristic.");
        }

        const temperature = await this.readTemp(this.units, this.temperatureCharacteristic);
        this.dispatch!({ type: CraftyControlActions.setCurrentTemperature, payload: temperature })

        this.setPointCharacteristic = await service.getCharacteristic(CraftyUuids.SetPointUuid)
        if (!this.setPointCharacteristic) {
            throw new Error("Failed to retrieve setpoint characteristic.");
        }
        const setPoint = await this.readTemp(this.units, this.setPointCharacteristic, 0);
        if (setPoint && isNumber(setPoint)) {
            this.dispatch!({ type: CraftyControlActions.setSetPoint, payload: setPoint });
        }

        this.boostCharacteristic = await service.getCharacteristic(CraftyUuids.BoostUuid);
        if (!this.boostCharacteristic) {
            throw new Error("Failed to retrieve the boost characteristic.");
        }
        const boost = await this.readTemp(this.units, this.boostCharacteristic, 0);
        if (boost && isNumber(boost)) {
            this.dispatch!({ type: CraftyControlActions.setBoost, payload: boost });
        }

        this.ledCharacteristic = await service.getCharacteristic(CraftyUuids.LedUuid);
        const led = await this.ledCharacteristic.readValue();
        if (led) {
            const ledValue = led.getUint16(0, true);
            if (ledValue && isNumber(ledValue)) {
                this.dispatch!({ type: CraftyControlActions.setLED, payload: ledValue });
            }
        }

        this.batteryCharacteristic = await service.getCharacteristic(CraftyUuids.BatteryUuid);
        if (!this.batteryCharacteristic) {
            throw new Error("Failed to retrieve the battery characteristic.");
        }
        const battery = await this.batteryCharacteristic.readValue();
        if (battery) {
            const batteryPercent = battery.getUint16(0, true);
            if (batteryPercent && isNumber(batteryPercent)) {
                this.dispatch!({ type: CraftyControlActions.setBatteryPercent, payload: batteryPercent })
            }
        }
    }

    private getMiscCharacteristics = async (service: BluetoothRemoteGATTService) => {
        this.settingsCharacteristic = await service.getCharacteristic(CraftyUuids.SettingsUuid);
        if (!this.settingsCharacteristic) {
            throw new Error("Failed to retrieve settings characteristic.");
        }
        const settingsValue = await this.settingsCharacteristic.readValue();
        if (settingsValue) {
            const value = settingsValue.getUint16(0, true);
            if (value && isNumber(value)) {
                this.dispatch!({ type: CraftyControlActions.updateSettings, payload: value });
            }
        }

        const characteristic = await service.getCharacteristic(CraftyUuids.HoursOfOperationUuid);
        if (!characteristic) {
            throw new Error("Failed to retrieve hours of operation characteristic.");
        }
        const hoursValue = await characteristic.readValue();
        if (hoursValue) {
            const hours = hoursValue.getUint16(0, true);
            if (hours && isNumber(hours)) {
                this.dispatch!({ type: CraftyControlActions.setHoursOfOperation, payload: hours });
            }
        }
    }

    private getMetaDataCharacteristics = async (service: BluetoothRemoteGATTService) => {
        const decoder = new TextDecoder('utf8');

        const serialCharacteristic = await service.getCharacteristic(CraftyUuids.SerialUuid);
        if (!serialCharacteristic) {
            throw new Error("Failed to retrieve the serial # characteristic.");
        }
        const serialValue = await serialCharacteristic.readValue();
        if (serialValue) {
            const serial = decoder.decode(serialValue.buffer);
            if (serial) {
                this.dispatch!({ type: CraftyControlActions.setSerial, payload: serial });
            }
        }

        const modelCharacteristic = await service.getCharacteristic(CraftyUuids.ModelUuid);
        if (!modelCharacteristic) {
            throw new Error("Failed to retrieve the model # characteristic.");
        }
        const modelValue = await modelCharacteristic.readValue();
        if (modelValue) {
            const model = decoder.decode(modelValue.buffer);
            if (model) {
                this.dispatch!({ type: CraftyControlActions.setModel, payload: model });
            }
        }

        const versionCharacteristic = await service.getCharacteristic(CraftyUuids.VersionUuid);
        if (!versionCharacteristic) {
            throw new Error("Failed to retrieve the version # characteristic.");
        }
        const versionValue = await versionCharacteristic.readValue();
        if (versionValue) {
            const version = decoder.decode(versionValue.buffer);
            if (version) {
                this.dispatch!({ type: CraftyControlActions.setVersion, payload: version });
            }
        }
    }

    updateSetPoint = async (value: number) => {
        this.queue.enqueue(async () => {
            try {
                this.dispatch!({ type: CraftyControlActions.updating });
                if (!this.setPointCharacteristic) {
                    throw new Error("Failed to retrieve BLE Crafty Set Point Characteristic.");
                }

                await this.writeTemp(this.units, this.setPointCharacteristic, value);
                this.dispatch!({ type: CraftyControlActions.setSetPoint, payload: value });
            } finally {
                this.dispatch!({ type: CraftyControlActions.updated });
            }
        });
    }

    updateBoost = async (value: number) => {
        this.queue.enqueue(async () => {
            try {
                this.dispatch!({ type: CraftyControlActions.updating });
                if (!this.boostCharacteristic) {
                    throw new Error("Failed to retrieve BLE Crafty Boost Characteristic.");
                }

                await this.writeTemp(this.units, this.boostCharacteristic, value);
                this.dispatch!({ type: CraftyControlActions.setBoost, payload: value });
            } finally {
                this.dispatch!({ type: CraftyControlActions.updated });
            }
        });
    }

    updateLED = async (value: number) => {
        this.queue.enqueue(async () => {
            try {
                this.dispatch!({ type: CraftyControlActions.updating });
                if (!this.ledCharacteristic) {
                    throw new Error("Failed to retrieve BLE Crafty LED Brightness Characteristic.");
                }

                const b = new ArrayBuffer(2);
                const dv = new DataView(b);
                dv.setUint16(0, value, true);;

                await this.ledCharacteristic.writeValue(dv);
            } finally {
                this.dispatch!({ type: CraftyControlActions.updated });
            }
        });
    }

    private settingUpdating = false;

    updateCraftySettings = async (value: number) => {
        if (this.settingUpdating) {
            return;
        }

        this.queue.enqueue(async () => {
            try {
                this.settingUpdating = true;
                this.dispatch!({ type: CraftyControlActions.updating });

                if (!this.settingsCharacteristic) {
                    throw new Error('Failed to retrieve BLE Crafty Settings Characteristic.');
                }

                const b = new ArrayBuffer(2);
                const dv = new DataView(b);
                dv.setUint16(0, value, true);

                await this.settingsCharacteristic.writeValue(dv);
            } finally {
                this.settingUpdating = false;
                this.dispatch!({ type: CraftyControlActions.updated });
            }
        });
    }

    private writeTemp = async (unit: TemperatureUnit, characteristic: BluetoothRemoteGATTCharacteristic, value: number) => {
        let temp = value;
        if (unit === TemperatureUnit.F) {
            temp = Math.round((temp - 32) / .18);
        } else {
            temp = Math.round(temp / .1);
        }

        const b = new ArrayBuffer(2);
        const dv = new DataView(b);
        dv.setUint16(0, temp, true);

        await characteristic.writeValue(dv);
    }

    private readTemp = async (unit: TemperatureUnit, characteristic: BluetoothRemoteGATTCharacteristic, decimals: number = 1): Promise<number> => {
        const value = await characteristic.readValue();
        if (value) {
            let temp = value.getUint16(0, true);
            if (unit === TemperatureUnit.F) {
                temp = Math.round((temp * 0.18 + 32) * Math.pow(10, decimals)) / Math.pow(10, decimals);
            } else {
                temp = Math.round((temp * 0.1) * Math.pow(10, decimals)) / Math.pow(10, decimals);
            }
            return temp;
        } else {
            throw new Error('Failed to read temperature value.');
        }
    }

    updateUnits = async (units: TemperatureUnit) => {
        this.queue.enqueue(async () => {
            try {
                this.units = units;

                let value = await this.readTemp(this.units, this.temperatureCharacteristic!);
                if (value && isNumber(value)) {
                    this.dispatch!({ type: CraftyControlActions.setCurrentTemperature, payload: value })
                }
                value = await this.readTemp(this.units, this.setPointCharacteristic!);
                if (value && isNumber(value)) {
                    this.dispatch!({ type: CraftyControlActions.setSetPoint, payload: value })
                }
                value = await this.readTemp(this.units, this.boostCharacteristic!);
                if (value && isNumber(value)) {
                    this.dispatch!({ type: CraftyControlActions.setBoost, payload: value })
                }
            } finally {
                this.dispatch!({ type: CraftyControlActions.updated });
            }
        });
    }
}


const control = new WebBluetoothCraftyControl();
export default control;