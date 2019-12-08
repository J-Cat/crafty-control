import {
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonImg,
  IonSelect,
  IonSelectOption,
  IonToggle,
  IonRange,
  IonRow,
  IonInput,
} from '@ionic/react';
import React, { useContext, useState, useEffect } from 'react';
import './Settings.css';
import { AppContext } from '../../state/State';
import { ICraftyControlState, TemperatureUnit } from '../../state/ICraftyControlState';
import { IAction } from '../../state/IAction';
import { RouteComponentProps, Redirect } from 'react-router';
import { SelectChangeEventDetail, ToggleChangeEventDetail, RangeChangeEventDetail, InputChangeEventDetail } from '@ionic/core';
import { CraftyControlActions } from '../../state/CraftyControlActions';
import CraftyControl from '../../crafty/WebBluetoothCraftyControl';
import { isNumber } from 'util';

const Settings: React.FC<RouteComponentProps> = ({ history }) => {
  const { state, dispatch } = useContext(AppContext) as { state: ICraftyControlState, dispatch: React.Dispatch<IAction> };
  const [vibration, setVibration] = useState(() => ((state.craftySettings & 1) !== 1));
  const [charge, setCharge] = useState(() => ((state.craftySettings & 2) !== 2));
  const [led, setLed] = useState(-1);
  const [setPointStep, setSetPointStep] = useState(() => state.settings.setPointStep);
  const [boostStep, setBoostStep] = useState(() => state.settings.boostStep);
  let newLed: number | undefined;

  useEffect(() => {
    let value = (state.craftySettings & 1) !== 1;
    if (vibration !== value) {
      setVibration(value);  
    }
    
    value = (state.craftySettings & 2) !== 2;
    if (charge !== value) {
      setCharge(value);
    }

    if (led === -1 && state.led >= 0) {
      setLed(state.led);
    }

    if (setPointStep !== state.settings.setPointStep) {
      setSetPointStep(state.settings.setPointStep);
    }

    if (boostStep !== state.settings.boostStep) {
      setBoostStep(state.settings.boostStep);
    }

  }, [state.craftySettings, vibration, charge, state.led, led, setPointStep, state.settings.setPointStep, boostStep, state.settings.boostStep]);

  const onUnitsChanged = (event: CustomEvent<SelectChangeEventDetail>) => {
    const value = (event.target as any).value as TemperatureUnit;
    CraftyControl.updateUnits(value).then(() => {
      dispatch({ type: CraftyControlActions.updateUnits, payload: value })
    });
  }

  const onVibrationChanged = (event: CustomEvent<ToggleChangeEventDetail>) => {
    if (state.updating) {
      return;
    }

    const checked = (state.craftySettings & 1) === 1;
    if (vibration !== checked) {
      const value = (state.craftySettings & 2) | (checked ? 0 : 1);
      console.log(`updating settings: ${value}`);
      CraftyControl.updateCraftySettings(value).then(() => {
        dispatch({ type: CraftyControlActions.updateSettings, payload: value });
        setVibration(!vibration);
      });
    }
  }

  const onChargeChanged = (event: CustomEvent<ToggleChangeEventDetail>) => {
    if (state.updating) {
      return;
    }

    const checked = (state.craftySettings & 2) === 2;
    if (charge !== checked) {
      const value = (state.craftySettings & 1) | (checked ? 0 : 2);
      console.log(`updating settings: ${value}`);
      CraftyControl.updateCraftySettings(value).then(() => {
        dispatch({ type: CraftyControlActions.updateSettings, payload: value });
        setCharge(!charge);
      }).catch(reason => {
        dispatch({ type: CraftyControlActions.updateSettings, payload: state.craftySettings });
        console.log('Error updating characteristic.');
      })
    }
  }

  const onLedChanged = (event: CustomEvent<RangeChangeEventDetail>) => {
    if (state.updating) {
      return;
    }

    const value = (event.target as any).value;
    newLed = value;
    setLed(value);
    
    if (value !== state.led) {
      setTimeout(() => {
        console.log(`LED: ${value} ? ${newLed}`);
        if (value === newLed) {
          CraftyControl.updateLED(value).then(() => {
            dispatch({ type: CraftyControlActions.setLED, payload: value });
          });    
        }
      }, 500);
    }
  }

  const onStepChanged = (event: CustomEvent<InputChangeEventDetail>) => {
    const value = parseInt((event.target as any).value);
  if (isNumber(value) && value > 0 && value <= 10) {
      dispatch({ type: CraftyControlActions.setPointStepChanged, payload: value });
    }
  }

  const onBoostStepChanged = (event: CustomEvent<InputChangeEventDetail>) => {
    const value = parseInt((event.target as any).value);
    if (isNumber(value) && value > 0 && value <= 5) {
      dispatch({ type: CraftyControlActions.boostStepChanged, payload: value });
    }
  }

  return (
    !state.connected ? <Redirect to="/connect" /> :
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonImg slot="start" src={`${process.env.PUBLIC_URL}/assets/icon/favicon.png`} style={{ width: 40, height: 40, margin: 8 }} />
            <IonTitle style={{ textAlign: 'center', paddingRight: 56 }}>Crafty Control</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent class="settings-content" scrollX={false} scrollY={false} fullscreen={true}>
          <IonList lines="none">
            <IonListHeader>
              <IonLabel>Settings</IonLabel>
            </IonListHeader>
            <IonItem class="spacer" />
            <IonItem>
              <IonLabel>Units</IonLabel>
              <IonSelect value={state.settings.units} onIonChange={onUnitsChanged}>
                <IonSelectOption value={TemperatureUnit.C}>&deg;C</IonSelectOption>
                <IonSelectOption value={TemperatureUnit.F}>&deg;F</IonSelectOption>
              </IonSelect>
            </IonItem>
            <IonItem>
              <IonLabel>Set Point Step</IonLabel>
              <IonInput inputMode="numeric" value={setPointStep.toFixed(0)} type="number" min="1" max="10" onIonChange={onStepChanged} disabled={state.updating} />
            </IonItem>
            <IonItem>
              <IonLabel>Booster Step</IonLabel>
              <IonInput inputMode="numeric" value={boostStep.toFixed(0)} type="number" min="1" max="5" onIonChange={onBoostStepChanged} disabled={state.updating} />
            </IonItem>
            <IonItem>
              <IonLabel>Vibration</IonLabel>
              <IonToggle checked={vibration} onIonChange={onVibrationChanged} disabled={state.updating} />
            </IonItem>
            <IonItem>
              <IonLabel>Charge Indicator</IonLabel>
              <IonToggle checked={charge} onIonChange={onChargeChanged} disabled={state.updating} />
            </IonItem>
            <IonItem>
              <IonRow class="led-item">
                <IonLabel>LED Brightness</IonLabel>
                <IonRange min={0} max={100} value={led} onIonChange={onLedChanged} step={5} />
              </IonRow>
            </IonItem>
            <IonItem class="spacer" />
          </IonList>
        </IonContent>
      </IonPage>
  );
};

export default Settings;
