import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { DataProvider } from './DataProvider';
import { MetaMaskProvider } from '@metamask/sdk-react';

import './assets/css/style.css'
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <MetaMaskProvider debug={false} sdkOptions={{
    logging:{
        developerMode: false,
      },
      communicationServerUrl: process.env.REACT_APP_COMM_SERVER_URL,
      checkInstallationImmediately: false, // This will automatically connect to MetaMask on page load
      i18nOptions: {
        enabled: true,
      },
      dappMetadata: {
        name: "Demo React App",
        url: window.location.host,
      }
  }}>
    <BrowserRouter>
      <DataProvider>
        <App />
      </DataProvider>
    </BrowserRouter>
  </MetaMaskProvider>
);