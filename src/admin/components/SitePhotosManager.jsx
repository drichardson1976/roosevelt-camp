import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase, SCHEMA } from '../../shared/config';
import { storage, isDev, formatPhone, isValidPhone, formatBirthdate, formatTimestamp, calculateAge, getDisplayPhoto, getSessionCost, photoStorage, KIDS_PER_COUNSELOR, generateVenmoCode } from '../../shared/utils';
import { StableInput, StableTextarea } from '../../shared/components/StableInput';
import { Modal } from '../../shared/components/Modal';
import { ScrollableTabs } from '../../shared/components/ScrollableTabs';
import { ImageCropper, ImageUpload } from '../../shared/components/ImageCropper';
import { PhotoUploadModal } from '../../shared/components/PhotoUploadModal';
import { CAMP_DATES, CAMP_WEEKS, getCampDateRange, CAMP_DATE_RANGE, getWeeks, generateCampDates } from '../../shared/campDates';
import { DEFAULT_CONTENT, DEFAULT_COUNSELORS, DEFAULT_ADMINS } from '../../shared/defaults';
import { calculateDiscountedTotal } from '../../shared/pricing';

// ==================== SITE PHOTOS MANAGER ====================
export const SitePhotosManager = ({ sitePhotos, onSave }) => {
  const [editingPhoto, setEditingPhoto] = useState(null);
  const [showCropper, setShowCropper] = useState(false);
  const [cropImage, setCropImage] = useState(null);
  const [cropTransform, setCropTransform] = useState(null);
  const [isNewUpload, setIsNewUpload] = useState(false);
  const inputRef = useRef(null);

  const SITE_PHOTO_CONFIG = [
    { key: 'hero', label: 'Hero Background', description: 'Large banner image behind the camp title', aspectRatio: 16/9 },
    { key: 'dropoff', label: 'Drop-off Photo', description: 'Camper being dropped off at gym entrance', aspectRatio: 4/3 },
    { key: 'layups', label: 'Skills Training Photo', description: 'Counselor working with kids on layups/drills', aspectRatio: 4/3 },
    { key: 'lunch', label: 'Lunch Photo', description: 'Kids sitting together eating lunch', aspectRatio: 4/3 }
  ];

  // Helper to get cropped image (handles both old string format and new object format)
  const getCroppedImage = (key) => {
    const data = sitePhotos?.[key];
    if (!data) return null;
    return typeof data === 'string' ? data : data.cropped;
  };

  // Helper to get photo data for re-editing
  const getPhotoData = (key) => {
    const data = sitePhotos?.[key];
    if (!data) return null;
    if (typeof data === 'string') return { cropped: data, original: null, transform: null };
    return data;
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCropImage(reader.result);
        setCropTransform(null);
        setIsNewUpload(true);
        setShowCropper(true);
      };
      reader.readAsDataURL(file);
    }
    if (e.target) e.target.value = '';
  };

  const handleReEdit = () => {
    const photoData = getPhotoData(editingPhoto.key);
    if (photoData?.original) {
      setCropImage(photoData.original);
      setCropTransform(photoData.transform);
    } else {
      setCropImage(photoData?.cropped || getCroppedImage(editingPhoto.key));
      setCropTransform(null);
    }
    setIsNewUpload(false);
    setShowCropper(true);
  };

  const handleCropSave = (croppedImage, transform) => {
    const photoData = {
      cropped: croppedImage,
      original: isNewUpload ? cropImage : (getPhotoData(editingPhoto.key)?.original || cropImage),
      transform: transform
    };
    onSave({ ...sitePhotos, [editingPhoto.key]: photoData }, editingPhoto.label);
    setShowCropper(false);
    setCropImage(null);
    setCropTransform(null);
    setIsNewUpload(false);
    setEditingPhoto(null);
  };

  const handleDelete = () => {
    const updated = { ...sitePhotos };
    delete updated[editingPhoto.key];
    onSave(updated, editingPhoto.label);
    setEditingPhoto(null);
  };

  return (
    <div className="bg-white rounded-xl shadow p-6">
      <h3 className="font-bold text-lg text-green-800 mb-2">📸 Site Photos</h3>
      <p className="text-sm text-gray-500 mb-4">Upload photos that appear throughout the website. Photos will be displayed exactly as cropped.</p>

      <div className="grid md:grid-cols-2 gap-6">
        {SITE_PHOTO_CONFIG.map(photo => (
          <div key={photo.key} className="border rounded-xl p-4 hover:border-green-400 transition-colors">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h4 className="font-medium text-gray-800">{photo.label}</h4>
                <p className="text-xs text-gray-500">{photo.description}</p>
              </div>
              {getCroppedImage(photo.key) && (
                <span className="w-3 h-3 bg-green-500 rounded-full" title="Custom photo uploaded" />
              )}
            </div>

            {getCroppedImage(photo.key) ? (
              <div
                className="relative group cursor-pointer rounded-xl overflow-hidden"
                style={{ aspectRatio: photo.aspectRatio }}
                onClick={() => setEditingPhoto(photo)}
              >
                <img
                  src={getCroppedImage(photo.key)}
                  alt={photo.label}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="text-white font-bold text-lg">Edit</span>
                </div>
              </div>
            ) : (
              <div
                className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-gray-200 transition-colors"
                style={{ aspectRatio: photo.aspectRatio }}
                onClick={() => {
                  setEditingPhoto(photo);
                  setTimeout(() => inputRef.current?.click(), 100);
                }}
              >
                <span className="text-4xl mb-2">📷</span>
                <span className="text-sm text-gray-500">Click to upload</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Edit Modal */}
      {editingPhoto && !showCropper && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="bg-green-600 text-white px-6 py-4 flex justify-between items-center">
              <h2 className="font-display text-lg">{editingPhoto.label}</h2>
              <button onClick={() => setEditingPhoto(null)} className="text-2xl hover:bg-green-500 rounded px-2">×</button>
            </div>
            <div className="p-6">
              {getCroppedImage(editingPhoto.key) && (
                <div className="mb-4">
                  <p className="text-sm text-gray-500 mb-2 font-medium">Preview (exactly as shown on website)</p>
                  <img
                    src={getCroppedImage(editingPhoto.key)}
                    alt={editingPhoto.label}
                    className="w-full object-cover rounded-xl shadow"
                    style={{ aspectRatio: editingPhoto.aspectRatio }}
                  />
                </div>
              )}

              <div className="space-y-3">
                <button
                  onClick={() => inputRef.current?.click()}
                  className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium flex items-center justify-center gap-2"
                >
                  <span>📤</span> {getCroppedImage(editingPhoto.key) ? 'Upload New Photo' : 'Upload Photo'}
                </button>

                {getCroppedImage(editingPhoto.key) && (
                  <>
                    <button
                      onClick={handleReEdit}
                      className="w-full py-3 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 font-medium flex items-center justify-center gap-2"
                    >
                      <span>✂️</span> Adjust Position / Zoom
                    </button>
                    <button
                      onClick={handleDelete}
                      className="w-full py-3 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 font-medium flex items-center justify-center gap-2"
                    >
                      <span>🗑️</span> Remove Photo
                    </button>
                  </>
                )}

                <button
                  onClick={() => setEditingPhoto(null)}
                  className="w-full py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>
      )}

      {/* Image Cropper Modal */}
      {showCropper && cropImage && editingPhoto && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="bg-green-600 text-white px-6 py-4 flex justify-between items-center">
              <h2 className="font-display text-lg">Adjust: {editingPhoto.label}</h2>
              <button onClick={() => { setShowCropper(false); setCropImage(null); setCropTransform(null); }} className="text-2xl hover:bg-green-500 rounded px-2">×</button>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-500 mb-4 text-center">The preview below shows exactly how the photo will appear on the website.</p>
              <ImageCropper
                image={cropImage}
                shape="rectangle"
                aspectRatio={editingPhoto.aspectRatio}
                initialTransform={cropTransform}
                onSave={handleCropSave}
                onCancel={() => { setShowCropper(false); setCropImage(null); setCropTransform(null); }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

