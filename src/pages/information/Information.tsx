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
  IonInput,
  IonSelect,
  IonSelectOption,
  IonToggle,
  IonRange,
  IonRow,
} from '@ionic/react';
import React, { useContext, useState, useEffect } from 'react';
import './Information.css';
import { AppContext } from '../../state/State';
import { ICraftyControlState, TemperatureUnit } from '../../state/ICraftyControlState';
import { IAction } from '../../state/IAction';
import { RouteComponentProps, Redirect } from 'react-router';
import { SelectChangeEventDetail, ToggleChangeEventDetail, RangeChangeEventDetail } from '@ionic/core';
import { CraftyControlActions } from '../../state/CraftyControlActions';
import CraftyControl from '../../crafty/WebBluetoothCraftyControl';

const Information: React.FC<RouteComponentProps> = ({ history }) => {
  const { state, dispatch } = useContext(AppContext) as { state: ICraftyControlState, dispatch: React.Dispatch<IAction> };
  const [vibration, setVibration] = useState(false);
  const [charge, setCharge] = useState(false);
  const [led, setLed] = useState(-1);
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
      console.log(`SET LED: ${state.led}`);
      setLed(state.led);
    }
  }, [state.craftySettings, state.led, led, charge, vibration]);

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
      CraftyControl.updateCraftySettings(value).then(() => {
        dispatch({ type: CraftyControlActions.updateSettings, payload: value });
        setCharge(!charge);
      });
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

  return (
    !state.connected ? <Redirect to="/connect" /> :
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonImg slot="start" src={`${process.env.PUBLIC_URL}/assets/icon/favicon.png`} style={{ width: 40, height: 40, margin: 8 }} />
            <IonTitle style={{ textAlign: 'center', paddingRight: 56 }}>Crafty Control</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent class="info-content" scrollX={false} scrollY={false} fullscreen={true}>
          <IonList lines="none">
            <IonListHeader>
              <IonLabel>Information</IonLabel>
            </IonListHeader>
            <IonItem class="spacer" />
            <IonItem>
              <IonLabel className="label">Serial #:</IonLabel>
              <IonLabel className="value">{state.info.serial.substr(0, 8)}</IonLabel>
            </IonItem>
            <IonItem>
              <IonLabel className="label">Model:</IonLabel>
              <IonLabel className="value">{state.info.model}</IonLabel>
            </IonItem>
            <IonItem>
              <IonLabel className="label">Version:</IonLabel>
              <IonLabel className="value">{state.info.version}</IonLabel>
            </IonItem>
            <IonItem>
              <IonLabel className="label">Hours:</IonLabel>
              <IonLabel className="value">{state.info.hoursOfOperation}</IonLabel>
            </IonItem>
            <IonItem class="spacer" />
          </IonList>
        </IonContent>
      </IonPage>
  );
};

export default Information;
