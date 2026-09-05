import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource-variable/vazirmatn/wght.css';
import { App } from './App';
import './styles.css';
import './persian.css';
import './font.css';
import './standards.css';
import './heatmap.css';
import './ui-fixes.css';
import './export-center.css';
import './rc-readability.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
