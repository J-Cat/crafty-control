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
} from '@ionic/react';
import React, { useContext } from 'react';
import './Information.css';
import { AppContext } from '../../state/State';
import { ICraftyControlState } from '../../state/ICraftyControlState';
import { IAction } from '../../state/IAction';
import { RouteComponentProps, Redirect } from 'react-router';

const Information: React.FC<RouteComponentProps> = () => {
  const { state } = useContext(AppContext) as { state: ICraftyControlState, dispatch: React.Dispatch<IAction> };

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
