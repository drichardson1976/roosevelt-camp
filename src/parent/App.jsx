import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase, SCHEMA } from '../shared/config';
import { storage, isDev, formatPhone, isValidPhone, formatBirthdate, formatTimestamp, generateVenmoCode, calculateAge, getDisplayPhoto, getSessionCost, photoStorage } from '../shared/utils';
import { RELEASE_NOTES } from '../shared/release-notes';
import { StableInput, StableTextarea } from '../shared/components/StableInput';
import { VersionBanner } from '../shared/components/VersionBanner';
import { Toast } from '../shared/components/Toast';
import { Modal } from '../shared/components/Modal';
import { ScrollableTabs } from '../shared/components/ScrollableTabs';
import { ImageCropper, ImageUpload } from '../shared/components/ImageCropper';
import { PhotoUploadModal } from '../shared/components/PhotoUploadModal';
import { generateCampDates, CAMP_DATES, getCampDateRange, CAMP_DATE_RANGE, getWeeks, CAMP_WEEKS, generateDatesFromGymRentals } from '../shared/campDates';
import { DEFAULT_CONTENT, DEFAULT_COUNSELORS } from '../shared/defaults';
import { calculateDiscountedTotal } from '../shared/pricing';

    // ==================== VERSION INFO ====================
    const VERSION = "13.181";
    // BUILD_DATE - update this timestamp when committing changes
    const BUILD_DATE = new Date("2026-02-28T20:50:00");

    // ==================== COUNSELOR EDIT FORM ====================
    const CounselorEditForm = ({ counselor, onSave, onCancel, onDelete }) => {
      const [form, setForm] = useState({ ...counselor });
      const [showPhotoModal, setShowPhotoModal] = useState(false);

      const update = (field, value) => {
        setForm(prev => ({ ...prev, [field]: value }));
      };

      return (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            {getDisplayPhoto(form.photo) ? (
              <div className="relative">
                <img
                  src={getDisplayPhoto(form.photo)}
                  className="w-20 h-20 rounded-full object-cover border-2 border-green-600 cursor-pointer hover:opacity-80"
                  onClick={() => setShowPhotoModal(true)}
                />
                <button onClick={() => setShowPhotoModal(true)}
                  className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-600 rounded-full text-white text-xs flex items-center justify-center">✎</button>
              </div>
            ) : (
              <div onClick={() => setShowPhotoModal(true)} className="w-20 h-20 rounded-full bg-gray-200 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-300">
                <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                <span className="text-[9px] text-gray-500 font-medium">add photo</span>
              </div>
            )}
            {showPhotoModal && <PhotoUploadModal currentPhoto={form.photo} onSave={(img) => { update('photo', img); setShowPhotoModal(false); }} onCancel={() => setShowPhotoModal(false)} />}
            <div className="flex-1 text-sm text-gray-500">{getDisplayPhoto(form.photo) ? 'Click photo to edit' : 'Click to add photo'}</div>
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

    // ==================== POLICY CONSTANTS ====================
    const PICKUP_POLICY = `
Only authorized emergency contacts may pick up your child.

Upload a photo for the emergency contact, or remind the emergency contact that they will need to show a valid Photo ID.
    `.trim();

    const DROPOFF_POLICY = `
Please sign in your child with the counselor on duty at the main gym entrance.

Morning sessions: Drop-off is between 8:45 AM - 9:00 AM
Afternoon sessions: Drop-off is between 11:45 AM - 12:00 PM
    `.trim();

    // ==================== PARENT ONBOARDING WIZARD ====================
    const ParentOnboarding = ({ onComplete, onBack, parents, saveParents, saveEmergencyContacts, emergencyContacts, saveOnboardingProgress, campers, saveCampers, saveCamperParentLinks, camperParentLinks }) => {
      const [step, setStep] = useState(1);
      const [userData, setUserData] = useState({ name: '', email: '', phone: '', password: '', photo: null });
      const [showPassword, setShowPassword] = useState(false);
      const [campersData, setCampersData] = useState([]);
      const [emergencyData, setEmergencyData] = useState([]);
      const [policiesAccepted, setPoliciesAccepted] = useState({ pickup: false, dropoff: false });
      const [cardData, setCardData] = useState({ number: '', expiry: '', cvc: '', name: '' });
      const [error, setError] = useState('');
      const [submitting, setSubmitting] = useState(false); // Prevents flash during submission
      // State for adding campers/contacts (moved to parent level to avoid re-renders)
      const [showAddCamper, setShowAddCamper] = useState(false);
      const [newCamper, setNewCamper] = useState({ name: '', birthdate: '', birthYear: '', birthMonth: '', birthDay: '', grade: '', phone: '' });
      const [showAddContact, setShowAddContact] = useState(false);
      const [newContact, setNewContact] = useState({ name: '', phone: '', relationship: '', otherRelationship: '', photo: null });
      // Photo modal state
      const [showParentPhotoModal, setShowParentPhotoModal] = useState(false);
      const [showContactPhotoModal, setShowContactPhotoModal] = useState(false);
      const contactNameRef = useRef(null);

      const totalSteps = 6;

      const steps = [
        { num: 1, title: 'Your Account', icon: '👤' },
        { num: 2, title: 'Add Campers', icon: '🏀' },
        { num: 3, title: 'Emergency Contacts', icon: '📞' },
        { num: 4, title: 'Payment', icon: '💳' },
        { num: 5, title: 'Policies', icon: '📋' },
        { num: 6, title: 'Complete', icon: '✅' }
      ];

      // Credit card number formatting
      const formatCardNumber = (value) => {
        const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
        const matches = v.match(/\d{4,16}/g);
        const match = matches && matches[0] || '';
        const parts = [];
        for (let i = 0, len = match.length; i < len; i += 4) {
          parts.push(match.substring(i, i + 4));
        }
        return parts.length ? parts.join(' ') : value;
      };

      // Expiry formatting
      const formatExpiry = (value) => {
        const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
        if (v.length >= 2) {
          return v.substring(0, 2) + '/' + v.substring(2, 4);
        }
        return v;
      };

      // Helper functions for campers
      const addCamper = () => {
        if (!newCamper.name || !newCamper.birthdate || !newCamper.grade) return;
        setCampersData([...campersData, { ...newCamper, id: 'camper_' + Date.now() }]);
        setNewCamper({ name: '', birthdate: '', birthYear: '', birthMonth: '', birthDay: '', grade: '', phone: '' });
        setShowAddCamper(false);
      };

      const removeCamper = (id) => {
        setCampersData(campersData.filter(c => c.id !== id));
      };

      const getEligibility = (grade, birthdate) => {
        const gradeNum = parseInt(grade);
        if (gradeNum >= 3 && gradeNum <= 8) return { eligible: true, status: 'Eligible', color: 'green' };
        if (gradeNum < 3) return { eligible: false, status: 'Too young - must be in 3rd grade or higher', color: 'yellow' };
        return { eligible: false, status: 'Too old - camp is for grades 3-8', color: 'orange' };
      };

      // Helper functions for emergency contacts
      const [contactError, setContactError] = useState('');
      const addContact = () => {
        setContactError('');
        if (!newContact.name || !newContact.phone || !newContact.relationship) return;
        if (newContact.relationship === 'Other' && !newContact.otherRelationship) return;
        if (!isValidPhone(newContact.phone)) {
          setContactError('Please enter a valid 10-digit phone number');
          return;
        }
        setEmergencyData([...emergencyData, {
          ...newContact,
          id: 'contact_' + Date.now(),
          isParent: false,
          priority: emergencyData.length + 2
        }]);
        setNewContact({ name: '', phone: '', relationship: '', otherRelationship: '', photo: null });
        setShowAddContact(false);
      };

      const removeContact = (id) => {
        setEmergencyData(emergencyData.filter(c => c.id !== id));
      };

      const hasNonParentContact = emergencyData.some(c => !c.isParent);

      // Auto-focus on contact name input when adding a new contact
      useEffect(() => {
        if (showAddContact && contactNameRef.current) {
          setTimeout(() => contactNameRef.current?.focus(), 100);
        }
      }, [showAddContact]);

      const validateStep = () => {
        setError('');
        if (step === 1) {
          if (!userData.name || !userData.email || !userData.phone || !userData.password) {
            setError('Please fill in all required fields');
            return false;
          }
          if (!isValidPhone(userData.phone)) {
            setError('Please enter a valid 10-digit phone number: (555) 555-1234');
            return false;
          }
          if (parents.some(p => p.email === userData.email)) {
            setError('An account with this email already exists');
            return false;
          }
        }
        // Step 2: Require at least one camper
        if (step === 2) {
          if (campersData.length === 0) {
            setError('Please add at least one camper before continuing');
            return false;
          }
        }
        // Steps 3-4 are skippable, step 5 (Policies) is required
        if (step === 5) {
          if (!policiesAccepted.pickup || !policiesAccepted.dropoff) {
            setError('You must accept both the drop-off and pick-up policies before continuing.');
            return false;
          }
        }
        // Emergency contact phone validation (if adding contacts)
        if (step === 3 && emergencyData.length > 0) {
          const invalidContact = emergencyData.find(c => !isValidPhone(c.phone));
          if (invalidContact) {
            setError(`Please enter a valid 10-digit phone for ${invalidContact.name}`);
            return false;
          }
        }
        return true;
      };

      // Allow completing registration early (skip remaining steps)
      const handleComplete = async () => {
        // Show submitting screen to prevent flash
        setSubmitting(true);

        // Create user account with whatever data we have
        const newUser = {
          email: userData.email,
          name: userData.name,
          phone: userData.phone,
          photo: userData.photo,
          role: 'parent',
          roles: ['parent'],
          onboardingComplete: true,
          onboardingCompletedAt: new Date().toISOString(),
          policiesAccepted: policiesAccepted.pickup && policiesAccepted.dropoff ? {
            pickup: true,
            dropoff: true,
            acceptedAt: new Date().toISOString()
          } : null
        };
        if (userData.password) {
          try {
            const hashRes = await fetch('/.netlify/functions/hash-password', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ password: userData.password })
            });
            const hashData = await hashRes.json();
            if (hashRes.ok) newUser.passwordHash = hashData.passwordHash;
          } catch (e) { /* Continue without hash */ }
        }
        await saveParents([...parents, newUser]);

        // Save campers and create parent links
        if (campersData.length > 0 && saveCampers && saveCamperParentLinks) {
          const newCampers = campersData.map(c => ({
            ...c,
            createdAt: new Date().toISOString()
          }));
          await saveCampers([...(campers || []), ...newCampers]);

          // Create links between campers and this parent
          const newLinks = campersData.map(c => ({
            camperId: c.id,
            parentEmail: userData.email
          }));
          await saveCamperParentLinks([...(camperParentLinks || []), ...newLinks]);
        }

        // Save emergency contacts if any were added
        if (emergencyData.length > 0) {
          const allContacts = [
            { id: 'ec_' + Date.now(), name: userData.name, phone: userData.phone, relationship: 'Parent', isParent: true, priority: 1, userEmail: userData.email },
            ...emergencyData.map((c, i) => ({ ...c, userEmail: userData.email, priority: i + 2 }))
          ];
          await saveEmergencyContacts([...emergencyContacts, ...allContacts]);
        }

        onComplete(newUser);
      };

      const handleNext = async () => {
        if (!validateStep()) return;

        if (step === totalSteps) {
          await handleComplete();
          return;
        }

        setStep(step + 1);
      };

      const handleBack = () => {
        if (step === 1) {
          onBack();
        } else {
          setStep(step - 1);
        }
      };

      // Submitting screen - prevents flash during async operations
      if (submitting) {
        return (
          <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center">
            <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-md">
              <div className="text-6xl mb-4">🏀</div>
              <h2 className="font-display text-2xl text-green-800 mb-2">Creating Your Account...</h2>
              <p className="text-gray-600">Please wait while we save your information.</p>
              <div className="mt-4 flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
              </div>
            </div>
          </div>
        );
      }

      return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 py-8">
          <div className="max-w-lg mx-auto px-4">
            {/* Progress Bar */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                {steps.map((s) => (
                  <div
                    key={s.num}
                    className={`flex flex-col items-center ${s.num <= step ? 'text-green-600' : 'text-gray-400'}`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
                      s.num < step ? 'bg-green-600 text-white' :
                      s.num === step ? 'bg-green-100 border-2 border-green-600' : 'bg-gray-200'
                    }`}>
                      {s.num < step ? '✓' : s.icon}
                    </div>
                    <span className="text-xs mt-1 hidden sm:block">{s.title}</span>
                  </div>
                ))}
              </div>
              <div className="h-2 bg-gray-200 rounded-full">
                <div
                  className="h-2 bg-green-600 rounded-full transition-all"
                  style={{ width: `${((step - 1) / (totalSteps - 1)) * 100}%` }}
                />
              </div>
            </div>

            {/* Content Card */}
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <h2 className="font-display text-2xl text-green-800 mb-6">
                {steps[step - 1].title}
              </h2>

              {error && (
                <div className="bg-red-100 text-red-700 p-3 rounded-lg mb-4 text-sm">
                  {error}
                </div>
              )}

              {/* Step 1: Account Setup */}
              {step === 1 && (
                <div className="space-y-4">
                  <p className="text-gray-600 mb-4">Let's start by creating your account.</p>

                  {/* Photo Upload */}
                  <div className="flex justify-center mb-4">
                    {getDisplayPhoto(userData.photo) ? (
                      <div className="relative">
                        <img src={getDisplayPhoto(userData.photo)} className="w-24 h-24 rounded-full object-cover border-4 border-green-500" />
                        <button onClick={() => setShowParentPhotoModal(true)} className="absolute -bottom-1 -right-1 w-8 h-8 bg-green-600 rounded-full text-white flex items-center justify-center text-sm hover:bg-green-700">✎</button>
                      </div>
                    ) : (
                      <div onClick={() => setShowParentPhotoModal(true)} className="w-24 h-24 rounded-full bg-gray-200 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-300">
                        <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                        <span className="text-xs text-gray-500 font-medium">add photo</span>
                      </div>
                    )}
                  </div>
                  {showParentPhotoModal && <PhotoUploadModal currentPhoto={userData.photo} onSave={(img) => { setUserData({ ...userData, photo: img }); setShowParentPhotoModal(false); }} onCancel={() => setShowParentPhotoModal(false)} />}
                  <p className="text-xs text-gray-500 text-center -mt-2 mb-4">Photo is optional but helps counselors recognize you at drop-off</p>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                    <input
                      value={userData.name}
                      onChange={e => setUserData({ ...userData, name: e.target.value })}
                      className="w-full px-4 py-3 border-2 rounded-lg focus:border-green-500 focus:outline-none"
                      placeholder="Your full name"
                      autoComplete="off" data-1p-ignore="true"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                    <input
                      type="email"
                      value={userData.email}
                      onChange={e => setUserData({ ...userData, email: e.target.value })}
                      className="w-full px-4 py-3 border-2 rounded-lg focus:border-green-500 focus:outline-none"
                      placeholder="your@email.com"
                      autoComplete="off" data-1p-ignore="true"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                    <input
                      value={userData.phone}
                      onChange={e => setUserData({ ...userData, phone: formatPhone(e.target.value) })}
                      className="w-full px-4 py-3 border-2 rounded-lg focus:border-green-500 focus:outline-none"
                      placeholder="(555) 555-1234"
                      autoComplete="off" data-1p-ignore="true"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={userData.password}
                        onChange={e => setUserData({ ...userData, password: e.target.value })}
                        className="w-full px-4 py-3 border-2 rounded-lg focus:border-green-500 focus:outline-none pr-12"
                        placeholder="Create a password"
                        autoComplete="off" data-1p-ignore="true"
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 text-sm">{showPassword ? 'Hide' : 'Show'}</button>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Add Campers */}
              {step === 2 && (
                <div className="space-y-4">
                  <p className="text-gray-600 mb-4">Add the campers you want to register. You'll select their camp sessions after setup.</p>

                  {campersData.length > 0 && (
                    <div className="space-y-3 mb-4">
                      {campersData.map(camper => {
                        const elig = getEligibility(camper.grade, camper.birthdate);
                        return (
                          <div key={camper.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                            <div>
                              <div className="font-medium">{camper.name}</div>
                              <div className="text-sm text-gray-500">
                                {camper.grade} Grade • Age {calculateAge(camper.birthdate)}
                              </div>
                              <span className={`text-xs px-2 py-0.5 rounded ${elig.eligible ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                {elig.status}
                              </span>
                            </div>
                            <button onClick={() => removeCamper(camper.id)} className="text-red-500 hover:text-red-700 p-2">✕</button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {showAddCamper ? (
                    <div className="border-2 border-dashed border-green-300 rounded-lg p-4 bg-green-50">
                      <h4 className="font-medium mb-3">Add Camper</h4>
                      <div className="space-y-3">
                        <input
                          value={newCamper.name}
                          onChange={e => setNewCamper({ ...newCamper, name: e.target.value })}
                          placeholder="Camper's full name"
                          className="w-full px-3 py-2 border rounded-lg"
                          autoComplete="off" data-1p-ignore="true"
                        />
                        <div className="space-y-3">
                          {/* Birthdate with year/month/day dropdowns */}
                          <div className="relative border rounded-lg p-3 bg-white">
                            <label className="absolute -top-2 left-2 bg-green-50 px-1 text-xs text-gray-500">Birthdate</label>
                            <div className="grid grid-cols-3 gap-2">
                              <select
                                value={newCamper.birthYear || ''}
                                onChange={e => setNewCamper({ ...newCamper, birthYear: e.target.value, birthdate: e.target.value && newCamper.birthMonth && newCamper.birthDay ? `${e.target.value}-${newCamper.birthMonth}-${newCamper.birthDay}` : '' })}
                                className="w-full px-2 py-1.5 border rounded text-sm"
                              >
                                <option value="">Year</option>
                                {Array.from({ length: 27 }, (_, i) => 2026 - i).map(y => (
                                  <option key={y} value={y}>{y}</option>
                                ))}
                              </select>
                              <select
                                value={newCamper.birthMonth || ''}
                                onChange={e => setNewCamper({ ...newCamper, birthMonth: e.target.value, birthdate: newCamper.birthYear && e.target.value && newCamper.birthDay ? `${newCamper.birthYear}-${e.target.value}-${newCamper.birthDay}` : '' })}
                                className="w-full px-2 py-1.5 border rounded text-sm"
                              >
                                <option value="">Month</option>
                                {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, i) => (
                                  <option key={m} value={String(i + 1).padStart(2, '0')}>{m}</option>
                                ))}
                              </select>
                              <select
                                value={newCamper.birthDay || ''}
                                onChange={e => setNewCamper({ ...newCamper, birthDay: e.target.value, birthdate: newCamper.birthYear && newCamper.birthMonth && e.target.value ? `${newCamper.birthYear}-${newCamper.birthMonth}-${e.target.value}` : '' })}
                                className="w-full px-2 py-1.5 border rounded text-sm"
                              >
                                <option value="">Day</option>
                                {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                                  <option key={d} value={String(d).padStart(2, '0')}>{d}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                          <select
                            value={newCamper.grade}
                            onChange={e => setNewCamper({ ...newCamper, grade: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg"
                          >
                            <option value="">Grade (Fall 2026)</option>
                            <option value="K">Kindergarten</option>
                            <option value="1st">1st Grade</option>
                            <option value="2nd">2nd Grade</option>
                            <option value="3rd">3rd Grade</option>
                            <option value="4th">4th Grade</option>
                            <option value="5th">5th Grade</option>
                            <option value="6th">6th Grade</option>
                            <option value="7th">7th Grade</option>
                            <option value="8th">8th Grade</option>
                            <option value="9th">9th Grade</option>
                          </select>
                        </div>
                        <input
                          value={newCamper.phone}
                          onChange={e => setNewCamper({ ...newCamper, phone: formatPhone(e.target.value) })}
                          placeholder="(555) 555-1234 (optional)"
                          className="w-full px-3 py-2 border rounded-lg"
                          autoComplete="off" data-1p-ignore="true"
                        />
                        <div className="flex gap-2">
                          <button onClick={addCamper} disabled={!newCamper.name || !newCamper.birthdate || !newCamper.grade} className="flex-1 py-2 bg-green-600 text-white rounded-lg disabled:bg-gray-300">Add Camper</button>
                          <button onClick={() => setShowAddCamper(false)} className="px-4 py-2 border rounded-lg">Cancel</button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setShowAddCamper(true)} className="w-full py-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-green-500 hover:text-green-600">+ Add a Camper</button>
                  )}

                  {campersData.length === 0 && (
                    <p className="text-sm text-gray-500 text-center mt-4">Add at least one camper to continue. You can add more campers later.</p>
                  )}
                </div>
              )}

              {/* Step 3: Emergency Contacts */}
              {step === 3 && (
                <div className="space-y-4">
                  <div className={`rounded-lg p-3 text-sm ${(emergencyData.length + 1) < 2 ? 'bg-red-50 border border-red-200 text-red-800' : 'bg-green-50 border border-green-200 text-green-800'}`}>
                    {(emergencyData.length + 1) < 2
                      ? <><strong>⚠️ Warning:</strong> You need at least 2 emergency contacts. Currently have {emergencyData.length + 1} (including yourself).</>
                      : <><strong>✓</strong> You have {emergencyData.length + 1} emergency contacts (including yourself) — minimum of 2 met.</>
                    }
                  </div>

                  {/* Parent auto-contact */}
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center gap-3">
                      {getDisplayPhoto(userData.photo) ? (
                        <img src={getDisplayPhoto(userData.photo)} className="w-10 h-10 rounded-full object-cover border-2 border-green-500" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex flex-col items-center justify-center">
                          <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                          <span className="text-[7px] text-gray-500 font-medium">add photo</span>
                        </div>
                      )}
                      <div>
                        <div className="font-medium">{userData.name}</div>
                        <div className="text-sm text-gray-500">{userData.phone} • Parent (you)</div>
                      </div>
                      <span className="ml-auto text-green-600 text-sm">✓ Auto-added</span>
                    </div>
                  </div>

                  {/* Additional contacts */}
                  {emergencyData.map((contact, idx) => (
                    <div key={contact.id} className="p-4 bg-gray-50 rounded-lg border flex items-center gap-3">
                      {getDisplayPhoto(contact.photo) ? (
                        <img src={getDisplayPhoto(contact.photo)} className="w-10 h-10 rounded-full object-cover border-2 border-gray-400" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex flex-col items-center justify-center">
                          <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                          <span className="text-[7px] text-gray-500 font-medium">add photo</span>
                        </div>
                      )}
                      <div>
                        <div className="font-medium">{contact.name}</div>
                        <div className="text-sm text-gray-500">{contact.phone} • {contact.relationship === 'Other' && contact.otherRelationship ? `Other: ${contact.otherRelationship}` : contact.relationship}</div>
                      </div>
                      <button onClick={() => removeContact(contact.id)} className="ml-auto text-red-500 hover:text-red-700 p-2">✕</button>
                    </div>
                  ))}

                  {showAddContact ? (
                    <div className="border-2 border-dashed border-blue-300 rounded-lg p-4 bg-blue-50">
                      <h4 className="font-medium mb-3">Add Emergency Contact</h4>
                      <div className="space-y-3">
                        {/* Photo Upload */}
                        <div className="flex justify-center mb-2">
                          {getDisplayPhoto(newContact.photo) ? (
                            <div className="relative">
                              <img src={getDisplayPhoto(newContact.photo)} className="w-16 h-16 rounded-full object-cover border-2 border-blue-500" />
                              <button onClick={() => setShowContactPhotoModal(true)} className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-600 rounded-full text-white flex items-center justify-center text-xs hover:bg-blue-700">✎</button>
                            </div>
                          ) : (
                            <div onClick={() => setShowContactPhotoModal(true)} className="w-16 h-16 rounded-full bg-gray-200 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-300">
                              <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                              <span className="text-[8px] text-gray-500 font-medium">add photo</span>
                            </div>
                          )}
                        </div>
                        {showContactPhotoModal && <PhotoUploadModal currentPhoto={newContact.photo} onSave={(img) => { setNewContact({ ...newContact, photo: img }); setShowContactPhotoModal(false); }} onCancel={() => setShowContactPhotoModal(false)} />}
                        <p className="text-xs text-gray-500 text-center -mt-1 mb-2">Photo helps identify authorized pickup (optional)</p>
                        <input
                          ref={contactNameRef}
                          value={newContact.name}
                          onChange={e => setNewContact({ ...newContact, name: e.target.value })}
                          placeholder="Contact's full name"
                          className="w-full px-3 py-2 border rounded-lg"
                          autoComplete="off" data-1p-ignore="true"
                        />
                        <input
                          value={newContact.phone}
                          onChange={e => setNewContact({ ...newContact, phone: formatPhone(e.target.value) })}
                          placeholder="(555) 555-1234"
                          className="w-full px-3 py-2 border rounded-lg"
                          autoComplete="off" data-1p-ignore="true"
                        />
                        <select
                          value={newContact.relationship}
                          onChange={e => setNewContact({ ...newContact, relationship: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg"
                        >
                          <option value="">Relationship to child</option>
                          <option value="Parent">Parent</option>
                          <option value="Legal Guardian">Legal Guardian</option>
                          <option value="Relative">Relative</option>
                          <option value="Caretaker">Caretaker</option>
                          <option value="Family Friend">Family Friend</option>
                          <option value="Other">Other</option>
                        </select>
                        {newContact.relationship === 'Other' && (
                          <input
                            value={newContact.otherRelationship}
                            onChange={e => setNewContact({ ...newContact, otherRelationship: e.target.value })}
                            placeholder="Please specify relationship"
                            className="w-full px-3 py-2 border rounded-lg"
                            autoComplete="off" data-1p-ignore="true"
                          />
                        )}
                        {contactError && (
                          <p className="text-sm text-red-600">{contactError}</p>
                        )}
                        <div className="flex gap-2">
                          <button onClick={addContact} disabled={!newContact.name || !newContact.phone || !newContact.relationship || (newContact.relationship === 'Other' && !newContact.otherRelationship)} className="flex-1 py-2 bg-blue-600 text-white rounded-lg disabled:bg-gray-300">Add Contact</button>
                          <button onClick={() => { setShowAddContact(false); setNewContact({ name: '', phone: '', relationship: '', otherRelationship: '', photo: null }); setContactError(''); }} className="px-4 py-2 border rounded-lg">Cancel</button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => { setShowAddContact(true); setContactError(''); }} className="w-full py-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-500 hover:text-blue-600">+ Add Emergency Contact</button>
                  )}

                </div>
              )}

              {/* Step 4: Payment (Optional) */}
              {step === 4 && (
                <div className="space-y-6">
                  <p className="text-gray-600">Add a payment method for faster checkout. You can skip this for now.</p>

                  <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl p-6 text-white">
                    <div className="flex justify-between items-start mb-8">
                      <div className="text-xs uppercase tracking-wider opacity-60">Credit Card</div>
                      <div className="flex gap-2">
                        <div className="w-10 h-6 bg-gradient-to-r from-blue-500 to-blue-700 rounded flex items-center justify-center text-xs font-bold">VISA</div>
                        <div className="w-10 h-6 bg-gradient-to-r from-red-500 to-yellow-500 rounded flex items-center justify-center text-xs font-bold">MC</div>
                      </div>
                    </div>
                    <div className="font-mono text-xl tracking-wider mb-6">
                      {cardData.number || '•••• •••• •••• ••••'}
                    </div>
                    <div className="flex justify-between text-sm">
                      <div>
                        <div className="text-xs opacity-60 uppercase">Card Holder</div>
                        <div>{cardData.name || 'YOUR NAME'}</div>
                      </div>
                      <div>
                        <div className="text-xs opacity-60 uppercase">Expires</div>
                        <div>{cardData.expiry || 'MM/YY'}</div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Card Number</label>
                      <input
                        value={cardData.number}
                        onChange={e => setCardData({ ...cardData, number: formatCardNumber(e.target.value) })}
                        className="w-full px-4 py-3 border-2 rounded-lg focus:border-green-500 focus:outline-none font-mono"
                        placeholder="1234 5678 9012 3456"
                        maxLength={19}
                        autoComplete="off" data-1p-ignore="true"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Cardholder Name</label>
                      <input
                        value={cardData.name}
                        onChange={e => setCardData({ ...cardData, name: e.target.value.toUpperCase() })}
                        className="w-full px-4 py-3 border-2 rounded-lg focus:border-green-500 focus:outline-none"
                        placeholder="JOHN DOE"
                        autoComplete="off" data-1p-ignore="true"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
                        <input
                          value={cardData.expiry}
                          onChange={e => setCardData({ ...cardData, expiry: formatExpiry(e.target.value) })}
                          className="w-full px-4 py-3 border-2 rounded-lg focus:border-green-500 focus:outline-none"
                          placeholder="MM/YY"
                          maxLength={5}
                          autoComplete="off" data-1p-ignore="true"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">CVC</label>
                        <input
                          value={cardData.cvc}
                          onChange={e => setCardData({ ...cardData, cvc: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                          className="w-full px-4 py-3 border-2 rounded-lg focus:border-green-500 focus:outline-none"
                          placeholder="123"
                          maxLength={4}
                          type="password"
                          autoComplete="off" data-1p-ignore="true"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-yellow-800 text-sm">
                      <strong>🔐 Secure Payment:</strong> Card payments will be processed through Stripe (coming soon). For now, you can skip this step and pay via Venmo.
                    </p>
                  </div>

                  <button
                    onClick={() => setStep(5)}
                    className="w-full py-3 text-gray-500 hover:text-gray-700 text-sm"
                  >
                    Skip for now →
                  </button>
                </div>
              )}

              {/* Step 5: Policies */}
              {step === 5 && (
                <div className="space-y-6">
                  <p className="text-gray-600">Please review and acknowledge our camp policies.</p>

                  <div className="bg-white border rounded-lg overflow-hidden">
                    <div className="bg-green-100 px-4 py-2 font-medium text-green-800">📥 Drop-off Policy</div>
                    <div className="p-4">
                      <pre className="whitespace-pre-wrap text-sm text-gray-600 font-sans">{DROPOFF_POLICY}</pre>
                      <label className="flex items-center gap-3 mt-4 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={policiesAccepted.dropoff}
                          onChange={e => setPoliciesAccepted({ ...policiesAccepted, dropoff: e.target.checked })}
                          className="w-5 h-5 text-green-600"
                        />
                        <span className="text-sm">I have read and agree to the drop-off policy</span>
                      </label>
                    </div>
                  </div>

                  <div className="bg-white border rounded-lg overflow-hidden">
                    <div className="bg-blue-100 px-4 py-2 font-medium text-blue-800">📤 Pick-up Policy</div>
                    <div className="p-4">
                      <pre className="whitespace-pre-wrap text-sm text-gray-600 font-sans">{PICKUP_POLICY}</pre>
                      <label className="flex items-center gap-3 mt-4 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={policiesAccepted.pickup}
                          onChange={e => setPoliciesAccepted({ ...policiesAccepted, pickup: e.target.checked })}
                          className="w-5 h-5 text-blue-600"
                        />
                        <span className="text-sm">I have read and agree to the pick-up policy</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 6: Complete */}
              {step === 6 && (
                <div className="text-center space-y-6">
                  <div className="text-6xl">🎉</div>
                  <h3 className="font-display text-2xl text-green-800">You're All Set!</h3>
                  <p className="text-gray-600">Your account is ready. You can now register your campers for sessions!</p>

                  <div className="bg-gray-50 rounded-lg p-4 text-left">
                    <h4 className="font-medium mb-2">Account Summary:</h4>
                    <p className="text-sm text-gray-600">• {userData.name} ({userData.email})</p>
                    <p className="text-sm text-gray-600">• {campersData.length} camper{campersData.length !== 1 ? 's' : ''} added</p>
                    <p className="text-sm text-gray-600">• {emergencyData.length + 1} emergency contact{emergencyData.length !== 0 ? 's' : ''}</p>
                    {cardData.number && <p className="text-sm text-gray-600">• Payment method saved</p>}
                  </div>

                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-green-800 font-medium">Next Step: Register for Sessions</p>
                    <p className="text-sm text-green-700 mt-1">Go to the Register tab to sign up your campers for camp dates!</p>
                  </div>
                </div>
              )}

              {/* Navigation */}
              <div className="flex flex-col gap-3 mt-8">
                <div className="flex gap-4">
                  <button
                    onClick={handleBack}
                    className="flex-1 py-3 border-2 border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    {step === 1 ? '← Back' : '← Previous'}
                  </button>
                  <button
                    onClick={handleNext}
                    className="flex-1 py-3 bg-green-700 hover:bg-green-800 text-white font-bold rounded-lg"
                  >
                    {step === totalSteps ? 'Complete Setup' : 'Continue →'}
                  </button>
                </div>
                {/* Skip to Policies option for steps 2-4 (Policies step 5 is required) */}
                {step > 1 && step < 5 && (
                  <button
                    onClick={() => setStep(5)}
                    className="w-full py-2 text-gray-500 hover:text-green-700 text-sm border border-gray-200 rounded-lg hover:border-green-300"
                  >
                    Skip to policies & finish setup →
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    };

    // ==================== PARENT MESSAGES TAB ====================
    const ParentMessagesTab = ({ userEmail, userName, messages, onSendReply, onDeleteMessage, onUpdateMessage, markAsRead, showToast, otherParents }) => {
      const [replyText, setReplyText] = useState('');
      const [selectedMsg, setSelectedMsg] = useState(null);
      const [showCompose, setShowCompose] = useState(false);
      const [composeForm, setComposeForm] = useState({ subject: '', body: '', cc: [], attachments: [] });
      const [editingDraftId, setEditingDraftId] = useState(null);
      const messagesEndRef = useRef(null);

      // Get messages for this parent (sent to them or to all, or from them)
      const myMessages = messages
        .filter(m => m.to === 'all' || m.to?.includes(userEmail) || m.from === userEmail)
        .sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt));

      const unreadMessages = myMessages.filter(m => m.from !== userEmail && !m.readBy?.includes(userEmail));

      useEffect(() => {
        // Mark messages as read when viewing
        if (selectedMsg && !selectedMsg.readBy?.includes(userEmail)) {
          markAsRead(selectedMsg.id, userEmail);
        }
      }, [selectedMsg]);

      const handleSendReply = () => {
        if (!replyText.trim() || !selectedMsg) return;
        const msg = {
          id: 'msg_' + Date.now(),
          threadId: selectedMsg.threadId || selectedMsg.from === 'admin' ? userEmail : selectedMsg.threadId,
          from: userEmail,
          fromName: userName,
          to: ['admin'],
          subject: selectedMsg.subject ? `Re: ${selectedMsg.subject}` : '',
          body: replyText.trim(),
          sentAt: new Date().toISOString(),
          readBy: [userEmail]
        };
        onSendReply(msg);
        setReplyText('');
        showToast('Reply sent!');
      };

      const openCompose = () => {
        setEditingDraftId(null);
        setComposeForm({
          subject: '',
          body: '',
          cc: (otherParents || []).map(p => ({ email: p.email, name: p.name })),
          attachments: []
        });
        setShowCompose(true);
      };

      const openDraftForEditing = (draft) => {
        setEditingDraftId(draft.id);
        setComposeForm({
          subject: draft.subject === '(No Subject)' ? '' : (draft.subject || ''),
          body: draft.body || '',
          cc: (draft.cc || []).map(email => {
            const parent = (otherParents || []).find(p => p.email === email);
            return { email, name: parent?.name || email };
          }),
          attachments: draft.attachments || []
        });
        // Defer opening compose modal to prevent click event from draft card
        // from propagating to the modal backdrop and immediately closing it
        setTimeout(() => setShowCompose(true), 0);
      };

      const handleDeleteDraft = () => {
        if (!editingDraftId) return;
        if (!confirm('Are you sure you want to delete this draft?')) return;
        if (!confirm('This cannot be undone. Delete this draft permanently?')) return;
        onDeleteMessage(editingDraftId);
        setEditingDraftId(null);
        setShowCompose(false);
        showToast('Draft deleted', 'success');
      };

      const handleRemoveCc = (email) => {
        setComposeForm(prev => ({ ...prev, cc: prev.cc.filter(c => c.email !== email) }));
      };

      const handleAttachImage = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
          setComposeForm(prev => ({
            ...prev,
            attachments: [...prev.attachments, { name: file.name, data: ev.target.result }]
          }));
        };
        reader.readAsDataURL(file);
      };

      const handleRemoveAttachment = (index) => {
        setComposeForm(prev => ({
          ...prev,
          attachments: prev.attachments.filter((_, i) => i !== index)
        }));
      };

      const handleSendMessage = async () => {
        if (!composeForm.subject.trim() || !composeForm.body.trim()) {
          showToast('Please fill in subject and message', 'error');
          return;
        }
        // If editing a draft, delete the old draft first
        if (editingDraftId) {
          await onDeleteMessage(editingDraftId);
        }
        const msg = {
          id: 'msg_' + Date.now(),
          from: userEmail,
          fromName: userName,
          to: ['admin'],
          cc: composeForm.cc.map(c => c.email),
          subject: composeForm.subject.trim(),
          body: composeForm.body.trim(),
          attachments: composeForm.attachments,
          sentAt: new Date().toISOString(),
          readBy: [userEmail],
          status: 'sent'
        };
        onSendReply(msg);
        setEditingDraftId(null);
        setShowCompose(false);
        showToast('Message sent to Camp Director!', 'success');
      };

      const handleSaveDraft = () => {
        if (editingDraftId) {
          // Update existing draft
          const updatedDraft = {
            id: editingDraftId,
            from: userEmail,
            fromName: userName,
            to: ['admin'],
            cc: composeForm.cc.map(c => c.email),
            subject: composeForm.subject.trim() || '(No Subject)',
            body: composeForm.body.trim(),
            attachments: composeForm.attachments,
            sentAt: new Date().toISOString(),
            readBy: [userEmail],
            status: 'draft'
          };
          onUpdateMessage(editingDraftId, updatedDraft);
        } else {
          const msg = {
            id: 'msg_' + Date.now(),
            from: userEmail,
            fromName: userName,
            to: ['admin'],
            cc: composeForm.cc.map(c => c.email),
            subject: composeForm.subject.trim() || '(No Subject)',
            body: composeForm.body.trim(),
            attachments: composeForm.attachments,
            sentAt: new Date().toISOString(),
            readBy: [userEmail],
            status: 'draft'
          };
          onSendReply(msg);
        }
        setEditingDraftId(null);
        setShowCompose(false);
        showToast('Draft saved', 'success');
      };

      return (
        <div className="space-y-6">
          {/* Send New Message Button */}
          <div className="text-center">
            <button
              onClick={openCompose}
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-8 rounded-xl text-lg shadow-lg inline-flex items-center gap-3"
            >
              <span className="text-2xl">➕</span>
              <span>Send a Message to the Camp Director</span>
            </button>
          </div>

          {/* Unread Alert */}
          {unreadMessages.length > 0 && (
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 flex items-center gap-4">
              <div className="text-3xl">📬</div>
              <div>
                <div className="font-bold text-blue-800">You have {unreadMessages.length} unread message{unreadMessages.length > 1 ? 's' : ''}</div>
                <div className="text-sm text-blue-600">Click on a message to expand and reply</div>
              </div>
            </div>
          )}

          {/* Drafts Section */}
          {myMessages.filter(m => m.status === 'draft').length > 0 && (
            <div className="bg-white rounded-xl shadow p-6">
              <h3 className="font-bold text-lg text-amber-700 mb-4">Drafts</h3>
              <div className="space-y-2">
                {myMessages.filter(m => m.status === 'draft').map(draft => {
                  const dateStr = new Date(draft.sentAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
                  const timeStr = new Date(draft.sentAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
                  return (
                    <div key={draft.id} className="rounded-lg border-2 border-amber-300 bg-amber-50 overflow-hidden">
                      <div
                        onClick={() => openDraftForEditing(draft)}
                        className="p-4 cursor-pointer hover:bg-amber-100 flex items-center gap-3"
                      >
                        <span className="text-lg flex-shrink-0">📝</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-amber-800">Draft</span>
                            <span className="text-xs bg-amber-200 text-amber-700 px-1.5 py-0.5 rounded">Not sent</span>
                          </div>
                          {draft.subject && <div className="text-sm font-medium truncate">{draft.subject}</div>}
                          {draft.body && <div className="text-sm text-gray-500 truncate">{draft.body}</div>}
                        </div>
                        <div className="text-xs text-gray-400 flex-shrink-0 text-right">
                          <div>{dateStr}</div>
                          <div>{timeStr}</div>
                        </div>
                        <span className="text-amber-500 text-sm flex-shrink-0">Edit →</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Message History */}
          {myMessages.filter(m => m.status !== 'draft').length > 0 && (
            <div className="bg-white rounded-xl shadow p-6">
              <h3 className="font-bold text-lg text-green-800 mb-4">Message History</h3>
              <div className="space-y-2">
                {myMessages.filter(m => m.status !== 'draft').map(msg => {
                  const isUnread = msg.from !== userEmail && !msg.readBy?.includes(userEmail);
                  const isExpanded = selectedMsg?.id === msg.id;
                  const isFromMe = msg.from === userEmail;
                  const dateStr = new Date(msg.sentAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
                  const timeStr = new Date(msg.sentAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

                  return (
                    <div key={msg.id} className={`rounded-lg border-2 overflow-hidden ${
                      isUnread ? 'border-blue-300 bg-blue-50' :
                      isExpanded ? 'border-green-400' :
                      'border-gray-200'
                    }`}>
                      {/* Message Row */}
                      <div
                        onClick={() => {
                          setSelectedMsg(isExpanded ? null : msg);
                          if (!isExpanded && isUnread) markAsRead(msg.id, userEmail);
                        }}
                        className={`p-4 cursor-pointer hover:bg-gray-50 flex items-center gap-3 ${isExpanded ? 'bg-green-50' : ''}`}
                      >
                        {/* Read/Unread indicator */}
                        <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                          isUnread ? 'bg-blue-500' : 'bg-gray-300'
                        }`} title={isUnread ? 'Unread' : 'Read'} />

                        {/* Sender icon */}
                        <span className="text-lg flex-shrink-0">{isFromMe ? '📤' : '📥'}</span>

                        {/* Message preview */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm ${isUnread ? 'font-bold text-blue-800' : 'font-medium text-gray-700'}`}>
                              {isFromMe ? 'You' : 'Camp Admin'}
                            </span>
                            {msg.to === 'all' && !isFromMe && (
                              <span className="text-xs bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded">Broadcast</span>
                            )}
                            {isUnread && <span className="text-xs bg-blue-500 text-white px-1.5 py-0.5 rounded">New</span>}
                          </div>
                          {msg.subject && <div className={`text-sm ${isUnread ? 'font-bold' : ''} truncate`}>{msg.subject}</div>}
                          {!isExpanded && <div className="text-sm text-gray-500 truncate">{msg.body}</div>}
                        </div>

                        {/* Date */}
                        <div className="text-xs text-gray-400 flex-shrink-0 text-right">
                          <div>{dateStr}</div>
                          <div>{timeStr}</div>
                        </div>

                        {/* Expand arrow */}
                        <span className="text-gray-400 text-sm flex-shrink-0">{isExpanded ? '▼' : '▶'}</span>
                      </div>

                      {/* Expanded Content */}
                      {isExpanded && (
                        <div className="px-4 pb-4 border-t border-gray-200">
                          {/* Show To/Cc info */}
                          <div className="text-xs text-gray-500 mt-2 space-y-1">
                            {isFromMe && <div><span className="font-medium">To:</span> Camp Director</div>}
                            {msg.cc && msg.cc.length > 0 && (
                              <div><span className="font-medium">Cc:</span> {msg.cc.join(', ')}</div>
                            )}
                          </div>
                          <div className="bg-white rounded-lg p-4 mt-2 whitespace-pre-wrap text-sm text-gray-700">
                            {msg.body}
                          </div>

                          {/* Attachments */}
                          {msg.attachments && msg.attachments.length > 0 && (
                            <div className="mt-3">
                              <p className="text-xs font-medium text-gray-500 mb-1">Attachments:</p>
                              <div className="flex flex-wrap gap-2">
                                {msg.attachments.map((att, i) => (
                                  <img key={i} src={att.data} alt={att.name} className="w-20 h-20 object-cover rounded-lg border" />
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Reply section */}
                          {!isFromMe && (
                            <div className="mt-3">
                              <textarea
                                value={replyText}
                                onChange={e => setReplyText(e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg resize-none text-sm"
                                rows={2}
                                placeholder="Type your reply..."
                                autoComplete="off"
                                data-1p-ignore="true"
                              />
                              <button
                                onClick={handleSendReply}
                                disabled={!replyText.trim()}
                                className="mt-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 text-sm"
                              >
                                Send Reply
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Empty state when no messages at all */}
          {myMessages.length === 0 && (
            <div className="bg-white rounded-xl shadow p-6">
              <div className="text-center py-8 text-gray-500">
                <p className="text-4xl mb-2">📭</p>
                <p>No messages yet. Send a message to the Camp Director to get started.</p>
              </div>
            </div>
          )}

          {/* Compose Message Modal */}
          {showCompose && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => { setEditingDraftId(null); setShowCompose(false); }}>
              <div className="bg-white rounded-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <h3 className="font-bold text-xl mb-4">{editingDraftId ? 'Edit Draft' : 'New Message'}</h3>

                <div className="space-y-4">
                  {/* To field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">To:</label>
                    <div className="px-3 py-2 bg-gray-100 border rounded-lg text-sm text-gray-700">
                      Camp Director
                    </div>
                  </div>

                  {/* Cc field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cc:</label>
                    <div className="px-3 py-2 border rounded-lg min-h-[40px] flex flex-wrap gap-1">
                      {composeForm.cc.length === 0 ? (
                        <span className="text-sm text-gray-400">No other parents to Cc</span>
                      ) : (
                        composeForm.cc.map(c => (
                          <span key={c.email} className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full">
                            {c.name || c.email}
                            <button onClick={() => handleRemoveCc(c.email)} className="text-blue-500 hover:text-blue-700 font-bold">✕</button>
                          </span>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Subject */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Subject:</label>
                    <input
                      type="text"
                      value={composeForm.subject}
                      onChange={e => setComposeForm(prev => ({ ...prev, subject: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                      placeholder="Message subject"
                      autoComplete="off"
                      data-1p-ignore="true"
                    />
                  </div>

                  {/* Body */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Message:</label>
                    <textarea
                      value={composeForm.body}
                      onChange={e => setComposeForm(prev => ({ ...prev, body: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg text-sm resize-none"
                      rows={6}
                      placeholder="Type your message..."
                      autoComplete="off"
                      data-1p-ignore="true"
                    />
                  </div>

                  {/* Attachments */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Attachments:</label>
                    {composeForm.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {composeForm.attachments.map((att, i) => (
                          <div key={i} className="relative">
                            <img src={att.data} alt={att.name} className="w-16 h-16 object-cover rounded-lg border" />
                            <button onClick={() => handleRemoveAttachment(i)} className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600">✕</button>
                          </div>
                        ))}
                      </div>
                    )}
                    <label className="inline-flex items-center gap-2 px-3 py-2 bg-gray-100 border rounded-lg cursor-pointer hover:bg-gray-200 text-sm">
                      <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      <span>Add Photo/Image</span>
                      <input type="file" accept="image/*" className="hidden" onChange={handleAttachImage} />
                    </label>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={handleSendMessage}
                    disabled={!composeForm.subject.trim() || !composeForm.body.trim()}
                    className="flex-1 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    Send
                  </button>
                  <button
                    onClick={handleSaveDraft}
                    className="px-4 py-3 bg-blue-100 text-blue-700 font-medium rounded-lg hover:bg-blue-200"
                  >
                    {editingDraftId ? 'Update Draft' : 'Save Draft'}
                  </button>
                  {editingDraftId && (
                    <button
                      onClick={handleDeleteDraft}
                      className="px-4 py-3 bg-red-100 text-red-700 font-medium rounded-lg hover:bg-red-200"
                    >
                      Delete
                    </button>
                  )}
                  <button
                    onClick={() => { setEditingDraftId(null); setShowCompose(false); }}
                    className="px-4 py-3 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    };


    // ==================== MAIN APP ====================
    export function RooseveltCamp() {
      const [page, setPage] = useState('home');
      const [user, setUser] = useState(null);
      const [toast, setToast] = useState(null);
      const [loading, setLoading] = useState(true);
      const [showBanner, setShowBanner] = useState(false);
      const [transitioning, setTransitioning] = useState(false); // Global transition state for login/registration
      
      const [content, setContent] = useState(DEFAULT_CONTENT);
      const [counselors, setCounselors] = useState(DEFAULT_COUNSELORS);
      const [registrations, setRegistrations] = useState([]);
      const [parents, setParents] = useState([]);
      const [availability, setAvailability] = useState({});
      const [changeHistory, setChangeHistory] = useState([]);
      const [assignments, setAssignments] = useState({}); // { "date_session": { counselorId: [childId, ...] } }
      const [campers, setCampers] = useState([]); // Standalone campers collection
      const [camperParentLinks, setCamperParentLinks] = useState([]); // { camperId, parentEmail } associations
      const [foodPhotos, setFoodPhotos] = useState({}); // Admin-uploadable food photos { snack_fruit: base64, ... }
      const [sitePhotos, setSitePhotos] = useState({}); // Site-wide photos { hero, dropoff, layups, lunch }

      // New state for onboarding system
      const [emergencyContacts, setEmergencyContacts] = useState([]); // Emergency contact records
      const [pendingCounselors, setPendingCounselors] = useState([]); // Counselors awaiting admin approval
      const [blockedSessions, setBlockedSessions] = useState({}); // { date: { morning: bool, afternoon: bool } }
      const [counselorSchedule, setCounselorSchedule] = useState({}); // { counselorId: { date: { morning: bool, afternoon: bool } } }
      const [campDates, setCampDates] = useState([]); // Array of { date: "YYYY-MM-DD", sessions: ["morning", "afternoon"] }
      const [gymRentals, setGymRentals] = useState({}); // { date: { morning: bool, afternoon: bool } } — from camp_gym_rentals
      const [camperEmergencyContactLinks, setCamperEmergencyContactLinks] = useState([]); // Array of { camperId, emergencyContactId }

      const [adminTab, setAdminTab] = useState('dashboard');
      const [parentTab, setParentTab] = useState('dashboard');
      const [paymentVenmoModal, setPaymentVenmoModal] = useState(null);
      const [venmoScreenshot, setVenmoScreenshot] = useState(null);
      const [venmoScreenshotRaw, setVenmoScreenshotRaw] = useState(null);
      const [counselorTab, setCounselorTab] = useState('dashboard');
      const [sessionsTabMonth, setSessionsTabMonth] = useState(null); // Persist selected month in Sessions tab
      const [assignmentsTabMonth, setAssignmentsTabMonth] = useState(null); // Persist selected month in Assignments tab
      const [counselorScheduleModal, setCounselorScheduleModal] = useState(null); // Counselor being scheduled
      const [counselorScheduleMonth, setCounselorScheduleMonth] = useState(null); // Month selected in schedule modal
      const [counselorDashMonth, setCounselorDashMonth] = useState(6); // Persist selected month in Counselor Dashboard (6 = July)
      const [bulkRegModal, setBulkRegModal] = useState(null); // Bulk registration creation: { parentEmail, camperIds, selectedDates: { date: ['morning','afternoon'] } }
      const [bulkRegMonth, setBulkRegMonth] = useState(null); // Selected month for bulk registration
      const [viewRegModal, setViewRegModal] = useState(null); // Registration details view/edit modal
      const [deleteRegConfirm, setDeleteRegConfirm] = useState(null); // Registration to delete confirmation
      const [autoOpenPhotoFor, setAutoOpenPhotoFor] = useState(null); // camper ID — auto-open photo modal from Dashboard
      const [autoOpenPhotoForParent, setAutoOpenPhotoForParent] = useState(null); // parent email — auto-open photo modal from Dashboard
      const [autoOpenAddEC, setAutoOpenAddEC] = useState(false); // auto-open Add EC form when switching to Emergency tab
      const [returnTabAfterEC, setReturnTabAfterEC] = useState(null); // tab to return to after adding EC
      const [showECAddModal, setShowECAddModal] = useState(false); // top-level EC add form modal
      // ecAddForm state removed — now managed internally by ECAddModal component to prevent focus loss
      const [showAddCamperModal, setShowAddCamperModal] = useState(false); // top-level Add Camper modal from Dashboard
      const [autoOpenPhotoForEC, setAutoOpenPhotoForEC] = useState(null); // EC contact ID — auto-open photo modal from Dashboard

      const isDevEnv = isDev();
      const showToast = useCallback((msg, type = 'success') => setToast({ msg, type }), []);
      const sessionCost = getSessionCost(content);

      // Scroll to top on tab change so red ribbon is visible
      useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, [parentTab]);

      useEffect(() => {
        const load = async () => {
          setLoading(true);
          // Safety timeout — show page with defaults if DB takes too long
          const safetyTimer = setTimeout(() => {
            setLoading(false);
            console.warn('⏱️ [TIMEOUT] Database took too long — showing page with default content');
          }, 5000);
          try {
            // Parallel fetch all tables at once for faster loading
            const [cd, cs, rg, pr, av, ch, as2, cp, cpl, fp, sp, ec, bs, csch, campDatesData, gr, cecl] = await Promise.all([
              storage.get('camp_content'),
              storage.get('camp_counselors'),
              storage.get('camp_registrations'),
              storage.get('camp_parents'),
              storage.get('camp_counselor_availability'),
              storage.get('camp_change_history'),
              storage.get('camp_assignments'),
              storage.get('camp_campers'),
              storage.get('camp_camper_parent_links'),
              storage.get('camp_food_photos'),
              storage.get('camp_site_photos'),
              storage.get('camp_emergency_contacts'),
              storage.get('camp_blocked_sessions'),
              storage.get('camp_counselor_schedule'),
              storage.get('camp_dates'),
              storage.get('camp_gym_rentals'),
              storage.get('camp_camper_emergency_contact_links'),
            ]);
            if (cd?.[0]?.data) setContent({ ...DEFAULT_CONTENT, ...cd[0].data });
            if (cs?.length) setCounselors(cs.map(c => c.data).filter(Boolean).sort((a, b) => (a.order || 0) - (b.order || 0)));
            if (rg?.length) setRegistrations(rg.map(r => r.data).filter(Boolean));
            if (pr?.[0]?.data) setParents(Array.isArray(pr[0].data) ? pr[0].data : []);
            if (av?.[0]?.data) setAvailability(av[0].data);
            if (ch?.[0]?.data) setChangeHistory(Array.isArray(ch[0].data) ? ch[0].data : []);
            if (as2?.[0]?.data) setAssignments(as2[0].data);
            if (cp?.[0]?.data) setCampers(Array.isArray(cp[0].data) ? cp[0].data : []);
            if (cpl?.[0]?.data) setCamperParentLinks(Array.isArray(cpl[0].data) ? cpl[0].data : []);
            if (fp?.[0]?.data) setFoodPhotos(fp[0].data);
            if (sp?.[0]?.data) setSitePhotos(sp[0].data);
            if (ec?.[0]?.data) setEmergencyContacts(Array.isArray(ec[0].data) ? ec[0].data : []);
            if (bs?.[0]?.data) setBlockedSessions(typeof bs[0].data === 'object' && !Array.isArray(bs[0].data) ? bs[0].data : {});
            if (csch?.[0]?.data) setCounselorSchedule(typeof csch[0].data === 'object' && !Array.isArray(csch[0].data) ? csch[0].data : {});
            if (campDatesData?.[0]?.data) setCampDates(Array.isArray(campDatesData[0].data) ? campDatesData[0].data : []);
            if (gr?.[0]?.data) setGymRentals(typeof gr[0].data === 'object' && !Array.isArray(gr[0].data) ? gr[0].data : {});
            if (cecl?.[0]?.data) setCamperEmergencyContactLinks(Array.isArray(cecl[0].data) ? cecl[0].data : []);

            // One-time cleanup: remove bogus EC links where the EC doesn't belong to any parent of the camper
            const loadedLinks = cecl?.[0]?.data && Array.isArray(cecl[0].data) ? cecl[0].data : [];
            const loadedECs = ec?.[0]?.data && Array.isArray(ec[0].data) ? ec[0].data : [];
            const loadedCPL = cpl?.[0]?.data && Array.isArray(cpl[0].data) ? cpl[0].data : [];
            if (loadedLinks.length > 0 && loadedECs.length > 0 && loadedCPL.length > 0) {
              const cleanLinks = loadedLinks.filter(link => {
                const ecRecord = loadedECs.find(c => c.id === link.emergencyContactId);
                if (!ecRecord || !ecRecord.userEmail) return true;
                const parentEmails = loadedCPL.filter(l => l.camperId === link.camperId).map(l => l.parentEmail);
                return parentEmails.includes(ecRecord.userEmail);
              });
              if (cleanLinks.length < loadedLinks.length) {
                console.log(`EC link cleanup: removed ${loadedLinks.length - cleanLinks.length} bogus links`);
                setCamperEmergencyContactLinks(cleanLinks);
                storage.set('camp_camper_emergency_contact_links', 'main', cleanLinks);
              }
            }
          } catch (e) { console.error('Load error:', e); }
          clearTimeout(safetyTimer);
          setLoading(false);
        };
        load();
      }, []);

      const addToHistory = useCallback(async (action, details, extraEmails = []) => {
        const relatedEmails = [...new Set([user?.email, ...extraEmails].filter(Boolean))];
        const entry = {
          id: Date.now(),
          timestamp: new Date().toISOString(),
          action,
          details,
          changedBy: user?.name || user?.email || 'Parent',
          relatedEmails
        };
        const newHistory = [entry, ...changeHistory].slice(0, 500);
        setChangeHistory(newHistory);
        await storage.set('camp_change_history', 'main', newHistory);
      }, [changeHistory, user?.email]);

      const saveContent = async (c, field = null) => {
        setContent(c);
        await storage.set('camp_content', 'main', c);
        if (field) {
          addToHistory('Content Updated', `Changed "${field}"`);
        }
        showToast('Saved!');
      };


      const saveReg = async (r, action = null) => {
        setRegistrations(prevRegs => {
          const newRegs = prevRegs.some(x => x.id === r.id) ? prevRegs.map(x => x.id === r.id ? r : x) : [...prevRegs, r];
          return newRegs;
        });
        await storage.set('camp_registrations', r.id, r);
        if (action) addToHistory('Registration', action);
      };

      const saveRegistrations = async (regs, action = null) => {
        // Delete all existing registrations from Supabase (they're stored as individual records)
        const currentRegIds = registrations.map(r => r.id);
        for (const regId of currentRegIds) {
          await supabase.from('camp_registrations').delete().eq('id', regId);
        }
        // Save new registrations (if any)
        for (const reg of regs) {
          await storage.set('camp_registrations', reg.id, reg);
        }
        setRegistrations(regs);
        if (action) addToHistory('Registration', action);
      };

      const saveParents = async (p, action = null) => {
        // Upload any new base64 parent photos to Storage CDN
        for (const parent of p) {
          if (parent.photo && !photoStorage.isUrl(parent.photo)) {
            const id = (parent.email || '').replace(/[^a-zA-Z0-9]/g, '_') || 'p_' + Date.now();
            const url = await photoStorage.uploadPhoto('parents', id, parent.photo);
            if (url) parent.photo = url;
          }
        }
        setParents(p);
        await storage.set('camp_parents', 'main', p);
        if (action) addToHistory('Parent', action);
      };


      const saveCampers = async (c, action = null) => {
        // Upload any new base64 camper photos to Storage CDN
        for (const camper of c) {
          if (camper.photo && !photoStorage.isUrl(camper.photo)) {
            const url = await photoStorage.uploadPhoto('campers', camper.id, camper.photo);
            if (url) camper.photo = url;
          }
        }
        setCampers(c);
        await storage.set('camp_campers', 'main', c);
        if (action) addToHistory('Camper', action);
      };


      const deleteCamper = async (camperId, camperName) => {
        // Remove from campers state
        const updatedCampers = campers.filter(c => c.id !== camperId);
        setCampers(updatedCampers);
        await storage.set('camp_campers', 'main', updatedCampers);
        // Remove camper-parent links
        const updatedLinks = camperParentLinks.filter(l => l.camperId !== camperId);
        setCamperParentLinks(updatedLinks);
        await storage.set('camp_camper_parent_links', 'main', updatedLinks);
        // Clean up assignments that reference this camper
        const cleanedAssignments = { ...assignments };
        Object.keys(cleanedAssignments).forEach(key => {
          Object.keys(cleanedAssignments[key]).forEach(counselorId => {
            cleanedAssignments[key][counselorId] = cleanedAssignments[key][counselorId].filter(id => id !== camperId);
          });
        });
        setAssignments(cleanedAssignments);
        await storage.set('camp_assignments', 'main', cleanedAssignments);
        // Note: We don't delete registrations - they're historical records
        addToHistory('Camper', `Deleted camper ${camperName}`);
        showToast('Camper deleted');
      };

      const saveCamperParentLinks = async (links) => {
        setCamperParentLinks(links);
        await storage.set('camp_camper_parent_links', 'main', links);
      };


      const saveCamperEmergencyContactLinks = async (links) => {
        setCamperEmergencyContactLinks(links);
        await storage.set('camp_camper_emergency_contact_links', 'main', links);
      };


      // Helper to check if a counselor is scheduled to work a session
      const isCounselorScheduled = (counselorId, date, session) => {
        return counselorSchedule[counselorId]?.[date]?.[session] === true;
      };

      // Helper to check if a session is blocked
      const isSessionBlocked = (date, session) => {
        return blockedSessions[date]?.[session] === true;
      };

      // Check if a session is available from gym rentals (only when gym rentals data exists)
      const isSessionAvailableFromGym = (date, session) => {
        if (!gymRentals || Object.keys(gymRentals).length === 0) return true; // No gym data = all available
        return gymRentals[date]?.[session] === true;
      };

      // Helper to check if a date is fully blocked (both sessions)
      const isDateFullyBlocked = (date) => {
        return isSessionBlocked(date, 'morning') && isSessionBlocked(date, 'afternoon');
      };

      // Compute available dates (dates where at least one session is available)
      const availableDates = CAMP_DATES.filter(d => !isDateFullyBlocked(d));

      // New save functions for onboarding system
      const saveEmergencyContacts = async (contacts, action = null) => {
        // Upload any new base64 EC photos to Storage CDN
        for (const ec of contacts) {
          if (ec.photo && !photoStorage.isUrl(ec.photo)) {
            const url = await photoStorage.uploadPhoto('emergency-contacts', ec.id, ec.photo);
            if (url) ec.photo = url;
          }
        }
        setEmergencyContacts(contacts);
        await storage.set('camp_emergency_contacts', 'main', contacts);
        if (action) addToHistory('Emergency Contacts', action);
      };


      const getPending = () => registrations.filter(r => r.status === 'pending').length;
      const getApproved = () => registrations.filter(r => r.status === 'approved').length;
      const getCancelled = () => registrations.filter(r => r.status === 'cancelled' || r.status === 'rejected').length;
      const getUnpaid = () => registrations.filter(r => r.status === 'approved' && !['paid', 'confirmed'].includes(r.paymentStatus)).length;

      // ==================== NAV ====================
      // ==================== NAV (PARENT) ====================
      const Nav = () => {
        const handleLogout = () => {
          sessionStorage.removeItem('user');
          window.location.href = '/index.html';
        };

        return (
          <nav className="bg-green-900 text-white shadow-lg">
            <div className="max-w-6xl mx-auto px-3 sm:px-4 py-3 sm:py-3 flex flex-wrap items-center justify-between gap-2">
              <div className="font-display text-xl sm:text-2xl cursor-pointer" onClick={() => window.location.href = '/index.html'}>🏀 ROOSEVELT CAMP</div>
              <div className="hidden md:flex gap-1 items-center">
                {['home', 'schedule', 'pricing', 'location', 'counselors'].map(p => (
                  <a key={p} href={'/index.html#' + p} className="px-3 py-1.5 rounded text-sm capitalize hover:bg-green-800 transition-colors">{p}</a>
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5 sm:gap-2 items-center">
                <span className="text-green-300 text-xs sm:text-sm px-2 py-1">{user?.name || 'Parent'}</span>
                <button onClick={handleLogout} className="px-3 sm:px-4 py-2.5 sm:py-2 bg-red-600 hover:bg-red-700 rounded text-sm sm:text-base min-h-[44px]">Logout</button>
              </div>
            </div>
          </nav>
        );
      };

      // ==================== CAMPER SCHEDULE TAB (Visual Schedule for Parents) ====================
      const CamperScheduleTab = ({ myChildren, registrations, allRegistrations, assignments, counselors, campers, parents }) => {
        const [selectedChild, setSelectedChild] = useState(myChildren[0]?.id || null);

        // Get registrations for selected child
        const childRegs = registrations.filter(r => r.childId === selectedChild);

        // Group registrations by date
        const regsByDate = {};
        childRegs.forEach(reg => {
          if (!regsByDate[reg.date]) regsByDate[reg.date] = [];
          regsByDate[reg.date].push(reg);
        });

        // Sort dates
        const sortedDates = Object.keys(regsByDate).sort();

        // Get counselor for a specific session
        const getCounselorForSession = (childId, date, session) => {
          const sessionKey = `${date}_${session}`;
          const sessionPods = assignments[sessionKey];
          if (!sessionPods) return null;

          // Find the pod that contains this child
          for (const [podId, pod] of Object.entries(sessionPods)) {
            if (pod.camperIds?.includes(childId)) {
              return counselors.find(c => c.id === pod.counselorId);
            }
          }
          return null;
        };

        // Get pod mates (other campers with same counselor for a session)
        const getPodMates = (childId, date, session, counselorId) => {
          if (!counselorId) return [];
          const sessionKey = `${date}_${session}`;
          const sessionPods = assignments[sessionKey];
          if (!sessionPods) return [];

          // Find the pod with this counselor that contains this child
          for (const [podId, pod] of Object.entries(sessionPods)) {
            if (pod.counselorId === counselorId && pod.camperIds?.includes(childId)) {
              // Get all other campers in this pod
              const otherCamperIds = pod.camperIds.filter(id => id !== childId);
              return otherCamperIds.map(camperId => {
                // Try to find in campers first, then in parents' children (legacy)
                const camper = campers.find(c => c.id === camperId);
                if (camper) return camper;

                for (const parent of parents) {
                  const child = parent.children?.find(c => c.id === camperId);
                  if (child) return child;
                }
                return null;
              }).filter(Boolean);
            }
          }
          return [];
        };

        // Get all campers at camp for a session (not just pod)
        const getAllCampersForSession = (date, session, excludeChildId) => {
          const sessionRegs = allRegistrations.filter(r =>
            r.date === date &&
            r.sessions?.includes(session) &&
            r.childId !== excludeChildId &&
            (r.status === 'approved' || r.status === 'pending')
          );
          return sessionRegs.map(r => {
            const camper = campers.find(c => c.id === r.childId);
            if (camper) return { ...camper, status: r.status };

            for (const parent of parents) {
              const child = parent.children?.find(c => c.id === r.childId);
              if (child) return { ...child, status: r.status };
            }
            return { name: r.childName, status: r.status };
          }).filter(Boolean);
        };

        const selectedChildData = myChildren.find(c => c.id === selectedChild);

        if (myChildren.length === 0) {
          return (
            <div className="bg-white rounded-xl shadow p-8 text-center">
              <div className="text-6xl mb-4">👶</div>
              <h3 className="font-bold text-lg text-gray-800 mb-2">No Children Yet</h3>
              <p className="text-gray-500">Add campers in the "Campers" tab, then register them for camp.</p>
            </div>
          );
        }

        if (childRegs.length === 0) {
          return (
            <div className="space-y-6">
              {myChildren.length > 1 && (
                <div className="bg-white rounded-xl shadow p-4">
                  <div className="flex gap-2 flex-wrap">
                    {myChildren.map(child => (
                      <button
                        key={child.id}
                        onClick={() => setSelectedChild(child.id)}
                        className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                          selectedChild === child.id
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {getDisplayPhoto(child.photo) ? (
                          <img src={getDisplayPhoto(child.photo)} className="w-6 h-6 rounded-full object-cover" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-gray-200 flex flex-col items-center justify-center">
                            <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                            <span className="text-[5px] text-gray-500 font-medium">add photo</span>
                          </div>
                        )}
                        {child.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="bg-white rounded-xl shadow p-8 text-center">
                <div className="text-6xl mb-4">📅</div>
                <h3 className="font-bold text-lg text-gray-800 mb-2">No Sessions Registered</h3>
                <p className="text-gray-500">{selectedChildData?.name || 'Your child'} hasn't been registered for any camp sessions yet.</p>
                <p className="text-sm text-gray-400 mt-2">Go to the "Register" tab to sign up for sessions.</p>
              </div>
            </div>
          );
        }

        return (
          <div className="space-y-6">
            {/* Child Selector */}
            {myChildren.length > 1 && (
              <div className="bg-white rounded-xl shadow p-4">
                <div className="flex gap-2 flex-wrap">
                  {myChildren.map(child => {
                    const hasRegs = registrations.some(r => r.childId === child.id);
                    return (
                      <button
                        key={child.id}
                        onClick={() => setSelectedChild(child.id)}
                        className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                          selectedChild === child.id
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {getDisplayPhoto(child.photo) ? (
                          <img src={getDisplayPhoto(child.photo)} className="w-6 h-6 rounded-full object-cover" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-gray-200 flex flex-col items-center justify-center">
                            <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                            <span className="text-[5px] text-gray-500 font-medium">add photo</span>
                          </div>
                        )}
                        {child.name}
                        {hasRegs && <span className="text-xs opacity-75">🏕️</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Selected Child Header */}
            <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-xl shadow p-6 text-white">
              <div className="flex items-center gap-4">
                {getDisplayPhoto(selectedChildData?.photo) ? (
                  <img src={getDisplayPhoto(selectedChildData?.photo)} className="w-20 h-20 rounded-full object-cover border-4 border-white/30" />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-gray-200 flex flex-col items-center justify-center">
                    <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                    <span className="text-[9px] text-gray-500 font-medium">add photo</span>
                  </div>
                )}
                <div>
                  <h2 className="font-display text-2xl">{selectedChildData?.name}'s Camp Schedule</h2>
                  <p className="text-green-100">{childRegs.length} session{childRegs.length !== 1 ? 's' : ''} registered</p>
                </div>
              </div>
            </div>

            {/* Schedule by Date */}
            <div className="space-y-4">
              {sortedDates.map(date => {
                const dateRegs = regsByDate[date];
                const d = new Date(date + 'T12:00:00');
                const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d.getDay()];
                const monthName = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()];

                return (
                  <div key={date} className="bg-white rounded-xl shadow overflow-hidden">
                    <div className="bg-gray-100 px-6 py-3 border-b">
                      <h3 className="font-bold text-gray-800">{dayName}, {monthName} {d.getDate()}</h3>
                    </div>

                    <div className="p-4 space-y-4">
                      {dateRegs.flatMap(reg => reg.sessions || []).sort().map(session => {
                        const reg = dateRegs.find(r => r.sessions?.includes(session));
                        const counselor = getCounselorForSession(selectedChild, date, session);
                        const podMates = counselor ? getPodMates(selectedChild, date, session, counselor.id) : [];
                        const otherCampers = getAllCampersForSession(date, session, selectedChild);
                        return (
                          <div key={session} className="border rounded-xl p-4 border-green-200 bg-green-50">
                            <div className="flex justify-between items-start mb-4">
                              <div className="flex items-center gap-3">
                                <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl ${session === 'morning' ? 'bg-yellow-400' : 'bg-blue-400'}`}>
                                  {session === 'morning' ? '🌅' : '🌆'}
                                </div>
                                <div>
                                  <h4 className="font-bold text-gray-800">{session === 'morning' ? 'Morning Session' : 'Afternoon Session'}</h4>
                                  <p className="text-sm text-gray-500">{session === 'morning' ? '9:00 AM - 12:00 PM' : '12:00 PM - 3:00 PM'}</p>
                                </div>
                              </div>
                              <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-200 text-green-800">
                                ✓ Registered
                              </span>
                            </div>

                            {/* Counselor/Pod Section */}
                            {counselor ? (
                              <div className="mb-4">
                                <h5 className="text-sm font-medium text-gray-600 mb-2">Your Pod</h5>
                                <div className="bg-white rounded-lg p-4 border">
                                  <div className="flex items-center gap-4 mb-3">
                                    {getDisplayPhoto(counselor.photo) ? (
                                      <img src={getDisplayPhoto(counselor.photo)} className="w-16 h-16 rounded-full object-cover border-2 border-green-400" />
                                    ) : (
                                      <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
                                        <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                      </div>
                                    )}
                                    <div>
                                      <p className="font-bold text-gray-800">{counselor.name}</p>
                                      <p className="text-sm text-green-600">Your Counselor</p>
                                      {counselor.position && <p className="text-xs text-gray-500">{counselor.position}</p>}
                                    </div>
                                  </div>

                                  {podMates.length > 0 && (
                                    <div>
                                      <p className="text-xs text-gray-500 mb-2">Pod Mates ({podMates.length}):</p>
                                      <div className="flex flex-wrap gap-2">
                                        {podMates.map((mate, idx) => (
                                          <div key={idx} className="flex items-center gap-2 bg-gray-50 rounded-lg px-2 py-1">
                                            {getDisplayPhoto(mate.photo) ? (
                                              <img src={getDisplayPhoto(mate.photo)} className="w-8 h-8 rounded-full object-cover" />
                                            ) : (
                                              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                                                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                              </div>
                                            )}
                                            <span className="text-sm">{mate.name}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="mb-4 p-4 bg-gray-100 rounded-lg text-center text-gray-500">
                                <p className="text-sm">Pod assignment pending</p>
                                <p className="text-xs">Counselor will be assigned soon!</p>
                              </div>
                            )}

                            {/* Other Campers at Camp */}
                            {otherCampers.length > 0 && (
                              <div>
                                <h5 className="text-sm font-medium text-gray-600 mb-2">Other Campers at Camp ({otherCampers.length})</h5>
                                <div className="flex flex-wrap gap-2">
                                  {otherCampers.slice(0, 12).map((camper, idx) => (
                                    <div key={idx} className="flex items-center gap-1 bg-white rounded-full px-2 py-1 border">
                                      {getDisplayPhoto(camper.photo) ? (
                                        <img src={getDisplayPhoto(camper.photo)} className="w-6 h-6 rounded-full object-cover" />
                                      ) : (
                                        <div className="w-6 h-6 rounded-full bg-gray-200 flex flex-col items-center justify-center">
                                          <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                                          <span className="text-[5px] text-gray-500 font-medium">add photo</span>
                                        </div>
                                      )}
                                      <span className="text-xs">{camper.name?.split(' ')[0]}</span>
                                    </div>
                                  ))}
                                  {otherCampers.length > 12 && (
                                    <span className="text-xs text-gray-500 self-center">+{otherCampers.length - 12} more</span>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      };

      const Parent = () => {
        const [selectedDates, setSelectedDates] = useState({});
        const [selectedRegistrationMonths, setSelectedRegistrationMonths] = useState(() => {
          // Default: all months selected
          const monthKeys = [];
          CAMP_DATES.forEach(date => {
            const d = new Date(date + 'T12:00:00');
            const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            if (!monthKeys.includes(monthKey)) monthKeys.push(monthKey);
          });
          return monthKeys;
        });
        const [selectedChildren, setSelectedChildren] = useState([]);
        const [showConfirm, setShowConfirm] = useState(null);
        const [justRegistered, setJustRegistered] = useState(false);
        const [showRegistrationModal, setShowRegistrationModal] = useState(false);
        const [returnTabAfterRegistration, setReturnTabAfterRegistration] = useState(null);
        const [editingOrderId, setEditingOrderId] = useState(null);
        const [draftRegistration, setDraftRegistration] = useState(() => {
          // Load draft from localStorage if exists
          const saved = localStorage.getItem('registration_draft');
          return saved ? JSON.parse(saved) : { selectedChildren: [], selectedDates: {}, selectedMonths: [] };
        });
        
        const myUser = parents.find(p => p.email === user?.email) || user;
        // Get children via camper-parent links
        const myChildrenIds = (camperParentLinks || [])
          .filter(link => link.parentEmail === user?.email)
          .map(link => link.camperId);
        const myChildren = (campers || []).filter(c => myChildrenIds.includes(c.id));

        // Auto-select campers that already have registrations
        useEffect(() => {
          if (myChildren.length > 0 && selectedChildren.length === 0) {
            const childrenWithRegs = myChildren.filter(c =>
              registrations.some(r => r.childId === c.id && r.parentEmail === user?.email && r.status !== 'cancelled')
            ).map(c => c.id);
            if (childrenWithRegs.length > 0) {
              setSelectedChildren(childrenWithRegs);
            }
          }
        }, [myChildren.length]);
        const myRegs = registrations.filter(r => r.parentEmail === user?.email && r.status !== 'cancelled');

        // Use gym rental booked dates as primary source, fall back to camp_dates, then hardcoded
        const gymRentalDates = generateDatesFromGymRentals(gymRentals);
        const activeCampDates = gymRentalDates.length > 0
          ? gymRentalDates
          : (campDates.length > 0 ? generateCampDates(campDates) : CAMP_DATES);
        const activeCampWeeks = React.useMemo(() => {
          const weeks = [];
          let currentWeek = [];
          let weekStart = null;
          activeCampDates.forEach((date, idx) => {
            const d = new Date(date + 'T12:00:00');
            if (d.getDay() === 1 || idx === 0) {
              if (currentWeek.length > 0) weeks.push({ start: weekStart, dates: currentWeek });
              currentWeek = [date];
              weekStart = date;
            } else {
              currentWeek.push(date);
            }
          });
          if (currentWeek.length > 0) weeks.push({ start: weekStart, dates: currentWeek });
          return weeks;
        }, [campDates]);
        
        const getAmountDue = () => myRegs.filter(r => r.status === 'approved' && !['paid', 'confirmed'].includes(r.paymentStatus)).reduce((s, r) => s + (r.totalAmount || sessionCost), 0);
        
        const getMonthWeeks = () => {
          const months = {};
          activeCampWeeks.forEach((week, idx) => {
            const m = new Date(week.start + 'T12:00:00').getMonth();
            if (!months[m]) months[m] = { name: ['July', 'August'][m - 6], weeks: [] };
            months[m].weeks.push({ ...week, idx });
          });
          return months;
        };

        // ==================== EMERGENCY CONTACT HELPERS ====================
        // Resolve emergency contact — for parent references, pull name/phone/photo from camp_parents
        const resolveEmergencyContact = (contact) => {
          if (contact.isParent && contact.parentEmail) {
            const parent = (parents || []).find(p => p.email === contact.parentEmail);
            if (parent) {
              return { ...contact, name: parent.name, phone: parent.phone, photo: parent.photo, email: parent.email };
            }
          }
          // Backward compat: old-format parent ECs have name/phone directly
          if (contact.isParent && contact.name) return contact;
          if (contact.isAutoCreated && contact.sourceEmail) {
            const parent = (parents || []).find(p => p.email === contact.sourceEmail);
            if (parent) {
              return { ...contact, name: parent.name, phone: parent.phone, photo: parent.photo, email: parent.email };
            }
          }
          return contact;
        };

        // Get emergency contacts for a specific camper
        const getEmergencyContactsForCamper = (camperId) => {
          // Try explicit camper-EC links first (PUBLIC schema)
          const linkIds = camperEmergencyContactLinks
            .filter(link => link.camperId === camperId)
            .map(link => link.emergencyContactId);
          if (linkIds.length > 0) {
            return emergencyContacts.filter(contact => linkIds.includes(contact.id)).map(resolveEmergencyContact);
          }
          // Fallback: find all parent emails for this camper, then find their ECs
          const parentEmails = (camperParentLinks || [])
            .filter(link => link.camperId === camperId)
            .map(link => link.parentEmail);
          return emergencyContacts
            .filter(contact => parentEmails.includes(contact.userEmail))
            .map(resolveEmergencyContact);
        };

        // Find emergency contact by name (for smart reuse)
        const findContactByName = (name) => {
          return emergencyContacts.find(c => c.name.toLowerCase() === name.toLowerCase());
        };

        // Add emergency contact to all campers (with smart reuse)
        const addEmergencyContactToCamper = async (camperId, contactData) => {
          // Check if contact with same name exists
          let contact = findContactByName(contactData.name);

          if (!contact) {
            // Create new contact
            contact = {
              id: `ec_${Date.now()}`,
              name: contactData.name,
              phone: contactData.phone,
              email: contactData.email || '',
              photo: contactData.photo || null,
              relationship: contactData.relationship || ''
            };
            await saveEmergencyContacts([...emergencyContacts, contact], `Added emergency contact ${contact.name}`);
          }

          // Link contact to ALL of the parent's campers (not just the specified one)
          let newLinks = [...camperEmergencyContactLinks];
          const linkedCamperNames = [];
          myChildren.forEach(child => {
            const alreadyLinked = newLinks.some(
              link => link.camperId === child.id && link.emergencyContactId === contact.id
            );
            if (!alreadyLinked) {
              newLinks.push({ camperId: child.id, emergencyContactId: contact.id });
              linkedCamperNames.push(child.name);
            }
          });

          if (linkedCamperNames.length > 0) {
            await saveCamperEmergencyContactLinks(newLinks);
            addToHistory('Emergency Contacts', `Linked emergency contact ${contact.name} to ${linkedCamperNames.length > 1 ? 'all campers: ' : ''}${linkedCamperNames.join(', ')}`);
          }

          return contact;
        };

        // Remove emergency contact from camper
        const removeEmergencyContactFromCamper = async (camperId, contactId) => {
          const contact = emergencyContacts.find(c => c.id === contactId);
          const camper = campers.find(c => c.id === camperId);
          const newLinks = camperEmergencyContactLinks.filter(
            link => !(link.camperId === camperId && link.emergencyContactId === contactId)
          );
          await saveCamperEmergencyContactLinks(newLinks);
          addToHistory('Emergency Contacts', `Removed emergency contact ${contact?.name || contactId} from camper ${camper?.name || camperId}`);

          // Optionally delete contact if no longer linked to any camper
          const stillLinked = newLinks.some(link => link.emergencyContactId === contactId);
          if (!stillLinked) {
            const newContacts = emergencyContacts.filter(c => c.id !== contactId);
            await saveEmergencyContacts(newContacts, `Deleted emergency contact ${contact?.name || contactId} (no longer linked to any camper)`);
          }
        };

        // ==================== MULTI-PARENT FAMILY ACCESS HELPERS ====================
        // Get other parents who have access to any of my campers
        const getOtherParentsForMyFamily = (myChildren, camperParentLinks, parents, myEmail) => {
          const myChildIds = myChildren.map(c => c.id);
          const otherParentEmails = new Set();

          camperParentLinks
            .filter(link => myChildIds.includes(link.camperId) && link.parentEmail !== myEmail)
            .forEach(link => otherParentEmails.add(link.parentEmail));

          return parents.filter(p => otherParentEmails.has(p.email));
        };

        // Add parent to family with auto emergency contact creation
        const addParentToFamily = async (parentData, myChildren, currentUser) => {
          // 1. Create parent user account
          const newParent = {
            email: parentData.email,
            name: parentData.name,
            password: parentData.password,
            phone: parentData.phone,
            photo: parentData.photo || null,
            role: 'parent',
            roles: ['parent'],
            onboardingComplete: true,
            onboardingCompletedAt: new Date().toISOString(),
            createdBy: currentUser.email,
            createdAt: new Date().toISOString()
          };
          await saveParents([...parents, newParent]);

          // 2. Link to ALL of my campers
          const newLinks = myChildren.map(child => ({
            camperId: child.id,
            parentEmail: parentData.email
          }));
          await saveCamperParentLinks([...camperParentLinks, ...newLinks]);

          // 3. Auto-create emergency contacts for ALL campers
          await autoCreateEmergencyContactsForParent(newParent, myChildren);

          return newParent;
        };

        // Auto-create emergency contact for each camper
        const autoCreateEmergencyContactsForParent = async (parent, campers) => {
          for (const camper of campers) {
            // Reference-only record — name/phone/photo pulled from camp_parents at display time
            const emergencyContact = {
              id: `ec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              parentEmail: parent.email,
              relationship: 'Parent',
              isParent: true,
              isAutoCreated: true,
              userEmail: parent.email
            };

            await addEmergencyContactToCamper(camper.id, emergencyContact);
          }
        };

        // Remove parent access from family
        const removeParentAccess = async (parentEmail, myChildren) => {
          // Remove camper-parent links for all my campers
          const updatedLinks = camperParentLinks.filter(
            link => !(myChildren.some(c => c.id === link.camperId) && link.parentEmail === parentEmail)
          );
          await saveCamperParentLinks(updatedLinks);

          showToast(`Removed ${parentEmail} from family access`);
        };

        // Check if any selected child already has a registration for a date+session
        const isAlreadyRegistered = (date, session) => {
          return selectedChildren.some(childId =>
            myRegs.some(r =>
              r.childId === childId &&
              r.date === date &&
              (r.sessions || []).includes(session) &&
              !['cancelled', 'rejected'].includes(r.status)
            )
          );
        };

        const toggleDate = (date, session) => {
          if (isAlreadyRegistered(date, session)) return; // Don't toggle already-registered sessions
          setSelectedDates(p => {
            const cur = p[date] || [];
            return { ...p, [date]: cur.includes(session) ? cur.filter(s => s !== session) : [...cur, session] };
          });
        };

        // Toggle both sessions for a single date
        const toggleBothSessions = (date) => {
          setSelectedDates(p => {
            const cur = p[date] || [];
            const amBlocked = isSessionBlocked(date, 'morning') || !isSessionAvailableFromGym(date, 'morning');
            const pmBlocked = isSessionBlocked(date, 'afternoon') || !isSessionAvailableFromGym(date, 'afternoon');
            const amReg = isAlreadyRegistered(date, 'morning');
            const pmReg = isAlreadyRegistered(date, 'afternoon');
            const amAvail = !amBlocked && !amReg;
            const pmAvail = !pmBlocked && !pmReg;
            const amSelected = cur.includes('morning');
            const pmSelected = cur.includes('afternoon');

            // If both available sessions are selected, deselect all
            const bothSelected = (amAvail && amSelected) && (pmAvail && pmSelected);
            if (bothSelected) {
              // Only deselect the available ones (keep registered ones out)
              return { ...p, [date]: cur.filter(s => !((s === 'morning' && amAvail) || (s === 'afternoon' && pmAvail))) };
            }

            // Otherwise select both available sessions
            const sessions = [...cur];
            if (amAvail && !amSelected) sessions.push('morning');
            if (pmAvail && !pmSelected) sessions.push('afternoon');
            return { ...p, [date]: sessions };
          });
        };

        // ==================== REGISTRATION MODAL HELPERS ====================
        const openRegistrationModal = () => {
          // Load draft if exists
          const hasDraft = draftRegistration.selectedChildren.length > 0 || Object.keys(draftRegistration.selectedDates).length > 0;
          if (hasDraft) {
            // Filter out stale camper IDs that no longer exist
            const currentChildIds = myChildren.map(c => c.id);
            setSelectedChildren(draftRegistration.selectedChildren.filter(id => currentChildIds.includes(id)));
            setSelectedDates(draftRegistration.selectedDates);
            if (draftRegistration.selectedMonths) {
              setSelectedRegistrationMonths(draftRegistration.selectedMonths);
            }
          } else if (myChildren.length === 1) {
            // Auto-select if only one camper and no draft
            setSelectedChildren([myChildren[0].id]);
          } else {
            setSelectedChildren([]);
          }
          setShowRegistrationModal(true);
        };

        const closeModalAndSaveDraft = () => {
          // Save current state as draft
          const draft = {
            selectedChildren,
            selectedDates,
            selectedMonths: selectedRegistrationMonths
          };
          localStorage.setItem('registration_draft', JSON.stringify(draft));
          setDraftRegistration(draft);
          setShowRegistrationModal(false);
          setEditingOrderId(null);
          if (returnTabAfterRegistration) {
            setParentTab(returnTabAfterRegistration);
            setReturnTabAfterRegistration(null);
          }
        };

        const closeModalAndDiscard = () => {
          // Clear draft and reset selections
          localStorage.removeItem('registration_draft');
          setDraftRegistration({ selectedChildren: [], selectedDates: {}, selectedMonths: [] });
          setSelectedChildren([]);
          setSelectedDates({});
          setShowRegistrationModal(false);
          setEditingOrderId(null);
          if (returnTabAfterRegistration) {
            setParentTab(returnTabAfterRegistration);
            setReturnTabAfterRegistration(null);
          }
        };

        const submitRegistrationFromModal = async () => {
          // If editing, cancel old registrations first
          if (editingOrderId) {
            const oldRegs = registrations.filter(r => (r.orderId || r.id) === editingOrderId && r.status !== 'cancelled');
            const camperNames = [...new Set(oldRegs.map(r => r.childName))].filter(Boolean);
            for (const reg of oldRegs) {
              await saveReg({ ...reg, status: 'cancelled', cancelledAt: new Date().toISOString(), replacedByEdit: true });
            }
            addToHistory('Registration Edited', `Edited registration for ${camperNames.join(', ')} — cancelled ${oldRegs.length} old session(s) and resubmitting`);
          }
          // Submit the registration
          await handleRegister();
          // Clear draft after successful submission
          localStorage.removeItem('registration_draft');
          setDraftRegistration({ selectedChildren: [], selectedDates: {}, selectedMonths: [] });
          setShowRegistrationModal(false);
          setEditingOrderId(null);
          if (returnTabAfterRegistration) {
            setParentTab(returnTabAfterRegistration);
            setReturnTabAfterRegistration(null);
          }
        };

        // Get contextual hints for dashboard
        const getContextualHints = () => {
          const hints = [];
          const myContacts = emergencyContacts.filter(c => c.userEmail === user?.email).map(resolveEmergencyContact);
          const pendingRegs = myRegs.filter(r => r.status === 'pending' && (!r.paymentStatus || r.paymentStatus === 'unpaid'));
          const upcomingSessions = myRegs.filter(r => {
            const regDate = new Date(r.date + 'T12:00:00');
            const now = new Date();
            const daysUntil = Math.ceil((regDate - now) / (1000 * 60 * 60 * 24));
            return daysUntil >= 0 && daysUntil <= 7;
          });
          const childrenWithoutPhotos = myChildren.filter(c => !getDisplayPhoto(c.photo));
          const contactsWithoutPhotos = myContacts.filter(c => !c.isParent && !getDisplayPhoto(c.photo));

          // Priority 1: No campers added
          if (myChildren.length === 0) {
            hints.push({
              icon: '👶',
              text: 'Add campers with photos (we need photos of all campers, parents, and emergency contacts)',
              action: () => setShowAddCamperModal(true),
              actionText: 'Add Campers',
              priority: 1
            });
          }

          // Priority 2: Campers missing photos — one row per camper
          childrenWithoutPhotos.forEach(child => {
            hints.push({
              icon: '📸',
              text: `Add photo for ${child.name} — camper photos are required before camp sessions start`,
              action: () => setAutoOpenPhotoFor(child.id),
              actionText: 'Add Photo',
              priority: 2
            });
          });

          // Priority 2.5: Parents missing photos — one row per parent
          const currentParent = parents.find(p => p.email === user?.email);
          const otherFamilyParents = getOtherParentsForMyFamily(myChildren, camperParentLinks, parents, user?.email);
          const allFamilyParents = currentParent ? [currentParent, ...otherFamilyParents] : otherFamilyParents;
          const parentsWithoutPhotos = allFamilyParents.filter(p => !getDisplayPhoto(p.photo));
          parentsWithoutPhotos.forEach(p => {
            const displayName = p.email === user?.email ? 'yourself' : p.name;
            hints.push({
              icon: '📸',
              text: `Add photo for ${displayName} — parent photos are required before camp sessions start`,
              action: () => setAutoOpenPhotoForParent(p.email),
              actionText: 'Add Photo',
              priority: 2
            });
          });

          // Priority 3: Insufficient emergency contacts
          if (myContacts.length < 2) {
            hints.push({
              icon: '🚨',
              text: `Add emergency contacts (minimum of 2 required, you have ${myContacts.length})`,
              action: () => setShowECAddModal(true),
              actionText: 'Add Emergency Contact',
              priority: 3
            });
          }

          // Priority 4: Emergency contacts missing photos — one row per contact
          if (myContacts.length >= 2) {
            contactsWithoutPhotos.forEach(contact => {
              hints.push({
                icon: '📸',
                text: `Add photo for emergency contact: ${contact.name}`,
                action: () => setAutoOpenPhotoForEC(contact.id),
                actionText: 'Add Photo',
                priority: 4
              });
            });
          }

          // Priority 5: No registrations
          if (myRegs.length === 0 && myChildren.length > 0) {
            hints.push({
              icon: '📝',
              text: 'Register your camper(s) for sessions',
              action: () => { setReturnTabAfterRegistration(parentTab); openRegistrationModal(); },
              actionText: 'Register Now',
              priority: 5
            });
          }

          // Priority 6: Pending registrations (need payment)
          if (pendingRegs.length > 0) {
            hints.push({
              icon: '💳',
              text: `Pay for ${pendingRegs.length} pending session${pendingRegs.length > 1 ? 's' : ''}`,
              action: () => {
                // Group pending regs by orderId and open Venmo modal for the first unpaid order
                const regsByOrder = {};
                pendingRegs.forEach(r => {
                  const key = r.orderId || r.id;
                  if (!regsByOrder[key]) regsByOrder[key] = [];
                  regsByOrder[key].push(r);
                });
                const firstOrderKey = Object.keys(regsByOrder)[0];
                const regs = regsByOrder[firstOrderKey];
                const totalAmount = regs.reduce((sum, r) => sum + (parseFloat(r.totalAmount) || 0), 0);
                const orderVenmoCode = regs[0]?.venmoCode || generateVenmoCode(user?.name);
                const byCamper = {};
                regs.forEach(r => { const n = r.childName || r.camperName || 'Unknown'; if (!byCamper[n]) byCamper[n] = []; byCamper[n].push(r); });
                const camperNames = Object.keys(byCamper);
                const title = camperNames.length === 1 ? `${camperNames[0]}'s Registration` : `${camperNames.join(' and ')} Registration`;
                setVenmoScreenshot(null); setVenmoScreenshotRaw(null);
                setPaymentVenmoModal({ orderKey: firstOrderKey, regs, totalAmount, venmoCode: orderVenmoCode, title });
              },
              actionText: 'Pay Now',
              priority: 6
            });
          }

          // Priority 7: Upcoming sessions
          if (upcomingSessions.length > 0) {
            hints.push({
              icon: '🎒',
              text: 'Get ready for camp: ensure your camper has snacks, water bottle, basketball, appropriate clothes (shorts, socks, basketball shoes, t-shirt)',
              priority: 7
            });
          }

          return hints.sort((a, b) => a.priority - b.priority);
        };

        // Use discount calculation
        const getPricingBreakdown = () => calculateDiscountedTotal(selectedDates, selectedChildren.length, content);
        const calcTotal = () => getPricingBreakdown().finalTotal;

        // Quick action to select entire week (both AM and PM for all available days)
        const selectFullWeek = (weekDates) => {
          setSelectedDates(p => {
            const newDates = { ...p };
            weekDates.forEach(date => {
              const sessions = [];
              if (!isSessionBlocked(date, 'morning') && isSessionAvailableFromGym(date, 'morning') && !isAlreadyRegistered(date, 'morning')) sessions.push('morning');
              if (!isSessionBlocked(date, 'afternoon') && isSessionAvailableFromGym(date, 'afternoon') && !isAlreadyRegistered(date, 'afternoon')) sessions.push('afternoon');
              if (sessions.length > 0) newDates[date] = sessions;
            });
            return newDates;
          });
        };

        // Check if a week is fully selected (only counting available sessions)
        const isWeekFullySelected = (weekDates) => {
          const hasAvailable = weekDates.some(date =>
            !isSessionBlocked(date, 'morning') || !isSessionBlocked(date, 'afternoon')
          );
          if (!hasAvailable) return false;
          return weekDates.every(date => {
            const sel = selectedDates[date] || [];
            const amBlocked = isSessionBlocked(date, 'morning') || !isSessionAvailableFromGym(date, 'morning');
            const pmBlocked = isSessionBlocked(date, 'afternoon') || !isSessionAvailableFromGym(date, 'afternoon');
            const amOk = amBlocked || sel.includes('morning');
            const pmOk = pmBlocked || sel.includes('afternoon');
            return amOk && pmOk;
          });
        };

        // Get count of available days in a week (days with at least one available session)
        const getAvailableDaysInWeek = (weekDates) => weekDates.filter(date =>
          !isSessionBlocked(date, 'morning') || !isSessionBlocked(date, 'afternoon')
        ).length;

        // Clear a week's selection
        const clearWeek = (weekDates) => {
          setSelectedDates(p => {
            const newDates = { ...p };
            weekDates.forEach(date => {
              delete newDates[date];
            });
            return newDates;
          });
        };

        const handleRegister = async () => {
          if (!selectedChildren.length) { showToast('Select children', 'error'); return; }
          const dates = Object.entries(selectedDates).filter(([, s]) => s.length);
          if (!dates.length) { showToast('Select sessions', 'error'); return; }

          // Calculate discount info for the entire order
          const pricing = getPricingBreakdown();
          const orderId = `order_${Date.now()}`;
          const orderVenmoCode = generateVenmoCode(user?.name, orderId);

          // Calculate proportional discount per session
          const discountRatio = pricing.originalTotal > 0 ? pricing.discount / pricing.originalTotal : 0;

          let regCounter = 0;
          for (const childId of selectedChildren) {
            const child = myChildren.find(c => c.id === childId);
            for (const [date, sessions] of dates) {
              const baseAmount = sessions.length * sessionCost;
              const discountAmount = Math.round(baseAmount * discountRatio * 100) / 100;
              const finalAmount = Math.round((baseAmount - discountAmount) * 100) / 100;

              await saveReg({
                id: `reg_${Date.now()}_${regCounter++}_${childId}_${date}`,
                orderId, // Group registrations from same order
                childId, childName: child?.name,
                parentEmail: user?.email, parentName: user?.name,
                date, sessions,
                status: 'pending', paymentStatus: 'unpaid',
                venmoCode: orderVenmoCode, // Unique per order for Venmo payment matching
                baseAmount, // Original price before discount
                discountAmount, // How much was discounted
                discountPercent: pricing.discountPercent,
                totalAmount: finalAmount, // Final price to pay
                registeredAt: new Date().toISOString()
              });
            }
          }

          // Log registration to history
          const regCamperNames = selectedChildren.map(id => myChildren.find(c => c.id === id)?.name).filter(Boolean);
          const regDateCount = Object.entries(selectedDates).filter(([, s]) => s.length).length;
          const regSessionCount = Object.entries(selectedDates).filter(([, s]) => s.length).reduce((sum, [, s]) => sum + s.length, 0);
          addToHistory('Registration Submitted', `Submitted registration for ${regCamperNames.join(', ')} — ${regDateCount} day(s), ${regSessionCount} session(s), $${pricing.finalTotal.toFixed(2)}`);

          // Send registration confirmation email
          try {
            const regDates = Object.entries(selectedDates).filter(([, s]) => s.length).map(([d]) => d).sort();
            const regDateList = regDates.map(d => {
              const dt = new Date(d + 'T12:00:00');
              return dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
            }).join(', ');
            const camperRows = selectedChildren.map(id => {
              const child = myChildren.find(c => c.id === id);
              return `<li><strong>${child?.name || 'Camper'}</strong></li>`;
            }).join('');
            fetch('/.netlify/functions/send-email', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                to: user?.email,
                subject: `Registration Confirmed — ${regCamperNames.join(', ')}`,
                html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #15803d;">Registration Confirmed!</h2>
                  <p>Hi ${user?.name},</p>
                  <p>Your camp registration has been submitted successfully. Here are the details:</p>
                  <div style="background: #f0fdf4; border: 2px solid #86efac; border-radius: 8px; padding: 16px; margin: 16px 0;">
                    <p style="margin: 0 0 8px;"><strong>Camper(s):</strong></p>
                    <ul style="margin: 0 0 12px;">${camperRows}</ul>
                    <p style="margin: 0 0 4px;"><strong>Dates:</strong> ${regDateList}</p>
                    <p style="margin: 0 0 4px;"><strong>Days:</strong> ${regDateCount} day(s), ${regSessionCount} session(s)</p>
                    <p style="margin: 0 0 4px;"><strong>Total Amount Due:</strong> <span style="color: #15803d; font-size: 18px; font-weight: bold;">$${pricing.finalTotal.toFixed(2)}</span></p>
                    ${pricing.discount > 0 ? `<p style="margin: 0; color: #666; font-size: 13px;">Discount applied: -$${pricing.discount.toFixed(2)} (${pricing.discountPercent}% multi-day discount)</p>` : ''}
                    <p style="margin: 8px 0 0;"><strong>Venmo Reference Code:</strong> <span style="font-family: monospace; font-size: 16px; color: #1d4ed8; font-weight: bold;">${orderVenmoCode}</span></p>
                  </div>
                  <h3 style="color: #15803d;">Next Steps</h3>
                  <ol style="line-height: 1.8;">
                    <li><strong>Open Venmo</strong> and search for <strong>@RHSDayCamp</strong></li>
                    <li>Send <strong>$${pricing.finalTotal.toFixed(2)}</strong></li>
                    <li>In the "What's it for?" section, enter your code: <strong>${orderVenmoCode}</strong></li>
                    <li>Take a screenshot of your Venmo payment</li>
                    <li><strong>Upload the screenshot</strong> in your <a href="https://rhsbasketballdaycamp.com/#login" style="color: #1d4ed8;">parent dashboard</a> under Payments</li>
                  </ol>
                  <p style="color: #666; font-size: 14px;">Once we confirm your payment, your registration will be finalized and your camper(s) will be assigned to their pod.</p>
                  <p><a href="https://rhsbasketballdaycamp.com/#login" style="display: inline-block; background-color: #15803d; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Go to Dashboard</a></p>
                </div>`
              })
            });
          } catch (emailErr) { console.error('Registration email failed:', emailErr); }

          // Show Venmo payment confirmation modal
          const confirmedDates = Object.entries(selectedDates).filter(([, s]) => s.length);
          setShowConfirm({
            children: selectedChildren.map(id => myChildren.find(c => c.id === id)?.name).filter(Boolean),
            dates: confirmedDates,
            sessionCount: confirmedDates.reduce((sum, [, s]) => sum + s.length, 0),
            total: pricing.finalTotal,
            savings: pricing.discount,
            venmoCode: orderVenmoCode
          });

          setSelectedDates({});
          setSelectedChildren([]);
          setJustRegistered(true);
        };

        const addChild = async (child) => {
          const newCamperId = 'camper_' + Date.now();
          const newCamper = { ...child, id: newCamperId };
          await saveCampers([...campers, newCamper], `Added camper ${child.name}`);
          await saveCamperParentLinks([...camperParentLinks, { camperId: newCamperId, parentEmail: user?.email }]);
          showToast('Child profile added! Go to Sessions tab to sign them up for camp.');
        };

        return (
          <div className="min-h-screen bg-amber-50">
            <div className="bg-green-800 text-white py-3 sm:py-4">
              <div className="max-w-6xl mx-auto px-4 text-center">
                <h1 className="font-display text-2xl sm:text-3xl">Parent Dashboard</h1>
                <p className="text-green-200 text-sm sm:text-base">Welcome, {user?.name}</p>
              </div>
            </div>

            <div className="bg-white shadow">
              <div className="max-w-6xl mx-auto px-2 sm:px-4">
                <ScrollableTabs persistKey="parent-tabs">
                  {['dashboard', 'parents', 'campers', 'emergency', 'register', 'payments', 'contact', 'history'].map(t => (
                    <button key={t} onClick={() => setParentTab(t)} className={'px-2 sm:px-4 py-2 sm:py-3 border-b-2 whitespace-nowrap select-none text-xs sm:text-sm ' + (parentTab === t ? 'border-green-600 text-green-700 bg-green-50' : 'border-transparent text-gray-500')}>
                      {t === 'contact' ? '📞 Contact Us' : t === 'campers' ? '🏀 Campers' : t === 'emergency' ? '🚨 Emergency Contacts' : t === 'register' ? '📝 Session Registration' : t === 'payments' ? '💰 Payments' : t === 'dashboard' ? '📊 Dashboard' : t === 'parents' ? '👨‍👩‍👧 Parents' : t === 'history' ? '📜 History' : t}
                    </button>
                  ))}
                </ScrollableTabs>
              </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 py-4 sm:py-6">
              {parentTab === 'dashboard' && (() => {
                const hints = getContextualHints();
                return (
                <div className="space-y-6">
                  {/* Contextual Hints Section */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl shadow-md p-6 border-2 border-blue-200">
                    <h3 className="font-bold text-xl mb-4 text-blue-900 flex items-center gap-2">
                      <span>💡</span>
                      <span>Next Steps</span>
                    </h3>
                    {hints.length === 0 ? (
                      <div className="bg-white rounded-lg p-6 text-center shadow-sm">
                        <div className="text-4xl mb-3">🎉</div>
                        <h4 className="font-bold text-lg text-green-700 mb-2">You're all set for camp!</h4>
                        <p className="text-gray-600">All steps are complete. We'll send reminders about what to bring and how to prepare before camp starts.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {hints.map((hint, idx) => (
                          <div key={idx} className="flex items-center gap-3 bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                            <div className="text-2xl">{hint.icon}</div>
                            <div className="flex-1">
                              <p className="text-gray-800">{hint.text}</p>
                            </div>
                            {hint.action && hint.actionText && (
                              <button
                                onClick={hint.action}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 whitespace-nowrap text-sm min-w-[200px] text-center"
                              >
                                {hint.actionText}
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Share with other parents */}
                  <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200 flex items-center gap-4">
                    <div className="text-3xl">📢</div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-800">Tell other parents about the camp</p>
                      <p className="text-sm text-gray-500">Help spread the word about Roosevelt Basketball Day Camp</p>
                    </div>
                    <button
                      onClick={() => {
                        const shareText = `Join us at Roosevelt Girls Basketball Day Camp this summer! Great coaching, fun activities, and skill development for grades 3-8. ${window.location.origin}`;
                        if (navigator.share) {
                          navigator.share({ title: 'Roosevelt Girls Basketball Day Camp', text: shareText, url: window.location.origin }).catch(() => {});
                        } else {
                          navigator.clipboard.writeText(shareText).then(() => showToast('Link copied to clipboard!'));
                        }
                      }}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 whitespace-nowrap"
                    >
                      Share
                    </button>
                  </div>
                </div>
                );
              })()}

              {parentTab === 'parents' && (
                <div className="space-y-6">
                  {/* Family Access Management */}
                  <FamilyAccessManager
                    myChildren={myChildren}
                    parents={parents}
                    saveParents={saveParents}
                    camperParentLinks={camperParentLinks}
                    saveCamperParentLinks={saveCamperParentLinks}
                    emergencyContacts={emergencyContacts}
                    saveEmergencyContacts={saveEmergencyContacts}
                    camperEmergencyContactLinks={camperEmergencyContactLinks}
                    saveCamperEmergencyContactLinks={saveCamperEmergencyContactLinks}
                    currentUserEmail={user?.email}
                    showToast={showToast}
                    addParentToFamily={addParentToFamily}
                    removeParentAccess={removeParentAccess}
                    getOtherParentsForMyFamily={getOtherParentsForMyFamily}
                  />
                </div>
              )}

              {parentTab === 'register' && (
                <div className="space-y-6">
                  {/* New Registration Button */}
                  {myChildren.length > 0 ? (
                    <div className="text-center">
                      <button
                        onClick={openRegistrationModal}
                        className="bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-8 rounded-xl text-lg shadow-lg flex items-center gap-3 mx-auto"
                      >
                        <span className="text-2xl">➕</span>
                        <span>New Registration</span>
                      </button>
                    </div>
                  ) : (
                    <div className="bg-yellow-50 border-2 border-yellow-400 rounded-xl p-6 text-center">
                      <p className="text-yellow-700 font-bold text-lg">⚠️ Add campers first</p>
                      <p className="text-yellow-600 text-sm mt-2">Go to the "Campers" tab to add your children before registering for camp sessions.</p>
                    </div>
                  )}

                  {/* Registration Calendar View — only show when registrations exist */}
                  {myChildren.length > 0 && myRegs.length > 0 ? (
                    <RegistrationCalendarView
                      myChildren={myChildren}
                      registrations={myRegs}
                      activeCampDates={activeCampDates}
                      campDates={campDates}
                      gymRentals={gymRentals}
                      campers={campers}
                      saveCampers={saveCampers}
                    />
                  ) : myChildren.length > 0 ? (
                    <div className="bg-white rounded-xl shadow p-6 text-center">
                      <div className="text-4xl mb-3">📅</div>
                      <p className="text-gray-500">After you create a registration, your camper's schedule will appear here.</p>
                    </div>
                  ) : null}

                  {/* Existing Registrations Section */}
                  <div className="bg-white rounded-xl shadow p-6">
                    <h3 className="font-bold text-xl mb-4 flex items-center gap-2">
                      <span>📋</span>
                      <span>Current Registrations</span>
                    </h3>
                    {myRegs.length === 0 ? (
                      <p className="text-gray-500 text-center py-4">No registrations yet</p>
                    ) : (
                      <div className="space-y-3">
                        {(() => {
                          // Group registrations by orderId — each order is one registration request
                          const regsByOrder = {};
                          myRegs.forEach(reg => {
                            const orderKey = reg.orderId || reg.id;
                            if (!regsByOrder[orderKey]) regsByOrder[orderKey] = [];
                            regsByOrder[orderKey].push(reg);
                          });

                          // Sort orders by creation order (first created at top, newest at bottom)
                          const sortedOrders = Object.entries(regsByOrder).sort((a, b) => {
                            const aDate = a[1][0]?.createdAt || a[1][0]?.date || '';
                            const bDate = b[1][0]?.createdAt || b[1][0]?.date || '';
                            return new Date(aDate) - new Date(bDate);
                          });

                          // Shared date range formatter with contiguous detection
                          const formatDateRange = (dates) => {
                            const sorted = [...dates].sort();
                            const fmt = (d) => {
                              const dt = new Date(d + 'T12:00:00');
                              const month = dt.toLocaleDateString('en-US', { month: 'short' });
                              const day = dt.getDate();
                              const suffix = day === 1 || day === 21 || day === 31 ? 'st' : day === 2 || day === 22 ? 'nd' : day === 3 || day === 23 ? 'rd' : 'th';
                              return `${month} ${day}${suffix}`;
                            };
                            if (sorted.length === 1) return fmt(sorted[0]);
                            const ranges = [];
                            let rangeStart = sorted[0];
                            let prev = sorted[0];
                            for (let i = 1; i <= sorted.length; i++) {
                              const cur = sorted[i];
                              const prevDate = new Date(prev + 'T12:00:00');
                              const curDate = cur ? new Date(cur + 'T12:00:00') : null;
                              const isConsecutive = curDate && (curDate - prevDate) <= 86400000 * 3;
                              if (!isConsecutive) {
                                ranges.push(rangeStart === prev ? fmt(rangeStart) : `${fmt(rangeStart)} - ${fmt(prev)}`);
                                rangeStart = cur;
                              }
                              prev = cur;
                            }
                            return ranges.join(', ');
                          };

                          return sortedOrders.map(([orderKey, regs]) => {
                            const sortedRegs = regs.sort((a, b) => new Date(a.date) - new Date(b.date));
                            const paymentStatus = sortedRegs[0].paymentStatus || 'unpaid';
                            const isPaid = ['paid', 'confirmed'].includes(paymentStatus);
                            const isSent = paymentStatus === 'sent';
                            const totalAmount = sortedRegs.reduce((sum, r) => sum + (parseFloat(r.totalAmount) || 0), 0);
                            const orderVenmoCode = sortedRegs[0]?.venmoCode || generateVenmoCode(user?.name);

                            // Group by camper within this order
                            const byCamper = {};
                            sortedRegs.forEach(r => {
                              const name = r.childName || r.camperName || 'Unknown';
                              if (!byCamper[name]) byCamper[name] = [];
                              byCamper[name].push(r);
                            });
                            const camperNames = Object.keys(byCamper);
                            const title = camperNames.length === 1
                              ? `${camperNames[0]}'s Registration`
                              : `${camperNames.join(' and ')} Registration`;

                            return (
                              <div key={orderKey} className={`rounded-lg p-4 ${
                                isPaid ? 'bg-green-50 border-2 border-green-500' :
                                isSent ? 'bg-blue-50 border-2 border-blue-300' :
                                'bg-blue-50 border-2 border-blue-300'
                              }`}>
                                <div className="flex justify-between items-start mb-3">
                                  <div className="font-bold text-lg text-green-800">{title}</div>
                                  <div className="flex items-center gap-2">
                                    {paymentStatus === 'unpaid' && (
                                      <button
                                        onClick={() => {
                                          const childIds = [...new Set(sortedRegs.map(r => r.childId))];
                                          const dateMap = {};
                                          sortedRegs.forEach(r => {
                                            if (!dateMap[r.date]) dateMap[r.date] = [];
                                            r.sessions?.forEach(s => {
                                              if (!dateMap[r.date].includes(s)) dateMap[r.date].push(s);
                                            });
                                          });
                                          setSelectedChildren(childIds);
                                          setSelectedDates(dateMap);
                                          setEditingOrderId(orderKey);
                                          setShowRegistrationModal(true);
                                        }}
                                        className="px-3 py-1 text-blue-600 hover:bg-blue-50 rounded-lg text-sm font-medium"
                                      >
                                        Edit
                                      </button>
                                    )}
                                    {isPaid ? (
                                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">✓ Registered & Paid</span>
                                    ) : isSent ? (
                                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">Payment Sent</span>
                                    ) : (
                                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">Payment Due</span>
                                    )}
                                  </div>
                                </div>
                                {/* Per-camper breakdown */}
                                <div className="space-y-2 mb-3">
                                  {Object.entries(byCamper).map(([camperName, camperRegs]) => {
                                    const sortedCamperRegs = camperRegs.sort((a, b) => new Date(a.date) - new Date(b.date));
                                    const dates = sortedCamperRegs.map(r => r.date);
                                    const camperTotal = sortedCamperRegs.reduce((sum, r) => sum + (parseFloat(r.totalAmount) || 0), 0);
                                    const sessions = sortedCamperRegs.flatMap(r => r.sessions || []);
                                    const hasAM = sessions.includes('morning');
                                    const hasPM = sessions.includes('afternoon');
                                    const sessionLabel = hasAM && hasPM ? 'AM + PM' : hasAM ? 'AM only' : 'PM only';
                                    return (
                                      <div key={camperName} className={`rounded-lg p-3 ${isPaid ? 'bg-green-100' : 'bg-blue-100'}`}>
                                        <div className="flex justify-between items-center">
                                          <div>
                                            <span className="font-medium">{camperName}</span>
                                            <span className="text-sm text-gray-500 ml-2">({sessionLabel})</span>
                                          </div>
                                          <span className="font-medium">${camperTotal.toFixed(2)}</span>
                                        </div>
                                        <div className="text-sm text-gray-600 mt-1">{dates.length} day{dates.length > 1 ? 's' : ''} • {formatDateRange(dates)}</div>
                                      </div>
                                    );
                                  })}
                                </div>
                                {(isPaid || isSent) && orderVenmoCode && (
                                  <div className={`text-xs mt-2 ${isPaid ? 'text-green-600' : 'text-blue-600'}`}>
                                    Venmo Reference: <span className="font-mono font-bold">{orderVenmoCode}</span>
                                    {sortedRegs[0]?.paymentSentAt && (
                                      <span className="ml-2 text-gray-500">
                                        Sent {new Date(sortedRegs[0].paymentSentAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at {new Date(sortedRegs[0].paymentSentAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                                      </span>
                                    )}
                                  </div>
                                )}
                                {(isPaid || isSent) && sortedRegs[0]?.venmoScreenshot && (
                                  <div className="mt-2 mb-1">
                                    <img
                                      src={getDisplayPhoto(sortedRegs[0].venmoScreenshot) || sortedRegs[0].venmoScreenshot}
                                      alt="Venmo payment screenshot"
                                      className="max-h-32 object-contain rounded-lg border"
                                    />
                                  </div>
                                )}
                                {isPaid && sortedRegs[0]?.invoiceId && (
                                  <div className="mt-2">
                                    <span className="text-xs text-green-600">Invoice: <span className="font-mono font-bold">{sortedRegs[0].invoiceId}</span></span>
                                  </div>
                                )}
                                <div className={`flex justify-between items-center pt-2 ${isPaid ? 'border-t border-green-300' : isSent ? 'border-t border-blue-200' : 'border-t border-blue-200'}`}>
                                  <span className="font-bold text-lg">${totalAmount.toFixed(2)}</span>
                                  <div className="flex gap-2">
                                    {isPaid ? (
                                      <span className="text-green-600 font-medium text-sm">✓ Payment confirmed</span>
                                    ) : isSent ? (
                                      <span className="text-blue-600 font-medium text-sm">Payment sent — awaiting confirmation</span>
                                    ) : (
                                      <button
                                        onClick={() => setParentTab('payments')}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700"
                                      >
                                        Pay Now
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    )}
                  </div>

                  {justRegistered && (
                    <div className="bg-green-50 border-2 border-green-300 rounded-xl p-4 flex items-center gap-3">
                      <span className="text-3xl">✅</span>
                      <div className="flex-1">
                        <p className="font-bold text-green-800">Registration submitted successfully!</p>
                        <p className="text-sm text-green-700">Your registration has been sent to the camp director for review.</p>
                      </div>
                      <button
                        onClick={() => setJustRegistered(false)}
                        className="text-green-600 hover:text-green-800 font-bold"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                  {/* Registration Modal moved to top level (rendered outside all tab blocks) */}
                </div>
              )}

              {parentTab === 'schedule' && (
                <CamperScheduleTab
                  myChildren={myChildren}
                  registrations={myRegs}
                  allRegistrations={registrations}
                  assignments={assignments}
                  counselors={counselors}
                  campers={campers}
                  parents={parents}
                />
              )}

              {parentTab === 'campers' && (
                <div className="space-y-6">
                  {myChildren.length > 0 ? (
                    <ChildrenManager
                      children={myChildren}
                      onUpdate={(updatedChild) => {
                        saveCampers(campers.map(c => c.id === updatedChild.id ? updatedChild : c), `Updated camper ${updatedChild.name}`);
                        showToast('Child updated!');
                      }}
                      onDelete={(childId) => {
                        const childToDelete = campers.find(c => c.id === childId);
                        saveCampers(campers.filter(c => c.id !== childId), `Deleted camper ${childToDelete?.name || childId}`);
                        saveCamperParentLinks(camperParentLinks.filter(l => l.camperId !== childId));
                        showToast('Child removed');
                      }}
                      onAdd={addChild}
                      registrations={myRegs}
                      emergencyContacts={emergencyContacts}
                      getEmergencyContactsForCamper={getEmergencyContactsForCamper}
                      addEmergencyContactToCamper={addEmergencyContactToCamper}
                      removeEmergencyContactFromCamper={removeEmergencyContactFromCamper}
                      parents={parents}
                      camperParentLinks={camperParentLinks}
                      onAddEmergencyContact={() => setShowECAddModal(true)}
                    />
                  ) : (
                    <div className="bg-white rounded-xl shadow p-6">
                      <h3 className="font-bold text-lg mb-2">Campers</h3>
                      <p className="text-sm text-gray-500 mb-4">Add your children's profiles here. Register them for camp sessions in the Sessions tab to make them campers!</p>
                      <AddChildForm onAdd={addChild} />
                    </div>
                  )}
                </div>
              )}

              {parentTab === 'emergency' && (
                <div className="space-y-6">
                  {/* Emergency Contacts Management */}
                  <ParentEmergencyContactsManager
                    parentEmail={user?.email}
                    emergencyContacts={emergencyContacts}
                    onSave={async (contacts) => {
                      await saveEmergencyContacts(contacts, `Updated emergency contacts for ${user?.name}`);
                      // Auto-link only THIS parent's contacts to their campers
                      const myContacts = contacts.filter(c => c.userEmail === user?.email);
                      const newLinks = [];
                      for (const camper of myChildren) {
                        for (const contact of myContacts) {
                          const alreadyLinked = camperEmergencyContactLinks.some(
                            link => link.camperId === camper.id && link.emergencyContactId === contact.id
                          );
                          if (!alreadyLinked) {
                            newLinks.push({ camperId: camper.id, emergencyContactId: contact.id });
                          }
                        }
                      }
                      if (newLinks.length > 0) {
                        await saveCamperEmergencyContactLinks([...camperEmergencyContactLinks, ...newLinks]);
                      }
                      showToast('Emergency contacts updated!');
                      if (returnTabAfterEC) {
                        setParentTab(returnTabAfterEC);
                        setReturnTabAfterEC(null);
                      }
                    }}
                    showToast={showToast}
                    parents={parents}
                    saveParents={saveParents}
                    addParentToFamily={addParentToFamily}
                    myChildren={myChildren}
                    currentUser={{ email: user?.email }}
                    addToHistory={addToHistory}
                    autoOpenAddEC={autoOpenAddEC}
                    onAutoOpenDone={() => setAutoOpenAddEC(false)}
                    onCloseAddForm={() => { if (returnTabAfterEC) { setParentTab(returnTabAfterEC); setReturnTabAfterEC(null); } }}
                    onRequestAddForm={() => setShowECAddModal(true)}
                  />
                </div>
              )}

              {parentTab === 'payments' && (
                <div className="space-y-6">
                  <div className="bg-white rounded-xl shadow p-6">
                    <div className="mb-4">
                      <h3 className="font-bold text-xl">💰 Payment Status</h3>
                    </div>
                    {(() => {
                      const activeRegs = myRegs.filter(r => r.status !== 'cancelled' && r.status !== 'rejected');
                      if (activeRegs.length === 0) {
                        return (
                          <div className="text-center py-8">
                            <p className="text-gray-500 mb-4">No registrations submitted yet.</p>
                            {myRegs.length === 0 && myChildren.length > 0 && (
                              <button
                                onClick={() => openRegistrationModal()}
                                className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-xl text-base shadow-lg inline-flex items-center gap-2"
                              >
                                <span className="text-xl">➕</span>
                                <span>+ New Registration</span>
                              </button>
                            )}
                          </div>
                        );
                      }

                      // Helper: format date range like "Jul 3rd - Jul 7th"
                      const formatDateRange = (dates) => {
                        const sorted = [...dates].sort();
                        const fmt = (d) => {
                          const dt = new Date(d + 'T12:00:00');
                          const month = dt.toLocaleDateString('en-US', { month: 'short' });
                          const day = dt.getDate();
                          const suffix = day === 1 || day === 21 || day === 31 ? 'st' : day === 2 || day === 22 ? 'nd' : day === 3 || day === 23 ? 'rd' : 'th';
                          return `${month} ${day}${suffix}`;
                        };
                        if (sorted.length === 1) return fmt(sorted[0]);
                        const ranges = [];
                        let rangeStart = sorted[0];
                        let prev = sorted[0];
                        for (let i = 1; i <= sorted.length; i++) {
                          const cur = sorted[i];
                          const prevDate = new Date(prev + 'T12:00:00');
                          const curDate = cur ? new Date(cur + 'T12:00:00') : null;
                          const isConsecutive = curDate && (curDate - prevDate) <= 86400000 * 3;
                          if (!isConsecutive) {
                            ranges.push(rangeStart === prev ? fmt(rangeStart) : `${fmt(rangeStart)} - ${fmt(prev)}`);
                            rangeStart = cur;
                          }
                          prev = cur;
                        }
                        return ranges.join(', ');
                      };

                      // Group by orderId
                      const regsByOrder = {};
                      activeRegs.forEach(reg => {
                        const orderKey = reg.orderId || reg.id;
                        if (!regsByOrder[orderKey]) regsByOrder[orderKey] = [];
                        regsByOrder[orderKey].push(reg);
                      });

                      // Sort by creation order (first created at top, newest at bottom)
                      const allOrders = Object.entries(regsByOrder).sort((a, b) => {
                        const aDate = a[1][0]?.createdAt || a[1][0]?.date || '';
                        const bDate = b[1][0]?.createdAt || b[1][0]?.date || '';
                        return new Date(aDate) - new Date(bDate);
                      });
                      const unpaidOrders = allOrders.filter(([, regs]) => !['paid', 'confirmed'].includes(regs[0]?.paymentStatus));
                      const paidOrders = allOrders.filter(([, regs]) => ['paid', 'confirmed'].includes(regs[0]?.paymentStatus));

                      const renderPaymentCard = ([orderKey, regs]) => {
                            const paymentStatus = regs[0]?.paymentStatus || 'unpaid';
                            const isPaid = ['paid', 'confirmed'].includes(paymentStatus);
                            const isSent = paymentStatus === 'sent';
                            const totalAmount = regs.reduce((sum, r) => sum + (parseFloat(r.totalAmount) || 0), 0);
                            const orderVenmoCode = regs[0]?.venmoCode || generateVenmoCode(user?.name);

                            // Group by camper within this order
                            const byCamper = {};
                            regs.forEach(r => {
                              const name = r.childName || r.camperName || 'Unknown';
                              if (!byCamper[name]) byCamper[name] = [];
                              byCamper[name].push(r);
                            });
                            const camperNames = Object.keys(byCamper);
                            const title = camperNames.length === 1
                              ? `${camperNames[0]}'s Registration`
                              : `${camperNames.join(' and ')} Registration`;

                        return (
                          <div key={orderKey} className={`rounded-lg p-4 ${
                            isPaid ? 'bg-green-50 border-2 border-green-500' :
                            isSent ? 'bg-blue-50 border-2 border-blue-300' :
                            'bg-blue-50 border-2 border-blue-300'
                          }`}>
                            <div className="flex justify-between items-start mb-3">
                              <div className="font-bold text-lg text-green-800">{title}</div>
                              <div className="flex items-center gap-2">
                                {paymentStatus === 'unpaid' && (
                                  <button
                                    onClick={() => {
                                      const childIds = [...new Set(regs.map(r => r.childId))];
                                      const dateMap = {};
                                      regs.forEach(r => {
                                        if (!dateMap[r.date]) dateMap[r.date] = [];
                                        r.sessions?.forEach(s => {
                                          if (!dateMap[r.date].includes(s)) dateMap[r.date].push(s);
                                        });
                                      });
                                      setSelectedChildren(childIds);
                                      setSelectedDates(dateMap);
                                      setEditingOrderId(orderKey);
                                      setShowRegistrationModal(true);
                                    }}
                                    className="px-3 py-1 text-blue-600 hover:bg-blue-50 rounded-lg text-sm font-medium"
                                  >
                                    Edit
                                  </button>
                                )}
                                {isPaid ? (
                                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">✓ Registered & Paid</span>
                                ) : isSent ? (
                                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">Payment Sent</span>
                                ) : (
                                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">Payment Due</span>
                                )}
                              </div>
                            </div>
                            {/* Per-camper breakdown */}
                            <div className="space-y-2 mb-3">
                              {Object.entries(byCamper).map(([camperName, camperRegs]) => {
                                const sortedCamperRegs = camperRegs.sort((a, b) => new Date(a.date) - new Date(b.date));
                                const dates = sortedCamperRegs.map(r => r.date);
                                const camperTotal = sortedCamperRegs.reduce((sum, r) => sum + (parseFloat(r.totalAmount) || 0), 0);
                                const sessions = sortedCamperRegs.flatMap(r => r.sessions || []);
                                const hasAM = sessions.includes('morning');
                                const hasPM = sessions.includes('afternoon');
                                const sessionLabel = hasAM && hasPM ? 'AM + PM' : hasAM ? 'AM only' : 'PM only';
                                return (
                                  <div key={camperName} className={`rounded-lg p-3 ${isPaid ? 'bg-green-100' : isSent ? 'bg-blue-100' : 'bg-blue-100'}`}>
                                    <div className="flex justify-between items-center">
                                      <div>
                                        <span className="font-medium">{camperName}</span>
                                        <span className="text-sm text-gray-500 ml-2">({sessionLabel})</span>
                                      </div>
                                      <span className="font-medium">${camperTotal.toFixed(2)}</span>
                                    </div>
                                    <div className="text-sm text-gray-600 mt-1">{dates.length} day{dates.length > 1 ? 's' : ''} • {formatDateRange(dates)}</div>
                                  </div>
                                );
                              })}
                            </div>
                            {(isPaid || isSent) && orderVenmoCode && (
                              <div className={`text-xs mt-2 ${isPaid ? 'text-green-600' : 'text-blue-600'}`}>
                                Venmo Reference: <span className="font-mono font-bold">{orderVenmoCode}</span>
                                {regs[0]?.paymentSentAt && (
                                  <span className="ml-2 text-gray-500">
                                    Sent {new Date(regs[0].paymentSentAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at {new Date(regs[0].paymentSentAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                                  </span>
                                )}
                              </div>
                            )}
                            {(isPaid || isSent) && regs[0]?.venmoScreenshot && (
                              <div className="mt-2 mb-1">
                                <img
                                  src={getDisplayPhoto(regs[0].venmoScreenshot) || regs[0].venmoScreenshot}
                                  alt="Venmo payment screenshot"
                                  className="max-h-32 object-contain rounded-lg border"
                                />
                              </div>
                            )}
                            {isPaid && regs[0]?.invoiceId && (
                              <div className="mt-2">
                                <span className="text-xs text-green-600">Invoice: <span className="font-mono font-bold">{regs[0].invoiceId}</span></span>
                              </div>
                            )}
                            <div className={`flex justify-between items-center pt-2 ${isPaid ? 'border-t border-green-300' : isSent ? 'border-t border-blue-200' : 'border-t'}`}>
                              <span className="font-bold text-lg">${totalAmount.toFixed(2)}</span>
                              <div className="flex gap-2">
                                {isPaid ? (
                                  <span className="text-green-600 font-medium text-sm">✓ Payment confirmed</span>
                                ) : isSent ? (
                                  <span className="text-blue-600 font-medium text-sm">Payment sent — awaiting confirmation</span>
                                ) : (
                                  <button
                                    onClick={() => { setVenmoScreenshot(null); setVenmoScreenshotRaw(null); setPaymentVenmoModal({ orderKey, regs, totalAmount, venmoCode: orderVenmoCode, title }); }}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700"
                                  >
                                    Pay Now
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      };

                      return (
                        <div className="space-y-6">
                          {/* Registrations with Payments Due */}
                          {unpaidOrders.length > 0 && (
                            <div>
                              <h4 className="font-bold text-lg text-gray-800 mb-3">Registrations with Payments Due</h4>
                              <div className="space-y-4">
                                {unpaidOrders.map(renderPaymentCard)}
                              </div>
                            </div>
                          )}

                          {/* Registrations that have been Paid */}
                          {paidOrders.length > 0 && (
                            <div>
                              <h4 className="font-bold text-lg text-gray-800 mb-3">Registrations that have been Paid</h4>
                              <div className="space-y-4">
                                {paidOrders.map(renderPaymentCard)}
                              </div>
                            </div>
                          )}

                          {unpaidOrders.length === 0 && paidOrders.length === 0 && (
                            <p className="text-gray-500 text-center py-4">No payment records found.</p>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                </div>
              )}

              {parentTab === 'contact' && (
                <div className="bg-white rounded-xl shadow p-6 max-w-lg mx-auto text-center">
                  <div className="text-5xl mb-4">📞</div>
                  <h3 className="font-bold text-2xl text-green-800 mb-2">Contact Us</h3>
                  <p className="text-gray-600 mb-6">Have questions about Roosevelt Basketball Day Camp? Reach out to the Camp Director.</p>
                  <div className="space-y-4">
                    <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
                      <p className="text-sm text-gray-500 mb-1">Email</p>
                      <a href="mailto:rhsdaycamp@gmail.com" className="text-green-700 font-bold text-lg hover:underline">rhsdaycamp@gmail.com</a>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mt-6">For general questions, please email us.</p>
                </div>
              )}

              {parentTab === 'history' && (() => {
                const myHistory = (changeHistory || []).filter(
                  entry => entry.relatedEmails && entry.relatedEmails.includes(user?.email)
                );
                return (
                  <div className="bg-white rounded-xl shadow p-6">
                    <h3 className="font-bold text-lg text-green-800 mb-2">Activity History</h3>
                    <p className="text-sm text-gray-500 mb-4">Recent activity related to your account, campers, and registrations.</p>
                    {myHistory.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="text-4xl mb-3">📜</div>
                        <p className="text-gray-500">No activity recorded yet.</p>
                        <p className="text-sm text-gray-400 mt-1">Actions you take and camp director updates will appear here.</p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[600px] overflow-y-auto">
                        {myHistory.map(entry => (
                          <div key={entry.id} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50">
                            <div className="text-xs text-gray-400 whitespace-nowrap pt-0.5">
                              {formatTimestamp(entry.timestamp)}
                            </div>
                            <div>
                              <div className="font-medium text-gray-800">{entry.action}</div>
                              <div className="text-sm text-gray-600">{entry.details}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>


                  {/* EC Add Modal — standalone component to prevent focus loss */}
                  {showECAddModal && (
                    <ECAddModal
                      onSave={async (formData) => {
                        if (!isValidPhone(formData.phone)) { showToast('Please enter a valid 10-digit phone number', 'error'); return; }
                        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) { showToast('Please enter a valid email address', 'error'); return; }
                        const newContact = { id: `ec_${Date.now()}`, userEmail: user?.email, ...formData };
                        const allContacts = [...emergencyContacts, newContact];
                        await saveEmergencyContacts(allContacts, `Added emergency contact ${formData.name} for ${user?.name}`);
                        const newLinks = [];
                        for (const camper of myChildren) {
                          const alreadyLinked = camperEmergencyContactLinks.some(link => link.camperId === camper.id && link.emergencyContactId === newContact.id);
                          if (!alreadyLinked) newLinks.push({ camperId: camper.id, emergencyContactId: newContact.id });
                        }
                        if (newLinks.length > 0) await saveCamperEmergencyContactLinks([...camperEmergencyContactLinks, ...newLinks]);
                        showToast(`Added ${formData.name} as emergency contact`, 'success');
                        setShowECAddModal(false);
                      }}
                      onCancel={() => setShowECAddModal(false)}
                    />
                  )}

                  {/* Venmo Payment Modal — top level so it renders from any tab */}
                  {paymentVenmoModal && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => { setPaymentVenmoModal(null); setVenmoScreenshot(null); setVenmoScreenshotRaw(null); }}>
                      <div data-venmo-modal className="bg-white rounded-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <h3 className="font-bold text-xl text-center mb-4">Pay via Venmo</h3>
                        <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4 mb-4">
                          <div className="font-bold text-blue-800 mb-2">{paymentVenmoModal.title}</div>
                          {paymentVenmoModal.regs && (() => {
                            const byCamper = {};
                            paymentVenmoModal.regs.forEach(r => {
                              const name = r.childName || r.camperName || 'Unknown';
                              if (!byCamper[name]) byCamper[name] = [];
                              byCamper[name].push(r);
                            });
                            return Object.entries(byCamper).map(([name, camperRegs]) => {
                              const sorted = camperRegs.sort((a, b) => new Date(a.date) - new Date(b.date));
                              const sessions = sorted.flatMap(r => r.sessions || []);
                              const hasAM = sessions.includes('morning');
                              const hasPM = sessions.includes('afternoon');
                              const sessionLabel = hasAM && hasPM ? 'AM + PM' : hasAM ? 'AM only' : 'PM only';
                              const dates = sorted.map(r => r.date);
                              const fmt = (d) => new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                              const dateRange = dates.length === 1 ? fmt(dates[0]) : `${fmt(dates[0])} - ${fmt(dates[dates.length - 1])}`;
                              return (
                                <div key={name} className="text-sm text-blue-700 mt-1">
                                  <span className="font-medium">{name}</span> — {dateRange} • {dates.length} day{dates.length > 1 ? 's' : ''} • {sessionLabel}
                                </div>
                              );
                            });
                          })()}
                          <div className="mt-2 pt-2 border-t border-blue-200 flex justify-between">
                            <span className="font-bold text-blue-800">Total</span>
                            <span className="font-bold text-blue-800 text-lg">${paymentVenmoModal.totalAmount.toFixed(2)}</span>
                          </div>
                        </div>
                        <div className="space-y-4">
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-14 h-7 bg-blue-600 text-white flex items-center justify-center text-xs font-bold rounded-full">Step 1</div>
                            <div><p className="font-medium text-gray-800">Open Venmo and tap "Pay or Request"</p></div>
                          </div>
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-14 h-7 bg-blue-600 text-white flex items-center justify-center text-xs font-bold rounded-full">Step 2</div>
                            <div><p className="font-medium text-gray-800">Search for <span className="text-blue-700 font-bold">{content?.venmoUsername || '@RHSDayCamp'}</span></p></div>
                          </div>
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-14 h-7 bg-blue-600 text-white flex items-center justify-center text-xs font-bold rounded-full">Step 3</div>
                            <div><p className="font-medium text-gray-800">Enter the amount: <span className="text-green-700 font-bold text-lg">${paymentVenmoModal.totalAmount.toFixed(2)}</span></p></div>
                          </div>
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-14 h-7 bg-blue-600 text-white flex items-center justify-center text-xs font-bold rounded-full">Step 4</div>
                            <div>
                              <p className="font-medium text-gray-800">In the "What's it for?" section, add this unique registration code</p>
                              <div className="bg-blue-50 rounded-lg p-3 border-2 border-blue-300 mt-1">
                                <p className="font-mono text-2xl font-bold text-blue-700 text-center">{paymentVenmoModal.venmoCode}</p>
                              </div>
                              <p className="text-xs text-gray-500 mt-1">This code helps the Camp Director match your Venmo payment to your registration.</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-14 h-7 bg-blue-600 text-white flex items-center justify-center text-xs font-bold rounded-full">Step 5</div>
                            <div>
                              <p className="font-medium text-gray-800">Take a screenshot of your Venmo payment <span className="text-gray-400 font-normal">(optional)</span></p>
                              <div className="mt-2">
                                {venmoScreenshot ? (
                                  <div className="flex items-center gap-3">
                                    <img src={getDisplayPhoto(venmoScreenshot) || venmoScreenshot} alt="Venmo screenshot" className="max-h-48 object-contain rounded-lg border-2 border-green-400" />
                                    <button onClick={() => { const original = venmoScreenshot?.original || getDisplayPhoto(venmoScreenshot) || venmoScreenshot; setVenmoScreenshotRaw(original); setVenmoScreenshot(null); }}
                                      className="px-3 py-1.5 text-blue-600 hover:text-blue-800 text-sm font-medium border border-blue-300 rounded-lg hover:bg-blue-50">Edit</button>
                                  </div>
                                ) : (
                                  <label className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-50 border-2 border-dashed border-blue-300 rounded-lg cursor-pointer hover:bg-blue-100">
                                    <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                    <span className="text-blue-600 font-medium text-sm">Upload Screenshot</span>
                                    <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) { const reader = new FileReader(); reader.onload = (ev) => setVenmoScreenshotRaw(ev.target.result); reader.readAsDataURL(file); }
                                    }} />
                                  </label>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                        {venmoScreenshotRaw && !venmoScreenshot && (
                          <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4" onClick={() => setVenmoScreenshotRaw(null)}>
                            <div className="bg-white rounded-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                              <h3 className="font-bold text-lg text-gray-800 mb-4">Crop Screenshot</h3>
                              <ImageCropper image={venmoScreenshotRaw} onSave={(croppedImg, transform) => { setVenmoScreenshot({ cropped: croppedImg, original: venmoScreenshotRaw, transform }); setVenmoScreenshotRaw(null); setTimeout(() => { const modal = document.querySelector('[data-venmo-modal]'); if (modal) modal.scrollTop = modal.scrollHeight; }, 100); }} onCancel={() => setVenmoScreenshotRaw(null)} shape="rectangle" aspectRatio={9/16} />
                            </div>
                          </div>
                        )}
                        <div className="space-y-2 mt-6">
                          <button onClick={async () => {
                            try {
                              const sentAt = new Date().toISOString();
                              const modalData = paymentVenmoModal;
                              setPaymentVenmoModal(null); setVenmoScreenshot(null); setVenmoScreenshotRaw(null);
                              for (const reg of modalData.regs) { await saveReg({ ...reg, paymentStatus: 'sent', paymentSentAt: sentAt, venmoScreenshot: venmoScreenshot || null }); }
                              addToHistory('Venmo Payment Sent', `${modalData.title} — $${modalData.totalAmount.toFixed(2)} via Venmo (code: ${modalData.venmoCode})`);
                              showToast('Payment marked as sent!', 'success');
                            } catch (err) { console.error('Payment confirmation error:', err); showToast('Payment saved. Please refresh if issues persist.', 'success'); }
                          }} className="w-full font-bold py-3 rounded-lg bg-green-600 text-white hover:bg-green-700">
                            Confirm Payment Sent
                          </button>
                          <button onClick={() => { setPaymentVenmoModal(null); setVenmoScreenshot(null); setVenmoScreenshotRaw(null); }}
                            className="w-full bg-gray-200 text-gray-700 font-medium py-3 rounded-lg hover:bg-gray-300">Cancel</button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Registration Modal */}
                  {showRegistrationModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={(e) => { if (e.target === e.currentTarget) closeModalAndSaveDraft(); }}>
                      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
                        {/* Modal Header */}
                        <div className="sticky top-0 bg-white border-b-2 border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
                          <h2 className="text-2xl font-bold text-gray-800">{editingOrderId ? 'Edit Registration' : 'New Registration'}</h2>
                          <button
                            onClick={closeModalAndSaveDraft}
                            className="text-gray-400 hover:text-gray-600 text-3xl font-bold leading-none"
                          >
                            ×
                          </button>
                        </div>

                        {/* Modal Content */}
                        <div className="p-6 space-y-6">
                          {/* Step 1: Select Campers */}
                          <div className={'bg-white rounded-xl border-2 border-gray-200 p-6 ' + (!selectedChildren.length && Object.values(selectedDates).flat().length > 0 ? 'ring-2 ring-yellow-400' : '')}>
                            <h3 className="font-bold text-lg mb-2">Step 1: Select Camper(s) to Register</h3>
                    {myChildren.length === 0 ? <p className="text-gray-500">Add campers in the "Campers" tab first</p> : (
                      <div className="flex flex-wrap gap-3">{myChildren.map(c => (
                        <button key={c.id} onClick={() => setSelectedChildren(p => p.includes(c.id) ? p.filter(x => x !== c.id) : [...p, c.id])} className={'flex flex-col items-center gap-1 px-4 py-3 rounded-lg border-2 ' + (selectedChildren.includes(c.id) ? 'border-green-600 bg-green-50 font-bold' : 'border-gray-200')}>
                          {getDisplayPhoto(c.photo) ? (
                            <img src={getDisplayPhoto(c.photo)} className="w-10 h-10 rounded-full object-cover border-2 border-green-500" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                              <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                            </div>
                          )}
                          <span className="text-sm">{selectedChildren.includes(c.id) ? '✓ ' : ''}{c.name}</span>
                        </button>
                      ))}</div>
                    )}
                            {selectedChildren.length > 0 && <p className="text-green-600 text-sm mt-2 font-medium">✓ {selectedChildren.length} camper{selectedChildren.length > 1 ? 's' : ''} selected</p>}
                          </div>

                          {/* Step 2: Select Dates & Sessions */}
                          <div className="bg-white rounded-xl border-2 border-gray-200 p-6">
                            <h3 className="font-bold text-lg mb-4">Step 2: Select Dates & Sessions</h3>

                    {/* Month Selector */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {(() => {
                        const months = [];
                        CAMP_DATES.forEach(date => {
                          const d = new Date(date + 'T12:00:00');
                          const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                          const monthName = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                          if (!months.some(m => m.key === monthKey)) {
                            months.push({ key: monthKey, name: monthName });
                          }
                        });

                        return months.map(m => {
                          const isSelected = selectedRegistrationMonths.includes(m.key);
                          return (
                            <button
                              key={m.key}
                              onClick={() => setSelectedRegistrationMonths(prev =>
                                prev.includes(m.key) ? prev.filter(k => k !== m.key) : [...prev, m.key]
                              )}
                              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                                isSelected
                                  ? 'bg-green-600 text-white'
                                  : 'bg-gray-100 hover:bg-gray-200'
                              }`}
                            >
                              {m.name}
                            </button>
                          );
                        });
                      })()}
                    </div>

                    <p className="text-sm text-gray-500 mb-4">
                      Camp runs weekdays only (Mon-Fri). Click AM or PM to select individual sessions. Selected sessions will be highlighted in green.
                    </p>

                    {/* Date Grid — grouped by month */}
                    {(() => {
                      const allSelectedDates = selectedRegistrationMonths.length === 0 ? [] : CAMP_DATES.filter(date => {
                        const d = new Date(date + 'T12:00:00');
                        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                        return selectedRegistrationMonths.includes(monthKey);
                      });

                      // Group dates by month
                      const monthGroups = {};
                      allSelectedDates.forEach(date => {
                        const d = new Date(date + 'T12:00:00');
                        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                        const monthName = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                        if (!monthGroups[monthKey]) monthGroups[monthKey] = { name: monthName, dates: [] };
                        monthGroups[monthKey].dates.push(date);
                      });

                      return Object.entries(monthGroups).map(([monthKey, group]) => (
                        <div key={monthKey} className="mb-6">
                          {selectedRegistrationMonths.length > 1 && (
                            <h4 className="font-bold text-gray-700 mb-2">{group.name}</h4>
                          )}
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                      {group.dates.map(date => {
                          const d = new Date(date + 'T12:00:00');
                          const sel = selectedDates[date] || [];
                          const amBlocked = isSessionBlocked(date, 'morning') || !isSessionAvailableFromGym(date, 'morning');
                          const pmBlocked = isSessionBlocked(date, 'afternoon') || !isSessionAvailableFromGym(date, 'afternoon');
                          const fullyBlocked = amBlocked && pmBlocked;
                          const amSelected = sel.includes('morning');
                          const pmSelected = sel.includes('afternoon');
                          const bothSelected = amSelected && pmSelected;

                          // Check existing registrations for this date
                          const amRegistered = isAlreadyRegistered(date, 'morning');
                          const pmRegistered = isAlreadyRegistered(date, 'afternoon');
                          const bothRegistered = amRegistered && pmRegistered;

                          return (
                            <div key={date} className={`rounded-lg border-2 overflow-hidden ${
                              fullyBlocked ? 'border-gray-200 bg-gray-50' :
                              bothRegistered ? 'border-green-500 bg-green-50' :
                              bothSelected ? 'border-green-300 bg-green-50' :
                              (amSelected || pmSelected) ? 'border-yellow-300 bg-yellow-50' :
                              (amRegistered || pmRegistered) ? 'border-green-300 bg-green-50' :
                              'border-gray-200 bg-white'
                            }`}>
                              <div className={`p-2 text-center bg-gray-100 font-medium ${!fullyBlocked ? 'cursor-pointer hover:bg-gray-200 active:bg-gray-300 transition-colors' : ''}`}
                                onClick={() => { if (!fullyBlocked) toggleBothSessions(date); }}>
                                <div className="text-xs text-gray-500">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri'][d.getDay() - 1]}</div>
                                <div className="text-sm">{d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                              </div>
                              {fullyBlocked ? (
                                <div className="p-2 text-center text-xs text-red-500">🚫 Not Available</div>
                              ) : (
                                <div className="p-2 space-y-1">
                                  {amRegistered ? (
                                    <div className="w-full p-1.5 rounded text-xs bg-green-100 text-green-700 text-center">✓ AM Registered</div>
                                  ) : amBlocked ? (
                                    <div className="p-1.5 rounded text-xs bg-gray-100 text-gray-400 text-center">☀️ AM 🚫</div>
                                  ) : (
                                    <button onClick={() => toggleDate(date, 'morning')} className={`w-full p-1.5 rounded text-xs transition-colors ${amSelected ? 'bg-green-500 text-white' : 'bg-white hover:bg-gray-50 border'}`}>
                                      ☀️ AM {amSelected ? '✓' : ''}
                                    </button>
                                  )}
                                  {pmRegistered ? (
                                    <div className="w-full p-1.5 rounded text-xs bg-green-100 text-green-700 text-center">✓ PM Registered</div>
                                  ) : pmBlocked ? (
                                    <div className="p-1.5 rounded text-xs bg-gray-100 text-gray-400 text-center">🌙 PM 🚫</div>
                                  ) : (
                                    <button onClick={() => toggleDate(date, 'afternoon')} className={`w-full p-1.5 rounded text-xs transition-colors ${pmSelected ? 'bg-green-500 text-white' : 'bg-white hover:bg-gray-50 border'}`}>
                                      🌙 PM {pmSelected ? '✓' : ''}
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                      })}
                          </div>
                        </div>
                      ));
                    })()}
                          </div>

                          {/* Order Summary */}
                          <div className="bg-white rounded-xl border-2 border-gray-200 p-6">
                            <h3 className="font-bold text-lg mb-4">Order Summary</h3>
                    {(() => {
                      const pricing = getPricingBreakdown();
                      const hasSelections = pricing.totalSessions > 0;
                      return hasSelections ? (
                        <div className="space-y-3">
                          <div className="flex justify-between text-gray-600">
                            <span>{pricing.totalSessions} session{pricing.totalSessions !== 1 ? 's' : ''} × ${content.singleSessionCost || 60}</span>
                            <span>${pricing.originalTotal}</span>
                          </div>
                          {selectedChildren.length > 1 && (
                            <div className="text-sm text-gray-500">
                              ({selectedChildren.length} children)
                            </div>
                          )}
                          {pricing.fullWeeks > 0 && (
                            <div className="flex justify-between text-green-600">
                              <span>
                                {pricing.fullWeeks >= 2
                                  ? `🎉 Multi-week discount (${pricing.discountPercent}% off ${pricing.fullWeeks} full weeks)`
                                  : `✓ Full week discount (${pricing.discountPercent}% off)`}
                              </span>
                              <span>-${Math.round(pricing.discount)}</span>
                            </div>
                          )}
                          {pricing.partialSessions > 0 && pricing.fullWeeks > 0 && (
                            <div className="text-sm text-gray-500">
                              + {pricing.partialSessions} additional session{pricing.partialSessions !== 1 ? 's' : ''} at full price
                            </div>
                          )}
                          <div className="border-t pt-3 flex justify-between items-center">
                            <span className="font-bold text-lg">Total</span>
                            <div className="text-right">
                              {pricing.discount > 0 && (
                                <span className="text-gray-400 line-through text-sm mr-2">${pricing.originalTotal}</span>
                              )}
                              <span className="text-2xl font-bold text-green-700">${pricing.finalTotal}</span>
                            </div>
                          </div>
                          {pricing.discount > 0 && (
                            <div className="bg-green-50 text-green-700 text-sm p-2 rounded-lg text-center">
                              You save ${Math.round(pricing.discount)}!
                            </div>
                          )}
                          {pricing.fullWeeks === 0 && pricing.totalSessions >= 5 && (
                            <div className="bg-yellow-50 text-yellow-700 text-sm p-2 rounded-lg">
                              💡 Tip: Book both AM & PM for all 5 days of a week to get {content.weekDiscount || 10}% off!
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-gray-400 text-center py-4">
                          Select sessions above to see pricing
                        </div>
                      );
                    })()}
                            {!selectedChildren.length && Object.values(selectedDates).flat().length > 0 && (
                              <div className="mt-4 p-4 bg-yellow-50 border-2 border-yellow-400 rounded-lg text-center">
                                <span className="text-yellow-700 font-bold text-lg">⚠️ Please select a camper above before registering!</span>
                                <p className="text-yellow-600 text-sm mt-1">Scroll up to "Select Camper(s) to Register" and click on your camper's name.</p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Modal Footer with Action Buttons */}
                        <div className="sticky bottom-0 bg-gray-50 border-t-2 border-gray-200 px-6 py-4 flex gap-3 rounded-b-2xl">
                          <button
                            onClick={closeModalAndDiscard}
                            className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-3 rounded-lg"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={submitRegistrationFromModal}
                            disabled={!selectedChildren.length || !Object.values(selectedDates).flat().length}
                            className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg"
                          >
                            Submit Registration
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

            {showConfirm && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
                  <div className="text-center mb-6">
                    <div className="text-6xl mb-4">🎉</div>
                    <h2 className="font-display text-3xl text-green-800 mb-2">Registration Submitted!</h2>
                    <p className="text-gray-600">Your registration has been sent to the camp director for review</p>
                  </div>

                  {/* Executive Summary */}
                  <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 mb-6">
                    <h3 className="font-bold text-green-800 mb-3 text-lg">📋 Registration Summary</h3>
                    <div className="space-y-2 text-left">
                      <div className="flex justify-between">
                        <span className="text-gray-700">Campers:</span>
                        <span className="font-medium">{showConfirm.children?.join(', ')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">Total Sessions:</span>
                        <span className="font-medium">{showConfirm.sessionCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">Dates:</span>
                        <span className="font-medium">{showConfirm.dates?.length} day(s)</span>
                      </div>
                      {showConfirm.savings > 0 && (
                        <div className="flex justify-between text-green-700 bg-white rounded px-2 py-1">
                          <span>🎉 Bulk Discount:</span>
                          <span className="font-bold">-${showConfirm.savings}</span>
                        </div>
                      )}
                      <div className="flex justify-between pt-2 border-t-2 border-green-300 text-lg">
                        <span className="font-bold text-gray-800">Amount Due:</span>
                        <span className="font-bold text-green-700">${showConfirm.total}</span>
                      </div>
                    </div>
                  </div>

                  {/* Session Details */}
                  <div className="bg-gray-50 rounded-xl p-4 mb-6">
                    <h3 className="font-bold text-gray-800 mb-3">📅 Registered Sessions</h3>
                    <div className="space-y-2 text-sm">
                      {showConfirm.dates?.map(([date, sessions]) => {
                        const d = new Date(date + 'T12:00:00');
                        const dateStr = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                        return (
                          <div key={date} className="flex justify-between items-center bg-white rounded px-3 py-2">
                            <span className="font-medium">{dateStr}</span>
                            <span className="text-gray-600">
                              {sessions.map(s => s === 'morning' ? 'AM' : 'PM').join(' + ')}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Payment Info */}
                  <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 mb-6">
                    <h3 className="font-bold text-blue-800 mb-3 text-lg">💳 Next Step: Payment</h3>
                    {content?.venmoImage && (
                      <div className="text-center mb-4">
                        <img src={content.venmoImage} alt="Venmo QR Code" className="w-48 h-48 mx-auto border-2 border-blue-200 rounded-lg" />
                        <p className="text-xs text-gray-500 mt-1">Scan with Venmo app</p>
                      </div>
                    )}
                    <div className="text-left space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-700">Send payment via Venmo to:</span>
                        <span className="font-bold text-blue-700">{content.venmoUsername}</span>
                      </div>
                      <div className="bg-white rounded-lg p-3 border-2 border-blue-300">
                        <p className="text-sm text-gray-600 mb-1">Include this code in your payment:</p>
                        <p className="font-mono text-2xl font-bold text-blue-700 text-center">{showConfirm.venmoCode}</p>
                      </div>
                    </div>
                  </div>

                  {/* What Happens Next */}
                  <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 mb-6">
                    <h3 className="font-bold text-green-800 mb-3 text-lg">✓ You're Registered!</h3>
                    <ol className="text-left space-y-3 text-sm">
                      <li className="flex gap-3">
                        <span className="font-bold text-green-700 flex-shrink-0">1.</span>
                        <span><strong>Payment:</strong> Send ${showConfirm.total} via Venmo with code <code className="bg-white px-1 rounded">{showConfirm.venmoCode}</code></span>
                      </li>
                      <li className="flex gap-3">
                        <span className="font-bold text-green-700 flex-shrink-0">2.</span>
                        <span><strong>Confirm:</strong> Click "I've Sent Payment" below to mark your registration as paid</span>
                      </li>
                      <li className="flex gap-3">
                        <span className="font-bold text-green-700 flex-shrink-0">3.</span>
                        <span><strong>Track Status:</strong> Check your Payments tab to see payment status</span>
                      </li>
                    </ol>
                  </div>

                  {/* Buttons */}
                  <div className="flex gap-3">
                    <button
                      onClick={async () => {
                        const recentRegs = registrations.filter(r =>
                          r.parentEmail === user?.email &&
                          r.paymentStatus === 'unpaid' &&
                          new Date(r.registeredAt) > new Date(Date.now() - 60000)
                        );
                        for (const reg of recentRegs) {
                          await saveReg({ ...reg, paymentStatus: 'sent', paymentSentAt: new Date().toISOString() });
                        }
                        setShowConfirm(null);
                        setParentTab('payments');
                        showToast('Payment marked as sent!', 'success');
                      }}
                      className="flex-1 bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-700"
                    >
                      I've Sent Payment
                    </button>
                    <button
                      onClick={() => { setShowConfirm(null); setParentTab('payments'); }}
                      className="flex-1 bg-gray-500 text-white font-bold py-3 rounded-lg hover:bg-gray-600"
                    >
                      I'll Pay Later
                    </button>
                  </div>
                </div>
              </div>
            )}
          {/* Top-level photo modals triggered from Dashboard action buttons */}
          {autoOpenPhotoFor && (() => {
            const child = campers.find(c => c.id === autoOpenPhotoFor);
            if (!child) { setAutoOpenPhotoFor(null); return null; }
            return <PhotoUploadModal currentPhoto={child.photo} onSave={(img) => {
              saveCampers(campers.map(c => c.id === autoOpenPhotoFor ? { ...c, photo: img } : c), `Added photo for ${child.name}`);
              setAutoOpenPhotoFor(null);
              showToast(`Photo added for ${child.name}!`);
            }} onCancel={() => setAutoOpenPhotoFor(null)} />;
          })()}
          {autoOpenPhotoForParent && (() => {
            const p = parents.find(p => p.email === autoOpenPhotoForParent);
            if (!p) { setAutoOpenPhotoForParent(null); return null; }
            return <PhotoUploadModal currentPhoto={p.photo} onSave={(img) => {
              saveParents(parents.map(par => par.email === autoOpenPhotoForParent ? { ...par, photo: img } : par));
              setAutoOpenPhotoForParent(null);
              showToast(`Photo added for ${p.name || p.email}!`);
            }} onCancel={() => setAutoOpenPhotoForParent(null)} />;
          })()}
          {/* Top-level EC photo modal triggered from Dashboard */}
          {autoOpenPhotoForEC && (() => {
            const ec = emergencyContacts.find(c => c.id === autoOpenPhotoForEC);
            if (!ec) { setAutoOpenPhotoForEC(null); return null; }
            return <PhotoUploadModal currentPhoto={ec.photo} onSave={async (img) => {
              const updated = emergencyContacts.map(c => c.id === autoOpenPhotoForEC ? { ...c, photo: img } : c);
              await saveEmergencyContacts(updated, `Added photo for emergency contact ${ec.name}`);
              setAutoOpenPhotoForEC(null);
              showToast(`Photo added for ${ec.name}!`);
            }} onCancel={() => setAutoOpenPhotoForEC(null)} />;
          })()}
          {/* Top-level Add Camper modal triggered from Dashboard */}
          {showAddCamperModal && (
            <AddChildForm
              onAdd={(child) => {
                addChild(child);
                setShowAddCamperModal(false);
              }}
              onCancel={() => setShowAddCamperModal(false)}
            />
          )}
          </div>
        );
      };

      // EC Add Modal — standalone component to prevent focus loss from parent re-renders
      const ECAddModal = ({ onSave, onCancel }) => {
        const [name, setName] = useState('');
        const [relationship, setRelationship] = useState('');
        const [phone, setPhone] = useState('');
        const [email, setEmail] = useState('');
        const [photo, setPhoto] = useState(null);
        const [showPhotoModal, setShowPhotoModal] = useState(false);

        const canSubmit = name.trim() && relationship && phone.trim() && email.trim();

        return (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onCancel}>
            <div className="bg-white rounded-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <h4 className="font-medium text-lg mb-4 text-center">Add Emergency Contact</h4>
              {/* Photo Upload */}
              <div className="flex justify-center mb-1">
                {getDisplayPhoto(photo) ? (
                  <div className="relative cursor-pointer" onClick={() => setShowPhotoModal(true)}>
                    <img src={getDisplayPhoto(photo)} className="w-24 h-24 rounded-full object-cover border-2 border-green-500" />
                    <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-green-600 rounded-full text-white flex items-center justify-center text-sm hover:bg-green-700">✎</div>
                  </div>
                ) : (
                  <div onClick={() => setShowPhotoModal(true)}
                    className="w-24 h-24 rounded-full bg-gray-200 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-300">
                    <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                    <span className="text-[9px] text-gray-500 font-medium">add photo</span>
                  </div>
                )}
                {showPhotoModal && <PhotoUploadModal currentPhoto={photo} onSave={(img) => { setPhoto(img); setShowPhotoModal(false); }} onCancel={() => setShowPhotoModal(false)} />}
              </div>
              <p className="text-xs text-gray-500 text-center mb-4">Photo helps identify authorized pickup (optional)</p>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2 border rounded-lg" placeholder="Full name" autoComplete="off" data-1p-ignore="true" data-lpignore="true" data-form-type="other" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Relationship *</label>
                  <select value={relationship} onChange={e => setRelationship(e.target.value)} className="w-full px-3 py-2 border rounded-lg">
                    <option value="">Select relationship</option>
                    <option value="Parent">Parent</option>
                    <option value="Legal Guardian">Legal Guardian</option>
                    <option value="Relative">Relative</option>
                    <option value="Caretaker">Caretaker</option>
                    <option value="Family Friend">Family Friend</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                  <input value={phone} onChange={e => setPhone(formatPhone(e.target.value))} className="w-full px-3 py-2 border rounded-lg" placeholder="(555) 555-1234" autoComplete="off" data-1p-ignore="true" data-lpignore="true" data-form-type="other" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input value={email} onChange={e => setEmail(e.target.value)} className="w-full px-3 py-2 border rounded-lg" placeholder="email@example.com" autoComplete="off" data-1p-ignore="true" data-lpignore="true" data-form-type="other" />
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                <button onClick={onCancel} className="flex-1 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">Cancel</button>
                <button
                  disabled={!canSubmit}
                  className={`flex-1 py-2 rounded-lg font-medium ${!canSubmit ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-green-600 text-white hover:bg-green-700'}`}
                  onClick={() => {
                    if (!isValidPhone(phone)) return;
                    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
                    onSave({ name, relationship, phone, email, photo, priority: 'normal' });
                  }}
                >Add Emergency Contact</button>
              </div>
            </div>
          </div>
        );
      };

      const AddChildForm = ({ onAdd, onCancel }) => {
        const [name, setName] = useState('');
        const [birthYear, setBirthYear] = useState('');
        const [birthMonth, setBirthMonth] = useState('');
        const [birthDay, setBirthDay] = useState('');
        const [grade, setGrade] = useState('');
        const [phone, setPhone] = useState('');
        const [photo, setPhoto] = useState(null);
        const [showPhotoModal, setShowPhotoModal] = useState(false);

        const birthdate = birthYear && birthMonth && birthDay ? `${birthYear}-${birthMonth}-${birthDay}` : '';
        const age = calculateAge(birthdate);

        const handleSubmit = () => {
          if (!name || !birthdate || !grade) return;
          onAdd({ name, birthdate, grade, phone, photo });
          setName(''); setBirthYear(''); setBirthMonth(''); setBirthDay(''); setGrade(''); setPhone(''); setPhoto(null);
        };

        return (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onCancel}>
            <div className="bg-white rounded-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <h4 className="font-medium text-lg mb-4 text-center">Add Camper Profile</h4>

              {/* Photo Upload with add photo placeholder */}
              <div className="flex justify-center mb-1">
                {getDisplayPhoto(photo) ? (
                  <div className="relative cursor-pointer" onClick={() => setShowPhotoModal(true)}>
                    <img src={getDisplayPhoto(photo)} className="w-24 h-24 rounded-full object-cover border-2 border-green-500" />
                    <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-green-600 rounded-full text-white flex items-center justify-center text-sm hover:bg-green-700">✎</div>
                  </div>
                ) : (
                  <div onClick={() => setShowPhotoModal(true)} className="w-24 h-24 rounded-full bg-gray-200 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-300">
                    <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                    <span className="text-[9px] text-gray-500 font-medium">add photo</span>
                  </div>
                )}
                {showPhotoModal && <PhotoUploadModal currentPhoto={photo} onSave={(img) => { setPhoto(img); setShowPhotoModal(false); }} onCancel={() => setShowPhotoModal(false)} />}
              </div>
              <p className="text-xs text-gray-500 text-center mb-4">Photo helps us recognize your child at camp</p>

              <div className="space-y-3">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Camper's Name *</label>
                  <input value={name} onChange={e => setName(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg" placeholder="Full name"
                    autoComplete="off" data-1p-ignore="true" data-lpignore="true" data-form-type="other" />
                </div>

                {/* Birthdate Dropdowns & Calculated Age */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Birthdate *</label>
                  <div className="grid grid-cols-3 gap-2">
                    <select value={birthYear} onChange={e => setBirthYear(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg">
                      <option value="">Year</option>
                      {Array.from({ length: 27 }, (_, i) => 2026 - i).map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                    <select value={birthMonth} onChange={e => setBirthMonth(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg">
                      <option value="">Month</option>
                      {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m, i) => (
                        <option key={m} value={String(i + 1).padStart(2, '0')}>{m}</option>
                      ))}
                    </select>
                    <select value={birthDay} onChange={e => setBirthDay(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg">
                      <option value="">Day</option>
                      {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                        <option key={d} value={String(d).padStart(2, '0')}>{d}</option>
                      ))}
                    </select>
                  </div>
                  {age !== null && (
                    <p className="text-sm text-gray-600 mt-1">{age} years old</p>
                  )}
                </div>

                {/* Grade */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Grade starting Sept 2026 *</label>
                  <select value={grade} onChange={e => setGrade(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg">
                    <option value="">Select grade</option>
                    <option value="3rd">3rd Grade</option>
                    <option value="4th">4th Grade</option>
                    <option value="5th">5th Grade</option>
                    <option value="6th">6th Grade</option>
                    <option value="7th">7th Grade</option>
                    <option value="8th">8th Grade</option>
                  </select>
                </div>

                {/* Phone (optional) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Camper's Phone <span className="text-gray-400">(optional)</span>
                  </label>
                  <input value={phone} onChange={e => setPhone(formatPhone(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg" placeholder="(555) 555-1234"
                    autoComplete="off" data-1p-ignore="true" data-lpignore="true" data-form-type="other" />
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-4 pt-4">
                <button onClick={onCancel} className="flex-1 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">Cancel</button>
                <button onClick={handleSubmit} disabled={!name || !birthdate || !grade}
                  className="flex-1 py-2 bg-green-600 text-white rounded-lg disabled:bg-gray-300 hover:bg-green-700 disabled:hover:bg-gray-300">
                  Add Camper
                </button>
              </div>
            </div>
          </div>
        );
      };

      // ==================== CHILD CARD ====================
      const ChildCard = ({ child, onUpdate, onDelete, emergencyContacts, getEmergencyContactsForCamper, addEmergencyContactToCamper, removeEmergencyContactFromCamper, childParents, onAddEmergencyContact }) => {
        const [isEditing, setIsEditing] = useState(false);
        const [editForm, setEditForm] = useState({ ...child });
        const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
        const [showPhotoModal, setShowPhotoModal] = useState(false);
        const age = calculateAge(child.birthdate);

        // Get emergency contacts for this child
        const childEmergencyContacts = getEmergencyContactsForCamper ? getEmergencyContactsForCamper(child.id) : [];

        const handleSaveEdit = () => {
          if (!editForm.name || !editForm.birthdate || !editForm.grade) return;
          onUpdate({ ...child, ...editForm });
          setIsEditing(false);
        };

        const handleCancelEdit = () => {
          setEditForm({ ...child });
          setIsEditing(false);
        };

        // Delete confirmation dialog
        if (showDeleteConfirm) {
          return (
            <div className="border-2 border-red-300 bg-red-50 rounded-lg p-4">
              <div className="text-center">
                <div className="text-4xl mb-2">⚠️</div>
                <h4 className="font-bold text-red-800 mb-2">Delete {child.name}?</h4>
                <p className="text-sm text-red-600 mb-4">
                  This will permanently remove this child from your account.
                  Any existing registrations will remain in the system.
                </p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => { onDelete(child.id); setShowDeleteConfirm(false); }}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    Yes, Delete
                  </button>
                </div>
              </div>
            </div>
          );
        }

        // Edit mode
        if (isEditing) {
          return (
            <div className="border-2 border-blue-300 bg-blue-50 rounded-lg p-4">
              <h4 className="font-bold text-blue-800 mb-4">Edit Child Details</h4>

              {/* Photo */}
              <div className="flex justify-center mb-4">
                {getDisplayPhoto(editForm.photo) ? (
                  <div className="relative">
                    <img src={getDisplayPhoto(editForm.photo)} className="w-20 h-20 rounded-full object-cover border-2 border-blue-400" />
                    <button onClick={() => setShowPhotoModal(true)}
                      className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-600 rounded-full text-white text-xs flex items-center justify-center">✎</button>
                  </div>
                ) : (
                  <div onClick={() => setShowPhotoModal(true)}
                    className="w-20 h-20 rounded-full bg-gray-200 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-300">
                    <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                    <span className="text-[9px] text-gray-500 font-medium">add photo</span>
                  </div>
                )}
              </div>
              {showPhotoModal && <PhotoUploadModal currentPhoto={editForm.photo} onSave={(img) => { setEditForm({ ...editForm, photo: img }); setShowPhotoModal(false); }} onCancel={() => setShowPhotoModal(false)} />}

              <div className="space-y-3">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input
                    value={editForm.name || ''}
                    onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="Child's name"
                    autoComplete="off"
                    data-1p-ignore="true"
                  />
                </div>

                {/* Birthdate & Age */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Birthdate *</label>
                    <input
                      type="date"
                      value={editForm.birthdate || ''}
                      onChange={e => setEditForm({ ...editForm, birthdate: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                      min={new Date(new Date().getFullYear() - 25, 0, 1).toISOString().split('T')[0]}
                      max={new Date(new Date().getFullYear() - 14, 11, 31).toISOString().split('T')[0]}
                      data-1p-ignore="true"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
                    <div className="w-full px-3 py-2 border rounded-lg bg-gray-100 text-gray-700">
                      {calculateAge(editForm.birthdate) !== null ? `${calculateAge(editForm.birthdate)} years old` : 'Select birthdate'}
                    </div>
                  </div>
                </div>

                {/* Grade */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Grade starting Sept 2026 *</label>
                  <select
                    value={editForm.grade || ''}
                    onChange={e => setEditForm({ ...editForm, grade: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="">Select grade</option>
                    <option value="3rd">3rd Grade</option>
                    <option value="4th">4th Grade</option>
                    <option value="5th">5th Grade</option>
                    <option value="6th">6th Grade</option>
                    <option value="7th">7th Grade</option>
                    <option value="8th">8th Grade</option>
                  </select>
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Child's Phone (optional)</label>
                  <input
                    value={editForm.phone || ''}
                    onChange={e => setEditForm({ ...editForm, phone: formatPhone(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="(555) 555-1234"
                    autoComplete="off"
                    data-1p-ignore="true"
                  />
                </div>

                {/* Emergency Contacts */}
                {getEmergencyContactsForCamper && (
                  <div className="pt-3 border-t mt-4">
                    <h5 className="font-medium text-gray-700 mb-2">Emergency Contacts</h5>
                    <div className="space-y-2 mb-3">
                      {childEmergencyContacts.map(contact => (
                        <div key={contact.id} className="flex items-center justify-between bg-gray-50 rounded p-2 text-sm gap-2">
                          {getDisplayPhoto(contact.photo) ? (
                            <img src={getDisplayPhoto(contact.photo)} className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                              <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <span className="font-medium">{contact.name}</span>
                            <span className="text-xs text-gray-600"> • {[contact.relationship, contact.phone].filter(Boolean).join(' • ')}</span>
                          </div>
                        </div>
                      ))}
                      {childEmergencyContacts.length === 0 && (
                        <p className="text-sm text-gray-500 italic">No emergency contacts yet. Add at least 2.</p>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 italic mb-2">
                      Emergency contacts are shared across all your campers. Manage contacts on the Emergency Contacts tab.
                    </div>
                  </div>
                )}

                {/* Save and Delete Buttons */}
                <div className="pt-3 border-t mt-4">
                  <div className="flex gap-3">
                    <button
                      onClick={handleSaveEdit}
                      disabled={!editForm.name || !editForm.birthdate || !editForm.grade}
                      className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 font-medium"
                    >
                      Save Changes
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="flex-1 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 font-medium"
                    >
                      Delete Child
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        }

        // Normal display mode
        const ecComplete = childEmergencyContacts.length >= 2;

        return (
          <div>
            <div className={`rounded-lg p-4 border-2 relative ${ecComplete ? 'bg-green-50 border-green-500' : 'bg-blue-50 border-blue-400'}`}>
              {/* Edit button top-right */}
              <button
                onClick={() => { setEditForm({ ...child }); setIsEditing(true); }}
                className="absolute top-3 right-3 text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Edit
              </button>
              <div className="flex items-start gap-4">
                {/* Photo with edit button or add photo placeholder */}
                <div className="flex-shrink-0">
                  {getDisplayPhoto(child.photo) ? (
                    <div className="relative">
                      <img src={getDisplayPhoto(child.photo)} className={`w-16 h-16 rounded-full object-cover border-2 ${ecComplete ? 'border-green-500' : 'border-blue-400'}`} />
                      <button onClick={() => setShowPhotoModal(true)}
                        className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full text-white text-xs flex items-center justify-center ${ecComplete ? 'bg-green-600' : 'bg-blue-600'}`}>✎</button>
                    </div>
                  ) : (
                    <div onClick={() => setShowPhotoModal(true)}
                      className="w-16 h-16 rounded-full bg-gray-200 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-300">
                      <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                      <span className="text-[8px] text-gray-500 font-medium">add photo</span>
                    </div>
                  )}
                  {showPhotoModal && <PhotoUploadModal currentPhoto={child.photo} onSave={(img) => { onUpdate({ ...child, photo: img }); setShowPhotoModal(false); }} onCancel={() => setShowPhotoModal(false)} />}
                </div>

                {/* Info */}
                <div className="flex-1 pr-8">
                  <div className="font-bold text-lg">{child.name}</div>
                  <div className="text-sm text-gray-600 space-y-1">
                    {child.grade && <div>Grade: {child.grade}</div>}
                    {child.birthdate && (
                      <div>
                        Birthday: {formatBirthdate(child.birthdate)}
                        {age !== null && <span className="text-green-600 font-medium"> ({age} years old)</span>}
                      </div>
                    )}
                    {child.phone && <div>Phone: {child.phone}</div>}

                    {/* Parents */}
                    {(childParents || []).length > 0 && (
                      <div className={`mt-2 pt-2 border-t ${ecComplete ? 'border-green-300' : 'border-blue-300'}`}>
                        <div className="font-medium text-gray-700 mb-1">Parents:</div>
                        {childParents.map(parent => (
                          <div key={parent.email} className={`text-xs rounded p-2 mb-1 flex items-center gap-2 ${ecComplete ? 'bg-green-100' : 'bg-blue-100'}`}>
                            {getDisplayPhoto(parent.photo) ? (
                              <img src={getDisplayPhoto(parent.photo)} className="w-6 h-6 rounded-full object-cover" />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                                <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                              </div>
                            )}
                            <div>
                              <span className="font-medium">{parent.name}</span>
                              {parent.phone && <span className="text-gray-500"> • {parent.phone}</span>}
                              {parent.email && !parent.email.startsWith('nologin_') && <span className="text-gray-500"> • {parent.email}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Emergency Contacts */}
                    <div className={`mt-2 pt-2 border-t ${ecComplete ? 'border-green-300' : 'border-blue-300'}`}>
                      <div className="font-medium text-gray-700 mb-1">Emergency Contacts:</div>
                      {childEmergencyContacts.length > 0 ? (
                        childEmergencyContacts.map(contact => (
                          <div key={contact.id} className={`text-xs rounded p-2 mb-1 flex items-center gap-2 ${ecComplete ? 'bg-green-100' : 'bg-blue-100'}`}>
                            {getDisplayPhoto(contact.photo) ? (
                              <img src={getDisplayPhoto(contact.photo)} className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                                <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <span className="font-medium">{contact.name}</span>
                              {(contact.isParent || contact.isAutoCreated) && <span className="text-gray-400 italic"> (Parent)</span>}
                              <span className="text-gray-500"> • {[contact.relationship !== 'Parent' ? contact.relationship : null, contact.phone, contact.email?.startsWith('nologin_') ? null : contact.email].filter(Boolean).join(' • ')}</span>
                            </div>
                          </div>
                        ))
                      ) : null}
                      {!ecComplete && (
                        <div className="text-xs text-red-600 font-medium bg-red-50 rounded p-2 mt-1 flex items-center justify-between gap-2">
                          <span>{childEmergencyContacts.length === 0
                            ? `Add at least 2 emergency contacts for ${child.name}`
                            : `Add ${2 - childEmergencyContacts.length} more emergency contact${2 - childEmergencyContacts.length > 1 ? 's' : ''} for ${child.name}`}</span>
                          {onAddEmergencyContact && (
                            <button
                              onClick={onAddEmergencyContact}
                              className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs font-medium whitespace-nowrap flex-shrink-0"
                            >
                              Add Emergency Contact
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      };

      // ==================== COUNSELOR ====================
    // ==================== CHILDREN MANAGER (Parent Dashboard) ====================
    const ChildrenManager = ({ children, onUpdate, onDelete, onAdd, registrations, emergencyContacts, getEmergencyContactsForCamper, addEmergencyContactToCamper, removeEmergencyContactFromCamper, parents, camperParentLinks, onAddEmergencyContact }) => {
      const [showAddForm, setShowAddForm] = useState(false);

      // Check if child has any registrations (is a camper)
      const isCamper = (childId) => registrations?.some(r => r.childId === childId);

      return (
        <div className="space-y-6">
          {/* Green + Add Child button at top */}
          <div className="text-center">
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-8 rounded-xl text-lg shadow-lg flex items-center gap-3 mx-auto"
            >
              <span className="text-2xl">➕</span>
              <span>Add Camper</span>
            </button>
          </div>
          {showAddForm && (
            <AddChildForm
              onAdd={(child) => {
                onAdd(child);
                setShowAddForm(false);
              }}
              onCancel={() => setShowAddForm(false)}
            />
          )}

          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="font-bold text-lg mb-2">Campers</h3>
            <div className="space-y-4">
              {children.map(child => {
                const childParentEmails = (camperParentLinks || []).filter(l => l.camperId === child.id).map(l => l.parentEmail);
                const childParents = (parents || []).filter(p => childParentEmails.includes(p.email));
                return (
                  <ChildCard
                    key={child.id}
                    child={child}
                    onUpdate={onUpdate}
                    onDelete={onDelete}
                    emergencyContacts={emergencyContacts}
                    getEmergencyContactsForCamper={getEmergencyContactsForCamper}
                    addEmergencyContactToCamper={addEmergencyContactToCamper}
                    removeEmergencyContactFromCamper={removeEmergencyContactFromCamper}
                    childParents={childParents}
                    onAddEmergencyContact={onAddEmergencyContact}
                  />
                );
              })}
            </div>
          </div>
        </div>
      );
    };

    // ==================== PARENT EMERGENCY CONTACTS MANAGER ====================
    const ParentEmergencyContactsManager = ({ parentEmail, emergencyContacts, onSave, showToast, parents, saveParents, addParentToFamily, myChildren, currentUser, addToHistory, autoOpenAddEC, onAutoOpenDone, onCloseAddForm, onRequestAddForm }) => {
      const [localContacts, setLocalContacts] = useState([]);
      const [editingId, setEditingId] = useState(null);
      const [showAddForm, setShowAddForm] = useState(autoOpenAddEC || false);
      const [editForm, setEditForm] = useState({ name: '', relationship: '', phone: '', email: '', priority: 'normal', photo: null });
      const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
      const [showAddPhotoModal, setShowAddPhotoModal] = useState(false);
      const [showEditPhotoModal, setShowEditPhotoModal] = useState(false);
      const [editingPhotoContactId, setEditingPhotoContactId] = useState(null);

      // Auto-open add form when triggered from Campers tab or Dashboard
      useEffect(() => {
        if (autoOpenAddEC) {
          if (onRequestAddForm) {
            onRequestAddForm();
          } else {
            setShowAddForm(true);
          }
          onAutoOpenDone?.();
        }
      }, [autoOpenAddEC]);

      // Resolve parent-reference emergency contacts (pulls name/phone/photo from camp_parents)
      const resolveEmergencyContact = (contact) => {
        if (contact.isParent && contact.parentEmail) {
          const parent = (parents || []).find(p => p.email === contact.parentEmail);
          if (parent) return { ...contact, name: parent.name, phone: parent.phone, photo: parent.photo, email: parent.email };
        }
        if (contact.isAutoCreated && (contact.sourceEmail || contact.parentEmail)) {
          const parent = (parents || []).find(p => p.email === (contact.sourceEmail || contact.parentEmail));
          if (parent) return { ...contact, name: parent.name, phone: parent.phone, photo: parent.photo, email: parent.email };
        }
        return contact;
      };
      const [hasChanges, setHasChanges] = useState(false);
      const [invitePrompt, setInvitePrompt] = useState(null);
      const [inviteForm, setInviteForm] = useState({ email: '', password: '' });
      const [inviteError, setInviteError] = useState('');
      const [inviteSuccess, setInviteSuccess] = useState(null);
      const [showInvitePassword, setShowInvitePassword] = useState(false);

      // Initialize local contacts from props (resolve parent references)
      useEffect(() => {
        const myContacts = emergencyContacts.filter(c => c.userEmail === parentEmail).map(resolveEmergencyContact);
        setLocalContacts(myContacts);
      }, [emergencyContacts, parentEmail]);

      // Check if requirements are met
      const meetsRequirements = () => {
        return localContacts.length >= 2;
      };

      const handleEdit = (contact) => {
        setEditingId(contact.id);
        setEditForm({
          name: contact.name,
          relationship: contact.relationship,
          phone: contact.phone,
          email: contact.email || '',
          priority: contact.priority || 'normal',
          photo: contact.photo || null
        });
      };

      const handleSaveEdit = () => {
        if (!editForm.name || !editForm.relationship || !editForm.phone || !editForm.email) {
          showToast('Please fill in all required fields (name, relationship, phone, email)', 'error');
          return;
        }
        if (!isValidPhone(editForm.phone)) {
          showToast('Please enter a valid 10-digit phone number', 'error');
          return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editForm.email)) {
          showToast('Please enter a valid email address', 'error');
          return;
        }
        const updatedContacts = localContacts.map(c =>
          c.id === editingId ? { ...c, ...editForm } : c
        );
        setLocalContacts(updatedContacts);
        setEditingId(null);
        setEditForm({ name: '', relationship: '', phone: '', email: '', priority: 'normal', photo: null });
        saveContactsToDb(updatedContacts);
        showToast('Emergency contact updated', 'success');
      };

      const handleDelete = (id) => {
        const updatedContacts = localContacts.filter(c => c.id !== id);
        setLocalContacts(updatedContacts);
        setEditingId(null);
        setShowDeleteConfirm(null);
        setEditForm({ name: '', relationship: '', phone: '', email: '', priority: 'normal', photo: null });
        saveContactsToDb(updatedContacts);
        showToast('Emergency contact deleted', 'success');
      };

      // Helper: save contacts to DB immediately
      const saveContactsToDb = (updatedLocalContacts) => {
        const otherContacts = emergencyContacts.filter(c => c.userEmail !== parentEmail);
        const allContacts = [...otherContacts, ...updatedLocalContacts];
        onSave(allContacts);
      };

      const handleAdd = () => {
        if (!editForm.name || !editForm.relationship || !editForm.phone || !editForm.email) {
          showToast('Please fill in all required fields (name, relationship, phone, email)', 'error');
          return;
        }
        if (!isValidPhone(editForm.phone)) {
          showToast('Please enter a valid 10-digit phone number', 'error');
          return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editForm.email)) {
          showToast('Please enter a valid email address', 'error');
          return;
        }
        const newContact = {
          id: `ec_${Date.now()}`,
          userEmail: parentEmail,
          ...editForm
        };
        const updatedContacts = [...localContacts, newContact];
        setLocalContacts(updatedContacts);
        setShowAddForm(false);
        const addedName = editForm.name;
        const addedPhone = editForm.phone;
        const addedEmail = editForm.email || '';
        setEditForm({ name: '', relationship: '', phone: '', email: '', priority: 'normal', photo: null });
        // Auto-save to DB immediately
        saveContactsToDb(updatedContacts);
        showToast(`Added ${addedName} as emergency contact`, 'success');
        onCloseAddForm?.();
        // Show invite prompt only if relationship is Parent and addParentToFamily is available
        if (addParentToFamily && editForm.relationship === 'Parent') {
          setInviteForm({ email: addedEmail, password: '' });
          setInviteError('');
          setInvitePrompt({ name: addedName, phone: addedPhone });
        }
      };

      const handleInviteSubmit = async () => {
        if (!inviteForm.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteForm.email)) {
          setInviteError('Please enter a valid email address');
          return;
        }
        if (!inviteForm.password || inviteForm.password.length < 4) {
          setInviteError('Password must be at least 4 characters');
          return;
        }
        if ((parents || []).find(p => p.email.toLowerCase() === inviteForm.email.toLowerCase())) {
          setInviteError('A parent with this email already exists');
          return;
        }
        try {
          const newParent = await addParentToFamily(
            { name: invitePrompt.name, phone: invitePrompt.phone, email: inviteForm.email, password: inviteForm.password },
            myChildren,
            currentUser
          );
          // Convert the EC record to a parent-reference so it stays in sync with the parent's profile
          setLocalContacts(prev => prev.map(c => {
            if (c.name?.toLowerCase() === invitePrompt.name.toLowerCase() && !c.isParent && !c.isAutoCreated) {
              return { ...c, isParent: true, parentEmail: newParent.email };
            }
            return c;
          }));
          setHasChanges(true);
          if (addToHistory) {
            addToHistory('Parent Invited', `Invited ${newParent.name} (${newParent.email}) as a parent via emergency contact`, [newParent.email]);
          }
          setInviteSuccess(newParent);
          setInvitePrompt(null);
        } catch (error) {
          console.error('Error creating parent login:', error);
          setInviteError('Error creating login. Please try again.');
        }
      };

      const handleSaveChanges = () => {
        if (!meetsRequirements()) {
          showToast('You must have at least 2 emergency contacts', 'error');
          return;
        }
        // Merge local contacts with other users' contacts
        const otherContacts = emergencyContacts.filter(c => c.userEmail !== parentEmail);
        const allContacts = [...otherContacts, ...localContacts];
        onSave(allContacts);
        setHasChanges(false);
      };


      const handleCancel = () => {
        const myContacts = emergencyContacts.filter(c => c.userEmail === parentEmail).map(resolveEmergencyContact);
        setLocalContacts(myContacts);
        setHasChanges(false);
        setEditingId(null);
        setShowAddForm(false);
        setShowDeleteConfirm(null);
        setShowAddPhotoModal(false);
        setShowEditPhotoModal(false);
      };

      const requirementsMet = meetsRequirements();

      // Show delete confirmation
      if (showDeleteConfirm) {
        const contactToDelete = localContacts.find(c => c.id === showDeleteConfirm);
        return (
          <div className="border-2 border-red-300 bg-red-50 rounded-lg p-4">
            <div className="text-center">
              <div className="text-4xl mb-2">&#9888;&#65039;</div>
              <h4 className="font-bold text-red-800 mb-2">Delete {contactToDelete?.name || 'this contact'}?</h4>
              <p className="text-sm text-red-600 mb-4">
                This will permanently remove this emergency contact. You still need at least 2 contacts.
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(showDeleteConfirm)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Yes, Delete
                </button>
              </div>
            </div>
          </div>
        );
      }

      return (
        <div className="space-y-6">
          {/* New Emergency Contact Button - always visible */}
          <div className="text-center">
            <button
              onClick={() => onRequestAddForm ? onRequestAddForm() : setShowAddForm(true)}
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-8 rounded-xl text-lg shadow-lg flex items-center gap-3 mx-auto"
            >
              <span className="text-2xl">➕</span>
              <span>Add Emergency Contact</span>
            </button>
          </div>

          {/* Add New Contact Modal */}
          {showAddForm && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => { setShowAddForm(false); setEditForm({ name: '', relationship: '', phone: '', email: '', priority: 'normal', photo: null }); onCloseAddForm?.(); }}>
              <div className="bg-white rounded-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <h4 className="font-medium text-lg mb-4 text-center">Add Emergency Contact</h4>
                {/* Photo Upload */}
                <div className="flex justify-center mb-1">
                  {getDisplayPhoto(editForm.photo) ? (
                    <div className="relative cursor-pointer" onClick={() => setShowAddPhotoModal(true)}>
                      <img src={getDisplayPhoto(editForm.photo)} className="w-24 h-24 rounded-full object-cover border-2 border-green-500" />
                      <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-green-600 rounded-full text-white flex items-center justify-center text-sm hover:bg-green-700">✎</div>
                    </div>
                  ) : (
                    <div onClick={() => setShowAddPhotoModal(true)}
                      className="w-24 h-24 rounded-full bg-gray-200 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-300">
                      <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                      <span className="text-[9px] text-gray-500 font-medium">add photo</span>
                    </div>
                  )}
                  {showAddPhotoModal && <PhotoUploadModal currentPhoto={editForm.photo} onSave={(img) => { setEditForm({ ...editForm, photo: img }); setShowAddPhotoModal(false); }} onCancel={() => setShowAddPhotoModal(false)} />}
                </div>
                <p className="text-xs text-gray-500 text-center mb-4">Photo helps identify authorized pickup (optional)</p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                    <input
                      value={editForm.name}
                      onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="Full name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Relationship *</label>
                    <select
                      value={editForm.relationship}
                      onChange={e => setEditForm({ ...editForm, relationship: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="">Select relationship</option>
                      <option value="Parent">Parent</option>
                      <option value="Legal Guardian">Legal Guardian</option>
                      <option value="Relative">Relative</option>
                      <option value="Caretaker">Caretaker</option>
                      <option value="Family Friend">Family Friend</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                    <input
                      value={editForm.phone}
                      onChange={e => setEditForm({ ...editForm, phone: formatPhone(e.target.value) })}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="(555) 555-1234"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                    <input
                      value={editForm.email}
                      onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="email@example.com"
                    />
                  </div>
                </div>
                <div className="flex gap-4 pt-4">
                  <button
                    onClick={() => { setShowAddForm(false); setEditForm({ name: '', relationship: '', phone: '', email: '', priority: 'normal', photo: null }); onCloseAddForm?.(); }}
                    className="flex-1 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAdd}
                    disabled={!editForm.name.trim() || !editForm.relationship || !editForm.phone.trim() || !editForm.email.trim()}
                    className={`flex-1 py-2 rounded-lg font-medium ${!editForm.name.trim() || !editForm.relationship || !editForm.phone.trim() || !editForm.email.trim() ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-green-600 text-white hover:bg-green-700'}`}
                  >
                    Add Contact
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Contact List */}
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="font-bold text-lg mb-2">Emergency Contacts</h3>
            {localContacts.length < 2 ? (
              <p className="text-sm text-red-600 mb-4 bg-red-50 rounded-lg p-3">
                <strong>⚠️ Warning:</strong> You need at least 2 emergency contacts. Currently have {localContacts.length}.
              </p>
            ) : (
              <p className="text-sm text-green-600 mb-4 bg-green-50 rounded-lg p-3">
                <strong>✓</strong> You have {localContacts.length} emergency contacts — minimum of 2 met.
              </p>
            )}
          {/* Blue placeholder boxes for missing contacts */}
          {localContacts.length < 2 && (
            <div className="space-y-2 mb-4">
              {Array.from({ length: 2 - localContacts.length }).map((_, idx) => (
                <div key={`placeholder-${idx}`}
                  onClick={() => setShowAddForm(true)}
                  className="bg-blue-50 rounded-lg p-4 border-2 border-blue-300 border-dashed flex items-center gap-4 cursor-pointer hover:bg-blue-100 transition-colors">
                  <div className="w-16 h-16 rounded-full bg-blue-100 flex flex-col items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                  </div>
                  <div>
                    <div className="font-medium text-blue-700">Emergency Contact #{localContacts.length + idx + 1} Needed</div>
                    <div className="text-sm text-blue-500">Tap to add an emergency contact</div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {localContacts.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No emergency contacts yet. Add at least 2 contacts.</p>
          ) : (
            <div className="space-y-2">
              {localContacts.map(contact => (
                <div key={contact.id}>
                  {editingId === contact.id ? (
                    /* Edit Form */
                    <div className="border-2 border-blue-300 bg-blue-50 rounded-lg p-4">
                      <h4 className="font-bold text-blue-800 mb-4">Edit Emergency Contact</h4>
                      {/* Photo Upload */}
                      <div className="flex justify-center mb-4">
                        {getDisplayPhoto(editForm.photo) ? (
                          <div className="relative">
                            <img src={getDisplayPhoto(editForm.photo)} className="w-20 h-20 rounded-full object-cover border-2 border-blue-400" />
                            <button onClick={() => setShowEditPhotoModal(true)}
                              className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-600 rounded-full text-white text-xs flex items-center justify-center hover:bg-blue-700">{'\u270E'}</button>
                          </div>
                        ) : (
                          <div onClick={() => setShowEditPhotoModal(true)}
                            className="w-20 h-20 rounded-full bg-gray-200 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-300">
                            <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                            <span className="text-[9px] text-gray-500 font-medium">add photo</span>
                          </div>
                        )}
                      </div>
                      {showEditPhotoModal && <PhotoUploadModal currentPhoto={editForm.photo} onSave={(img) => { setEditForm({ ...editForm, photo: img }); setShowEditPhotoModal(false); }} onCancel={() => setShowEditPhotoModal(false)} />}
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                          <input
                            value={editForm.name}
                            onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Relationship *</label>
                          <select
                            value={editForm.relationship}
                            onChange={e => setEditForm({ ...editForm, relationship: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg"
                          >
                            <option value="">Select relationship</option>
                            <option value="Parent">Parent</option>
                            <option value="Legal Guardian">Legal Guardian</option>
                            <option value="Relative">Relative</option>
                            <option value="Caretaker">Caretaker</option>
                            <option value="Family Friend">Family Friend</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                          <input
                            value={editForm.phone}
                            onChange={e => setEditForm({ ...editForm, phone: formatPhone(e.target.value) })}
                            className="w-full px-3 py-2 border rounded-lg"
                            placeholder="(555) 555-1234"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                          <input
                            value={editForm.email}
                            onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg"
                            placeholder="contact@email.com"
                          />
                        </div>
                        {/* Save and Delete Buttons */}
                        <div className="flex gap-3">
                          <button
                            onClick={handleSaveEdit}
                            className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                          >
                            Save Changes
                          </button>
                          <button
                            onClick={() => setShowDeleteConfirm(contact.id)}
                            className="flex-1 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 font-medium"
                          >
                            Delete Contact
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* List View Card */
                    <div>
                      <div className="bg-green-50 rounded-lg p-4 border-2 border-green-500 relative">
                        {/* Edit button top-right (only for non-parent contacts) */}
                        {!contact.isParent && !contact.isAutoCreated && (
                          <button
                            onClick={() => handleEdit(contact)}
                            className="absolute top-3 right-3 text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            Edit
                          </button>
                        )}
                        <div className="flex items-start gap-4">
                          {/* Circular Photo or Placeholder - clickable to add/edit photo */}
                          <div className="flex-shrink-0">
                            {getDisplayPhoto(contact.photo) ? (
                              <div className="relative cursor-pointer" onClick={() => { setEditingPhotoContactId(contact.id); setShowEditPhotoModal(true); }}>
                                <img src={getDisplayPhoto(contact.photo)} className="w-16 h-16 rounded-full object-cover border-2 border-green-500 hover:opacity-80 transition-opacity" />
                                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-600 rounded-full text-white text-xs flex items-center justify-center">✎</div>
                              </div>
                            ) : (
                              <div onClick={() => { setEditingPhotoContactId(contact.id); setShowEditPhotoModal(true); }} className="w-16 h-16 rounded-full bg-gray-200 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-300">
                                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                                <span className="text-[8px] text-gray-500 font-medium">add photo</span>
                              </div>
                            )}
                          </div>
                          {/* Info */}
                          <div className="flex-1 pr-8">
                            <div className="font-bold text-lg">
                              {contact.name}
                            </div>
                            <div className="text-sm text-gray-600">
                              {[contact.relationship, contact.phone, contact.email?.startsWith('nologin_') ? null : contact.email].filter(Boolean).join(' • ')}
                            </div>
                            {(contact.isParent || contact.isAutoCreated) && (
                              <div className="text-xs text-gray-400 italic mt-1">Managed in Parents tab</div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Photo Upload Modal for EC list view photos */}
          {editingPhotoContactId && showEditPhotoModal && (() => {
            const contact = localContacts.find(c => c.id === editingPhotoContactId);
            return (
              <PhotoUploadModal
                currentPhoto={contact?.photo}
                onSave={(img) => {
                  const updatedContacts = localContacts.map(c => c.id === editingPhotoContactId ? { ...c, photo: img } : c);
                  setLocalContacts(updatedContacts);
                  saveContactsToDb(updatedContacts);
                  // Sync photo to parent record if this EC is a parent
                  if (contact && (contact.isParent || contact.isAutoCreated)) {
                    const pEmail = contact.parentEmail || contact.sourceEmail;
                    if (pEmail && saveParents) {
                      const updatedParents = (parents || []).map(p => p.email === pEmail ? { ...p, photo: img } : p);
                      saveParents(updatedParents, `Synced photo from EC: ${contact.name}`);
                    }
                  }
                  setEditingPhotoContactId(null);
                  setShowEditPhotoModal(false);
                  showToast('Photo updated', 'success');
                }}
                onCancel={() => { setEditingPhotoContactId(null); setShowEditPhotoModal(false); }}
              />
            );
          })()}

          {/* Changes are auto-saved */}
          </div>

          {/* Invite as Parent Modal */}
          {invitePrompt && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
                <h3 className="font-bold text-lg text-green-800 mb-2">Create Login for {invitePrompt.name}?</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Would you like to give <strong>{invitePrompt.name}</strong> their own login so they can view camp details, manage registrations, and see your campers' information?
                </p>
                <div className="space-y-3 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                    <input
                      value={inviteForm.email}
                      onChange={e => { setInviteForm({ ...inviteForm, email: e.target.value }); setInviteError(''); }}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="their@email.com"
                      autoComplete="off" data-1p-ignore="true"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                    <div className="relative">
                      <input
                        type={showInvitePassword ? 'text' : 'password'}
                        value={inviteForm.password}
                        onChange={e => { setInviteForm({ ...inviteForm, password: e.target.value }); setInviteError(''); }}
                        className="w-full px-3 py-2 border rounded-lg pr-16"
                        placeholder="At least 4 characters"
                        autoComplete="off" data-1p-ignore="true"
                      />
                      <button type="button" onClick={() => setShowInvitePassword(!showInvitePassword)} className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 hover:text-gray-700">
                        {showInvitePassword ? 'Hide' : 'Show'}
                      </button>
                    </div>
                  </div>
                  {inviteError && <p className="text-red-600 text-sm">{inviteError}</p>}
                </div>
                <div className="flex gap-2">
                  <button onClick={handleInviteSubmit} className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium">
                    Create Login
                  </button>
                  <button onClick={async () => {
                    // Create parent record without login credentials
                    const noLoginId = `nologin_${Date.now()}`;
                    const noLoginParent = {
                      email: noLoginId,
                      name: invitePrompt.name,
                      phone: invitePrompt.phone,
                      photo: null,
                      role: 'parent',
                      roles: ['parent'],
                      noLogin: true,
                      createdBy: currentUser?.email,
                      createdAt: new Date().toISOString()
                    };
                    const updatedParents = [...(parents || []), noLoginParent];
                    if (saveParents) await saveParents(updatedParents, `Added ${invitePrompt.name} as parent (no login)`);
                    // Link to campers
                    if (myChildren?.length > 0) {
                      const newLinks = myChildren.map(child => ({ camperId: child.id, parentEmail: noLoginId }));
                      const cplData = await storage.get('camp_camper_parent_links');
                      const currentLinks = cplData?.[0]?.data || [];
                      await storage.set('camp_camper_parent_links', 'main', [...currentLinks, ...newLinks]);
                    }
                    // Mark EC as parent reference
                    setLocalContacts(prev => prev.map(c => {
                      if (c.name?.toLowerCase() === invitePrompt.name.toLowerCase() && !c.isParent && !c.isAutoCreated) {
                        return { ...c, isParent: true, parentEmail: noLoginId };
                      }
                      return c;
                    }));
                    setHasChanges(true);
                    if (addToHistory) addToHistory('Parent Added (No Login)', `Added ${invitePrompt.name} as a parent without login credentials`);
                    showToast(`${invitePrompt.name} added as a parent`, 'success');
                    setInvitePrompt(null);
                    setInviteError('');
                  }} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">
                    Skip Login
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Invite Success Modal */}
          {inviteSuccess && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
                <div className="text-center mb-4">
                  <div className="text-4xl mb-2">🎉</div>
                  <h3 className="font-bold text-lg text-green-800">Login Created!</h3>
                </div>
                <p className="text-sm text-gray-600 mb-4 text-center">
                  Share these credentials with <strong>{inviteSuccess.name}</strong> so they can log in:
                </p>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2 mb-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Email:</span>
                    <span className="font-medium">{inviteSuccess.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Password:</span>
                    <span className="font-medium">{inviteSuccess.password}</span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 text-center mb-4">
                  They will have full access to view camp details and manage registrations for your campers.
                </p>
                <button onClick={() => setInviteSuccess(null)} className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium">
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      );
    };

    // ==================== ADD PARENT FORM ====================
    const AddParentForm = ({ onAdd, onCancel }) => {
      const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        password: '',
        photo: null
      });
      const [showPassword, setShowPassword] = useState(false);
      const [error, setError] = useState('');
      const [showPhotoUpload, setShowPhotoUpload] = useState(false);

      const handleSubmit = () => {
        // Validation
        if (!formData.name || !formData.email || !formData.phone || !formData.password) {
          setError('Name, email, phone, and password are required');
          return;
        }

        // Email validation
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
          setError('Please enter a valid email');
          return;
        }

        // Phone validation
        const cleanPhone = formData.phone.replace(/\D/g, '');
        if (cleanPhone.length !== 10) {
          setError('Phone must be 10 digits');
          return;
        }

        onAdd(formData);
      };

      const formatPhone = (value) => {
        const cleaned = value.replace(/\D/g, '');
        const match = cleaned.match(/^(\d{0,3})(\d{0,3})(\d{0,4})$/);
        if (!match) return value;
        return [match[1], match[2], match[3]].filter(Boolean).join('-');
      };

      return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onCancel}>
          <div className="bg-white rounded-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h4 className="font-medium text-lg mb-4 text-center">Add Another Parent</h4>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                {error}
              </div>
            )}

            {/* Photo Upload */}
            <div className="flex justify-center mb-4">
              {getDisplayPhoto(formData.photo) ? (
                <div className="relative cursor-pointer" onClick={() => setShowPhotoUpload(true)}>
                  <img src={getDisplayPhoto(formData.photo)} className="w-24 h-24 rounded-full object-cover border-2 border-green-500" />
                  <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-green-600 rounded-full text-white flex items-center justify-center text-sm hover:bg-green-700">✎</div>
                </div>
              ) : (
                <div onClick={() => setShowPhotoUpload(true)} className="w-24 h-24 rounded-full bg-gray-200 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-300">
                  <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                  <span className="text-[9px] text-gray-500 font-medium">add photo</span>
                </div>
              )}
              {showPhotoUpload && <PhotoUploadModal currentPhoto={formData.photo} onSave={(photo) => { setFormData({ ...formData, photo }); setShowPhotoUpload(false); }} onCancel={() => setShowPhotoUpload(false)} />}
            </div>
            <p className="text-xs text-gray-500 text-center mb-4">Photo helps identify authorized pickup (optional)</p>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Full name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="parent@email.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: formatPhone(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="(555) 555-1234"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg pr-10"
                    placeholder="Create a password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button
                onClick={handleSubmit}
                className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700"
              >
                Add Parent
              </button>
              {onCancel && (
                <button
                  onClick={onCancel}
                  className="px-4 bg-gray-200 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>
      );
    };

    // ==================== FAMILY ACCESS MANAGER ====================
    const FamilyAccessManager = ({
      myChildren,
      parents,
      saveParents,
      camperParentLinks,
      saveCamperParentLinks,
      emergencyContacts,
      saveEmergencyContacts,
      camperEmergencyContactLinks,
      saveCamperEmergencyContactLinks,
      currentUserEmail,
      showToast,
      addParentToFamily,
      removeParentAccess,
      getOtherParentsForMyFamily
    }) => {
      const [showAddForm, setShowAddForm] = useState(false);
      const [successModal, setSuccessModal] = useState(null);
      const [editingParent, setEditingParent] = useState(null);
      const [editForm, setEditForm] = useState({ name: '', phone: '', photo: null });
      const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
      const [showEditPhotoModal, setShowEditPhotoModal] = useState(false);
      const [photoParentEmail, setPhotoParentEmail] = useState(null);

      const otherParents = getOtherParentsForMyFamily(myChildren, camperParentLinks, parents, currentUserEmail);
      const currentUser = parents.find(p => p.email === currentUserEmail);
      const allFamilyMembers = currentUser ? [currentUser, ...otherParents] : otherParents;

      const formatPhoneLocal = (value) => {
        const cleaned = value.replace(/\D/g, '');
        const match = cleaned.match(/^(\d{0,3})(\d{0,3})(\d{0,4})$/);
        if (!match) return value;
        return [match[1], match[2], match[3]].filter(Boolean).join('-');
      };

      const handleAddParent = async (parentData) => {
        try {
          // Check if email already exists
          const existingParent = parents.find(p => p.email === parentData.email);
          if (existingParent) {
            showToast('A user with this email already exists');
            return;
          }

          const newParent = await addParentToFamily(parentData, myChildren, { email: currentUserEmail });
          setShowAddForm(false);
          setSuccessModal(newParent);
          showToast(`${newParent.name} added to family!`);
        } catch (error) {
          console.error('Error adding parent:', error);
          showToast('Error adding parent. Please try again.');
        }
      };

      const handleEditParent = (parent) => {
        setEditForm({ name: parent.name || '', phone: parent.phone || '', photo: parent.photo || null });
        setEditingParent(parent);
        setShowRemoveConfirm(false);
      };

      const handleSaveEdit = async () => {
        if (!editForm.name) return;
        const updatedParents = parents.map(p =>
          p.email === editingParent.email
            ? { ...p, name: editForm.name, phone: editForm.phone, photo: editForm.photo }
            : p
        );
        await saveParents(updatedParents, `Updated parent: ${editForm.name}`);
        showToast(`${editForm.name} updated successfully`);
        setEditingParent(null);
      };

      const handleCancelEdit = () => {
        setEditingParent(null);
        setEditForm({ name: '', phone: '', photo: null });
        setShowRemoveConfirm(false);
        setShowEditPhotoModal(false);
      };

      const handleRemoveParent = async () => {
        await removeParentAccess(editingParent.email, myChildren);
        setEditingParent(null);
        setShowRemoveConfirm(false);
      };


      return (
        <div className="space-y-6">
          {/* Add Parent Button */}
          <div className="text-center">
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-8 rounded-xl text-lg shadow-lg flex items-center gap-3 mx-auto"
            >
              <span className="text-2xl">➕</span>
              <span>Add Parent</span>
            </button>
          </div>

          {/* Add Parent Modal */}
          {showAddForm && (
            <AddParentForm
              onAdd={handleAddParent}
              onCancel={() => setShowAddForm(false)}
            />
          )}

          {/* Family Members List */}
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="font-bold text-lg mb-2">Family Access</h3>

            {allFamilyMembers.length > 0 ? (
              <div className="space-y-3">
                {allFamilyMembers.map(parent => {
                  const isCurrentUser = parent.email === currentUserEmail;
                  return (
                    <div key={parent.email}>
                      <div className="bg-green-50 rounded-lg p-4 border-2 border-green-500 relative">
                        {/* Edit button top-right */}
                        <button
                          onClick={() => handleEditParent(parent)}
                          className="absolute top-3 right-3 text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          Edit
                        </button>
                        <div className="flex items-center gap-3">
                          {getDisplayPhoto(parent.photo) ? (
                            <img src={getDisplayPhoto(parent.photo)} alt={parent.name} className="w-16 h-16 rounded-full object-cover border-2 border-green-500" />
                          ) : (
                            <div onClick={() => setPhotoParentEmail(parent.email)} className="w-16 h-16 rounded-full bg-gray-200 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-300">
                              <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                              <span className="text-[8px] text-gray-500 font-medium">add photo</span>
                            </div>
                          )}
                          <div className="pr-8">
                            <div className="font-medium">
                              {parent.name}
                              {isCurrentUser && <span className="ml-2 text-xs text-green-600">(You)</span>}
                            </div>
                            {parent.noLogin ? (
                              <div className="text-xs text-gray-400 italic">No email provided</div>
                            ) : (
                              <div className="text-sm text-gray-600">{parent.email}</div>
                            )}
                            {parent.phone && <div className="text-sm text-gray-500">{parent.phone}</div>}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No family members yet.</p>
            )}
          </div>

          {/* Photo Upload Modal for list view parent photo */}
          {photoParentEmail && (
            <PhotoUploadModal
              currentPhoto={(allFamilyMembers.find(p => p.email === photoParentEmail) || {}).photo}
              onSave={async (img) => {
                const updatedParents = parents.map(p => p.email === photoParentEmail ? { ...p, photo: img } : p);
                await saveParents(updatedParents, `Added photo for parent`);
                setPhotoParentEmail(null);
                showToast('Photo updated!', 'success');
              }}
              onCancel={() => setPhotoParentEmail(null)}
            />
          )}

          {/* Edit Parent Modal */}
          {editingParent && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
                  <div>
                    <h3 className="text-lg font-bold mb-4">
                      {editingParent.email === currentUserEmail ? 'Edit Your Profile' : 'Edit Parent'}
                    </h3>

                    {/* Photo */}
                    <div className="flex justify-center mb-4">
                      {getDisplayPhoto(editForm.photo) ? (
                        <div className="relative">
                          <img src={getDisplayPhoto(editForm.photo)} className="w-20 h-20 rounded-full object-cover border-2 border-blue-400" />
                          <button onClick={() => setShowEditPhotoModal(true)}
                            className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-600 rounded-full text-white text-xs flex items-center justify-center">✎</button>
                        </div>
                      ) : (
                        <div onClick={() => setShowEditPhotoModal(true)}
                          className="w-20 h-20 rounded-full bg-gray-200 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-300">
                          <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                          <span className="text-[9px] text-gray-500 font-medium">add photo</span>
                        </div>
                      )}
                    </div>
                    {showEditPhotoModal && <PhotoUploadModal currentPhoto={editForm.photo} onSave={(img) => { setEditForm({ ...editForm, photo: img }); setShowEditPhotoModal(false); }} onCancel={() => setShowEditPhotoModal(false)} />}

                    <div className="space-y-3">
                      {/* Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                        <input
                          value={editForm.name}
                          onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg"
                          placeholder="Full name"
                          autoComplete="off"
                          data-1p-ignore="true"
                        />
                      </div>

                      {/* Phone */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                        <input
                          value={editForm.phone}
                          onChange={e => setEditForm({ ...editForm, phone: formatPhoneLocal(e.target.value) })}
                          className="w-full px-3 py-2 border rounded-lg"
                          placeholder="123-456-7890"
                          autoComplete="off"
                          data-1p-ignore="true"
                        />
                      </div>

                      {/* Email (read-only) */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input
                          value={editingParent.email}
                          readOnly
                          className="w-full px-3 py-2 border rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed"
                        />
                        <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
                      </div>

                      {/* Save / Cancel buttons */}
                      <div className="flex gap-3 pt-3">
                        <button
                          onClick={handleSaveEdit}
                          disabled={!editForm.name}
                          className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 font-medium"
                        >
                          Save Changes
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                        >
                          Cancel
                        </button>
                      </div>

                      {/* Remove from Family - only for non-current users */}
                      {editingParent.email !== currentUserEmail && (
                        <div className="pt-3 border-t mt-4">
                          {!showRemoveConfirm ? (
                            <button
                              onClick={() => setShowRemoveConfirm(true)}
                              className="w-full py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 font-medium"
                            >
                              Remove from Family
                            </button>
                          ) : (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                              <p className="text-sm text-red-700 mb-3">
                                Remove {editingParent.name} from family access? They will no longer be able to access your campers.
                              </p>
                              <div className="flex gap-3">
                                <button
                                  onClick={handleRemoveParent}
                                  className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
                                >
                                  Yes, Remove
                                </button>
                                <button
                                  onClick={() => setShowRemoveConfirm(false)}
                                  className="flex-1 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
              </div>
            </div>
          )}

          {/* Success modal */}
          {successModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
                <div className="text-center">
                  <div className="text-6xl mb-4">✅</div>
                  <h3 className="text-xl font-bold mb-2">Parent Added Successfully!</h3>
                  <p className="mb-4 text-gray-600">
                    {successModal.name} can now log in with these credentials:
                  </p>
                  <div className="bg-gray-100 p-4 rounded-lg mb-4 text-left">
                    <div className="mb-2">
                      <strong>Email:</strong> {successModal.email}
                    </div>
                    <div>
                      <strong>Password:</strong> {successModal.password}
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                    Please share these credentials securely with {successModal.name}.
                    They will have access to all your campers and can create registrations.
                  </p>
                  <button
                    onClick={() => setSuccessModal(null)}
                    className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700"
                  >
                    Got it!
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    };

    // ==================== REGISTRATION CALENDAR VIEW ====================
    const RegistrationCalendarView = ({ myChildren, registrations, activeCampDates, campDates, gymRentals, campers, saveCampers }) => {
      const [selectedChildren, setSelectedChildren] = useState(() => {
        const childrenWithRegs = myChildren.filter(c =>
          registrations.some(r => r.childId === c.id && r.status !== 'cancelled')
        ).map(c => c.id);
        return childrenWithRegs;
      });
      const [showCalendarPhotoModal, setShowCalendarPhotoModal] = useState(false);
      const [calendarPhotoChildId, setCalendarPhotoChildId] = useState(null);

      // Get all registration dates for a specific child
      const getRegistrationsForChild = (childId) => {
        return registrations.filter(r => r.childId === childId);
      };

      // Generate calendar for July, August 2026
      const months = [
        { name: 'July', year: 2026, month: 6 },
        { name: 'August', year: 2026, month: 7 }
      ];

      const getDaysInMonth = (year, month) => {
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startDayOfWeek = firstDay.getDay(); // 0 = Sunday

        const days = [];
        // Add empty cells for days before month starts
        for (let i = 0; i < startDayOfWeek; i++) {
          days.push(null);
        }
        // Add days of the month
        for (let day = 1; day <= daysInMonth; day++) {
          days.push(day);
        }
        return days;
      };

      const getRegistrationForDate = (year, month, day) => {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return registrations.filter(r => r.date === dateStr);
      };

      const getStatusColor = (status) => {
        if (status === 'approved') return 'bg-green-500';
        if (status === 'pending') return 'bg-yellow-500';
        if (status === 'rejected') return 'bg-red-500';
        return 'bg-gray-300';
      };

      const getStatusText = (status) => {
        if (status === 'approved') return 'Approved';
        if (status === 'pending') return 'Pending';
        if (status === 'rejected') return 'Rejected';
        return '';
      };

      if (myChildren.length === 0) {
        return (
          <div className="bg-white rounded-xl shadow p-8 text-center">
            <div className="text-6xl mb-4">📅</div>
            <h3 className="font-bold text-lg text-gray-800 mb-2">No Campers Yet</h3>
            <p className="text-gray-500">Add campers to see their registration calendar</p>
          </div>
        );
      }

      return (
        <div className="bg-white rounded-xl shadow p-6">
          <div className="mb-6">
            <h3 className="font-bold text-xl mb-2">📅 Session Calendar</h3>

            {/* Child Selector */}
            <div className="flex gap-3 flex-wrap mb-4">
              {myChildren.map(child => (
                <button
                  key={child.id}
                  onClick={() => {
                    setSelectedChildren(prev =>
                      prev.includes(child.id)
                        ? prev.filter(id => id !== child.id)
                        : [...prev, child.id]
                    );
                  }}
                  className={`flex flex-col items-center gap-1 px-4 py-3 rounded-lg font-medium ${
                    selectedChildren.includes(child.id)
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {getDisplayPhoto(child.photo) ? (
                    <img src={getDisplayPhoto(child.photo)} className={`w-10 h-10 rounded-full object-cover border-2 ${selectedChildren.includes(child.id) ? 'border-white' : 'border-green-500'}`} />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                      <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                    </div>
                  )}
                  <span className="text-sm">{selectedChildren.includes(child.id) ? '✓ ' : ''}{child.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Display message if no campers selected */}
          {selectedChildren.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <p>Select one or more campers above to view their session calendars</p>
            </div>
          )}

          {/* Calendar Grid - One per selected child */}
          {selectedChildren.map(childId => {
            const child = myChildren.find(c => c.id === childId);
            if (!child) return null;

            const childRegs = getRegistrationsForChild(childId);

            const getRegistrationForDate = (year, month, day) => {
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              return childRegs.filter(r => r.date === dateStr);
            };

            return (
              <div key={childId} className="mb-8 last:mb-0">
                <h4 className="font-bold text-lg mb-3 flex items-center gap-2">
                  {getDisplayPhoto(child.photo) ? (
                    <img src={getDisplayPhoto(child.photo)} className="w-8 h-8 rounded-full object-cover border-2 border-green-500" />
                  ) : (
                    <div onClick={() => { setCalendarPhotoChildId(childId); setShowCalendarPhotoModal(true); }} className="w-8 h-8 rounded-full bg-gray-200 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-300">
                      <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                      <span className="text-[6px] text-gray-500 font-medium">add photo</span>
                    </div>
                  )}
                  {child.name}'s Session Calendar
                  {showCalendarPhotoModal && calendarPhotoChildId === childId && (
                    <PhotoUploadModal
                      currentPhoto={child.photo}
                      onSave={(img) => {
                        if (saveCampers && campers) {
                          saveCampers(campers.map(c => c.id === childId ? { ...c, photo: img } : c), `Updated photo for ${child.name}`);
                        }
                        setShowCalendarPhotoModal(false);
                        setCalendarPhotoChildId(null);
                      }}
                      onCancel={() => { setShowCalendarPhotoModal(false); setCalendarPhotoChildId(null); }}
                    />
                  )}
                </h4>

                <div className="grid md:grid-cols-3 gap-6">
                  {months.map(({ name, year, month }) => {
                    const days = getDaysInMonth(year, month);
                    return (
                      <div key={`${year}-${month}`} className="border rounded-lg overflow-hidden">
                        <div className="bg-green-700 text-white text-center py-2 font-bold">
                          {name} {year}
                        </div>
                        <div className="grid grid-cols-7 gap-1 p-2">
                          {/* Day headers */}
                          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                            <div key={i} className="text-center text-xs font-medium text-gray-500 py-1">
                              {d}
                            </div>
                          ))}
                          {/* Days */}
                          {days.map((day, i) => {
                            if (day === null) {
                              return <div key={`empty-${i}`} className="aspect-square"></div>;
                            }
                            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                            const isValidCampDate = activeCampDates.includes(dateStr);
                            const regs = getRegistrationForDate(year, month, day);
                            const hasRegistrations = regs.length > 0;

                            // If not a valid camp date, show X
                            if (!isValidCampDate) {
                              return (
                                <div
                                  key={day}
                                  className="aspect-square flex flex-col items-center justify-center text-xs rounded relative bg-gray-100 border border-gray-300"
                                >
                                  <span className="text-gray-400 text-[10px] absolute top-0.5 left-1">{day}</span>
                                  <span className="text-red-400 text-xl font-bold">×</span>
                                </div>
                              );
                            }

                            return (
                              <div
                                key={day}
                                onClick={() => showToast('Calendar is view-only. Use the "+ New Registration" button above to register for sessions.', 'info')}
                                className={`aspect-square flex flex-col items-center justify-center text-xs rounded relative group cursor-default ${
                                  hasRegistrations
                                    ? 'bg-green-100 border-2 border-green-500 font-bold'
                                    : 'bg-blue-50 border border-blue-200'
                                }`}
                              >
                                <span className={hasRegistrations ? 'text-gray-800' : 'text-gray-500'}>
                                  {day}
                                </span>
                                {hasRegistrations && (
                                  <>
                                    <div className="text-[8px] leading-none mt-1">
                                      {regs.flatMap(r => r.sessions || []).map(s => s === 'morning' ? 'AM' : 'PM').join(' ')}
                                    </div>
                                    {/* Tooltip on hover */}
                                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-10 w-48">
                                      <div className="bg-gray-900 text-white text-xs rounded-lg p-2 shadow-lg">
                                        {regs.map((reg, idx) => (
                                          <div key={idx} className="mb-1 last:mb-0">
                                            <div className="font-bold">{child.name}</div>
                                            <div>{reg.sessions?.map(s => s === 'morning' ? 'AM' : 'PM').join(' + ')}</div>
                                            <div className="text-xs text-green-300">Registered</div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Legend for this camper's calendar */}
                <div className="flex flex-wrap gap-4 text-sm mt-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-green-500 rounded"></div>
                    <span>Registered</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-blue-200 border border-blue-300 rounded"></div>
                    <span>Available for Registration</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-gray-100 border border-gray-300 rounded flex items-center justify-center">
                      <span className="text-red-400 text-lg font-bold leading-none">×</span>
                    </div>
                    <span>No Day Camp</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      );
    };

    // ==================== CAMPER SCHEDULE TAB (Visual Schedule for Parents) ====================

      // ==================== AUTH CHECK & ROUTER (PARENT) ====================
      useEffect(() => {
        const userJson = sessionStorage.getItem('user');
        if (!userJson) {
          window.location.href = '/index.html';
          return;
        }
        const sessionUser = JSON.parse(userJson);
        if (sessionUser.role !== 'parent') {
          window.location.href = '/index.html';
          return;
        }
        if (!user) setUser(sessionUser);
      }, []);

      if (!user) return <div className="min-h-screen bg-green-50 flex items-center justify-center"><div className="text-6xl">🏀</div></div>;

      // Show nav bar during loading to prevent "logout/login" flash
      if (loading) return (
        <div className="min-h-screen bg-gray-50">
          <VersionBanner isVisible={isDevEnv || showBanner} isDev={isDevEnv} version={VERSION} buildDate={BUILD_DATE} />
          <Nav />
          <div className="flex items-center justify-center py-20">
            <div className="text-6xl animate-bounce">🏀</div>
          </div>
        </div>
      );

      return (
        <div className="min-h-screen bg-gray-50">
          <VersionBanner isVisible={isDevEnv || showBanner} isDev={isDevEnv} version={VERSION} buildDate={BUILD_DATE} />
          <Nav />
          {toast && <Toast message={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
          <Parent />
        </div>
      );
    }
