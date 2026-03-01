// Camp date utilities — shared across all 4 apps

export const generateCampDates = (loadedDates = null) => {
  if (loadedDates && loadedDates.length > 0) {
    return loadedDates.map(d => d.date).sort();
  }
  const weeks = [
    ['2026-08-17', '2026-08-18', '2026-08-19', '2026-08-20', '2026-08-21'],
    ['2026-08-24', '2026-08-25', '2026-08-26', '2026-08-27', '2026-08-28']
  ];
  return weeks.flat();
};

export const CAMP_DATES = generateCampDates();

export const getCampDateRange = () => {
  if (CAMP_DATES.length === 0) return '';
  const start = new Date(CAMP_DATES[0] + 'T12:00:00');
  const end = new Date(CAMP_DATES[CAMP_DATES.length - 1] + 'T12:00:00');
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return `${months[start.getMonth()]} ${start.getDate()} - ${months[end.getMonth()]} ${end.getDate()}, ${end.getFullYear()}`;
};

export const CAMP_DATE_RANGE = getCampDateRange();

export const getWeeks = () => {
  const weeks = [];
  let currentWeek = [];
  let weekStart = null;
  CAMP_DATES.forEach((date, idx) => {
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
};

export const CAMP_WEEKS = getWeeks();

export const generateDatesFromGymRentals = (gymRentals) => {
  if (!gymRentals || Object.keys(gymRentals).length === 0) return [];
  return Object.entries(gymRentals)
    .filter(([date, data]) => data?.morning === true || data?.afternoon === true)
    .map(([date]) => date)
    .sort();
};
