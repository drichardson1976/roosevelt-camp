import React, { useState, useEffect, useRef } from 'react';

export const ImageCropper = ({ image, onSave, onCancel, shape = 'circle', aspectRatio = 1, initialTransform = null }) => {
  const canvasRef = useRef(null);
  const [zoom, setZoom] = useState(initialTransform?.zoom ?? 1);
  const [pos, setPos] = useState({ x: initialTransform?.posX ?? 0, y: initialTransform?.posY ?? 0 });
  const [rotation, setRotation] = useState(initialTransform?.rotation ?? 0);
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [img, setImg] = useState(null);

  const exportW = shape === 'rectangle' ? 1200 : 400;
  const exportH = shape === 'rectangle' ? Math.round(1200 / aspectRatio) : 400;
  const displayW = shape === 'rectangle' ? 300 : 250;
  const displayH = shape === 'rectangle' ? Math.round(300 / aspectRatio) : 250;
  const canvasW = exportW;
  const canvasH = exportH;

  useEffect(() => {
    const i = new Image();
    if (image && image.startsWith('http')) i.crossOrigin = 'anonymous';
    i.onload = () => setImg(i);
    i.src = image;
  }, [image]);

  useEffect(() => {
    if (!img || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    canvas.width = canvasW;
    canvas.height = canvasH;
    ctx.clearRect(0, 0, canvasW, canvasH);
    ctx.save();

    ctx.beginPath();
    if (shape === 'circle') {
      ctx.arc(canvasW / 2, canvasH / 2, Math.min(canvasW, canvasH) / 2, 0, Math.PI * 2);
    } else {
      const radius = 12;
      ctx.moveTo(radius, 0);
      ctx.lineTo(canvasW - radius, 0);
      ctx.quadraticCurveTo(canvasW, 0, canvasW, radius);
      ctx.lineTo(canvasW, canvasH - radius);
      ctx.quadraticCurveTo(canvasW, canvasH, canvasW - radius, canvasH);
      ctx.lineTo(radius, canvasH);
      ctx.quadraticCurveTo(0, canvasH, 0, canvasH - radius);
      ctx.lineTo(0, radius);
      ctx.quadraticCurveTo(0, 0, radius, 0);
    }
    ctx.clip();

    ctx.translate(canvasW / 2, canvasH / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    const scale = zoom * Math.min(canvasW, canvasH) / Math.max(img.width, img.height);
    const w = img.width * scale, h = img.height * scale;
    ctx.drawImage(img, -w / 2 + pos.x, -h / 2 + pos.y, w, h);
    ctx.restore();

    ctx.beginPath();
    if (shape === 'circle') {
      ctx.arc(canvasW / 2, canvasH / 2, Math.min(canvasW, canvasH) / 2 - 2, 0, Math.PI * 2);
    } else {
      const radius = 10;
      const offset = 2;
      ctx.moveTo(radius + offset, offset);
      ctx.lineTo(canvasW - radius - offset, offset);
      ctx.quadraticCurveTo(canvasW - offset, offset, canvasW - offset, radius + offset);
      ctx.lineTo(canvasW - offset, canvasH - radius - offset);
      ctx.quadraticCurveTo(canvasW - offset, canvasH - offset, canvasW - radius - offset, canvasH - offset);
      ctx.lineTo(radius + offset, canvasH - offset);
      ctx.quadraticCurveTo(offset, canvasH - offset, offset, canvasH - radius - offset);
      ctx.lineTo(offset, radius + offset);
      ctx.quadraticCurveTo(offset, offset, radius + offset, offset);
    }
    ctx.strokeStyle = '#16a34a';
    ctx.lineWidth = 4;
    ctx.stroke();
  }, [img, zoom, pos, rotation, shape, canvasW, canvasH]);

  const scaleFactor = exportW / displayW;
  const onMouseDown = (e) => { setDragging(true); setDragStart({ x: e.clientX - pos.x / scaleFactor, y: e.clientY - pos.y / scaleFactor }); };
  const onMouseMove = (e) => { if (dragging) setPos({ x: (e.clientX - dragStart.x) * scaleFactor, y: (e.clientY - dragStart.y) * scaleFactor }); };
  const onMouseUp = () => setDragging(false);
  const rotate90 = () => setRotation((r) => (r + 90) % 360);

  const containerClass = shape === 'circle' ? 'rounded-full' : 'rounded-xl';

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <div
          className={`overflow-hidden cursor-move bg-gray-100 shadow-md ${containerClass}`}
          style={{ width: displayW, height: displayH }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
        >
          <canvas ref={canvasRef} style={{ width: displayW, height: displayH }} />
        </div>
        {shape === 'circle' && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <svg width={displayW} height={displayH} viewBox="0 0 100 100" className="opacity-40">
              <ellipse cx="50" cy="50" rx="28" ry="35" fill="none" stroke="#dc2626" strokeWidth="1.5" />
              <path d="M 36 42 Q 42 37 48 42 Q 42 47 36 42 Z" fill="none" stroke="#dc2626" strokeWidth="1.2" />
              <path d="M 52 42 Q 58 37 64 42 Q 58 47 52 42 Z" fill="none" stroke="#dc2626" strokeWidth="1.2" />
              <path d="M 38 60 Q 44 66 50 66 Q 56 66 62 60" fill="none" stroke="#dc2626" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          </div>
        )}
      </div>
      <div className="flex flex-col gap-2 w-64">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 w-12">Zoom</span>
          <input type="range" min="0.5" max="3" step="0.1" value={zoom} onChange={e => setZoom(parseFloat(e.target.value))} className="flex-1" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 w-16">Rotate</span>
          <input type="range" min="0" max="360" step="1" value={rotation} onChange={e => setRotation(parseInt(e.target.value))} className="flex-1" />
          <button onClick={rotate90} className="px-6 py-3 bg-gray-200 rounded-lg text-2xl hover:bg-gray-300" title="Rotate 90°">↻</button>
        </div>
      </div>
      <div className="flex gap-3">
        <button onClick={onCancel} className="px-4 py-2 bg-gray-200 rounded-lg">Cancel</button>
        <button onClick={() => onSave(canvasRef.current.toDataURL('image/jpeg', 0.95), { zoom, posX: pos.x, posY: pos.y, rotation })} className="px-4 py-2 bg-green-600 text-white rounded-lg">Save</button>
      </div>
    </div>
  );
};

export const ImageUpload = ({ currentImage, onImageChange, label, circular = false }) => {
  const inputRef = useRef(null);
  const [temp, setTemp] = useState(null);
  const [showCrop, setShowCrop] = useState(false);

  const onFile = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => { setTemp(reader.result); setShowCrop(true); };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  if (showCrop && temp) {
    return <ImageCropper image={temp} onSave={(img) => { onImageChange(img); setShowCrop(false); }} onCancel={() => setShowCrop(false)} />;
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <div className="flex items-center gap-4">
        {currentImage ? <img src={currentImage} className={'w-20 h-20 object-cover border ' + (circular ? 'rounded-full' : 'rounded-lg')} /> : <div className={'w-20 h-20 bg-gray-100 border-2 border-dashed flex items-center justify-center text-gray-400 text-xs ' + (circular ? 'rounded-full' : 'rounded-lg')}>No image</div>}
        <div className="flex flex-col gap-2">
          <button onClick={() => inputRef.current?.click()} className="px-3 py-1 bg-green-600 text-white rounded text-sm">{currentImage ? 'Change' : 'Upload'}</button>
          {currentImage && <button onClick={() => onImageChange(null)} className="px-3 py-1 bg-red-100 text-red-600 rounded text-sm">Remove</button>}
        </div>
      </div>
      <input ref={inputRef} type="file" accept="image/*" onChange={onFile} className="hidden" />
    </div>
  );
};
