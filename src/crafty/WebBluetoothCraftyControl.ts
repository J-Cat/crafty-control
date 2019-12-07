import { ICraftyControl } from './ICraftyControl';
import { CraftyUuids } from '../model/craftyUuids';
import { CraftyControlActions } from '../state/CraftyControlActions';
import { TemperatureUnit } from '../state/ICraftyControlState';
import { IAction } from '../state/IAction';

class WebBluetoothCraftyControl implements ICraftyControl {
    units: TemperatureUnit = TemperatureUnit.C;
    dispatch?: React.Dispatch<IAction>;
    service?: BluetoothRemoteGATTService;
    setPointCharacteristic?: BluetoothRemoteGATTCharacteristic;
    boostCharacteristic?: BluetoothRemoteGATTCharacteristic;
    temperatureCharacteristic?: BluetoothRemoteGATTCharacteristic;
    settingsCharacteristic?: BluetoothRemoteGATTCharacteristic;
    ledCharacteristic?:BluetoothRemoteGATTCharacteristic;

    connect = (units: TemperatureUnit, dispatch: React.Dispatch<IAction>) => {
        this.units = units;
        this.dispatch = dispatch;

        return new Promise<void>((resolve, reject) => {
            const deviceFilter: BluetoothRequestDeviceFilter = {
                serviceDataUUID: CraftyUuids.ServiceUuid,
                name: "STORZ&BICKEL",
            }

            navigator.bluetooth.requestDevice({
                optionalServices: [CraftyUuids.ServiceUuid, CraftyUuids.MiscDataUuid, CraftyUuids.MetaDataUuid],
                filters: [deviceFilter],
                //acceptAllDevices: true
            }).then((device) => {
                if (device && device.gatt) {
                    this.dispatch!({ type: CraftyControlActions.connecting });
                    return device.gatt.connect();
                }
            }).then((server) => {
                if (server) {
                    return server.getPrimaryServices();
                }
            }).then((services) => {
                const promises = [];
                if (services) {
                    for (const service of services) {
                        switch (service.uuid) {
                            case CraftyUuids.MetaDataUuid: {
                                promises.push(this.getMetaDataCharacteristics(service));
                                break;
                            }
                            case CraftyUuids.MiscDataUuid: {
                                promises.push(this.getMiscCharacteristics(service));
                                break;
                            }
                            case CraftyUuids.ServiceUuid: {
                                this.service = service;
                                promises.push(this.getDataServiceCharacteristics(service));
                            }
                        }
                    }
                }
                Promise.all(promises).then(() => {
                    this.dispatch!({ type: CraftyControlActions.connected });
                    resolve();
                });
            }).catch(reason => {
                reject(reason);
            });
        });
    }

