// Pricing calculation — shared across all 4 apps
import { CAMP_WEEKS } from './campDates';

export const calculateDiscountedTotal = (selectedDates, numChildren, content) => {
  const basePrice = content.singleSessionCost || 60;
  const weekDiscount = (content.weekDiscount || 10) / 100;
  const multiWeekDiscount = (content.multiWeekDiscount || 15) / 100;

  const sessionsByWeek = {};
  Object.entries(selectedDates).forEach(([date, sessions]) => {
    if (!sessions?.length) return;
    const weekIdx = CAMP_WEEKS.findIndex(w => w.dates.includes(date));
    if (weekIdx >= 0) {
      if (!sessionsByWeek[weekIdx]) sessionsByWeek[weekIdx] = { dates: {}, totalSessions: 0 };
      sessionsByWeek[weekIdx].dates[date] = sessions;
      sessionsByWeek[weekIdx].totalSessions += sessions.length;
    }
  });

  let fullWeeks = 0;
  let fullWeekSessions = 0;
  let partialSessions = 0;

  Object.values(sessionsByWeek).forEach(week => {
    const daysCount = Object.keys(week.dates).length;
    const hasBothSessions = Object.values(week.dates).every(s => s.includes('morning') && s.includes('afternoon'));

    if (daysCount === 5 && hasBothSessions && week.totalSessions === 10) {
      fullWeeks++;
      fullWeekSessions += 10;
    } else {
      partialSessions += week.totalSessions;
    }
  });

  const children = Math.max(1, numChildren);
  let subtotal = 0;
  let discount = 0;

  if (fullWeeks >= 2) {
    const fullWeekCost = fullWeekSessions * basePrice * children;
    discount = fullWeekCost * multiWeekDiscount;
    subtotal = fullWeekCost - discount + (partialSessions * basePrice * children);
  } else if (fullWeeks === 1) {
    const fullWeekCost = fullWeekSessions * basePrice * children;
    discount = fullWeekCost * weekDiscount;
    subtotal = fullWeekCost - discount + (partialSessions * basePrice * children);
  } else {
    subtotal = (fullWeekSessions + partialSessions) * basePrice * children;
  }

  const totalSessions = fullWeekSessions + partialSessions;
  const originalTotal = totalSessions * basePrice * children;

  return {
    totalSessions,
    fullWeeks,
    partialSessions,
    originalTotal,
    discount,
    discountPercent: fullWeeks >= 2 ? multiWeekDiscount * 100 : fullWeeks === 1 ? weekDiscount * 100 : 0,
    finalTotal: Math.round(subtotal)
  };
};
