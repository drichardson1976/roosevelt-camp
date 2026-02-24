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

// ==================== FOOD PHOTOS MANAGER ====================
export const FoodPhotosManager = ({ foodPhotos, getFoodPhoto, onSave }) => {
  const [editingPhoto, setEditingPhoto] = useState(null); // { key, label }
  const [showCropper, setShowCropper] = useState(false);
  const [cropImage, setCropImage] = useState(null);
  const inputRef = useRef(null);

  const FOOD_ITEMS = {
    snacks: [
      { key: 'snack_fruit', label: 'Fresh Fruit' },
      { key: 'snack_granola', label: 'Granola Bars' },
      { key: 'snack_cheese', label: 'Cheese & Crackers' },
      { key: 'snack_veggie', label: 'Veggie Sticks' }
    ],
    drinks: [
      { key: 'drink_water', label: 'Water' },
      { key: 'drink_gatorade', label: 'Gatorade' },
      { key: 'drink_orange', label: 'Orange Juice' },
      { key: 'drink_apple', label: 'Apple Juice' }
    ]
  };

  const handleUploadClick = () => {
    inputRef.current?.click();
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCropImage(reader.result);
        setShowCropper(true);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handleEditClick = () => {
    setCropImage(getFoodPhoto(editingPhoto.key));
    setShowCropper(true);
  };

  const handleCropSave = (croppedImage) => {
    onSave({ ...foodPhotos, [editingPhoto.key]: croppedImage });
    setShowCropper(false);
    setCropImage(null);
    setEditingPhoto(null);
  };

  const handleDelete = () => {
    const updated = { ...foodPhotos };
    delete updated[editingPhoto.key];
    onSave(updated);
    setEditingPhoto(null);
  };

  const renderPhotoGrid = (items, title, colorClass) => (
    <div className={title === 'Snacks' ? 'mb-6' : ''}>
      <h4 className={`font-medium ${colorClass} mb-3`}>{title}</h4>
      <div className="grid grid-cols-4 gap-4">
        {items.map(item => (
          <div key={item.key} className="text-center">
            <div
              className="relative group cursor-pointer"
              onClick={() => setEditingPhoto(item)}
            >
              <img
                src={getFoodPhoto(item.key)}
                alt={item.label}
                className="w-full aspect-square object-cover rounded-xl mb-1 shadow-sm"
                onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/150x150/gray/white?text=No+Image'; }}
              />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center">
                <span className="text-white font-medium text-sm">Edit</span>
              </div>
              {foodPhotos[item.key] && (
                <div className="absolute top-1 right-1 w-2 h-2 bg-green-500 rounded-full" title="Custom photo" />
              )}
            </div>
            <span className="text-xs text-gray-600 block">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-xl shadow p-6">
      <h3 className="font-bold mb-4">🍎 Snacks & Drinks Photos</h3>
      <p className="text-sm text-gray-600 mb-4">
        Click any photo to edit. Green dot indicates a custom uploaded photo.
      </p>
      {renderPhotoGrid(FOOD_ITEMS.snacks, 'Snacks', 'text-green-700')}
      {renderPhotoGrid(FOOD_ITEMS.drinks, 'Beverages', 'text-blue-700')}

      {/* Photo Edit Modal */}
      {editingPhoto && !showCropper && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="bg-green-600 text-white px-6 py-4 flex justify-between items-center">
              <h2 className="font-display text-lg">Edit: {editingPhoto.label}</h2>
              <button onClick={() => setEditingPhoto(null)} className="text-2xl hover:bg-green-500 rounded px-2">×</button>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <p className="text-xs text-gray-500 mb-2 text-center">Preview (exactly as shown on website)</p>
                <img
                  src={getFoodPhoto(editingPhoto.key)}
                  alt={editingPhoto.label}
                  className="w-full aspect-square object-cover rounded-xl shadow-md"
                  onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/300x300/gray/white?text=No+Image'; }}
                />
              </div>
              <div className="space-y-2">
                <button
                  onClick={handleUploadClick}
                  className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
                >
                  📷 Upload New Photo
                </button>
                <button
                  onClick={handleEditClick}
                  className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
                >
                  ✂️ Adjust Position, Zoom & Rotate
                </button>
                {foodPhotos[editingPhoto.key] && (
                  <button
                    onClick={handleDelete}
                    className="w-full py-3 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 flex items-center justify-center gap-2"
                  >
                    🗑️ Reset to Default
                  </button>
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
      {showCropper && cropImage && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="bg-green-600 text-white px-6 py-4 flex justify-between items-center">
              <h2 className="font-display text-lg">Adjust: {editingPhoto.label}</h2>
              <button onClick={() => { setShowCropper(false); setCropImage(null); }} className="text-2xl hover:bg-green-500 rounded px-2">×</button>
            </div>
            <div className="p-6">
              <ImageCropper
                image={cropImage}
                shape="square"
                onSave={handleCropSave}
                onCancel={() => { setShowCropper(false); setCropImage(null); }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

