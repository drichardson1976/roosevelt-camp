import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../shared/config';
import { storage, isDev, formatPhone, calculateAge, getDisplayPhoto, getSessionCost, photoStorage } from '../shared/utils';
import { VersionBanner } from '../shared/components/VersionBanner';
import { Toast } from '../shared/components/Toast';
import { ScrollableTabs } from '../shared/components/ScrollableTabs';
import { PhotoUploadModal } from '../shared/components/PhotoUploadModal';
import { CAMP_DATES } from '../shared/campDates';
import { DEFAULT_CONTENT, DEFAULT_COUNSELORS } from '../shared/defaults';

    // ==================== VERSION INFO ====================
    const VERSION = "13.184";
    // BUILD_DATE - update this timestamp when committing changes
    const BUILD_DATE = new Date("2026-02-28T21:00:00");

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
      const [assignments, setAssignments] = useState({}); // { "date_session": { counselorId: [childId, ...] } }
      const [campers, setCampers] = useState([]); // Standalone campers collection
      const [camperParentLinks, setCamperParentLinks] = useState([]); // { camperId, parentEmail } associations
      const [foodPhotos, setFoodPhotos] = useState({}); // Admin-uploadable food photos { snack_fruit: base64, ... }
      const [sitePhotos, setSitePhotos] = useState({}); // Site-wide photos { hero, dropoff, layups, lunch }

      // New state for onboarding system
      const [emergencyContacts, setEmergencyContacts] = useState([]); // Emergency contact records
      const [blockedSessions, setBlockedSessions] = useState({}); // { date: { morning: bool, afternoon: bool } }
      const [counselorSchedule, setCounselorSchedule] = useState({}); // { counselorId: { date: { morning: bool, afternoon: bool } } }

      const [adminTab, setAdminTab] = useState('dashboard');
      const [parentTab, setParentTab] = useState('dashboard');
      const [counselorTab, setCounselorTab] = useState('nextsteps');
      const [sessionsTabMonth, setSessionsTabMonth] = useState(null); // Persist selected month in Sessions tab
      const [assignmentsTabMonth, setAssignmentsTabMonth] = useState(null); // Persist selected month in Assignments tab
      const [counselorScheduleModal, setCounselorScheduleModal] = useState(null); // Counselor being scheduled
      const [counselorScheduleMonth, setCounselorScheduleMonth] = useState(null); // Month selected in schedule modal
      const [counselorDashMonth, setCounselorDashMonth] = useState(7); // Persist selected month in Counselor Dashboard (7 = August)
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

      const saveAvail = async (a) => { setAvailability(a); await storage.set('camp_counselor_availability', 'main', a); };

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
      };

      const saveCampers = async (c, action = null) => {
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
                {(user?.roles || []).includes('admin') && (
                  <button onClick={() => {
                    const updated = { ...user, role: 'admin' };
                    sessionStorage.setItem('user', JSON.stringify(updated));
                    window.location.href = '/admin.html';
                  }} className="px-3 sm:px-4 py-2.5 sm:py-2 bg-purple-600 hover:bg-purple-700 rounded text-sm sm:text-base min-h-[44px]">Admin View</button>
                )}
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
        const [showProfileEdit, setShowProfileEdit] = useState(false); // Profile edit modal
        const myAvail = availability[user?.email] || {};
        const myCounselor = counselors.find(c => c.email === user?.email);

        // Profile Edit Modal Component
        const ProfileEditModal = () => {
          const [bio, setBio] = useState(myCounselor?.bio || '');
          const [photo, setPhoto] = useState(myCounselor?.photo || null);
          const [showPhotoUpload, setShowPhotoUpload] = useState(false);
          const [saving, setSaving] = useState(false);

          const handleSave = async () => {
            if (!myCounselor) return;
            setSaving(true);
            try {
              const updatedCounselors = counselors.map(c =>
                c.id === myCounselor.id ? { ...c, bio, photo } : c
              );
              await saveCounselors(updatedCounselors, `${myCounselor.name} updated profile`);
              setShowProfileEdit(false);
              showToast('Profile updated!');
            } catch (err) {
              console.error('Error saving profile:', err);
              showToast('Error saving profile. Please try again.', 'error');
            } finally {
              setSaving(false);
            }
          };

          return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
                <h2 className="font-display text-2xl text-green-800 mb-4">Edit Profile</h2>

                {/* Photo Section */}
                <div className="flex items-center gap-4 mb-6">
                  {getDisplayPhoto(photo) ? (
                    <img
                      src={getDisplayPhoto(photo)}
                      className="w-24 h-24 rounded-full object-cover border-4 border-green-600 cursor-pointer hover:opacity-80"
                      onClick={() => setShowPhotoUpload(true)}
                    />
                  ) : (
                    <div
                      onClick={() => setShowPhotoUpload(true)}
                      className="w-24 h-24 rounded-full bg-gray-200 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-300 border-4 border-dashed border-gray-400"
                    >
                      <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                      <span className="text-xs text-gray-500 font-medium">Add Photo</span>
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="text-sm text-gray-600">{getDisplayPhoto(photo) ? 'Click photo to change' : 'Add a profile photo'}</p>
                    <p className="text-xs text-gray-400 mt-1">This will be visible on the public website</p>
                  </div>
                </div>

                {showPhotoUpload && (
                  <PhotoUploadModal
                    currentPhoto={photo}
                    onSave={(img) => { setPhoto(img); setShowPhotoUpload(false); }}
                    onCancel={() => setShowPhotoUpload(false)}
                  />
                )}

                {/* Bio Section */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Bio</label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="w-full px-4 py-3 border-2 rounded-lg focus:border-green-500 focus:outline-none h-32 resize-none"
                    placeholder="Tell campers and parents about yourself..."
                  />
                  <p className="text-xs text-gray-400 mt-1">{bio.length} characters</p>
                </div>

                {/* Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowProfileEdit(false)}
                    className="flex-1 py-3 border-2 border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </div>
          );
        };

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

          // Step 2: Profile photo
          const hasPhoto = myCounselor && getDisplayPhoto(myCounselor.photo);
          hints.push({
            icon: hasPhoto ? '📸' : '📸',
            text: hasPhoto ? 'Profile photo added' : 'Profile photo not set',
            action: () => setShowProfileEdit(true),
            actionText: hasPhoto ? 'Change Photo' : 'Add Photo',
            priority: 2,
            completed: !!hasPhoto
          });

          // Step 3: Bio
          const hasBio = myCounselor && myCounselor.bio && myCounselor.bio.trim().length > 0;
          hints.push({
            icon: hasBio ? '✏️' : '✏️',
            text: hasBio ? 'Bio completed' : 'Bio not set',
            action: () => setShowProfileEdit(true),
            actionText: hasBio ? 'Edit Bio' : 'Add Bio',
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
            {/* Profile Edit Modal */}
            {showProfileEdit && <ProfileEditModal />}

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
                    <button className="px-6 py-2 rounded-lg font-medium bg-green-600 text-white">August</button>
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
        const userRoles = sessionUser.roles || [sessionUser.role];
        if (sessionUser.role !== 'counselor' && !userRoles.includes('counselor')) {
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
