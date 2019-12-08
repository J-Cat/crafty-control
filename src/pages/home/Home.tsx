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
  IonIcon,
  IonButton,
  IonRow,
  IonAlert
} from '@ionic/react';
import { add, remove } from 'ionicons/icons';
import React, { useContext, useState, useEffect } from 'react';
import './Home.css';
import { AppContext } from '../../state/State';
import { ICraftyControlState, TemperatureUnit } from '../../state/ICraftyControlState';
import { IAction } from '../../state/IAction';
import { Redirect } from 'react-router';
import CraftyControl from '../../crafty/WebBluetoothCraftyControl';

const Home: React.FC = () => {
  const { state } = useContext(AppContext) as { state: ICraftyControlState, dispatch: React.Dispatch<IAction> };
  const [sp, setSP] = useState(-1);
  const [spDialogOpen, setSPDialogOpen] = useState(false);

  useEffect(() => {
    if ((sp <= 0 || !spDialogOpen) && (sp !== state.setPoint)) {
      setSP(state.setPoint);
    }
  }, [state.setPoint, spDialogOpen, sp]);

  const updateSetPoint = (value: number) => {
    const min = state.settings.units === TemperatureUnit.C ? 40 : 104;
    const max = state.settings.units === TemperatureUnit.C ? 210 : 410;
    let newValue = Math.floor(value);
    if (value < min) {
      newValue = min;
    } else if (value > max) {
      newValue = max;
    }
    CraftyControl.updateSetPoint(newValue).then(() => {
      if (newValue + state.settings.boostStep > max) {
        CraftyControl.updateBoost(max - newValue);
      }
    });
  }

  const updateBoost = (value: number) => {
    const max = state.settings.units === TemperatureUnit.C ? 210 : 410;
    let newValue = Math.floor(value);
    if (newValue < 0) {
      newValue = 0;
    } else if ((state.setPoint + value) > max) {
      newValue = max - state.setPoint;
    }
    CraftyControl.updateBoost(newValue);
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
        <IonContent class="content" scrollX={false} scrollY={false} fullscreen={true}>
          <IonList lines="none">
            <IonListHeader>
              <IonLabel>Temperature</IonLabel>
            </IonListHeader>
            <IonItem class="spacer-home" />
            <IonItem class="temperature-item">
              <IonLabel class="temperature-label">{state.temperature.toFixed(1)}&deg;{state.settings.units === TemperatureUnit.C ? "C" : "F"}</IonLabel>
            </IonItem>
            <IonItem class="setpoint-item">
              <IonIcon class="spacer" />
              <IonButton class="setpoint-button" onClick={() => updateSetPoint(state.setPoint - state.settings.setPointStep)}>
                <IonIcon icon={remove} />
              </IonButton>
              <IonLabel class="setpoint-input" onClick={() => setSPDialogOpen(true)}>{state.setPoint.toFixed(1)}&deg;{state.settings.units === TemperatureUnit.C ? "C" : "F"}</IonLabel>
              <IonButton class="setpoint-button" onClick={() => updateSetPoint(state.setPoint + state.settings.setPointStep)} >
                <IonIcon icon={add} />
              </IonButton>
              <IonIcon class="spacer" />
            </IonItem>
            <IonItem>
              <IonIcon class="spacer" />
              <svg width={200} height={60} className="battery" key={state.batteryPercent}>
                <rect width={180} height={40}
                  stroke="#CCC" strokeWidth={2}
                  x={5} y={5} rx={10} ry={10}
                  className="battery-container" />
                <rect
                  width={Math.round(state.batteryPercent / 100 * 160)}
                  height={20}
                  x={15} y={15} rx={5} ry={5}
                  className="battery-gauge" />
                <rect width={10} height={20} x={185} y={15} className="battery-button" />
                <text x={100} y={30}
                  className="battery-text"
                >
                  {state.batteryPercent.toFixed(0)}%
              </text>
              </svg>
              <IonIcon class="spacer" />
            </IonItem>
            <IonItem class="spacer-home" />
            <IonItem class="booster">
              <IonRow class="booster-row">
                <IonButton class="booster-button" onClick={() => updateBoost(state.boost - state.settings.boostStep)}>
                  <IonIcon icon={remove} />
                </IonButton>
                <IonRow class="booster-text">
                  <IonLabel class="booster-title">Booster Temperature</IonLabel>
                  <IonIcon class="spacer" />
                  <IonLabel class="booster-value">+{state.boost} &deg;{state.settings.units === TemperatureUnit.C ? 'C' : 'F'}</IonLabel>
                </IonRow>
                <IonButton class="booster-button" onClick={() => updateBoost(state.boost + state.settings.boostStep)} >
                  <IonIcon icon={add} />
                </IonButton>
              </IonRow>
            </IonItem>
          </IonList>
        </IonContent>
        <IonAlert
          isOpen={spDialogOpen}
          onDidDismiss={() => setSPDialogOpen(false)}
          header="Set Point"
          message="Please enter a new set point value"
          inputs={[{
            name: 'setPoint',
            label: 'Set Point',
            type: 'number',
            value: sp
          }]}
          buttons={[{
            text: 'Ok',
            handler: (values) => {
              updateSetPoint(values.setPoint);
            }
          }]}
        />
      </IonPage>
  );
};

export default Home;
