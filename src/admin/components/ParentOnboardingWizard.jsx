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

    // ==================== POLICY CONSTANTS ====================
    export const PICKUP_POLICY = `
Only authorized emergency contacts may pick up your child.

Upload a photo for the emergency contact, or remind the emergency contact that they will need to show a valid Photo ID.
    `.trim();

    export const DROPOFF_POLICY = `
Please sign in your child with the counselor on duty at the main gym entrance.

Morning sessions: Drop-off is between 8:45 AM - 9:00 AM
Afternoon sessions: Drop-off is between 11:45 AM - 12:00 PM
    `.trim();

    // ==================== PARENT ONBOARDING WIZARD ====================
    export const ParentOnboarding = ({ onComplete, onBack, users, saveUsers, saveEmergencyContacts, emergencyContacts, saveOnboardingProgress, campers, saveCampers, saveCamperParentLinks, camperParentLinks }) => {
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
      // Photo cropping state
      const [showCropper, setShowCropper] = useState(false);
      const [tempImage, setTempImage] = useState(null);
      const [cropTarget, setCropTarget] = useState(null); // 'parent', 'contact', or contact id
      const parentPhotoRef = useRef(null);
      const contactPhotoRef = useRef(null);
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

      // Photo upload handler
      const handlePhotoUpload = (e, target) => {
        const file = e.target.files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
            setTempImage(reader.result);
            setCropTarget(target);
            setShowCropper(true);
          };
          reader.readAsDataURL(file);
        }
        if (e.target) e.target.value = '';
      };

      const handleCropSave = (croppedImage) => {
        if (cropTarget === 'parent') {
          setUserData({ ...userData, photo: croppedImage });
        } else if (cropTarget === 'newContact') {
          setNewContact({ ...newContact, photo: croppedImage });
        }
        setShowCropper(false);
        setTempImage(null);
        setCropTarget(null);
      };

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
          if (users.some(u => u.email === userData.email)) {
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
        await saveUsers([...users, newUser]);

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
          {/* Image Cropper Modal */}
          {showCropper && tempImage && (
            <ImageCropper
              image={tempImage}
              onSave={handleCropSave}
              onCancel={() => { setShowCropper(false); setTempImage(null); setCropTarget(null); }}
              shape="circle"
            />
          )}
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
                        <button onClick={() => parentPhotoRef.current?.click()} className="absolute -bottom-1 -right-1 w-8 h-8 bg-green-600 rounded-full text-white flex items-center justify-center text-sm hover:bg-green-700">✎</button>
                        <button onClick={() => setUserData({ ...userData, photo: null })} className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full text-white text-xs flex items-center justify-center">×</button>
                      </div>
                    ) : (
                      <div onClick={() => parentPhotoRef.current?.click()} className="w-24 h-24 rounded-full bg-gray-200 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-300">
                        <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                        <span className="text-[8px] text-gray-500 font-medium">add photo</span>
                      </div>
                    )}
                    <input ref={parentPhotoRef} type="file" accept="image/*" onChange={(e) => handlePhotoUpload(e, 'parent')} className="hidden" />
                  </div>
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
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                    <strong>Required:</strong> At least 3 emergency contacts, including at least 1 who is not a parent (grandparent, neighbor, etc.)
                  </div>

                  {/* Parent auto-contact */}
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center gap-3">
                      {getDisplayPhoto(userData.photo) ? (
                        <img src={getDisplayPhoto(userData.photo)} className="w-10 h-10 rounded-full object-cover border-2 border-green-500" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex flex-col items-center justify-center">
                          <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                          <span className="text-[5px] text-gray-500 font-medium">add photo</span>
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
                          <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                          <span className="text-[5px] text-gray-500 font-medium">add photo</span>
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
                              <button onClick={() => contactPhotoRef.current?.click()} className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-600 rounded-full text-white flex items-center justify-center text-xs hover:bg-blue-700">✎</button>
                              <button onClick={() => setNewContact({ ...newContact, photo: null })} className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-white text-xs flex items-center justify-center">×</button>
                            </div>
                          ) : (
                            <div onClick={() => contactPhotoRef.current?.click()} className="w-16 h-16 rounded-full bg-gray-200 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-300">
                              <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                              <span className="text-[8px] text-gray-500 font-medium">add photo</span>
                            </div>
                          )}
                          <input ref={contactPhotoRef} type="file" accept="image/*" onChange={(e) => handlePhotoUpload(e, 'newContact')} className="hidden" />
                        </div>
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

