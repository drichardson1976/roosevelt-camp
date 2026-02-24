import React, { useEffect } from 'react';

export const Toast = ({ message, type, onDone }) => {
  useEffect(() => {
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, []);
  return <div className={'fixed top-16 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-lg shadow-lg text-white ' + (type === 'error' ? 'bg-red-500' : 'bg-green-600')}>{message}</div>;
};
