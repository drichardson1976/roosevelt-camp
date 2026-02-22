console.log('⏱️ [INDEX] Step 2: JS module loaded: ' + (performance.now() - (window.__t0 || 0)).toFixed(0) + 'ms');

import React from 'react';
import ReactDOM from 'react-dom/client';
import '../shared/styles.css';
import { ErrorBoundary } from '../shared/utils';
import { RooseveltCamp } from './App';

console.log('⏱️ [INDEX] Step 3: All imports resolved: ' + (performance.now() - (window.__t0 || 0)).toFixed(0) + 'ms');

ReactDOM.createRoot(document.getElementById('root')).render(
  <ErrorBoundary><RooseveltCamp /></ErrorBoundary>
);
