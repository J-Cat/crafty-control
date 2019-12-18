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
  IonItemGroup,
  IonItemDivider,
} from '@ionic/react';
import React, { useContext } from 'react';
import './Information.css';
import { AppContext } from '../../state/State';
import { ICraftyControlState } from '../../state/ICraftyControlState';
import { IAction } from '../../state/IAction';
import { RouteComponentProps, Redirect } from 'react-router';
import { CraftyUuids } from '../../model/craftyUuids';
import CraftyLogo from '../../assets/favicon.png';

const Information: React.FC<RouteComponentProps> = () => {
  const { state } = useContext(AppContext) as { state: ICraftyControlState, dispatch: React.Dispatch<IAction> };
  const otherUuids = Object.keys(state.info.data).filter(uuid => !Object.values(CraftyUuids.Battery).includes(uuid));

  return (
    !state.connected ? <Redirect to="/connect" /> :
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonImg slot="start" src={CraftyLogo} style={{ width: 40, height: 40, margin: 8 }} />
            <IonTitle style={{ textAlign: 'center', paddingRight: 56 }}>Crafty Control</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent class="info-content" scrollY={true}>
          <IonList lines="none">
            <IonListHeader>
              <IonLabel>Information</IonLabel>
            </IonListHeader>
            <IonItem class="spacer" />
            <IonItemGroup>
              <IonItemDivider>
                <IonLabel>General</IonLabel>
              </IonItemDivider>
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
            </IonItemGroup>
            <IonItemGroup>
              <IonItemDivider>
                <IonLabel>Battery</IonLabel>
              </IonItemDivider>
              <IonItem>
                <IonLabel className="label">Remaining:</IonLabel>
                <IonLabel className="value">{state.info.data[CraftyUuids.Battery.RemainingUuid] ? state.info.data[CraftyUuids.Battery.RemainingUuid].value : ''}mAh</IonLabel>
              </IonItem>
              <IonItem>
                <IonLabel className="label">Capacity:</IonLabel>
                <IonLabel className="value">{state.info.data[CraftyUuids.Battery.TotalUuid] ? state.info.data[CraftyUuids.Battery.TotalUuid].value : ''}mAh</IonLabel>
              </IonItem>
              <IonItem>
                <IonLabel className="label">Design:</IonLabel>
                <IonLabel className="value">{state.info.data[CraftyUuids.Battery.DesignUuid] ? state.info.data[CraftyUuids.Battery.DesignUuid].value : ''}mAh</IonLabel>
              </IonItem>
              <IonItem>
                <IonLabel className="label">Discharge Cycles:</IonLabel>
                <IonLabel className="value">{state.info.data[CraftyUuids.Battery.DischargeCyclesUuid] ? state.info.data[CraftyUuids.Battery.DischargeCyclesUuid].value : ''}</IonLabel>
              </IonItem>
              <IonItem>
                <IonLabel className="label">Charge Cycles:</IonLabel>
                <IonLabel className="value">{state.info.data[CraftyUuids.Battery.ChargeCyclesUuid] ? state.info.data[CraftyUuids.Battery.ChargeCyclesUuid].value : ''}</IonLabel>
              </IonItem>
            </IonItemGroup>
            <IonItemGroup hidden={otherUuids.length === 0}>
              <IonItemDivider>
                <IonLabel>Miscellaneous</IonLabel>
              </IonItemDivider>
              {otherUuids.map((uuid) => {
                const item = state.info.data[uuid];
                return (
                  <IonItem>
                    <IonLabel className="label">{item.label}</IonLabel>
                    <IonLabel className="value">{(item.type === 'hex' ? ((item.value as number)/(item.divider || 1)).toFixed(Math.floor((item.divider || 0)/10)) : item.value) + (item.suffix || '')}</IonLabel>
                  </IonItem>
                );
              })}
            </IonItemGroup>
            <IonItem class="spacer" />
          </IonList>
        </IonContent>
      </IonPage>
  );
};

export default Information;
