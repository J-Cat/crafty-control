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
  IonRow
} from '@ionic/react';
import { add, remove } from 'ionicons/icons';
import React, { useContext } from 'react';
import './Home.css';
import { AppContext } from '../../state/State';
import { ICraftyControlState, TemperatureUnit } from '../../state/ICraftyControlState';
import { IAction } from '../../state/IAction';
import { Redirect } from 'react-router';
import { InputChangeEventDetail } from '@ionic/core';
import CraftyControl from '../../crafty/WebBluetoothCraftyControl';
import { Battery } from 'react-visual-graphic';

const Home: React.FC = () => {
  const { state, dispatch } = useContext(AppContext) as {state: ICraftyControlState, dispatch: React.Dispatch<IAction>};

  let setPoint = state.setPoint;

  const setPointChange = (event: CustomEvent<InputChangeEventDetail>) => {
    setPoint = (event.target as any).value as number;
  }

  const setPointFinishChange = (event: CustomEvent<void>) => {
    CraftyControl.updateSetPoint(Math.floor(setPoint)).then(() => {
      alert('updated');
    });
    // dispatch({type: CraftyControlActions.updateSetPoint, payload: setPoint });
  }

  const updateSetPoint = (value: number) => {
    CraftyControl.updateSetPoint(Math.floor(value));
  }

  const updateBoost = (value: number) => {
    CraftyControl.updateBoost(Math.floor(value));
  }

  return (
    !state.connected ? <Redirect to="/connect" /> :
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonImg slot="start" src="assets/icon/favicon.png" style={{width: 40, height: 40, margin: 8 }} />
          <IonTitle style={{textAlign: 'center', paddingRight: 56}}>Crafty Control</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent class="content" scrollX={false} scrollY={false} fullscreen={true}>
        <IonList lines="none">
          <IonListHeader>
            <IonLabel>Temperature</IonLabel>
          </IonListHeader>
          <IonItem class="spacer" />
          <IonItem class="temperature-item">
            <IonLabel class="temperature-label">{state.temperature.toFixed(1)}&deg;{state.settings.units === TemperatureUnit.C ? "C" : "F"}</IonLabel>
          </IonItem>
          <IonItem class="setpoint-item">
            <IonIcon class="spacer" />
            <IonButton class="setpoint-button" onClick={() => updateSetPoint(state.setPoint-1)}>
              <IonIcon icon={remove} />
            </IonButton>
            <IonLabel class="setpoint-input">{setPoint.toFixed(1)}&deg;{state.settings.units === TemperatureUnit.C ? "C" : "F"}</IonLabel>
            <IonButton class="setpoint-button" onClick={() => updateSetPoint(state.setPoint+1)} >
              <IonIcon icon={add} />
            </IonButton>
            <IonIcon class="spacer" />
          </IonItem>
          <IonItem>
            <IonIcon class="spacer" />
            <svg width= {200} height= {60} className="battery" key={state.batteryPercent}>
              <rect width={180} height={40} 
                stroke="#CCC" stroke-width={2} 
                x={5} y={5} rx={10} ry={10} 
                className="battery-container" />
              <rect 
                width={Math.round(state.batteryPercent/100 * 160)}
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
          <IonItem class="spacer" />
          <IonItem class="booster">
            <IonRow class="booster-row">
              <IonButton class="booster-button" onClick={() => updateBoost(state.boost-1)}>
                <IonIcon icon={remove} />
              </IonButton>
              <IonRow class="booster-text">
                <IonLabel class="booster-title">Booster Temperature</IonLabel>
                <IonIcon class="spacer" />
                <IonLabel class="booster-value">+{state.boost} &deg;{state.settings.units === TemperatureUnit.C ? 'C' : 'F'}</IonLabel>
              </IonRow>
              <IonButton class="booster-button" onClick={() => updateBoost(state.boost+1)} >
                <IonIcon icon={add} />
              </IonButton>
            </IonRow>
          </IonItem>
        </IonList>
      </IonContent>
    </IonPage>
  );
};

export default Home;
