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

// ==================== GYM RENTAL DAYS TAB ====================
export const GymRentalDaysTab = ({ gymRentals, allDates, onSaveGymRentals, showToast, selectedMonth, setSelectedMonth }) => {
  // Generate all weekdays (Mon-Fri) in July and August 2026
  const getAllWeekdays = () => {
    const weekdays = [];
    const months = [6, 7]; // July (6) and August (7) - 0-indexed
    const year = 2026;

    months.forEach(month => {
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dayOfWeek = date.getDay(); // 0=Sunday, 6=Saturday
        // Only include weekdays (Mon-Fri)
        if (dayOfWeek >= 1 && dayOfWeek <= 5) {
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          weekdays.push(dateStr);
        }
      }
    });
    return weekdays;
  };

  const allWeekdays = getAllWeekdays();

  // Initialize selected month if not set
  React.useEffect(() => {
    if (!selectedMonth) {
      setSelectedMonth('2026-07'); // Default to July 2026
    }
  }, [selectedMonth, setSelectedMonth]);

  // Get months (July and August 2026)
  const getMonths = () => {
    return [
      { key: '2026-07', name: 'July 2026', year: 2026, month: 6 },
      { key: '2026-08', name: 'August 2026', year: 2026, month: 7 }
    ];
  };

  const months = getMonths();

  // Get weekdays for selected month
  const getMonthDates = () => {
    if (!selectedMonth) return [];
    const [year, month] = selectedMonth.split('-').map(Number);
    return allWeekdays.filter(date => {
      const d = new Date(date + 'T12:00:00');
      return d.getFullYear() === year && d.getMonth() === month - 1;
    });
  };

  const monthDates = getMonthDates();

  // Get weeks for selected month (group weekdays into weeks)
  const getMonthWeeks = () => {
    if (!selectedMonth) return [];
    const dates = getMonthDates();
    const weeks = [];
    let currentWeek = [];

    dates.forEach((date, idx) => {
      const d = new Date(date + 'T12:00:00');
      const dayOfWeek = d.getDay(); // 1=Mon, 5=Fri

      currentWeek.push(date);

      // End of week (Friday) or last date
      if (dayOfWeek === 5 || idx === dates.length - 1) {
        if (currentWeek.length > 0) {
          weeks.push({
            start: currentWeek[0],
            end: currentWeek[currentWeek.length - 1],
            dates: [...currentWeek]
          });
          currentWeek = [];
        }
      }
    });

    return weeks;
  };

  const monthWeeks = getMonthWeeks();

  // Check if a session is booked
  const isSessionBooked = (date, session) => {
    return gymRentals[date]?.[session] === true;
  };

  // Check if whole day is booked
  const isDayFullyBooked = (date) => {
    return isSessionBooked(date, 'morning') && isSessionBooked(date, 'afternoon');
  };

  // Check if day is partially booked
  const isDayPartiallyBooked = (date) => {
    const am = isSessionBooked(date, 'morning');
    const pm = isSessionBooked(date, 'afternoon');
    return (am || pm) && !(am && pm);
  };

  // Check if not booked
  const isDayNotBooked = (date) => {
    return !isSessionBooked(date, 'morning') && !isSessionBooked(date, 'afternoon');
  };

  // Toggle a single session
  const toggleSession = (date, session) => {
    const isBooked = isSessionBooked(date, session);
    const newRentals = { ...gymRentals };
    if (!newRentals[date]) newRentals[date] = {};

    if (isBooked) {
      // Unbook
      delete newRentals[date][session];
      if (Object.keys(newRentals[date]).length === 0) {
        delete newRentals[date];
      }
      onSaveGymRentals(newRentals, `Unmarked ${session} on ${date} as not booked`);
      showToast(`${session} on ${date} is now not booked`);
    } else {
      // Book
      newRentals[date][session] = true;
      onSaveGymRentals(newRentals, `Marked ${session} on ${date} as gym booked`);
      showToast(`${session} on ${date} is now gym booked`);
    }
  };

  // Toggle whole day (both sessions)
  const toggleDay = (date) => {
    const fullyBooked = isDayFullyBooked(date);
    const newRentals = { ...gymRentals };

    if (fullyBooked) {
      // Unbook whole day
      delete newRentals[date];
      onSaveGymRentals(newRentals, `Unmarked ${date} as not booked`);
      showToast(`${date} is now not booked`);
    } else {
      // Book whole day
      newRentals[date] = { morning: true, afternoon: true };
      onSaveGymRentals(newRentals, `Marked ${date} as fully gym booked`);
      showToast(`${date} is now fully gym booked`);
    }
  };

  // Toggle whole week
  const toggleWeek = (week) => {
    const newRentals = { ...gymRentals };
    const allBooked = week.dates.every(d => isDayFullyBooked(d));

    if (allBooked) {
      // Unbook whole week
      week.dates.forEach(date => delete newRentals[date]);
      onSaveGymRentals(newRentals, `Unmarked week ${week.start} as not booked`);
      showToast(`Week ${week.start} is now not booked`);
    } else {
      // Book whole week
      week.dates.forEach(date => {
        newRentals[date] = { morning: true, afternoon: true };
      });
      onSaveGymRentals(newRentals, `Marked week ${week.start} as fully gym booked`);
      showToast(`Week ${week.start} is now fully gym booked`);
    }
  };

  // Helper functions
  const getDayName = (date) => {
    const d = new Date(date + 'T12:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'short' });
  };

  const formatDateShort = (date) => {
    const d = new Date(date + 'T12:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatWeekRange = (week) => {
    const startD = new Date(week.start + 'T12:00:00');
    const endD = new Date(week.end + 'T12:00:00');
    return `${startD.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endD.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  };

  // Stats
  const totalSessions = allWeekdays.length * 2;
  const bookedCount = Object.values(gymRentals).reduce((sum, day) =>
    sum + (day.morning ? 1 : 0) + (day.afternoon ? 1 : 0), 0);
  const unbookedCount = totalSessions - bookedCount;

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow p-4 text-center">
          <div className="text-3xl font-bold text-gray-600">{allWeekdays.length}</div>
          <div className="text-gray-600 text-sm">Total Weekdays</div>
        </div>
        <div className="bg-white rounded-xl shadow p-4 text-center">
          <div className="text-3xl font-bold text-blue-600">{bookedCount}</div>
          <div className="text-gray-600 text-sm">Gym Booked Sessions</div>
        </div>
        <div className="bg-white rounded-xl shadow p-4 text-center">
          <div className="text-3xl font-bold text-green-600">{unbookedCount}</div>
          <div className="text-gray-600 text-sm">Not Booked Sessions</div>
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
          Mark days/sessions when the gym is booked for DayCamp. Click AM/PM to toggle individual sessions, or the date header to toggle the whole day.
        </p>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 text-sm mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-200 border-2 border-green-400 rounded"></div>
            <span>Fully Booked (both AM & PM)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-200 border-2 border-yellow-400 rounded"></div>
            <span>Partially Booked (AM or PM only)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-200 border-2 border-red-400 rounded"></div>
            <span>Not Booked (gym not secured)</span>
          </div>
        </div>

        {/* Date Grid - Mon to Fri rows */}
        <div className="space-y-1">
          {/* Day-of-week headers */}
          <div className="grid grid-cols-5 gap-2 mb-2">
            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(day => (
              <div key={day} className="text-center text-xs font-bold text-gray-500 uppercase">{day}</div>
            ))}
          </div>
          {monthWeeks.map((week, weekIdx) => (
            <div key={weekIdx} className="grid grid-cols-5 gap-2 mb-2">
              {[1, 2, 3, 4, 5].map(dayOfWeek => {
                const date = week.dates.find(d => new Date(d + 'T12:00:00').getDay() === dayOfWeek);
                if (!date) return <div key={dayOfWeek} className="rounded-lg bg-gray-50 min-h-[90px]"></div>;

                const fullyBooked = isDayFullyBooked(date);
                const partiallyBooked = isDayPartiallyBooked(date);
                const amBooked = isSessionBooked(date, 'morning');
                const pmBooked = isSessionBooked(date, 'afternoon');

                return (
                  <div
                    key={date}
                    className={`rounded-lg border-2 overflow-hidden ${
                      fullyBooked ? 'border-green-400 bg-green-50' :
                      partiallyBooked ? 'border-yellow-400 bg-yellow-50' :
                      'border-red-400 bg-red-50'
                    }`}
                  >
                    {/* Date Header - Click to toggle whole day */}
                    <button
                      onClick={() => toggleDay(date)}
                      className={`w-full p-1 text-center font-bold transition-colors text-sm ${
                        fullyBooked ? 'bg-green-200 hover:bg-green-300' :
                        partiallyBooked ? 'bg-yellow-200 hover:bg-yellow-300' :
                        'bg-red-200 hover:bg-red-300'
                      }`}
                    >
                      <div>{formatDateShort(date)}</div>
                    </button>

                    {/* Session Buttons */}
                    <div className="p-1 space-y-1">
                      <button
                        onClick={() => toggleSession(date, 'morning')}
                        className={`w-full p-1 rounded text-xs transition-colors ${
                          amBooked ? 'bg-green-100 hover:bg-green-200 text-green-800' : 'bg-red-100 hover:bg-red-200 text-red-800 border border-red-200'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span>☀️ AM</span>
                          <span>{amBooked ? '✓' : '○'}</span>
                        </div>
                      </button>
                      <button
                        onClick={() => toggleSession(date, 'afternoon')}
                        className={`w-full p-1 rounded text-xs transition-colors ${
                          pmBooked ? 'bg-green-100 hover:bg-green-200 text-green-800' : 'bg-red-100 hover:bg-red-200 text-red-800 border border-red-200'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span>🌙 PM</span>
                          <span>{pmBooked ? '✓' : '○'}</span>
                        </div>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

