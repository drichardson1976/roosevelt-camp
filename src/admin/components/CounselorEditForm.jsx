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

// ==================== COUNSELOR EDIT FORM ====================
export const CounselorEditForm = ({ counselor, onSave, onCancel, onDelete }) => {
  const [form, setForm] = useState({ ...counselor });
  const [showPhotoModal, setShowPhotoModal] = useState(false);

  const update = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        {getDisplayPhoto(form.photo) ? (
          <img
            src={getDisplayPhoto(form.photo)}
            className="w-20 h-20 rounded-full object-cover border-2 border-green-600 cursor-pointer hover:opacity-80"
            onClick={() => setShowPhotoModal(true)}
          />
        ) : (
          <div onClick={() => setShowPhotoModal(true)} className="w-20 h-20 rounded-full bg-gray-200 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-300">
            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            <span className="text-[8px] text-gray-500 font-medium">add photo</span>
          </div>
        )}
        <div className="flex-1 text-sm text-gray-500">{getDisplayPhoto(form.photo) ? 'Click photo to update' : 'Click to add photo'}</div>
        {showPhotoModal && (
          <PhotoUploadModal
            currentPhoto={form.photo}
            onSave={(img) => { update('photo', img); setShowPhotoModal(false); }}
            onCancel={() => setShowPhotoModal(false)}
          />
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
          <input
            value={form.name || ''}
            onChange={e => update('name', e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
            placeholder="Full name"
            autoComplete="off"
            data-1p-ignore="true"
            data-lpignore="true"
            data-form-type="other"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            value={form.email || ''}
            onChange={e => update('email', e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
            placeholder="email@example.com"
            autoComplete="off"
            data-1p-ignore="true"
            data-lpignore="true"
            data-form-type="other"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
          <input
            value={form.phone || ''}
            onChange={e => update('phone', formatPhone(e.target.value))}
            className="w-full px-3 py-2 border rounded-lg"
            placeholder="(555) 555-1234"
            autoComplete="off"
            data-1p-ignore="true"
            data-lpignore="true"
            data-form-type="other"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
          <input
            value={form.position || ''}
            onChange={e => update('position', e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
            placeholder="Point Guard"
            autoComplete="off"
            data-1p-ignore="true"
            data-lpignore="true"
            data-form-type="other"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
          <select value={form.year || ''} onChange={e => update('year', e.target.value)} className="w-full px-3 py-2 border rounded-lg">
            <option value="">Select year</option>
            <option value="Freshman">Freshman</option>
            <option value="Sophomore">Sophomore</option>
            <option value="Junior">Junior</option>
            <option value="Senior">Senior</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" checked={form.visible !== false} onChange={e => update('visible', e.target.checked)} className="w-5 h-5" />
          <label className="text-sm font-medium text-gray-700">Visible on website</label>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
        <textarea
          value={form.bio || ''}
          onChange={e => update('bio', e.target.value)}
          className="w-full px-3 py-2 border rounded-lg"
          rows={3}
          placeholder="Short bio..."
          autoComplete="off"
          data-1p-ignore="true"
          data-lpignore="true"
          data-form-type="other"
        />
      </div>

      <div className="flex gap-4 pt-4">
        <button onClick={onCancel} className="flex-1 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">Cancel</button>
        <button onClick={() => onSave(form)} className="flex-1 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Save</button>
      </div>

      {onDelete && counselor?.id && (
        <div className="pt-4 mt-4 border-t">
          <button onClick={() => onDelete(counselor)} className="w-full py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 border border-red-200">
            Delete Counselor
          </button>
        </div>
      )}
    </div>
  );
};

