import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import './styles/theme-default.css';
import './styles/theme-dark.css';
import './styles/theme-up-and-up.css';
import './styles/theme-baseball.css';
import './styles/theme-neon.css';
import './styles/theme-monokai.css';
import './styles/theme-sunset.css';
import './styles/color-context.css';
import './styles/page-hero.css';
import { bootstrapTheme } from './utils/theme';

bootstrapTheme();

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