    private getDataServiceCharacteristics = (service: BluetoothRemoteGATTService): Promise<any> => {
        const promises = [];
        promises.push(service.getCharacteristic(CraftyUuids.TemperatureUuid)
            .then((characteristic) => {
                if (characteristic) {
                    this.temperatureCharacteristic = characteristic;
                    return new Promise(resolve => {
                        this.readTemp(this.units, characteristic).then(value => {
                            this.dispatch!({ type: CraftyControlActions.setCurrentTemperature, payload: value })
                            characteristic.startNotifications().then(c => {
                                c.oncharacteristicvaluechanged = (event) => {
                                    this.readTemp(this.units, c).then(value => {
                                        this.dispatch!({ type: CraftyControlActions.setCurrentTemperature, payload: value })
                                    });
                                };
                                resolve();
                            });
                        });
                    });
                }
            })
        );

        promises.push(service.getCharacteristic(CraftyUuids.SetPointUuid)
            .then((characteristic) => {
                if (characteristic) {
                    this.setPointCharacteristic = characteristic;
                    return new Promise(resolve => {
                        this.readTemp(this.units, characteristic, 0).then(value => {
                            this.dispatch!({ type: CraftyControlActions.setSetPoint, payload: value });
                            resolve();
                        });
                    });
                }
            })
        );

        promises.push(service.getCharacteristic(CraftyUuids.BoostUuid)
            .then((characteristic) => {
                if (characteristic) {
                    this.boostCharacteristic = characteristic;
                    return new Promise(resolve => {
                        this.readTemp(this.units, characteristic, 0).then(value => {
                            this.dispatch!({ type: CraftyControlActions.setBoost, payload: value });
                            resolve();
                        });
                    });
                }
            })
        );

        promises.push(service.getCharacteristic(CraftyUuids.LedUuid)
            .then((characteristic) => {
                if (characteristic) {
                    this.ledCharacteristic = characteristic;
                    return new Promise(resolve => {
                        characteristic.readValue().then(value => {
                            const led = value.getUint16(0, true);
                            this.dispatch!({ type: CraftyControlActions.setLED, payload: led });
                            resolve();
                        });
                    });
                }
            })
        );


        promises.push(service.getCharacteristic(CraftyUuids.BatteryUuid)
            .then((characteristic) => {
                if (characteristic) {
                    return new Promise(resolve => {
                        characteristic.readValue().then(value => {
                            const batteryPercent = value.getUint16(0, true);
                            this.dispatch!({ type: CraftyControlActions.setBatteryPercent, payload: batteryPercent })

                            characteristic.startNotifications().then(c => {
                                c.oncharacteristicvaluechanged = (event) => {
                                    c.readValue().then(value => {
                                        const batteryPercent = value.getUint16(0, true);
                                        this.dispatch!({ type: CraftyControlActions.setBatteryPercent, payload: batteryPercent })
                                    });
                                };
                                resolve();
                            });    
                        });
    
                    });
                }
            })
        );

        return Promise.all(promises);
    }

    private getMiscCharacteristics = (service: BluetoothRemoteGATTService): Promise<any> => {
        const promises = [];
        promises.push(service.getCharacteristic(CraftyUuids.SettingsUuid)
            .then((characteristic) => {
                if (characteristic) {
                    this.settingsCharacteristic = characteristic;
                    return new Promise<void>(resolve => {
                        characteristic.readValue().then(value => {
                            const settingsValue = value.getUint16(0, true);
                            this.dispatch!({type: CraftyControlActions.updateSettings, payload: settingsValue});
                            resolve();
                        });
                    });
                } 
            })
        );
        promises.push(service.getCharacteristic(CraftyUuids.HoursOfOperationUuid)
            .then((characteristic) => {
                if (characteristic) {
                    this.settingsCharacteristic = characteristic;
                    return new Promise<void>(resolve => {
                        characteristic.readValue().then(value => {
                            const hours = value.getUint16(0, true);
                            this.dispatch!({type: CraftyControlActions.setHoursOfOperation, payload: hours});
                            resolve();
                        });
                    });
                } 
            })
        );

        return Promise.all(promises);
    }

    private getMetaDataCharacteristics = (service: BluetoothRemoteGATTService): Promise<any> => {
        const decoder = new TextDecoder('utf8');
        const promises = [];
        promises.push(service.getCharacteristic(CraftyUuids.SerialUuid)
            .then((characteristic) => {
                if (characteristic) {
                    return new Promise<void>(resolve => {
                        characteristic.readValue().then(value => {
                            const serial = decoder.decode(value.buffer);
                            this.dispatch!({type: CraftyControlActions.setSerial, payload: serial});
                            resolve();
                        });
                    });
                } 
            })
        );
        promises.push(service.getCharacteristic(CraftyUuids.ModelUuid)
            .then((characteristic) => {
                if (characteristic) {
                    return new Promise<void>(resolve => {
                        characteristic.readValue().then(value => {
                            const model = decoder.decode(value.buffer);
                            this.dispatch!({type: CraftyControlActions.setModel, payload: model});
                            resolve();
                        });
                    });
                } 
            })
        );
        promises.push(service.getCharacteristic(CraftyUuids.VersionUuid)
            .then((characteristic) => {
                if (characteristic) {
                    return new Promise<void>(resolve => {
                        characteristic.readValue().then(value => {
                            const version = decoder.decode(value.buffer);
                            this.dispatch!({type: CraftyControlActions.setVersion, payload: version});
                            resolve();
                        });
                    });
                } 
            })
        );

        return Promise.all(promises);
    }

