import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import './styles/themes.generated.css';
import './styles/color-context.css';
import './styles/page-hero.css';
// Shared component styles load once, in a fixed order across lazy routes.
import './styles/drawer.css';
import './styles/exercise-chip.css';
import './styles/segmented-control.css';
import { bootstrapTheme } from './utils/theme';

// The isolated preview initializes its own root without writing the app preference.
if (window.location.pathname !== '/theme-sandbox/preview') bootstrapTheme();

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
