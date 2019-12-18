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
    IonButton,
    IonImg,
    IonLoading,
    IonAlert,
    IonCheckbox
  } from '@ionic/react';
  import React, { useContext, useState } from 'react';
  import './Connect.css';
import CraftyControl from '../../crafty/WebBluetoothCraftyControl';
import { AppContext } from '../../state/State';
import { ICraftyControlState } from '../../state/ICraftyControlState';
import { IAction } from '../../state/IAction';
import { RouteComponentProps } from 'react-router';
import { CraftyControlActions } from '../../state/CraftyControlActions';
import { CheckboxChangeEventDetail } from '@ionic/core';
import CraftyLogo from '../../assets/favicon.png';

const version = require('../../../package.json').version;
  
const Connect: React.FC<RouteComponentProps> = ({history}) => {
    const { state, dispatch } = useContext(AppContext) as {state: ICraftyControlState, dispatch: React.Dispatch<IAction>};
    const [ connectAlert, setConnectAlert ] = useState(false);
    const [ errorMessage, setErrorMessage ] = useState('');
    const [ detailed, setDetailed ] = useState(false);

    const connectBLE = () => {
      CraftyControl.connect(state.settings.units, detailed, dispatch).then(() => {
        history.push('/home');
      }).catch(reason => {
        dispatch({type: CraftyControlActions.disconnected});
        setErrorMessage(reason);
        setConnectAlert(true);
      });
    };

    const detailedOnChange = (event: CustomEvent<CheckboxChangeEventDetail>) => {
      setDetailed(event.detail.checked);
    };
  
    return (
      <IonPage>
        <IonLabel class="connect-version-label">{version}</IonLabel>
        <IonHeader>
          <IonToolbar>
            <IonImg slot="start" src={CraftyLogo} style={{width: 40, height: 40, margin: 8 }} />
            <IonTitle style={{textAlign: 'center', paddingRight: 56}}>Crafty Control</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent class="connect-content" scrollX={false} scrollY={false} fullscreen={true}>
          <IonList lines="none">
            <IonListHeader>
              <IonLabel>Connect</IonLabel>
            </IonListHeader>
            <IonItem class="spacer" />
            <IonItem hidden={state.connecting || state.connected}>
              <IonButton onClick={connectBLE} size="large">Connect to Crafty</IonButton>
            </IonItem>
            <IonItem hidden={state.connecting || state.connected}>
              <IonCheckbox checked={detailed} onIonChange={detailedOnChange} slot="start" />
              <IonLabel>Get Detailed Information?</IonLabel>
            </IonItem>
            <IonItem class="spacer" />
          </IonList>
          <IonLoading message="Connecting ..." isOpen={state.connecting} />
        </IonContent>
        <IonAlert
          isOpen={connectAlert}
          onDidDismiss={() => setConnectAlert(false)}
          header="Error Connecting"
          message={errorMessage}
          buttons={['Ok']}
        />
      </IonPage>
    );
  };
  
  export default Connect;
  