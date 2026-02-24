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

// ==================== ASSIGNMENTS TAB ====================
export const AssignmentsTab = ({ registrations, counselors, users, assignments, availability, onSaveAssignments, showToast, selectedMonth, setSelectedMonth, campers: allCampers, selectedDate, setSelectedDate, selectedSession, setSelectedSession, sessionPods, setSessionPods, podCalWeeks, setPodCalWeeks, podCalDates, setPodCalDates, podCamperView, setPodCamperView, podSelectedCamper, setPodSelectedCamper, counselorSchedule }) => {
  const [draggedItem, setDraggedItem] = useState(null); // { type: 'camper' | 'counselor', data: ... }
  const [dragOverTarget, setDragOverTarget] = useState(null); // { podId, type: 'camper' | 'counselor' }

  // Get months that have camp dates
  const getMonths = () => {
    const months = [];
    CAMP_DATES.forEach(date => {
      const d = new Date(date + 'T12:00:00');
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!months.some(m => m.key === monthKey)) {
        months.push({
          key: monthKey,
          name: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
          year: d.getFullYear(),
          month: d.getMonth()
        });
      }
    });
    return months;
  };

  const months = getMonths();

  // Initialize selected month if not set
  React.useEffect(() => {
    if (!selectedMonth && months.length > 0) {
      setSelectedMonth(months[0].key);
    }
  }, [selectedMonth, months, setSelectedMonth]);

  // Auto-initialize week filter when month changes
  // All dates for selected month (unfiltered)
  const allPodMonthDates = React.useMemo(() => {
    if (!selectedMonth) return [];
    const [year, month] = selectedMonth.split('-').map(Number);
    return CAMP_DATES.filter(date => {
      const d = new Date(date + 'T12:00:00');
      return d.getFullYear() === year && d.getMonth() === month - 1;
    });
  }, [selectedMonth]);

  const podAvailableWeeks = React.useMemo(() => {
    if (!selectedMonth) return [];
    const [year, month] = selectedMonth.split('-').map(Number);
    return CAMP_WEEKS.filter(w => {
      const d = new Date(w.start + 'T12:00:00');
      return d.getFullYear() === year && d.getMonth() === month - 1;
    });
  }, [selectedMonth]);
  const podAvailableWeekStarts = podAvailableWeeks.map(w => w.start);
  // Re-init when month changes (reset to all selected for the new month)
  const prevMonthRef = React.useRef(selectedMonth);
  React.useEffect(() => {
    if (selectedMonth !== prevMonthRef.current || podCalWeeks === null) {
      prevMonthRef.current = selectedMonth;
      if (podAvailableWeekStarts.length > 0) setPodCalWeeks([...podAvailableWeekStarts]);
      if (allPodMonthDates.length > 0) setPodCalDates([...allPodMonthDates]);
    }
  }, [selectedMonth]);

  const safePodWeeks = podCalWeeks || [];
  const safePodDates = podCalDates || [];

  // Dates filtered by week selection (for date pill display)
  const podWeekFilteredDates = allPodMonthDates.filter(d => {
    const week = CAMP_WEEKS.find(w => w.dates.includes(d));
    return !week || safePodWeeks.length === 0 || safePodWeeks.includes(week.start);
  });

  // Final filtered dates
  const monthDates = podWeekFilteredDates.filter(d => safePodDates.includes(d));

  // Get session key
  const getSessionKey = () => selectedDate ? `${selectedDate}_${selectedSession}` : '';

  // Get or initialize pods for current session
  const getCurrentPods = () => {
    const key = getSessionKey();
    if (!key) return [];

    // If we have pods stored in state, use them
    if (sessionPods[key] && Array.isArray(sessionPods[key]) && sessionPods[key].length > 0) {
      return sessionPods[key];
    }

    // Otherwise, initialize from existing assignments
    const existingAssignments = assignments[key] || {};
    const pods = Object.entries(existingAssignments).map(([counselorId, camperIds]) => ({
      id: 'pod_' + counselorId,
      counselorId,
      camperIds: camperIds || []
    }));

    // If no existing assignments, start with one empty pod
    if (pods.length === 0) {
      pods.push({ id: 'pod_empty_1', counselorId: null, camperIds: [] });
    }

    // Store initialized pods so subsequent calls return the same data
    setSessionPods(prev => ({ ...prev, [key]: pods }));
    return pods;
  };

  // Save pods and sync to assignments
  const savePods = (newPods) => {
    const key = getSessionKey();
    if (!key) return;

    // Normalize pod IDs: pods with counselors should have ID based on counselorId
    const normalizedPods = newPods.map(pod => {
      if (pod.counselorId && !pod.id.startsWith('pod_' + pod.counselorId)) {
        // Update pod ID to be consistent with counselor ID
        return { ...pod, id: 'pod_' + pod.counselorId };
      }
      return pod;
    });

    setSessionPods(prev => ({ ...prev, [key]: normalizedPods }));

    // Sync to assignments format
    const newAssignments = { ...assignments };
    newAssignments[key] = {};
    normalizedPods.forEach(pod => {
      // Save any pod that has a counselor assigned (even if no campers yet)
      if (pod.counselorId) {
        newAssignments[key][pod.counselorId] = pod.camperIds || [];
      }
    });
    onSaveAssignments(newAssignments, 'Updated pod assignments');
  };

  // Add new empty pod
  const addPod = () => {
    const pods = getCurrentPods();
    const newPod = { id: 'pod_empty_' + Date.now(), counselorId: null, camperIds: [] };
    savePods([...pods, newPod]);
    showToast('New pod added');
  };

  // Remove pod (counselors and campers are automatically returned to unassigned sections)
  const removePod = (podId) => {
    const pods = getCurrentPods();
    const pod = pods.find(p => p.id === podId);

    // Don't allow removing the last pod
    if (pods.length === 1) {
      showToast('Cannot remove the last pod', 'error');
      return;
    }

    // Remove the pod (counselor and campers will automatically appear as unassigned)
    savePods(pods.filter(p => p.id !== podId));

    if (pod?.counselorId || pod?.camperIds?.length > 0) {
      showToast('Pod removed - counselor and campers returned to unassigned');
    } else {
      showToast('Pod removed');
    }
  };

  // Get approved registrations for the selected date/session
  const getSessionRegs = () => {
    if (!selectedDate) return [];
    return registrations.filter(r =>
      r.date === selectedDate &&
      r.sessions?.includes(selectedSession) &&
      r.status === 'approved'
    );
  };

  // Get all assigned camper IDs across all pods
  const getAssignedCamperIds = () => {
    const pods = getCurrentPods();
    return pods.flatMap(p => p.camperIds);
  };

  // Get all assigned counselor IDs across all pods
  const getAssignedCounselorIds = () => {
    const pods = getCurrentPods();
    return pods.map(p => p.counselorId).filter(Boolean);
  };

  // Get unassigned campers
  const getUnassignedCampers = () => {
    const assigned = getAssignedCamperIds();
    return getSessionRegs().filter(r => !assigned.includes(r.childId) && !assigned.includes(r.camperId));
  };

  // Check if counselor is eligible (marked available for this date/session)
  const isCounselorEligible = (counselor) => {
    if (!selectedDate) return false;
    const counselorAvail = availability[counselor.email];
    if (!counselorAvail) return false;
    const dateAvail = counselorAvail[selectedDate];
    if (!dateAvail) return false;
    // Check both new format and legacy format
    return dateAvail.available?.includes(selectedSession) ||
           (Array.isArray(dateAvail) && dateAvail.includes(selectedSession));
  };

  // Get eligible counselors (marked available for this session, not yet assigned to a pod)
  const getEligibleCounselors = () => {
    const assigned = getAssignedCounselorIds();
    return counselors.filter(c => c.visible && !assigned.includes(c.id) && isCounselorEligible(c));
  };

  // Get not-eligible counselors (NOT marked available for this session, not yet assigned to a pod)
  const getNotEligibleCounselors = () => {
    const assigned = getAssignedCounselorIds();
    return counselors.filter(c => c.visible && !assigned.includes(c.id) && !isCounselorEligible(c));
  };

  // Get all unassigned counselors (for backward compatibility)
  const getUnassignedCounselors = () => {
    const assigned = getAssignedCounselorIds();
    return counselors.filter(c => c.visible && !assigned.includes(c.id));
  };

  // Calculate summary stats
  const getSummary = () => {
    const regs = getSessionRegs();
    const pods = getCurrentPods();
    const assignedCampers = getAssignedCamperIds().length;
    const podsWithCounselors = pods.filter(p => p.counselorId).length;
    const totalCapacity = podsWithCounselors * KIDS_PER_COUNSELOR;

    return {
      totalCampers: regs.length,
      assignedCount: assignedCampers,
      unassignedCount: regs.length - assignedCampers,
      podCount: pods.length,
      podsWithCounselors,
      totalCapacity,
      overCapacity: regs.length > totalCapacity && totalCapacity > 0
    };
  };

  // Handle drag start for campers
  const handleCamperDragStart = (e, camper) => {
    setDraggedItem({ type: 'camper', data: camper });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', ''); // Required for Firefox
  };

  // Handle drag start for counselors
  const handleCounselorDragStart = (e, counselor) => {
    setDraggedItem({ type: 'counselor', data: counselor });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', ''); // Required for Firefox
  };

  // Handle drag end (cleanup)
  const handleDragEnd = () => {
    setDragOverTarget(null);
  };

  // Click-to-select (works on touch devices where drag doesn't work)
  const handleItemClick = (type, data) => {
    if (draggedItem && draggedItem.type === type && draggedItem.data.id === data.id) {
      // Clicking same item again deselects it
      setDraggedItem(null);
    } else {
      setDraggedItem({ type, data });
    }
  };

  // Click on pod slot to place selected item
  const handlePodCounselorClick = (podId) => {
    if (!draggedItem || draggedItem.type !== 'counselor') return;
    const pods = getCurrentPods();
    const counselor = draggedItem.data;
    const existingPod = pods.find(p => p.counselorId === counselor.id);
    if (existingPod && existingPod.id !== podId) {
      existingPod.counselorId = null;
    }
    const targetPod = pods.find(p => p.id === podId);
    if (targetPod) {
      targetPod.counselorId = counselor.id;
    }
    savePods([...pods]);
    setDraggedItem(null);
    showToast(counselor.name + ' assigned to pod');
  };

  const handlePodCamperClick = (podId) => {
    if (!draggedItem || draggedItem.type !== 'camper') return;
    const pods = getCurrentPods();
    const camper = draggedItem.data;
    const camperId = camper.childId || camper.camperId;
    const targetPod = pods.find(p => p.id === podId);
    if (!targetPod) return;
    if (targetPod.camperIds.length >= KIDS_PER_COUNSELOR && !targetPod.camperIds.includes(camperId)) {
      showToast('Pod is at capacity (' + KIDS_PER_COUNSELOR + ' campers max)', 'error');
      setDraggedItem(null);
      return;
    }
    pods.forEach(p => { p.camperIds = p.camperIds.filter(id => id !== camperId); });
    if (!targetPod.camperIds.includes(camperId)) {
      targetPod.camperIds.push(camperId);
    }
    savePods([...pods]);
    setDraggedItem(null);
    showToast('Camper assigned to pod');
  };

  // Handle drop on pod's counselor slot
  const handleDropCounselor = (e, podId) => {
    e.preventDefault();
    setDragOverTarget(null);
    if (!draggedItem || draggedItem.type !== 'counselor') return;

    const pods = getCurrentPods();
    const counselor = draggedItem.data;

    // Check if counselor is already assigned to another pod
    const existingPod = pods.find(p => p.counselorId === counselor.id);
    if (existingPod && existingPod.id !== podId) {
      existingPod.counselorId = null;
    }

    // Assign to new pod
    const targetPod = pods.find(p => p.id === podId);
    if (targetPod) {
      targetPod.counselorId = counselor.id;
    }

    savePods([...pods]);
    setDraggedItem(null);
    showToast(`${counselor.name} assigned to pod`);
  };

  // Handle drop on pod's camper area
  const handleDropCamper = (e, podId, slotIndex) => {
    e.preventDefault();
    setDragOverTarget(null);
    if (!draggedItem || draggedItem.type !== 'camper') return;

    const pods = getCurrentPods();
    const camper = draggedItem.data;
    const camperId = camper.childId || camper.camperId;

    const targetPod = pods.find(p => p.id === podId);
    if (!targetPod) return;

    // Check capacity
    if (targetPod.camperIds.length >= KIDS_PER_COUNSELOR && !targetPod.camperIds.includes(camperId)) {
      showToast(`Pod is at capacity (${KIDS_PER_COUNSELOR} campers max)`, 'error');
      setDraggedItem(null);
      return;
    }

    // Remove camper from any existing pod
    pods.forEach(p => {
      p.camperIds = p.camperIds.filter(id => id !== camperId);
    });

    // Add to target pod
    if (!targetPod.camperIds.includes(camperId)) {
      targetPod.camperIds.push(camperId);
    }

    savePods([...pods]);
    setDraggedItem(null);
    showToast('Camper assigned to pod');
  };

  // Remove a counselor from a pod (click-based, for touch devices)
  const removeCounselorFromPod = (podId) => {
    const pods = getCurrentPods();
    const pod = pods.find(p => p.id === podId);
    if (!pod || !pod.counselorId) return;
    const counselor = counselors.find(c => c.id === pod.counselorId);
    pod.counselorId = null;
    savePods([...pods]);
    showToast((counselor?.name || 'Counselor') + ' removed from pod');
  };

  // Remove a camper from a pod (click-based, for touch devices)
  const removeCamperFromPod = (podId, camperId) => {
    const pods = getCurrentPods();
    const pod = pods.find(p => p.id === podId);
    if (!pod) return;
    pod.camperIds = pod.camperIds.filter(id => id !== camperId);
    savePods([...pods]);
    showToast('Camper removed from pod');
  };

  // Handle drop on unassigned area (remove from pod)
  const handleDropUnassigned = (e) => {
    e.preventDefault();
    setDragOverTarget(null);
    if (!draggedItem) return;

    const pods = getCurrentPods();

    if (draggedItem.type === 'camper') {
      const camperId = draggedItem.data.childId || draggedItem.data.camperId;
      pods.forEach(p => {
        p.camperIds = p.camperIds.filter(id => id !== camperId);
      });
      savePods([...pods]);
      showToast('Camper removed from pod');
    } else if (draggedItem.type === 'counselor') {
      const counselorId = draggedItem.data.id;
      pods.forEach(p => {
        if (p.counselorId === counselorId) {
          p.counselorId = null;
        }
      });
      savePods([...pods]);
      showToast('Counselor removed from pod');
    }

    setDraggedItem(null);
  };

  // Get camper name from ID
  const getCamperName = (camperId) => {
    const reg = registrations.find(r => r.childId === camperId || r.camperId === camperId);
    return reg?.camperName || reg?.childName || 'Unknown';
  };

  // Get camper info for display
  const getCamperInfo = (camperId) => {
    const reg = registrations.find(r => r.childId === camperId || r.camperId === camperId);
    return reg;
  };

  // Get full camper profile (photo, grade, birthdate)
  const getCamperProfile = (camperId) => {
    return (allCampers || []).find(c => c.id === camperId);
  };

  // Get counselor by ID
  const getCounselor = (counselorId) => counselors.find(c => c.id === counselorId);

  const summary = getSummary();
  const formatDate = (dateStr) => {
    const d = new Date(dateStr + 'T12:00:00');
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}`;
  };

  // Helper to get stats for a date/session (campers, counselors, pods)
  const getDateSessionStats = (date, session) => {
    const regs = registrations.filter(r =>
      r.date === date &&
      r.sessions?.includes(session) &&
      r.status === 'approved'
    );
    const key = `${date}_${session}`;
    const sessionAssignments = assignments[key] || {};
    const assignedCampers = Object.values(sessionAssignments).flat().length;
    const assignedCounselors = Object.keys(sessionAssignments).filter(cId => sessionAssignments[cId]?.length > 0 || Object.keys(sessionAssignments).includes(cId)).length;
    const podCount = Object.keys(sessionAssignments).length;
    // Count eligible counselors for this date/session
    const eligibleCounselors = counselors.filter(c => {
      if (!c.visible) return false;
      const counselorAvail = availability[c.email];
      if (!counselorAvail) return false;
      const dateAvail = counselorAvail[date];
      if (!dateAvail) return false;
      return dateAvail.available?.includes(session) ||
             (Array.isArray(dateAvail) && dateAvail.includes(session));
    }).length;
    return { registered: regs.length, assigned: assignedCampers, assignedCounselors, eligibleCounselors, podCount };
  };

  const getDayName = (date) => {
    const d = new Date(date + 'T12:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'short' });
  };

  const formatDateShort = (date) => {
    const d = new Date(date + 'T12:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const pods = getCurrentPods();

  // === CAMPER VIEW HELPERS ===
  const getCampersWithApprovedRegs = () => {
    const camperMap = {};
    registrations.filter(r => r.status === 'approved').forEach(r => {
      const id = r.camperId || r.childId;
      const name = r.camperName || r.childName || 'Unknown';
      if (!camperMap[id]) camperMap[id] = { id, name, regs: [] };
      camperMap[id].regs.push(r);
    });
    return Object.values(camperMap).sort((a, b) => a.name.localeCompare(b.name));
  };

  const getCamperSessions = (camperId) => {
    const camperRegs = registrations.filter(r =>
      (r.camperId === camperId || r.childId === camperId) && r.status === 'approved'
    );
    const sessions = [];
    camperRegs.forEach(r => {
      (r.sessions || []).forEach(session => {
        const key = `${r.date}_${session}`;
        const sessionAssignments = assignments[key] || {};
        let assignedCounselorId = null;
        Object.entries(sessionAssignments).forEach(([cId, camperIds]) => {
          if ((camperIds || []).includes(camperId)) assignedCounselorId = cId;
        });
        const assignedCounselor = assignedCounselorId ? counselors.find(c => c.id === assignedCounselorId) : null;
        const eligible = counselors.filter(c => {
          const cs = counselorSchedule[c.id] || {};
          const daySchedule = cs[r.date] || {};
          return daySchedule[session] === true;
        });
        sessions.push({ date: r.date, session, key, assignedCounselorId, assignedCounselor, eligibleCounselors: eligible });
      });
    });
    return sessions.sort((a, b) => a.date.localeCompare(b.date) || a.session.localeCompare(b.session));
  };

  const handleCamperSessionAssign = (camperId, sessionInfo, newCounselorId) => {
    const key = sessionInfo.key;
    const newAssignments = JSON.parse(JSON.stringify(assignments));
    if (newAssignments[key]) {
      Object.keys(newAssignments[key]).forEach(cId => {
        newAssignments[key][cId] = (newAssignments[key][cId] || []).filter(id => id !== camperId);
        if (newAssignments[key][cId].length === 0) delete newAssignments[key][cId];
      });
    }
    if (newCounselorId) {
      if (!newAssignments[key]) newAssignments[key] = {};
      if (!newAssignments[key][newCounselorId]) newAssignments[key][newCounselorId] = [];
      newAssignments[key][newCounselorId].push(camperId);
    }
    onSaveAssignments(newAssignments, `Assigned camper for ${key}`);
    setSessionPods(prev => { const u = { ...prev }; delete u[key]; return u; });
  };

  const handleBulkAssign = (camperId) => {
    const sessions = getCamperSessions(camperId);
    const unassigned = sessions.filter(s => !s.assignedCounselorId);
    if (unassigned.length === 0) { showToast('All sessions already assigned'); return; }
    const newAssignments = JSON.parse(JSON.stringify(assignments));
    let assignedCount = 0;
    const affectedKeys = [];
    unassigned.forEach(s => {
      if (s.eligibleCounselors.length === 0) return;
      const withLoad = s.eligibleCounselors.map(c => ({
        counselor: c,
        load: ((newAssignments[s.key] || {})[c.id] || []).length
      }));
      withLoad.sort((a, b) => a.load - b.load);
      const best = withLoad.find(w => w.load < KIDS_PER_COUNSELOR);
      if (!best) return;
      if (!newAssignments[s.key]) newAssignments[s.key] = {};
      if (!newAssignments[s.key][best.counselor.id]) newAssignments[s.key][best.counselor.id] = [];
      newAssignments[s.key][best.counselor.id].push(camperId);
      affectedKeys.push(s.key);
      assignedCount++;
    });
    if (assignedCount > 0) {
      onSaveAssignments(newAssignments, `Bulk assigned camper to ${assignedCount} sessions`);
      setSessionPods(prev => { const u = { ...prev }; affectedKeys.forEach(k => delete u[k]); return u; });
      showToast(`Assigned ${assignedCount} session${assignedCount > 1 ? 's' : ''}`);
    } else {
      showToast('No eligible counselors for unassigned sessions');
    }
  };

  return (
    <div className="space-y-6">
      {/* View Mode Toggle */}
      <div className="flex gap-2">
        <button onClick={() => { setPodCamperView(false); setPodSelectedCamper(null); }}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${!podCamperView ? 'bg-green-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}>
          Date View
        </button>
        <button onClick={() => setPodCamperView(true)}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${podCamperView ? 'bg-purple-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}>
          Camper View
        </button>
      </div>

      {/* === CAMPER VIEW === */}
      {podCamperView && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Select a Camper:</label>
            <select value={podSelectedCamper || ''}
              onChange={e => setPodSelectedCamper(e.target.value || null)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
              <option value="">-- Choose a camper --</option>
              {getCampersWithApprovedRegs().map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.regs.length} session{c.regs.length !== 1 ? 's' : ''})</option>
              ))}
            </select>
          </div>

          {podSelectedCamper && (() => {
            const sessions = getCamperSessions(podSelectedCamper);
            const camperProfile = (allCampers || []).find(c => c.id === podSelectedCamper);
            const camperName = camperProfile?.name || getCampersWithApprovedRegs().find(c => c.id === podSelectedCamper)?.name || 'Unknown';
            const unassignedCount = sessions.filter(s => !s.assignedCounselorId).length;
            const assignedCount = sessions.filter(s => s.assignedCounselorId).length;

            return (
              <div className="bg-white rounded-xl shadow p-4 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h3 className="font-bold text-lg">{camperName}</h3>
                    <p className="text-sm text-gray-500">{sessions.length} total sessions — {assignedCount} assigned, {unassignedCount} unassigned</p>
                  </div>
                  {unassignedCount > 0 && (
                    <button onClick={() => handleBulkAssign(podSelectedCamper)}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium">
                      Assign All Unassigned ({unassignedCount})
                    </button>
                  )}
                </div>

                {sessions.length === 0 ? (
                  <p className="text-gray-500 text-sm">No approved sessions found for this camper.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-gray-50">
                          <th className="text-left py-2 px-3 font-medium text-gray-600">Date</th>
                          <th className="text-left py-2 px-3 font-medium text-gray-600">Day</th>
                          <th className="text-left py-2 px-3 font-medium text-gray-600">Session</th>
                          <th className="text-left py-2 px-3 font-medium text-gray-600">Status</th>
                          <th className="text-left py-2 px-3 font-medium text-gray-600">Assigned To</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sessions.map(s => {
                          const dt = new Date(s.date + 'T12:00:00');
                          const dayName = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][dt.getDay()];
                          const dateLabel = dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                          return (
                            <tr key={s.key} className="border-b hover:bg-gray-50">
                              <td className="py-2 px-3">{dateLabel}</td>
                              <td className="py-2 px-3">{dayName}</td>
                              <td className="py-2 px-3">{s.session === 'morning' ? '☀️ AM' : '🌙 PM'}</td>
                              <td className="py-2 px-3">
                                {s.assignedCounselor
                                  ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Assigned</span>
                                  : <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">Unassigned</span>}
                              </td>
                              <td className="py-2 px-3">
                                <select value={s.assignedCounselorId || ''}
                                  onChange={e => handleCamperSessionAssign(podSelectedCamper, s, e.target.value || null)}
                                  className="border border-gray-300 rounded px-2 py-1 text-sm w-full max-w-xs">
                                  <option value="">Unassigned</option>
                                  {s.eligibleCounselors.map(c => (
                                    <option key={c.id} value={c.id}>{c.name || c.firstName + ' ' + c.lastName}</option>
                                  ))}
                                  {s.assignedCounselor && !s.eligibleCounselors.find(c => c.id === s.assignedCounselorId) && (
                                    <option value={s.assignedCounselorId}>{s.assignedCounselor.name} (not eligible)</option>
                                  )}
                                </select>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* === DATE VIEW === */}
      {!podCamperView && <>
      {/* Month Selector */}
      <div className="bg-white rounded-xl shadow p-4">
        <div className="flex flex-wrap gap-2 mb-4">
          {months.map(m => (
            <button
              key={m.key}
              onClick={() => { setSelectedMonth(m.key); setSelectedDate(null); }}
              className={`px-4 py-2 rounded-lg text-sm ${
                selectedMonth === m.key
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              {m.name}
            </button>
          ))}
        </div>

        {/* Week / Date filters */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-gray-700 w-14">Weeks:</span>
            <button onClick={() => { setPodCalWeeks([...podAvailableWeekStarts]); setPodCalDates([...allPodMonthDates]); }} className={'px-2 py-0.5 rounded text-xs font-medium ' + (safePodWeeks.length === podAvailableWeekStarts.length ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>All</button>
            <button onClick={() => { setPodCalWeeks([]); setPodCalDates([]); }} className={'px-2 py-0.5 rounded text-xs font-medium ' + (safePodWeeks.length === 0 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>None</button>
            {podAvailableWeeks.map(w => {
              const wd = new Date(w.start + 'T12:00:00');
              const label = wd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              const isActive = safePodWeeks.includes(w.start);
              return (
                <button key={w.start} onClick={() => {
                  const newWeeks = isActive ? safePodWeeks.filter(x => x !== w.start) : [...safePodWeeks, w.start].sort();
                  setPodCalWeeks(newWeeks);
                  if (isActive) {
                    setPodCalDates(prev => (prev || []).filter(d => !w.dates.includes(d)));
                  } else {
                    setPodCalDates(prev => [...new Set([...(prev || []), ...w.dates])].sort());
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
            <button onClick={() => setPodCalDates([...podWeekFilteredDates])} className={'px-2 py-0.5 rounded text-xs font-medium ' + (safePodDates.length === podWeekFilteredDates.length ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>All</button>
            <button onClick={() => setPodCalDates([])} className={'px-2 py-0.5 rounded text-xs font-medium ' + (safePodDates.length === 0 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>None</button>
            {podWeekFilteredDates.map(d => {
              const dt = new Date(d + 'T12:00:00');
              const dayName = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][dt.getDay()];
              const label = `${dayName} ${dt.getMonth() + 1}/${dt.getDate()}`;
              const isActive = safePodDates.includes(d);
              return (
                <button key={d} onClick={() => setPodCalDates(prev => { const s = prev || []; return s.includes(d) ? s.filter(x => x !== d) : [...s, d].sort(); })}
                  className={`px-2 py-1 rounded-lg text-xs font-medium transition border ${isActive ? 'bg-green-100 text-green-700 border-green-300' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <p className="text-sm text-gray-500 mb-4">
          Select a date and session below to manage pod assignments. Drag counselors and campers to build your pods.
        </p>

        {/* Date Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {monthDates.map(date => {
            const amStats = getDateSessionStats(date, 'morning');
            const pmStats = getDateSessionStats(date, 'afternoon');
            const isAmSelected = selectedDate === date && selectedSession === 'morning';
            const isPmSelected = selectedDate === date && selectedSession === 'afternoon';

            return (
              <div key={date} className="rounded-lg border-2 border-gray-200 overflow-hidden">
                {/* Date Header */}
                <div className="p-2 text-center font-bold bg-gray-100">
                  <div className="text-xs text-gray-600">{getDayName(date)}</div>
                  <div>{formatDateShort(date)}</div>
                </div>

                {/* Session Buttons */}
                <div className="p-2 space-y-2">
                  {/* Morning Session */}
                  <button
                    onClick={() => { if (isAmSelected) { setSelectedDate(null); } else { setSelectedDate(date); setSelectedSession('morning'); } }}
                    className={`w-full p-2 rounded text-left text-xs transition-colors border-2 ${
                      isAmSelected ? 'bg-yellow-100 border-yellow-500' : 'bg-white border-transparent hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-medium text-sm">☀️ AM</span>
                      {isAmSelected && <span className="text-yellow-600">✓</span>}
                    </div>
                    <div className="text-xs text-gray-500 space-y-0.5">
                      <div title="Campers: Assigned / Registered">🏕️ {amStats.assigned}/{amStats.registered}</div>
                      <div title="Counselors: Assigned / Eligible">👥 {amStats.assignedCounselors}/{amStats.eligibleCounselors}</div>
                      <div title="Pods created">📋 {amStats.podCount} pods</div>
                    </div>
                  </button>

                  {/* Afternoon Session */}
                  <button
                    onClick={() => { if (isPmSelected) { setSelectedDate(null); } else { setSelectedDate(date); setSelectedSession('afternoon'); } }}
                    className={`w-full p-2 rounded text-left text-xs transition-colors border-2 ${
                      isPmSelected ? 'bg-blue-100 border-blue-500' : 'bg-white border-transparent hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-medium text-sm">🌙 PM</span>
                      {isPmSelected && <span className="text-blue-600">✓</span>}
                    </div>
                    <div className="text-xs text-gray-500 space-y-0.5">
                      <div title="Campers: Assigned / Registered">🏕️ {pmStats.assigned}/{pmStats.registered}</div>
                      <div title="Counselors: Assigned / Eligible">👥 {pmStats.assignedCounselors}/{pmStats.eligibleCounselors}</div>
                      <div title="Pods created">📋 {pmStats.podCount} pods</div>
                    </div>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* No date selected message */}
      {!selectedDate && (
        <div className="bg-white rounded-xl shadow p-8 text-center">
          <div className="text-5xl mb-4">📅</div>
          <h3 className="font-bold text-lg text-gray-700 mb-2">Select a Session</h3>
          <p className="text-gray-500">Click on a date and session above to start building pods.</p>
        </div>
      )}

      {/* Selected Session Header */}
      {selectedDate && (
        <div className={`rounded-xl shadow p-4 ${selectedSession === 'morning' ? 'bg-yellow-50 border-2 border-yellow-400' : 'bg-blue-50 border-2 border-blue-400'}`}>
          <div className="flex items-center justify-between">
            <div className="flex-1" />
            <h3 className="font-bold text-xl text-center flex-1">
              {selectedSession === 'morning' ? '☀️' : '🌙'} {formatDate(selectedDate)} - {selectedSession === 'morning' ? 'Morning' : 'Afternoon'} Session
            </h3>
            <div className="flex-1 flex justify-end">
              <button
                onClick={() => setSelectedDate(null)}
                className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-100 text-gray-600"
              >
                ✕ Deselect
              </button>
            </div>
          </div>
          <p className="text-center text-sm text-gray-600 mt-1">
            Drag counselors and campers to build pods, or tap to select then tap a slot to assign.
          </p>
        </div>
      )}

      {/* Summary Stats */}
      {selectedDate && (
      <div className="grid md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{summary.totalCampers}</div>
          <div className="text-sm text-gray-600">Registered Campers</div>
        </div>
        <div className="bg-white rounded-xl shadow p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{summary.assignedCount}</div>
          <div className="text-sm text-gray-600">Assigned to Pods</div>
        </div>
        <div className={`rounded-xl shadow p-4 text-center ${summary.unassignedCount > 0 ? 'bg-yellow-50' : 'bg-white'}`}>
          <div className={`text-2xl font-bold ${summary.unassignedCount > 0 ? 'text-yellow-600' : 'text-gray-400'}`}>{summary.unassignedCount}</div>
          <div className="text-sm text-gray-600">Unassigned</div>
        </div>
        <div className="bg-white rounded-xl shadow p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">{summary.podCount}</div>
          <div className="text-sm text-gray-600">Pods</div>
        </div>
      </div>
      )}

      {/* Selection hint for touch devices */}
      {draggedItem && (
        <div className="bg-blue-100 border border-blue-300 rounded-lg p-3 mb-4 flex items-center justify-between">
          <span className="text-blue-800 text-sm font-medium">
            {draggedItem.type === 'counselor' ? '👆 ' + draggedItem.data.name + ' selected — tap an empty counselor slot in a pod to assign' : '👆 Camper selected — tap a pod to assign'}
          </span>
          <button onClick={() => setDraggedItem(null)} className="text-blue-600 hover:text-blue-800 text-sm font-bold px-2">✕ Cancel</button>
        </div>
      )}

      {/* Main Assignment Area */}
      {selectedDate && (
      <div className="grid lg:grid-cols-4 gap-6">
        {/* Unassigned Sidebar */}
        <div className="space-y-4">
          {/* Eligible Counselors */}
          <div
            className="bg-white rounded-xl shadow p-4"
            onDragOver={e => e.preventDefault()}
            onDrop={handleDropUnassigned}
          >
            <h4 className="font-bold text-green-700 mb-3 flex items-center gap-2">
              <span className="w-3 h-3 bg-green-500 rounded-full"></span>
              Eligible Counselors ({getEligibleCounselors().length})
            </h4>
            <p className="text-xs text-gray-500 mb-2">Available for this session</p>
            <div className="space-y-2 min-h-16">
              {getEligibleCounselors().length === 0 ? (
                <div className="text-gray-400 text-sm text-center py-2">
                  {getAssignedCounselorIds().length > 0 ? 'All eligible counselors assigned' : 'No eligible counselors'}
                </div>
              ) : (
                getEligibleCounselors().map(counselor => (
                  <div
                    key={counselor.id}
                    draggable
                    onDragStart={e => handleCounselorDragStart(e, counselor)}
                    onDragEnd={handleDragEnd}
                    onClick={() => handleItemClick('counselor', counselor)}
                    className={'p-2 rounded-lg cursor-pointer hover:bg-green-100 transition-colors flex items-center gap-2 ' + (draggedItem?.type === 'counselor' && draggedItem?.data?.id === counselor.id ? 'bg-purple-100 border-2 border-purple-400 ring-2 ring-purple-300' : 'bg-green-50 border border-green-200')}
                  >
                    {getDisplayPhoto(counselor.photo) ? (
                      <img src={getDisplayPhoto(counselor.photo)} alt={counselor.name} className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex flex-col items-center justify-center">
                        <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                        <span className="text-[5px] text-gray-500 font-medium">add photo</span>
                      </div>
                    )}
                    <div className="font-medium text-sm">{counselor.name}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Not Eligible Counselors */}
          {getNotEligibleCounselors().length > 0 && (
            <div
              className="bg-white rounded-xl shadow p-4"
              onDragOver={e => e.preventDefault()}
              onDrop={handleDropUnassigned}
            >
              <h4 className="font-bold text-gray-500 mb-3 flex items-center gap-2">
                <span className="w-3 h-3 bg-gray-400 rounded-full"></span>
                Not Eligible ({getNotEligibleCounselors().length})
              </h4>
              <p className="text-xs text-gray-500 mb-2">Not available for this session</p>
              <div className="space-y-2">
                {getNotEligibleCounselors().map(counselor => (
                  <div
                    key={counselor.id}
                    draggable
                    onDragStart={e => handleCounselorDragStart(e, counselor)}
                    onDragEnd={handleDragEnd}
                    className="p-2 bg-gray-50 border border-gray-200 rounded-lg cursor-move hover:bg-gray-100 transition-colors flex items-center gap-2 opacity-60"
                  >
                    {getDisplayPhoto(counselor.photo) ? (
                      <img src={getDisplayPhoto(counselor.photo)} alt={counselor.name} className="w-8 h-8 rounded-full object-cover grayscale" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex flex-col items-center justify-center">
                        <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                        <span className="text-[5px] text-gray-500 font-medium">add photo</span>
                      </div>
                    )}
                    <div className="font-medium text-sm text-gray-500">{counselor.name}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Registered Campers to Assign */}
          <div
            className="bg-white rounded-xl shadow p-4"
            onDragOver={e => e.preventDefault()}
            onDrop={handleDropUnassigned}
          >
            <h4 className="font-bold text-yellow-700 mb-3 flex items-center gap-2">
              <span className="w-3 h-3 bg-yellow-500 rounded-full"></span>
              Campers to Assign ({getUnassignedCampers().length})
            </h4>
            <p className="text-xs text-gray-500 mb-2">Registered for this session</p>
            <div className="space-y-2 min-h-32 max-h-96 overflow-y-auto">
              {getUnassignedCampers().length === 0 ? (
                <div className="text-gray-400 text-sm text-center py-4">
                  {getSessionRegs().length === 0 ? 'No registrations for this session' : 'All campers assigned! 🎉'}
                </div>
              ) : (
                getUnassignedCampers().map(reg => {
                  const camperId = reg.childId || reg.camperId;
                  const profile = getCamperProfile(camperId);
                  return (
                  <div
                    key={reg.id}
                    draggable
                    onDragStart={e => handleCamperDragStart(e, reg)}
                    onDragEnd={handleDragEnd}
                    onClick={() => handleItemClick('camper', { ...reg, id: reg.childId || reg.camperId })}
                    className={'p-2 rounded-lg cursor-pointer hover:bg-yellow-100 transition-colors flex items-center gap-2 ' + (draggedItem?.type === 'camper' && (draggedItem?.data?.childId || draggedItem?.data?.camperId) === (reg.childId || reg.camperId) ? 'bg-green-100 border-2 border-green-400 ring-2 ring-green-300' : 'bg-yellow-50 border border-yellow-200')}
                  >
                    {getDisplayPhoto(profile?.photo) ? (
                      <img src={getDisplayPhoto(profile?.photo)} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex flex-col items-center justify-center flex-shrink-0">
                        <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                        <span className="text-[5px] text-gray-500 font-medium">add photo</span>
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate">{reg.camperName || reg.childName}</div>
                      <div className="text-xs text-gray-500">
                        {profile?.grade ? `${profile.grade} Grade` : ''}{profile?.birthdate ? ` • Age ${calculateAge(profile.birthdate)}` : ''}
                      </div>
                    </div>
                  </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Pods Grid */}
        <div className="lg:col-span-3">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-bold text-lg text-green-800">👥 Pods</h4>
            <div className="flex gap-2">
              <button
                onClick={addPod}
                className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm flex items-center gap-1"
              >
                <span>+</span> Add Pod
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {pods.map((pod, podIndex) => {
              const counselor = pod.counselorId ? getCounselor(pod.counselorId) : null;
              const camperCount = pod.camperIds.length;
              const isEmpty = !pod.counselorId && camperCount === 0;

              return (
                <div key={pod.id} className="bg-white rounded-xl shadow border-2 border-gray-200 overflow-hidden">
                  {/* Pod Header with Remove Button */}
                  <div className="bg-gray-50 px-3 py-2 flex items-center justify-between border-b">
                    <span className="font-bold text-sm text-gray-600">Pod {podIndex + 1}</span>
                    {pods.length > 1 && (
                      <button
                        onClick={() => removePod(pod.id)}
                        className="text-red-500 hover:text-red-700 text-sm font-bold"
                        title={isEmpty ? "Remove empty pod" : "Remove pod (counselor and campers will be returned to unassigned)"}
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Counselor Slot (Top) */}
                  <div
                    className={`p-3 border-b-2 border-dashed transition-all ${
                      counselor ? 'bg-purple-50 border-purple-200' :
                      draggedItem?.type === 'counselor' ? 'bg-purple-50 border-purple-300 cursor-pointer' :
                      dragOverTarget?.podId === pod.id && dragOverTarget?.type === 'counselor' ? 'bg-purple-100 border-purple-400 border-solid' :
                      'bg-gray-50 border-gray-300'
                    }`}
                    onClick={() => !counselor && handlePodCounselorClick(pod.id)}
                    onDragOver={e => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                      if (!counselor && draggedItem?.type === 'counselor') {
                        setDragOverTarget({ podId: pod.id, type: 'counselor' });
                      }
                    }}
                    onDragLeave={(e) => {
                      if (!e.currentTarget.contains(e.relatedTarget)) {
                        setDragOverTarget(null);
                      }
                    }}
                    onDrop={e => handleDropCounselor(e, pod.id)}
                  >
                    <div className="text-xs text-gray-500 mb-2 font-medium">COUNSELOR</div>
                    {counselor ? (
                      <div
                        draggable
                        onDragStart={e => handleCounselorDragStart(e, counselor)}
                        onDragEnd={handleDragEnd}
                        className="flex items-center gap-3 p-2 bg-white rounded-lg border border-purple-200 cursor-move hover:bg-purple-50 transition-colors"
                      >
                        {getDisplayPhoto(counselor.photo) ? (
                          <img src={getDisplayPhoto(counselor.photo)} alt={counselor.name} className="w-12 h-12 rounded-full object-cover border-2 border-purple-300" />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-gray-200 flex flex-col items-center justify-center">
                            <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                            <span className="text-[5px] text-gray-500 font-medium">add photo</span>
                          </div>
                        )}
                        <div className="flex-1">
                          <div className="font-bold">{counselor.name}</div>
                          <div className="text-xs text-gray-500">{counselor.position}</div>
                        </div>
                        <button
                          onClick={e => { e.stopPropagation(); removeCounselorFromPod(pod.id); }}
                          className="w-6 h-6 rounded-full bg-red-100 hover:bg-red-200 text-red-500 hover:text-red-700 flex items-center justify-center text-xs font-bold flex-shrink-0 transition-colors"
                          title="Remove from pod"
                        >✕</button>
                      </div>
                    ) : (
                      <div className={`h-16 flex items-center justify-center border-2 border-dashed rounded-lg transition-all ${
                        dragOverTarget?.podId === pod.id && dragOverTarget?.type === 'counselor'
                          ? 'border-purple-400 bg-purple-50 text-purple-600 scale-[1.02]'
                          : 'border-gray-300 bg-white text-gray-400'
                      }`}>
                        <span className="text-sm">{dragOverTarget?.podId === pod.id && dragOverTarget?.type === 'counselor' ? 'Drop here' : 'Drop counselor here'}</span>
                      </div>
                    )}
                  </div>

                  {/* Camper Slots (5 slots below) */}
                  <div
                    className={`p-3 transition-all ${draggedItem?.type === 'camper' ? 'cursor-pointer' : ''} ${dragOverTarget?.podId === pod.id && dragOverTarget?.type === 'camper' ? 'bg-green-50' : ''}`}
                    onClick={() => handlePodCamperClick(pod.id)}
                    onDragOver={e => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                      if (draggedItem?.type === 'camper') {
                        setDragOverTarget({ podId: pod.id, type: 'camper' });
                      }
                    }}
                    onDragLeave={(e) => {
                      if (!e.currentTarget.contains(e.relatedTarget)) {
                        setDragOverTarget(null);
                      }
                    }}
                    onDrop={e => handleDropCamper(e, pod.id)}
                  >
                    <div className="text-xs text-gray-500 mb-2 font-medium">CAMPERS ({camperCount}/{KIDS_PER_COUNSELOR})</div>
                    <div className="space-y-2">
                      {[...Array(KIDS_PER_COUNSELOR)].map((_, slotIndex) => {
                        const camperId = pod.camperIds[slotIndex];
                        const camperInfo = camperId ? getCamperInfo(camperId) : null;
                        const profile = camperId ? getCamperProfile(camperId) : null;
                        const isDragOver = dragOverTarget?.podId === pod.id && dragOverTarget?.type === 'camper' && !camperId && slotIndex === (pod.camperIds.length);

                        return (
                          <div
                            key={slotIndex}
                            className={`h-10 rounded-lg border-2 transition-all ${
                              camperId
                                ? 'bg-green-50 border-green-200'
                                : isDragOver
                                ? 'bg-green-100 border-green-400 border-solid scale-[1.02]'
                                : 'bg-gray-50 border-dashed border-gray-300'
                            }`}
                            onDragOver={e => {
                              e.preventDefault();
                              e.dataTransfer.dropEffect = 'move';
                              if (!camperId && draggedItem?.type === 'camper') {
                                setDragOverTarget({ podId: pod.id, type: 'camper' });
                              }
                            }}
                            onDragLeave={(e) => {
                              if (!e.currentTarget.contains(e.relatedTarget)) {
                                setDragOverTarget(null);
                              }
                            }}
                            onDrop={e => handleDropCamper(e, pod.id, slotIndex)}
                          >
                            {camperId ? (
                              <div
                                draggable
                                onDragStart={e => handleCamperDragStart(e, camperInfo || { childId: camperId, camperId })}
                                onDragEnd={handleDragEnd}
                                className="h-full flex items-center gap-2 px-2 cursor-move hover:bg-green-100 transition-colors rounded-lg"
                              >
                                {getDisplayPhoto(profile?.photo) ? (
                                  <img src={getDisplayPhoto(profile?.photo)} className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
                                ) : (
                                  <div className="w-6 h-6 rounded-full bg-green-200 flex items-center justify-center text-xs text-green-700 font-medium flex-shrink-0">
                                    {getCamperName(camperId)?.charAt(0)}
                                  </div>
                                )}
                                <span className="text-sm font-medium truncate flex-1">{getCamperName(camperId)}</span>
                                {profile?.grade && <span className="text-xs text-gray-400 flex-shrink-0">{profile.grade}</span>}
                                <button
                                  onClick={e => { e.stopPropagation(); removeCamperFromPod(pod.id, camperId); }}
                                  className="w-5 h-5 rounded-full bg-red-100 hover:bg-red-200 text-red-500 hover:text-red-700 flex items-center justify-center text-[10px] font-bold flex-shrink-0 transition-colors"
                                  title="Remove from pod"
                                >✕</button>
                              </div>
                            ) : (
                              <div className={`h-full flex items-center justify-center text-xs ${isDragOver ? 'text-green-600 font-medium' : 'text-gray-400'}`}>
                                {isDragOver ? 'Drop here' : 'Empty slot'}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Pod Status Footer */}
                  <div className={`px-3 py-2 text-center text-xs font-medium ${
                    !counselor ? 'bg-gray-100 text-gray-500' :
                    camperCount === 0 ? 'bg-yellow-50 text-yellow-600' :
                    camperCount <= 3 ? 'bg-green-50 text-green-600' :
                    camperCount <= 5 ? 'bg-blue-50 text-blue-600' :
                    'bg-red-50 text-red-600'
                  }`}>
                    {!counselor ? 'Needs counselor' :
                     camperCount === 0 ? 'Ready for campers' :
                     `${camperCount} camper${camperCount !== 1 ? 's' : ''} assigned`}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      )}
      </>}

    </div>
  );
};

// (ParentMessagesTab removed — messaging feature deprecated)
const _ParentMessagesTab_REMOVED = ({ userEmail, userName, messages, onSendReply, markAsRead, showToast }) => {
  const [replyText, setReplyText] = useState('');
  const [selectedMsg, setSelectedMsg] = useState(null);
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

  return (
    <div className="space-y-6">
      {/* Unread Alert */}
      {unreadMessages.length > 0 && (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 flex items-center gap-4">
          <div className="text-3xl">📬</div>
          <div>
            <div className="font-bold text-blue-800">You have {unreadMessages.length} unread message{unreadMessages.length > 1 ? 's' : ''}</div>
            <div className="text-sm text-blue-600">Click on a message to read and reply</div>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Message List */}
        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="font-bold text-lg text-green-800 mb-4">💬 Messages from Camp</h3>
          {myMessages.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="text-4xl mb-2">📭</p>
              <p>No messages yet</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {myMessages.map(msg => {
                const isUnread = msg.from !== userEmail && !msg.readBy?.includes(userEmail);
                const isSelected = selectedMsg?.id === msg.id;
                const isFromMe = msg.from === userEmail;

                return (
                  <div
                    key={msg.id}
                    onClick={() => setSelectedMsg(msg)}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      isSelected ? 'bg-green-100 border-2 border-green-500' :
                      isUnread ? 'bg-blue-50 border-2 border-blue-300' :
                      'bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className={`text-sm ${isUnread ? 'font-bold text-blue-800' : 'text-gray-600'}`}>
                        {isFromMe ? '📤 You' : '📥 Camp Admin'}
                        {msg.to === 'all' && !isFromMe && <span className="ml-1 text-xs text-purple-600">(Broadcast)</span>}
                      </span>
                      <span className="text-xs text-gray-400">{formatTimestamp(msg.sentAt)}</span>
                    </div>
                    {msg.subject && <div className={`text-sm ${isUnread ? 'font-bold' : 'font-medium'}`}>{msg.subject}</div>}
                    <div className="text-sm text-gray-600 truncate">{msg.body}</div>
                    {isUnread && <span className="inline-block mt-1 px-2 py-0.5 bg-blue-500 text-white text-xs rounded">New</span>}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Message Detail / Reply */}
        <div className="bg-white rounded-xl shadow p-6">
          {!selectedMsg ? (
            <div className="text-center py-12 text-gray-500">
              <p className="text-4xl mb-2">👈</p>
              <p>Select a message to read</p>
            </div>
          ) : (
            <div className="flex flex-col h-full">
              <div className="mb-4">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-bold text-lg">
                    {selectedMsg.from === userEmail ? '📤 You sent' : '📥 From Camp Admin'}
                  </span>
                  <span className="text-sm text-gray-500">{formatTimestamp(selectedMsg.sentAt)}</span>
                </div>
                {selectedMsg.subject && (
                  <div className="font-medium text-gray-800 mb-2">{selectedMsg.subject}</div>
                )}
                {selectedMsg.to === 'all' && selectedMsg.from !== userEmail && (
                  <span className="inline-block px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded mb-2">
                    📢 Sent to all parents
                  </span>
                )}
              </div>

              <div className="flex-1 bg-gray-50 rounded-lg p-4 mb-4 whitespace-pre-wrap overflow-y-auto max-h-48">
                {selectedMsg.body}
              </div>

              {/* Reply section - only show for messages from admin */}
              {selectedMsg.from !== userEmail && (
                <div className="border-t pt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Reply:</label>
                  <textarea
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg resize-none"
                    rows={3}
                    placeholder="Type your reply..."
                    autoComplete="off"
                    data-1p-ignore="true"
                  />
                  <button
                    onClick={handleSendReply}
                    disabled={!replyText.trim()}
                    className="mt-2 w-full py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300"
                  >
                    Send Reply
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

