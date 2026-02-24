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

// ==================== SESSIONS TAB ====================
export const SessionsTab = ({ blockedSessions, allDates, onSaveBlockedSessions, registrations, counselors, availability, assignments, showToast, selectedMonth, setSelectedMonth }) => {
  const [confirmBlock, setConfirmBlock] = useState(null);

  // Initialize selected month if not set
  React.useEffect(() => {
    if (!selectedMonth && allDates.length > 0) {
      const d = new Date(allDates[0] + 'T12:00:00');
      setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
  }, [selectedMonth, allDates, setSelectedMonth]);

  // Get months that have camp dates
  const getMonths = () => {
    const months = [];
    allDates.forEach(date => {
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

  // Get dates for selected month
  const getMonthDates = () => {
    if (!selectedMonth) return [];
    const [year, month] = selectedMonth.split('-').map(Number);
    return allDates.filter(date => {
      const d = new Date(date + 'T12:00:00');
      return d.getFullYear() === year && d.getMonth() === month - 1;
    });
  };

  const monthDates = getMonthDates();

  // Check if a session is blocked
  const isSessionBlocked = (date, session) => {
    return blockedSessions[date]?.[session] === true;
  };

  // Check if whole day is blocked
  const isDayFullyBlocked = (date) => {
    return isSessionBlocked(date, 'morning') && isSessionBlocked(date, 'afternoon');
  };

  // Check if day is partially blocked
  const isDayPartiallyBlocked = (date) => {
    const am = isSessionBlocked(date, 'morning');
    const pm = isSessionBlocked(date, 'afternoon');
    return (am || pm) && !(am && pm);
  };

  // Get registration stats for a date/session
  const getSessionStats = (date, session) => {
    const regs = registrations.filter(r =>
      r.date === date &&
      r.sessions?.includes(session) &&
      r.status !== 'cancelled'
    );
    return { count: regs.length };
  };

  // Get counselor availability for a date/session
  const getCounselorStats = (date, session) => {
    let available = 0;
    let total = counselors.filter(c => c.visible).length;

    Object.entries(availability).forEach(([email, avail]) => {
      const counselor = counselors.find(c => c.email === email && c.visible);
      if (!counselor) return;

      const dateAvail = avail[date];
      if (dateAvail?.available?.includes(session) ||
          (Array.isArray(dateAvail) && dateAvail.includes(session))) {
        available++;
      }
    });

    return { available, total };
  };

  // Get assigned campers for a date/session
  const getAssignedStats = (date, session) => {
    const key = `${date}_${session}`;
    const sessionAssignments = assignments[key] || {};
    const assigned = Object.values(sessionAssignments).flat().length;
    return { assigned };
  };

  // Get pod information for a date/session
  const getPodStats = (date, session) => {
    const key = `${date}_${session}`;
    const sessionAssignments = assignments[key] || {};
    const pods = Object.entries(sessionAssignments).map(([counselorId, camperIds]) => ({
      counselorId,
      camperCount: camperIds.length
    }));
    const totalCapacity = pods.length * KIDS_PER_COUNSELOR;
    return { pods, totalCapacity };
  };

  // Toggle a single session
  const toggleSession = (date, session) => {
    const isBlocked = isSessionBlocked(date, session);
    const stats = getSessionStats(date, session);

    if (!isBlocked && stats.count > 0) {
      // Blocking with registrations - confirm first
      setConfirmBlock({ date, session, count: stats.count });
      return;
    }

    const newBlocked = { ...blockedSessions };
    if (!newBlocked[date]) newBlocked[date] = {};

    if (isBlocked) {
      delete newBlocked[date][session];
      if (Object.keys(newBlocked[date]).length === 0) {
        delete newBlocked[date];
      }
      onSaveBlockedSessions(newBlocked, `Unblocked ${session} on ${date}`);
      showToast(`${session} on ${date} is now available`);
    } else {
      newBlocked[date][session] = true;
      onSaveBlockedSessions(newBlocked, `Blocked ${session} on ${date}`);
      showToast(`${session} on ${date} is now blocked`);
    }
  };

  // Toggle whole day (both sessions)
  const toggleDay = (date) => {
    const fullyBlocked = isDayFullyBlocked(date);
    const morningStats = getSessionStats(date, 'morning');
    const afternoonStats = getSessionStats(date, 'afternoon');
    const totalRegs = morningStats.count + afternoonStats.count;

    if (!fullyBlocked && totalRegs > 0) {
      // Blocking with registrations - confirm first
      setConfirmBlock({ date, session: 'both', count: totalRegs });
      return;
    }

    const newBlocked = { ...blockedSessions };

    if (fullyBlocked) {
      // Unblock whole day
      delete newBlocked[date];
      onSaveBlockedSessions(newBlocked, `Unblocked whole day ${date}`);
      showToast(`${date} is now fully available`);
    } else {
      // Block whole day
      newBlocked[date] = { morning: true, afternoon: true };
      onSaveBlockedSessions(newBlocked, `Blocked whole day ${date}`);
      showToast(`${date} is now fully blocked`);
    }
  };

  // Handle confirm block
  const handleConfirmBlock = () => {
    const { date, session } = confirmBlock;
    const newBlocked = { ...blockedSessions };
    if (!newBlocked[date]) newBlocked[date] = {};

    if (session === 'both') {
      newBlocked[date] = { morning: true, afternoon: true };
      onSaveBlockedSessions(newBlocked, `Blocked whole day ${date} (had registrations)`);
      showToast(`${date} is now fully blocked`);
    } else {
      newBlocked[date][session] = true;
      onSaveBlockedSessions(newBlocked, `Blocked ${session} on ${date} (had registrations)`);
      showToast(`${session} on ${date} is now blocked`);
    }
    setConfirmBlock(null);
  };

  // Get week days for a date
  const getDayName = (date) => {
    const d = new Date(date + 'T12:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'short' });
  };

  const formatDateShort = (date) => {
    const d = new Date(date + 'T12:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Stats
  const totalSessions = allDates.length * 2;
  const blockedCount = Object.values(blockedSessions).reduce((sum, day) =>
    sum + (day.morning ? 1 : 0) + (day.afternoon ? 1 : 0), 0);
  const availableCount = totalSessions - blockedCount;

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow p-4 text-center">
          <div className="text-3xl font-bold text-blue-600">{totalSessions}</div>
          <div className="text-gray-600 text-sm">Total Sessions</div>
        </div>
        <div className="bg-white rounded-xl shadow p-4 text-center">
          <div className="text-3xl font-bold text-green-600">{availableCount}</div>
          <div className="text-gray-600 text-sm">Available</div>
        </div>
        <div className="bg-white rounded-xl shadow p-4 text-center">
          <div className="text-3xl font-bold text-red-600">{blockedCount}</div>
          <div className="text-gray-600 text-sm">Blocked</div>
        </div>
      </div>

      {/* Month Selector */}
      <div className="bg-white rounded-xl shadow p-4">
        <div className="flex flex-wrap gap-2 mb-4">
          {months.map(m => (
            <button
              key={m.key}
              onClick={() => setSelectedMonth(m.key)}
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

        {/* Instructions */}
        <p className="text-sm text-gray-500 mb-4">
          Click AM/PM to toggle individual sessions, or the date header to toggle the whole day. Blocked sessions will not appear as options for registration.
        </p>

        {/* Date Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {monthDates.map(date => {
            const fullyBlocked = isDayFullyBlocked(date);
            const partiallyBlocked = isDayPartiallyBlocked(date);
            const amBlocked = isSessionBlocked(date, 'morning');
            const pmBlocked = isSessionBlocked(date, 'afternoon');
            const amStats = getSessionStats(date, 'morning');
            const pmStats = getSessionStats(date, 'afternoon');
            const amCounselors = getCounselorStats(date, 'morning');
            const pmCounselors = getCounselorStats(date, 'afternoon');
            const amAssigned = getAssignedStats(date, 'morning');
            const pmAssigned = getAssignedStats(date, 'afternoon');
            const amPods = getPodStats(date, 'morning');
            const pmPods = getPodStats(date, 'afternoon');

            return (
              <div
                key={date}
                className={`rounded-lg border-2 overflow-hidden ${
                  fullyBlocked ? 'border-red-300 bg-red-50' :
                  partiallyBlocked ? 'border-yellow-300 bg-yellow-50' :
                  'border-green-300 bg-green-50'
                }`}
              >
                {/* Date Header - Click to toggle whole day */}
                <button
                  onClick={() => toggleDay(date)}
                  className={`w-full p-2 text-center font-bold transition-colors ${
                    fullyBlocked ? 'bg-red-200 hover:bg-red-300' :
                    partiallyBlocked ? 'bg-yellow-200 hover:bg-yellow-300' :
                    'bg-green-200 hover:bg-green-300'
                  }`}
                >
                  <div className="text-xs text-gray-600">{getDayName(date)}</div>
                  <div>{formatDateShort(date)}</div>
                </button>

                {/* Session Buttons */}
                <div className="p-2 space-y-2">
                  {/* Morning Session */}
                  <button
                    onClick={() => toggleSession(date, 'morning')}
                    className={`w-full p-2 rounded text-left text-sm transition-colors ${
                      amBlocked ? 'bg-red-100 hover:bg-red-200' : 'bg-white hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium">☀️ AM</span>
                      <span className={amBlocked ? 'text-red-600' : 'text-green-600'}>
                        {amBlocked ? '🚫' : '✓'}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      <div className="flex items-center gap-1">
                        <span title="Campers registered">🏕️ {amStats.count}</span>
                        {amStats.count > amPods.totalCapacity && amPods.totalCapacity > 0 && (
                          <span className="text-red-600 font-bold" title="Not enough counselors!">⚠️</span>
                        )}
                      </div>
                      {amPods.pods.length > 0 ? (
                        <div className="mt-1 text-xs">
                          <span className="text-gray-600">Pods: </span>
                          {amPods.pods.map((pod, idx) => (
                            <span key={idx} className="mr-1">
                              {pod.camperCount}/{KIDS_PER_COUNSELOR}{idx < amPods.pods.length - 1 ? ',' : ''}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div className="mt-1 text-xs text-gray-400">No pods assigned</div>
                      )}
                    </div>
                  </button>

                  {/* Afternoon Session */}
                  <button
                    onClick={() => toggleSession(date, 'afternoon')}
                    className={`w-full p-2 rounded text-left text-sm transition-colors ${
                      pmBlocked ? 'bg-red-100 hover:bg-red-200' : 'bg-white hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium">🌙 PM</span>
                      <span className={pmBlocked ? 'text-red-600' : 'text-green-600'}>
                        {pmBlocked ? '🚫' : '✓'}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      <div className="flex items-center gap-1">
                        <span title="Campers registered">🏕️ {pmStats.count}</span>
                        {pmStats.count > pmPods.totalCapacity && pmPods.totalCapacity > 0 && (
                          <span className="text-red-600 font-bold" title="Not enough counselors!">⚠️</span>
                        )}
                      </div>
                      {pmPods.pods.length > 0 ? (
                        <div className="mt-1 text-xs">
                          <span className="text-gray-600">Pods: </span>
                          {pmPods.pods.map((pod, idx) => (
                            <span key={idx} className="mr-1">
                              {pod.camperCount}/{KIDS_PER_COUNSELOR}{idx < pmPods.pods.length - 1 ? ',' : ''}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div className="mt-1 text-xs text-gray-400">No pods assigned</div>
                      )}
                    </div>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="bg-white rounded-xl shadow p-4">
        <h4 className="font-bold text-gray-700 mb-2">Legend</h4>
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-50 border-2 border-green-300 rounded"></div>
            <span>Fully available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-50 border-2 border-yellow-300 rounded"></div>
            <span>Partially blocked</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-50 border-2 border-red-300 rounded"></div>
            <span>Fully blocked</span>
          </div>
        </div>
        <div className="mt-3 text-xs text-gray-500">
          <strong>Stats:</strong> 🏕️ = Campers registered • Pods show campers/capacity for each counselor (e.g., "3/5" means 3 campers in a pod of 5) • ⚠️ = Not enough counselors for registered campers
        </div>
      </div>

      {/* Confirm Block Modal */}
      {confirmBlock && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 text-center" onClick={e => e.stopPropagation()}>
            <div className="text-5xl mb-4">⚠️</div>
            <h3 className="font-bold text-xl text-orange-600 mb-2">Block Session with Registrations?</h3>
            <p className="text-gray-600 mb-4">
              <strong>{confirmBlock.date}</strong> {confirmBlock.session === 'both' ? '(both sessions)' : `(${confirmBlock.session})`} has <strong>{confirmBlock.count}</strong> existing registration{confirmBlock.count !== 1 ? 's' : ''}.
              <br /><br />
              Blocking will prevent new registrations but won't affect existing ones.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmBlock(null)} className="flex-1 px-4 py-2 border rounded-lg">Cancel</button>
              <button onClick={handleConfirmBlock} className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700">
                Block Anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

