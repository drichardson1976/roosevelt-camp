import React from 'react';
import ReactDOM from 'react-dom/client';
import '../shared/styles.css';
import { ErrorBoundary } from '../shared/utils';
import { RooseveltCamp } from './App';

ReactDOM.createRoot(document.getElementById('root')).render(
  <ErrorBoundary><RooseveltCamp /></ErrorBoundary>
);
