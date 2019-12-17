import { ICraftyControl } from './ICraftyControl';
import { CraftyUuids } from '../model/craftyUuids';
import { CraftyControlActions } from '../state/CraftyControlActions';
import { TemperatureUnit, ICharacteristicInfo } from '../state/ICraftyControlState';
import { IAction } from '../state/IAction';
import { isNumber } from 'util';
import { TaskQueue } from 'typescript-task-queue';

const decoder = new TextDecoder('utf8');

class WebBluetoothCraftyControl implements ICraftyControl {
    units: TemperatureUnit = TemperatureUnit.C;
    detailed: boolean = false;
    dispatch?: React.Dispatch<IAction>;
    service?: BluetoothRemoteGATTService;
    setPointCharacteristic?: BluetoothRemoteGATTCharacteristic;
    boostCharacteristic?: BluetoothRemoteGATTCharacteristic;
    temperatureCharacteristic?: BluetoothRemoteGATTCharacteristic;
    settingsCharacteristic?: BluetoothRemoteGATTCharacteristic;
    ledCharacteristic?: BluetoothRemoteGATTCharacteristic;
    batteryCharacteristic?: BluetoothRemoteGATTCharacteristic;
    powerStateCharacteristic?: BluetoothRemoteGATTCharacteristic;
    powerBoostHeatStateCharacteristic?: BluetoothRemoteGATTCharacteristic;
    chargeCharacteristic?: BluetoothRemoteGATTCharacteristic;

    private queue: TaskQueue = new TaskQueue({ autorun: true, stoppable: false });

    connect = async (units: TemperatureUnit, detailed: boolean, dispatch: React.Dispatch<IAction>) => {
        this.units = units;
        this.detailed = detailed;
        this.dispatch = dispatch;

        const device = await navigator.bluetooth.requestDevice({
            filters: [{ name: "Storz&Bickel" }, { name: "STORZ&BICKEL" }],
            optionalServices: [CraftyUuids.ServiceUuid, CraftyUuids.MetaDataUuid, CraftyUuids.MiscDataUuid],
            // acceptAllDevices: true
        });

        if (!device || !device.gatt) {
            throw new Error("Failed to retrieve Crafty BLE device.");
        }

        device.ongattserverdisconnected = (event: Event) => {
            dispatch!({type: CraftyControlActions.disconnected });
        };

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

        await this.getOtherCharacteristics(dataService);
        await this.getOtherCharacteristics(metaDataService);
        await this.getOtherCharacteristics(miscService);

        await this.bindCharacteristics(metaDataService, miscService);

        this.dispatch!({ type: CraftyControlActions.connected });
    }

