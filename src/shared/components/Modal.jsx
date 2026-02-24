import React, { useRef } from 'react';

export const Modal = ({ isOpen, onClose, title, children }) => {
  const mouseDownTarget = useRef(null);

  if (!isOpen) return null;

  const handleMouseDown = (e) => {
    mouseDownTarget.current = e.target;
  };

  const handleClick = (e) => {
    if (e.target === e.currentTarget && mouseDownTarget.current === e.currentTarget) {
      onClose();
    }
    mouseDownTarget.current = null;
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onMouseDown={handleMouseDown} onClick={handleClick}>
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <div className="bg-green-800 text-white px-6 py-4 flex justify-between items-center">
          <h2 className="font-display text-2xl">{title}</h2>
          <button onClick={onClose} className="text-2xl hover:bg-green-700 rounded px-2">&times;</button>
        </div>
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">{children}</div>
      </div>
    </div>
  );
};
