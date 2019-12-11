import React from 'react';
import { CraftyControlActions } from './CraftyControlActions';
import { IAction } from './IAction';
import { ICraftyControlState, TemperatureUnit, ICharacteristicInfo } from './ICraftyControlState';

const units = localStorage.getItem('crafty-control-units');
const setPointStep = localStorage.getItem('crafty-control-setpoint-step');
const boostStep = localStorage.getItem('crafty-control-boost-step');

const initialState: ICraftyControlState = {
    settings: {
        units: units ? parseInt(units) as TemperatureUnit : TemperatureUnit.C,
        setPointStep: setPointStep ? parseInt(setPointStep) as number : 5,
        boostStep: boostStep ? parseInt(boostStep) as number : 1,
    },
    info: {
        serial: '',
        model: '',
        version: '',
        hoursOfOperation: 0,
        powerState: 0,
        data: {},
    },
    connecting: false,
    connected: false,
    updating: false,
    temperature: 0,
    setPoint: 0,
    boost: 0,
    batteryPercent: 0,
    craftySettings: 0,
    led: -1,
};

const reducer = (state: ICraftyControlState = initialState, action: IAction) => {
  switch (action.type) {
    case CraftyControlActions.connecting: {
        return { ...state, connecting: true };
    }

    case CraftyControlActions.connected: {
        return { ...state, connecting: false, connected: true };
    }

    case CraftyControlActions.setCurrentTemperature: {
        return { 
            ...state, 
            temperature: action.payload as number
        };
    }

    case CraftyControlActions.setSetPoint: {
        return {
            ...state,
            updating: false,
            setPoint: action.payload as number
        };
    }

    case CraftyControlActions.setBatteryPercent: {
        return {
            ...state,
            batteryPercent: action.payload as number
        }
    }

    case CraftyControlActions.setBoost: {
        return {
            ...state,
            updating: false,
            boost: action.payload as number
        }
    }

    case CraftyControlActions.setLED: {
        return {
            ...state,
            updating: false,
            led: action.payload as number
        }
    }

    case CraftyControlActions.disconnected: {
        return {
            ...state,
            connected: false,
            connecting: false,
        };
    }

    case CraftyControlActions.updateUnits: {
        localStorage.setItem("crafty-control-units", (action.payload as TemperatureUnit).toString());
        return {
            ...state,
            settings: {
                ...state.settings,
                units: action.payload as TemperatureUnit
            }
        };
    }

    case CraftyControlActions.setPointStepChanged: {
        localStorage.setItem("crafty-control-setpoint-step", (action.payload as TemperatureUnit).toString());
        return {
            ...state,
            settings: {
                ...state.settings,
                setPointStep: action.payload
            }
        };
    }

    case CraftyControlActions.boostStepChanged: {
        localStorage.setItem("crafty-control-boost-step", (action.payload as TemperatureUnit).toString());
        return {
            ...state,
            settings: {
                ...state.settings,
                boostStep: action.payload
            }
        };
    }

    case CraftyControlActions.updateSettings: {
        return {
            ...state,
            updating: false,
            craftySettings: action.payload as number
        };
    }

    case CraftyControlActions.updating: {
        return {
            ...state,
            updating: true
        };
    }

    case CraftyControlActions.updated: {
        return {
            ...state,
            updating: false
        };
    }

    case CraftyControlActions.setSerial: {
        return {
            ...state,
            info: {
                ...state.info,
                serial: action.payload as string
            }
        };
    }

    case CraftyControlActions.setModel: {
        return {
            ...state,
            info: {
                ...state.info,
                model: action.payload as string
            }
        };
    }

    case CraftyControlActions.setHoursOfOperation: {
        return {
            ...state,
            info: {
                ...state.info,
                hoursOfOperation: action.payload as number
            }
        }
    }

    case CraftyControlActions.setVersion: {
        return {
            ...state,
            info: {
                ...state.info,
                version: action.payload as string
            }
        };
    }

    case CraftyControlActions.setPowerState: {
        return {
            ...state,
            info: {
                ...state.info,
                powerState: action.payload as number,
            }
        };
    }

    case CraftyControlActions.setData: {
        const payload  = action.payload as ICharacteristicInfo;
        return {
            ...state,
            info: {
                ...state.info,
                data: {
                    ...state.info.data, 
                    [payload.uuid]: payload
                }
            }
        };
    }

    default: {
        return state;
    }
  }
};

export const AppContext = React.createContext<{state: ICraftyControlState, dispatch: React.Dispatch<IAction>}|undefined>(undefined);
export const AppConsumer = AppContext.Consumer;

export function AppProvider(props: any) {
  const [state, dispatch] = React.useReducer(reducer, initialState as never)
  const value = { state, dispatch };

  return (
    <AppContext.Provider value={value}>
      {props.children}
    </AppContext.Provider>
  )
}