    private bindCharacteristics = async (
        metaDataService: BluetoothRemoteGATTService, 
        miscService: BluetoothRemoteGATTService
    ) => {
        this.temperatureCharacteristic!.addEventListener("characteristicvaluechanged", async (event) => {
            this.queue.enqueue(async () => {
                const value = await this.readTemp(this.units, this.temperatureCharacteristic!);
                if (value && isNumber(value)) {
                    this.dispatch!({ type: CraftyControlActions.setCurrentTemperature, payload: value })
                }
            });
        });

        this.batteryCharacteristic!.addEventListener('characteristicvaluechanged', async (event) => {
            this.queue.enqueue(async () => {
                const batteryPercent = await this.readNumericValue(this.batteryCharacteristic!);
                if (batteryPercent) {
                    this.dispatch!({ type: CraftyControlActions.setBatteryPercent, payload: batteryPercent });
                }
            });
        });

        this.powerStateCharacteristic!.addEventListener('characteristicvaluechanged', async (event) => {
            this.queue.enqueue(async () => {
                const value1 = await this.readNumericValue(this.powerStateCharacteristic!);
                const value2 = await this.readNumericValue(this.powerBoostHeatStateCharacteristic!);
                const value3 = await this.readNumericValue(this.chargeCharacteristic!);

                if (value1 !== undefined && value2 !== undefined && value3 !== undefined && isNumber(value1) && isNumber(value2) && isNumber(value3)) {
                    this.dispatch!({ type: CraftyControlActions.setPowerState, payload: [value1, value2, value3] });
                }
            });
        });

        const characteristics: BluetoothRemoteGATTCharacteristic[] = [];
        for (const item of CraftyUuids.otherUuids.filter(u => u.notify)) {
            let characteristic: BluetoothRemoteGATTCharacteristic | undefined;
            if (item.uuid.substring(7) === metaDataService.uuid.substring(7)) {
                characteristic = await metaDataService.getCharacteristic(item.uuid);
            } else if (item.uuid.substring(7) === miscService.uuid.substring(7)) {
                characteristic = await miscService.getCharacteristic(item.uuid);
            }

            if (characteristic) {
                characteristics.push(characteristic);
                characteristic.addEventListener('characteristicvaluechanged', async (event) => {
                    this.queue.enqueue(async () => {
                        if (item.type === 'hex') {
                            const value = await this.readNumericValue(characteristic!);
                            if (value) {
                                this.dispatch!({ type: CraftyControlActions.setData, payload: {
                                    ...item,
                                    value: value,
                                } as ICharacteristicInfo });
                            }
                        } else {
                            const value = await this.readStringValue(characteristic!);
                            if (value) {
                                this.dispatch!({ type: CraftyControlActions.setData, payload: {
                                    ...item,
                                    value: value,
                                } as ICharacteristicInfo});
                            }
                        }
                    });
                });
            }
        }

        this.temperatureCharacteristic!.startNotifications();
        this.batteryCharacteristic!.startNotifications();
        this.powerStateCharacteristic!.startNotifications();

        for (const characteristic of characteristics) {
            characteristic.startNotifications();
        }
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
        const led = await this.readNumericValue(this.ledCharacteristic);
        if (led) {
            this.dispatch!({ type: CraftyControlActions.setLED, payload: led });
        }

        this.batteryCharacteristic = await service.getCharacteristic(CraftyUuids.BatteryUuid);
        if (!this.batteryCharacteristic) {
            throw new Error("Failed to retrieve the battery characteristic.");
        }
        const battery = await this.readNumericValue(this.batteryCharacteristic);
        if (battery) {
            this.dispatch!({ type: CraftyControlActions.setBatteryPercent, payload: battery })
        }
    }

    private getMiscCharacteristics = async (service: BluetoothRemoteGATTService) => {
        this.settingsCharacteristic = await service.getCharacteristic(CraftyUuids.SettingsUuid);
        if (!this.settingsCharacteristic) {
            throw new Error("Failed to retrieve settings characteristic.");
        }
        const settingsValue = await this.readNumericValue(this.settingsCharacteristic);
        if (settingsValue) {
            this.dispatch!({ type: CraftyControlActions.updateSettings, payload: settingsValue });
        }

        const characteristic = await service.getCharacteristic(CraftyUuids.HoursOfOperationUuid);
        if (!characteristic) {
            throw new Error("Failed to retrieve hours of operation characteristic.");
        }
        const hoursValue = await this.readNumericValue(characteristic);
        if (hoursValue) {
            this.dispatch!({ type: CraftyControlActions.setHoursOfOperation, payload: hoursValue });
        }

        this.powerStateCharacteristic = await service.getCharacteristic(CraftyUuids.PowerUuid);
        if (!this.powerStateCharacteristic) {
            throw new Error("Failed to retrieve the power state characteristic.");
        }

        this.powerBoostHeatStateCharacteristic = await service.getCharacteristic(CraftyUuids.PowerBoostHeatStateUuid);
        if (!this.powerBoostHeatStateCharacteristic) {
            throw new Error("Failed to retrieve the power/boost/heat state characteristic.");
        }

        this.chargeCharacteristic = await service.getCharacteristic(CraftyUuids.ChargingUuid);
        if (!this.chargeCharacteristic) {
            throw new Error("Failed to retrieve the charging state characteristic.");
        }

        const powerStateValue = await this.readNumericValue(this.powerStateCharacteristic);
        const powerBoostValue = await this.readNumericValue(this.powerBoostHeatStateCharacteristic);
        const chargeValue = await this.readNumericValue(this.chargeCharacteristic);
        if (powerStateValue !== undefined && powerBoostValue !== undefined && chargeValue !== undefined && isNumber(powerStateValue) && isNumber(powerBoostValue) && isNumber(chargeValue)) {
            this.dispatch!({ type: CraftyControlActions.setPowerState, payload: [powerStateValue, powerBoostValue, chargeValue] });
        }
    }

