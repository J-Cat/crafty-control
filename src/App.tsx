import React, { useContext } from 'react';
import { Redirect, Route } from 'react-router-dom';
import {
  IonApp,
  IonIcon,
  IonLabel,
  IonRouterOutlet,
  IonTabBar,
  IonTabButton,
  IonTabs
} from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { thermometer, settings, information } from 'ionicons/icons';
import { AppContext } from './state/State';
import { ICraftyControlState } from './state/ICraftyControlState';
import { IAction } from './state/IAction';

import Connect from './pages/connect';
import Home from './pages/home';
import Settings from './pages/settings';
import Information from './pages/information';

/* Core CSS required for Ionic components to work properly */
import '@ionic/react/css/core.css';

/* Basic CSS for apps built with Ionic */
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';

/* Optional CSS utils that can be commented out */
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';

/* Theme variables */
import './theme/variables.css';

const App: React.FC = () => {
  const { state, dispatch } = useContext(AppContext) as {state: ICraftyControlState, dispatch: React.Dispatch<IAction>};

  return (
    <IonApp>
      <IonReactRouter>
        <IonTabs>
          <IonRouterOutlet>
            <Route path="/connect" component={Connect} exact={true} />
            <Route path="/home" component={Home} exact={true} />
            <Route path="/settings" component={Settings} exact={true} />
            <Route path="/info" component={Information} exact={true} />
            <Route path="/" render={() => <Redirect to="/connect" />} exact={true} />
          </IonRouterOutlet>
          <IonTabBar slot="bottom">
            <IonTabButton tab="home" href="/home" disabled={!state.connected}>
              <IonIcon icon={thermometer} />
              <IonLabel>Temperature</IonLabel>
            </IonTabButton>
            <IonTabButton tab="settings" href="/settings" disabled={!state.connected}>
              <IonIcon icon={settings} />
              <IonLabel>Settings</IonLabel>
            </IonTabButton>
            <IonTabButton tab="info" href="/info" disabled={!state.connected}>
              <IonIcon icon={information} />
              <IonLabel>Information</IonLabel>
            </IonTabButton>
          </IonTabBar>
        </IonTabs>
      </IonReactRouter>
    </IonApp>
  );
};

export default App;
