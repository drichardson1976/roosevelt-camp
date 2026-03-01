import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase, SCHEMA, GOOGLE_CLIENT_ID } from '../shared/config';
import { storage, isDev, formatPhone, isValidPhone, formatBirthdate, calculateAge, getDisplayPhoto, getSessionCost, photoStorage } from '../shared/utils';
import { RELEASE_NOTES } from '../shared/release-notes';
import { StableInput, StableTextarea } from '../shared/components/StableInput';
import { VersionBanner } from '../shared/components/VersionBanner';
import { Toast } from '../shared/components/Toast';
import { Modal } from '../shared/components/Modal';
import { ScrollableTabs } from '../shared/components/ScrollableTabs';
import { ImageCropper, ImageUpload } from '../shared/components/ImageCropper';
import { PhotoUploadModal } from '../shared/components/PhotoUploadModal';
import { generateCampDates, CAMP_DATES, getCampDateRange, CAMP_DATE_RANGE, getWeeks, CAMP_WEEKS } from '../shared/campDates';
import { DEFAULT_CONTENT, DEFAULT_COUNSELORS, DEFAULT_ADMINS } from '../shared/defaults';
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
              <div className="relative cursor-pointer" onClick={() => setShowPhotoModal(true)}>
                <img
                  src={getDisplayPhoto(form.photo)}
                  className="w-20 h-20 rounded-full object-cover border-2 border-green-600 hover:opacity-80"
                />
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-600 rounded-full text-white flex items-center justify-center text-xs hover:bg-green-700">✎</div>
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

    // ==================== ONBOARDING SUMMARY COMPONENT ====================
    const OnboardingSummary = ({ step, userData, campersData, emergencyData, onEditStep, onEditPhoto }) => {
      if (step === 1) return null; // Don't show on first step

      const EditBtn = ({ targetStep }) => onEditStep ? (
        <button
          onClick={() => onEditStep(targetStep)}
          className="text-xs text-green-700 hover:text-green-900 font-medium px-2 py-0.5 rounded hover:bg-green-100 transition-colors"
        >
          Edit
        </button>
      ) : null;

      const ClickablePhoto = ({ photo, onClick, size = 'w-8 h-8' }) => (
        <div onClick={onClick} className="cursor-pointer flex-shrink-0">
          {getDisplayPhoto(photo) ? (
            <img src={getDisplayPhoto(photo)} className={`${size} rounded-full object-cover border-2 border-green-500 hover:opacity-80 transition-opacity`} />
          ) : (
            <div className={`${size} rounded-full bg-gray-200 flex flex-col items-center justify-center hover:bg-gray-300 transition-colors`}>
              <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
              <span className="text-[5px] text-gray-500 font-medium">add photo</span>
            </div>
          )}
        </div>
      );

      return (
        <div className="bg-white rounded-xl shadow-md p-4 mb-4 border border-green-200">
          <h3 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
            <span>📋</span>
            <span>Your Information</span>
          </h3>

          {/* Parent Info - Always show after step 1 */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <div className="text-xs font-medium text-gray-500 uppercase">Parent Account</div>
              <EditBtn targetStep={1} />
            </div>
            <div className="bg-green-50 rounded-lg p-3 border-2 border-green-500 flex items-center gap-2">
              <ClickablePhoto photo={userData.photo} onClick={() => onEditPhoto && onEditPhoto('parent')} />
              <div>
                <div className="font-medium text-sm">{userData.name}</div>
                <div className="text-xs text-gray-600">{userData.phone} • Parent</div>
                <div className="text-xs text-gray-600">{userData.email}</div>
              </div>
            </div>
          </div>

          {/* Campers - Show after step 2 */}
          {step > 2 && campersData.length > 0 && (
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <div className="text-xs font-medium text-gray-500 uppercase">
                  Campers ({campersData.length})
                </div>
                <EditBtn targetStep={2} />
              </div>
              <div className="space-y-2">
                {campersData.map((camper, idx) => (
                  <div key={camper.id} className="bg-green-50 rounded-lg p-3 border-2 border-green-500 flex items-center gap-2">
                    <ClickablePhoto photo={camper.photo} onClick={() => onEditPhoto && onEditPhoto('camper', camper.id)} />
                    <div>
                      <div className="font-medium text-sm">{camper.name}</div>
                      <div className="text-xs text-gray-600">
                        {camper.grade} Grade • Age {calculateAge(camper.birthdate)} • Born {formatBirthdate(camper.birthdate)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Emergency Contacts - Show after step 3 */}
          {step > 3 && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="text-xs font-medium text-gray-500 uppercase">
                  Emergency Contacts ({emergencyData.length + 1})
                </div>
                <EditBtn targetStep={3} />
              </div>
              <div className="space-y-2">
                {/* Parent auto-contact */}
                <div className="bg-green-50 rounded-lg p-3 border-2 border-green-500 flex items-center gap-2">
                  <ClickablePhoto photo={userData.photo} onClick={() => onEditPhoto && onEditPhoto('parent')} />
                  <div>
                    <div className="font-medium text-sm">{userData.name}</div>
                    <div className="text-xs text-gray-600">{userData.phone} • Parent</div>
                  </div>
                </div>
                {/* Additional contacts */}
                {emergencyData.map((contact, idx) => (
                  <div key={contact.id} className="bg-green-50 rounded-lg p-3 border-2 border-green-500 flex items-center gap-2">
                    <ClickablePhoto photo={contact.photo} onClick={() => onEditPhoto && onEditPhoto('ec', contact.id)} />
                    <div>
                      <div className="font-medium text-sm">{contact.name}</div>
                      <div className="text-xs text-gray-600">{contact.phone} • {contact.relationship === 'Other' && contact.otherRelationship ? `Other: ${contact.otherRelationship}` : contact.relationship}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    };

    // ==================== PARENT ONBOARDING WIZARD ====================
    const ParentOnboarding = ({ onComplete, onBack, parents, saveParents, saveEmergencyContacts, emergencyContacts, saveOnboardingProgress, campers, saveCampers, saveCamperParentLinks, camperParentLinks, content, addToHistory, sitePhotos, googleUser }) => {
      const [step, setStep] = useState(1);
      const [editReturnStep, setEditReturnStep] = useState(null);
      const [userData, setUserData] = useState({ name: googleUser?.name || '', email: googleUser?.email || '', phone: '', password: '', photo: null });
      const [showPassword, setShowPassword] = useState(false);
      const [campersData, setCampersData] = useState([]);
      const [emergencyData, setEmergencyData] = useState([]);
      const [policiesAccepted, setPoliciesAccepted] = useState({ pickup: false, dropoff: false });
      const [showPolicyModal, setShowPolicyModal] = useState(null); // 'pickup' | 'dropoff' | null
      const [error, setError] = useState('');
      const [submitting, setSubmitting] = useState(false); // Prevents flash during submission
      // State for adding campers/contacts (moved to parent level to avoid re-renders)
      const [showAddCamper, setShowAddCamper] = useState(false);
      const [newCamper, setNewCamper] = useState({ name: '', birthdate: '', birthYear: '', birthMonth: '', birthDay: '', grade: '', phone: '', photo: null });
      const [editingCamperId, setEditingCamperId] = useState(null);
      const [showAddContact, setShowAddContact] = useState(false);
      const [editingContactId, setEditingContactId] = useState(null);
      const [newContact, setNewContact] = useState({ name: '', phone: '', relationship: '', otherRelationship: '', photo: null });
      // Photo modal state
      const [showParentPhotoModal, setShowParentPhotoModal] = useState(false);
      const [showContactPhotoModal, setShowContactPhotoModal] = useState(false);
      const [showCamperPhotoModal, setShowCamperPhotoModal] = useState(false);
      const [summaryPhotoTarget, setSummaryPhotoTarget] = useState(null); // {type: 'parent'|'camper'|'ec', id?: string}
      const contactNameRef = useRef(null);

      const totalSteps = 4;

      const steps = [
        { num: 1, title: 'Your Account', icon: '👤' },
        { num: 2, title: 'Add Campers', icon: '🏀' },
        { num: 3, title: 'Emergency Contacts', icon: '📞' },
        { num: 4, title: 'Review & Complete', icon: '✅' }
      ];

      // Helper functions for campers
      const addCamper = () => {
        if (!newCamper.name || !newCamper.birthdate || !newCamper.grade) return;
        if (editingCamperId) {
          setCampersData(campersData.map(c => c.id === editingCamperId ? { ...newCamper, id: editingCamperId } : c));
          setEditingCamperId(null);
        } else {
          setCampersData([...campersData, { ...newCamper, id: 'camper_' + Date.now() }]);
        }
        setNewCamper({ name: '', birthdate: '', birthYear: '', birthMonth: '', birthDay: '', grade: '', phone: '', photo: null });
        setShowAddCamper(false);
      };

      const editCamper = (camper) => {
        const parts = camper.birthdate ? camper.birthdate.split('-') : ['', '', ''];
        setNewCamper({
          name: camper.name || '',
          birthdate: camper.birthdate || '',
          birthYear: parts[0] || '',
          birthMonth: parts[1] || '',
          birthDay: parts[2] || '',
          grade: camper.grade || '',
          phone: camper.phone || '',
          photo: camper.photo || null
        });
        setEditingCamperId(camper.id);
        setShowAddCamper(true);
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
      const [pendingInvitations, setPendingInvitations] = useState([]);
      const [pendingNoLoginParents, setPendingNoLoginParents] = useState([]);
      const [invitePrompt, setInvitePrompt] = useState(null);
      const [inviteForm, setInviteForm] = useState({ email: '', password: '' });
      const [inviteError, setInviteError] = useState('');
      const [showInvitePassword, setShowInvitePassword] = useState(false);
      const addContact = () => {
        setContactError('');
        if (!newContact.name || !newContact.phone || !newContact.relationship) return;
        if (newContact.relationship === 'Other' && !newContact.otherRelationship) return;
        if (!isValidPhone(newContact.phone)) {
          setContactError('Please enter a valid 10-digit phone number');
          return;
        }
        const addedName = newContact.name;
        const addedPhone = newContact.phone;
        const addedRelationship = newContact.relationship;
        if (editingContactId) {
          // Update existing contact
          setEmergencyData(emergencyData.map(c => c.id === editingContactId ? { ...c, ...newContact } : c));
        } else {
          // Add new contact
          setEmergencyData([...emergencyData, {
            ...newContact,
            id: 'contact_' + Date.now(),
            isParent: false,
            priority: emergencyData.length + 2
          }]);
        }
        setNewContact({ name: '', phone: '', relationship: '', otherRelationship: '', photo: null });
        setShowAddContact(false);
        setEditingContactId(null);
        // Show invite prompt only for Parent relationship (and only for new contacts)
        if (!editingContactId && addedRelationship === 'Parent') {
          setInviteForm({ email: '', password: '' });
          setInviteError('');
          setInvitePrompt({ name: addedName, phone: addedPhone });
        }
      };

      const handleInviteAccept = () => {
        if (!inviteForm.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteForm.email)) {
          setInviteError('Please enter a valid email address');
          return;
        }
        if (!inviteForm.password || inviteForm.password.length < 4) {
          setInviteError('Password must be at least 4 characters');
          return;
        }
        if ((parents || []).find(p => p.email.toLowerCase() === inviteForm.email.toLowerCase()) ||
            pendingInvitations.find(p => p.email.toLowerCase() === inviteForm.email.toLowerCase())) {
          setInviteError('A user with this email already exists');
          return;
        }
        setPendingInvitations([...pendingInvitations, {
          name: invitePrompt.name,
          phone: invitePrompt.phone,
          email: inviteForm.email,
          password: inviteForm.password
        }]);
        setInvitePrompt(null);
      };

      const handleInviteDismiss = () => {
        // Still add as a parent (without login) — they should appear on Parents tab
        if (invitePrompt) {
          setPendingNoLoginParents([...pendingNoLoginParents, {
            name: invitePrompt.name,
            phone: invitePrompt.phone
          }]);
        }
        setInvitePrompt(null);
        setInviteForm({ email: '', password: '' });
        setInviteError('');
      };

      const removeContact = (id) => {
        setEmergencyData(emergencyData.filter(c => c.id !== id));
        if (editingContactId === id) {
          setEditingContactId(null);
          setShowAddContact(false);
          setNewContact({ name: '', phone: '', relationship: '', otherRelationship: '', photo: null });
        }
      };

      const editContact = (contact) => {
        setNewContact({
          name: contact.name || '',
          phone: contact.phone || '',
          relationship: contact.relationship || '',
          otherRelationship: contact.otherRelationship || '',
          photo: contact.photo || null
        });
        setEditingContactId(contact.id);
        setShowAddContact(true);
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
          // Check each required field individually for specific feedback
          if (!userData.name.trim()) {
            setError('Please enter your full name');
            return false;
          }
          if (!userData.email.trim()) {
            setError('Please enter your email address');
            return false;
          }
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userData.email.trim())) {
            setError('Please enter a valid email address (e.g. name@example.com)');
            return false;
          }
          if (!userData.phone) {
            setError('Please enter your phone number');
            return false;
          }
          if (!isValidPhone(userData.phone)) {
            setError('Please enter a valid 10-digit phone number: (555) 555-1234');
            return false;
          }
          if (!googleUser) {
            if (!userData.password) {
              setError('Please create a password');
              return false;
            }
            if (userData.password.length < 4) {
              setError('Password must be at least 4 characters');
              return false;
            }
          }
          if ((parents || []).some(u => u.email.toLowerCase() === userData.email.trim().toLowerCase())) {
            setError('An account with this email already exists. Please use a different email or log in instead.');
            return false;
          }
        }
        // Step 2: Require at least one camper - must click Add Camper button
        if (step === 2) {
          // If form is open with any data, require clicking Add Camper
          if (showAddCamper && (newCamper.name || newCamper.birthdate || newCamper.grade)) {
            setError('Please click "Add Camper" to save the camper, or click "Cancel" to discard');
            return false;
          }
          if (campersData.length === 0) {
            setError('Please add at least one camper before continuing');
            return false;
          }
        }
        // Step 3: Emergency contacts - warn but allow skip, require Add Contact button if form is open
        if (step === 3) {
          // If form is open with any data, require clicking Add Contact
          if (showAddContact && (newContact.name || newContact.phone || newContact.relationship)) {
            setError('Please click "Add Contact" to save the emergency contact, or click "Cancel" to discard');
            return false;
          }
          // Validate existing contact phone numbers
          const invalidContact = emergencyData.find(c => !isValidPhone(c.phone));
          if (invalidContact) {
            setError(`Please enter a valid 10-digit phone for ${invalidContact.name}`);
            return false;
          }
        }
        // Step 4 (Policies) is required
        if (step === 4) {
          if (!policiesAccepted.pickup || !policiesAccepted.dropoff) {
            setError('You must accept both the drop-off and pick-up policies before continuing.');
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
          loginType: googleUser ? 'Google' : 'Email/Password',
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
          } catch (e) { /* Continue without hash — login function handles both */ }
        }
        await saveParents([...(parents || []), newUser]);

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

        // Save emergency contacts — parent is always contact #1 as a reference-only record
        // (name/phone/photo pulled from camp_parents at display time to avoid duplicate data)
        const parentEcRef = { id: 'ec_' + Date.now(), parentEmail: userData.email, isParent: true, relationship: 'Parent', priority: 1, userEmail: userData.email };

        // Build no-login parent ID map for EC reference linking
        const noLoginParentIds = {};
        pendingNoLoginParents.forEach(nlp => {
          noLoginParentIds[nlp.name.toLowerCase()] = `nologin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        });

        // Build emergency contact list, upgrading any invited/no-login contacts to parent references
        const processedEcData = emergencyData.map((c, i) => {
          const contact = { ...c, userEmail: userData.email, priority: i + 2 };
          // If this contact was invited as a parent (with login), convert to parent-reference EC
          const matchingInvite = pendingInvitations.find(inv => inv.name.toLowerCase() === c.name.toLowerCase());
          if (matchingInvite) {
            contact.isParent = true;
            contact.parentEmail = matchingInvite.email;
            delete contact.name;
            delete contact.phone;
            delete contact.photo;
          }
          // If this contact was added as a no-login parent, also convert to parent-reference EC
          const noLoginId = noLoginParentIds[c.name?.toLowerCase()];
          if (!matchingInvite && noLoginId) {
            contact.isParent = true;
            contact.parentEmail = noLoginId;
          }
          return contact;
        });

        const allContacts = [parentEcRef, ...processedEcData];
        await saveEmergencyContacts([...emergencyContacts, ...allContacts]);

        // Process pending parent invitations (with login) and no-login parents
        let currentParentsList = [...(parents || []), newUser];
        let currentLinksList = [...(camperParentLinks || []), ...campersData.map(c => ({ camperId: c.id, parentEmail: userData.email }))];

        // Add invited parents (with login credentials)
        for (const invitation of pendingInvitations) {
          const originalEc = emergencyData.find(c => c.name.toLowerCase() === invitation.name.toLowerCase());
          let invitedPasswordHash = null;
          if (invitation.password) {
            try {
              const hashRes = await fetch('/.netlify/functions/hash-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: invitation.password })
              });
              const hashData = await hashRes.json();
              if (hashRes.ok) invitedPasswordHash = hashData.passwordHash;
            } catch (e) { /* Continue */ }
          }
          const invitedParent = {
            email: invitation.email,
            name: invitation.name,
            passwordHash: invitedPasswordHash,
            phone: invitation.phone,
            photo: originalEc?.photo || null,
            role: 'parent',
            roles: ['parent'],
            onboardingComplete: true,
            onboardingCompletedAt: new Date().toISOString(),
            createdBy: userData.email,
            createdAt: new Date().toISOString()
          };
          currentParentsList = [...currentParentsList, invitedParent];
          const inviteLinks = campersData.map(c => ({ camperId: c.id, parentEmail: invitation.email }));
          currentLinksList = [...currentLinksList, ...inviteLinks];
        }

        // Add no-login parents (name/phone only, no credentials)
        for (const nlp of pendingNoLoginParents) {
          const noLoginId = noLoginParentIds[nlp.name.toLowerCase()];
          const originalEc = emergencyData.find(c => c.name.toLowerCase() === nlp.name.toLowerCase());
          const noLoginParent = {
            email: noLoginId,
            name: nlp.name,
            phone: nlp.phone,
            photo: originalEc?.photo || null,
            role: 'parent',
            roles: ['parent'],
            noLogin: true,
            createdBy: userData.email,
            createdAt: new Date().toISOString()
          };
          currentParentsList = [...currentParentsList, noLoginParent];
          const nlpLinks = campersData.map(c => ({ camperId: c.id, parentEmail: noLoginId }));
          currentLinksList = [...currentLinksList, ...nlpLinks];
        }

        if (pendingInvitations.length > 0 || pendingNoLoginParents.length > 0) {
          await saveParents(currentParentsList);
          await saveCamperParentLinks(currentLinksList);
        }

        // Log onboarding completion to history
        if (addToHistory) {
          const camperNames = campersData.map(c => c.name).join(', ');
          const ecNames = emergencyData.map(c => c.name).filter(Boolean).join(', ');
          const inviteNames = pendingInvitations.map(inv => inv.name).join(', ');
          const details = [
            `Parent account created: ${userData.name} (${userData.email})`,
            campersData.length > 0 ? `Campers added: ${camperNames}` : null,
            emergencyData.length > 0 ? `Emergency contacts added: ${ecNames}` : null,
            pendingInvitations.length > 0 ? `Additional parents invited: ${inviteNames}` : null,
            pendingNoLoginParents.length > 0 ? `Parents added (no login): ${pendingNoLoginParents.map(p => p.name).join(', ')}` : null,
            policiesAccepted.pickup && policiesAccepted.dropoff ? 'Pickup & dropoff policies accepted' : null
          ].filter(Boolean).join(' | ');
          const allEmails = [userData.email, ...pendingInvitations.map(inv => inv.email)];
          await addToHistory('Parent Onboarding Complete', details, allEmails);
        }

        // Send welcome email (fire and forget — don't block onboarding)
        try {
          // Build conditional tips based on what was completed during onboarding
          const tips = [];
          if (campersData.length === 0) {
            tips.push('<li><strong>Add your campers</strong> — Go to the Campers tab to add each child attending camp</li>');
          }
          const allPhotosUploaded = userData.photo && campersData.length > 0 && campersData.every(c => c.photo);
          if (!allPhotosUploaded) {
            tips.push('<li><strong>Upload photos</strong> — Add a photo for yourself and each camper (required before camp starts)</li>');
          }
          if (emergencyData.length === 0) {
            tips.push('<li><strong>Add emergency contacts</strong> — Each camper needs at least 2 emergency contacts on file</li>');
          }
          tips.push('<li><strong>Register for sessions</strong> — Check the schedule and register your campers for their sessions</li>');

          const tipsHtml = tips.length > 1
            ? `<h3 style="color: #15803d;">Next Steps</h3><ul style="line-height: 1.8;">${tips.join('')}</ul>`
            : `<h3 style="color: #15803d;">Next Step</h3><ul style="line-height: 1.8;">${tips.join('')}</ul>`;

          // Extract hero image for email — URL (CDN) or base64 (legacy)
          const heroData = sitePhotos?.hero;
          const heroSrc = heroData ? (typeof heroData === 'string' ? heroData : heroData.cropped) : null;
          let heroImageHtml = '';
          let emailAttachments;
          if (heroSrc && heroSrc.startsWith('http')) {
            // CDN URL — just use an img tag directly
            heroImageHtml = '<img src="' + heroSrc + '" alt="Roosevelt Basketball Day Camp" style="width: 100%; max-width: 600px; border-radius: 12px; margin-bottom: 20px;" />';
          } else if (heroSrc) {
            // Legacy base64 — use CID inline attachment
            const heroMatch = heroSrc.match(/^data:image\/(.*?);base64,(.*)$/);
            if (heroMatch) {
              heroImageHtml = '<img src="cid:hero-image" alt="Roosevelt Basketball Day Camp" style="width: 100%; max-width: 600px; border-radius: 12px; margin-bottom: 20px;" />';
              emailAttachments = [{ filename: `hero.${heroMatch[1] === 'jpeg' ? 'jpg' : heroMatch[1]}`, content: heroMatch[2], content_id: 'hero-image' }];
            }
          }

          fetch('/.netlify/functions/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: newUser.email,
              subject: 'Welcome to Roosevelt Basketball Day Camp!',
              html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">${heroImageHtml}<h2 style="color: #15803d;">Welcome to Roosevelt Basketball Day Camp, ${newUser.name}!</h2><p>Thank you for creating your account. We're excited to have your family join us this summer!</p>${tipsHtml}<p><a href="https://rhsbasketballdaycamp.com/#login" style="display: inline-block; background-color: #15803d; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Log In to Your Dashboard</a></p><p style="color: #666; font-size: 14px; margin-top: 20px;">If you have any questions, just reply to this email and we'll get back to you!</p></div>`,
              ...(emailAttachments ? { attachments: emailAttachments } : {})
            })
          });
        } catch (e) { /* welcome email is non-critical */ }

        onComplete(newUser);
      };

      const handleNext = async () => {
        if (!validateStep()) return;

        // After policies (step 4), skip step 5 display and go straight to saving
        if (step === 4) {
          await handleComplete();
          return;
        }

        // If editing from a later step, return there instead of advancing
        if (editReturnStep) {
          const returnTo = editReturnStep;
          setEditReturnStep(null);
          setStep(returnTo);
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

      // Submitting — redirect immediately without delay screen
      if (submitting) {
        return null;
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

            {/* Onboarding Summary */}
            <OnboardingSummary
              step={step}
              userData={userData}
              campersData={campersData}
              emergencyData={emergencyData}
              onEditStep={(targetStep) => {
                if (!editReturnStep) setEditReturnStep(step);
                setStep(targetStep);
              }}
              onEditPhoto={(type, id) => setSummaryPhotoTarget({ type, id })}
            />
            {summaryPhotoTarget && (
              <PhotoUploadModal
                currentPhoto={
                  summaryPhotoTarget.type === 'parent' ? userData.photo :
                  summaryPhotoTarget.type === 'camper' ? campersData.find(c => c.id === summaryPhotoTarget.id)?.photo :
                  emergencyData.find(c => c.id === summaryPhotoTarget.id)?.photo
                }
                onSave={(img) => {
                  if (summaryPhotoTarget.type === 'parent') {
                    setUserData({ ...userData, photo: img });
                  } else if (summaryPhotoTarget.type === 'camper') {
                    setCampersData(campersData.map(c => c.id === summaryPhotoTarget.id ? { ...c, photo: img } : c));
                  } else if (summaryPhotoTarget.type === 'ec') {
                    setEmergencyData(emergencyData.map(c => c.id === summaryPhotoTarget.id ? { ...c, photo: img } : c));
                  }
                  setSummaryPhotoTarget(null);
                }}
                onCancel={() => setSummaryPhotoTarget(null)}
              />
            )}

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
                  <p className="text-gray-600 mb-4">{googleUser ? 'Almost there! We just need a few more details.' : "Let's start by creating your account."}</p>

                  {googleUser && (
                    <div className="bg-blue-50 border border-blue-200 text-blue-800 p-3 rounded-lg text-sm flex items-center gap-2 mb-2">
                      <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                      <span>Signing up with Google — no password needed!</span>
                    </div>
                  )}

                  {/* Photo Upload */}
                  <div className="flex justify-center mb-4">
                    {getDisplayPhoto(userData.photo) ? (
                      <div className="relative cursor-pointer" onClick={() => setShowParentPhotoModal(true)}>
                        <img src={getDisplayPhoto(userData.photo)} className="w-24 h-24 rounded-full object-cover border-4 border-green-500" />
                        <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-green-600 rounded-full text-white flex items-center justify-center text-sm hover:bg-green-700">✎</div>
                      </div>
                    ) : (
                      <div onClick={() => setShowParentPhotoModal(true)} className="w-24 h-24 rounded-full bg-gray-200 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-300">
                        <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                        <span className="text-[9px] text-gray-500 font-medium">add photo</span>
                      </div>
                    )}
                    {showParentPhotoModal && <PhotoUploadModal currentPhoto={userData.photo} onSave={(img) => { setUserData({ ...userData, photo: img }); setShowParentPhotoModal(false); }} onCancel={() => setShowParentPhotoModal(false)} />}
                  </div>
                  <p className="text-xs text-gray-500 text-center -mt-2 mb-4">You can add a photo later, but a photo on this site or a photo ID at the time of pickup is required.</p>

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
                      onChange={e => !googleUser && setUserData({ ...userData, email: e.target.value })}
                      readOnly={!!googleUser}
                      className={`w-full px-4 py-3 border-2 rounded-lg focus:border-green-500 focus:outline-none ${googleUser ? 'bg-gray-100 text-gray-600' : ''}`}
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
                  {!googleUser && (
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
                  )}
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
                          <div key={camper.id} className="space-y-1">
                            <div className="flex items-center justify-between mb-1">
                              <div className="text-xs font-medium text-gray-500 uppercase">{camper.name}</div>
                              <button onClick={() => editCamper(camper)} className="text-blue-600 hover:text-blue-800 text-xs font-medium">Edit</button>
                            </div>
                            <div className="p-4 bg-green-50 rounded-lg border-2 border-green-500 flex items-center gap-3">
                              <div onClick={() => setSummaryPhotoTarget({ type: 'camper', id: camper.id })} className="cursor-pointer flex-shrink-0">
                                {getDisplayPhoto(camper.photo) ? (
                                  <img src={getDisplayPhoto(camper.photo)} className="w-10 h-10 rounded-full object-cover border-2 border-green-500 hover:opacity-80 transition-opacity" />
                                ) : (
                                  <div className="w-10 h-10 rounded-full bg-gray-200 flex flex-col items-center justify-center hover:bg-gray-300 transition-colors">
                                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                                    <span className="text-[7px] text-gray-500 font-medium">add photo</span>
                                  </div>
                                )}
                              </div>
                              <div className="flex-1">
                                <div className="font-medium">{camper.name}</div>
                                <div className="text-sm text-gray-500">
                                  {camper.grade} Grade • Age {calculateAge(camper.birthdate)}
                                </div>
                                <span className={`text-xs px-2 py-0.5 rounded ${elig.eligible ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                  {elig.status}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {showAddCamper ? (
                    <div className="border-2 border-dashed border-green-300 rounded-lg p-4 bg-green-50">
                      <h4 className="font-medium mb-3">{editingCamperId ? 'Edit Camper' : 'Add Camper'}</h4>
                      <div className="space-y-3">
                        {/* Camper Photo Upload */}
                        <div className="flex justify-center mb-2">
                          {getDisplayPhoto(newCamper.photo) ? (
                            <div className="relative cursor-pointer" onClick={() => setShowCamperPhotoModal(true)}>
                              <img src={getDisplayPhoto(newCamper.photo)} className="w-16 h-16 rounded-full object-cover border-2 border-green-500" />
                              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-600 rounded-full text-white flex items-center justify-center text-xs hover:bg-green-700">✎</div>
                            </div>
                          ) : (
                            <div onClick={() => setShowCamperPhotoModal(true)} className="w-16 h-16 rounded-full bg-gray-200 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-300">
                              <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                              <span className="text-[8px] text-gray-500 font-medium">add photo</span>
                            </div>
                          )}
                          {showCamperPhotoModal && <PhotoUploadModal currentPhoto={newCamper.photo} onSave={(img) => { setNewCamper({ ...newCamper, photo: img }); setShowCamperPhotoModal(false); }} onCancel={() => setShowCamperPhotoModal(false)} />}
                        </div>
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
                            <option value="">Grade starting Sept 2026</option>
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
                          <button onClick={addCamper} disabled={!newCamper.name || !newCamper.birthdate || !newCamper.grade} className="flex-1 py-2 bg-green-600 text-white rounded-lg disabled:bg-gray-300">{editingCamperId ? 'Save Changes' : 'Add Camper'}</button>
                          <button onClick={() => { setShowAddCamper(false); setEditingCamperId(null); setNewCamper({ name: '', birthdate: '', birthYear: '', birthMonth: '', birthDay: '', grade: '', phone: '', photo: null }); }} className="px-4 py-2 border rounded-lg">Cancel</button>
                        </div>
                        {editingCamperId && (
                          <button onClick={() => { removeCamper(editingCamperId); setShowAddCamper(false); setEditingCamperId(null); setNewCamper({ name: '', birthdate: '', birthYear: '', birthMonth: '', birthDay: '', grade: '', phone: '', photo: null }); }} className="w-full py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 font-medium mt-2">Delete Camper</button>
                        )}
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
                  {(emergencyData.length + 1) < 2 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                      <strong>Required:</strong> You (the parent) count as 1 emergency contact. Please add at least 1 more contact below.
                    </div>
                  )}

                  {/* Parent auto-contact */}
                  <div className="p-4 bg-green-50 rounded-lg border-2 border-green-500">
                    <div className="flex items-center gap-3">
                      <div onClick={() => setSummaryPhotoTarget({ type: 'parent' })} className="cursor-pointer flex-shrink-0">
                        {getDisplayPhoto(userData.photo) ? (
                          <img src={getDisplayPhoto(userData.photo)} className="w-10 h-10 rounded-full object-cover border-2 border-green-500 hover:opacity-80 transition-opacity" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gray-200 flex flex-col items-center justify-center hover:bg-gray-300 transition-colors">
                            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                            <span className="text-[7px] text-gray-500 font-medium">add photo</span>
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="font-medium">{userData.name}</div>
                        <div className="text-sm text-gray-500">{userData.phone} • Parent (you)</div>
                      </div>
                      <span className="ml-auto text-green-600 text-sm">✓ Auto-added</span>
                    </div>
                  </div>

                  {/* Additional contacts */}
                  {emergencyData.map((contact, idx) => (
                    <div key={contact.id} className="p-4 bg-green-50 rounded-lg border-2 border-green-500 relative">
                      <button onClick={() => editContact(contact)} className="absolute top-3 right-3 text-blue-600 hover:text-blue-800 text-sm font-medium">Edit</button>
                      <div className="flex items-center gap-3">
                        <div onClick={() => setSummaryPhotoTarget({ type: 'ec', id: contact.id })} className="cursor-pointer flex-shrink-0">
                          {getDisplayPhoto(contact.photo) ? (
                            <img src={getDisplayPhoto(contact.photo)} className="w-10 h-10 rounded-full object-cover border-2 border-green-500 hover:opacity-80 transition-opacity" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gray-200 flex flex-col items-center justify-center hover:bg-gray-300 transition-colors">
                              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                              <span className="text-[7px] text-gray-500 font-medium">add photo</span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">{contact.name}</div>
                          <div className="text-sm text-gray-500">{contact.phone} • {contact.relationship === 'Other' && contact.otherRelationship ? `Other: ${contact.otherRelationship}` : contact.relationship}</div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {showAddContact ? (
                    <div className="border-2 border-dashed border-blue-300 rounded-lg p-4 bg-blue-50">
                      <h4 className="font-medium mb-3">{editingContactId ? 'Edit Emergency Contact' : 'Add Emergency Contact'}</h4>
                      <div className="space-y-3">
                        {/* Photo Upload */}
                        <div className="flex justify-center mb-2">
                          {getDisplayPhoto(newContact.photo) ? (
                            <div className="relative cursor-pointer" onClick={() => setShowContactPhotoModal(true)}>
                              <img src={getDisplayPhoto(newContact.photo)} className="w-16 h-16 rounded-full object-cover border-2 border-blue-500" />
                              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-600 rounded-full text-white flex items-center justify-center text-xs hover:bg-blue-700">✎</div>
                            </div>
                          ) : (
                            <div onClick={() => setShowContactPhotoModal(true)} className="w-16 h-16 rounded-full bg-gray-200 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-300">
                              <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                              <span className="text-[8px] text-gray-500 font-medium">add photo</span>
                            </div>
                          )}
                          {showContactPhotoModal && <PhotoUploadModal currentPhoto={newContact.photo} onSave={(img) => { setNewContact({ ...newContact, photo: img }); setShowContactPhotoModal(false); }} onCancel={() => setShowContactPhotoModal(false)} />}
                        </div>
                        <p className="text-xs text-gray-500 text-center -mt-1 mb-2">You can add a photo later, but a photo on this site or a photo ID at the time of pickup is required.</p>
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
                          <button onClick={addContact} disabled={!newContact.name || !newContact.phone || !newContact.relationship || (newContact.relationship === 'Other' && !newContact.otherRelationship)} className="flex-1 py-2 bg-blue-600 text-white rounded-lg disabled:bg-gray-300">{editingContactId ? 'Save Changes' : 'Add Contact'}</button>
                          <button onClick={() => { setShowAddContact(false); setEditingContactId(null); setNewContact({ name: '', phone: '', relationship: '', otherRelationship: '', photo: null }); setContactError(''); }} className="px-4 py-2 border rounded-lg">Cancel</button>
                          {editingContactId && (
                            <button onClick={() => removeContact(editingContactId)} className="px-4 py-2 text-red-600 border border-red-200 rounded-lg hover:bg-red-50">Delete</button>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => { setShowAddContact(true); setEditingContactId(null); setNewContact({ name: '', phone: '', relationship: '', otherRelationship: '', photo: null }); setContactError(''); }} className="w-full py-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-500 hover:text-blue-600">+ Add Emergency Contact</button>
                  )}

                  {/* Pending parent logins indicator */}
                  {pendingInvitations.length > 0 && (
                    <div className="bg-green-50 border-2 border-green-400 rounded-lg p-3 text-sm">
                      <strong className="text-green-800">Parent logins to be created:</strong>
                      {pendingInvitations.map((inv, i) => (
                        <div key={i} className="mt-1">
                          <span className="text-green-700">{inv.name} ({inv.email})</span>
                        </div>
                      ))}
                    </div>
                  )}

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
                          <button onClick={handleInviteAccept} className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium">
                            Create Login
                          </button>
                          <button onClick={handleInviteDismiss} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">
                            Skip Login
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              )}

              {/* Step 4: Policies */}
              {step === 4 && (
                <div className="space-y-6">
                  {/* Drop-off Policy Card */}
                  <div
                    onClick={() => !policiesAccepted.dropoff && setShowPolicyModal('dropoff')}
                    className={`border-2 rounded-lg p-4 ${policiesAccepted.dropoff ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-green-400 cursor-pointer'}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">📥</span>
                        <div>
                          <div className="font-medium">Drop-off Policy</div>
                          <div className="text-sm text-gray-500">
                            {policiesAccepted.dropoff ? 'Signed ✓' : 'Tap to read and sign'}
                          </div>
                        </div>
                      </div>
                      {policiesAccepted.dropoff
                        ? <span className="text-green-600 text-2xl font-bold">✓</span>
                        : <span className="text-gray-400 text-xl">→</span>}
                    </div>
                  </div>

                  {/* Pick-up Policy Card */}
                  <div
                    onClick={() => !policiesAccepted.pickup && setShowPolicyModal('pickup')}
                    className={`border-2 rounded-lg p-4 ${policiesAccepted.pickup ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-green-400 cursor-pointer'}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">📤</span>
                        <div>
                          <div className="font-medium">Pick-up Policy</div>
                          <div className="text-sm text-gray-500">
                            {policiesAccepted.pickup ? 'Signed ✓' : 'Tap to read and sign'}
                          </div>
                        </div>
                      </div>
                      {policiesAccepted.pickup
                        ? <span className="text-green-600 text-2xl font-bold">✓</span>
                        : <span className="text-gray-400 text-xl">→</span>}
                    </div>
                  </div>
                </div>
              )}

              {/* Policy Modal Overlay */}
              {showPolicyModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                  <div className="bg-white rounded-xl max-w-lg w-full max-h-[80vh] flex flex-col shadow-2xl">
                    <div className="px-6 py-4 rounded-t-xl bg-green-100">
                      <h3 className="font-bold text-lg">
                        {showPolicyModal === 'dropoff' ? '📥 Drop-off Policy' : '📤 Pick-up Policy'}
                      </h3>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6">
                      {showPolicyModal === 'pickup' && (
                        <div className="flex items-center justify-center gap-4 mb-5 py-3 bg-green-50 rounded-lg">
                          <div className="text-center">
                            <div className="w-16 h-16 mx-auto rounded-full bg-green-100 border-2 border-green-400 flex items-center justify-center overflow-hidden">
                              {content?.pickupPolicyFacePhoto ? (
                                <img src={content.pickupPolicyFacePhoto} className="w-full h-full object-cover" />
                              ) : (
                                <svg className="w-10 h-10 text-green-500" fill="currentColor" viewBox="0 0 24 24"><ellipse cx="12" cy="11" rx="8" ry="10" fill="none" stroke="#9CA3AF" strokeWidth="1.5"/><circle cx="9" cy="9" r="1.5" fill="#EF4444"/><circle cx="15" cy="9" r="1.5" fill="#EF4444"/><path d="M8.5 14.5Q12 17.5 15.5 14.5" fill="none" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round"/></svg>
                              )}
                            </div>
                            <div className="text-xs font-medium text-green-700 mt-1">Photo on site</div>
                          </div>
                          <div className="text-lg font-bold text-gray-400">OR</div>
                          <div className="text-center">
                            <div className="w-16 h-16 mx-auto rounded-lg bg-green-100 border-2 border-green-400 flex items-center justify-center overflow-hidden">
                              {content?.pickupPolicyIdPhoto ? (
                                <img src={content.pickupPolicyIdPhoto} className="w-full h-full object-cover" />
                              ) : (
                                <svg className="w-9 h-9 text-green-500" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2" /><circle cx="8" cy="11" r="2.5" /><line x1="13" y1="9" x2="20" y2="9" /><line x1="13" y1="12" x2="20" y2="12" /><line x1="13" y1="15" x2="18" y2="15" /></svg>
                              )}
                            </div>
                            <div className="text-xs font-medium text-green-700 mt-1">Photo ID</div>
                          </div>
                        </div>
                      )}
                      <pre className="whitespace-pre-wrap text-base text-gray-700 font-sans leading-relaxed">
                        {showPolicyModal === 'dropoff' ? DROPOFF_POLICY : PICKUP_POLICY}
                      </pre>
                    </div>
                    <div className="p-4 border-t flex gap-3">
                      <button
                        onClick={() => setShowPolicyModal(null)}
                        className="flex-1 py-3 border-2 border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          setPoliciesAccepted({ ...policiesAccepted, [showPolicyModal]: true });
                          setShowPolicyModal(null);
                        }}
                        className="flex-1 py-3 text-white font-bold rounded-lg bg-green-700 hover:bg-green-800"
                      >
                        I Agree & Sign
                      </button>
                    </div>
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
                    {step >= 4 ? 'Complete Setup' : 'Continue →'}
                  </button>
                </div>
                {/* Skip to Review & Complete option for steps 2-3 */}
                {step > 1 && step < 4 && (
                  <button
                    onClick={() => { setEditReturnStep(null); setStep(4); }}
                    className="w-full py-2 text-gray-500 hover:text-green-700 text-sm border border-gray-200 rounded-lg hover:border-green-300"
                  >
                    Skip to review & finish setup →
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    };

    // ==================== FOOD PHOTOS MANAGER ====================
    const FoodPhotosManager = ({ foodPhotos, getFoodPhoto, onSave }) => {
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

    // ==================== SITE PHOTOS MANAGER ====================
    const SitePhotosManager = ({ sitePhotos, onSave }) => {
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

    export function RooseveltCamp() {
      const _mountLogged = useRef(false);
      if (!_mountLogged.current) {
        console.log('⏱️ [INDEX] Step 4: React component mounting: ' + (performance.now() - (window.__t0 || 0)).toFixed(0) + 'ms');
        _mountLogged.current = true;
      }
      const getInitialPage = () => {
        // If there's a reset token in URL, go straight to login
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('reset')) return 'login';
        const hash = window.location.hash.replace('#', '');
        const validPages = ['home', 'schedule', 'pricing', 'location', 'counselors', 'login'];
        return validPages.includes(hash) ? hash : 'home';
      };
      const [page, setPage] = useState(getInitialPage());
      const [user, setUser] = useState(null);
      const [toast, setToast] = useState(null);
      const [loading, setLoading] = useState(true);
      const [showBanner, setShowBanner] = useState(false);
      const [transitioning, setTransitioning] = useState(false); // Global transition state for login/registration
      const [backgroundLoaded, setBackgroundLoaded] = useState(false); // Phase 2 data loaded
      
      const [content, setContent] = useState(DEFAULT_CONTENT);
      const [counselors, setCounselors] = useState(DEFAULT_COUNSELORS);
      const [registrations, setRegistrations] = useState([]);
      const [parents, setParents] = useState([]);
      const [counselorUsers, setCounselorUsers] = useState([]);
      const [availability, setAvailability] = useState({});
      const [changeHistory, setChangeHistory] = useState([]);
      const [messages, setMessages] = useState([]);
      const [admins, setAdmins] = useState(DEFAULT_ADMINS);
      const [assignments, setAssignments] = useState({}); // { "date_session": { counselorId: [childId, ...] } }
      const [campers, setCampers] = useState([]); // Standalone campers collection
      const [camperParentLinks, setCamperParentLinks] = useState([]); // { camperId, parentEmail } associations
      const [foodPhotos, setFoodPhotos] = useState({}); // Admin-uploadable food photos { snack_fruit: base64, ... }
      const [sitePhotos, setSitePhotos] = useState({}); // Site-wide photos { hero, dropoff, layups, lunch }

      // New state for onboarding system
      const [emergencyContacts, setEmergencyContacts] = useState([]); // Emergency contact records
      const [onboardingProgress, setOnboardingProgress] = useState({}); // { email: { step, complete, ... } }
      const [pendingCounselors, setPendingCounselors] = useState([]); // Counselors awaiting admin approval
      const [availabilityChangeRequests, setAvailabilityChangeRequests] = useState([]); // Counselor availability change requests
      const [profileChangeRequests, setProfileChangeRequests] = useState([]); // Counselor profile change requests
      const [blockedSessions, setBlockedSessions] = useState({}); // { date: { morning: bool, afternoon: bool } }
      const [counselorSchedule, setCounselorSchedule] = useState({}); // { counselorId: { date: { morning: bool, afternoon: bool } } }

      const [adminTab, setAdminTab] = useState('dashboard');
      const [parentTab, setParentTab] = useState('dashboard');
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

      const isDevEnv = isDev();
      const showToast = useCallback((msg, type = 'success') => setToast({ msg, type }), []);
      const sessionCost = getSessionCost(content);

      // Performance: log once when page becomes interactive (loading finished)
      const _paintLogged = useRef(false);
      useEffect(() => {
        if (!loading && !_paintLogged.current) {
          _paintLogged.current = true;
          requestAnimationFrame(() => {
            console.log('⏱️ [INDEX] Step 7: First paint complete: ' + (performance.now() - (window.__t0 || 0)).toFixed(0) + 'ms');
            console.log('⏱️ [INDEX] ====== TOTAL TIME TO INTERACTIVE: ' + (performance.now() - (window.__t0 || 0)).toFixed(0) + 'ms ======');
          });
        }
      }, [loading]);

      // Scroll to top on page navigation so red ribbon is visible
      useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, [page]);

      useEffect(() => {
        const load = async () => {
          setLoading(true);
          // Safety timeout: show page with defaults after 5 seconds even if DB is slow/down
          const safetyTimer = setTimeout(() => {
            setLoading(false);
            console.warn('⏱️ [TIMEOUT] Database took too long — showing page with default content');
          }, 5000);
          try {
            // Phase 1: Load only the 4 tables needed for public pages (Home, Schedule, Pricing, Location, Counselors)
            const [cd, cs, sp, fp] = await Promise.all([
              storage.get('camp_content'),
              storage.get('camp_counselors'),
              storage.get('camp_site_photos'),
              storage.get('camp_food_photos'),
            ]);
            if (cd?.[0]?.data) setContent({ ...DEFAULT_CONTENT, ...cd[0].data });
            if (cs?.length) setCounselors(cs.map(c => c.data).filter(Boolean).sort((a, b) => (a.order || 0) - (b.order || 0)));
            if (sp?.[0]?.data) setSitePhotos(sp[0].data);
            if (fp?.[0]?.data) setFoodPhotos(fp[0].data);
          } catch (e) { console.error('Phase 1 load error:', e); }
          clearTimeout(safetyTimer);
          console.log('⏱️ [INDEX] Step 5: Phase 1 DB loaded (4 tables): ' + (performance.now() - (window.__t0 || 0)).toFixed(0) + 'ms');
          setLoading(false);

          // Phase 2: Load remaining 16 tables in background (needed for login, onboarding, admin)
          try {
            const [rg, pr, cu, av, ch, ms, ad, as2, cp, cpl, ec, op, acr, pcr, bs, csch] = await Promise.all([
              storage.get('camp_registrations'),
              storage.get('camp_parents'),
              storage.get('camp_counselor_users'),
              storage.get('camp_counselor_availability'),
              storage.get('camp_change_history'),
              storage.get('camp_messages'),
              storage.get('camp_admins'),
              storage.get('camp_assignments'),
              storage.get('camp_campers'),
              storage.get('camp_camper_parent_links'),
              storage.get('camp_emergency_contacts'),
              storage.get('camp_onboarding_progress'),
              storage.get('camp_availability_change_requests'),
              storage.get('camp_profile_change_requests'),
              storage.get('camp_blocked_sessions'),
              storage.get('camp_counselor_schedule'),
            ]);
            if (rg?.length) setRegistrations(rg.map(r => r.data).filter(Boolean));
            if (pr?.[0]?.data) setParents(Array.isArray(pr[0].data) ? pr[0].data : []);
            if (cu?.[0]?.data) setCounselorUsers(Array.isArray(cu[0].data) ? cu[0].data : []);
            if (av?.[0]?.data) setAvailability(av[0].data);
            if (ch?.[0]?.data) setChangeHistory(Array.isArray(ch[0].data) ? ch[0].data : []);
            if (ms?.length) setMessages(ms.map(m => m.data).filter(Boolean));
            if (ad?.[0]?.data) setAdmins(Array.isArray(ad[0].data) ? ad[0].data : DEFAULT_ADMINS);
            if (as2?.[0]?.data) setAssignments(as2[0].data);
            if (cp?.[0]?.data) setCampers(Array.isArray(cp[0].data) ? cp[0].data : []);
            if (cpl?.[0]?.data) setCamperParentLinks(Array.isArray(cpl[0].data) ? cpl[0].data : []);
            if (ec?.[0]?.data) setEmergencyContacts(Array.isArray(ec[0].data) ? ec[0].data : []);
            if (op?.[0]?.data) setOnboardingProgress(op[0].data || {});
            if (acr?.[0]?.data) setAvailabilityChangeRequests(Array.isArray(acr[0].data) ? acr[0].data : []);
            if (pcr?.[0]?.data) setProfileChangeRequests(Array.isArray(pcr[0].data) ? pcr[0].data : []);
            if (bs?.[0]?.data) setBlockedSessions(typeof bs[0].data === 'object' && !Array.isArray(bs[0].data) ? bs[0].data : {});
            if (csch?.[0]?.data) setCounselorSchedule(typeof csch[0].data === 'object' && !Array.isArray(csch[0].data) ? csch[0].data : {});
          } catch (e) { console.error('Phase 2 load error:', e); }
          console.log('⏱️ [INDEX] Step 6: Phase 2 DB loaded (16 tables): ' + (performance.now() - (window.__t0 || 0)).toFixed(0) + 'ms — all data ready');
          setBackgroundLoaded(true);
        };
        load();
      }, []);

      // Hash-based page routing — allows dashboard links like /index.html#schedule
      useEffect(() => {
        const handleHash = () => {
          const hash = window.location.hash.replace('#', '');
          const validPages = ['home', 'schedule', 'pricing', 'location', 'counselors', 'login'];
          if (validPages.includes(hash)) setPage(hash);
        };
        window.addEventListener('hashchange', handleHash);
        return () => window.removeEventListener('hashchange', handleHash);
      }, []);

      const addToHistory = useCallback(async (action, details, relatedEmails = []) => {
        const entry = {
          id: Date.now(),
          timestamp: new Date().toISOString(),
          action,
          details,
          ...(relatedEmails.length > 0 ? { relatedEmails } : {})
        };
        const newHistory = [entry, ...changeHistory].slice(0, 500);
        setChangeHistory(newHistory);
        await storage.set('camp_change_history', 'main', newHistory);
      }, [changeHistory]);

      const saveContent = async (c, field = null) => {
        setContent(c);
        await storage.set('camp_content', 'main', c);
        if (field) {
          addToHistory('Content Updated', `Changed "${field}"`);
        }
        showToast('Saved!');
      };

      const saveCounselors = async (cs, action = null) => {
        // Upload any new base64 counselor photos to Storage CDN
        for (const c of cs) {
          if (c.photo && !photoStorage.isUrl(c.photo)) {
            const url = await photoStorage.uploadPhoto('counselors', c.id, c.photo);
            if (url) c.photo = url;
          }
        }
        setCounselors(cs);
        for (const c of cs) await storage.set('camp_counselors', c.id, c);
        if (action) addToHistory('Counselor', action);
        showToast('Saved!');
      };

      const deleteCounselor = async (counselorId, counselorName) => {
        // Remove from state
        const updated = counselors.filter(c => c.id !== counselorId).map((c, i) => ({ ...c, order: i }));
        setCounselors(updated);
        // Remove from database
        try {
          await supabase.from('camp_counselors').delete().eq('id', counselorId);
        } catch (e) { console.error('Error deleting counselor:', e); }
        // Clean up assignments that reference this counselor
        const cleanedAssignments = { ...assignments };
        Object.keys(cleanedAssignments).forEach(key => {
          if (cleanedAssignments[key][counselorId]) {
            delete cleanedAssignments[key][counselorId];
          }
        });
        await saveAssignments(cleanedAssignments);
        // Clean up availability
        const cleanedAvail = { ...availability };
        if (cleanedAvail[counselorId]) {
          delete cleanedAvail[counselorId];
          await saveAvail(cleanedAvail);
        }
        addToHistory('Counselor', `Deleted counselor ${counselorName}`);
        showToast('Counselor deleted');
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

      const saveCounselorUsers = async (cu, action = null) => {
        setCounselorUsers(cu);
        await storage.set('camp_counselor_users', 'main', cu);
        if (action) addToHistory('Counselor User', action);
      };

      const deleteParent = async (parentEmail, parentName) => {
        // Remove from parents state
        const updatedParents = parents.filter(p => p.email !== parentEmail);
        setParents(updatedParents);
        await storage.set('camp_parents', 'main', updatedParents);
        // Remove camper-parent links for this parent
        const updatedLinks = camperParentLinks.filter(l => l.parentEmail !== parentEmail);
        setCamperParentLinks(updatedLinks);
        await storage.set('camp_camper_parent_links', 'main', updatedLinks);
        // Note: We don't delete registrations - they're historical records
        addToHistory('Parent', `Deleted parent ${parentName}`);
        showToast('Parent deleted');
      };
      const saveAvail = async (a) => { setAvailability(a); await storage.set('camp_counselor_availability', 'main', a); };
      const saveAdmins = async (a, action = null) => {
        setAdmins(a);
        await storage.set('camp_admins', 'main', a);
        if (action) addToHistory('Admin', action);
      };
      const saveAssignments = async (a, action = null) => {
        setAssignments(a);
        await storage.set('camp_assignments', 'main', a);
        if (action) addToHistory('Assignment', action);
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
      const saveFoodPhotos = async (photos) => {
        // Upload any new base64 photos to Storage CDN
        const uploaded = { ...photos };
        for (const [key, val] of Object.entries(uploaded)) {
          if (val && !photoStorage.isUrl(val)) {
            const url = await photoStorage.uploadPhoto('food', key, val);
            if (url) uploaded[key] = url;
          }
        }
        setFoodPhotos(uploaded);
        await storage.set('camp_food_photos', 'main', uploaded);
        addToHistory('Content', 'Updated food photos');
        showToast('Photo updated!');
      };

      const saveSitePhotos = async (photos, photoName = null) => {
        // Upload any new base64 photos to Storage CDN
        const uploaded = { ...photos };
        for (const [key, val] of Object.entries(uploaded)) {
          if (val && !photoStorage.isUrl(val)) {
            const url = await photoStorage.uploadPhoto('site', key, val);
            if (url) uploaded[key] = url;
          }
        }
        setSitePhotos(uploaded);
        await storage.set('camp_site_photos', 'main', uploaded);
        if (photoName) addToHistory('Content', `Updated ${photoName} photo`);
        showToast('Photo updated!');
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

      const saveBlockedSessions = async (sessions, action = null) => {
        setBlockedSessions(sessions);
        await storage.set('camp_blocked_sessions', 'main', sessions);
        if (action) addToHistory('Sessions', action);
      };

      const saveCounselorSchedule = async (schedule, action = null) => {
        setCounselorSchedule(schedule);
        await storage.set('camp_counselor_schedule', 'main', schedule);
        if (action) addToHistory('Counselor Schedule', action);
      };

      // Helper to check if a counselor is scheduled to work a session
      const isCounselorScheduled = (counselorId, date, session) => {
        return counselorSchedule[counselorId]?.[date]?.[session] === true;
      };

      // Helper to check if a session is blocked
      const isSessionBlocked = (date, session) => {
        return blockedSessions[date]?.[session] === true;
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

      const saveOnboardingProgress = async (progress) => {
        setOnboardingProgress(progress);
        await storage.set('camp_onboarding_progress', 'main', progress);
      };

      const saveAvailabilityChangeRequests = async (requests, action = null) => {
        setAvailabilityChangeRequests(requests);
        await storage.set('camp_availability_change_requests', 'main', requests);
        if (action) addToHistory('Availability', action);
      };

      const saveProfileChangeRequests = async (requests, action = null) => {
        setProfileChangeRequests(requests);
        await storage.set('camp_profile_change_requests', 'main', requests);
        if (action) addToHistory('Profile', action);
      };

      const saveMessage = async (msg) => {
        const newMsgs = [...messages, msg];
        setMessages(newMsgs);
        await storage.set('camp_messages', msg.id, msg);
      };

      const markMessageRead = async (msgId, readerEmail) => {
        const updated = messages.map(m => {
          if (m.id === msgId && !m.readBy?.includes(readerEmail)) {
            return { ...m, readBy: [...(m.readBy || []), readerEmail] };
          }
          return m;
        });
        setMessages(updated);
        const msg = updated.find(m => m.id === msgId);
        if (msg) await storage.set('camp_messages', msg.id, msg);
      };

      const getUnreadCount = (email) => {
        return messages.filter(m =>
          (m.to === 'all' || m.to?.includes(email)) &&
          m.from !== email &&
          !m.readBy?.includes(email)
        ).length;
      };

      const getPending = () => registrations.filter(r => r.status === 'pending').length;
      const getApproved = () => registrations.filter(r => r.status === 'approved').length;
      const getCancelled = () => registrations.filter(r => r.status === 'cancelled' || r.status === 'rejected').length;
      const getUnpaid = () => registrations.filter(r => r.status === 'approved' && !['paid', 'confirmed'].includes(r.paymentStatus)).length;

      // ==================== NAV ====================
      const Nav = () => {
        const sessionUser = (() => { try { return JSON.parse(sessionStorage.getItem('user')); } catch { return null; } })();
        const dashUrl = sessionUser?.role === 'admin' ? '/admin.html' : sessionUser?.role === 'counselor' ? '/counselor.html' : '/parent.html';
        return (
          <nav className="bg-green-900 text-white shadow-lg">
            <div className="max-w-6xl mx-auto px-3 sm:px-4 py-3 sm:py-3 flex flex-wrap items-center justify-between gap-2">
              <div className="font-display text-xl sm:text-2xl cursor-pointer" onClick={() => setPage('home')} onDoubleClick={() => !isDevEnv && setShowBanner(p => !p)}>🏀 ROOSEVELT CAMP</div>
              <div className="flex flex-wrap gap-1.5 sm:gap-2 items-center">
                {['home', 'schedule', 'pricing', 'location', 'counselors'].map(p => (
                  <button key={p} onClick={() => setPage(p)} className={'px-3 sm:px-4 py-2.5 sm:py-2 rounded text-sm sm:text-base capitalize min-h-[44px] ' + (page === p ? 'bg-green-700' : 'hover:bg-green-800')}>{p}</button>
                ))}
                {sessionUser ? (
                  <a href={dashUrl} className="px-3 sm:px-4 py-2.5 sm:py-2 bg-green-600 hover:bg-green-500 rounded text-sm sm:text-base min-h-[44px] font-semibold inline-flex items-center">My Dashboard</a>
                ) : (
                  <button onClick={() => setPage('login')} className={'px-3 sm:px-4 py-2.5 sm:py-2 rounded text-sm sm:text-base min-h-[44px] ' + (page === 'login' ? 'bg-green-700' : 'hover:bg-green-800')}>Login</button>
                )}
              </div>
            </div>
          </nav>
        );
      };

      // ==================== HOME ====================
      // Helper to get cropped image (handles both old string format and new object format)
      const getSitePhoto = (key) => {
        const data = sitePhotos?.[key];
        if (!data) return null;
        return typeof data === 'string' ? data : data.cropped;
      };

      const Home = () => (
        <div className="w-full">
          {/* Hero Section with Large Background Image - Edge to Edge */}
          <div className="relative w-full min-h-[400px] sm:min-h-[500px] md:min-h-[600px] flex items-center justify-center overflow-hidden">
            {/* Background Image or Gradient Fallback */}
            {getSitePhoto('hero') ? (
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url(${getSitePhoto('hero')})` }}
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-green-800 to-green-900" />
            )}
            {/* Dark Overlay for Text Readability */}
            <div className="absolute inset-0 bg-black/40" />
            {/* Hero Content */}
            <div className="relative z-10 max-w-4xl mx-auto px-4 text-center text-white">
              <h1 className="font-display text-3xl sm:text-5xl md:text-7xl mb-3 sm:mb-4 drop-shadow-lg">{content.heroTitle}</h1>
              <h2 className="font-display text-xl sm:text-3xl md:text-5xl text-green-200 mb-3 sm:mb-4 drop-shadow-md">{content.heroSubtitle}</h2>
              <p className="text-base sm:text-xl md:text-2xl text-green-100 mb-6 sm:mb-8 drop-shadow">{content.heroTagline}</p>
              <button onClick={() => setPage('login')} className="bg-yellow-500 hover:bg-yellow-400 text-green-900 font-bold text-base sm:text-xl px-6 sm:px-8 py-3 sm:py-4 rounded-lg shadow-lg transform hover:scale-105 transition-transform">Register Now →</button>
            </div>
          </div>

          {/* Info Cards */}
          <div className="max-w-6xl mx-auto px-4 py-8 sm:py-12 grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
            <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 border-t-4 border-green-600">
              <div className="text-3xl sm:text-4xl mb-2">📅</div>
              <h3 className="font-bold text-lg sm:text-xl text-green-800">Camp Dates</h3>
              <p className="text-sm sm:text-base text-gray-700">{content.campDates}</p>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 border-t-4 border-yellow-500">
              <div className="text-3xl sm:text-4xl mb-2">⏰</div>
              <h3 className="font-bold text-lg sm:text-xl text-green-800">Sessions</h3>
              <p className="text-sm sm:text-base text-gray-700">AM: {content.sessionMorning}</p>
              <p className="text-sm sm:text-base text-gray-700">PM: {content.sessionAfternoon}</p>
              <p className="text-green-600 font-bold mt-2 text-sm sm:text-base">{content.sessionCost}/session</p>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 border-t-4 border-orange-500">
              <div className="text-3xl sm:text-4xl mb-2">👧</div>
              <h3 className="font-bold text-lg sm:text-xl text-green-800">Ages</h3>
              <p className="text-sm sm:text-base text-gray-700">{content.ageRange}</p>
            </div>
          </div>

          {/* Counselors Section - Large circular headshots */}
          <div className="bg-green-50 py-8 sm:py-12">
            <div className="max-w-6xl mx-auto px-4">
              <h2 className="font-display text-2xl sm:text-3xl md:text-4xl text-green-800 text-center mb-6 sm:mb-8">Our Counselors</h2>
              <div className="flex flex-wrap justify-center gap-6 sm:gap-8 md:gap-10">
                {counselors.filter(c => c.visible).map(c => (
                  <div key={c.id} className="text-center">
                    {getDisplayPhoto(c.photo) ? (
                      <img src={getDisplayPhoto(c.photo)} className="w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 rounded-full object-cover shadow-lg border-4 border-white mx-auto" alt={c.name} />
                    ) : (
                      <div className="w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 rounded-full bg-gray-200 flex flex-col items-center justify-center shadow-lg border-4 border-white mx-auto">
                        <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                        <span className="text-xs text-gray-500 font-medium">add photo</span>
                      </div>
                    )}
                    <h3 className="font-bold text-sm sm:text-base md:text-lg text-green-800 mt-3">{c.name}</h3>
                    <p className="text-green-600 text-xs sm:text-sm">{c.position}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Drop-off Photo Section */}
          {getSitePhoto('dropoff') && (
            <div className="bg-green-50 py-12">
              <div className="max-w-6xl mx-auto px-4">
                <div className="grid md:grid-cols-2 gap-8 items-center">
                  <div>
                    <img
                      src={getSitePhoto('dropoff')}
                      alt="Camp drop-off"
                      className="w-full object-cover rounded-2xl shadow-xl"
                      style={{ aspectRatio: '4/3' }}
                    />
                  </div>
                  <div>
                    <h2 className="font-display text-3xl text-green-800 mb-4">Easy Pick-up & Drop-off</h2>
                    <p className="text-gray-700 text-lg mb-4">Our convenient location at Roosevelt High School makes drop-off and pick-up a breeze. Counselors greet every camper at the gym entrance.</p>
                    <ul className="space-y-2 text-gray-600">
                      <li className="flex items-center gap-2"><span className="text-green-600">✓</span> Morning drop-off: 8:45 - 9:00 AM</li>
                      <li className="flex items-center gap-2"><span className="text-green-600">✓</span> Afternoon drop-off: 11:45 AM - 12:00 PM</li>
                      <li className="flex items-center gap-2"><span className="text-green-600">✓</span> Safe, supervised transitions</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* About Section */}
          <div className="bg-gray-50 py-12">
            <div className="max-w-4xl mx-auto px-4 text-center">
              <h2 className="font-display text-4xl text-green-800 mb-6">About Our Camp</h2>
              <p className="text-gray-700 text-lg">{content.aboutText}</p>
            </div>
          </div>

          {/* Skills Training Photo Section */}
          {getSitePhoto('layups') && (
            <div className="py-12">
              <div className="max-w-6xl mx-auto px-4">
                <div className="grid md:grid-cols-2 gap-8 items-center">
                  <div className="order-2 md:order-1">
                    <h2 className="font-display text-3xl text-green-800 mb-4">Skills Training with Expert Coaches</h2>
                    <p className="text-gray-700 text-lg mb-4">Our counselors work one-on-one and in small groups to develop fundamental basketball skills. Every camper gets personalized attention.</p>
                    <ul className="space-y-2 text-gray-600">
                      <li className="flex items-center gap-2"><span className="text-green-600">✓</span> Layups, shooting, and ball handling</li>
                      <li className="flex items-center gap-2"><span className="text-green-600">✓</span> Age-appropriate drills</li>
                      <li className="flex items-center gap-2"><span className="text-green-600">✓</span> 5:1 camper-to-counselor ratio</li>
                    </ul>
                  </div>
                  <div className="order-1 md:order-2">
                    <img
                      src={getSitePhoto('layups')}
                      alt="Layups practice"
                      className="w-full object-cover rounded-2xl shadow-xl"
                      style={{ aspectRatio: '4/3' }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Lunch Photo Section */}
          {getSitePhoto('lunch') && (
            <div className="bg-amber-50 py-12">
              <div className="max-w-6xl mx-auto px-4">
                <div className="grid md:grid-cols-2 gap-8 items-center">
                  <div>
                    <img
                      src={getSitePhoto('lunch')}
                      alt="Campers eating lunch"
                      className="w-full object-cover rounded-2xl shadow-xl"
                      style={{ aspectRatio: '4/3' }}
                    />
                  </div>
                  <div>
                    <h2 className="font-display text-3xl text-green-800 mb-4">Lunch & Snack Time</h2>
                    <p className="text-gray-700 text-lg mb-4">Campers enjoy healthy snacks and lunch breaks together, building friendships on and off the court.</p>
                    <ul className="space-y-2 text-gray-600">
                      <li className="flex items-center gap-2"><span className="text-green-600">✓</span> Healthy snacks provided</li>
                      <li className="flex items-center gap-2"><span className="text-green-600">✓</span> Water and sports drinks available</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Contact Footer */}
          <div className="bg-green-900 text-white py-8 sm:py-12 text-center px-4">
            <h2 className="font-display text-2xl sm:text-3xl md:text-4xl mb-4 sm:mb-6">Contact Us</h2>
            <p className="text-base sm:text-lg md:text-xl break-words">{content.contactEmail}</p>
            <p className="text-base sm:text-lg md:text-xl">{content.contactPhone}</p>
            <p className="mt-3 sm:mt-4 text-green-200 whitespace-pre-line text-sm sm:text-base">{content.locationAddress}</p>
          </div>
        </div>
      );

      // ==================== SCHEDULE ====================
      const DEFAULT_FOOD_PHOTOS = {
        snack_fruit: 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=150&h=150&fit=crop',
        snack_granola: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=150&h=150&fit=crop',
        snack_cheese: 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=150&h=150&fit=crop',
        snack_veggie: 'https://images.unsplash.com/photo-1640719028782-8230f1bdc5d1?w=150&h=150&fit=crop',
        drink_water: 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=150&h=150&fit=crop',
        drink_gatorade: 'https://images.unsplash.com/photo-1622543925917-763c34d1a86e?w=150&h=150&fit=crop',
        drink_orange: 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=150&h=150&fit=crop',
        drink_apple: 'https://images.unsplash.com/photo-1576673442511-7e39b6545c87?w=150&h=150&fit=crop'
      };
      const getFoodPhoto = (key) => foodPhotos[key] || DEFAULT_FOOD_PHOTOS[key] || '';
      const Schedule = () => (
        <div className="min-h-screen bg-amber-50 py-8 sm:py-12">
          <div className="max-w-4xl mx-auto px-4">
            <h1 className="font-display text-2xl sm:text-3xl md:text-4xl text-green-800 text-center mb-6 sm:mb-8">Camp Schedule</h1>

            {/* Sessions */}
            <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 mb-6">
              <h2 className="font-bold text-lg sm:text-xl text-green-800 mb-4">Daily Sessions</h2>
              <div className="grid sm:grid-cols-2 gap-4 mb-6">
                <div className="p-4 bg-yellow-50 rounded-lg border-l-4 border-yellow-500">
                  <h3 className="font-bold text-yellow-700">🌅 Morning Session</h3>
                  <p className="text-base sm:text-lg">{content.sessionMorning}</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                  <h3 className="font-bold text-blue-700">☀️ Afternoon Session</h3>
                  <p className="text-base sm:text-lg">{content.sessionAfternoon}</p>
                </div>
              </div>
              <p className="text-gray-700 font-medium">{content.campDates}</p>
              <p className="text-sm text-gray-500 mt-2">Camp runs Monday through Friday.</p>
              <button onClick={() => setPage('pricing')} className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm">View Pricing →</button>
            </div>

            {/* Basketball Training Focus */}
            <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 mb-6">
              <h2 className="font-bold text-lg sm:text-xl text-green-800 mb-4">🏀 Basketball Training Focus</h2>
              <p className="text-gray-700 mb-4">Each session includes a variety of basketball drills and activities designed to build fundamental skills and game experience:</p>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="p-3 bg-orange-50 rounded-lg border-l-4 border-orange-400">
                  <h3 className="font-bold text-orange-800 text-sm mb-1">🎯 Shooting Form</h3>
                  <p className="text-gray-600 text-sm">Proper technique, follow-through, and free throws</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                  <h3 className="font-bold text-blue-800 text-sm mb-1">🏃 Layups</h3>
                  <p className="text-gray-600 text-sm">Footwork, finishing with both hands, and coordination</p>
                </div>
                <div className="p-3 bg-purple-50 rounded-lg border-l-4 border-purple-400">
                  <h3 className="font-bold text-purple-800 text-sm mb-1">⚡ Dribbling</h3>
                  <p className="text-gray-600 text-sm">Ball control, speed dribbles, and ball handling drills</p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg border-l-4 border-green-400">
                  <h3 className="font-bold text-green-800 text-sm mb-1">🤝 Passing</h3>
                  <p className="text-gray-600 text-sm">Chest passes, bounce passes, and court awareness</p>
                </div>
                <div className="p-3 bg-red-50 rounded-lg border-l-4 border-red-400">
                  <h3 className="font-bold text-red-800 text-sm mb-1">🛡️ Defense</h3>
                  <p className="text-gray-600 text-sm">Stance, positioning, and defensive fundamentals</p>
                </div>
                <div className="p-3 bg-yellow-50 rounded-lg border-l-4 border-yellow-400">
                  <h3 className="font-bold text-yellow-800 text-sm mb-1">🏆 Scrimmages</h3>
                  <p className="text-gray-600 text-sm">Apply skills in game situations and team play</p>
                </div>
              </div>
            </div>

            {/* Lunch & Snacks */}
            <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 mb-6">
              <h2 className="font-bold text-lg sm:text-xl text-green-800 mb-4">🍎 Lunch & Snacks</h2>

              {/* Lunch Info */}
              <div className="p-4 bg-orange-50 rounded-lg border border-orange-200 mb-6">
                <h3 className="font-bold text-orange-800 mb-2">🍽️ Bring Your Own Lunch</h3>
                <p className="text-gray-700">
                  Campers attending both morning and afternoon sessions should bring their own lunch. We have a supervised lunch break between sessions where kids can eat together.
                </p>
              </div>

              {/* Snacks Provided */}
              <div className="mb-6">
                <h3 className="font-bold text-lg text-green-700 mb-3">✨ Snacks Provided</h3>
                <p className="text-gray-700 mb-4">
                  We provide healthy snacks to keep campers energized! If your child needs extra snacks, we're happy to help.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                  <div className="text-center">
                    <img src={getFoodPhoto('snack_fruit')} alt="Fresh fruits" className="w-full aspect-square object-cover rounded-xl mb-2 shadow-md"
                      onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/300x300/22c55e/white?text=🍎'; }} />
                    <span className="text-xs sm:text-sm font-medium text-gray-700">Fresh Fruit</span>
                  </div>
                  <div className="text-center">
                    <img src={getFoodPhoto('snack_granola')} alt="Granola bars" className="w-full aspect-square object-cover rounded-xl mb-2 shadow-md"
                      onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/300x300/f59e0b/white?text=🥜'; }} />
                    <span className="text-xs sm:text-sm font-medium text-gray-700">Granola Bars</span>
                  </div>
                  <div className="text-center">
                    <img src={getFoodPhoto('snack_cheese')} alt="Cheese and crackers" className="w-full aspect-square object-cover rounded-xl mb-2 shadow-md"
                      onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/300x300/fbbf24/white?text=🧀'; }} />
                    <span className="text-xs sm:text-sm font-medium text-gray-700">Cheese & Crackers</span>
                  </div>
                  <div className="text-center">
                    <img src={getFoodPhoto('snack_veggie')} alt="Veggie sticks" className="w-full aspect-square object-cover rounded-xl mb-2 shadow-md"
                      onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/300x300/84cc16/white?text=🥕'; }} />
                    <span className="text-xs sm:text-sm font-medium text-gray-700">Veggie Sticks</span>
                  </div>
                </div>
              </div>

              {/* Drinks */}
              <div>
                <h3 className="font-bold text-lg text-blue-700 mb-3">🥤 Beverages</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                  <div className="text-center p-3 sm:p-4 bg-blue-50 rounded-xl">
                    <img src={getFoodPhoto('drink_water')} alt="Water bottles" className="w-full aspect-square object-cover rounded-xl mb-2 shadow-md"
                      onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/300x300/3b82f6/white?text=💧'; }} />
                    <span className="text-xs sm:text-sm font-medium text-gray-700">Water</span>
                  </div>
                  <div className="text-center p-3 sm:p-4 bg-green-50 rounded-xl">
                    <img src={getFoodPhoto('drink_gatorade')} alt="Gatorade" className="w-full aspect-square object-cover rounded-xl mb-2 shadow-md"
                      onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/300x300/22c55e/white?text=⚡'; }} />
                    <span className="text-xs sm:text-sm font-medium text-gray-700">Gatorade</span>
                  </div>
                  <div className="text-center p-3 sm:p-4 bg-orange-50 rounded-xl">
                    <img src={getFoodPhoto('drink_orange')} alt="Orange juice" className="w-full aspect-square object-cover rounded-xl mb-2 shadow-md"
                      onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/300x300/f97316/white?text=🍊'; }} />
                    <span className="text-xs sm:text-sm font-medium text-gray-700">Orange Juice</span>
                  </div>
                  <div className="text-center p-3 sm:p-4 bg-red-50 rounded-xl">
                    <img src={getFoodPhoto('drink_apple')} alt="Apple juice" className="w-full aspect-square object-cover rounded-xl mb-2 shadow-md"
                      onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/300x300/ef4444/white?text=🍎'; }} />
                    <span className="text-xs sm:text-sm font-medium text-gray-700">Apple Juice</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      );

      // ==================== PRICING PAGE ====================
      const Pricing = () => (
        <div className="min-h-screen bg-amber-50 py-8 sm:py-12">
          <div className="max-w-4xl mx-auto px-4">
            <h1 className="font-display text-2xl sm:text-3xl md:text-4xl text-green-800 text-center mb-6 sm:mb-8">💰 Pricing & Registration</h1>

            {/* Session Pricing */}
            <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 mb-6">
              <h2 className="font-bold text-lg sm:text-xl text-green-800 mb-4">Session Pricing</h2>
              <div className="grid sm:grid-cols-2 gap-4 mb-6">
                <div className="p-4 bg-yellow-50 rounded-lg border-l-4 border-yellow-500">
                  <h3 className="font-bold text-yellow-700">🌅 Morning Session</h3>
                  <p className="text-base sm:text-lg">{content.sessionMorning}</p>
                  <p className="text-green-600 font-bold text-lg">${content.singleSessionCost || 60}/session</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                  <h3 className="font-bold text-blue-700">☀️ Afternoon Session</h3>
                  <p className="text-base sm:text-lg">{content.sessionAfternoon}</p>
                  <p className="text-green-600 font-bold text-lg">${content.singleSessionCost || 60}/session</p>
                </div>
              </div>
            </div>

            {/* Discounts */}
            <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 mb-6">
              <h2 className="font-bold text-lg sm:text-xl text-green-800 mb-4">🎉 Discounts</h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span>Single Session</span>
                  <span className="font-bold">${content.singleSessionCost || 60}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg border border-green-200">
                  <div>
                    <span className="font-medium">Full Week (10 sessions)</span>
                    <span className="ml-2 text-green-600 text-sm">Save {content.weekDiscount || 10}%!</span>
                  </div>
                  <span className="font-bold text-green-700">${Math.round((content.singleSessionCost || 60) * 10 * (1 - (content.weekDiscount || 10) / 100))}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-green-100 rounded-lg border border-green-300">
                  <div>
                    <span className="font-medium">2+ Weeks</span>
                    <span className="ml-2 text-green-700 text-sm">Save {content.multiWeekDiscount || 15}%!</span>
                  </div>
                  <span className="font-bold text-green-800">{content.multiWeekDiscount || 15}% off total</span>
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-4">Discounts applied automatically at checkout.</p>
            </div>

            {/* Scholarship */}
            <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 mb-6">
              <h2 className="font-bold text-lg sm:text-xl text-purple-800 mb-4">💜 Scholarship Assistance</h2>
              <p className="text-gray-700">{content.scholarshipInfo}</p>
              <button onClick={() => setPage('login')} className="mt-4 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">Apply for Scholarship</button>
            </div>

            {/* Policies */}
            <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
              <h2 className="font-bold text-lg sm:text-xl text-green-800 mb-4">📋 Policies</h2>
              <div className="space-y-3">
                <div className="p-3 bg-red-50 rounded-lg border-l-4 border-red-400">
                  <h3 className="font-bold text-red-800 text-sm">🚫 Cancellations</h3>
                  <p className="text-gray-700 text-sm">Cancel 14+ days ahead for full refund. Later cancellations may receive credit for future sessions.</p>
                </div>
                <div className="p-3 bg-orange-50 rounded-lg border-l-4 border-orange-400">
                  <h3 className="font-bold text-orange-800 text-sm">⏰ Late Pickup</h3>
                  <p className="text-gray-700 text-sm">Please pick up on time - our volunteer counselors have commitments after camp. Call if you'll be late.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      );

      // ==================== LOCATION PAGE ====================
      const Location = () => {
        const fullAddress = `${content.locationAddress}, ${content.locationCity}, ${content.locationState} ${content.locationZip}`;
        const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(content.locationName + ' ' + fullAddress)}`;
        const mapsEmbedUrl = `https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${encodeURIComponent(content.locationName + ' ' + fullAddress)}`;

        return (
          <div className="min-h-screen bg-amber-50 py-12">
            <div className="max-w-4xl mx-auto px-4">
              <h1 className="font-display text-4xl text-green-800 text-center mb-8">📍 Camp Location</h1>

              {/* Location Card */}
              <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-6">
                {/* Map */}
                <div className="h-64 bg-gray-200 relative">
                  <iframe
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    style={{ border: 0 }}
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2685.4!2d-122.3149!3d47.6776!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x54901456b6563b6b%3A0xec8758cec9df5e58!2sRoosevelt%20High%20School!5e0!3m2!1sen!2sus"
                    allowFullScreen
                    referrerPolicy="no-referrer-when-downgrade"
                    loading="lazy"
                  />
                </div>

                {/* Details */}
                <div className="p-6">
                  <h2 className="font-display text-3xl text-green-800 mb-2">{content.locationName || 'Roosevelt High School'}</h2>

                  <div className="space-y-3 mb-6">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">🏫</span>
                      <div>
                        <p className="font-medium">{content.locationAddress || '1410 NE 66th St'}</p>
                        <p className="text-gray-600">{content.locationCity || 'Seattle'}, {content.locationState || 'WA'} {content.locationZip || '98115'}</p>
                      </div>
                    </div>

                    {content.locationDetails && (
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">ℹ️</span>
                        <p className="text-gray-700">{content.locationDetails}</p>
                      </div>
                    )}
                  </div>

                  {/* Copy-friendly address box */}
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <p className="text-sm text-gray-500 mb-2">📋 Copy this address for GPS/Maps:</p>
                    <p className="font-mono text-gray-800 select-all">{fullAddress}</p>
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-3">
                    <a
                      href={mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 min-w-[200px] py-3 bg-blue-600 text-white rounded-lg text-center font-medium hover:bg-blue-700"
                    >
                      🗺️ Open in Google Maps
                    </a>
                    <a
                      href={`https://maps.apple.com/?q=${encodeURIComponent(fullAddress)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 min-w-[200px] py-3 bg-gray-800 text-white rounded-lg text-center font-medium hover:bg-gray-900"
                    >
                      🍎 Open in Apple Maps
                    </a>
                  </div>
                </div>
              </div>

              {/* Parking & Directions */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="font-bold text-xl text-green-800 mb-4">🚗 Parking & Drop-off</h2>
                <div className="space-y-3 text-gray-700">
                  <p>• <strong>Parking:</strong> Free parking is available in the school parking lot off NE 66th St.</p>
                  <p>• <strong>Drop-off:</strong> Please drop off campers at the main gymnasium entrance on the east side of the building.</p>
                  <p>• <strong>Pick-up:</strong> Campers should be picked up at the same location promptly at the end of their session.</p>
                </div>
              </div>
            </div>
          </div>
        );
      };

      // ==================== COUNSELORS PAGE ====================
      const Counselors = () => (
        <div className="min-h-screen bg-amber-50 py-8 sm:py-12">
          <div className="max-w-6xl mx-auto px-4">
            <h1 className="font-display text-2xl sm:text-3xl md:text-4xl text-green-800 text-center mb-6 sm:mb-8">Our Counselors</h1>
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
              {counselors.filter(c => c.visible).map(c => (
                <div key={c.id} className="bg-white rounded-xl shadow-lg overflow-hidden">
                  <div className="pt-4 sm:pt-6 flex items-center justify-center">
                    {getDisplayPhoto(c.photo) ? <img src={getDisplayPhoto(c.photo)} className="w-28 h-28 sm:w-48 sm:h-48 rounded-full object-cover border-4 border-green-600 shadow-lg" /> : <div className="w-28 h-28 sm:w-48 sm:h-48 rounded-full bg-gray-200 flex flex-col items-center justify-center border-4 border-green-600 shadow-lg"><svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg><span className="text-xs text-gray-500 font-medium">add photo</span></div>}
                  </div>
                  <div className="p-3 sm:p-4 text-center">
                    <h3 className="font-bold text-base sm:text-xl text-green-800">{c.name}</h3>
                    <p className="text-green-600 text-xs sm:text-base">{c.position} • {c.year}</p>
                    <p className="text-gray-600 text-xs sm:text-sm mt-1 sm:mt-2">{c.bio}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      );

      // ==================== ROLE SELECTOR ====================
      const RoleSelector = ({ onSelect, onBack }) => (
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 py-8 sm:py-12">
          <div className="max-w-lg mx-auto px-4">
            <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-8">
              <h2 className="font-display text-2xl sm:text-3xl text-green-800 text-center mb-2">Join Roosevelt Camp</h2>
              <p className="text-gray-600 text-center mb-6 sm:mb-8 text-sm sm:text-base">How would you like to participate?</p>

              <div className="space-y-3 sm:space-y-4">
                <button
                  onClick={() => onSelect('parent')}
                  className="w-full p-4 sm:p-6 border-2 border-gray-200 rounded-xl hover:border-green-500 hover:bg-green-50 transition-all text-left group"
                >
                  <div className="flex items-start gap-3 sm:gap-4">
                    <div className="text-3xl sm:text-4xl">👨‍👩‍👧</div>
                    <div>
                      <h3 className="font-bold text-lg sm:text-xl text-green-800 group-hover:text-green-600">I'm a Parent</h3>
                      <p className="text-gray-600 mt-1 text-sm sm:text-base">Register your children for basketball camp sessions</p>
                      <ul className="text-xs sm:text-sm text-gray-500 mt-2 space-y-1">
                        <li>• Add your children's profiles</li>
                        <li>• Set up emergency contacts</li>
                        <li>• Register for camp sessions</li>
                      </ul>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => onSelect('counselor')}
                  className="w-full p-4 sm:p-6 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all text-left group"
                >
                  <div className="flex items-start gap-3 sm:gap-4">
                    <div className="text-3xl sm:text-4xl">🏀</div>
                    <div>
                      <h3 className="font-bold text-lg sm:text-xl text-blue-800 group-hover:text-blue-600">I'm a Counselor</h3>
                      <p className="text-gray-600 mt-1 text-sm sm:text-base">Apply to be a camp counselor and work with campers</p>
                      <ul className="text-xs sm:text-sm text-gray-500 mt-2 space-y-1">
                        <li>• Create your counselor profile</li>
                        <li>• Set your availability</li>
                        <li>• Pending admin approval</li>
                      </ul>
                    </div>
                  </div>
                </button>
              </div>

              <button
                onClick={onBack}
                className="w-full mt-6 text-gray-500 hover:text-gray-700 text-sm"
              >
                ← Back to login
              </button>
            </div>
          </div>
        </div>
      );

      // ==================== ONBOARDING CONSTANTS ====================
      const COUNSELOR_RESPONSIBILITIES = [
        "Supervise campers during all activities",
        "Lead basketball drills and games appropriate for age group",
        "Ensure camper safety at all times",
        "Report any incidents or concerns to camp director",
        "Arrive 15 minutes before session start",
        "Maintain positive and encouraging attitude",
        "Be a role model for campers on and off the court"
      ];

      const PAY_DISCLOSURE = `
Pay Rate: $80 per session ($26.66/hour for 3-hour sessions)
Sessions: Morning (9:00 AM - 12:00 PM) or Afternoon (12:00 PM - 3:00 PM)
Payment Schedule: Twice monthly (1st and 15th)
Employment Status: 1099 Independent Contractor

As a 1099 contractor, you are responsible for:
• Reporting this income on your tax return
• Paying self-employment taxes
• We will provide a 1099 form at year end for income over $600
      `.trim();

      const CounselorOnboarding = ({ onComplete, onBack, counselorUsers, saveCounselorUsers, counselors, saveCounselors, availability, saveAvailability, counselorSchedule, saveCounselorSchedule, sitePhotos, googleUser }) => {
        const [step, setStep] = useState(1);
        const [userData, setUserData] = useState({ name: googleUser?.name || '', email: googleUser?.email || '', phone: '', password: '' });
        const [showPassword, setShowPassword] = useState(false);
        const [profileData, setProfileData] = useState({ position: 'Point Guard', year: 'Freshman', bio: '', photo: null });
        const [availData, setAvailData] = useState({});
        const [unavailData, setUnavailData] = useState({});
        const [selectedMonth, setSelectedMonth] = useState(6); // 6=July, 7=August
        const [responsibilitiesAcked, setResponsibilitiesAcked] = useState(false);
        const [payAcked, setPayAcked] = useState(false);
        const [error, setError] = useState('');
        const [showPhotoModal, setShowPhotoModal] = useState(false);
        const [submitting, setSubmitting] = useState(false); // Prevents flash during submission

        const totalSteps = 5;

        const steps = [
          { num: 1, title: 'Account', icon: '👤' },
          { num: 2, title: 'Profile', icon: '🏀' },
          { num: 3, title: 'Availability', icon: '📅' },
          { num: 4, title: 'Responsibilities', icon: '📋' },
          { num: 5, title: 'Submit', icon: '✅' }
        ];

        // Availability helpers - cycle: grey (unset) → green (available) → red (unavailable) → grey
        const getSessionState = (date, session) => {
          const avail = availData[date] || [];
          const unavail = unavailData[date] || [];
          if (avail.includes(session)) return 'available';
          if (unavail.includes(session)) return 'unavailable';
          return 'unset';
        };

        const toggleSession = (date, session) => {
          const state = getSessionState(date, session);
          if (state === 'unset') {
            // grey → green (available)
            setAvailData({ ...availData, [date]: [...(availData[date] || []), session] });
            setUnavailData({ ...unavailData, [date]: (unavailData[date] || []).filter(s => s !== session) });
          } else if (state === 'available') {
            // green → red (unavailable)
            setAvailData({ ...availData, [date]: (availData[date] || []).filter(s => s !== session) });
            setUnavailData({ ...unavailData, [date]: [...(unavailData[date] || []), session] });
          } else {
            // red → grey (unset)
            setUnavailData({ ...unavailData, [date]: (unavailData[date] || []).filter(s => s !== session) });
          }
        };

        const selectAllSessions = () => {
          const newAvail = {};
          CAMP_DATES.forEach(date => {
            newAvail[date] = ['morning', 'afternoon'];
          });
          setAvailData(newAvail);
          setUnavailData({});
        };

        const clearAllSessions = () => {
          setAvailData({});
          setUnavailData({});
        };

        const getTotalSessions = () => {
          return Object.values(availData).flat().length;
        };

        const getUnavailableSessions = () => {
          return Object.values(unavailData).flat().length;
        };

        const validateStep = () => {
          setError('');
          if (step === 1) {
            if (!userData.name.trim()) {
              setError('Please enter your full name');
              return false;
            }
            if (!userData.email.trim()) {
              setError('Please enter your email address');
              return false;
            }
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userData.email.trim())) {
              setError('Please enter a valid email address (e.g. name@example.com)');
              return false;
            }
            if (!userData.phone) {
              setError('Please enter your phone number');
              return false;
            }
            if (!isValidPhone(userData.phone)) {
              setError('Please enter a valid 10-digit phone number: (555) 555-1234');
              return false;
            }
            if (!googleUser) {
              if (!userData.password) {
                setError('Please create a password');
                return false;
              }
              if (userData.password.length < 4) {
                setError('Password must be at least 4 characters');
                return false;
              }
            }
            if ((counselorUsers || []).some(u => u.email.toLowerCase() === userData.email.trim().toLowerCase()) || (counselors || []).some(c => c.email.toLowerCase() === userData.email.trim().toLowerCase())) {
              setError('An account with this email already exists. Please use a different email or log in instead.');
              return false;
            }
          }
          if (step === 2) {
            if (!profileData.bio || profileData.bio.length < 20) {
              setError('Please write a bio (at least 20 characters)');
              return false;
            }
          }
          if (step === 3) {
            if (Object.values(availData).flat().length === 0) {
              setError('Please select at least one available session');
              return false;
            }
          }
          if (step === 4) {
            if (!responsibilitiesAcked || !payAcked) {
              setError('Please acknowledge both the responsibilities and pay terms');
              return false;
            }
          }
          return true;
        };

        const handleNext = async () => {
          if (!validateStep()) return;

          if (step === totalSteps) {
            // Show submitting screen to prevent flash
            setSubmitting(true);

            // Create user account
            const newUser = {
              email: userData.email,
              name: userData.name,
              phone: userData.phone,
              role: 'counselor',
              roles: ['counselor'],
              loginType: googleUser ? 'Google' : 'Email/Password',
              onboardingComplete: true,
              onboardingCompletedAt: new Date().toISOString()
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
              } catch (e) { /* Continue without hash — login function handles both */ }
            }
            await saveCounselorUsers([...(counselorUsers || []), newUser]);

            // Create counselor profile (pending approval)
            const newCounselor = {
              id: 'counselor_' + Date.now(),
              name: userData.name,
              email: userData.email,
              phone: userData.phone,
              position: profileData.position,
              year: profileData.year,
              bio: profileData.bio,
              photo: profileData.photo,
              visible: false, // Hidden until approved
              approvedByAdmin: false,
              responsibilitiesAcknowledged: true,
              payDisclosureAcknowledged: true,
              createdAt: new Date().toISOString(),
              order: counselors.length
            };
            await saveCounselors([...counselors, newCounselor]);

            // Save availability in object format with both available and unavailable arrays
            // This format is required for counselor dashboard to show both green and red sessions
            const allDates = new Set([...Object.keys(availData), ...Object.keys(unavailData)]);
            const combinedAvail = {};
            allDates.forEach(date => {
              combinedAvail[date] = {
                available: availData[date] || [],
                unavailable: unavailData[date] || []
              };
            });
            const newAvail = { ...availability, [newCounselor.email]: combinedAvail };
            await saveAvailability(newAvail);

            // Also save to counselorSchedule so admin dashboard shows availability immediately
            // Save both available (true) and unavailable (false) sessions
            const newSchedule = { ...counselorSchedule };
            newSchedule[newCounselor.id] = {};
            allDates.forEach(date => {
              const avail = availData[date] || [];
              const unavail = unavailData[date] || [];
              // Only add date entry if there's any data for it
              if (avail.length > 0 || unavail.length > 0) {
                newSchedule[newCounselor.id][date] = {};
                // Set true for available, false for unavailable
                if (avail.includes('morning')) newSchedule[newCounselor.id][date].morning = true;
                else if (unavail.includes('morning')) newSchedule[newCounselor.id][date].morning = false;
                if (avail.includes('afternoon')) newSchedule[newCounselor.id][date].afternoon = true;
                else if (unavail.includes('afternoon')) newSchedule[newCounselor.id][date].afternoon = false;
              }
            });
            await saveCounselorSchedule(newSchedule, `${newCounselor.name} registered with availability`);

            // Send welcome email (fire and forget — don't block onboarding)
            try {
              // Extract hero image for email — URL (CDN) or base64 (legacy)
              const heroData = sitePhotos?.hero;
              const heroSrc = heroData ? (typeof heroData === 'string' ? heroData : heroData.cropped) : null;
              let heroImageHtml = '';
              let emailAttachments;
              if (heroSrc && heroSrc.startsWith('http')) {
                // CDN URL — just use an img tag directly
                heroImageHtml = '<img src="' + heroSrc + '" alt="Roosevelt Basketball Day Camp" style="width: 100%; max-width: 600px; border-radius: 12px; margin-bottom: 20px;" />';
              } else if (heroSrc) {
                // Legacy base64 — use CID inline attachment
                const heroMatch = heroSrc.match(/^data:image\/(.*?);base64,(.*)$/);
                if (heroMatch) {
                  heroImageHtml = '<img src="cid:hero-image" alt="Roosevelt Basketball Day Camp" style="width: 100%; max-width: 600px; border-radius: 12px; margin-bottom: 20px;" />';
                  emailAttachments = [{ filename: `hero.${heroMatch[1] === 'jpeg' ? 'jpg' : heroMatch[1]}`, content: heroMatch[2], content_id: 'hero-image' }];
                }
              }

              fetch('/.netlify/functions/send-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  to: newUser.email,
                  subject: 'Welcome to the Roosevelt Basketball Day Camp Team!',
                  html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">${heroImageHtml}<h2 style="color: #15803d;">Welcome to the Team, ${newUser.name}!</h2><p>Thank you for signing up as a counselor at Roosevelt Basketball Day Camp. We're glad to have you on board!</p><h3 style="color: #15803d;">What Happens Next</h3><ul style="line-height: 1.8;"><li><strong>Your profile is pending approval</strong> — The camp director will review and approve your profile</li><li><strong>Check your availability</strong> — Make sure your available dates are up to date in your dashboard</li><li><strong>Upload a photo</strong> — Add a profile photo so campers and parents can recognize you</li><li><strong>Review your schedule</strong> — Once approved, you'll be assigned to camp sessions</li></ul><p><a href="https://rhsbasketballdaycamp.com/#login" style="display: inline-block; background-color: #15803d; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Log In to Your Dashboard</a></p><p style="color: #666; font-size: 14px; margin-top: 20px;">If you have any questions, just reply to this email and we'll get back to you!</p></div>`,
                  ...(emailAttachments ? { attachments: emailAttachments } : {})
                })
              });
            } catch (e) { /* welcome email is non-critical */ }

            onComplete(newUser);
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
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
              <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-md">
                <div className="text-6xl mb-4">🏀</div>
                <h2 className="font-display text-2xl text-blue-800 mb-2">Submitting Application...</h2>
                <p className="text-gray-600">Please wait while we save your information.</p>
                <div className="mt-4 flex justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              </div>
            </div>
          );
        }


        return (
          <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 py-8">
            <div className="max-w-lg mx-auto px-4">
              {/* Progress Bar */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  {steps.map((s) => (
                    <div
                      key={s.num}
                      className={`flex flex-col items-center ${s.num <= step ? 'text-blue-600' : 'text-gray-400'}`}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
                        s.num < step ? 'bg-blue-600 text-white' :
                        s.num === step ? 'bg-blue-100 border-2 border-blue-600' : 'bg-gray-200'
                      }`}>
                        {s.num < step ? '✓' : s.icon}
                      </div>
                      <span className="text-xs mt-1 hidden sm:block">{s.title}</span>
                    </div>
                  ))}
                </div>
                <div className="h-2 bg-gray-200 rounded-full">
                  <div
                    className="h-2 bg-blue-600 rounded-full transition-all"
                    style={{ width: `${((step - 1) / (totalSteps - 1)) * 100}%` }}
                  />
                </div>
              </div>

              {/* Content Card */}
              <div className="bg-white rounded-2xl shadow-xl p-8">
                <h2 className="font-display text-2xl text-blue-800 mb-6">
                  {steps[step - 1].title}
                </h2>

                {error && (
                  <div className="bg-red-100 text-red-700 p-3 rounded-lg mb-4 text-sm">
                    {error}
                  </div>
                )}

                {/* Step 1: Account */}
                {step === 1 && (
                  <div className="space-y-4">
                    <p className="text-gray-600 mb-4">{googleUser ? 'Almost there! We just need a few more details.' : 'Create your counselor account to get started.'}</p>
                    {googleUser && (
                      <div className="bg-blue-50 border border-blue-200 text-blue-800 p-3 rounded-lg text-sm flex items-center gap-2 mb-2">
                        <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                        <span>Signing up with Google — no password needed!</span>
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                      <input value={userData.name} onChange={e => setUserData({ ...userData, name: e.target.value })} className="w-full px-4 py-3 border-2 rounded-lg focus:border-blue-500 focus:outline-none" placeholder="Your full name" autoComplete="off" data-1p-ignore="true" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                      <input type="email" value={userData.email} onChange={e => !googleUser && setUserData({ ...userData, email: e.target.value })} readOnly={!!googleUser} className={`w-full px-4 py-3 border-2 rounded-lg focus:border-blue-500 focus:outline-none ${googleUser ? 'bg-gray-100 text-gray-600' : ''}`} placeholder="your@email.com" autoComplete="off" data-1p-ignore="true" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                      <input value={userData.phone} onChange={e => setUserData({ ...userData, phone: formatPhone(e.target.value) })} className="w-full px-4 py-3 border-2 rounded-lg focus:border-blue-500 focus:outline-none" placeholder="(555) 555-1234" autoComplete="off" data-1p-ignore="true" />
                    </div>
                    {!googleUser && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                      <div className="relative">
                        <input type={showPassword ? 'text' : 'password'} value={userData.password} onChange={e => setUserData({ ...userData, password: e.target.value })} className="w-full px-4 py-3 border-2 rounded-lg focus:border-blue-500 focus:outline-none pr-16" placeholder="Create a password" autoComplete="new-password" data-1p-ignore="true" data-lpignore="true" data-form-type="other" />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 text-sm">{showPassword ? 'Hide' : 'Show'}</button>
                      </div>
                    </div>
                    )}
                  </div>
                )}

                {/* Step 2: Profile */}
                {step === 2 && (
                  <div className="space-y-4">
                    <p className="text-gray-600 mb-4">Tell us about your basketball background. This will appear on the camp website once approved.</p>
                    <div className="flex justify-center mb-4">
                      {getDisplayPhoto(profileData.photo) ? (
                        <div className="relative cursor-pointer" onClick={() => setShowPhotoModal(true)}>
                          <img src={getDisplayPhoto(profileData.photo)} className="w-32 h-32 rounded-full object-cover border-4 border-blue-600" />
                          <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-blue-600 rounded-full text-white flex items-center justify-center hover:bg-blue-700">✎</div>
                        </div>
                      ) : (
                        <div onClick={() => setShowPhotoModal(true)} className="w-32 h-32 rounded-full bg-gray-200 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-300">
                          <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                          <span className="text-xs text-gray-500 font-medium">add photo</span>
                        </div>
                      )}
                      {showPhotoModal && <PhotoUploadModal currentPhoto={profileData.photo} onSave={(img) => { setProfileData({ ...profileData, photo: img }); setShowPhotoModal(false); }} onCancel={() => setShowPhotoModal(false)} />}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Position *</label>
                        <select value={profileData.position} onChange={e => setProfileData({ ...profileData, position: e.target.value })} className="w-full px-3 py-2 border rounded-lg">
                          <option value="Point Guard">Point Guard</option>
                          <option value="Shooting Guard">Shooting Guard</option>
                          <option value="Small Forward">Small Forward</option>
                          <option value="Power Forward">Power Forward</option>
                          <option value="Center">Center</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Year *</label>
                        <select value={profileData.year} onChange={e => setProfileData({ ...profileData, year: e.target.value })} className="w-full px-3 py-2 border rounded-lg">
                          <option value="Freshman">Freshman</option>
                          <option value="Sophomore">Sophomore</option>
                          <option value="Junior">Junior</option>
                          <option value="Senior">Senior</option>
                          <option value="Alumni">Alumni</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Bio *</label>
                      <textarea value={profileData.bio} onChange={e => setProfileData({ ...profileData, bio: e.target.value })} className="w-full px-3 py-2 border rounded-lg h-24" placeholder="Tell us about your basketball experience and why you want to be a counselor..." />
                      <p className="text-xs text-gray-500 mt-1">{profileData.bio.length}/200 characters</p>
                    </div>
                  </div>
                )}

                {/* Step 3: Availability */}
                {step === 3 && (
                  <div className="space-y-4">
                    <p className="text-gray-600 mb-2">Camp runs weekdays only (Mon-Fri). Click each session to set your availability. Click cycles through: <span className="text-gray-400 font-medium">Not Set</span> → <span className="text-green-600 font-medium">Available</span> → <span className="text-red-600 font-medium">Unavailable</span></p>

                    {/* Month Tabs */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {[{ m: 6, n: 'July' }, { m: 7, n: 'August' }].map(({ m, n }) => (
                        <button key={m} onClick={() => setSelectedMonth(m)} className={'px-6 py-2 rounded-lg font-medium ' + (selectedMonth === m ? 'bg-green-600 text-white' : 'bg-white border border-green-600 text-green-700')}>{n}</button>
                      ))}
                      <div className="flex-1" />
                      <button onClick={selectAllSessions} className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200">Mark All Available</button>
                      <button onClick={clearAllSessions} className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200">Clear All</button>
                    </div>
                    <div className="text-sm text-gray-500 text-right mb-2">{getTotalSessions()} available · {getUnavailableSessions()} unavailable</div>

                    {/* Weeks for selected month */}
                    {CAMP_WEEKS.filter(w => new Date(w.start + 'T12:00:00').getMonth() === selectedMonth).map((week, weekIdx) => (
                      <div key={weekIdx} className="border rounded-lg overflow-hidden">
                        <div className="bg-gray-100 px-3 py-2 text-sm font-medium">Week {weekIdx + 1}: {new Date(week.start + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                        <div className="grid grid-cols-5 gap-2 p-3">
                          {week.dates.map(date => {
                            const d = new Date(date + 'T12:00:00');
                            const amState = getSessionState(date, 'morning');
                            const pmState = getSessionState(date, 'afternoon');
                            const bothAvail = amState === 'available' && pmState === 'available';
                            const bothUnavail = amState === 'unavailable' && pmState === 'unavailable';
                            const cardBorder = bothAvail ? 'border-green-300 bg-green-50' : bothUnavail ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white';
                            const getButtonStyle = (state) => state === 'available' ? 'bg-green-500 text-white hover:bg-green-600' : state === 'unavailable' ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-gray-200 text-gray-600 hover:bg-gray-300';
                            return (
                              <div key={date} className={`rounded-lg border-2 overflow-hidden ${cardBorder}`}>
                                <div className={`text-center p-1 font-bold text-xs ${bothAvail ? 'bg-green-200' : bothUnavail ? 'bg-red-200' : 'bg-gray-100'}`}>
                                  <div className="text-gray-600">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri'][d.getDay() - 1]}</div>
                                  <div>{d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                                </div>
                                <div className="p-1 space-y-1">
                                  <button onClick={() => toggleSession(date, 'morning')} className={`w-full p-1.5 rounded text-xs font-medium transition-colors ${getButtonStyle(amState)}`}>
                                    AM
                                  </button>
                                  <button onClick={() => toggleSession(date, 'afternoon')} className={`w-full p-1.5 rounded text-xs font-medium transition-colors ${getButtonStyle(pmState)}`}>
                                    PM
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                    {/* Legend */}
                    <div className="flex gap-4 text-xs text-gray-600 justify-center">
                      <div className="flex items-center gap-1"><div className="w-4 h-4 bg-green-500 rounded"></div><span>Available</span></div>
                      <div className="flex items-center gap-1"><div className="w-4 h-4 bg-red-500 rounded"></div><span>Unavailable</span></div>
                      <div className="flex items-center gap-1"><div className="w-4 h-4 bg-gray-200 rounded"></div><span>Not Set</span></div>
                    </div>
                    <p className="text-xs text-gray-500 text-center">You can update your availability later from your dashboard.</p>
                  </div>
                )}

                {/* Step 4: Responsibilities */}
                {step === 4 && (
                  <div className="space-y-6">
                    <div className="bg-white border rounded-lg overflow-hidden">
                      <div className="bg-blue-100 px-4 py-2 font-medium text-blue-800">📋 Counselor Responsibilities</div>
                      <div className="p-4">
                        <ul className="space-y-2">
                          {COUNSELOR_RESPONSIBILITIES.map((resp, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-sm text-gray-600"><span className="text-blue-500">•</span>{resp}</li>
                          ))}
                        </ul>
                        <label className="flex items-center gap-3 mt-4 cursor-pointer">
                          <input type="checkbox" checked={responsibilitiesAcked} onChange={e => setResponsibilitiesAcked(e.target.checked)} className="w-5 h-5 text-blue-600" />
                          <span className="text-sm">I understand and accept these responsibilities</span>
                        </label>
                      </div>
                    </div>
                    <div className="bg-white border rounded-lg overflow-hidden">
                      <div className="bg-green-100 px-4 py-2 font-medium text-green-800">💵 Pay Information</div>
                      <div className="p-4">
                        <pre className="whitespace-pre-wrap text-sm text-gray-600 font-sans">{PAY_DISCLOSURE}</pre>
                        <label className="flex items-center gap-3 mt-4 cursor-pointer">
                          <input type="checkbox" checked={payAcked} onChange={e => setPayAcked(e.target.checked)} className="w-5 h-5 text-green-600" />
                          <span className="text-sm">I understand and accept the pay terms and 1099 status</span>
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 5: Submit */}
                {step === 5 && (
                  <div className="text-center space-y-6">
                    <div className="text-6xl">📨</div>
                    <h3 className="font-display text-2xl text-blue-800">Ready to Submit!</h3>
                    <p className="text-gray-600">Your application will be reviewed by a camp administrator. You'll be notified once approved.</p>
                    <div className="bg-gray-50 rounded-lg p-4 text-left">
                      <h4 className="font-medium mb-2">Application Summary:</h4>
                      <p className="text-sm text-gray-600">• {userData.name}</p>
                      <p className="text-sm text-gray-600">• {profileData.position} • {profileData.year}</p>
                      <p className="text-sm text-gray-600">• {getTotalSessions()} sessions available</p>
                    </div>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <p className="text-yellow-800 font-medium">⏳ Pending Admin Approval</p>
                      <p className="text-sm text-yellow-700 mt-1">Your profile won't appear on the website until approved by an administrator.</p>
                    </div>
                  </div>
                )}

                {/* Navigation */}
                <div className="flex gap-4 mt-8">
                  <button
                    onClick={handleBack}
                    className="flex-1 py-3 border-2 border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    {step === 1 ? '← Back' : '← Previous'}
                  </button>
                  <button
                    onClick={handleNext}
                    className="flex-1 py-3 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-lg"
                  >
                    {step === totalSteps ? 'Submit Application' : 'Continue →'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      };

      // ==================== LOGIN ====================
      const Login = () => {
        const [email, setEmail] = useState('');
        const [password, setPassword] = useState('');
        const [showPassword, setShowPassword] = useState(false);
        const [error, setError] = useState('');
        const [errorVisible, setErrorVisible] = useState(false);
        const errorTimerRef = React.useRef(null);

        const showLoginError = (msg) => {
          setError(msg);
          setErrorVisible(true);
          if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
          errorTimerRef.current = setTimeout(() => setErrorVisible(false), 4000);
        };

        // Check for reset token in URL on mount
        const urlParams = new URLSearchParams(window.location.search);
        const resetToken = urlParams.get('reset');

        const [mode, setMode] = useState(resetToken ? 'resetPassword' : 'login'); // 'login' | 'selectRole' | 'onboardParent' | 'onboardCounselor' | 'forgotLogin' | 'forgotPassword' | 'resetPassword'
        const [forgotLoginSending, setForgotLoginSending] = useState(false);
        const [forgotLoginStep, setForgotLoginStep] = useState('phone'); // 'phone' | 'code' | 'result'
        const [verificationCode, setVerificationCode] = useState('');
        const [recoveredAccount, setRecoveredAccount] = useState(null);
        const [forgotPasswordSending, setForgotPasswordSending] = useState(false);
        const [forgotPasswordSent, setForgotPasswordSent] = useState(false);
        const [resetPasswordLoading, setResetPasswordLoading] = useState(false);
        const [resetPasswordDone, setResetPasswordDone] = useState(false);
        const [newPassword, setNewPassword] = useState('');
        const [confirmPassword, setConfirmPassword] = useState('');
        const [showNewPassword, setShowNewPassword] = useState(false);
        const [name, setName] = useState('');
        const [phone, setPhone] = useState('');
        const [googleUser, setGoogleUser] = useState(null); // { email, name } from Google Sign-In for new account creation

        // Fire-and-forget: persist login method to database so admin can see how users log in
        const trackLoginMethod = (table, userEmail, method) => {
          try {
            const now = new Date().toISOString();
            const sourceArray = table === 'camp_parents' ? parents : counselorUsers;
            const updated = sourceArray.map(u => {
              if (u.email?.toLowerCase() !== userEmail.toLowerCase()) return u;
              const patch = { ...u, lastLoginMethod: method, lastLoginAt: now };
              if (method === 'Google') patch.googleLinked = true;
              return patch;
            });
            storage.set(table, 'main', updated);
          } catch (e) {
            console.error('Failed to track login method:', e);
          }
        };

        const [loginLoading, setLoginLoading] = useState(false);

        const handleLogin = async () => {
          if (!email || !password) {
            setError('Please enter your email and password.');
            return;
          }
          setLoginLoading(true);
          setError('');
          try {
            const loginStart = performance.now();
            const res = await fetch('/.netlify/functions/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email, password })
            });
            const data = await res.json();
            console.log('⏱️ [LOGIN] API call took: ' + (performance.now() - loginStart).toFixed(0) + 'ms');
            if (res.ok && data.success) {
              sessionStorage.setItem('user', JSON.stringify(data.user));
              const role = data.user.role;
              if (role === 'admin') window.location.href = '/admin.html';
              else if (role === 'parent') window.location.href = '/parent.html';
              else if (role === 'counselor') window.location.href = '/counselor.html';
              else window.location.href = '/parent.html';
            } else {
              setError(data.error || 'Incorrect email or password. Please try again.');
            }
          } catch (err) {
            setError('Login failed. Please try again.');
          }
          setLoginLoading(false);
        };

        // Handle Google Sign-In — look up the Google email in existing accounts
        const handleGoogleCredential = (googleEmail, googleName) => {
          // Guard: Phase 2 data (admins, parents, counselorUsers) must be loaded for Google login
          if (!backgroundLoaded) {
            setError('Still loading account data. Please try again in a moment.');
            return;
          }
          // Check admins
          const admin = admins.find(a => a.username?.toLowerCase() === googleEmail || a.email?.toLowerCase() === googleEmail);
          if (admin) {
            const user = { name: admin.name, role: 'admin', adminId: admin.id, loginType: 'Google' };
            sessionStorage.setItem('user', JSON.stringify(user));
            window.location.href = '/admin.html';
            return;
          }

          // Check parents
          const parent = parents.find(p => p.email?.toLowerCase() === googleEmail);
          if (parent) {
            trackLoginMethod('camp_parents', parent.email, 'Google');
            const user = { ...parent, loginType: 'Google' };
            sessionStorage.setItem('user', JSON.stringify(user));
            window.location.href = '/parent.html';
            return;
          }

          // Check counselor users
          const counselorUser = counselorUsers.find(cu => cu.email?.toLowerCase() === googleEmail);
          if (counselorUser) {
            trackLoginMethod('camp_counselor_users', counselorUser.email, 'Google');
            const user = { ...counselorUser, loginType: 'Google' };
            sessionStorage.setItem('user', JSON.stringify(user));
            window.location.href = '/counselor.html';
            return;
          }

          // Legacy: Check counselor profiles
          const c = counselors.find(x => x.email?.toLowerCase() === googleEmail);
          if (c) {
            const user = { ...c, role: 'counselor', loginType: 'Google' };
            sessionStorage.setItem('user', JSON.stringify(user));
            window.location.href = '/counselor.html';
            return;
          }

          // No existing account — start account creation with Google info pre-filled
          setGoogleUser({ email: googleEmail, name: googleName });
          setError('');
          setMode('selectRole');
        };

        // Initialize Google OAuth2 token client for custom button
        const googleClientRef = useRef(null);
        useEffect(() => {
          if (mode === 'login' && window.google?.accounts?.oauth2) {
            googleClientRef.current = google.accounts.oauth2.initTokenClient({
              client_id: GOOGLE_CLIENT_ID,
              scope: 'email profile',
              callback: async (tokenResponse) => {
                if (tokenResponse.error) {
                  setError('Google sign-in was cancelled.');
                  return;
                }
                try {
                  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                    headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
                  });
                  const userInfo = await res.json();
                  if (!userInfo.email) {
                    setError('Could not get email from Google. Please try again.');
                    return;
                  }
                  handleGoogleCredential(userInfo.email.toLowerCase(), userInfo.name || '');
                } catch (err) {
                  console.error('Google login error:', err);
                  setError('Google sign-in failed. Please try again.');
                }
              }
            });
          }
        }, [mode]);

        const handleGoogleClick = () => {
          if (googleClientRef.current) {
            googleClientRef.current.requestAccessToken();
          } else {
            setError('Google sign-in is loading. Please try again in a moment.');
          }
        };

        // Show role selector
        if (mode === 'selectRole') {
          return (
            <RoleSelector
              onSelect={(role) => setMode(role === 'parent' ? 'onboardParent' : 'onboardCounselor')}
              onBack={() => setMode('login')}
            />
          );
        }

        // Show parent onboarding wizard
        if (mode === 'onboardParent') {
          if (!backgroundLoaded) return <div className="min-h-screen bg-green-50 flex items-center justify-center"><div className="text-center"><div className="animate-spin text-4xl inline-block mb-2">🏀</div><p className="text-gray-600">Setting up...</p></div></div>;
          return (
            <ParentOnboarding
              onComplete={(newUser) => {
                sessionStorage.setItem('user', JSON.stringify(newUser));
                // Use replace to prevent back-button returning to onboarding
                window.location.replace('/parent.html');
              }}
              onBack={() => setMode('selectRole')}
              parents={parents}
              saveParents={saveParents}
              saveEmergencyContacts={saveEmergencyContacts}
              emergencyContacts={emergencyContacts}
              saveOnboardingProgress={saveOnboardingProgress}
              campers={campers}
              saveCampers={saveCampers}
              saveCamperParentLinks={saveCamperParentLinks}
              camperParentLinks={camperParentLinks}
              content={content}
              addToHistory={addToHistory}
              sitePhotos={sitePhotos}
              googleUser={googleUser}
            />
          );
        }

        // Show counselor onboarding wizard
        if (mode === 'onboardCounselor') {
          if (!backgroundLoaded) return <div className="min-h-screen bg-green-50 flex items-center justify-center"><div className="text-center"><div className="animate-spin text-4xl inline-block mb-2">🏀</div><p className="text-gray-600">Setting up...</p></div></div>;
          return (
            <CounselorOnboarding
              onComplete={(newUser) => {
                sessionStorage.setItem('user', JSON.stringify(newUser));
                window.location.href = '/counselor.html';
              }}
              onBack={() => setMode('selectRole')}
              counselorUsers={counselorUsers}
              saveCounselorUsers={saveCounselorUsers}
              counselors={counselors}
              saveCounselors={saveCounselors}
              availability={availability}
              saveAvailability={saveAvail}
              counselorSchedule={counselorSchedule}
              saveCounselorSchedule={saveCounselorSchedule}
              sitePhotos={sitePhotos}
              googleUser={googleUser}
            />
          );
        }

        // Show forgot login — SMS verification flow
        if (mode === 'forgotLogin') {
          const resetForgotLogin = () => {
            setMode('login'); setError(''); setPhone(''); setVerificationCode('');
            setForgotLoginStep('phone'); setRecoveredAccount(null); setForgotLoginSending(false);
          };

          return (
            <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 py-12">
              <div className="max-w-md mx-auto px-4">
                <div className="bg-white rounded-2xl shadow-xl p-8">
                  <h2 className="font-display text-2xl text-green-800 text-center mb-2">Can't Remember Your Login?</h2>

                  {/* Step 1: Enter phone number */}
                  {forgotLoginStep === 'phone' && (
                    <div>
                      <p className="text-gray-500 text-center text-sm mb-4">Enter the phone number on your account and we'll text you a verification code.</p>
                      <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-3 rounded-lg text-center text-sm mb-4">
                        <strong>SMS is being set up.</strong> Text verification is temporarily unavailable. Please email <a href="mailto:rhsdaycamp@gmail.com" className="underline font-medium">rhsdaycamp@gmail.com</a> for login help.
                      </div>
                      <div className="space-y-4">
                        <input value={phone} onChange={e => setPhone(formatPhone(e.target.value))} className="w-full px-4 py-3 border-2 rounded-lg" placeholder="(555) 555-1234" type="tel" autoFocus />
                        {error && <div className="bg-red-100 text-red-700 p-3 rounded-lg text-center text-sm">{error}</div>}
                        <button
                          type="button"
                          disabled={forgotLoginSending}
                          onClick={async () => {
                            if (!phone.trim()) { setError('Please enter your phone number.'); return; }
                            setError('');
                            setForgotLoginSending(true);
                            try {
                              const res = await fetch('/.netlify/functions/send-verification-code', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ phone: phone.trim() })
                              });
                              if (res.ok) {
                                setForgotLoginStep('code');
                              } else {
                                const data = await res.json();
                                setError(data.error || 'Something went wrong. Please try again.');
                              }
                            } catch (err) {
                              setError('Something went wrong. Please try again.');
                            }
                            setForgotLoginSending(false);
                          }}
                          className="w-full bg-green-700 hover:bg-green-800 text-white font-bold py-3 rounded-lg disabled:opacity-50"
                        >
                          {forgotLoginSending ? 'Sending Code...' : 'Send Verification Code'}
                        </button>
                        <button onClick={resetForgotLogin} className="w-full text-green-600 hover:underline font-medium">
                          ← Back to Login
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Step 2: Enter verification code */}
                  {forgotLoginStep === 'code' && (
                    <div>
                      <p className="text-gray-500 text-center text-sm mb-6">We sent a 6-digit code to your phone. Enter it below.</p>
                      <div className="space-y-4">
                        <input
                          value={verificationCode}
                          onChange={e => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          className="w-full px-4 py-3 border-2 rounded-lg text-center text-2xl tracking-widest font-mono"
                          placeholder="000000"
                          inputMode="numeric"
                          maxLength={6}
                          autoFocus
                        />
                        {error && <div className="bg-red-100 text-red-700 p-3 rounded-lg text-center text-sm">{error}</div>}
                        <button
                          type="button"
                          disabled={forgotLoginSending || verificationCode.length !== 6}
                          onClick={async () => {
                            setError('');
                            setForgotLoginSending(true);
                            try {
                              const res = await fetch('/.netlify/functions/verify-code', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ phone: phone.trim(), code: verificationCode })
                              });
                              const data = await res.json();
                              if (res.ok && data.success) {
                                setRecoveredAccount(data);
                                setForgotLoginStep('result');
                              } else {
                                setError(data.error || 'Invalid code. Please try again.');
                              }
                            } catch (err) {
                              setError('Something went wrong. Please try again.');
                            }
                            setForgotLoginSending(false);
                          }}
                          className="w-full bg-green-700 hover:bg-green-800 text-white font-bold py-3 rounded-lg disabled:opacity-50"
                        >
                          {forgotLoginSending ? 'Verifying...' : 'Verify Code'}
                        </button>
                        <button
                          type="button"
                          disabled={forgotLoginSending}
                          onClick={async () => {
                            setError('');
                            setForgotLoginSending(true);
                            setVerificationCode('');
                            try {
                              await fetch('/.netlify/functions/send-verification-code', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ phone: phone.trim() })
                              });
                              setError('New code sent! Check your phone.');
                            } catch (err) {}
                            setForgotLoginSending(false);
                          }}
                          className="w-full text-gray-500 hover:text-green-600 hover:underline text-sm"
                        >
                          Didn't get the code? Send again
                        </button>
                        <button onClick={resetForgotLogin} className="w-full text-green-600 hover:underline font-medium">
                          ← Back to Login
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Step 3: Show recovered account info */}
                  {forgotLoginStep === 'result' && recoveredAccount && (
                    <div>
                      <div className="bg-green-50 rounded-lg p-5 mb-4">
                        <p className="text-green-800 font-medium text-center mb-3">Account Found!</p>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between"><span className="text-gray-600">Name:</span><span className="font-medium text-gray-800">{recoveredAccount.name}</span></div>
                          <div className="flex justify-between"><span className="text-gray-600">Email:</span><span className="font-medium text-gray-800">{recoveredAccount.email}</span></div>
                          <div className="flex justify-between"><span className="text-gray-600">Login Type:</span><span className="font-medium text-gray-800">{recoveredAccount.loginType}</span></div>
                          <div className="flex justify-between"><span className="text-gray-600">Account Type:</span><span className="font-medium text-gray-800 capitalize">{recoveredAccount.userType}</span></div>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <button
                          onClick={() => {
                            setEmail(recoveredAccount.email);
                            setMode('forgotPassword');
                            setRecoveredAccount(null);
                            setForgotLoginStep('phone');
                          }}
                          className="w-full bg-green-700 hover:bg-green-800 text-white font-bold py-3 rounded-lg"
                        >
                          Reset My Password
                        </button>
                        <button
                          onClick={() => {
                            setEmail(recoveredAccount.email);
                            resetForgotLogin();
                          }}
                          className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 rounded-lg"
                        >
                          Go to Login
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        }

        // Show forgot password form (enter email to request reset link)
        if (mode === 'forgotPassword') {
          return (
            <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 py-12">
              <div className="max-w-md mx-auto px-4">
                <div className="bg-white rounded-2xl shadow-xl p-8">
                  <h2 className="font-display text-2xl text-green-800 text-center mb-2">Reset Your Password</h2>
                  <p className="text-gray-500 text-center text-sm mb-6">Enter the email address you use to log in and we'll send you a reset link.</p>

                  {forgotPasswordSent ? (
                    <div>
                      <div className="bg-green-50 text-green-700 p-4 rounded-lg mb-4 text-center">
                        If an account exists with that email, you'll receive a password reset link shortly. Check your inbox (and spam folder).
                      </div>
                      <button onClick={() => { setMode('login'); setForgotPasswordSent(false); setEmail(''); }} className="w-full text-green-600 hover:underline font-medium">
                        ← Back to Login
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <input value={email} onChange={e => setEmail(e.target.value)} className="w-full px-4 py-3 border-2 rounded-lg" placeholder="Email" autoFocus />
                      {error && <div className="bg-red-100 text-red-700 p-3 rounded-lg text-center text-sm">{error}</div>}
                      <button
                        type="button"
                        disabled={forgotPasswordSending}
                        onClick={async () => {
                          if (!email.trim()) { setError('Please enter your email address.'); return; }
                          setError('');
                          setForgotPasswordSending(true);
                          try {
                            await fetch('/.netlify/functions/request-password-reset', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ email: email.trim() })
                            });
                            // Always show success (prevents email enumeration)
                            setForgotPasswordSent(true);
                          } catch (err) {
                            setError('Something went wrong. Please try again.');
                          }
                          setForgotPasswordSending(false);
                        }}
                        className="w-full bg-green-700 hover:bg-green-800 text-white font-bold py-3 rounded-lg disabled:opacity-50"
                      >
                        {forgotPasswordSending ? 'Sending...' : 'Send Reset Link'}
                      </button>
                      <button onClick={() => { setMode('login'); setError(''); }} className="w-full text-green-600 hover:underline font-medium">
                        ← Back to Login
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        }

        // Show password reset form (user clicked link from email)
        if (mode === 'resetPassword') {
          return (
            <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 py-12">
              <div className="max-w-md mx-auto px-4">
                <div className="bg-white rounded-2xl shadow-xl p-8">
                  <h2 className="font-display text-2xl text-green-800 text-center mb-2">Set New Password</h2>
                  <p className="text-gray-500 text-center text-sm mb-6">Enter your new password below.</p>

                  {resetPasswordDone ? (
                    <div>
                      <div className="bg-green-50 text-green-700 p-4 rounded-lg mb-4 text-center">
                        Your password has been updated! You can now log in with your new password.
                      </div>
                      <button onClick={() => {
                        // Clean up the URL
                        window.history.replaceState(null, '', window.location.pathname + '#login');
                        setMode('login');
                        setResetPasswordDone(false);
                        setNewPassword('');
                        setConfirmPassword('');
                      }} className="w-full bg-green-700 hover:bg-green-800 text-white font-bold py-3 rounded-lg">
                        Go to Login
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="relative">
                        <input type={showNewPassword ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full px-4 py-3 border-2 rounded-lg pr-16" placeholder="New Password" autoFocus />
                        <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 text-sm">{showNewPassword ? 'Hide' : 'Show'}</button>
                      </div>
                      <input type={showNewPassword ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full px-4 py-3 border-2 rounded-lg" placeholder="Confirm New Password" onKeyDown={e => { if (e.key === 'Enter') document.getElementById('resetPasswordBtn')?.click(); }} />
                      {error && <div className="bg-red-100 text-red-700 p-3 rounded-lg text-center text-sm">{error}</div>}
                      <button
                        id="resetPasswordBtn"
                        type="button"
                        disabled={resetPasswordLoading}
                        onClick={async () => {
                          if (!newPassword || !confirmPassword) { setError('Please fill in both fields.'); return; }
                          if (newPassword.length < 4) { setError('Password must be at least 4 characters.'); return; }
                          if (newPassword !== confirmPassword) { setError('Passwords do not match.'); return; }
                          setError('');
                          setResetPasswordLoading(true);
                          try {
                            const res = await fetch('/.netlify/functions/reset-password', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ token: resetToken, newPassword })
                            });
                            const data = await res.json();
                            if (res.ok) {
                              // Auto-login: store user in session and redirect
                              if (data.user) {
                                sessionStorage.setItem('user', JSON.stringify(data.user));
                                window.history.replaceState(null, '', window.location.pathname);
                                const dest = data.user.role === 'parent' ? '/parent.html' : data.user.role === 'counselor' ? '/counselor.html' : '/admin.html';
                                window.location.replace(dest);
                                return;
                              }
                              setResetPasswordDone(true);
                            } else {
                              setError(data.error || 'Something went wrong. Please try again.');
                            }
                          } catch (err) {
                            setError('Something went wrong. Please try again.');
                          }
                          setResetPasswordLoading(false);
                        }}
                        className="w-full bg-green-700 hover:bg-green-800 text-white font-bold py-3 rounded-lg disabled:opacity-50"
                      >
                        {resetPasswordLoading ? 'Updating...' : 'Update Password'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        }

        return (
          <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 py-12">
            <div className="max-w-md mx-auto px-4">
              <div className="bg-white rounded-2xl shadow-xl p-8">
                <h2 className="font-display text-3xl text-green-800 text-center mb-6">Welcome Back</h2>
                {error && (
                  <div
                    className="bg-red-50 border border-red-300 text-red-700 px-3 py-2 rounded-lg mb-3 text-center text-sm"
                    style={{
                      transition: 'opacity 0.5s ease',
                      opacity: errorVisible ? 1 : 0
                    }}
                  >
                    {error}
                  </div>
                )}

                <form autoComplete="off" data-1p-ignore="true" onSubmit={e => e.preventDefault()} className="space-y-4">
                  <input value={email} onChange={e => setEmail(e.target.value)} className="w-full px-4 py-3 border-2 rounded-lg" placeholder="Email" autoComplete="off" data-1p-ignore="true" data-lpignore="true" data-form-type="other" autoFocus />
                  <div className="relative">
                    <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-3 border-2 rounded-lg pr-16" placeholder="Password" onKeyDown={e => e.key === 'Enter' && handleLogin()} autoComplete="off" data-1p-ignore="true" data-lpignore="true" data-form-type="other" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 text-sm">{showPassword ? 'Hide' : 'Show'}</button>
                  </div>
                  <button type="button" onClick={handleLogin} disabled={loginLoading} className="w-full bg-green-700 hover:bg-green-800 text-white font-bold py-3 rounded-lg disabled:opacity-50">{loginLoading ? 'Logging in...' : 'Login'}</button>
                </form>

                <div className="flex justify-between mt-3">
                  <button onClick={() => { setMode('forgotPassword'); setError(''); }} className="text-sm text-gray-500 hover:text-green-600 hover:underline">
                    Forgot Password?
                  </button>
                  <button onClick={() => { setMode('forgotLogin'); setError(''); }} className="text-sm text-gray-500 hover:text-green-600 hover:underline">
                    Can't remember your login?
                  </button>
                </div>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="bg-white px-4 text-gray-500">or continue with</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleGoogleClick}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3 border-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span className="font-medium text-gray-700">Continue with Google</span>
                </button>

                <button onClick={() => { setMode('selectRole'); setError(''); }} className="w-full mt-6 text-green-600 hover:underline font-medium">
                  New? Create account with email →
                </button>

                <div className="mt-4 text-center">
                  <a href="/privacy-policy.html" className="text-xs text-gray-400 hover:text-gray-600 hover:underline">Privacy Policy</a>
                </div>
              </div>
            </div>
          </div>
        );
      };

      // ==================== ADMIN ====================

      // ==================== ROUTER (INDEX.HTML) ====================
      if (loading) return <div className="min-h-screen bg-green-50 flex items-center justify-center"><div className="text-6xl">🏀</div></div>;

      // Global transitioning screen
      if (transitioning) {
        return (
          <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center">
            <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-md">
              <div className="text-6xl mb-4">🏀</div>
              <h2 className="font-display text-2xl text-green-800 mb-2">Welcome!</h2>
              <p className="text-gray-600">Loading your dashboard...</p>
              <div className="mt-4 flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
              </div>
            </div>
          </div>
        );
      }

      return (
        <div className="min-h-screen bg-gray-50">
          <VersionBanner isVisible={isDevEnv || showBanner} isDev={isDevEnv} version={VERSION} buildDate={BUILD_DATE} />
          <Nav />
          {toast && <Toast message={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
          {page === 'home' && <Home />}
          {page === 'schedule' && <Schedule />}
          {page === 'pricing' && <Pricing />}
          {page === 'location' && <Location />}
          {page === 'counselors' && <Counselors />}
          {page === 'login' && <Login />}
          <footer className="bg-gray-800 text-white py-6 text-center">© 2026 Roosevelt High School Girls Basketball</footer>
        </div>
      );
    }
