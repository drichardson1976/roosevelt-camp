import React, { useState, useRef } from 'react';
import { getDisplayPhoto } from '../utils';
import { ImageCropper } from './ImageCropper';

export const PhotoUploadModal = ({ currentPhoto, onSave, onCancel, shape = 'circle' }) => {
  const fileInputRef = useRef(null);
  const [tempImage, setTempImage] = useState(null);
  const [showCropper, setShowCropper] = useState(false);
  const [isNewUpload, setIsNewUpload] = useState(false);

  const displayPhoto = getDisplayPhoto(currentPhoto);
  const originalPhoto = currentPhoto && typeof currentPhoto === 'object' ? currentPhoto.original : currentPhoto;
  const savedTransform = currentPhoto && typeof currentPhoto === 'object' ? currentPhoto.transform : null;

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setTempImage(reader.result);
        setIsNewUpload(true);
        setShowCropper(true);
      };
      reader.readAsDataURL(file);
    }
    if (e.target) e.target.value = '';
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {showCropper && tempImage ? (
          <div>
            <h3 className="text-lg font-bold text-center mb-4">Adjust Photo</h3>
            <ImageCropper
              image={tempImage}
              onSave={(croppedImg, transform) => { onSave({ cropped: croppedImg, original: isNewUpload ? tempImage : (originalPhoto || tempImage), transform }); setShowCropper(false); setTempImage(null); }}
              onCancel={() => { setShowCropper(false); setTempImage(null); }}
              shape={shape}
              initialTransform={!isNewUpload ? savedTransform : null}
            />
          </div>
        ) : (
          <div>
            <h3 className="text-lg font-bold text-center mb-4">
              {displayPhoto ? 'Update Photo' : 'Add Photo'}
            </h3>
            <div className="flex justify-center mb-6">
              {displayPhoto ? (
                <img src={displayPhoto} className={`w-32 h-32 object-cover border-2 border-gray-300 ${shape === 'circle' ? 'rounded-full' : 'rounded-xl'}`} />
              ) : (
                <div onClick={() => fileInputRef.current?.click()} className={`w-32 h-32 bg-gray-200 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-300 transition-colors ${shape === 'circle' ? 'rounded-full' : 'rounded-xl'}`}>
                  <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                  <span className="text-xs text-gray-500 font-medium">add photo</span>
                </div>
              )}
            </div>
            <div className="space-y-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700"
              >
                {displayPhoto ? 'Upload New Photo' : 'Choose Photo'}
              </button>
              {displayPhoto && (
                <button
                  onClick={() => { setTempImage(originalPhoto || displayPhoto); setIsNewUpload(false); setShowCropper(true); }}
                  className="w-full py-3 bg-blue-50 text-blue-600 font-medium rounded-xl hover:bg-blue-100"
                >
                  Adjust Current Photo
                </button>
              )}
              {displayPhoto && (
                <button
                  onClick={() => onSave(null)}
                  className="w-full py-2 text-red-500 font-medium hover:text-red-600"
                >
                  Remove Photo
                </button>
              )}
              <button
                onClick={onCancel}
                className="w-full py-2 text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
      </div>
    </div>
  );
};
