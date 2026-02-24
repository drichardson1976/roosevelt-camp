import React, { useState, useEffect, useRef } from 'react';

export const StableInput = React.memo(({ value, onSave, type = 'text', className = '', placeholder = '' }) => {
  const [local, setLocal] = useState(value || '');
  const inputRef = useRef(null);
  const initialValue = useRef(value);

  useEffect(() => {
    if (value !== initialValue.current && document.activeElement !== inputRef.current) {
      setLocal(value || '');
      initialValue.current = value;
    }
  }, [value]);

  const handleBlur = () => {
    if (local !== value) {
      onSave(local);
      initialValue.current = local;
    }
  };

  return (
    <input
      ref={inputRef}
      type={type}
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={handleBlur}
      className={className}
      placeholder={placeholder}
      autoComplete="off"
      data-1p-ignore="true"
      data-lpignore="true"
      data-form-type="other"
    />
  );
});

export const StableTextarea = React.memo(({ value, onSave, className = '', placeholder = '', rows = 3 }) => {
  const [local, setLocal] = useState(value || '');
  const ref = useRef(null);
  const initialValue = useRef(value);

  useEffect(() => {
    if (value !== initialValue.current && document.activeElement !== ref.current) {
      setLocal(value || '');
      initialValue.current = value;
    }
  }, [value]);

  const handleBlur = () => {
    if (local !== value) {
      onSave(local);
      initialValue.current = local;
    }
  };

  return (
    <textarea
      ref={ref}
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={handleBlur}
      className={className}
      placeholder={placeholder}
      rows={rows}
      autoComplete="off"
      data-1p-ignore="true"
      data-lpignore="true"
      data-form-type="other"
    />
  );
});
