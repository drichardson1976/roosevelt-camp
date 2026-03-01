import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase, SCHEMA } from '../shared/config';
import { storage, isDev, formatPhone, isValidPhone, formatBirthdate, formatTimestamp, calculateAge, getDisplayPhoto, getSessionCost, KIDS_PER_COUNSELOR, photoStorage } from '../shared/utils';
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
import { CounselorEditForm } from './components/CounselorEditForm';
import { PICKUP_POLICY, DROPOFF_POLICY, ParentOnboarding } from './components/ParentOnboardingWizard';
import { ParentsTab } from './tabs/ParentsTab';
import { AdminsTab } from './tabs/AdminsTab';
import { GymRentalDaysTab } from './tabs/GymRentalDaysTab';
import { SessionsTab } from './tabs/SessionsTab';
import { ChildrenTab } from './tabs/ChildrenTab';
import { CampersTab } from './tabs/CampersTab';
import { AssignmentsTab } from './tabs/AssignmentsTab';
import { FoodPhotosManager } from './components/FoodPhotosManager';
import { SitePhotosManager } from './components/SitePhotosManager';
import { InvoicesSubTab } from './tabs/InvoicesSubTab';

    // ==================== VERSION INFO ====================
    const VERSION = "13.181";
    // BUILD_DATE - update this timestamp when committing changes
    const BUILD_DATE = new Date("2026-02-28T20:50:00");

    // ==================== MAIN APP ====================
    export function RooseveltCamp() {
      const _mountLogged = useRef(false);
      if (!_mountLogged.current) {
        console.log('⏱️ [ADMIN] Step 4: React component mounting: ' + (performance.now() - (window.__t0 || 0)).toFixed(0) + 'ms');
        _mountLogged.current = true;
      }
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
      const [counselorUsers, setCounselorUsers] = useState([]);
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
      const [gymRentals, setGymRentals] = useState({}); // { date: { morning: bool, afternoon: bool } }
      const [gymRentalsTabMonth, setGymRentalsTabMonth] = useState(null); // Persist selected month in Gym Rentals tab

      const [adminParentTab, setAdminParentTab] = useState('dashboard');
      const [showPaidRegs, setShowPaidRegs] = useState(false);

      // Backward compatibility: Combined users array for components not yet refactored
      const users = [...parents, ...counselorUsers];
      const [adminChildTab, setAdminChildTab] = useState({
        family: 'parents',
        counselor: 'counselors',
        pod: 'assignments',
        camp: 'gymrentals'
      });
      const [sessionsTabMonth, setSessionsTabMonth] = useState(null); // Persist selected month in Sessions tab
      const [assignmentsTabMonth, setAssignmentsTabMonth] = useState(null); // Persist selected month in Assignments tab
      const [podSelectedDate, setPodSelectedDate] = useState(null); // Persist selected date in Pod Setup
      const [podSelectedSession, setPodSelectedSession] = useState('morning'); // Persist selected session in Pod Setup
      const [podSessionPods, setPodSessionPods] = useState({}); // Persist pod data in Pod Setup
      const [podCalWeeks, setPodCalWeeks] = useState(null); // Week filter for Pod Setup date grid (null = not yet initialized)
      const [podCalDates, setPodCalDates] = useState(null); // Specific date filter for Pod Setup (null = not yet initialized)
      const [podCamperView, setPodCamperView] = useState(false); // Camper-centric view toggle
      const [podSelectedCamper, setPodSelectedCamper] = useState(null); // Selected camper in camper view
      const [counselorScheduleModal, setCounselorScheduleModal] = useState(null); // Counselor being edited (availability modal)
      const [counselorScheduleMonths, setCounselorScheduleMonths] = useState([]); // Months selected in availability modal (array for multi-select)
      const [counselorAvailDraft, setCounselorAvailDraft] = useState(null); // Draft copy of availability for Save/Cancel
      const [counselorDashMonth, setCounselorDashMonth] = useState(6); // Persist selected month in Counselor Dashboard (6 = July)
      const [bulkRegModal, setBulkRegModal] = useState(null); // Bulk registration creation: { parentEmail, camperIds, selectedDates: { date: ['morning','afternoon'] } }
      const [bulkRegMonth, setBulkRegMonth] = useState(null); // Selected month for bulk registration
      const [viewRegModal, setViewRegModal] = useState(null); // Registration details view/edit modal
      const [deleteRegConfirm, setDeleteRegConfirm] = useState(null); // Registration to delete confirmation
      // Admin component state (lifted to prevent remounting)
      const [editCounselor, setEditCounselor] = useState(null);
      const [showModal, setShowModal] = useState(false);
      const [confirmDeleteCounselor, setConfirmDeleteCounselor] = useState(null);
      const [deleteConfirmText, setDeleteConfirmText] = useState('');
      const [availCalMonths, setAvailCalMonths] = useState([]);
      const [availCalHidden, setAvailCalHidden] = useState({});
      const [availCalWeeks, setAvailCalWeeks] = useState(null);
      const [availCalDates, setAvailCalDates] = useState(null);
      const [availCalSession, setAvailCalSession] = useState('both');
      const [schedCalMonths, setSchedCalMonths] = useState([]);
      const [schedCalHidden, setSchedCalHidden] = useState({});
      const [schedCalWeeks, setSchedCalWeeks] = useState(null);
      const [schedCalDates, setSchedCalDates] = useState(null);
      const [schedCalSession, setSchedCalSession] = useState('both');
      // (messaging state variables removed — feature deprecated)

      const isDevEnv = isDev();
      const showToast = useCallback((msg, type = 'success') => setToast({ msg, type }), []);
      const sessionCost = getSessionCost(content);

      // Performance: log once when page becomes interactive (loading finished)
      const _paintLogged = useRef(false);
      useEffect(() => {
        if (!loading && !_paintLogged.current) {
          _paintLogged.current = true;
          requestAnimationFrame(() => {
            console.log('⏱️ [ADMIN] Step 7: First paint complete: ' + (performance.now() - (window.__t0 || 0)).toFixed(0) + 'ms');
            console.log('⏱️ [ADMIN] ====== TOTAL TIME TO INTERACTIVE: ' + (performance.now() - (window.__t0 || 0)).toFixed(0) + 'ms ======');
          });
        }
      }, [loading]);

      useEffect(() => {
        const load = async () => {
          setLoading(true);
          // Safety timeout: show page with defaults after 5 seconds even if DB is slow/down
          const safetyTimer = setTimeout(() => {
            setLoading(false);
            console.warn('⏱️ [TIMEOUT] Database took too long — showing page with default content');
          }, 5000);

          const dbStart = performance.now();
          try {
            // Phase 1: Core tables for immediate display (6 tables — registrations moved to Phase 2, it's slow)
            const [cd, cs, pr, ad, cp, cpl] = await Promise.all([
              storage.get('camp_content'),
              storage.get('camp_counselors'),
              storage.get('camp_parents'),
              storage.get('camp_admins'),
              storage.get('camp_campers'),
              storage.get('camp_camper_parent_links'),
            ]);
            if (cd?.[0]?.data) setContent({ ...DEFAULT_CONTENT, ...cd[0].data });
            if (cs?.length) setCounselors(cs.map(c => c.data).filter(Boolean).sort((a, b) => (a.order || 0) - (b.order || 0)));
            if (pr?.[0]?.data) setParents(Array.isArray(pr[0].data) ? pr[0].data : []);
            if (ad?.[0]?.data) setAdmins(Array.isArray(ad[0].data) ? ad[0].data : DEFAULT_ADMINS);
            if (cp?.[0]?.data) setCampers(Array.isArray(cp[0].data) ? cp[0].data : []);
            if (cpl?.[0]?.data) setCamperParentLinks(Array.isArray(cpl[0].data) ? cpl[0].data : []);
          } catch (e) { console.error('Phase 1 load error:', e); }
          clearTimeout(safetyTimer);
          console.log('⏱️ [ADMIN] Step 5: Phase 1 DB loaded (6 tables): ' + (performance.now() - (window.__t0 || 0)).toFixed(0) + 'ms (DB took ' + (performance.now() - dbStart).toFixed(0) + 'ms)');
          setLoading(false);

          // Phase 2: Remaining 14 tables loaded in background (includes camp_registrations — slow table)
          const phase2Start = performance.now();
          try {
            const [rg, cu, av, ch, as2, fp, sp, ec, op, acr, pcr, bs, csch, gr] = await Promise.all([
              storage.get('camp_registrations'),
              storage.get('camp_counselor_users'),
              storage.get('camp_counselor_availability'),
              storage.get('camp_change_history'),
              storage.get('camp_assignments'),
              storage.get('camp_food_photos'),
              storage.get('camp_site_photos'),
              storage.get('camp_emergency_contacts'),
              storage.get('camp_onboarding_progress'),
              storage.get('camp_availability_change_requests'),
              storage.get('camp_profile_change_requests'),
              storage.get('camp_blocked_sessions'),
              storage.get('camp_counselor_schedule'),
              storage.get('camp_gym_rentals'),
            ]);
            if (rg?.length) setRegistrations(rg.map(r => r.data).filter(Boolean));
            if (cu?.[0]?.data) setCounselorUsers(Array.isArray(cu[0].data) ? cu[0].data : []);
            if (av?.[0]?.data) setAvailability(av[0].data);
            if (ch?.[0]?.data) setChangeHistory(Array.isArray(ch[0].data) ? ch[0].data : []);
            if (as2?.[0]?.data) setAssignments(as2[0].data);
            if (fp?.[0]?.data) setFoodPhotos(fp[0].data);
            if (sp?.[0]?.data) setSitePhotos(sp[0].data);
            if (ec?.[0]?.data) setEmergencyContacts(Array.isArray(ec[0].data) ? ec[0].data : []);
            if (op?.[0]?.data) setOnboardingProgress(op[0].data || {});
            if (acr?.[0]?.data) setAvailabilityChangeRequests(Array.isArray(acr[0].data) ? acr[0].data : []);
            if (pcr?.[0]?.data) setProfileChangeRequests(Array.isArray(pcr[0].data) ? pcr[0].data : []);
            if (bs?.[0]?.data) setBlockedSessions(typeof bs[0].data === 'object' && !Array.isArray(bs[0].data) ? bs[0].data : {});
            if (csch?.[0]?.data) setCounselorSchedule(typeof csch[0].data === 'object' && !Array.isArray(csch[0].data) ? csch[0].data : {});
            if (gr?.[0]?.data) setGymRentals(typeof gr[0].data === 'object' && !Array.isArray(gr[0].data) ? gr[0].data : {});
          } catch (e) { console.error('Phase 2 load error:', e); }
          console.log('⏱️ [ADMIN] Step 6: Phase 2 DB loaded (14 tables): ' + (performance.now() - (window.__t0 || 0)).toFixed(0) + 'ms (DB took ' + (performance.now() - phase2Start).toFixed(0) + 'ms) — all data ready');
        };
        load();
      }, []);

      const addToHistory = useCallback(async (action, details, relatedEmails = []) => {
        const entry = {
          id: Date.now(),
          timestamp: new Date().toISOString(),
          action,
          details,
          changedBy: user?.name || user?.email || 'Admin',
          ...(relatedEmails.length > 0 ? { relatedEmails } : {})
        };
        const newHistory = [entry, ...changeHistory].slice(0, 500);
        setChangeHistory(newHistory);
        await storage.set('camp_change_history', 'main', newHistory);
      }, [changeHistory, user]);

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

      // Backward compatibility: saveUsers intelligently routes to correct table
      const saveUsers = async (u, action = null) => {
        const newParents = u.filter(user => user.role === 'parent' || user.roles?.includes('parent'));
        const newCounselorUsers = u.filter(user => user.role === 'counselor' || user.roles?.includes('counselor'));

        if (newParents.length > 0) await saveParents(newParents, action);
        if (newCounselorUsers.length > 0) await saveCounselorUsers(newCounselorUsers, action);
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

      const saveGymRentals = async (rentals, action = null) => {
        setGymRentals(rentals);
        await storage.set('camp_gym_rentals', 'main', rentals);
        if (action) addToHistory('Gym Rentals', action);
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

      const countOrders = (regs) => new Set(regs.map(r => r.orderId || r.id)).size;
      const getPending = () => countOrders(registrations.filter(r => r.status === 'pending' && ['sent', 'submitted'].includes(r.paymentStatus)));
      const getApproved = () => countOrders(registrations.filter(r => r.status === 'approved'));
      const getCancelled = () => countOrders(registrations.filter(r => r.status === 'cancelled' || r.status === 'rejected'));
      const getUnpaid = () => countOrders(registrations.filter(r => r.status === 'pending' && r.paymentStatus === 'unpaid'));

      // ==================== ADMIN TAB CONFIGURATION ====================
      const ADMIN_TAB_CONFIG = {
        'dashboard': { label: '📊 Dashboard', hasChildren: false },
        'family': {
          label: '👨‍👩‍👧 Family Setup',
          hasChildren: true,
          children: {
            'parents': { label: 'Parents', badge: () => parents.length },
            'campers': { label: 'Campers', badge: () => campers.length }
          },
          defaultChild: 'parents'
        },
        'counselor': {
          label: '🏀 Counselor Setup',
          hasChildren: true,
          badge: () => counselors.length,
          children: {
            'counselors': { label: 'Counselors', badge: () => counselors.filter(c => c.visible !== false && c.approvedByAdmin !== false).length },
            'applications': { label: 'Applications', badge: () => counselors.filter(c => c.approvedByAdmin === false || c.visible === false).length },
            'availability': { label: 'Work Availability' },
            'workschedule': { label: 'Work Schedule' }
          },
          defaultChild: 'counselors'
        },
        'registrations': {
          label: '✅ Registrations',
          hasChildren: true,
          badge: () => getPending(),
          children: {
            'new': { label: 'New', badge: () => getUnpaid() },
            'pending': { label: 'Pending Approval', badge: () => getPending() },
            'paid': { label: 'Paid', badge: () => getApproved() },
            'invoices': { label: 'Customer Invoices', badge: () => countOrders(registrations.filter(r => r.invoiceId)) }
          },
          defaultChild: 'new'
        },
        'pod': {
          label: '📋 Pod Setup',
          hasChildren: true,
          children: {
            'assignments': { label: 'Counselor and Camper Assignments' }
          },
          defaultChild: 'assignments'
        },
        'camp': {
          label: '⚙️ Camp Setup',
          hasChildren: true,
          children: {
            'gymrentals': { label: 'Gym Rental Days' },
            'content': { label: 'Public Website Content' },
            'history': { label: '📜 History' },
            'dangerzone': { label: '⚠️ Danger Zone' }
          },
          defaultChild: 'gymrentals'
        }
      };

      // Navigation helper functions
      const getActiveChildTab = (parentKey) => {
        const config = ADMIN_TAB_CONFIG[parentKey];
        if (!config?.hasChildren) return null;
        return adminChildTab[parentKey] || config.defaultChild;
      };

      const navigateToTab = (parentKey, childKey = null) => {
        setAdminParentTab(parentKey);
        const config = ADMIN_TAB_CONFIG[parentKey];
        if (config?.hasChildren) {
          const targetChild = childKey || adminChildTab[parentKey] || config.defaultChild;
          setAdminChildTab(prev => ({ ...prev, [parentKey]: targetChild }));
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
      };

      // ==================== NAV ====================
      // ==================== NAV (ADMIN) ====================
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
                <span className="text-green-300 text-xs sm:text-sm px-2 py-1">{user?.name || 'Admin'}</span>
                <button onClick={handleLogout} className="px-3 sm:px-4 py-2.5 sm:py-2 bg-red-600 hover:bg-red-700 rounded text-sm sm:text-base min-h-[44px]">Logout</button>
              </div>
            </div>
          </nav>
        );
      };

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
        const [showCropper, setShowCropper] = useState(false);
        const [tempImage, setTempImage] = useState(null);
        const [submitting, setSubmitting] = useState(false); // Prevents flash during submission
        const photoInputRef = useRef(null);

        const totalSteps = 5;

        const steps = [
          { num: 1, title: 'Account', icon: '👤' },
          { num: 2, title: 'Profile', icon: '🏀' },
          { num: 3, title: 'Availability', icon: '📅' },
          { num: 4, title: 'Responsibilities', icon: '📋' },
          { num: 5, title: 'Submit', icon: '✅' }
        ];

        const handlePhotoUpload = (e) => {
          const file = e.target.files?.[0];
          if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
              setTempImage(reader.result);
              setShowCropper(true);
            };
            reader.readAsDataURL(file);
          }
          if (e.target) e.target.value = '';
        };

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
            await saveCounselorUsers([...counselorUsers, newUser]);

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
            await saveAvail(newAvail);

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

        // Image cropper modal
        if (showCropper && tempImage) {
          return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl max-w-lg w-full p-6">
                <h3 className="font-bold text-lg mb-4">Crop Your Photo</h3>
                <ImageCropper
                  image={tempImage}
                  shape="circle"
                  onSave={(img) => {
                    setProfileData({ ...profileData, photo: img });
                    setShowCropper(false);
                    setTempImage(null);
                  }}
                  onCancel={() => {
                    setShowCropper(false);
                    setTempImage(null);
                  }}
                />
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
                        <div className="relative">
                          <img src={getDisplayPhoto(profileData.photo)} className="w-32 h-32 rounded-full object-cover border-4 border-blue-600" />
                          <button onClick={() => photoInputRef.current?.click()} className="absolute -bottom-2 -right-2 w-10 h-10 bg-blue-600 rounded-full text-white flex items-center justify-center hover:bg-blue-700">✎</button>
                        </div>
                      ) : (
                        <div onClick={() => photoInputRef.current?.click()} className="w-32 h-32 rounded-full bg-gray-200 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-300">
                          <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                          <span className="text-xs text-gray-500 font-medium">add photo</span>
                        </div>
                      )}
                      <input ref={photoInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
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
      // Helper to get food photo (must be in Admin scope where foodPhotos is available)
      const getFoodPhoto = (key) => {
        const data = foodPhotos?.[key];
        if (!data) return null;
        return typeof data === 'string' ? data : data.cropped;
      };

      const Admin = () => {
        // Use lifted state for availability modal to prevent closing on state updates
        const managingSchedule = counselorScheduleModal;
        const setManagingSchedule = setCounselorScheduleModal;
        const scheduleMonths = counselorScheduleMonths;
        const setScheduleMonths = setCounselorScheduleMonths;
        const availDraft = counselorAvailDraft;
        const setAvailDraft = setCounselorAvailDraft;

        // Helper: count sessions where counselor is marked eligible by admin
        const getCounselorEligibleCount = (counselorId) => {
          const schedule = counselorSchedule[counselorId] || {};
          let count = 0;
          Object.values(schedule).forEach(day => {
            if (day.morning) count++;
            if (day.afternoon) count++;
          });
          return count;
        };

        // Helper: count sessions where counselor has campers assigned
        const getCounselorScheduledCount = (counselorId) => {
          let count = 0;
          Object.entries(assignments).forEach(([key, counselorAssignments]) => {
            if (counselorAssignments[counselorId]?.length > 0) {
              count++;
            }
          });
          return count;
        };

        // Sync admin schedule changes to counselor availability table
        const syncScheduleToAvailability = (counselorId, dates, newSchedule) => {
          const counselor = counselors.find(c => c.id === counselorId);
          if (!counselor?.email) return;
          const newAvail = JSON.parse(JSON.stringify(availability));
          if (!newAvail[counselor.email]) newAvail[counselor.email] = {};
          (Array.isArray(dates) ? dates : [dates]).forEach(date => {
            const sched = newSchedule[counselorId]?.[date] || {};
            // Preserve existing counselor-set availability for sessions the admin didn't touch
            const existing = newAvail[counselor.email][date] || {};
            const existingAvail = Array.isArray(existing) ? existing : (existing.available || []);
            const existingUnavail = Array.isArray(existing) ? [] : (existing.unavailable || []);
            const available = [];
            const unavailable = [];
            ['morning', 'afternoon'].forEach(session => {
              if (sched[session] === true) available.push(session);
              else if (sched[session] === false) unavailable.push(session);
              else {
                // Admin didn't set this session — preserve counselor's own setting
                if (existingAvail.includes(session)) available.push(session);
                else if (existingUnavail.includes(session)) unavailable.push(session);
              }
            });
            if (available.length === 0 && unavailable.length === 0) {
              delete newAvail[counselor.email][date];
            } else {
              newAvail[counselor.email][date] = { available, unavailable };
            }
          });
          saveAvail(newAvail);
        };

        // Toggle counselor eligibility for a specific session (cycles: not set → available → unavailable → not set)
        const toggleCounselorEligibility = (counselorId, date, session) => {
          const currentVal = counselorSchedule[counselorId]?.[date]?.[session];
          // Cycle: undefined/null → true (available) → false (unavailable) → delete (not set)
          let newVal;
          let label;
          if (currentVal === true) {
            newVal = false;
            label = 'Unavailable';
          } else if (currentVal === false) {
            newVal = undefined; // not set
            label = 'Not Set';
          } else {
            newVal = true;
            label = 'Available';
          }
          const newDateSched = { ...counselorSchedule[counselorId]?.[date] };
          if (newVal === undefined) {
            delete newDateSched[session];
          } else {
            newDateSched[session] = newVal;
          }
          // Clean up empty date entries
          const hasValues = Object.keys(newDateSched).length > 0;
          const newCounselorSched = { ...counselorSchedule[counselorId] };
          if (hasValues) {
            newCounselorSched[date] = newDateSched;
          } else {
            delete newCounselorSched[date];
          }
          const newSchedule = { ...counselorSchedule, [counselorId]: newCounselorSched };
          const counselor = counselors.find(c => c.id === counselorId);
          saveCounselorSchedule(newSchedule, `Set ${counselor?.name} ${date} ${session} to ${label}`);
          syncScheduleToAvailability(counselorId, date, newSchedule);
        };

        // Toggle entire day for counselor (cycles: not set → available → unavailable → not set)
        const toggleCounselorDay = (counselorId, date) => {
          const currentMorning = counselorSchedule[counselorId]?.[date]?.morning;
          const currentAfternoon = counselorSchedule[counselorId]?.[date]?.afternoon;
          const allAvailable = currentMorning === true && currentAfternoon === true;
          const allUnavailable = currentMorning === false && currentAfternoon === false;
          let newDateSched;
          let label;
          if (allAvailable) {
            newDateSched = { morning: false, afternoon: false };
            label = 'Unavailable';
          } else if (allUnavailable) {
            newDateSched = undefined; // not set — remove entry
            label = 'Not Set';
          } else {
            newDateSched = { morning: true, afternoon: true };
            label = 'Available';
          }
          const newCounselorSched = { ...counselorSchedule[counselorId] };
          if (newDateSched) {
            newCounselorSched[date] = newDateSched;
          } else {
            delete newCounselorSched[date];
          }
          const newSchedule = { ...counselorSchedule, [counselorId]: newCounselorSched };
          const counselor = counselors.find(c => c.id === counselorId);
          saveCounselorSchedule(newSchedule, `Set ${counselor?.name} ${date} (full day) to ${label}`);
          syncScheduleToAvailability(counselorId, date, newSchedule);
        };

        // Toggle entire week for counselor
        const toggleCounselorWeek = (counselorId, weekDates) => {
          let allSet = true;
          weekDates.forEach(date => {
            if (counselorSchedule[counselorId]?.[date]?.morning !== true) allSet = false;
            if (counselorSchedule[counselorId]?.[date]?.afternoon !== true) allSet = false;
          });
          const newSchedule = { ...counselorSchedule };
          if (!newSchedule[counselorId]) newSchedule[counselorId] = {};
          weekDates.forEach(date => {
            newSchedule[counselorId][date] = {
              morning: !allSet,
              afternoon: !allSet
            };
          });
          const counselor = counselors.find(c => c.id === counselorId);
          saveCounselorSchedule(newSchedule, `${!allSet ? 'Added' : 'Removed'} ${counselor?.name} ${!allSet ? 'to' : 'from'} week`);
          syncScheduleToAvailability(counselorId, weekDates, newSchedule);
        };

        const updateContent = (field, value) => {
          const newContent = { ...content, [field]: value };
          saveContent(newContent, field);
        };

        return (
          <div className="min-h-screen bg-gray-100">
            <div className="bg-green-800 text-white py-3 sm:py-4">
              <div className="max-w-6xl mx-auto px-4 text-center">
                <h1 className="font-display text-2xl sm:text-3xl">Admin Dashboard</h1>
                <p className="text-green-200 text-sm sm:text-base">Welcome, {user?.name}</p>
              </div>
            </div>

            {/* Parent Tabs Row */}
            <div className="bg-white shadow">
              <div className="max-w-6xl mx-auto px-2 sm:px-4">
                <ScrollableTabs persistKey="admin-parent-tabs">
                  {Object.entries(ADMIN_TAB_CONFIG).map(([key, config]) => {
                    const isActive = adminParentTab === key;
                    const badge = config.badge ? config.badge() : null;

                    return (
                      <button
                        key={key}
                        onClick={() => {
                          navigateToTab(key);
                        }}
                        className={`px-4 sm:px-6 py-3 sm:py-4 border-b-3 font-semibold whitespace-nowrap select-none text-sm sm:text-base transition-colors ${
                          isActive
                            ? 'border-green-600 text-green-800 bg-green-100'
                            : 'border-transparent text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {config.label}
                        {badge > 0 && (
                          <span className="ml-2 bg-green-700 text-white text-xs px-2 rounded-full">{badge}</span>
                        )}
                      </button>
                    );
                  })}
                </ScrollableTabs>
              </div>
            </div>

            {/* Child Tabs Row */}
            {ADMIN_TAB_CONFIG[adminParentTab]?.hasChildren && (
              <div className="bg-gray-50 border-t border-gray-200">
                <div className="max-w-6xl mx-auto px-2 sm:px-4">
                  <ScrollableTabs persistKey="admin-child-tabs">
                    {Object.entries(ADMIN_TAB_CONFIG[adminParentTab].children).map(([childKey, childConfig]) => {
                      const isActive = getActiveChildTab(adminParentTab) === childKey;
                      const badge = childConfig.badge ? childConfig.badge() : null;

                      return (
                        <button
                          key={childKey}
                          onClick={() => {
                            setAdminChildTab(prev => ({ ...prev, [adminParentTab]: childKey }));
                          }}
                          className={`px-3 sm:px-4 py-2 sm:py-3 border-b-2 whitespace-nowrap select-none text-xs sm:text-sm transition-colors ${
                            isActive
                              ? 'border-green-500 text-green-700 bg-green-50'
                              : 'border-transparent text-gray-500 hover:text-gray-700'
                          }`}
                        >
                          {childConfig.label}
                          {badge > 0 && (
                            <span className="ml-2 bg-green-700 text-white text-xs px-2 rounded-full">{badge}</span>
                          )}
                        </button>
                      );
                    })}
                  </ScrollableTabs>
                </div>
              </div>
            )}

            <div className="max-w-6xl mx-auto px-4 py-6">
              {adminParentTab === 'dashboard' && (
                <div className="text-center py-16">
                  <div className="text-6xl mb-4">🏀</div>
                  <h2 className="text-2xl font-bold text-gray-700 mb-2">Dashboard</h2>
                  <p className="text-gray-500 max-w-md mx-auto">Dashboard content coming soon. Use the tabs above to manage camp operations.</p>
                </div>
              )}

              {adminParentTab === 'counselor' && getActiveChildTab('counselor') === 'counselors' && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h2 className="font-bold text-xl">Counselors</h2>
                      <p className="text-sm text-gray-500">Manage counselor profiles and work eligibility</p>
                    </div>
                    <button onClick={() => { setEditCounselor({ name: '', email: '', phone: '', position: '', year: '', bio: '', photo: null, visible: true }); setShowModal(true); }} className="bg-green-600 text-white px-4 py-2 rounded-lg">+ Add</button>
                  </div>
                  <div className="space-y-3">
                    {counselors.filter(c => c.visible !== false && c.approvedByAdmin !== false).map((c, idx) => {
                      const eligibleCount = getCounselorEligibleCount(c.id);
                      const scheduledCount = getCounselorScheduledCount(c.id);
                      return (
                      <div key={c.id} className="bg-white rounded-xl shadow p-4">
                        <div className="flex items-center gap-4">
                          {/* Reorder buttons */}
                          <div className="flex flex-col gap-1">
                            <button
                              onClick={() => {
                                if (idx === 0) return;
                                const newOrder = [...counselors];
                                [newOrder[idx - 1], newOrder[idx]] = [newOrder[idx], newOrder[idx - 1]];
                                const reordered = newOrder.map((co, i) => ({ ...co, order: i }));
                                saveCounselors(reordered, `Moved ${c.name} up`);
                              }}
                              disabled={idx === 0}
                              className={'w-7 h-7 rounded flex items-center justify-center text-sm ' + (idx === 0 ? 'bg-gray-100 text-gray-300 cursor-not-allowed' : 'bg-gray-200 hover:bg-gray-300 text-gray-600')}
                              title="Move up"
                            >▲</button>
                            <button
                              onClick={() => {
                                if (idx === counselors.length - 1) return;
                                const newOrder = [...counselors];
                                [newOrder[idx], newOrder[idx + 1]] = [newOrder[idx + 1], newOrder[idx]];
                                const reordered = newOrder.map((co, i) => ({ ...co, order: i }));
                                saveCounselors(reordered, `Moved ${c.name} down`);
                              }}
                              disabled={idx === counselors.length - 1}
                              className={'w-7 h-7 rounded flex items-center justify-center text-sm ' + (idx === counselors.length - 1 ? 'bg-gray-100 text-gray-300 cursor-not-allowed' : 'bg-gray-200 hover:bg-gray-300 text-gray-600')}
                              title="Move down"
                            >▼</button>
                          </div>

                          {/* Position number */}
                          <div className="w-8 h-8 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-bold text-sm">
                            {idx + 1}
                          </div>

                          {/* Photo */}
                          {getDisplayPhoto(c.photo) ? <img src={getDisplayPhoto(c.photo)} className="w-14 h-14 rounded-full object-cover" /> : <div className="w-14 h-14 rounded-full bg-gray-200 flex flex-col items-center justify-center"><svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg><span className="text-[8px] text-gray-500 font-medium">add photo</span></div>}

                          {/* Info */}
                          <div className="flex-1">
                            <div className="font-bold">{c.name}</div>
                            <div className="text-sm text-gray-600">{c.position} • {c.year}</div>
                            <div className="flex gap-2 mt-1 flex-wrap">
                              {eligibleCount > 0 && (
                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                                  📅 {eligibleCount} session{eligibleCount !== 1 ? 's' : ''} eligible
                                </span>
                              )}
                              {scheduledCount > 0 ? (
                                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                                  ✓ Working {scheduledCount} session{scheduledCount !== 1 ? 's' : ''}
                                </span>
                              ) : eligibleCount > 0 ? (
                                <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">
                                  No campers assigned yet
                                </span>
                              ) : null}
                            </div>
                          </div>

                          {/* Toggle Switch for Visibility */}
                          <div className="flex flex-col items-center gap-1">
                            <button
                              onClick={async () => {
                                const isCurrentlyVisible = c.visible !== false && c.approvedByAdmin !== false;
                                const newVisible = !isCurrentlyVisible;
                                const updated = counselors.map(co =>
                                  co.id === c.id
                                    ? { ...co, visible: newVisible, approvedByAdmin: newVisible }
                                    : co
                                );
                                await saveCounselors(updated, newVisible ? `Made ${c.name} visible on website` : `Hid ${c.name} from website`);
                              }}
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${(c.visible !== false && c.approvedByAdmin !== false) ? 'bg-green-500' : 'bg-gray-300'}`}
                            >
                              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${(c.visible !== false && c.approvedByAdmin !== false) ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                            <span className={`text-xs font-medium ${(c.visible !== false && c.approvedByAdmin !== false) ? 'text-green-600' : 'text-gray-400'}`}>
                              {(c.visible !== false && c.approvedByAdmin !== false) ? 'Visible' : 'Hidden'}
                            </span>
                          </div>

                          {/* Actions */}
                          <div className="flex gap-2 flex-wrap justify-end">
                            <button onClick={() => { setManagingSchedule(c); setScheduleMonths([]); setAvailDraft(JSON.parse(JSON.stringify(availability[c.email] || {}))); }} className="px-3 py-1 bg-green-50 text-green-600 rounded hover:bg-green-100 text-sm">Edit Availability</button>
                            <button onClick={() => { setEditCounselor(c); setShowModal(true); }} className="px-3 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 text-sm">Edit Profile</button>
                          </div>
                        </div>
                      </div>
                    )})}
                  </div>
                  {counselors.filter(c => c.visible !== false && c.approvedByAdmin !== false).length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                      <p>{counselors.length === 0 ? 'No counselors yet. Click "+ Add" to add a counselor.' : 'No approved counselors yet. Check the Applications tab to approve pending counselors.'}</p>
                    </div>
                  )}

                  {/* Edit Availability Modal */}
                  {managingSchedule && availDraft && (() => {
                    // Helper: get availability state from draft
                    const getDraftState = (date, session) => {
                      const dateAvail = availDraft[date] || {};
                      const availSessions = Array.isArray(dateAvail) ? dateAvail : (dateAvail.available || []);
                      const unavailSessions = Array.isArray(dateAvail) ? [] : (dateAvail.unavailable || []);
                      if (availSessions.includes(session)) return 'available';
                      if (unavailSessions.includes(session)) return 'unavailable';
                      return 'not-set';
                    };

                    // Toggle a single session in draft
                    const toggleDraftSession = (date, session) => {
                      const current = getDraftState(date, session);
                      const otherSession = session === 'morning' ? 'afternoon' : 'morning';
                      const otherState = getDraftState(date, otherSession);
                      const existing = availDraft[date] || {};
                      const existingAvail = Array.isArray(existing) ? existing : (existing.available || []);
                      const existingUnavail = Array.isArray(existing) ? [] : (existing.unavailable || []);

                      let newAvail, newUnavail;
                      if (current === 'not-set') {
                        newAvail = [...new Set([...existingAvail, session])];
                        newUnavail = existingUnavail.filter(s => s !== session);
                      } else if (current === 'available') {
                        newAvail = existingAvail.filter(s => s !== session);
                        newUnavail = [...new Set([...existingUnavail, session])];
                      } else {
                        newAvail = existingAvail.filter(s => s !== session);
                        newUnavail = existingUnavail.filter(s => s !== session);
                      }

                      const newDraft = { ...availDraft };
                      if (newAvail.length === 0 && newUnavail.length === 0) {
                        delete newDraft[date];
                      } else {
                        newDraft[date] = { available: newAvail, unavailable: newUnavail };
                      }
                      setAvailDraft(newDraft);
                    };

                    // Toggle whole day in draft
                    const toggleDraftDay = (date) => {
                      const amState = getDraftState(date, 'morning');
                      const pmState = getDraftState(date, 'afternoon');
                      const allAvailable = amState === 'available' && pmState === 'available';
                      const allUnavailable = amState === 'unavailable' && pmState === 'unavailable';

                      const newDraft = { ...availDraft };
                      if (allAvailable) {
                        newDraft[date] = { available: [], unavailable: ['morning', 'afternoon'] };
                      } else if (allUnavailable) {
                        delete newDraft[date];
                      } else {
                        newDraft[date] = { available: ['morning', 'afternoon'], unavailable: [] };
                      }
                      setAvailDraft(newDraft);
                    };

                    // Save handler
                    const handleSaveAvailability = async () => {
                      const newAvailability = { ...availability, [managingSchedule.email]: availDraft };
                      await saveAvail(newAvailability);
                      addToHistory('Counselor Availability', `Updated availability for ${managingSchedule.name}`);
                      // Sync to counselor schedule
                      const newSchedule = { ...counselorSchedule };
                      const cs = {};
                      Object.entries(availDraft).forEach(([date, dateData]) => {
                        const avail = Array.isArray(dateData) ? dateData : (dateData.available || []);
                        const unavail = Array.isArray(dateData) ? [] : (dateData.unavailable || []);
                        const morning = avail.includes('morning') ? true : unavail.includes('morning') ? false : undefined;
                        const afternoon = avail.includes('afternoon') ? true : unavail.includes('afternoon') ? false : undefined;
                        if (morning !== undefined || afternoon !== undefined) {
                          cs[date] = {};
                          if (morning !== undefined) cs[date].morning = morning;
                          if (afternoon !== undefined) cs[date].afternoon = afternoon;
                        }
                      });
                      newSchedule[managingSchedule.id] = cs;
                      await saveCounselorSchedule(newSchedule, `Synced schedule for ${managingSchedule.name}`);
                      setManagingSchedule(null);
                      setAvailDraft(null);
                      showToast(`Availability saved for ${managingSchedule.name}`);
                    };

                    // Build months and auto-select all by default
                    const months = [...new Set(CAMP_DATES.map(d => {
                      const date = new Date(d + 'T12:00:00');
                      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                    }))];
                    if (scheduleMonths.length === 0 && months.length > 0) {
                      setTimeout(() => setScheduleMonths([...months]), 0);
                    }

                    // Get dates for selected months
                    const getModalDates = () => CAMP_DATES.filter(d => {
                      const date = new Date(d + 'T12:00:00');
                      const mk = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                      return scheduleMonths.includes(mk);
                    });

                    // Group dates into weeks (Mon-Fri rows)
                    const groupIntoWeeks = (dates) => {
                      const weeks = [];
                      let currentWeek = [];
                      dates.forEach(d => {
                        const dn = new Date(d + 'T12:00:00');
                        if (currentWeek.length > 0 && dn.getDay() === 1) {
                          weeks.push(currentWeek);
                          currentWeek = [];
                        }
                        currentWeek.push(d);
                      });
                      if (currentWeek.length > 0) weeks.push(currentWeek);
                      return weeks;
                    };

                    // Button styles matching Work Availability tab
                    const btnStyle = (state, blocked) => blocked ? 'bg-gray-100 text-gray-400 cursor-not-allowed' :
                      state === 'available' ? 'bg-green-500 text-white hover:bg-green-600' :
                      state === 'unavailable' ? 'bg-red-500 text-white hover:bg-red-600' :
                      'bg-white border text-gray-600 hover:bg-gray-50';
                    const btnIcon = (state, blocked) => blocked ? ' 🚫' : state === 'available' ? ' ✓' : state === 'unavailable' ? ' ✗' : '';

                    return (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="bg-green-600 text-white px-6 py-4">
                          <h2 className="font-display text-xl">Edit Availability</h2>
                          <p className="text-green-200 text-sm">{managingSchedule.name}</p>
                        </div>
                        <div className="p-4 overflow-y-auto max-h-[calc(90vh-140px)]">
                          {/* Month selector (multi-select, both default) */}
                          <div className="flex gap-2 mb-4">
                            {months.map(m => {
                              const [yr, mo] = m.split('-');
                              const label = new Date(yr, mo - 1).toLocaleDateString('en-US', { month: 'long' });
                              const isActive = scheduleMonths.includes(m);
                              return (
                                <button key={m} onClick={() => setScheduleMonths(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m].sort())}
                                  className={'px-4 py-2 rounded-lg font-medium ' + (isActive ? 'bg-green-600 text-white' : 'bg-white border border-green-600 text-green-700 hover:bg-green-50')}>
                                  {label}
                                </button>
                              );
                            })}
                          </div>

                          {/* Card grid — grouped by week, 5 columns (Mon-Fri) */}
                          {getModalDates().length === 0 ? (
                            <div className="text-center text-gray-500 py-6">Select a month above to view availability.</div>
                          ) : groupIntoWeeks(getModalDates()).map((week, wi) => {
                            const firstDate = new Date(week[0] + 'T12:00:00');
                            const weekLabel = `Week of ${firstDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
                            return (
                              <div key={wi} className="mb-4">
                                <div className="text-xs font-medium text-gray-500 mb-1.5">{weekLabel}</div>
                                <div className="grid grid-cols-5 gap-2">
                                  {week.map(d => {
                                    const amBlocked = isSessionBlocked(d, 'morning');
                                    const pmBlocked = isSessionBlocked(d, 'afternoon');
                                    const fullyBlocked = amBlocked && pmBlocked;
                                    const amState = getDraftState(d, 'morning');
                                    const pmState = getDraftState(d, 'afternoon');
                                    const bothAvail = amState === 'available' && pmState === 'available';
                                    const bothUnavail = amState === 'unavailable' && pmState === 'unavailable';
                                    const anyAvail = amState === 'available' || pmState === 'available';
                                    const anyUnavail = amState === 'unavailable' || pmState === 'unavailable';

                                    const cardBorder = fullyBlocked ? 'border-gray-200 bg-gray-50' :
                                      bothAvail ? 'border-green-300 bg-green-50' :
                                      bothUnavail ? 'border-red-300 bg-red-50' :
                                      (anyAvail || anyUnavail) ? 'border-yellow-300 bg-yellow-50' :
                                      'border-gray-200 bg-white';

                                    const headerBg = fullyBlocked ? 'bg-gray-200 cursor-not-allowed' :
                                      bothAvail ? 'bg-green-200 hover:bg-green-300' :
                                      bothUnavail ? 'bg-red-200 hover:bg-red-300' :
                                      (anyAvail || anyUnavail) ? 'bg-yellow-200 hover:bg-yellow-300' :
                                      'bg-gray-100 hover:bg-gray-200';

                                    const dn = new Date(d + 'T12:00:00');

                                    return (
                                      <div key={d} className={'rounded-lg border-2 overflow-hidden transition-shadow hover:shadow-md ' + cardBorder}>
                                        <button onClick={() => !fullyBlocked && toggleDraftDay(d)} disabled={fullyBlocked}
                                          className={'w-full p-2 text-center font-bold transition-colors ' + headerBg}>
                                          <div className="text-xs text-gray-600">{['Mon','Tue','Wed','Thu','Fri'][dn.getDay() - 1]}</div>
                                          <div className="text-sm">{dn.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                                        </button>
                                        {fullyBlocked ? (
                                          <div className="p-2 text-center text-xs text-red-500">🚫 Blocked</div>
                                        ) : (
                                          <div className="p-2 space-y-1">
                                            <button onClick={() => !amBlocked && toggleDraftSession(d, 'morning')} disabled={amBlocked}
                                              className={'w-full p-1.5 rounded text-xs font-medium text-center transition-colors ' + btnStyle(amState, amBlocked)}>
                                              ☀️ AM{btnIcon(amState, amBlocked)}
                                            </button>
                                            <button onClick={() => !pmBlocked && toggleDraftSession(d, 'afternoon')} disabled={pmBlocked}
                                              className={'w-full p-1.5 rounded text-xs font-medium text-center transition-colors ' + btnStyle(pmState, pmBlocked)}>
                                              🌙 PM{btnIcon(pmState, pmBlocked)}
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}

                          <div className="mt-2 flex flex-wrap gap-4 justify-center text-sm text-gray-600">
                            <div className="flex items-center gap-1"><div className="w-3 h-3 bg-green-500 rounded-full" /><span>Available</span></div>
                            <div className="flex items-center gap-1"><div className="w-3 h-3 bg-red-500 rounded-full" /><span>Unavailable</span></div>
                            <div className="flex items-center gap-1"><div className="w-3 h-3 bg-gray-200 rounded-full border" /><span>Not Set</span></div>
                            <div className="flex items-center gap-1"><span>🚫</span><span>Blocked</span></div>
                          </div>
                        </div>
                        <div className="p-4 border-t flex gap-3">
                          <button onClick={() => { setManagingSchedule(null); setAvailDraft(null); }}
                            className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium">
                            Cancel
                          </button>
                          <button onClick={handleSaveAvailability}
                            className="flex-1 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium">
                            Save
                          </button>
                        </div>
                      </div>
                    </div>
                    );
                  })()}
                </div>
              )}

              {/* ===== COUNSELOR APPLICATIONS TAB ===== */}
              {adminParentTab === 'counselor' && getActiveChildTab('counselor') === 'applications' && (() => {
                const pending = counselors.filter(c => c.approvedByAdmin === false || c.visible === false);
                const approved = counselors.filter(c => c.visible !== false && c.approvedByAdmin !== false);
                return (
                <div>
                  <div className="mb-4">
                    <h2 className="font-bold text-xl">Counselor Applications</h2>
                    <p className="text-sm text-gray-500">Review and approve counselor registrations</p>
                  </div>

                  {pending.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-xl shadow">
                      <div className="text-4xl mb-3">✓</div>
                      <p className="text-gray-600 font-medium">No pending applications</p>
                      <p className="text-sm text-gray-400 mt-1">All counselor applications have been reviewed</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-sm text-amber-700 font-medium">
                        {pending.length} pending application{pending.length !== 1 ? 's' : ''} to review
                      </div>
                      {pending.map(c => (
                        <div key={c.id} className="bg-white rounded-xl shadow p-4 border-l-4 border-amber-400">
                          <div className="flex items-center gap-4">
                            {getDisplayPhoto(c.photo) ? (
                              <img src={getDisplayPhoto(c.photo)} className="w-14 h-14 rounded-full object-cover" />
                            ) : (
                              <div className="w-14 h-14 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 text-xl font-bold">
                                {c.name?.charAt(0)}
                              </div>
                            )}
                            <div className="flex-1">
                              <div className="font-bold text-lg">{c.name}</div>
                              <div className="text-sm text-gray-600">{c.position} {c.year ? '• ' + c.year : ''}</div>
                              <div className="text-sm text-gray-500">{c.email}</div>
                              {c.phone && <div className="text-sm text-gray-500">{c.phone}</div>}
                              {c.bio && <div className="text-sm text-gray-600 mt-1 italic">"{c.bio}"</div>}
                              {c.createdAt && <div className="text-xs text-gray-400 mt-1">Applied: {new Date(c.createdAt).toLocaleDateString()}</div>}
                            </div>
                            <div className="flex flex-col gap-2">
                              <button
                                onClick={async () => {
                                  const updated = counselors.map(co =>
                                    co.id === c.id ? { ...co, visible: true, approvedByAdmin: true } : co
                                  );
                                  await saveCounselors(updated, 'Approved ' + c.name + ' as counselor');
                                }}
                                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium text-sm transition-colors"
                              >
                                Approve
                              </button>
                              <button
                                onClick={async () => {
                                  if (!confirm('Reject and remove ' + c.name + '? This will delete their application.')) return;
                                  await deleteCounselor(c.id, c.name);
                                }}
                                className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg font-medium text-sm transition-colors"
                              >
                                Reject
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {approved.length > 0 && (
                    <div className="mt-6">
                      <h3 className="font-bold text-gray-600 mb-2">Previously Approved ({approved.length})</h3>
                      <div className="bg-white rounded-xl shadow divide-y">
                        {approved.map(c => (
                          <div key={c.id} className="flex items-center gap-3 px-4 py-3">
                            {getDisplayPhoto(c.photo) ? (
                              <img src={getDisplayPhoto(c.photo)} className="w-8 h-8 rounded-full object-cover" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-700 text-sm font-bold">
                                {c.name?.charAt(0)}
                              </div>
                            )}
                            <div className="flex-1">
                              <span className="font-medium">{c.name}</span>
                              <span className="text-sm text-gray-500 ml-2">{c.position}</span>
                            </div>
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded font-medium">Approved</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
              })()}

              {/* ===== WORK AVAILABILITY TAB ===== */}
              {adminParentTab === 'counselor' && getActiveChildTab('counselor') === 'availability' && (
                <div className="space-y-6">
                  {(() => {
                    // Build month list and auto-select all
                    const months = [...new Set(CAMP_DATES.map(d => {
                      const date = new Date(d + 'T12:00:00');
                      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                    }))];
                    if (availCalMonths.length === 0 && months.length > 0) {
                      setTimeout(() => setAvailCalMonths([...months]), 0);
                    }
                    const visibleCounselors = counselors.filter(c => !availCalHidden[c.id]);
                    const allShown = counselors.length > 0 && visibleCounselors.length === counselors.length;
                    const noneShown = visibleCounselors.length === 0;

                    // Get availability state for a counselor on a date/session
                    const getAvailState = (c, date, session) => {
                      const counselorAvail = availability[c.email] || {};
                      const dateAvail = counselorAvail[date] || {};
                      const availSessions = Array.isArray(dateAvail) ? dateAvail : (dateAvail.available || []);
                      const unavailSessions = Array.isArray(dateAvail) ? [] : (dateAvail.unavailable || []);
                      if (availSessions.includes(session)) return 'available';
                      if (unavailSessions.includes(session)) return 'unavailable';
                      return 'not-set';
                    };

                    // All dates for selected months (unfiltered, for date pill display)
                    const allMonthDates = CAMP_DATES.filter(d => {
                      const date = new Date(d + 'T12:00:00');
                      const mk = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                      return availCalMonths.includes(mk);
                    });
                    // Weeks available for selected months
                    const availableWeeks = CAMP_WEEKS.filter(w => {
                      const d = new Date(w.start + 'T12:00:00');
                      const mk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                      return availCalMonths.includes(mk);
                    });
                    const availableWeekStarts = availableWeeks.map(w => w.start);
                    // Auto-initialize weeks and dates on first load only (null = not yet initialized, [] = user cleared all)
                    if (availCalWeeks === null && availableWeekStarts.length > 0) {
                      setTimeout(() => setAvailCalWeeks([...availableWeekStarts]), 0);
                    }
                    const safeAvailWeeks = availCalWeeks || [];
                    // Dates filtered by week selection (for date pills)
                    const weekFilteredDates = allMonthDates.filter(d => {
                      const week = CAMP_WEEKS.find(w => w.dates.includes(d));
                      return !week || safeAvailWeeks.length === 0 || safeAvailWeeks.includes(week.start);
                    });
                    if (availCalDates === null && weekFilteredDates.length > 0) {
                      setTimeout(() => setAvailCalDates([...weekFilteredDates]), 0);
                    }
                    const safeAvailDates = availCalDates || [];

                    // Final filtered dates
                    const getSelectedDates = () => {
                      return weekFilteredDates.filter(d => safeAvailDates.includes(d));
                    };

                    // Counselor name helper
                    const getName = (c) => c.firstName || c.name?.split(' ')[0] || '?';

                    return (
                      <>
                        {/* Counselor filter chips */}
                        <div className="bg-white rounded-xl shadow p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-sm font-medium text-gray-700">Show counselors:</span>
                            <button onClick={() => setAvailCalHidden({})} className={'px-2 py-0.5 rounded text-xs font-medium ' + (allShown ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>All</button>
                            <button onClick={() => { const h = {}; counselors.forEach(c => h[c.id] = true); setAvailCalHidden(h); }} className={'px-2 py-0.5 rounded text-xs font-medium ' + (noneShown ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>None</button>
                          </div>
                          <div className="flex gap-2 flex-wrap">
                            {counselors.map(c => {
                              const isShown = !availCalHidden[c.id];
                              return (
                                <button key={c.id} onClick={() => setAvailCalHidden(prev => ({ ...prev, [c.id]: !prev[c.id] }))}
                                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition border ${isShown ? 'bg-green-100 text-green-700 border-green-300' : 'bg-gray-100 text-gray-500 border-gray-300'}`}>
                                  {isShown ? '✓ ' : ''}{getName(c)}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Month tabs (multi-select) */}
                        <div className="flex flex-wrap gap-2">
                          {months.map(m => {
                            const [yr, mo] = m.split('-');
                            const label = new Date(yr, mo - 1).toLocaleDateString('en-US', { month: 'long' });
                            const isActive = availCalMonths.includes(m);
                            return (
                              <button key={m} onClick={() => setAvailCalMonths(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m].sort())}
                                className={'px-6 py-2 rounded-lg font-medium ' + (isActive ? 'bg-green-600 text-white' : 'bg-white border border-green-600 text-green-700')}>
                                {label}
                              </button>
                            );
                          })}
                        </div>

                        {/* Week / Date / Session filters */}
                        <div className="bg-white rounded-xl shadow p-4 space-y-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-gray-700 w-14">Weeks:</span>
                            <button onClick={() => { setAvailCalWeeks([...availableWeekStarts]); setAvailCalDates([...allMonthDates]); }} className={'px-2 py-0.5 rounded text-xs font-medium ' + (safeAvailWeeks.length === availableWeekStarts.length ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>All</button>
                            <button onClick={() => { setAvailCalWeeks([]); setAvailCalDates([]); }} className={'px-2 py-0.5 rounded text-xs font-medium ' + (safeAvailWeeks.length === 0 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>None</button>
                            {availableWeeks.map(w => {
                              const wd = new Date(w.start + 'T12:00:00');
                              const label = wd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                              const isActive = safeAvailWeeks.includes(w.start);
                              return (
                                <button key={w.start} onClick={() => {
                                  const newWeeks = isActive ? safeAvailWeeks.filter(x => x !== w.start) : [...safeAvailWeeks, w.start].sort();
                                  setAvailCalWeeks(newWeeks);
                                  if (isActive) {
                                    setAvailCalDates(prev => (prev || []).filter(d => !w.dates.includes(d)));
                                  } else {
                                    setAvailCalDates(prev => [...new Set([...(prev || []), ...w.dates])].sort());
                                  }
                                }}
                                  className={`px-3 py-1 rounded-lg text-xs font-medium transition border ${isActive ? 'bg-green-100 text-green-700 border-green-300' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                                  {label}
                                </button>
                              );
                            })}
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-gray-700 w-14">Dates:</span>
                            <button onClick={() => setAvailCalDates([...weekFilteredDates])} className={'px-2 py-0.5 rounded text-xs font-medium ' + (safeAvailDates.length === weekFilteredDates.length ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>All</button>
                            <button onClick={() => setAvailCalDates([])} className={'px-2 py-0.5 rounded text-xs font-medium ' + (safeAvailDates.length === 0 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>None</button>
                            {weekFilteredDates.map(d => {
                              const dt = new Date(d + 'T12:00:00');
                              const dayName = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][dt.getDay()];
                              const label = `${dayName} ${dt.getMonth() + 1}/${dt.getDate()}`;
                              const isActive = safeAvailDates.includes(d);
                              return (
                                <button key={d} onClick={() => setAvailCalDates(prev => (prev || []).includes(d) ? (prev || []).filter(x => x !== d) : [...(prev || []), d].sort())}
                                  className={`px-2 py-1 rounded-lg text-xs font-medium transition border ${isActive ? 'bg-green-100 text-green-700 border-green-300' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                                  {label}
                                </button>
                              );
                            })}
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-gray-700 w-14">Session:</span>
                            {[{key: 'both', label: 'Both'}, {key: 'morning', label: 'AM Only'}, {key: 'afternoon', label: 'PM Only'}].map(({key, label}) => (
                              <button key={key} onClick={() => setAvailCalSession(key)}
                                className={`px-3 py-1 rounded-lg text-xs font-medium transition border ${availCalSession === key ? 'bg-green-600 text-white border-green-600' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                                {label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Responsive card grid */}
                        {getSelectedDates().length === 0 ? (
                          <div className="bg-white rounded-xl shadow p-6 text-center text-gray-500">Select a month above to view availability.</div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                            {getSelectedDates().map(date => {
                              const d = new Date(date + 'T12:00:00');
                              const amBlocked = isSessionBlocked(date, 'morning');
                              const pmBlocked = isSessionBlocked(date, 'afternoon');
                              const fullyBlocked = amBlocked && pmBlocked;

                              // Compute states for all visible counselors
                              const amStates = visibleCounselors.map(c => ({ c, state: getAvailState(c, date, 'morning') }));
                              const pmStates = visibleCounselors.map(c => ({ c, state: getAvailState(c, date, 'afternoon') }));
                              const allAmAvail = amStates.length > 0 && amStates.every(s => s.state === 'available');
                              const allPmAvail = pmStates.length > 0 && pmStates.every(s => s.state === 'available');
                              const allAmUnavail = amStates.length > 0 && amStates.every(s => s.state === 'unavailable');
                              const allPmUnavail = pmStates.length > 0 && pmStates.every(s => s.state === 'unavailable');
                              const anyAvail = amStates.some(s => s.state === 'available') || pmStates.some(s => s.state === 'available');

                              const cardBorder = fullyBlocked ? 'border-gray-200 bg-gray-50' :
                                (allAmAvail && allPmAvail) ? 'border-green-300 bg-green-50' :
                                (allAmUnavail && allPmUnavail) ? 'border-red-300 bg-red-50' :
                                anyAvail ? 'border-yellow-300 bg-yellow-50' :
                                'border-gray-200 bg-white';

                              // Pill color for availability
                              const pillBg = (state) => state === 'available' ? 'bg-green-500 text-white' : state === 'unavailable' ? 'bg-red-400 text-white' : 'bg-gray-200 text-gray-500';

                              // Single counselor button style
                              const singleBtn = (state, blocked) => blocked ? 'bg-gray-100 text-gray-400' :
                                state === 'available' ? 'bg-green-500 text-white' :
                                state === 'unavailable' ? 'bg-red-500 text-white' :
                                'bg-white border text-gray-600';
                              const singleIcon = (state, blocked) => blocked ? ' 🚫' : state === 'available' ? ' ✓' : state === 'unavailable' ? ' ✗' : '';

                              return (
                                <div key={date} className={'rounded-lg border-2 overflow-hidden transition-shadow hover:shadow-md ' + cardBorder}>
                                  <div className="p-2 text-center font-medium bg-gray-100">
                                    <div className="text-xs text-gray-500">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri'][d.getDay() - 1]}</div>
                                    <div className="text-sm">{d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                                  </div>
                                  {fullyBlocked ? (
                                    <div className="p-2 text-center text-xs text-red-500">🚫 Blocked</div>
                                  ) : visibleCounselors.length === 0 ? (
                                    <div className="p-2 space-y-1">
                                      {(availCalSession === 'both' || availCalSession === 'morning') && <div className="w-full p-1.5 rounded text-xs bg-gray-100 text-gray-400 text-center">AM</div>}
                                      {(availCalSession === 'both' || availCalSession === 'afternoon') && <div className="w-full p-1.5 rounded text-xs bg-gray-100 text-gray-400 text-center">PM</div>}
                                    </div>
                                  ) : visibleCounselors.length === 1 ? (
                                    <div className="p-2 space-y-1">
                                      {(availCalSession === 'both' || availCalSession === 'morning') && <div className={'w-full p-1.5 rounded text-xs font-medium text-center ' + singleBtn(amStates[0]?.state, amBlocked)}>
                                        {getName(visibleCounselors[0])}{singleIcon(amStates[0]?.state, amBlocked)}
                                      </div>}
                                      {(availCalSession === 'both' || availCalSession === 'afternoon') && <div className={'w-full p-1.5 rounded text-xs font-medium text-center ' + singleBtn(pmStates[0]?.state, pmBlocked)}>
                                        {getName(visibleCounselors[0])}{singleIcon(pmStates[0]?.state, pmBlocked)}
                                      </div>}
                                    </div>
                                  ) : (() => {
                                    const cols = Math.min(visibleCounselors.length, 5);
                                    const showAm = availCalSession === 'both' || availCalSession === 'morning';
                                    const showPm = availCalSession === 'both' || availCalSession === 'afternoon';
                                    return (
                                    <div className="p-1.5 space-y-0">
                                      {showAm && (amBlocked ? (
                                        <div className="p-1 rounded text-xs bg-gray-100 text-gray-400 text-center">🚫</div>
                                      ) : (
                                        <div>
                                          <div className="text-center mb-0.5" style={{fontSize: '9px', fontWeight: 600, color: '#d97706', letterSpacing: '0.05em'}}>☀️ AM</div>
                                          <div style={{display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: '2px'}}>
                                            {amStates.map(({ c, state }) => (
                                              <span key={c.id} className={'block py-0.5 rounded-full text-center font-medium truncate ' + pillBg(state)}
                                                style={{fontSize: '10px'}}
                                                title={`${getName(c)} — ${state}`}>
                                                {getName(c)}
                                              </span>
                                            ))}
                                          </div>
                                        </div>
                                      ))}
                                      {showAm && showPm && <div style={{borderTop: '1px solid #e5e7eb', margin: '3px 0'}} />}
                                      {showPm && (pmBlocked ? (
                                        <div className="p-1 rounded text-xs bg-gray-100 text-gray-400 text-center">🚫</div>
                                      ) : (
                                        <div>
                                          <div className="text-center mb-0.5" style={{fontSize: '9px', fontWeight: 600, color: '#4f46e5', letterSpacing: '0.05em'}}>🌙 PM</div>
                                          <div style={{display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: '2px'}}>
                                            {pmStates.map(({ c, state }) => (
                                              <span key={c.id} className={'block py-0.5 rounded-full text-center font-medium truncate ' + pillBg(state)}
                                                style={{fontSize: '10px'}}
                                                title={`${getName(c)} — ${state}`}>
                                                {getName(c)}
                                              </span>
                                            ))}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                    );
                                  })()}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Legend */}
                        <div className="bg-white rounded-xl shadow p-4 flex flex-wrap gap-4 justify-center text-sm">
                          <div className="flex items-center gap-2"><div className="w-4 h-4 bg-green-500 rounded-full" /><span>Available</span></div>
                          <div className="flex items-center gap-2"><div className="w-4 h-4 bg-red-400 rounded-full" /><span>Unavailable</span></div>
                          <div className="flex items-center gap-2"><div className="w-4 h-4 bg-gray-200 rounded-full" /><span>Not Set</span></div>
                          <div className="flex items-center gap-2"><span>🚫</span><span>Session Blocked</span></div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}

              {/* ===== WORK SCHEDULE TAB ===== */}
              {adminParentTab === 'counselor' && getActiveChildTab('counselor') === 'workschedule' && (
                <div className="space-y-6">
                  {(() => {
                    // Build month list and auto-select all
                    const months = [...new Set(CAMP_DATES.map(d => {
                      const date = new Date(d + 'T12:00:00');
                      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                    }))];
                    if (schedCalMonths.length === 0 && months.length > 0) {
                      setTimeout(() => setSchedCalMonths([...months]), 0);
                    }
                    const visibleCounselors = counselors.filter(c => !schedCalHidden[c.id]);
                    const allShown = counselors.length > 0 && visibleCounselors.length === counselors.length;
                    const noneShown = visibleCounselors.length === 0;

                    // Get assigned camper count for a counselor on a date/session
                    const getAssignedCount = (c, date, session) => {
                      const key = `${date}_${session}`;
                      return ((assignments[key] || {})[c.id] || []).length;
                    };

                    // All dates for selected months (unfiltered)
                    const allMonthDates = CAMP_DATES.filter(d => {
                      const date = new Date(d + 'T12:00:00');
                      const mk = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                      return schedCalMonths.includes(mk);
                    });
                    // Weeks available for selected months
                    const availableWeeks = CAMP_WEEKS.filter(w => {
                      const d = new Date(w.start + 'T12:00:00');
                      const mk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                      return schedCalMonths.includes(mk);
                    });
                    const availableWeekStarts = availableWeeks.map(w => w.start);
                    if (schedCalWeeks === null && availableWeekStarts.length > 0) {
                      setTimeout(() => setSchedCalWeeks([...availableWeekStarts]), 0);
                    }
                    const safeSchedWeeks = schedCalWeeks || [];
                    const weekFilteredDates = allMonthDates.filter(d => {
                      const week = CAMP_WEEKS.find(w => w.dates.includes(d));
                      return !week || safeSchedWeeks.length === 0 || safeSchedWeeks.includes(week.start);
                    });
                    if (schedCalDates === null && weekFilteredDates.length > 0) {
                      setTimeout(() => setSchedCalDates([...weekFilteredDates]), 0);
                    }
                    const safeSchedDates = schedCalDates || [];

                    // Final filtered dates
                    const getSelectedDates = () => {
                      return weekFilteredDates.filter(d => safeSchedDates.includes(d));
                    };

                    // Counselor name helper
                    const getName = (c) => c.firstName || c.name?.split(' ')[0] || '?';

                    return (
                      <>
                        {/* Counselor filter chips */}
                        <div className="bg-white rounded-xl shadow p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-sm font-medium text-gray-700">Show counselors:</span>
                            <button onClick={() => setSchedCalHidden({})} className={'px-2 py-0.5 rounded text-xs font-medium ' + (allShown ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>All</button>
                            <button onClick={() => { const h = {}; counselors.forEach(c => h[c.id] = true); setSchedCalHidden(h); }} className={'px-2 py-0.5 rounded text-xs font-medium ' + (noneShown ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>None</button>
                          </div>
                          <div className="flex gap-2 flex-wrap">
                            {counselors.map(c => {
                              const isShown = !schedCalHidden[c.id];
                              return (
                                <button key={c.id} onClick={() => setSchedCalHidden(prev => ({ ...prev, [c.id]: !prev[c.id] }))}
                                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition border ${isShown ? 'bg-green-100 text-green-700 border-green-300' : 'bg-gray-100 text-gray-500 border-gray-300'}`}>
                                  {isShown ? '✓ ' : ''}{getName(c)}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Month tabs (multi-select) */}
                        <div className="flex flex-wrap gap-2">
                          {months.map(m => {
                            const [yr, mo] = m.split('-');
                            const label = new Date(yr, mo - 1).toLocaleDateString('en-US', { month: 'long' });
                            const isActive = schedCalMonths.includes(m);
                            return (
                              <button key={m} onClick={() => setSchedCalMonths(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m].sort())}
                                className={'px-6 py-2 rounded-lg font-medium ' + (isActive ? 'bg-green-600 text-white' : 'bg-white border border-green-600 text-green-700')}>
                                {label}
                              </button>
                            );
                          })}
                        </div>

                        {/* Week / Date / Session filters */}
                        <div className="bg-white rounded-xl shadow p-4 space-y-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-gray-700 w-14">Weeks:</span>
                            <button onClick={() => { setSchedCalWeeks([...availableWeekStarts]); setSchedCalDates([...allMonthDates]); }} className={'px-2 py-0.5 rounded text-xs font-medium ' + (safeSchedWeeks.length === availableWeekStarts.length ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>All</button>
                            <button onClick={() => { setSchedCalWeeks([]); setSchedCalDates([]); }} className={'px-2 py-0.5 rounded text-xs font-medium ' + (safeSchedWeeks.length === 0 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>None</button>
                            {availableWeeks.map(w => {
                              const wd = new Date(w.start + 'T12:00:00');
                              const label = wd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                              const isActive = safeSchedWeeks.includes(w.start);
                              return (
                                <button key={w.start} onClick={() => {
                                  const newWeeks = isActive ? safeSchedWeeks.filter(x => x !== w.start) : [...safeSchedWeeks, w.start].sort();
                                  setSchedCalWeeks(newWeeks);
                                  if (isActive) {
                                    setSchedCalDates(prev => (prev || []).filter(d => !w.dates.includes(d)));
                                  } else {
                                    setSchedCalDates(prev => [...new Set([...(prev || []), ...w.dates])].sort());
                                  }
                                }}
                                  className={`px-3 py-1 rounded-lg text-xs font-medium transition border ${isActive ? 'bg-green-100 text-green-700 border-green-300' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                                  {label}
                                </button>
                              );
                            })}
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-gray-700 w-14">Dates:</span>
                            <button onClick={() => setSchedCalDates([...weekFilteredDates])} className={'px-2 py-0.5 rounded text-xs font-medium ' + (safeSchedDates.length === weekFilteredDates.length ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>All</button>
                            <button onClick={() => setSchedCalDates([])} className={'px-2 py-0.5 rounded text-xs font-medium ' + (safeSchedDates.length === 0 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>None</button>
                            {weekFilteredDates.map(d => {
                              const dt = new Date(d + 'T12:00:00');
                              const dayName = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][dt.getDay()];
                              const label = `${dayName} ${dt.getMonth() + 1}/${dt.getDate()}`;
                              const isActive = safeSchedDates.includes(d);
                              return (
                                <button key={d} onClick={() => setSchedCalDates(prev => (prev || []).includes(d) ? (prev || []).filter(x => x !== d) : [...(prev || []), d].sort())}
                                  className={`px-2 py-1 rounded-lg text-xs font-medium transition border ${isActive ? 'bg-green-100 text-green-700 border-green-300' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                                  {label}
                                </button>
                              );
                            })}
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-gray-700 w-14">Session:</span>
                            {[{key: 'both', label: 'Both'}, {key: 'morning', label: 'AM Only'}, {key: 'afternoon', label: 'PM Only'}].map(({key, label}) => (
                              <button key={key} onClick={() => setSchedCalSession(key)}
                                className={`px-3 py-1 rounded-lg text-xs font-medium transition border ${schedCalSession === key ? 'bg-green-600 text-white border-green-600' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                                {label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Responsive card grid */}
                        {getSelectedDates().length === 0 ? (
                          <div className="bg-white rounded-xl shadow p-6 text-center text-gray-500">Select a month above to view schedule.</div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                            {getSelectedDates().map(date => {
                              const d = new Date(date + 'T12:00:00');

                              // Compute counts for visible counselors
                              const amCounts = visibleCounselors.map(c => ({ c, count: getAssignedCount(c, date, 'morning') }));
                              const pmCounts = visibleCounselors.map(c => ({ c, count: getAssignedCount(c, date, 'afternoon') }));
                              const anyAmAssigned = amCounts.some(s => s.count > 0);
                              const anyPmAssigned = pmCounts.some(s => s.count > 0);
                              const anyAssigned = anyAmAssigned || anyPmAssigned;

                              const cardBorder = (anyAmAssigned && anyPmAssigned) ? 'border-green-300 bg-green-50' :
                                anyAssigned ? 'border-yellow-300 bg-yellow-50' :
                                'border-gray-200 bg-white';

                              return (
                                <div key={date} className={'rounded-lg border-2 overflow-hidden transition-shadow hover:shadow-md ' + cardBorder}>
                                  <div className="p-2 text-center font-medium bg-gray-100">
                                    <div className="text-xs text-gray-500">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri'][d.getDay() - 1]}</div>
                                    <div className="text-sm">{d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                                  </div>
                                  {visibleCounselors.length === 0 ? (
                                    <div className="p-2 space-y-1">
                                      {(schedCalSession === 'both' || schedCalSession === 'morning') && <div className="w-full p-1.5 rounded text-xs bg-gray-100 text-gray-400 text-center">AM</div>}
                                      {(schedCalSession === 'both' || schedCalSession === 'afternoon') && <div className="w-full p-1.5 rounded text-xs bg-gray-100 text-gray-400 text-center">PM</div>}
                                    </div>
                                  ) : visibleCounselors.length === 1 ? (
                                    <div className="p-2 space-y-1">
                                      {(schedCalSession === 'both' || schedCalSession === 'morning') && (amCounts[0]?.count > 0 ? (
                                        <div className="w-full p-1.5 rounded text-xs font-medium text-center bg-green-500 text-white">
                                          {getName(visibleCounselors[0])} · {amCounts[0].count}
                                        </div>
                                      ) : (
                                        <div className="w-full p-1.5 rounded text-xs bg-gray-100 text-gray-400 text-center">{getName(visibleCounselors[0])}</div>
                                      ))}
                                      {(schedCalSession === 'both' || schedCalSession === 'afternoon') && (pmCounts[0]?.count > 0 ? (
                                        <div className="w-full p-1.5 rounded text-xs font-medium text-center bg-green-500 text-white">
                                          {getName(visibleCounselors[0])} · {pmCounts[0].count}
                                        </div>
                                      ) : (
                                        <div className="w-full p-1.5 rounded text-xs bg-gray-100 text-gray-400 text-center">{getName(visibleCounselors[0])}</div>
                                      ))}
                                    </div>
                                  ) : (() => {
                                    const cols = Math.min(visibleCounselors.length, 5);
                                    const showAm = schedCalSession === 'both' || schedCalSession === 'morning';
                                    const showPm = schedCalSession === 'both' || schedCalSession === 'afternoon';
                                    return (
                                    <div className="p-1.5 space-y-0">
                                      {showAm && <div>
                                        <div className="text-center mb-0.5" style={{fontSize: '9px', fontWeight: 600, color: '#d97706', letterSpacing: '0.05em'}}>☀️ AM</div>
                                        <div style={{display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: '2px'}}>
                                          {amCounts.map(({ c, count }) => (
                                            <span key={c.id} className={'block py-0.5 rounded-full text-center font-medium truncate ' + (count > 0 ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500')}
                                              style={{fontSize: '10px'}}
                                              title={`${getName(c)} — ${count > 0 ? count + ' campers' : 'not assigned'}`}>
                                              {getName(c)}
                                            </span>
                                          ))}
                                        </div>
                                      </div>}
                                      {showAm && showPm && <div style={{borderTop: '1px solid #e5e7eb', margin: '3px 0'}} />}
                                      {showPm && <div>
                                        <div className="text-center mb-0.5" style={{fontSize: '9px', fontWeight: 600, color: '#4f46e5', letterSpacing: '0.05em'}}>🌙 PM</div>
                                        <div style={{display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: '2px'}}>
                                          {pmCounts.map(({ c, count }) => (
                                            <span key={c.id} className={'block py-0.5 rounded-full text-center font-medium truncate ' + (count > 0 ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500')}
                                              style={{fontSize: '10px'}}
                                              title={`${getName(c)} — ${count > 0 ? count + ' campers' : 'not assigned'}`}>
                                              {getName(c)}
                                            </span>
                                          ))}
                                        </div>
                                      </div>}
                                    </div>
                                    );
                                  })()}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Legend */}
                        <div className="bg-white rounded-xl shadow p-4 flex flex-wrap gap-4 justify-center text-sm">
                          <div className="flex items-center gap-2"><div className="w-4 h-4 bg-green-500 rounded-full" /><span>Assigned</span></div>
                          <div className="flex items-center gap-2"><div className="w-4 h-4 bg-gray-200 rounded-full" /><span>Not Assigned</span></div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}

              {adminParentTab === 'registrations' && (() => {
                const formatDateRange2 = (dates) => {
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
                  let rangeStart = sorted[0], prev = sorted[0];
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

                // Group registrations by orderId for the three sections
                const groupByOrder = (regs) => {
                  const byOrder = {};
                  regs.forEach(reg => {
                    const key = reg.orderId || reg.id;
                    if (!byOrder[key]) byOrder[key] = [];
                    byOrder[key].push(reg);
                  });
                  return Object.entries(byOrder);
                };

                const unpaidOrders = groupByOrder(registrations.filter(r => r.status === 'pending' && r.paymentStatus === 'unpaid'));
                const paidByParentOrders = groupByOrder(registrations.filter(r => r.status === 'pending' && ['sent', 'submitted'].includes(r.paymentStatus)));
                const paidOrders = groupByOrder(registrations.filter(r => r.status === 'approved' && ['paid', 'confirmed'].includes(r.paymentStatus)));

                const renderRegCard = (orderId, regs, options = {}) => {
                  const parent = users.find(u => u.email === regs[0].parentEmail);
                  const totalAmount = regs.reduce((sum, r) => sum + (parseFloat(r.totalAmount) || 0), 0);
                  const venmoCode = regs[0]?.venmoCode;
                  const sortedRegs = [...regs].sort((a, b) => new Date(a.date) - new Date(b.date));
                  const screenshot = regs[0]?.venmoScreenshot;
                  const screenshotUrl = screenshot ? (typeof screenshot === 'string' ? screenshot : screenshot?.cropped || screenshot) : null;
                  const paymentStatus = sortedRegs[0]?.paymentStatus || 'unpaid';
                  const isPaid = ['paid', 'confirmed'].includes(paymentStatus);
                  const isSent = paymentStatus === 'sent';

                  const byCamper = {};
                  sortedRegs.forEach(r => {
                    const name = r.camperName || r.childName || 'Unknown';
                    if (!byCamper[name]) byCamper[name] = [];
                    byCamper[name].push(r);
                  });

                  return (
                    <div key={orderId} className={`border-2 rounded-xl p-4 ${options.borderClass || 'border-gray-200'}`}>
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-bold text-lg text-green-800">{Object.keys(byCamper).join(' & ')}</h4>
                          <p className="text-sm text-gray-500">Parent: {parent?.name || regs[0].parentName} ({regs[0].parentEmail})</p>
                        </div>
                        {options.actions}
                      </div>
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
                              <div className="text-sm text-gray-600 mt-1">{dates.length} day{dates.length > 1 ? 's' : ''} {'\u2022'} {formatDateRange2(dates)}</div>
                            </div>
                          );
                        })}
                      </div>
                      {venmoCode && (
                        <div className={`text-xs mt-2 ${isPaid ? 'text-green-600' : 'text-blue-600'}`}>
                          Venmo Reference: <span className="font-mono font-bold">{venmoCode}</span>
                          {sortedRegs[0]?.paymentSentAt && (
                            <span className="ml-2 text-gray-500">
                              Sent {new Date(sortedRegs[0].paymentSentAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at {new Date(sortedRegs[0].paymentSentAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                      )}
                      {screenshotUrl && (
                        <div className="mt-2 mb-1">
                          <img src={screenshotUrl} alt="Venmo payment screenshot" className="max-h-32 object-contain rounded-lg border cursor-pointer" onClick={() => window.open(screenshotUrl, '_blank')} />
                        </div>
                      )}
                      {isPaid && sortedRegs[0]?.invoiceId && (
                        <div className="mt-2">
                          <span className="text-xs text-green-600">Invoice: <span className="font-mono font-bold">{sortedRegs[0].invoiceId}</span></span>
                        </div>
                      )}
                      <div className={`flex justify-between items-center pt-2 mt-2 ${isPaid ? 'border-t border-green-300' : 'border-t border-blue-200'}`}>
                        <span className="font-bold text-lg">${totalAmount.toFixed(2)}</span>
                        <span className="text-xs text-gray-400">Submitted: {regs[0].registeredAt ? new Date(regs[0].registeredAt).toLocaleString() : 'Unknown'}</span>
                      </div>
                    </div>
                  );
                };

                const activeRegTab = getActiveChildTab('registrations');

                return (
                <div className="space-y-6">
                  {/* New Registrations Sub-tab */}
                  {activeRegTab === 'new' && (
                    <div className="bg-white rounded-xl shadow p-6">
                      <h3 className="font-bold text-xl text-orange-700 mb-2">⏳ New Registrations awaiting payment ({unpaidOrders.length})</h3>
                      <p className="text-sm text-gray-500 mb-4">Registrations submitted by parents — awaiting Venmo payment from parent.</p>

                      {unpaidOrders.length === 0 ? (
                        <div className="text-center py-6 text-gray-400">
                          <p className="text-3xl mb-2">💳</p>
                          <p>No unpaid registrations</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {unpaidOrders.map(([orderId, regs]) => renderRegCard(orderId, regs, {
                            borderClass: 'border-orange-300 bg-orange-50',
                            actions: (
                              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-700">Awaiting Payment</span>
                            )
                          }))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Pending Approval Sub-tab */}
                  {activeRegTab === 'pending' && (
                    <div className="bg-white rounded-xl shadow p-6">
                      <h3 className="font-bold text-xl text-blue-700 mb-2">💰 Pending Approval ({paidByParentOrders.length})</h3>
                      <p className="text-sm text-gray-500 mb-4">Parent has submitted Venmo payment — verify in Venmo and mark as paid.</p>

                      {paidByParentOrders.length === 0 ? (
                        <div className="text-center py-6 text-gray-400">
                          <p className="text-3xl mb-2">✓</p>
                          <p>No payments awaiting confirmation</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {paidByParentOrders.map(([orderId, regs]) => {
                            const camperNames = [...new Set(regs.map(r => r.camperName || r.childName))];
                            const totalAmount = regs.reduce((sum, r) => sum + (parseFloat(r.totalAmount) || 0), 0);
                            return renderRegCard(orderId, regs, {
                              borderClass: 'border-blue-300 bg-blue-50',
                              actions: (
                                <button
                                  onClick={async () => {
                                    if (!confirm(`This will mark $${totalAmount.toFixed(2)} as paid for ${camperNames.join(', ')} (${regs.length} session(s)).\n\nCamper(s) will become eligible for pod assignment. Confirm?`)) return;
                                    const now = new Date().toISOString();
                                    const invoiceId = `INV-${Date.now().toString(36).toUpperCase()}`;
                                    const updatedRegs = regs.map(reg => ({
                                      ...reg,
                                      status: 'approved',
                                      paymentStatus: 'confirmed',
                                      approvedAt: now,
                                      approvedBy: user?.name,
                                      paymentConfirmedAt: now,
                                      paymentConfirmedBy: user?.name,
                                      invoiceId
                                    }));
                                    setRegistrations(prev => prev.map(r => {
                                      const updated = updatedRegs.find(u => u.id === r.id);
                                      return updated || r;
                                    }));
                                    await Promise.all(updatedRegs.map(reg => storage.set('camp_registrations', reg.id, reg)));
                                    addToHistory('Payment Confirmed', `Confirmed payment of $${totalAmount.toFixed(2)} for ${camperNames.join(', ')} (${regs.length} sessions) — Invoice ${invoiceId}`, [regs[0].parentEmail]);
                                    // Send payment confirmation email to parent
                                    try {
                                      const parent = users.find(u => u.email === regs[0].parentEmail);
                                      const sortedRegs = [...regs].sort((a, b) => new Date(a.date) - new Date(b.date));
                                      const sessionRows = sortedRegs.map(r => `<tr><td style="padding:4px 8px;border-bottom:1px solid #e5e7eb;">${r.camperName || r.childName}</td><td style="padding:4px 8px;border-bottom:1px solid #e5e7eb;">${new Date(r.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</td><td style="padding:4px 8px;border-bottom:1px solid #e5e7eb;">${(r.sessions || []).map(s => s === 'morning' ? 'AM' : 'PM').join(' + ')}</td><td style="padding:4px 8px;border-bottom:1px solid #e5e7eb;text-align:right;">$${(parseFloat(r.totalAmount) || 0).toFixed(2)}</td></tr>`).join('');
                                      fetch('/.netlify/functions/send-email', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                          to: regs[0].parentEmail,
                                          subject: `Payment Confirmed — ${camperNames.join(', ')} (Invoice ${invoiceId})`,
                                          html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;"><h2 style="color:#15803d;">Payment Confirmed!</h2><p>Hi ${parent?.name || regs[0].parentName},</p><p>Your payment has been confirmed. Your camper(s) are now registered!</p><div style="background:#f0fdf4;border:2px solid #86efac;border-radius:8px;padding:16px;margin:16px 0;"><p style="margin:0 0 4px;font-size:13px;color:#666;">Invoice: <strong>${invoiceId}</strong></p><p style="margin:0 0 12px;font-size:13px;color:#666;">Date: ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p><table style="width:100%;border-collapse:collapse;font-size:14px;"><thead><tr style="background:#dcfce7;"><th style="padding:6px 8px;text-align:left;">Camper</th><th style="padding:6px 8px;text-align:left;">Date</th><th style="padding:6px 8px;text-align:left;">Session</th><th style="padding:6px 8px;text-align:right;">Amount</th></tr></thead><tbody>${sessionRows}</tbody><tfoot><tr><td colspan="3" style="padding:8px;font-weight:bold;border-top:2px solid #15803d;">Total Paid</td><td style="padding:8px;font-weight:bold;text-align:right;border-top:2px solid #15803d;color:#15803d;font-size:18px;">$${totalAmount.toFixed(2)}</td></tr></tfoot></table></div><h3 style="color:#15803d;">What Happens Next</h3><ul style="line-height:1.8;"><li>Your camper(s) will be assigned to their pod before camp starts</li><li>Check your dashboard for pod assignments and schedule updates</li><li>Make sure emergency contacts and camper photos are up to date</li></ul><p><a href="https://rhsbasketballdaycamp.com/#login" style="display:inline-block;background-color:#15803d;color:white;padding:12px 24px;text-decoration:none;border-radius:8px;font-weight:bold;">Go to Dashboard</a></p><p style="color:#666;font-size:12px;margin-top:20px;">Keep this email for your records. Invoice ${invoiceId}</p></div>`
                                        })
                                      });
                                    } catch (emailErr) { console.error('Payment email failed:', emailErr); }
                                    showToast(`Payment confirmed for ${camperNames.join(', ')}! Camper(s) now eligible for pod assignment.`);
                                  }}
                                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium whitespace-nowrap"
                                >
                                  ✓ Mark as Paid
                                </button>
                              )
                            });
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Paid Sub-tab */}
                  {activeRegTab === 'paid' && (
                    <div className="bg-white rounded-xl shadow p-6">
                      <h3 className="font-bold text-xl text-green-700 mb-2">✅ Paid Registrations ({paidOrders.length})</h3>
                      <p className="text-sm text-gray-500 mb-4">Payment confirmed — camper(s) eligible for pod assignment on the Pod Setup tab.</p>

                      {paidOrders.length === 0 ? (
                        <div className="text-center py-6 text-gray-400">
                          <p className="text-3xl mb-2">📋</p>
                          <p>No paid registrations yet</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {paidOrders.map(([orderId, regs]) => {
                            const confirmedDate = regs[0]?.paymentConfirmedAt ? new Date(regs[0].paymentConfirmedAt).toLocaleDateString() : '';
                            const invId = regs[0]?.invoiceId;
                            return renderRegCard(orderId, regs, {
                              borderClass: 'border-green-500 bg-green-50',
                              actions: (
                                <div className="text-right">
                                  {invId && <span className="block text-xs font-mono text-purple-600">{invId}</span>}
                                  <span className="text-xs text-gray-500">{confirmedDate ? `Paid ${confirmedDate}` : 'Paid'}</span>
                                </div>
                              )
                            });
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Customer Invoices Sub-tab */}
                  {activeRegTab === 'invoices' && <InvoicesSubTab registrations={registrations} users={users} addToHistory={addToHistory} showToast={showToast} />}
                </div>
                );
              })()}

              {adminParentTab === 'camp' && getActiveChildTab('camp') === 'content' && (
                <div className="space-y-6">
                  <div className="bg-green-100 border-l-4 border-green-600 p-4 rounded-lg">
                    <p className="text-green-800"><strong>Auto-save enabled:</strong> Changes are saved automatically when you click outside the field</p>
                  </div>

                  <div className="bg-white rounded-xl shadow p-6">
                    <h3 className="font-bold mb-4">Hero Section</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Title</label>
                        <StableInput value={content.heroTitle} onSave={(v) => updateContent('heroTitle', v)} className="w-full px-3 py-2 border rounded-lg" />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Subtitle</label>
                        <StableInput value={content.heroSubtitle} onSave={(v) => updateContent('heroSubtitle', v)} className="w-full px-3 py-2 border rounded-lg" />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm text-gray-600 mb-1">Tagline</label>
                        <StableInput value={content.heroTagline} onSave={(v) => updateContent('heroTagline', v)} className="w-full px-3 py-2 border rounded-lg" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl shadow p-6">
                    <h3 className="font-bold mb-4">Details</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Session Cost</label>
                        <StableInput value={content.sessionCost} onSave={(v) => updateContent('sessionCost', v)} className="w-full px-3 py-2 border rounded-lg" />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Venmo Username</label>
                        <StableInput value={content.venmoUsername} onSave={(v) => updateContent('venmoUsername', v)} className="w-full px-3 py-2 border rounded-lg" />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Venmo QR Code</label>
                        {content.venmoImage && (
                          <div className="mb-2">
                            <img src={content.venmoImage} alt="Venmo QR Code" className="w-32 h-32 border rounded" />
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = (ev) => updateContent('venmoImage', ev.target.result);
                                reader.readAsDataURL(file);
                              }
                            }}
                            className="text-sm"
                          />
                          {content.venmoImage && (
                            <button onClick={() => updateContent('venmoImage', null)} className="text-sm text-red-600 underline">Remove</button>
                          )}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Morning Session</label>
                        <StableInput value={content.sessionMorning} onSave={(v) => updateContent('sessionMorning', v)} className="w-full px-3 py-2 border rounded-lg" />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Afternoon Session</label>
                        <StableInput value={content.sessionAfternoon} onSave={(v) => updateContent('sessionAfternoon', v)} className="w-full px-3 py-2 border rounded-lg" />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Camp Dates</label>
                        <StableInput value={content.campDates} onSave={(v) => updateContent('campDates', v)} className="w-full px-3 py-2 border rounded-lg" />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Age Range</label>
                        <StableInput value={content.ageRange} onSave={(v) => updateContent('ageRange', v)} className="w-full px-3 py-2 border rounded-lg" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl shadow p-6">
                    <h3 className="font-bold mb-4">Contact & Location</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Email</label>
                        <StableInput value={content.contactEmail} onSave={(v) => updateContent('contactEmail', v)} className="w-full px-3 py-2 border rounded-lg" />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Phone</label>
                        <StableInput value={content.contactPhone} onSave={(v) => updateContent('contactPhone', v)} className="w-full px-3 py-2 border rounded-lg" />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Location Name</label>
                        <StableInput value={content.locationName} onSave={(v) => updateContent('locationName', v)} className="w-full px-3 py-2 border rounded-lg" />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Location Address</label>
                        <StableInput value={content.locationAddress} onSave={(v) => updateContent('locationAddress', v)} className="w-full px-3 py-2 border rounded-lg" />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">City</label>
                        <StableInput value={content.locationCity} onSave={(v) => updateContent('locationCity', v)} className="w-full px-3 py-2 border rounded-lg" />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">State</label>
                        <StableInput value={content.locationState} onSave={(v) => updateContent('locationState', v)} className="w-full px-3 py-2 border rounded-lg" />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Zip Code</label>
                        <StableInput value={content.locationZip} onSave={(v) => updateContent('locationZip', v)} className="w-full px-3 py-2 border rounded-lg" />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm text-gray-600 mb-1">Location Details</label>
                        <StableTextarea value={content.locationDetails} onSave={(v) => updateContent('locationDetails', v)} className="w-full px-3 py-2 border rounded-lg" rows={2} />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl shadow p-6">
                    <h3 className="font-bold mb-4">About</h3>
                    <label className="block text-sm text-gray-600 mb-1">About Text</label>
                    <StableTextarea value={content.aboutText} onSave={(v) => updateContent('aboutText', v)} className="w-full px-3 py-2 border rounded-lg" rows={4} />
                  </div>

                  <div className="bg-white rounded-xl shadow p-6">
                    <h3 className="font-bold mb-4">Pricing & Discounts</h3>
                    <div className="grid md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Single Session Cost ($)</label>
                        <StableInput value={String(content.singleSessionCost || '')} onSave={(v) => updateContent('singleSessionCost', Number(v))} className="w-full px-3 py-2 border rounded-lg" />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Week Discount (%)</label>
                        <StableInput value={String(content.weekDiscount || '')} onSave={(v) => updateContent('weekDiscount', Number(v))} className="w-full px-3 py-2 border rounded-lg" />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Multi-Week Discount (%)</label>
                        <StableInput value={String(content.multiWeekDiscount || '')} onSave={(v) => updateContent('multiWeekDiscount', Number(v))} className="w-full px-3 py-2 border rounded-lg" />
                      </div>
                    </div>
                    <div className="mt-4">
                      <label className="block text-sm text-gray-600 mb-1">Scholarship Info</label>
                      <StableTextarea value={content.scholarshipInfo} onSave={(v) => updateContent('scholarshipInfo', v)} className="w-full px-3 py-2 border rounded-lg" rows={3} />
                    </div>
                  </div>

                  <div className="bg-white rounded-xl shadow p-6">
                    <h3 className="font-bold mb-4">Policies</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Cancellation Policy</label>
                        <StableTextarea value={content.cancellationPolicy} onSave={(v) => updateContent('cancellationPolicy', v)} className="w-full px-3 py-2 border rounded-lg" rows={3} />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Late Pickup Policy</label>
                        <StableTextarea value={content.latePickupPolicy} onSave={(v) => updateContent('latePickupPolicy', v)} className="w-full px-3 py-2 border rounded-lg" rows={3} />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl shadow p-6">
                    <h3 className="font-bold mb-2">Pickup Policy Images</h3>
                    <p className="text-sm text-gray-500 mb-4">These images appear during onboarding when parents review the pick-up policy. Upload a realistic example of a face photo and a photo ID card.</p>
                    <div className="grid md:grid-cols-2 gap-6">
                      <ImageUpload
                        currentImage={content.pickupPolicyFacePhoto}
                        onImageChange={(img) => updateContent('pickupPolicyFacePhoto', img)}
                        label="Face Photo Example"
                        circular={true}
                      />
                      <ImageUpload
                        currentImage={content.pickupPolicyIdPhoto}
                        onImageChange={(img) => updateContent('pickupPolicyIdPhoto', img)}
                        label="Photo ID Example"
                      />
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                    <h3 className="font-bold mb-2 text-blue-800">Data From Other Tables</h3>
                    <p className="text-sm text-blue-700 mb-3">The following content on the public website is pulled from database tables, not the content settings above. To update this data, edit the source records directly.</p>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-start gap-2 p-2 bg-white rounded border border-blue-100">
                        <span className="font-bold text-blue-600 whitespace-nowrap">Counselor Profiles</span>
                        <span className="text-gray-600">Names, bios, and photos shown on the public site come from the <strong>Counselors</strong> tab. Edit counselor profiles there.</span>
                      </div>
                      <div className="flex items-start gap-2 p-2 bg-white rounded border border-blue-100">
                        <span className="font-bold text-blue-600 whitespace-nowrap">Camp Dates</span>
                        <span className="text-gray-600">The camp schedule calendar is generated from the <strong>camp_dates</strong> system table. These are configured in the codebase.</span>
                      </div>
                      <div className="flex items-start gap-2 p-2 bg-white rounded border border-blue-100">
                        <span className="font-bold text-blue-600 whitespace-nowrap">Gym Rental Days</span>
                        <span className="text-gray-600">Which days the gym is booked comes from <strong>Gym Rental Days</strong> tab under Camp Setup.</span>
                      </div>
                    </div>
                  </div>

                  {/* Site Photos Management (Hero, Drop-off, Layups, Lunch) */}
                  <SitePhotosManager
                    sitePhotos={sitePhotos}
                    onSave={saveSitePhotos}
                  />

                  {/* Food Photos Management */}
                  <FoodPhotosManager
                    foodPhotos={foodPhotos}
                    getFoodPhoto={getFoodPhoto}
                    onSave={saveFoodPhotos}
                  />
                </div>
              )}

              {adminParentTab === 'family' && getActiveChildTab('family') === 'parents' && (
                <ParentsTab
                  parents={parents}
                  registrations={registrations}
                  onUpdateParents={saveParents}
                  onDeleteParent={deleteParent}
                  onUpdateRegistrations={saveReg}
                  onDeleteRegistration={async (reg) => {
                    // Remove from registrations
                    setRegistrations(registrations.filter(r => r.id !== reg.id));
                    await supabase.from('camp_registrations').delete().eq('id', reg.id);

                    // Clean up assignments for this child on this date/sessions
                    if (reg.childId && reg.date && reg.sessions) {
                      const updatedAssignments = { ...assignments };
                      reg.sessions.forEach(session => {
                        const key = `${reg.date}_${session}`;
                        if (updatedAssignments[key]) {
                          Object.keys(updatedAssignments[key]).forEach(counselorId => {
                            updatedAssignments[key][counselorId] = updatedAssignments[key][counselorId].filter(id => id !== reg.childId);
                          });
                        }
                      });
                      setAssignments(updatedAssignments);
                      await storage.set('camp_assignments', 'main', updatedAssignments);
                    }
                  }}
                  showToast={showToast}
                  addToHistory={addToHistory}
                  campers={campers}
                  camperParentLinks={camperParentLinks}
                  onSaveLinks={saveCamperParentLinks}
                  onSaveCampers={saveCampers}
                  onSaveCamperParentLinks={saveCamperParentLinks}
                  emergencyContacts={emergencyContacts}
                  saveEmergencyContacts={saveEmergencyContacts}
                  saveOnboardingProgress={saveOnboardingProgress}
                />
              )}

              {adminParentTab === 'admins' && (
                <AdminsTab
                  admins={admins}
                  currentAdminId={user?.adminId}
                  onSave={saveAdmins}
                  showToast={showToast}
                />
              )}

              {adminParentTab === 'family' && getActiveChildTab('family') === 'campers' && (
                <CampersTab
                  parents={parents}
                  registrations={registrations}
                  campers={campers}
                  camperParentLinks={camperParentLinks}
                  emergencyContacts={emergencyContacts}
                  onSaveCampers={saveCampers}
                  onSaveLinks={saveCamperParentLinks}
                  onDeleteCamper={deleteCamper}
                  onSaveEmergencyContacts={saveEmergencyContacts}
                  showToast={showToast}
                  addToHistory={addToHistory}
                  assignments={assignments}
                />
              )}

              {adminParentTab === 'pod' && getActiveChildTab('pod') === 'assignments' && (
                <AssignmentsTab
                  registrations={registrations}
                  counselors={counselors}
                  users={users}
                  assignments={assignments}
                  availability={availability}
                  onSaveAssignments={saveAssignments}
                  showToast={showToast}
                  selectedMonth={assignmentsTabMonth}
                  setSelectedMonth={setAssignmentsTabMonth}
                  campers={campers}
                  selectedDate={podSelectedDate}
                  setSelectedDate={setPodSelectedDate}
                  selectedSession={podSelectedSession}
                  setSelectedSession={setPodSelectedSession}
                  sessionPods={podSessionPods}
                  setSessionPods={setPodSessionPods}
                  podCalWeeks={podCalWeeks}
                  setPodCalWeeks={setPodCalWeeks}
                  podCalDates={podCalDates}
                  setPodCalDates={setPodCalDates}
                  podCamperView={podCamperView}
                  setPodCamperView={setPodCamperView}
                  podSelectedCamper={podSelectedCamper}
                  setPodSelectedCamper={setPodSelectedCamper}
                  counselorSchedule={counselorSchedule}
                />
              )}

              {adminParentTab === 'family' && getActiveChildTab('family') === 'sessionregs' && false && (
                <SessionsTab
                  blockedSessions={blockedSessions}
                  allDates={CAMP_DATES}
                  onSaveBlockedSessions={saveBlockedSessions}
                  registrations={registrations}
                  counselors={counselors}
                  availability={availability}
                  assignments={assignments}
                  showToast={showToast}
                  selectedMonth={sessionsTabMonth}
                  setSelectedMonth={setSessionsTabMonth}
                />
              )}

              {adminParentTab === 'camp' && getActiveChildTab('camp') === 'gymrentals' && (
                <GymRentalDaysTab
                  gymRentals={gymRentals}
                  allDates={CAMP_DATES}
                  onSaveGymRentals={saveGymRentals}
                  showToast={showToast}
                  selectedMonth={gymRentalsTabMonth}
                  setSelectedMonth={setGymRentalsTabMonth}
                />
              )}

              {adminParentTab === 'camp' && getActiveChildTab('camp') === 'history' && (
                <div className="bg-white rounded-xl shadow p-6">
                  <h3 className="font-bold text-lg text-green-800 mb-4">📜 Change History</h3>
                  {changeHistory.length === 0 ? (
                    <p className="text-gray-500">No changes recorded yet</p>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {changeHistory.map(entry => (
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
              )}

              {adminParentTab === 'camp' && getActiveChildTab('camp') === 'dangerzone' && (
                <div className="space-y-6">
                  {/* Warning Banner */}
                  <div className="bg-red-50 border-2 border-red-300 rounded-xl p-6">
                    <div className="flex items-start gap-4">
                      <span className="text-4xl">⚠️</span>
                      <div>
                        <h3 className="font-bold text-xl text-red-700 mb-2">Danger Zone</h3>
                        <p className="text-red-600 mb-2">
                          Actions in this section are <strong>destructive and irreversible</strong>. Use extreme caution.
                        </p>
                        <p className="text-sm text-red-500">
                          Deletions will permanently remove data from Supabase and cannot be undone.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Delete Actions */}
                  <div className="bg-white rounded-xl shadow p-6">
                    <h3 className="font-bold text-lg text-gray-800 mb-4">🗑️ Delete Records</h3>
                    <div className="grid md:grid-cols-1 gap-4">
                      {/* Delete ALL Data (except Counselors) */}
                      <div className="border-2 border-red-700 rounded-lg p-4 bg-red-100">
                        <h4 className="font-bold text-red-900 mb-2">☢️ Delete All Data (except Counselors)</h4>
                        <p className="text-sm text-red-800 mb-3">
                          Removes all parents, campers, registrations, assignments, emergency contacts, and all parent data. <strong>Preserves counselors, counselor availability, and admin.</strong> This resets all parent/camper data while keeping your counselor roster intact.
                        </p>
                        <button
                          onClick={async () => {
                            if (!confirm('☢️ DELETE ALL DATA: This will delete all parents, campers, registrations, assignments, and emergency contacts (but preserve counselors and admin). Are you ABSOLUTELY SURE?')) return;
                            const confirmText = prompt('Type DELETE ALL to confirm data wipe:');
                            if (confirmText !== 'DELETE ALL') {
                              showToast('Deletion cancelled', 'error');
                              return;
                            }
                            // Delete all parent/camper data (but preserve counselors and admins)
                            await saveParents([], 'Total Wipe: Deleted all parents');
                            // Note: counselorUsers and admins tables are NOT touched - they are preserved
                            await saveCampers([], 'Total Wipe: Deleted all campers');
                            await saveRegistrations([], 'Total Wipe: Deleted all registrations');
                            await saveAssignments({}, 'Total Wipe: Deleted all assignments');
                            await saveCamperParentLinks([], 'Total Wipe: Cleared all links');
                            await saveEmergencyContacts([], 'Total Wipe: Deleted all emergency contacts');
                            await saveOnboardingProgress({});
                            await saveAvailabilityChangeRequests([], 'Total Wipe: Cleared change requests');
                            await saveProfileChangeRequests([], 'Total Wipe: Cleared profile requests');
                            // Note: We preserve counselor data (counselors, availability, schedules)
                            showToast('☢️ All parent/camper data deleted (counselors & admin preserved)');
                          }}
                          className="px-4 py-2 bg-red-900 text-white rounded-lg hover:bg-black w-full font-bold"
                        >
                          ☢️ DELETE ALL DATA (EXCEPT COUNSELORS)
                        </button>
                      </div>

                      {/* Delete ALL Counselor Data */}
                      <div className="border-2 border-red-500 rounded-lg p-4 bg-red-50">
                        <h4 className="font-bold text-red-800 mb-2">🏀 Delete All Counselor Data</h4>
                        <p className="text-sm text-red-700 mb-3">
                          Removes all counselor profiles, login accounts, availability, and schedules. <strong>Preserves parents, campers, registrations, and admin.</strong> Useful for resetting test counselor data.
                        </p>
                        <button
                          onClick={async () => {
                            if (!confirm('🏀 DELETE ALL COUNSELORS: This will delete all counselor profiles, login accounts, availability, and schedules. Are you ABSOLUTELY SURE?')) return;
                            const confirmText = prompt('Type DELETE COUNSELORS to confirm:');
                            if (confirmText !== 'DELETE COUNSELORS') {
                              showToast('Deletion cancelled', 'error');
                              return;
                            }
                            // Delete all counselor rows (individual rows per counselor)
                            for (const c of counselors) {
                              try { await supabase.from('camp_counselors').delete().eq('id', c.id); } catch (e) { console.error(e); }
                            }
                            setCounselors([]);
                            // Clear counselor user accounts
                            await saveCounselorUsers([], 'Deleted all counselor users');
                            // Clear availability
                            await saveAvail({}, 'Deleted all counselor availability');
                            // Clear schedules
                            await saveCounselorSchedule({}, 'Deleted all counselor schedules');
                            // Clear assignments that reference counselors
                            await saveAssignments({}, 'Deleted all assignments (counselor wipe)');
                            showToast('🏀 All counselor data deleted');
                          }}
                          className="px-4 py-2 bg-red-700 text-white rounded-lg hover:bg-red-900 w-full font-bold"
                        >
                          🏀 DELETE ALL COUNSELOR DATA
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Photo Migration Tool */}
                  <div className="bg-white rounded-xl shadow p-6 border-2 border-blue-200">
                    <h3 className="font-bold text-lg text-blue-800 mb-2">📸 Migrate Photos to Storage CDN</h3>
                    <p className="text-sm text-gray-600 mb-3">
                      Scans all tables for base64 photo data and uploads them to Supabase Storage (CDN). Replaces the giant text blobs with small URLs. Run once to speed up page loads dramatically.
                    </p>
                    <button
                      id="migratePhotosBtn"
                      onClick={async () => {
                        const btn = document.getElementById('migratePhotosBtn');
                        const log = document.getElementById('migratePhotosLog');
                        btn.disabled = true;
                        btn.textContent = 'Migrating...';
                        log.textContent = '';
                        const addLog = (msg) => { log.textContent += msg + '\n'; log.scrollTop = log.scrollHeight; };
                        let migrated = 0;
                        let failed = 0;
                        try {
                          // 1. Site photos (object)
                          addLog('--- Site Photos ---');
                          const sp = { ...(sitePhotos || {}) };
                          for (const [key, val] of Object.entries(sp)) {
                            if (val && !photoStorage.isUrl(val)) {
                              const url = await photoStorage.uploadPhoto('site', key, val);
                              if (url) { sp[key] = url; migrated++; addLog('  ✅ ' + key); }
                              else { failed++; addLog('  ❌ ' + key + ' (upload failed)'); }
                            } else { addLog('  ⏭️ ' + key + ' (already URL or empty)'); }
                          }
                          if (Object.keys(sp).length > 0) { setSitePhotos(sp); await storage.set('camp_site_photos', 'main', sp); }

                          // 2. Food photos (object)
                          addLog('--- Food Photos ---');
                          const fp = { ...(foodPhotos || {}) };
                          for (const [key, val] of Object.entries(fp)) {
                            if (val && !photoStorage.isUrl(val)) {
                              const url = await photoStorage.uploadPhoto('food', key, val);
                              if (url) { fp[key] = url; migrated++; addLog('  ✅ ' + key); }
                              else { failed++; addLog('  ❌ ' + key + ' (upload failed)'); }
                            } else { addLog('  ⏭️ ' + key + ' (already URL or empty)'); }
                          }
                          if (Object.keys(fp).length > 0) { setFoodPhotos(fp); await storage.set('camp_food_photos', 'main', fp); }

                          // 3. Counselors (individual rows)
                          addLog('--- Counselors ---');
                          const cs = counselors.map(c => ({ ...c }));
                          for (const c of cs) {
                            if (c.photo && !photoStorage.isUrl(c.photo)) {
                              const url = await photoStorage.uploadPhoto('counselors', c.id, c.photo);
                              if (url) { c.photo = url; migrated++; addLog('  ✅ ' + (c.name || c.id)); }
                              else { failed++; addLog('  ❌ ' + (c.name || c.id) + ' (upload failed)'); }
                            } else { addLog('  ⏭️ ' + (c.name || c.id) + ' (already URL or no photo)'); }
                          }
                          setCounselors(cs);
                          for (const c of cs) await storage.set('camp_counselors', c.id, c);

                          // 4. Campers (array)
                          addLog('--- Campers ---');
                          const cam = (campers || []).map(c => ({ ...c }));
                          for (const c of cam) {
                            if (c.photo && !photoStorage.isUrl(c.photo)) {
                              const url = await photoStorage.uploadPhoto('campers', c.id, c.photo);
                              if (url) { c.photo = url; migrated++; addLog('  ✅ ' + (c.name || c.id)); }
                              else { failed++; addLog('  ❌ ' + (c.name || c.id) + ' (upload failed)'); }
                            } else { addLog('  ⏭️ ' + (c.name || c.id) + ' (already URL or no photo)'); }
                          }
                          if (cam.length > 0) { setCampers(cam); await storage.set('camp_campers', 'main', cam); }

                          // 5. Parents (array)
                          addLog('--- Parents ---');
                          const pa = (parents || []).map(p => ({ ...p }));
                          for (const p of pa) {
                            if (p.photo && !photoStorage.isUrl(p.photo)) {
                              const id = (p.email || '').replace(/[^a-zA-Z0-9]/g, '_') || 'p_' + Date.now();
                              const url = await photoStorage.uploadPhoto('parents', id, p.photo);
                              if (url) { p.photo = url; migrated++; addLog('  ✅ ' + (p.name || p.email)); }
                              else { failed++; addLog('  ❌ ' + (p.name || p.email) + ' (upload failed)'); }
                            } else { addLog('  ⏭️ ' + (p.name || p.email) + ' (already URL or no photo)'); }
                          }
                          if (pa.length > 0) { setParents(pa); await storage.set('camp_parents', 'main', pa); }

                          // 6. Emergency contacts (array)
                          addLog('--- Emergency Contacts ---');
                          const ec = (emergencyContacts || []).map(e => ({ ...e }));
                          for (const e of ec) {
                            if (e.photo && !photoStorage.isUrl(e.photo)) {
                              const url = await photoStorage.uploadPhoto('emergency-contacts', e.id, e.photo);
                              if (url) { e.photo = url; migrated++; addLog('  ✅ ' + (e.name || e.id)); }
                              else { failed++; addLog('  ❌ ' + (e.name || e.id) + ' (upload failed)'); }
                            } else { addLog('  ⏭️ ' + (e.name || e.id) + ' (already URL or no photo)'); }
                          }
                          if (ec.length > 0) { setEmergencyContacts(ec); await storage.set('camp_emergency_contacts', 'main', ec); }

                          addLog('');
                          addLog(`Done! Migrated: ${migrated}, Failed: ${failed}`);
                          addToHistory('Migration', `Migrated ${migrated} photos to Storage CDN (${failed} failed)`);
                          showToast(`Migrated ${migrated} photos to CDN!`);
                        } catch (err) {
                          addLog('ERROR: ' + err.message);
                          showToast('Migration error: ' + err.message, 'error');
                        }
                        btn.disabled = false;
                        btn.textContent = '📸 Migrate Photos to Storage CDN';
                      }}
                      className="px-4 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 w-full font-bold"
                    >
                      📸 Migrate Photos to Storage CDN
                    </button>
                    <pre id="migratePhotosLog" className="mt-3 p-3 bg-gray-100 rounded text-xs text-gray-700 max-h-64 overflow-auto whitespace-pre-wrap" style={{minHeight: '40px'}}></pre>
                  </div>

                  {/* SECTION 1: Tables CLEARED by Delete All Button */}
                  <div className="bg-white rounded-xl shadow p-6 border-2 border-red-200">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">🔴</span>
                      <h3 className="font-bold text-lg text-red-800">Tables CLEARED by "Delete All" Button (9 tables)</h3>
                    </div>
                    <p className="text-sm text-red-600 mb-4">All data in these tables will be permanently wiped when you press the button above.</p>
                    <div className="space-y-4">
                      {/* Parents */}
                      <details className="border border-red-200 rounded-lg">
                        <summary className="cursor-pointer p-4 hover:bg-red-50 font-medium flex items-center justify-between">
                          <span>👨‍👩‍👧 Parents ({parents.length} login accounts)</span>
                          <span className="text-gray-400">▼</span>
                        </summary>
                        <div className="p-4 bg-gray-50 max-h-96 overflow-auto">
                          {parents.length === 0 ? (
                            <p className="text-gray-500 text-sm">No parent records</p>
                          ) : (
                            <div className="space-y-2">
                              {parents.map(parent => (
                                <div key={parent.email} className="flex items-center justify-between p-3 bg-white rounded border">
                                  <div>
                                    <div className="font-medium">{parent.name}</div>
                                    <div className="text-sm text-gray-500">{parent.email}</div>
                                  </div>
                                  <button
                                    onClick={async () => {
                                      if (!confirm(`Delete parent ${parent.name}? This will also remove their children and registrations.`)) return;
                                      const newParents = parents.filter(p => p.email !== parent.email);
                                      await saveParents(newParents, `Deleted parent ${parent.name}`);
                                      showToast(`Deleted ${parent.name}`);
                                    }}
                                    className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                                  >
                                    Delete
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </details>

                      {/* Campers */}
                      <details className="border border-red-200 rounded-lg">
                        <summary className="cursor-pointer p-4 hover:bg-red-50 font-medium flex items-center justify-between">
                          <span>🏕️ Campers ({campers.length} records)</span>
                          <span className="text-gray-400">▼</span>
                        </summary>
                        <div className="p-4 bg-gray-50 max-h-96 overflow-auto">
                          {campers.length === 0 ? (
                            <p className="text-gray-500 text-sm">No camper records</p>
                          ) : (
                            <div className="space-y-2">
                              {campers.map(camper => (
                                <div key={camper.id} className="flex items-center justify-between p-3 bg-white rounded border">
                                  <div>
                                    <div className="font-medium">{camper.name}</div>
                                    <div className="text-sm text-gray-500">Age: {camper.age}</div>
                                  </div>
                                  <button
                                    onClick={async () => {
                                      if (!confirm(`Delete camper ${camper.name}?`)) return;
                                      await deleteCamper(camper.id, camper.name);
                                      showToast(`Deleted ${camper.name}`);
                                    }}
                                    className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                                  >
                                    Delete
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </details>

                      {/* Registrations */}
                      <details className="border border-red-200 rounded-lg">
                        <summary className="cursor-pointer p-4 hover:bg-red-50 font-medium flex items-center justify-between">
                          <span>📝 Registrations ({registrations.length} records)</span>
                          <span className="text-gray-400">▼</span>
                        </summary>
                        <div className="p-4 bg-gray-50 max-h-96 overflow-auto">
                          {registrations.length === 0 ? (
                            <p className="text-gray-500 text-sm">No registration records</p>
                          ) : (
                            <div className="space-y-2">
                              {registrations.map(reg => (
                                <div key={reg.id} className="flex items-center justify-between p-3 bg-white rounded border">
                                  <div>
                                    <div className="font-medium">{reg.camperName || reg.childName}</div>
                                    <div className="text-sm text-gray-500">{reg.date} - {reg.sessions?.join(', ')}</div>
                                  </div>
                                  <button
                                    onClick={async () => {
                                      if (!confirm(`Delete registration for ${reg.camperName || reg.childName}?`)) return;
                                      const newRegs = registrations.filter(r => r.id !== reg.id);
                                      await saveRegistrations(newRegs, `Deleted registration ${reg.id}`);
                                      showToast('Registration deleted');
                                    }}
                                    className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                                  >
                                    Delete
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </details>

                      {/* Assignments */}
                      <details className="border border-red-200 rounded-lg">
                        <summary className="cursor-pointer p-4 hover:bg-red-50 font-medium flex items-center justify-between">
                          <span>📋 Pod Assignments ({Object.keys(assignments).length} sessions)</span>
                          <span className="text-gray-400">▼</span>
                        </summary>
                        <div className="p-4 bg-gray-50 max-h-96 overflow-auto">
                          {Object.keys(assignments).length === 0 ? (
                            <p className="text-gray-500 text-sm">No assignment records</p>
                          ) : (
                            <div className="space-y-2">
                              {Object.entries(assignments).map(([sessionKey, pods]) => (
                                <div key={sessionKey} className="flex items-center justify-between p-3 bg-white rounded border">
                                  <div>
                                    <div className="font-medium">{sessionKey.replace('_', ' - ')}</div>
                                    <div className="text-sm text-gray-500">{Object.keys(pods).length} pod(s)</div>
                                  </div>
                                  <button
                                    onClick={async () => {
                                      if (!confirm(`Delete all pod assignments for ${sessionKey}?`)) return;
                                      const newAssignments = { ...assignments };
                                      delete newAssignments[sessionKey];
                                      await saveAssignments(newAssignments, `Deleted assignments for ${sessionKey}`);
                                      showToast('Session assignments deleted');
                                    }}
                                    className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                                  >
                                    Delete
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </details>

                      {/* Emergency Contacts */}
                      <details className="border border-red-200 rounded-lg">
                        <summary className="cursor-pointer p-4 hover:bg-red-50 font-medium flex items-center justify-between">
                          <span>🆘 Emergency Contacts ({emergencyContacts.length} contacts)</span>
                          <span className="text-gray-400">▼</span>
                        </summary>
                        <div className="p-4 bg-gray-50 max-h-96 overflow-auto">
                          {emergencyContacts.length === 0 ? (
                            <p className="text-gray-500 text-sm">No emergency contact records</p>
                          ) : (
                            <div className="space-y-2">
                              {emergencyContacts.map(contact => (
                                <div key={contact.id} className="flex items-center justify-between p-3 bg-white rounded border">
                                  <div>
                                    <div className="font-medium">{contact.name}</div>
                                    <div className="text-sm text-gray-500">
                                      {contact.relationship} • {contact.phone}
                                      {contact.userEmail && <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">Parent: {contact.userEmail}</span>}
                                    </div>
                                  </div>
                                  <button
                                    onClick={async () => {
                                      if (!confirm(`Delete emergency contact ${contact.name}?`)) return;
                                      const newContacts = emergencyContacts.filter(c => c.id !== contact.id);
                                      await saveEmergencyContacts(newContacts, `Deleted emergency contact ${contact.name}`);
                                      showToast('Emergency contact deleted');
                                    }}
                                    className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                                  >
                                    Delete
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </details>

                      {/* Camper-Parent Links */}
                      <details className="border border-red-200 rounded-lg">
                        <summary className="cursor-pointer p-4 hover:bg-red-50 font-medium flex items-center justify-between">
                          <span>🔗 Camper-Parent Links ({camperParentLinks.length} links)</span>
                          <span className="text-gray-400">▼</span>
                        </summary>
                        <div className="p-4 bg-gray-50 max-h-96 overflow-auto">
                          {camperParentLinks.length === 0 ? (
                            <p className="text-gray-500 text-sm">No camper-parent links</p>
                          ) : (
                            <div className="space-y-2">
                              {camperParentLinks.map((link, idx) => {
                                const camper = campers.find(c => c.id === link.camperId);
                                const parent = parents.find(p => p.email === link.parentEmail);
                                return (
                                  <div key={`${link.camperId}-${link.parentEmail}-${idx}`} className="flex items-center justify-between p-3 bg-white rounded border">
                                    <div className="flex-1">
                                      <div className="font-medium">{camper?.name || 'Unknown Camper'} ↔ {parent?.name || link.parentEmail}</div>
                                      <div className="text-sm text-gray-500">Camper ID: {link.camperId}</div>
                                    </div>
                                    <button
                                      onClick={async () => {
                                        if (!confirm(`Delete link between ${camper?.name} and ${parent?.name}?`)) return;
                                        const newLinks = camperParentLinks.filter((l, i) => i !== idx);
                                        await saveCamperParentLinks(newLinks, `Deleted link for ${camper?.name}`);
                                        showToast('Link deleted');
                                      }}
                                      className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </details>

                      {/* Onboarding Progress */}
                      <details className="border border-red-200 rounded-lg">
                        <summary className="cursor-pointer p-4 hover:bg-red-50 font-medium flex items-center justify-between">
                          <span>🎯 Onboarding Progress ({Object.keys(onboardingProgress || {}).length} users)</span>
                          <span className="text-gray-400">▼</span>
                        </summary>
                        <div className="p-4 bg-gray-50 max-h-96 overflow-auto">
                          {Object.keys(onboardingProgress || {}).length === 0 ? (
                            <p className="text-gray-500 text-sm">No onboarding progress records</p>
                          ) : (
                            <div className="space-y-2">
                              {Object.entries(onboardingProgress).map(([userEmail, progressData]) => (
                                <div key={userEmail} className="flex items-center justify-between p-3 bg-white rounded border">
                                  <div className="flex-1">
                                    <div className="font-medium">{userEmail}</div>
                                    <div className="text-sm text-gray-500">Step: {progressData.step || 0} - {progressData.complete ? 'Complete' : 'In Progress'}</div>
                                  </div>
                                  <button
                                    onClick={async () => {
                                      if (!confirm(`Delete onboarding progress for ${userEmail}?`)) return;
                                      const newProgress = { ...onboardingProgress };
                                      delete newProgress[userEmail];
                                      setOnboardingProgress(newProgress);
                                      await storage.set('camp_onboarding_progress', 'main', newProgress);
                                      addToHistory('Onboarding Progress Deleted', `Deleted progress for ${userEmail}`);
                                      showToast('Progress deleted');
                                    }}
                                    className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                                  >
                                    Delete
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </details>

                      {/* Availability Change Requests */}
                      <details className="border border-red-200 rounded-lg">
                        <summary className="cursor-pointer p-4 hover:bg-red-50 font-medium flex items-center justify-between">
                          <span>📝 Availability Change Requests ({availabilityChangeRequests.length} requests)</span>
                          <span className="text-gray-400">▼</span>
                        </summary>
                        <div className="p-4 bg-gray-50 max-h-96 overflow-auto">
                          {availabilityChangeRequests.length === 0 ? (
                            <p className="text-gray-500 text-sm">No availability change requests</p>
                          ) : (
                            <div className="space-y-2">
                              {availabilityChangeRequests.map(request => (
                                <div key={request.id} className="flex items-center justify-between p-3 bg-white rounded border">
                                  <div className="flex-1">
                                    <div className="font-medium">{request.counselorEmail || 'Unknown'}</div>
                                    <div className="text-sm text-gray-500">Status: {request.status || 'Pending'}</div>
                                  </div>
                                  <button
                                    onClick={async () => {
                                      if (!confirm(`Delete availability change request?`)) return;
                                      const newRequests = availabilityChangeRequests.filter(r => r.id !== request.id);
                                      await saveAvailabilityChangeRequests(newRequests, `Deleted change request`);
                                      showToast('Request deleted');
                                    }}
                                    className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                                  >
                                    Delete
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </details>

                      {/* Profile Change Requests */}
                      <details className="border border-red-200 rounded-lg">
                        <summary className="cursor-pointer p-4 hover:bg-red-50 font-medium flex items-center justify-between">
                          <span>👤 Profile Change Requests ({profileChangeRequests.length} requests)</span>
                          <span className="text-gray-400">▼</span>
                        </summary>
                        <div className="p-4 bg-gray-50 max-h-96 overflow-auto">
                          {profileChangeRequests.length === 0 ? (
                            <p className="text-gray-500 text-sm">No profile change requests</p>
                          ) : (
                            <div className="space-y-2">
                              {profileChangeRequests.map(request => (
                                <div key={request.id} className="flex items-center justify-between p-3 bg-white rounded border">
                                  <div className="flex-1">
                                    <div className="font-medium">{request.counselorEmail || 'Unknown'}</div>
                                    <div className="text-sm text-gray-500">Status: {request.status || 'Pending'}</div>
                                  </div>
                                  <button
                                    onClick={async () => {
                                      if (!confirm(`Delete profile change request?`)) return;
                                      const newRequests = profileChangeRequests.filter(r => r.id !== request.id);
                                      await saveProfileChangeRequests(newRequests, `Deleted change request`);
                                      showToast('Request deleted');
                                    }}
                                    className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                                  >
                                    Delete
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </details>
                    </div>
                  </div>

                  {/* SECTION 2: Tables NOT CLEARED by Delete All Button */}
                  <div className="bg-white rounded-xl shadow p-6 border-2 border-green-200">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">🟢</span>
                      <h3 className="font-bold text-lg text-green-800">Tables PRESERVED by "Delete All" Button (14 tables)</h3>
                    </div>
                    <p className="text-sm text-green-600 mb-4">These tables are NOT affected by the delete button. They can only be deleted individually.</p>
                    <div className="space-y-4">
                      {/* Admins */}
                      <details className="border border-green-200 rounded-lg">
                        <summary className="cursor-pointer p-4 hover:bg-green-50 font-medium flex items-center justify-between">
                          <span>👑 Admins ({admins.length} accounts)</span>
                          <span className="text-gray-400">▼</span>
                        </summary>
                        <div className="p-4 bg-gray-50 max-h-96 overflow-auto">
                          {admins.length === 0 ? (
                            <p className="text-gray-500 text-sm">No admin accounts</p>
                          ) : (
                            <div className="space-y-2">
                              {admins.map(admin => (
                                <div key={admin.username} className="flex items-center justify-between p-3 bg-white rounded border">
                                  <div className="flex-1">
                                    <div className="font-medium">{admin.name || admin.username}</div>
                                    <div className="text-sm text-gray-500">Username: {admin.username}</div>
                                  </div>
                                  <button
                                    onClick={async () => {
                                      if (admins.length === 1) {
                                        alert('Cannot delete the last admin account!');
                                        return;
                                      }
                                      if (!confirm(`Delete admin ${admin.username}?`)) return;
                                      const newAdmins = admins.filter(a => a.username !== admin.username);
                                      await saveAdmins(newAdmins, `Deleted admin ${admin.username}`);
                                      showToast(`Deleted ${admin.username}`);
                                    }}
                                    className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                                  >
                                    Delete
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </details>

                      {/* Counselor Users (Login Accounts) */}
                      <details className="border border-green-200 rounded-lg">
                        <summary className="cursor-pointer p-4 hover:bg-green-50 font-medium flex items-center justify-between">
                          <span>🔐 Counselor Users ({counselorUsers.length} login accounts)</span>
                          <span className="text-gray-400">▼</span>
                        </summary>
                        <div className="p-4 bg-gray-50 max-h-96 overflow-auto">
                          {counselorUsers.length === 0 ? (
                            <p className="text-gray-500 text-sm">No counselor user accounts</p>
                          ) : (
                            <div className="space-y-2">
                              {counselorUsers.map(user => (
                                <div key={user.email} className="flex items-center justify-between p-3 bg-white rounded border">
                                  <div className="flex-1">
                                    <div className="font-medium">{user.name}</div>
                                    <div className="text-sm text-gray-500">{user.email}</div>
                                  </div>
                                  <button
                                    onClick={async () => {
                                      if (!confirm(`Delete counselor user account for ${user.name}?`)) return;
                                      const newUsers = counselorUsers.filter(u => u.email !== user.email);
                                      await saveCounselorUsers(newUsers, `Deleted counselor user ${user.name}`);
                                      showToast(`Deleted ${user.name}`);
                                    }}
                                    className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                                  >
                                    Delete
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </details>

                      {/* Counselors (Profiles) */}
                      <details className="border border-green-200 rounded-lg">
                        <summary className="cursor-pointer p-4 hover:bg-green-50 font-medium flex items-center justify-between">
                          <span>🏀 Counselors ({counselors.length} profiles)</span>
                          <span className="text-gray-400">▼</span>
                        </summary>
                        <div className="p-4 bg-gray-50 max-h-96 overflow-auto">
                          {counselors.length === 0 ? (
                            <p className="text-gray-500 text-sm">No counselor records</p>
                          ) : (
                            <div className="space-y-2">
                              {counselors.map(counselor => (
                                <div key={counselor.id} className="flex items-center justify-between p-3 bg-white rounded border">
                                  <div>
                                    <div className="font-medium">{counselor.name}</div>
                                    <div className="text-sm text-gray-500">{counselor.email}</div>
                                  </div>
                                  <button
                                    onClick={async () => {
                                      if (!confirm(`Delete counselor ${counselor.name}?`)) return;
                                      await deleteCounselor(counselor.id, counselor.name);
                                      showToast(`Deleted ${counselor.name}`);
                                    }}
                                    className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                                  >
                                    Delete
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </details>

                      {/* Counselor Availability */}
                      <details className="border border-green-200 rounded-lg">
                        <summary className="cursor-pointer p-4 hover:bg-green-50 font-medium flex items-center justify-between">
                          <span>📅 Counselor Availability ({Object.keys(availability).length} counselors)</span>
                          <span className="text-gray-400">▼</span>
                        </summary>
                        <div className="p-4 bg-gray-50 max-h-96 overflow-auto">
                          {Object.keys(availability).length === 0 ? (
                            <p className="text-gray-500 text-sm">No availability records</p>
                          ) : (
                            <div className="space-y-2">
                              {Object.entries(availability).map(([email, dates]) => {
                                const counselor = counselors.find(c => c.email === email);
                                const counselorName = counselor ? counselor.name : email;
                                const dateCount = Object.keys(dates).length;
                                return (
                                  <div key={email} className="flex items-center justify-between p-3 bg-white rounded border">
                                    <div>
                                      <div className="font-medium">{counselorName}</div>
                                      <div className="text-sm text-gray-500">{email} - {dateCount} date(s)</div>
                                    </div>
                                    <button
                                      onClick={async () => {
                                        if (!confirm(`Delete availability for ${counselorName}?`)) return;
                                        const newAvailability = { ...availability };
                                        delete newAvailability[email];
                                        await saveAvail(newAvailability, `Deleted availability for ${counselorName}`);
                                        const newSchedule = { ...counselorSchedule };
                                        if (counselor && counselor.id) {
                                          delete newSchedule[counselor.id];
                                        } else {
                                          const validCounselorIds = counselors.map(c => c.id);
                                          Object.keys(newSchedule).forEach(scheduleId => {
                                            if (!validCounselorIds.includes(scheduleId)) {
                                              delete newSchedule[scheduleId];
                                            }
                                          });
                                        }
                                        await saveCounselorSchedule(newSchedule, `Deleted schedule for ${counselorName}`);
                                        showToast('Availability deleted');
                                      }}
                                      className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </details>

                      {/* Counselor Schedule */}
                      <details className="border border-green-200 rounded-lg">
                        <summary className="cursor-pointer p-4 hover:bg-green-50 font-medium flex items-center justify-between">
                          <span>📆 Counselor Schedule ({Object.keys(counselorSchedule).length} counselors)</span>
                          <span className="text-gray-400">▼</span>
                        </summary>
                        <div className="p-4 bg-gray-50 max-h-96 overflow-auto">
                          {Object.keys(counselorSchedule).length === 0 ? (
                            <p className="text-gray-500 text-sm">No counselor schedules</p>
                          ) : (
                            <div className="space-y-2">
                              {Object.entries(counselorSchedule).map(([counselorId, schedule]) => {
                                const counselor = counselors.find(c => c.id === counselorId);
                                const dateCount = Object.keys(schedule).length;
                                return (
                                  <div key={counselorId} className="flex items-center justify-between p-3 bg-white rounded border">
                                    <div className="flex-1">
                                      <div className="font-medium">{counselor?.name || counselorId}</div>
                                      <div className="text-sm text-gray-500">{dateCount} scheduled date(s)</div>
                                    </div>
                                    <button
                                      onClick={async () => {
                                        if (!confirm(`Delete schedule for ${counselor?.name || counselorId}?`)) return;
                                        const newSchedule = { ...counselorSchedule };
                                        delete newSchedule[counselorId];
                                        await saveCounselorSchedule(newSchedule, `Deleted schedule for ${counselor?.name}`);
                                        showToast('Schedule deleted');
                                      }}
                                      className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </details>

                      {/* Blocked Sessions */}
                      <details className="border border-green-200 rounded-lg">
                        <summary className="cursor-pointer p-4 hover:bg-green-50 font-medium flex items-center justify-between">
                          <span>🚫 Blocked Sessions ({Object.keys(blockedSessions).length} dates)</span>
                          <span className="text-gray-400">▼</span>
                        </summary>
                        <div className="p-4 bg-gray-50 max-h-96 overflow-auto">
                          {Object.keys(blockedSessions).length === 0 ? (
                            <p className="text-gray-500 text-sm">No blocked sessions</p>
                          ) : (
                            <div className="space-y-2">
                              {Object.entries(blockedSessions).map(([date, data]) => (
                                <div key={date} className="flex items-center justify-between p-3 bg-white rounded border">
                                  <div className="flex-1">
                                    <div className="font-medium">{date}</div>
                                    <div className="text-sm text-gray-500">{data.reason || 'No reason provided'}</div>
                                  </div>
                                  <button
                                    onClick={async () => {
                                      if (!confirm(`Unblock session on ${date}?`)) return;
                                      const newBlocked = { ...blockedSessions };
                                      delete newBlocked[date];
                                      await saveBlockedSessions(newBlocked, `Unblocked session on ${date}`);
                                      showToast('Session unblocked');
                                    }}
                                    className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                                  >
                                    Delete
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </details>

                      {/* Camp Dates */}
                      <details className="border border-green-200 rounded-lg">
                        <summary className="cursor-pointer p-4 hover:bg-green-50 font-medium flex items-center justify-between">
                          <span>📅 Camp Dates (system table)</span>
                          <span className="text-gray-400">▼</span>
                        </summary>
                        <div className="p-4 bg-gray-50 max-h-96 overflow-auto">
                          <p className="text-gray-500 text-sm italic">This table is managed automatically by the system and should not be manually edited.</p>
                        </div>
                      </details>

                      {/* Gym Rentals */}
                      <details className="border border-green-200 rounded-lg">
                        <summary className="cursor-pointer p-4 hover:bg-green-50 font-medium flex items-center justify-between">
                          <span>🏀 Gym Rentals ({Object.keys(gymRentals || {}).length} dates)</span>
                          <span className="text-gray-400">▼</span>
                        </summary>
                        <div className="p-4 bg-gray-50 max-h-96 overflow-auto">
                          {Object.keys(gymRentals || {}).length === 0 ? (
                            <p className="text-gray-500 text-sm">No gym rental records</p>
                          ) : (
                            <div className="space-y-2">
                              {Object.entries(gymRentals).map(([date, data]) => (
                                <div key={date} className="flex items-center justify-between p-3 bg-white rounded border">
                                  <div className="flex-1">
                                    <div className="font-medium">{date}</div>
                                    <div className="text-sm text-gray-500">
                                      {data.morning && 'Morning'}
                                      {data.morning && data.afternoon && ' & '}
                                      {data.afternoon && 'Afternoon'}
                                    </div>
                                  </div>
                                  <button
                                    onClick={async () => {
                                      if (!confirm(`Delete gym rental on ${date}?`)) return;
                                      const newRentals = { ...gymRentals };
                                      delete newRentals[date];
                                      setGymRentals(newRentals);
                                      await storage.set('camp_gym_rentals', 'main', newRentals);
                                      addToHistory('Gym Rental Deleted', `Deleted rental on ${date}`);
                                      showToast('Gym rental deleted');
                                    }}
                                    className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                                  >
                                    Delete
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </details>

                      {/* Website Content */}
                      <details className="border border-green-200 rounded-lg">
                        <summary className="cursor-pointer p-4 hover:bg-green-50 font-medium flex items-center justify-between">
                          <span>✏️ Website Content ({Object.keys(content || {}).length} fields)</span>
                          <span className="text-gray-400">▼</span>
                        </summary>
                        <div className="p-4 bg-gray-50 max-h-96 overflow-auto">
                          {!content || Object.keys(content).length === 0 ? (
                            <p className="text-gray-500 text-sm">No content data</p>
                          ) : (
                            <div className="space-y-2">
                              <div className="p-3 bg-white rounded border">
                                <div className="text-sm font-medium text-gray-700 mb-2">Website Content Record</div>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                  <div className="text-gray-500">Camp Name:</div>
                                  <div className="truncate">{content.campName || 'N/A'}</div>
                                  <div className="text-gray-500">Session Cost:</div>
                                  <div>{content.sessionCost || 'N/A'}</div>
                                  <div className="text-gray-500">Total Fields:</div>
                                  <div>{Object.keys(content).length}</div>
                                </div>
                                <button
                                  onClick={async () => {
                                    if (!confirm('Reset website content to defaults? This will erase all customizations.')) return;
                                    await saveContent(DEFAULT_CONTENT, 'Reset content to defaults');
                                    showToast('Content reset to defaults');
                                  }}
                                  className="mt-3 w-full px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                                >
                                  Reset to Defaults
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </details>

                      {/* Food Photos */}
                      <details className="border border-green-200 rounded-lg">
                        <summary className="cursor-pointer p-4 hover:bg-green-50 font-medium flex items-center justify-between">
                          <span>🍽️ Food Photos ({Object.keys(foodPhotos || {}).length} photos)</span>
                          <span className="text-gray-400">▼</span>
                        </summary>
                        <div className="p-4 bg-gray-50 max-h-96 overflow-auto">
                          {Object.keys(foodPhotos || {}).length === 0 ? (
                            <p className="text-gray-500 text-sm">No food photos</p>
                          ) : (
                            <div className="space-y-2">
                              {Object.entries(foodPhotos).map(([photoKey, photoData]) => (
                                <div key={photoKey} className="flex items-center justify-between p-3 bg-white rounded border">
                                  <div className="flex-1">
                                    <div className="font-medium">{photoKey}</div>
                                    <div className="text-sm text-gray-500">{photoData ? 'Has image' : 'No image'}</div>
                                  </div>
                                  <button
                                    onClick={async () => {
                                      if (!confirm(`Delete food photo "${photoKey}"?`)) return;
                                      const newPhotos = { ...foodPhotos };
                                      delete newPhotos[photoKey];
                                      setFoodPhotos(newPhotos);
                                      await storage.set('camp_food_photos', 'main', newPhotos);
                                      addToHistory('Food Photo Deleted', `Deleted ${photoKey}`);
                                      showToast('Photo deleted');
                                    }}
                                    className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                                  >
                                    Delete
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </details>

                      {/* Site Photos */}
                      <details className="border border-green-200 rounded-lg">
                        <summary className="cursor-pointer p-4 hover:bg-green-50 font-medium flex items-center justify-between">
                          <span>📸 Site Photos ({Object.keys(sitePhotos || {}).length} photos)</span>
                          <span className="text-gray-400">▼</span>
                        </summary>
                        <div className="p-4 bg-gray-50 max-h-96 overflow-auto">
                          {Object.keys(sitePhotos || {}).length === 0 ? (
                            <p className="text-gray-500 text-sm">No site photos</p>
                          ) : (
                            <div className="space-y-2">
                              {Object.entries(sitePhotos).map(([photoKey, photoData]) => (
                                <div key={photoKey} className="flex items-center justify-between p-3 bg-white rounded border">
                                  <div className="flex-1">
                                    <div className="font-medium">{photoKey}</div>
                                    <div className="text-sm text-gray-500">{photoData ? 'Has image' : 'No image'}</div>
                                  </div>
                                  <button
                                    onClick={async () => {
                                      if (!confirm(`Delete site photo "${photoKey}"?`)) return;
                                      const newPhotos = { ...sitePhotos };
                                      delete newPhotos[photoKey];
                                      setSitePhotos(newPhotos);
                                      await storage.set('camp_site_photos', 'main', newPhotos);
                                      addToHistory('Site Photo Deleted', `Deleted ${photoKey}`);
                                      showToast('Photo deleted');
                                    }}
                                    className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                                  >
                                    Delete
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </details>

                      {/* Change History */}
                      <details className="border border-green-200 rounded-lg">
                        <summary className="cursor-pointer p-4 hover:bg-green-50 font-medium flex items-center justify-between">
                          <span>📜 Change History ({(changeHistory || []).length} entries)</span>
                          <span className="text-gray-400">▼</span>
                        </summary>
                        <div className="p-4 bg-gray-50 max-h-96 overflow-auto">
                          {(changeHistory || []).length === 0 ? (
                            <p className="text-gray-500 text-sm">No history entries</p>
                          ) : (
                            <>
                              <button
                                onClick={async () => {
                                  if (!confirm(`Delete ALL ${changeHistory.length} history entries? This cannot be undone.`)) return;
                                  setChangeHistory([]);
                                  await storage.set('camp_change_history', 'main', []);
                                  showToast('All history deleted');
                                }}
                                className="w-full mb-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 font-medium"
                              >
                                Delete All History ({changeHistory.length} entries)
                              </button>
                              <div className="space-y-2">
                                {(changeHistory || []).slice(-20).reverse().map(entry => (
                                <div key={entry.id} className="flex items-center justify-between p-3 bg-white rounded border">
                                  <div className="flex-1">
                                    <div className="font-medium">{entry.action}</div>
                                    <div className="text-sm text-gray-500">{entry.details} • {new Date(entry.timestamp).toLocaleString()}</div>
                                  </div>
                                  <button
                                    onClick={async () => {
                                      if (!confirm(`Delete history entry "${entry.action}"?`)) return;
                                      const newHistory = changeHistory.filter(h => h.id !== entry.id);
                                      setChangeHistory(newHistory);
                                      await storage.set('camp_change_history', 'main', newHistory);
                                      showToast('History entry deleted');
                                    }}
                                    className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                                  >
                                    Delete
                                  </button>
                                </div>
                              ))}
                              </div>
                            </>
                          )}
                        </div>
                      </details>
                    </div>
                  </div>

                </div>
              )}
            </div>

            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editCounselor?.id ? 'Edit Counselor Profile' : 'Add Counselor'}>
              {editCounselor && (
                <CounselorEditForm
                  counselor={editCounselor}
                  onSave={(form) => {
                    const isNew = !editCounselor.id;
                    const updated = isNew
                      ? [...counselors, { ...form, id: 'c_' + Date.now(), order: counselors.length }]
                      : counselors.map(c => c.id === editCounselor.id ? { ...form, id: editCounselor.id } : c);
                    const action = isNew ? `Added counselor ${form.name}` : `Updated ${form.name}`;
                    saveCounselors(updated, action);
                    setShowModal(false);
                  }}
                  onCancel={() => setShowModal(false)}
                  onDelete={(c) => { setShowModal(false); setConfirmDeleteCounselor(c); }}
                />
              )}
            </Modal>

            {/* Delete Counselor Confirmation Modal */}
            {confirmDeleteCounselor && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl max-w-md w-full p-6 text-center" onClick={e => e.stopPropagation()}>
                  <div className="text-5xl mb-4">⚠️</div>
                  <h3 className="font-bold text-xl text-red-600 mb-2">Delete Counselor</h3>
                  <p className="text-gray-600 mb-4">
                    Are you sure you want to delete <strong>{confirmDeleteCounselor.name}</strong>?
                    <br />This will also remove them from all session assignments.
                  </p>
                  <p className="text-sm text-gray-500 mb-2">Type DELETE to confirm:</p>
                  <input
                    value={deleteConfirmText}
                    onChange={e => setDeleteConfirmText(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-center font-mono mb-4"
                    placeholder="DELETE"
                    autoComplete="off"
                    data-1p-ignore="true"
                  />
                  <div className="flex gap-3">
                    <button onClick={() => { setConfirmDeleteCounselor(null); setDeleteConfirmText(''); }} className="flex-1 px-4 py-2 border rounded-lg">Cancel</button>
                    <button
                      onClick={async () => {
                        if (deleteConfirmText !== 'DELETE') {
                          showToast('Please type DELETE to confirm', 'error');
                          return;
                        }
                        await deleteCounselor(confirmDeleteCounselor.id, confirmDeleteCounselor.name);
                        setConfirmDeleteCounselor(null);
                        setDeleteConfirmText('');
                      }}
                      disabled={deleteConfirmText !== 'DELETE'}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300"
                    >
                      Delete Counselor
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      };

    // ==================== ADD CHILD FORM ====================
    const AddChildForm = ({ onAdd, onCancel }) => {
      const [name, setName] = useState('');
      const [birthdate, setBirthdate] = useState('');
      const [grade, setGrade] = useState('');
      const [phone, setPhone] = useState('');
      const [photo, setPhoto] = useState(null);
      const [showCrop, setShowCrop] = useState(false);
      const [tempImg, setTempImg] = useState(null);
      const inputRef = useRef(null);

      const age = calculateAge(birthdate);

      const handleFile = (e) => {
        const file = e.target.files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
            setTempImg(reader.result);
            setShowCrop(true);
          };
          reader.readAsDataURL(file);
        }
        if (e.target) e.target.value = '';
      };

      const handleSubmit = () => {
        if (!name || !birthdate || !grade) return;
        onAdd({ name, birthdate, grade, phone, photo });
        setName(''); setBirthdate(''); setGrade(''); setPhone(''); setPhoto(null);
      };

      if (showCrop && tempImg) {
        return (
          <ImageCropper
            image={tempImg}
            onSave={(img) => { setPhoto(img); setShowCrop(false); }}
            onCancel={() => { setShowCrop(false); setTempImg(null); }}
          />
        );
      }

      return (
        <div className="border-t pt-4 space-y-4">
          <h4 className="font-medium text-lg">Add Child Profile</h4>
          <p className="text-sm text-gray-500 -mt-2">Create a profile for your child. You'll register them for camp sessions separately.</p>

          {/* Photo Upload with Face Silhouette Placeholder */}
          <div className="flex justify-center">
            {getDisplayPhoto(photo) ? (
              <div className="relative">
                <img src={getDisplayPhoto(photo)} className="w-24 h-24 rounded-full object-cover border-2 border-green-600" />
                <button onClick={() => inputRef.current?.click()}
                  className="absolute -bottom-1 -right-1 w-8 h-8 bg-green-600 rounded-full text-white flex items-center justify-center text-sm">✎</button>
                <button onClick={() => setPhoto(null)}
                  className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full text-white text-xs flex items-center justify-center">×</button>
              </div>
            ) : (
              <div
                onClick={() => inputRef.current?.click()}
                className="w-24 h-24 rounded-full bg-gray-200 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-300"
              >
                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                <span className="text-[8px] text-gray-500 font-medium">add photo</span>
              </div>
            )}
            <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
          </div>
          <p className="text-xs text-gray-500 text-center">Photo helps us recognize your child at camp</p>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Child's Name *</label>
            <input value={name} onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg" placeholder="Full name"
              autoComplete="off" data-1p-ignore="true" data-lpignore="true" data-form-type="other" />
          </div>

          {/* Birthdate & Calculated Age */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Birthdate *</label>
              <input type="date" value={birthdate} onChange={e => setBirthdate(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
                min={new Date(new Date().getFullYear() - 25, 0, 1).toISOString().split('T')[0]}
                max={new Date(new Date().getFullYear() - 14, 11, 31).toISOString().split('T')[0]}
                data-1p-ignore="true" data-lpignore="true" data-form-type="other" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
              <div className="w-full px-3 py-2 border rounded-lg bg-gray-50 text-gray-700">
                {age !== null ? `${age} years old` : 'Select birthdate'}
              </div>
            </div>
          </div>

          {/* Grade */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Grade (Fall 2026) *</label>
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
              Child's Phone <span className="text-gray-400">(optional)</span>
            </label>
            <input value={phone} onChange={e => setPhone(formatPhone(e.target.value))}
              className="w-full px-3 py-2 border rounded-lg" placeholder="(555) 555-1234"
              autoComplete="off" data-1p-ignore="true" data-lpignore="true" data-form-type="other" />
            <p className="text-xs text-gray-500 mt-1">If your child has a phone for emergencies</p>
          </div>

          {/* Buttons */}
          <div className="flex gap-4 pt-4">
            {onCancel && <button onClick={onCancel} className="flex-1 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">Cancel</button>}
            <button onClick={handleSubmit} disabled={!name || !birthdate || !grade}
              className="flex-1 py-2 bg-green-600 text-white rounded-lg disabled:bg-gray-300 hover:bg-green-700 disabled:hover:bg-gray-300">
              Add Child
            </button>
          </div>
        </div>
      );
    };

    // ==================== CHILD CARD ====================
    const ChildCard = ({ child, onUpdate, onDelete }) => {
      const inputRef = useRef(null);
      const [tempImg, setTempImg] = useState(null);
      const [showCrop, setShowCrop] = useState(false);
      const [isEditing, setIsEditing] = useState(false);
      const [editForm, setEditForm] = useState({ ...child });
      const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
      const age = calculateAge(child.birthdate);

      const handleFile = (e) => {
        const file = e.target.files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onloadend = () => { setTempImg(reader.result); setShowCrop(true); };
          reader.readAsDataURL(file);
        }
        if (e.target) e.target.value = '';
      };

      const handleSaveEdit = () => {
        if (!editForm.name || !editForm.birthdate || !editForm.grade) return;
        onUpdate({ ...child, ...editForm });
        setIsEditing(false);
      };

      const handleCancelEdit = () => {
        setEditForm({ ...child });
        setIsEditing(false);
      };

      if (showCrop && tempImg) {
        return (
          <div className="border rounded-lg p-4">
            <ImageCropper
              image={tempImg}
              onSave={(img) => {
                if (isEditing) {
                  setEditForm({ ...editForm, photo: img });
                } else {
                  onUpdate({ ...child, photo: img });
                }
                setShowCrop(false);
              }}
              onCancel={() => { setShowCrop(false); setTempImg(null); }}
            />
          </div>
        );
      }

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
            <h4 className="font-bold text-blue-800 mb-4">✏️ Edit Child Details</h4>

            {/* Photo */}
            <div className="flex justify-center mb-4">
              {getDisplayPhoto(editForm.photo) ? (
                <div className="relative">
                  <img src={getDisplayPhoto(editForm.photo)} className="w-20 h-20 rounded-full object-cover border-2 border-blue-400" />
                  <button onClick={() => inputRef.current?.click()}
                    className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-600 rounded-full text-white text-xs flex items-center justify-center">✎</button>
                  <button onClick={() => setEditForm({ ...editForm, photo: null })}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-white text-xs flex items-center justify-center">×</button>
                </div>
              ) : (
                <div onClick={() => inputRef.current?.click()}
                  className="w-20 h-20 rounded-full bg-gray-200 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-300">
                  <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                  <span className="text-[8px] text-gray-500 font-medium">add photo</span>
                </div>
              )}
              <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
            </div>

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
                <label className="block text-sm font-medium text-gray-700 mb-1">Grade (Fall 2026) *</label>
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

              {/* Buttons */}
              <div className="flex gap-3 pt-2">
                <button onClick={handleCancelEdit} className="flex-1 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={!editForm.name || !editForm.birthdate || !editForm.grade}
                  className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        );
      }

      // Normal display mode
      return (
        <div className="border rounded-lg p-4 flex items-start gap-4">
          {/* Photo with edit button or face placeholder */}
          <div className="flex-shrink-0">
            {getDisplayPhoto(child.photo) ? (
              <div className="relative">
                <img src={getDisplayPhoto(child.photo)} className="w-20 h-20 rounded-full object-cover border-2 border-green-600" />
                <button onClick={() => inputRef.current?.click()}
                  className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-600 rounded-full text-white text-xs flex items-center justify-center">✎</button>
              </div>
            ) : (
              <div onClick={() => inputRef.current?.click()}
                className="w-20 h-20 rounded-full bg-gray-200 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-300">
                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                <span className="text-[8px] text-gray-500 font-medium">add photo</span>
              </div>
            )}
            <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
          </div>

          {/* Info */}
          <div className="flex-1">
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
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-2">
            <button
              onClick={() => { setEditForm({ ...child }); setIsEditing(true); }}
              className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 text-sm"
            >
              ✏️ Edit
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 text-sm"
            >
              🗑️ Delete
            </button>
          </div>
        </div>
      );
    };

    // ==================== CHILDREN MANAGER (Parent Dashboard) ====================
    const ChildrenManager = ({ children, onUpdate, onDelete, onAdd, registrations }) => {
      const [showAddForm, setShowAddForm] = useState(false);

      // Check if child has any registrations (is a camper)
      const isCamper = (childId) => registrations?.some(r => r.childId === childId);

      return (
        <div className="space-y-4">
          {children.map(child => (
            <div key={child.id} className="relative">
              <ChildCard
                child={child}
                onUpdate={onUpdate}
                onDelete={onDelete}
              />
              {isCamper(child.id) && (
                <div className="absolute top-2 right-2">
                  <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                    🏕️ Registered Camper
                  </span>
                </div>
              )}
            </div>
          ))}

          {showAddForm ? (
            <div className="border-t pt-4 mt-4">
              <AddChildForm
                onAdd={(child) => {
                  onAdd(child);
                  setShowAddForm(false);
                }}
                onCancel={() => setShowAddForm(false)}
              />
            </div>
          ) : (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full py-4 border-2 border-dashed border-green-300 rounded-xl text-green-600 hover:bg-green-50 hover:border-green-400 transition-colors flex items-center justify-center gap-2 font-medium"
            >
              <span className="text-xl">+</span>
              <span>Add Another Child</span>
            </button>
          )}
        </div>
      );
    };

    // ==================== PARENT EMERGENCY CONTACTS MANAGER ====================
    const ParentEmergencyContactsManager = ({ parentEmail, emergencyContacts, onSave, showToast }) => {
      const [localContacts, setLocalContacts] = useState([]);
      const [editingId, setEditingId] = useState(null);
      const [showAddForm, setShowAddForm] = useState(false);
      const [editForm, setEditForm] = useState({ name: '', relationship: '', phone: '', email: '', priority: 'normal' });
      const [hasChanges, setHasChanges] = useState(false);

      // Initialize local contacts from props
      useEffect(() => {
        const myContacts = emergencyContacts.filter(c => c.userEmail === parentEmail);
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
          priority: contact.priority || 'normal'
        });
      };

      const handleSaveEdit = () => {
        if (!editForm.name || !editForm.relationship || !editForm.phone) {
          showToast('Please fill in all required fields', 'error');
          return;
        }
        const updatedContacts = localContacts.map(c =>
          c.id === editingId ? { ...c, ...editForm } : c
        );
        setLocalContacts(updatedContacts);
        setEditingId(null);
        setEditForm({ name: '', relationship: '', phone: '', email: '', priority: 'normal' });
        setHasChanges(true);
      };

      const handleDelete = (id) => {
        if (!confirm('Delete this emergency contact?')) return;
        setLocalContacts(localContacts.filter(c => c.id !== id));
        setHasChanges(true);
      };

      const handleAdd = () => {
        if (!editForm.name || !editForm.relationship || !editForm.phone) {
          showToast('Please fill in all required fields', 'error');
          return;
        }
        const newContact = {
          id: `ec_${Date.now()}`,
          userEmail: parentEmail,
          ...editForm
        };
        setLocalContacts([...localContacts, newContact]);
        setShowAddForm(false);
        setEditForm({ name: '', relationship: '', phone: '', email: '', priority: 'normal' });
        setHasChanges(true);
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
        const myContacts = emergencyContacts.filter(c => c.userEmail === parentEmail);
        setLocalContacts(myContacts);
        setHasChanges(false);
        setEditingId(null);
        setShowAddForm(false);
      };

      const requirementsMet = meetsRequirements();

      return (
        <div className="space-y-4">
          {/* Contact List */}
          {localContacts.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No emergency contacts yet. Add at least 2 contacts.</p>
          ) : (
            <div className="space-y-2">
              {localContacts.map(contact => (
                <div key={contact.id} className="border rounded-lg p-4">
                  {editingId === contact.id ? (
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
                        <input
                          value={editForm.relationship}
                          onChange={e => setEditForm({ ...editForm, relationship: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg"
                          placeholder="e.g., Grandparent, Neighbor, Friend"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                        <input
                          value={editForm.phone}
                          onChange={e => setEditForm({ ...editForm, phone: formatPhone(e.target.value) })}
                          className="w-full px-3 py-2 border rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input
                          value={editForm.email}
                          onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleSaveEdit}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditingId(null);
                            setEditForm({ name: '', relationship: '', phone: '', email: '', priority: 'normal' });
                          }}
                          className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium">{contact.name}</div>
                        <div className="text-sm text-gray-600">{contact.relationship}</div>
                        <div className="text-sm text-gray-600">{contact.phone}</div>
                        {contact.email && <div className="text-sm text-gray-600">{contact.email}</div>}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(contact)}
                          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(contact.id)}
                          className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Add New Contact Form */}
          {showAddForm ? (
            <div className="border-2 border-green-300 rounded-lg p-4 space-y-3 bg-green-50">
              <h4 className="font-medium">Add Emergency Contact</h4>
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
                <input
                  value={editForm.relationship}
                  onChange={e => setEditForm({ ...editForm, relationship: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="e.g., Grandparent, Neighbor, Friend"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                <input
                  value={editForm.phone}
                  onChange={e => setEditForm({ ...editForm, phone: formatPhone(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  value={editForm.email}
                  onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAdd}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Add Contact
                </button>
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    setEditForm({ name: '', relationship: '', phone: '', email: '', priority: 'normal' });
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full py-3 border-2 border-dashed border-green-300 rounded-lg text-green-600 hover:bg-green-50 hover:border-green-400"
            >
              + Add Emergency Contact
            </button>
          )}

          {/* Save/Cancel Changes */}
          {hasChanges && (
            <div className="flex gap-2 pt-4 border-t">
              <button
                onClick={handleSaveChanges}
                disabled={!requirementsMet}
                className="flex-1 px-4 py-3 bg-green-700 text-white rounded-lg hover:bg-green-800 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
              >
                {requirementsMet ? 'Save Changes' : 'Cannot Save - Requirements Not Met'}
              </button>
              <button
                onClick={handleCancel}
                className="px-4 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      );
    };

    // ==================== REGISTRATION CALENDAR VIEW ====================
    const RegistrationCalendarView = ({ myChildren, registrations }) => {
      const [selectedChild, setSelectedChild] = useState(myChildren[0]?.id || 'all');

      // Get all registration dates for selected child or all children
      const getRegistrationsForDisplay = () => {
        if (selectedChild === 'all') {
          return registrations;
        }
        return registrations.filter(r => r.childId === selectedChild);
      };

      const displayRegs = getRegistrationsForDisplay();

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
        return displayRegs.filter(r => r.date === dateStr);
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
            <h3 className="font-bold text-xl mb-2">📅 Registration Calendar</h3>
            <p className="text-sm text-gray-500 mb-4">View registration status across July and August</p>

            {/* Child Selector */}
            <div className="flex gap-2 flex-wrap mb-4">
              <button
                onClick={() => setSelectedChild('all')}
                className={`px-4 py-2 rounded-lg font-medium ${
                  selectedChild === 'all'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All Campers
              </button>
              {myChildren.map(child => (
                <button
                  key={child.id}
                  onClick={() => setSelectedChild(child.id)}
                  className={`px-4 py-2 rounded-lg font-medium ${
                    selectedChild === child.id
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {child.name}
                </button>
              ))}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 text-sm mb-4 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded"></div>
                <span>Approved</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                <span>Pending</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-500 rounded"></div>
                <span>Rejected</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-gray-100 border border-gray-300 rounded"></div>
                <span>Not Registered</span>
              </div>
            </div>
          </div>

          {/* Calendar Grid */}
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
                      const regs = getRegistrationForDate(year, month, day);
                      const hasRegistrations = regs.length > 0;

                      return (
                        <div
                          key={day}
                          className={`aspect-square flex flex-col items-center justify-center text-xs rounded relative group cursor-pointer ${
                            hasRegistrations
                              ? regs.some(r => r.status === 'approved')
                                ? 'bg-green-100 border-2 border-green-500 font-bold'
                                : regs.some(r => r.status === 'pending')
                                ? 'bg-yellow-100 border-2 border-yellow-500 font-bold'
                                : 'bg-red-100 border-2 border-red-500 font-bold'
                              : 'bg-gray-50 border border-gray-200'
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
                                      <div className="font-bold">{reg.childName || myChildren.find(c => c.id === reg.childId)?.name}</div>
                                      <div>{reg.sessions?.map(s => s === 'morning' ? 'AM' : 'PM').join(' + ')}</div>
                                      <div className={`text-xs ${
                                        reg.status === 'approved' ? 'text-green-300' :
                                        reg.status === 'pending' ? 'text-yellow-300' :
                                        'text-red-300'
                                      }`}>
                                        {getStatusText(reg.status)}
                                      </div>
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
        </div>
      );
    };

    // ==================== CAMPER SCHEDULE TAB (Visual Schedule for Parents) ====================
    const CamperScheduleTab = ({ myChildren, registrations, allRegistrations, assignments, counselors, campers, users }) => {
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
              // Try to find in campers first, then in users' children
              const camper = campers.find(c => c.id === camperId);
              if (camper) return camper;

              for (const user of users) {
                const child = user.children?.find(c => c.id === camperId);
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

          for (const user of users) {
            const child = user.children?.find(c => c.id === r.childId);
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
            <p className="text-gray-500">Add campers in the "My Campers" tab, then register them for camp.</p>
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
                <img src={getDisplayPhoto(selectedChildData.photo)} className="w-20 h-20 rounded-full object-cover border-4 border-white/30" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gray-200 flex flex-col items-center justify-center">
                  <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                  <span className="text-[8px] text-gray-500 font-medium">add photo</span>
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
                      const isPending = reg?.status === 'pending';

                      return (
                        <div key={session} className={`border rounded-xl p-4 ${isPending ? 'border-yellow-300 bg-yellow-50' : 'border-green-200 bg-green-50'}`}>
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
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                              isPending
                                ? 'bg-yellow-200 text-yellow-800'
                                : 'bg-green-200 text-green-800'
                            }`}>
                              {isPending ? '⏳ Pending Approval' : '✓ Approved'}
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
                                    <div className="w-16 h-16 rounded-full bg-gray-200 flex flex-col items-center justify-center">
                                      <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                                      <span className="text-[8px] text-gray-500 font-medium">add photo</span>
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
                                            <div className="w-8 h-8 rounded-full bg-gray-200 flex flex-col items-center justify-center">
                                              <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                                              <span className="text-[5px] text-gray-500 font-medium">add photo</span>
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

    // ==================== CAMPER SCHEDULE TAB (Visual Schedule for Parents) ====================

      // ==================== AUTH CHECK & ROUTER (ADMIN) ====================
      // Check authentication on load
      useEffect(() => {
        const userJson = sessionStorage.getItem('user');
        if (!userJson) {
          window.location.href = '/index.html';
          return;
        }
        const sessionUser = JSON.parse(userJson);
        if (sessionUser.role !== 'admin') {
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
          {Nav()}
          {toast && <Toast message={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
          {Admin()}
        </div>
      );
    }
