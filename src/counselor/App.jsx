import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase, SCHEMA } from '../shared/config';
import { storage, isDev, formatPhone, isValidPhone, calculateAge, getDisplayPhoto, getSessionCost, photoStorage } from '../shared/utils';
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
    const VERSION = "13.172";
    // BUILD_DATE - update this timestamp when committing changes
    const BUILD_DATE = new Date("2026-02-20T08:27:00");

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
              <img
                src={getDisplayPhoto(form.photo)}
                className="w-20 h-20 rounded-full object-cover border-2 border-green-600 cursor-pointer hover:opacity-80"
                onClick={() => setShowPhotoModal(true)}
              />
            ) : (
              <div onClick={() => setShowPhotoModal(true)} className="w-20 h-20 rounded-full bg-gray-200 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-300">
                <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                <span className="text-[9px] text-gray-500 font-medium">add photo</span>
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

    // ==================== POLICY CONSTANTS ====================
    const PICKUP_POLICY = `
Only authorized emergency contacts may pick up your child.
Photo ID is required for all pickups.
If someone not on the authorized list needs to pick up,
parents must notify camp staff in advance by phone or email.
    `.trim();

    const DROPOFF_POLICY = `
Morning sessions: Drop-off is between 8:45 AM - 9:00 AM
Afternoon sessions: Drop-off is between 11:45 AM - 12:00 PM
Please sign in your child with the counselor on duty at the main gym entrance.
    `.trim();

      const CounselorOnboarding = ({ onComplete, onBack, users, saveUsers, counselors, saveCounselors, availability, saveAvailability, counselorSchedule, saveCounselorSchedule }) => {
        const [step, setStep] = useState(1);
        const [userData, setUserData] = useState({ name: '', email: '', phone: '', password: '' });
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
            if (!userData.name || !userData.email || !userData.phone || !userData.password) {
              setError('Please fill in all required fields');
              return false;
            }
            if (!isValidPhone(userData.phone)) {
              setError('Please enter a valid phone number');
              return false;
            }
            if (users.some(u => u.email === userData.email) || counselors.some(c => c.email === userData.email)) {
              setError('An account with this email already exists');
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
              } catch (e) { /* Continue without hash */ }
            }
            await saveUsers([...users, newUser]);

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
                    <p className="text-gray-600 mb-4">Create your counselor account to get started.</p>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                      <input value={userData.name} onChange={e => setUserData({ ...userData, name: e.target.value })} className="w-full px-4 py-3 border-2 rounded-lg focus:border-blue-500 focus:outline-none" placeholder="Your full name" autoComplete="off" data-1p-ignore="true" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                      <input type="email" value={userData.email} onChange={e => setUserData({ ...userData, email: e.target.value })} className="w-full px-4 py-3 border-2 rounded-lg focus:border-blue-500 focus:outline-none" placeholder="your@email.com" autoComplete="off" data-1p-ignore="true" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                      <input value={userData.phone} onChange={e => setUserData({ ...userData, phone: formatPhone(e.target.value) })} className="w-full px-4 py-3 border-2 rounded-lg focus:border-blue-500 focus:outline-none" placeholder="(555) 555-1234" autoComplete="off" data-1p-ignore="true" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                      <div className="relative">
                        <input type={showPassword ? 'text' : 'password'} value={userData.password} onChange={e => setUserData({ ...userData, password: e.target.value })} className="w-full px-4 py-3 border-2 rounded-lg focus:border-blue-500 focus:outline-none pr-16" placeholder="Create a password" autoComplete="off" data-1p-ignore="true" />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 text-sm">{showPassword ? 'Hide' : 'Show'}</button>
                      </div>
                    </div>
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
                          <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-blue-600 rounded-full text-white flex items-center justify-center">✎</div>
                        </div>
                      ) : (
                        <div onClick={() => setShowPhotoModal(true)} className="w-32 h-32 rounded-full bg-gray-200 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-300">
                          <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                          <span className="text-xs text-gray-500 font-medium">add photo</span>
                        </div>
                      )}
                      {showPhotoModal && (
                        <PhotoUploadModal
                          currentPhoto={profileData.photo}
                          onSave={(img) => { setProfileData({ ...profileData, photo: img }); setShowPhotoModal(false); }}
                          onCancel={() => setShowPhotoModal(false)}
                        />
                      )}
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
    // ==================== POD DETAIL MODAL ====================
    const PodDetailModal = ({ date, session, assignments, counselors, campers, myCounselorId, onClose }) => {
      const d = new Date(date + 'T12:00:00');
      const dateLabel = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
      const sessionLabel = session === 'morning' ? '☀️ Morning (9:00 AM – 12:00 PM)' : '🌙 Afternoon (12:00 – 3:00 PM)';
      const key = `${date}_${session}`;
      const sessionAssignments = assignments[key] || {};

      const renderCamperRow = (camperId) => {
        const camper = (campers || []).find(c => c.id === camperId);
        const photo = camper ? getDisplayPhoto(camper.photo) : null;
        const age = camper?.birthdate ? calculateAge(camper.birthdate) : null;
        const name = camper ? `${camper.firstName || ''} ${camper.lastName || ''}`.trim() : 'Unknown Camper';
        const initials = camper ? `${(camper.firstName || '?')[0]}${(camper.lastName || '?')[0]}`.toUpperCase() : '??';

        return (
          <div key={camperId} className="flex items-center gap-3 py-2">
            {photo ? (
              <img src={photo} className="w-10 h-10 rounded-full object-cover border-2 border-green-200" alt={name} />
            ) : (
              <div className="w-10 h-10 rounded-full bg-green-100 border-2 border-green-200 flex items-center justify-center text-green-700 font-bold text-sm">{initials}</div>
            )}
            <div>
              <div className="font-medium text-gray-800">{name}</div>
              <div className="text-xs text-gray-500">
                {camper?.grade ? `Grade ${camper.grade}` : ''}{camper?.grade && age != null ? ' · ' : ''}{age != null ? `Age ${age}` : ''}
              </div>
            </div>
          </div>
        );
      };

      // My pod
      const myCamperIds = sessionAssignments[myCounselorId] || [];

      // Other counselors
      const otherCounselors = Object.entries(sessionAssignments)
        .filter(([cId]) => cId !== myCounselorId)
        .map(([cId, cCamperIds]) => {
          const counselor = (counselors || []).find(c => c.id === cId);
          return { counselor, camperIds: cCamperIds || [] };
        });

      return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-xl font-bold text-green-800">{dateLabel}</h2>
                  <p className="text-gray-600">{sessionLabel}</p>
                </div>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">✕</button>
              </div>

              {/* My Pod */}
              <div className="mb-6">
                <h3 className="font-bold text-green-700 mb-3 flex items-center gap-2">
                  <span>🏀</span> My Pod ({myCamperIds.length} camper{myCamperIds.length !== 1 ? 's' : ''})
                </h3>
                {myCamperIds.length > 0 ? (
                  <div className="bg-green-50 rounded-lg p-3 divide-y divide-green-100">
                    {myCamperIds.map(id => renderCamperRow(id))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">No campers assigned to your pod.</p>
                )}
              </div>

              {/* Other Counselors */}
              {otherCounselors.length > 0 && (
                <div>
                  <h3 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
                    <span>👥</span> Other Counselors Working
                  </h3>
                  <div className="space-y-4">
                    {otherCounselors.map(({ counselor, camperIds }) => {
                      const cPhoto = counselor ? getDisplayPhoto(counselor.photo) : null;
                      const cName = counselor ? `${counselor.firstName || ''} ${counselor.lastName || ''}`.trim() : 'Unknown';
                      const cInitials = counselor ? `${(counselor.firstName || '?')[0]}${(counselor.lastName || '?')[0]}`.toUpperCase() : '??';
                      return (
                        <div key={counselor?.id || cName} className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center gap-3 mb-2">
                            {cPhoto ? (
                              <img src={cPhoto} className="w-8 h-8 rounded-full object-cover border" alt={cName} />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-gray-200 border flex items-center justify-center text-gray-600 font-bold text-xs">{cInitials}</div>
                            )}
                            <span className="font-medium text-gray-800">{cName}</span>
                            <span className="text-xs text-gray-500">({camperIds.length} camper{camperIds.length !== 1 ? 's' : ''})</span>
                          </div>
                          {camperIds.length > 0 && (
                            <div className="ml-11 divide-y divide-gray-100">
                              {camperIds.map(id => renderCamperRow(id))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
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
      const [users, setUsers] = useState([]);
      const [availability, setAvailability] = useState({});
      const [changeHistory, setChangeHistory] = useState([]);
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
      const [counselorTab, setCounselorTab] = useState('nextsteps');
      const [sessionsTabMonth, setSessionsTabMonth] = useState(null); // Persist selected month in Sessions tab
      const [assignmentsTabMonth, setAssignmentsTabMonth] = useState(null); // Persist selected month in Assignments tab
      const [counselorScheduleModal, setCounselorScheduleModal] = useState(null); // Counselor being scheduled
      const [counselorScheduleMonth, setCounselorScheduleMonth] = useState(null); // Month selected in schedule modal
      const [counselorDashMonth, setCounselorDashMonth] = useState(6); // Persist selected month in Counselor Dashboard (6 = July)
      // showProfileEditModal removed — profile editing is now admin-only
      const [bulkRegModal, setBulkRegModal] = useState(null); // Bulk registration creation: { parentEmail, camperIds, selectedDates: { date: ['morning','afternoon'] } }
      const [bulkRegMonth, setBulkRegMonth] = useState(null); // Selected month for bulk registration
      const [viewRegModal, setViewRegModal] = useState(null); // Registration details view/edit modal
      const [deleteRegConfirm, setDeleteRegConfirm] = useState(null); // Registration to delete confirmation

      const isDevEnv = isDev();
      const showToast = useCallback((msg, type = 'success') => setToast({ msg, type }), []);
      const sessionCost = getSessionCost(content);

      // Scroll to top on tab change so red ribbon is visible
      useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, [counselorTab]);

      useEffect(() => {
        const load = async () => {
          setLoading(true);
          // Safety timeout — show page with defaults if DB takes too long
          const safetyTimer = setTimeout(() => {
            setLoading(false);
            console.warn('⏱️ [TIMEOUT] Database took too long — showing page with default content');
          }, 5000);
          try {
            const cd = await storage.get('camp_content');
            if (cd?.[0]?.data) setContent({ ...DEFAULT_CONTENT, ...cd[0].data });
            const cs = await storage.get('camp_counselors');
            if (cs?.length) setCounselors(cs.map(c => c.data).filter(Boolean).sort((a, b) => (a.order || 0) - (b.order || 0)));
            const rg = await storage.get('camp_registrations');
            if (rg?.length) setRegistrations(rg.map(r => r.data).filter(Boolean));
            const us = await storage.get('camp_counselor_users');
            if (us?.[0]?.data) setUsers(Array.isArray(us[0].data) ? us[0].data : []);
            const av = await storage.get('camp_counselor_availability');
            if (av?.[0]?.data) setAvailability(av[0].data);
            const ch = await storage.get('camp_change_history');
            if (ch?.[0]?.data) setChangeHistory(Array.isArray(ch[0].data) ? ch[0].data : []);
            const ad = await storage.get('camp_admins');
            if (ad?.[0]?.data) setAdmins(Array.isArray(ad[0].data) ? ad[0].data : DEFAULT_ADMINS);
            const as = await storage.get('camp_assignments');
            if (as?.[0]?.data) setAssignments(as[0].data);
            const cp = await storage.get('camp_campers');
            if (cp?.[0]?.data) setCampers(Array.isArray(cp[0].data) ? cp[0].data : []);
            const cpl = await storage.get('camp_camper_parent_links');
            if (cpl?.[0]?.data) setCamperParentLinks(Array.isArray(cpl[0].data) ? cpl[0].data : []);
            const fp = await storage.get('camp_food_photos');
            if (fp?.[0]?.data) setFoodPhotos(fp[0].data);
            const sp = await storage.get('camp_site_photos');
            if (sp?.[0]?.data) setSitePhotos(sp[0].data);

            // Load new onboarding system data
            const ec = await storage.get('camp_emergency_contacts');
            if (ec?.[0]?.data) setEmergencyContacts(Array.isArray(ec[0].data) ? ec[0].data : []);
            const op = await storage.get('camp_onboarding_progress');
            if (op?.[0]?.data) setOnboardingProgress(op[0].data || {});
            const acr = await storage.get('camp_availability_change_requests');
            if (acr?.[0]?.data) setAvailabilityChangeRequests(Array.isArray(acr[0].data) ? acr[0].data : []);
            const pcr = await storage.get('camp_profile_change_requests');
            if (pcr?.[0]?.data) setProfileChangeRequests(Array.isArray(pcr[0].data) ? pcr[0].data : []);
            const bs = await storage.get('camp_blocked_sessions');
            if (bs?.[0]?.data) setBlockedSessions(typeof bs[0].data === 'object' && !Array.isArray(bs[0].data) ? bs[0].data : {});
            const csch = await storage.get('camp_counselor_schedule');
            if (csch?.[0]?.data) setCounselorSchedule(typeof csch[0].data === 'object' && !Array.isArray(csch[0].data) ? csch[0].data : {});
          } catch (e) { console.error('Load error:', e); }
          clearTimeout(safetyTimer);
          setLoading(false);
        };
        load();
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

      const saveUsers = async (u, action = null) => {
        setUsers(u);
        await storage.set('camp_counselor_users', 'main', u);
        if (action) addToHistory('Parent', action);
      };

      const deleteParent = async (parentEmail, parentName) => {
        // Remove from users state
        const updatedUsers = users.filter(u => u.email !== parentEmail);
        setUsers(updatedUsers);
        await storage.set('camp_counselor_users', 'main', updatedUsers);
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
        setCampers(c);
        await storage.set('camp_campers', 'main', c);
        if (action) addToHistory('Camper', action);
      };
      const saveFoodPhotos = async (photos) => {
        setFoodPhotos(photos);
        await storage.set('camp_food_photos', 'main', photos);
        addToHistory('Content', 'Updated food photos');
        showToast('Photo updated!');
      };

      const saveSitePhotos = async (photos, photoName = null) => {
        setSitePhotos(photos);
        await storage.set('camp_site_photos', 'main', photos);
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

      const getPending = () => registrations.filter(r => r.status === 'pending').length;
      const getApproved = () => registrations.filter(r => r.status === 'approved').length;
      const getCancelled = () => registrations.filter(r => r.status === 'cancelled' || r.status === 'rejected').length;
      const getUnpaid = () => registrations.filter(r => r.status === 'approved' && !['paid', 'confirmed'].includes(r.paymentStatus)).length;

      // ==================== NAV ====================
      // ==================== NAV (COUNSELOR) ====================
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
                <span className="text-green-300 text-xs sm:text-sm px-2 py-1">{user?.name || 'Counselor'}</span>
                <button onClick={handleLogout} className="px-3 sm:px-4 py-2.5 sm:py-2 bg-red-600 hover:bg-red-700 rounded text-sm sm:text-base min-h-[44px]">Logout</button>
              </div>
            </div>
          </nav>
        );
      };

      const CounselorDash = () => {
        const month = counselorDashMonth;
        const setMonth = setCounselorDashMonth;
        const [viewMode, setViewMode] = useState('calendar'); // 'calendar' or 'summary'
        const [podModal, setPodModal] = useState(null); // { date, session } for PodDetailModal
        const myAvail = availability[user?.email] || {};
        const myCounselor = counselors.find(c => c.email === user?.email);

        const getMonthDates = (m) => CAMP_DATES.filter(d => new Date(d + 'T12:00:00').getMonth() === m);

        const getState = (date, session) => {
          const data = myAvail[date];
          if (!data) return null;
          if (data.available?.includes(session)) return 'available';
          if (data.unavailable?.includes(session)) return 'unavailable';
          if (Array.isArray(data) && data.includes(session)) return 'available';
          return null;
        };

        // Sync availability data to counselorSchedule so admin dashboard sees it
        // Saves both available (true) and unavailable (false) sessions
        const syncSchedule = async (newAvail) => {
          if (!myCounselor) return;
          const newSchedule = { ...counselorSchedule };
          newSchedule[myCounselor.id] = {};
          Object.entries(newAvail).forEach(([date, data]) => {
            const avail = Array.isArray(data) ? data : (data.available || []);
            const unavail = Array.isArray(data) ? [] : (data.unavailable || []);
            // Only add date entry if there's any data
            if (avail.length > 0 || unavail.length > 0) {
              newSchedule[myCounselor.id][date] = {};
              // Set true for available, false for unavailable
              if (avail.includes('morning')) newSchedule[myCounselor.id][date].morning = true;
              else if (unavail.includes('morning')) newSchedule[myCounselor.id][date].morning = false;
              if (avail.includes('afternoon')) newSchedule[myCounselor.id][date].afternoon = true;
              else if (unavail.includes('afternoon')) newSchedule[myCounselor.id][date].afternoon = false;
            }
          });
          await saveCounselorSchedule(newSchedule, `${myCounselor.name} updated availability`);
        };

        // Check if counselor has campers assigned for a specific date/session
        const getAssignedCamperCount = (date, session) => {
          if (!myCounselor) return 0;
          const key = `${date}_${session}`;
          const camperIds = assignments[key]?.[myCounselor.id] || [];
          return camperIds.length;
        };

        const cycle = async (date, session) => {
          const newAvail = JSON.parse(JSON.stringify(myAvail));
          const state = getState(date, session);

          if (!newAvail[date] || Array.isArray(newAvail[date])) {
            newAvail[date] = { available: Array.isArray(newAvail[date]) ? [...newAvail[date]] : [], unavailable: [] };
          }

          // Warn if moving from available to unavailable and campers are assigned
          if (state === 'available') {
            const assignedCount = getAssignedCamperCount(date, session);
            if (assignedCount > 0) {
              if (!confirm(`You have ${assignedCount} camper(s) assigned to your pod for ${session} on ${new Date(date + 'T12:00:00').toLocaleDateString()}. Removing your availability means these campers need to be reassigned. Please contact the Camp Director ASAP. Continue?`)) {
                return;
              }
            }
          }

          if (state === null) {
            newAvail[date].available.push(session);
          } else if (state === 'available') {
            newAvail[date].available = newAvail[date].available.filter(s => s !== session);
            newAvail[date].unavailable.push(session);
          } else {
            newAvail[date].unavailable = newAvail[date].unavailable.filter(s => s !== session);
          }

          if (!newAvail[date].available?.length && !newAvail[date].unavailable?.length) delete newAvail[date];

          await saveAvail({ ...availability, [user?.email]: newAvail });
          await syncSchedule(newAvail);
          showToast('Availability updated!');
        };

        // Bulk actions
        const markMonthAvailable = async (monthNum) => {
          const monthDates = getMonthDates(monthNum);
          const newAvail = JSON.parse(JSON.stringify(myAvail));
          monthDates.forEach(date => {
            newAvail[date] = { available: ['morning', 'afternoon'], unavailable: [] };
          });
          await saveAvail({ ...availability, [user?.email]: newAvail });
          await syncSchedule(newAvail);
          showToast('Month marked as available!');
        };

        const clearMonth = async (monthNum) => {
          const monthDates = getMonthDates(monthNum);
          // Check for camper assignments that would be affected
          let totalAffected = 0;
          monthDates.forEach(date => {
            totalAffected += getAssignedCamperCount(date, 'morning');
            totalAffected += getAssignedCamperCount(date, 'afternoon');
          });
          if (totalAffected > 0) {
            if (!confirm(`You have ${totalAffected} camper assignment(s) this month that would be affected. Clearing your availability means these campers need to be reassigned. Please contact the Camp Director ASAP. Continue?`)) {
              return;
            }
          }
          const newAvail = JSON.parse(JSON.stringify(myAvail));
          monthDates.forEach(date => {
            delete newAvail[date];
          });
          await saveAvail({ ...availability, [user?.email]: newAvail });
          await syncSchedule(newAvail);
          showToast('Month cleared!');
        };

        // Calculate stats
        const getStats = () => {
          let available = 0, unavailable = 0, notSet = 0;
          CAMP_DATES.forEach(date => {
            ['morning', 'afternoon'].forEach(session => {
              const state = getState(date, session);
              if (state === 'available') available++;
              else if (state === 'unavailable') unavailable++;
              else notSet++;
            });
          });
          return { available, unavailable, notSet, total: CAMP_DATES.length * 2 };
        };
        const stats = getStats();

        // Toggle whole day (both AM and PM) — cycles: not-set → available → unavailable → not-set
        const toggleDay = async (date) => {
          const newAvail = JSON.parse(JSON.stringify(myAvail));
          const mState = getState(date, 'morning');
          const aState = getState(date, 'afternoon');

          if (!newAvail[date] || Array.isArray(newAvail[date])) {
            newAvail[date] = { available: Array.isArray(newAvail[date]) ? [...newAvail[date]] : [], unavailable: [] };
          }

          // Warn if toggling from available to unavailable and campers are assigned
          if (mState === 'available' && aState === 'available') {
            const amAssigned = getAssignedCamperCount(date, 'morning');
            const pmAssigned = getAssignedCamperCount(date, 'afternoon');
            const totalAssigned = amAssigned + pmAssigned;
            if (totalAssigned > 0) {
              if (!confirm(`You have ${totalAssigned} camper assignment(s) on ${new Date(date + 'T12:00:00').toLocaleDateString()}. Removing your availability means these campers need to be reassigned. Please contact the Camp Director ASAP. Continue?`)) {
                return;
              }
            }
          }

          if (mState === 'available' && aState === 'available') {
            newAvail[date] = { available: [], unavailable: ['morning', 'afternoon'] };
          } else if (mState === 'unavailable' && aState === 'unavailable') {
            delete newAvail[date];
          } else {
            newAvail[date] = { available: ['morning', 'afternoon'], unavailable: [] };
          }

          if (newAvail[date] && !newAvail[date].available?.length && !newAvail[date].unavailable?.length) {
            delete newAvail[date];
          }

          await saveAvail({ ...availability, [user?.email]: newAvail });
          await syncSchedule(newAvail);
        };

        // Get counselor next steps hints (modeled after parent dashboard)
        const getCounselorHints = () => {
          const hints = [];

          // Step 1: Application approval
          const isApproved = myCounselor?.approvedByAdmin;
          hints.push({
            icon: isApproved ? '✅' : '⏳',
            text: isApproved ? 'Your application has been approved!' : 'Your application is pending admin approval. You\'ll be notified when approved.',
            priority: 1,
            completed: !!isApproved
          });

          // Step 2: Profile photo (read-only — admin manages profiles)
          const hasPhoto = myCounselor && getDisplayPhoto(myCounselor.photo);
          hints.push({
            icon: hasPhoto ? '📸' : '📸',
            text: hasPhoto ? 'Profile photo added' : 'Profile photo not set — contact the Camp Director to update your profile',
            priority: 2,
            completed: !!hasPhoto
          });

          // Step 3: Bio (read-only — admin manages profiles)
          const hasBio = myCounselor && myCounselor.bio && myCounselor.bio.trim().length > 0;
          hints.push({
            icon: hasBio ? '✏️' : '✏️',
            text: hasBio ? 'Bio completed' : 'Bio not set — contact the Camp Director to update your profile',
            priority: 3,
            completed: !!hasBio
          });

          // Step 4: Availability
          const availDone = stats.notSet === 0;
          if (availDone) {
            hints.push({
              icon: '📅',
              text: 'Availability fully set',
              action: () => setCounselorTab('availability'),
              actionText: 'View Availability',
              priority: 4,
              completed: true
            });
          } else if (stats.notSet === stats.total) {
            hints.push({
              icon: '📅',
              text: 'Set your availability — let the admin know which days you can work',
              action: () => setCounselorTab('availability'),
              actionText: 'Set Availability',
              priority: 4,
              completed: false
            });
          } else {
            hints.push({
              icon: '📅',
              text: stats.notSet + ' session' + (stats.notSet > 1 ? 's' : '') + ' still not set — finish marking your availability',
              action: () => setCounselorTab('availability'),
              actionText: 'Update Availability',
              priority: 4,
              completed: false
            });
          }

          // Step 5: Schedule assignments info
          if (myCounselor) {
            let assignmentCount = 0;
            Object.entries(assignments || {}).forEach(([dateSession, counselorAssignments]) => {
              const camperIds = counselorAssignments[myCounselor.id] || [];
              if (camperIds.length > 0) assignmentCount++;
            });
            if (assignmentCount > 0) {
              hints.push({
                icon: '📋',
                text: 'You have ' + assignmentCount + ' session assignment' + (assignmentCount > 1 ? 's' : '') + ' — view your camper pod details',
                action: () => setCounselorTab('schedule'),
                actionText: 'View Schedule',
                priority: 5,
                completed: true
              });
            }
          }

          return hints.sort((a, b) => a.priority - b.priority);
        };

        return (
          <div className="min-h-screen bg-amber-50">
            <div className="bg-green-800 text-white py-4">
              <div className="max-w-6xl mx-auto px-4">
                <h1 className="font-display text-3xl">Counselor Dashboard</h1>
                <p className="text-green-200">Welcome, {user?.name}</p>
              </div>
            </div>

            <div className="bg-white shadow">
              <div className="max-w-6xl mx-auto px-2 sm:px-4">
                <ScrollableTabs persistKey="counselor-tabs">
                  {['nextsteps', 'availability', 'schedule'].map(t => (
                    <button key={t} onClick={() => setCounselorTab(t)} className={'px-2 sm:px-4 py-2 sm:py-3 border-b-2 whitespace-nowrap select-none text-xs sm:text-sm ' + (counselorTab === t ? 'border-green-600 text-green-700 bg-green-50' : 'border-transparent text-gray-500')}>
                      {t === 'nextsteps' ? '📊 Dashboard' : t === 'availability' ? '📅 Availability' : t === 'schedule' ? '📋 Scheduled to Work' : t}
                    </button>
                  ))}
                </ScrollableTabs>
              </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 py-6">

              {/* ===== DASHBOARD TAB ===== */}
              {counselorTab === 'nextsteps' && (() => {
                const hints = getCounselorHints();
                return (
                  <div className="space-y-6">
                    {/* Application Status Banner */}
                    {myCounselor?.approvedByAdmin ? (
                      <div className="bg-green-100 border-l-4 border-green-500 p-4 rounded-lg flex items-center gap-3">
                        <span className="text-2xl">✅</span>
                        <div>
                          <h4 className="font-bold text-green-800">Application Approved</h4>
                          <p className="text-green-700 text-sm">You are approved to counsel at Roosevelt Basketball Day Camp!</p>
                        </div>
                      </div>
                    ) : myCounselor ? (
                      <div className="bg-amber-100 border-l-4 border-amber-500 p-4 rounded-lg flex items-center gap-3">
                        <span className="text-2xl">⏳</span>
                        <div>
                          <h4 className="font-bold text-amber-800">Application Pending</h4>
                          <p className="text-amber-700 text-sm">Your application is being reviewed by the camp admin. You'll be notified when approved.</p>
                        </div>
                      </div>
                    ) : null}

                    {/* Next Steps Card */}
                    {(() => {
                      const incomplete = hints.filter(h => !h.completed);
                      const completed = hints.filter(h => h.completed);
                      return (
                        <>
                          {/* Incomplete — Next Steps (blue) */}
                          {incomplete.length === 0 ? (
                            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl shadow-md p-6 border-2 border-green-200">
                              <div className="bg-white rounded-lg p-6 text-center shadow-sm">
                                <div className="text-4xl mb-3">🎉</div>
                                <h4 className="font-bold text-lg text-green-700 mb-2">You're all set!</h4>
                                <p className="text-gray-600">All steps are complete. Check the Availability tab to update your schedule or the Scheduled to Work tab to see your assignments.</p>
                              </div>
                            </div>
                          ) : (
                            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl shadow-md p-6 border-2 border-blue-200">
                              <h3 className="font-bold text-xl mb-4 text-blue-900 flex items-center gap-2">
                                <span>💡</span>
                                <span>Next Steps</span>
                              </h3>
                              <div className="space-y-3">
                                {incomplete.map((hint, idx) => (
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
                            </div>
                          )}

                          {/* Completed section */}
                          {completed.length > 0 && (
                            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl shadow-md p-6 border-2 border-green-200">
                              <h3 className="font-bold text-xl mb-4 text-green-900 flex items-center gap-2">
                                <span>✅</span>
                                <span>Completed</span>
                              </h3>
                              <div className="space-y-3">
                                {completed.map((hint, idx) => (
                                  <div key={idx} className="flex items-center gap-3 bg-white rounded-lg p-4 shadow-sm opacity-90">
                                    <div className="text-2xl">{hint.icon}</div>
                                    <div className="flex-1">
                                      <p className="text-green-700">{hint.text}</p>
                                    </div>
                                    {hint.action && hint.actionText && (
                                      <button
                                        onClick={hint.action}
                                        className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 whitespace-nowrap text-sm min-w-[200px] text-center"
                                      >
                                        {hint.actionText}
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      );
                    })()}

                  </div>
                );
              })()}

              {/* ===== AVAILABILITY TAB ===== */}
              {counselorTab === 'availability' && (
                <div className="space-y-6">
                  {/* Stats Overview */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-white rounded-xl shadow p-4 text-center">
                      <div className="text-2xl font-bold text-green-600">{stats.available}</div>
                      <div className="text-sm text-gray-600">Available</div>
                    </div>
                    <div className="bg-white rounded-xl shadow p-4 text-center">
                      <div className="text-2xl font-bold text-red-600">{stats.unavailable}</div>
                      <div className="text-sm text-gray-600">Unavailable</div>
                    </div>
                    <div className="bg-white rounded-xl shadow p-4 text-center">
                      <div className="text-2xl font-bold text-gray-600">{stats.notSet}</div>
                      <div className="text-sm text-gray-600">Not Set</div>
                    </div>
                    <div className="bg-white rounded-xl shadow p-4 text-center">
                      <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
                      <div className="text-sm text-gray-600">Total Sessions</div>
                    </div>
                  </div>

                  {/* Month Tabs + Bulk Actions */}
                  <div className="flex flex-wrap gap-2">
                    {[{ m: 6, n: 'July' }, { m: 7, n: 'August' }].map(({ m, n }) => (
                      <button key={m} onClick={() => setMonth(m)} className={'px-6 py-2 rounded-lg font-medium ' + (month === m ? 'bg-green-600 text-white' : 'bg-white border border-green-600 text-green-700')}>{n}</button>
                    ))}
                    <div className="flex-1" />
                    <button onClick={() => markMonthAvailable(month)} className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 text-sm">
                      Mark All Available
                    </button>
                    <button onClick={() => clearMonth(month)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm">
                      Clear Month
                    </button>
                  </div>

                  {/* Responsive Card Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                    {getMonthDates(month).map(date => {
                      const d = new Date(date + 'T12:00:00');
                      const mState = getState(date, 'morning');
                      const aState = getState(date, 'afternoon');
                      const bothAvail = mState === 'available' && aState === 'available';
                      const bothUnavail = mState === 'unavailable' && aState === 'unavailable';
                      const partial = (mState === 'available' || aState === 'available') && (mState !== aState);
                      const cardBorder = bothAvail ? 'border-green-300 bg-green-50' : bothUnavail ? 'border-red-300 bg-red-50' : partial ? 'border-yellow-300 bg-yellow-50' : 'border-gray-200 bg-white';
                      const headerBg = bothAvail ? 'bg-green-200 hover:bg-green-300' : bothUnavail ? 'bg-red-200 hover:bg-red-300' : partial ? 'bg-yellow-100 hover:bg-yellow-200' : 'bg-gray-100 hover:bg-gray-200';
                      const sessionBtn = (s) => s === 'available' ? 'bg-green-500 text-white hover:bg-green-600' : s === 'unavailable' ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-white hover:bg-gray-50 border text-gray-600';
                      const sessionIcon = (s) => s === 'available' ? ' ✓' : s === 'unavailable' ? ' ✗' : '';

                      return (
                        <div key={date} className={'rounded-lg border-2 overflow-hidden hover:shadow-md transition-shadow ' + cardBorder}>
                          <div className={'p-2 text-center font-medium cursor-pointer transition-colors ' + headerBg} onClick={() => toggleDay(date)}>
                            <div className="text-xs text-gray-500">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri'][d.getDay() - 1]}</div>
                            <div className="text-sm">{d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                          </div>
                          <div className="p-2 space-y-1">
                            <button onClick={() => cycle(date, 'morning')} className={'w-full p-1.5 rounded text-xs font-medium transition-colors ' + sessionBtn(mState)}>
                              ☀️ AM{sessionIcon(mState)}
                            </button>
                            <button onClick={() => cycle(date, 'afternoon')} className={'w-full p-1.5 rounded text-xs font-medium transition-colors ' + sessionBtn(aState)}>
                              🌙 PM{sessionIcon(aState)}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Legend */}
                  <div className="bg-white rounded-xl shadow p-4 flex flex-wrap gap-4 justify-center text-sm">
                    <div className="flex items-center gap-2"><div className="w-4 h-4 bg-green-500 rounded" /><span>Available ✓</span></div>
                    <div className="flex items-center gap-2"><div className="w-4 h-4 bg-red-500 rounded" /><span>Unavailable ✗</span></div>
                    <div className="flex items-center gap-2"><div className="w-4 h-4 bg-white border rounded" /><span>Not Set</span></div>
                  </div>
                </div>
              )}

              {/* ===== SCHEDULED TO WORK TAB ===== */}
              {counselorTab === 'schedule' && (
                <div className="space-y-6">
                  {(() => {
                    if (!myCounselor) {
                      return <div className="bg-white rounded-xl shadow p-6 text-center text-gray-500">No counselor profile found.</div>;
                    }

                    // Build assignment map for this counselor across all dates
                    const myAssignmentMap = {};
                    let daysAssigned = 0;
                    let totalSessions = 0;
                    Object.entries(assignments).forEach(([dateSession, counselorAssignments]) => {
                      const [date, session] = dateSession.split('_');
                      const camperIds = counselorAssignments[myCounselor.id] || [];
                      if (camperIds.length > 0) {
                        if (!myAssignmentMap[date]) myAssignmentMap[date] = {};
                        myAssignmentMap[date][session] = camperIds;
                        totalSessions++;
                      }
                    });
                    daysAssigned = Object.keys(myAssignmentMap).length;

                    return (
                      <>
                        {/* Stats */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-white rounded-xl shadow p-4 text-center">
                            <div className="text-2xl font-bold text-green-600">{daysAssigned}</div>
                            <div className="text-sm text-gray-600">Days Assigned</div>
                          </div>
                          <div className="bg-white rounded-xl shadow p-4 text-center">
                            <div className="text-2xl font-bold text-blue-600">{totalSessions}</div>
                            <div className="text-sm text-gray-600">Total Sessions</div>
                          </div>
                        </div>

                        {/* Month Tabs */}
                        <div className="flex flex-wrap gap-2">
                          {[{ m: 6, n: 'July' }, { m: 7, n: 'August' }].map(({ m, n }) => (
                            <button key={m} onClick={() => setMonth(m)} className={'px-6 py-2 rounded-lg font-medium ' + (month === m ? 'bg-green-600 text-white' : 'bg-white border border-green-600 text-green-700')}>{n}</button>
                          ))}
                        </div>

                        {/* Responsive Card Grid */}
                        {getMonthDates(month).length === 0 ? (
                          <div className="bg-white rounded-xl shadow p-6 text-center text-gray-500">No camp dates in this month.</div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                            {getMonthDates(month).map(date => {
                              const d = new Date(date + 'T12:00:00');
                              const amCampers = myAssignmentMap[date]?.morning || [];
                              const pmCampers = myAssignmentMap[date]?.afternoon || [];
                              const hasAm = amCampers.length > 0;
                              const hasPm = pmCampers.length > 0;
                              const hasBoth = hasAm && hasPm;
                              const hasAny = hasAm || hasPm;
                              const cardBorder = hasBoth ? 'border-green-300 bg-green-50' : hasAny ? 'border-yellow-300 bg-yellow-50' : 'border-gray-200 bg-white';
                              const headerBg = hasBoth ? 'bg-green-200' : hasAny ? 'bg-yellow-100' : 'bg-gray-100';

                              return (
                                <div key={date} className={'rounded-lg border-2 overflow-hidden transition-shadow ' + cardBorder + (hasAny ? ' hover:shadow-md' : '')}>
                                  <div className={'p-2 text-center font-medium ' + headerBg}>
                                    <div className="text-xs text-gray-500">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri'][d.getDay() - 1]}</div>
                                    <div className="text-sm">{d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                                  </div>
                                  <div className="p-2 space-y-1">
                                    {hasAm ? (
                                      <button onClick={() => setPodModal({ date, session: 'morning' })} className="w-full p-1.5 rounded text-xs font-medium bg-green-500 text-white hover:bg-green-600 transition-colors">
                                        ☀️ AM · {amCampers.length} camper{amCampers.length !== 1 ? 's' : ''}
                                      </button>
                                    ) : (
                                      <div className="w-full p-1.5 rounded text-xs bg-gray-100 text-gray-400 text-center">☀️ AM</div>
                                    )}
                                    {hasPm ? (
                                      <button onClick={() => setPodModal({ date, session: 'afternoon' })} className="w-full p-1.5 rounded text-xs font-medium bg-green-500 text-white hover:bg-green-600 transition-colors">
                                        🌙 PM · {pmCampers.length} camper{pmCampers.length !== 1 ? 's' : ''}
                                      </button>
                                    ) : (
                                      <div className="w-full p-1.5 rounded text-xs bg-gray-100 text-gray-400 text-center">🌙 PM</div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* Pod Detail Modal */}
            {podModal && myCounselor && (
              <PodDetailModal
                date={podModal.date}
                session={podModal.session}
                assignments={assignments}
                counselors={counselors}
                campers={campers}
                myCounselorId={myCounselor.id}
                onClose={() => setPodModal(null)}
              />
            )}
          </div>
        );
      };

      // ==================== AUTH CHECK & ROUTER (COUNSELOR) ====================
      useEffect(() => {
        const userJson = sessionStorage.getItem('user');
        if (!userJson) {
          window.location.href = '/index.html';
          return;
        }
        const sessionUser = JSON.parse(userJson);
        if (sessionUser.role !== 'counselor') {
          window.location.href = '/index.html';
          return;
        }
        if (!user) setUser(sessionUser);
      }, []);

      if (loading) return <div className="min-h-screen bg-green-50 flex items-center justify-center"><div className="text-6xl">🏀</div></div>;

      if (!user) return <div className="min-h-screen bg-green-50 flex items-center justify-center"><div className="text-6xl">🏀</div></div>;

      return (
        <div className="min-h-screen bg-gray-50">
          <VersionBanner isVisible={isDevEnv || showBanner} isDev={isDevEnv} version={VERSION} buildDate={BUILD_DATE} />
          <Nav />
          <div className="bg-green-800 text-white py-3 sm:py-4">
            <div className="max-w-6xl mx-auto px-4 text-center">
              <h1 className="font-display text-2xl sm:text-3xl">Counselor Dashboard</h1>
              <p className="text-green-200 text-sm sm:text-base">Welcome, {user?.name}</p>
            </div>
          </div>
          {toast && <Toast message={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
          <CounselorDash />

        </div>
      );
    }
