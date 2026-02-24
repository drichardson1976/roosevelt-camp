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

// ==================== CHILDREN TAB (All Child Profiles) ====================
export const ChildrenTab = ({ children, childParentLinks, users, registrations, onSaveChildren, onSaveLinks, showToast }) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Get all children profiles from BOTH sources:
  // 1. Standalone children from camp_children table
  // 2. Legacy children embedded in user accounts
  const getAllChildren = () => {
    // Start with standalone children
    const standaloneChildren = children.map(child => ({
      ...child,
      source: 'standalone',
      parents: childParentLinks
        .filter(link => link.childId === child.id)
        .map(link => users.find(u => u.email === link.parentEmail))
        .filter(Boolean),
      hasRegistrations: registrations.some(r => r.childId === child.id)
    }));

    // Add legacy children from users (avoid duplicates)
    const legacyChildren = users.flatMap(user =>
      (user.children || [])
        .filter(child => !children.some(c => c.id === child.id)) // Don't duplicate
        .map(child => ({
          ...child,
          source: 'legacy',
          parents: [user],
          parentEmail: user.email,
          parentName: user.name,
          hasRegistrations: registrations.some(r => r.childId === child.id)
        }))
    );

    return [...standaloneChildren, ...legacyChildren];
  };

  const allChildren = getAllChildren();
  const filteredChildren = allChildren.filter(c =>
    c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.parents?.some(p => p?.name?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Separate into registered (campers) and not registered (children)
  const unregisteredChildren = filteredChildren.filter(c => !c.hasRegistrations);
  const registeredChildren = filteredChildren.filter(c => c.hasRegistrations);

  const getAge = (birthdate) => {
    if (!birthdate) return null;
    const today = new Date();
    const birth = new Date(birthdate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  const ChildCard = ({ child }) => {
    const age = getAge(child.birthdate);
    return (
      <div className="border rounded-xl p-4 hover:shadow-md transition-shadow">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0">
            {getDisplayPhoto(child.photo) ? (
              <img src={getDisplayPhoto(child.photo)} alt={child.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gray-200 flex flex-col items-center justify-center">
                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                <span className="text-[8px] text-gray-500 font-medium">add photo</span>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-gray-800 truncate">{child.name}</h4>
            <div className="text-sm text-gray-600">
              {age && <span>Age {age}</span>}
              {child.grade && <span className="ml-2">• Grade {child.grade}</span>}
            </div>
            {child.parents?.length > 0 && (
              <div className="text-xs text-gray-500 mt-1">
                Parents: {child.parents.map(p => p.name).join(', ')}
              </div>
            )}
          </div>
          <div className="flex-shrink-0">
            {child.hasRegistrations ? (
              <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                ✓ Registered
              </span>
            ) : (
              <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full font-medium">
                Not Registered
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg">
        <p className="text-blue-800">
          <strong>Children &amp; Campers:</strong> All child profiles are shown here. When children register for camp sessions, they become "campers" but remain in this list. Children are never deleted when they become campers - they simply gain registered status.
        </p>
      </div>

      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-lg text-green-800">👶 All Children Profiles ({allChildren.length})</h3>
          <input
            type="text"
            placeholder="Search children or parents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-4 py-2 border rounded-lg w-64"
          />
        </div>

        {unregisteredChildren.length > 0 && (
          <div className="mb-6">
            <h4 className="font-medium text-yellow-700 mb-3 flex items-center gap-2">
              <span className="w-3 h-3 bg-yellow-400 rounded-full"></span>
              Not Yet Registered ({unregisteredChildren.length})
            </h4>
            <div className="grid md:grid-cols-2 gap-4">
              {unregisteredChildren.map(child => (
                <ChildCard key={child.id} child={child} />
              ))}
            </div>
          </div>
        )}

        {registeredChildren.length > 0 && (
          <div>
            <h4 className="font-medium text-green-700 mb-3 flex items-center gap-2">
              <span className="w-3 h-3 bg-green-500 rounded-full"></span>
              🏕️ Registered as Campers ({registeredChildren.length})
            </h4>
            <div className="grid md:grid-cols-2 gap-4">
              {registeredChildren.map(child => (
                <ChildCard key={child.id} child={child} />
              ))}
            </div>
          </div>
        )}

        {allChildren.length === 0 && (
          <p className="text-gray-500 text-center py-8">No children profiles found. Children are created when parents complete onboarding.</p>
        )}
      </div>
    </div>
  );
};