    private getMetaDataCharacteristics = async (service: BluetoothRemoteGATTService) => {
        const serialCharacteristic = await service.getCharacteristic(CraftyUuids.SerialUuid);
        if (!serialCharacteristic) {
            throw new Error("Failed to retrieve the serial # characteristic.");
        }
        const serialValue = await this.readStringValue(serialCharacteristic);
        if (serialValue) {
            this.dispatch!({ type: CraftyControlActions.setSerial, payload: serialValue });
        }

        const modelCharacteristic = await service.getCharacteristic(CraftyUuids.ModelUuid);
        if (!modelCharacteristic) {
            throw new Error("Failed to retrieve the model # characteristic.");
        }
        const modelValue = await this.readStringValue(modelCharacteristic);
        if (modelValue) {
            this.dispatch!({ type: CraftyControlActions.setModel, payload: modelValue });
        }

        const versionCharacteristic = await service.getCharacteristic(CraftyUuids.VersionUuid);
        if (!versionCharacteristic) {
            throw new Error("Failed to retrieve the version # characteristic.");
        }
        const versionValue = await this.readStringValue(versionCharacteristic);
        if (versionValue) {
            this.dispatch!({ type: CraftyControlActions.setVersion, payload: versionValue });
        }
    }

    private getOtherCharacteristics = async (service: BluetoothRemoteGATTService) => {        
        for (const item of CraftyUuids.otherUuids.filter(uuid => this.detailed ? true : Object.values(CraftyUuids.Battery).includes(uuid.uuid))) {
            if (item.uuid.substring(7) === service.uuid.substring(7)) {
                const characteristic = await service.getCharacteristic(item.uuid);
                if (characteristic) {
                    if (item.type === 'hex') {
                        const value = await characteristic.readValue();
                        if (value) {
                            const numberValue = value.getUint16(0, true);
                            if (numberValue && isNumber(numberValue)) {
                                this.dispatch!({ type: CraftyControlActions.setData, payload: { 
                                    ...item,
                                    value: numberValue,
                                } as ICharacteristicInfo});
                            }
                        }
                    } else {
                        const value = await characteristic.readValue();
                        if (value) {
                            const stringValue = decoder.decode(value.buffer);
                            if (stringValue) {
                                this.dispatch!({ type: CraftyControlActions.setData, payload: { 
                                    ...item,
                                    value: stringValue,
                                } as ICharacteristicInfo});
                            }
                        }

                    }
                }
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

    private readNumericValue = async (characteristic: BluetoothRemoteGATTCharacteristic): Promise<number|undefined> => {
        const value = await characteristic.readValue();
        if (value) {
            const numberValue = value.getUint16(0, true);
            if (numberValue !== undefined && isNumber(numberValue)) {
                return numberValue;
            }
        }

        return;
    };

    private readStringValue = async (characteristic: BluetoothRemoteGATTCharacteristic): Promise<string|undefined> => {
        const value = await characteristic.readValue();
        if (value) {
            return decoder.decode(value.buffer);
        }

        return;
    }
}


const control = new WebBluetoothCraftyControl();
export default control;