    updateSetPoint = (value: number): Promise<void> => {
        this.dispatch!({type: CraftyControlActions.updating});
        return new Promise((resolve, reject) => {
            if (!this.setPointCharacteristic) {
                reject("Failed to retrieve BLE Crafty Set Point Characteristic.");
                return;
            }

            this.writeTemp(this.units, this.setPointCharacteristic, value).then(() => {
                this.dispatch!({ type: CraftyControlActions.setSetPoint, payload: value });
                resolve();
            });
        });
    }

    updateBoost = (value: number): Promise<void> => {
        this.dispatch!({type: CraftyControlActions.updating});
        return new Promise((resolve, reject) => {
            if (!this.boostCharacteristic) {
                reject("Failed to retrieve BLE Crafty Boost Characteristic.");
                return;
            }

            this.writeTemp(this.units, this.boostCharacteristic, value).then(() => {
                this.dispatch!({ type: CraftyControlActions.setBoost, payload: value });
                resolve();
            });
        });
    }

    updateLED = (value: number): Promise<void> => {
        this.dispatch!({type: CraftyControlActions.updating});
        return new Promise((resolve, reject) => {
            if (!this.ledCharacteristic) {
                reject("Failed to retrieve BLE Crafty LED Brightness Characteristic.");
                return;
            }

            const b = new ArrayBuffer(2);
            const dv = new Uint16Array(b);
            dv[0] = value;

            this.ledCharacteristic.writeValue(dv).then(() => {
                resolve();
            });
        });
    }

    updateCraftySettings = (value: number): Promise<void> => {
        this.dispatch!({type: CraftyControlActions.updating});
        return new Promise<void>((resolve, reject) => {
            if (!this.settingsCharacteristic) {
                reject('Failed to retrieve BLE Crafty Settings Characteristic.');
                return;
            }

            const b = new ArrayBuffer(2);
            const dv = new Uint16Array(b);
            dv[0] = value;

            this.settingsCharacteristic.writeValue(dv).then(() => {
                resolve();
            }).catch(reason => {
                reject(reason);
            })
        });
    }

    private writeTemp = (unit: TemperatureUnit, characteristic: BluetoothRemoteGATTCharacteristic, value: number): Promise<void> => {
        return new Promise<void>(resolve => {
            let temp = value;
            if (unit === TemperatureUnit.F) {
                temp = Math.round((temp - 32) / .18);
            } else {
                temp = Math.round(temp / .1);
            }

            const b = new ArrayBuffer(2);
            const dv = new Uint16Array(b);
            dv[0] = temp;

            characteristic.writeValue(dv).then(() => {
                resolve();
            });
        });

   }

    private readTemp = (unit: TemperatureUnit, characteristic: BluetoothRemoteGATTCharacteristic, decimals: number = 1): Promise<number> => {
        return new Promise<number>(resolve => {
            characteristic.readValue().then(value => {
                let temp = value.getUint16(0, true);
                if (unit === TemperatureUnit.F) {
                    temp = Math.round((temp * 0.18 + 32) * Math.pow(10, decimals)) / Math.pow(10, decimals);
                } else {
                    temp = Math.round((temp * 0.1) * Math.pow(10, decimals)) / Math.pow(10, decimals);
                }
                resolve(temp);
            });
        });
    }

    updateUnits = (units: TemperatureUnit): Promise<void> => {
        return new Promise<void>(resolve => {
            this.units = units;
            this.readTemp(this.units, this.temperatureCharacteristic!).then(value => {
                this.dispatch!({ type: CraftyControlActions.setCurrentTemperature, payload: value })
            });
            this.readTemp(this.units, this.setPointCharacteristic!).then(value => {
                this.dispatch!({ type: CraftyControlActions.setSetPoint, payload: value })
            });
            this.readTemp(this.units, this.boostCharacteristic!).then(value => {
                this.dispatch!({ type: CraftyControlActions.setBoost, payload: value })
            });

            resolve();
        });
    }
}


const control = new WebBluetoothCraftyControl();
export default control;