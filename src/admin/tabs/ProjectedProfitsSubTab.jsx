import React, { useMemo } from 'react';

// ==================== PROJECTED PROFITS SUB-TAB ====================
// Financial constants from gym permit #R282920 (Magnuson CC, Aug 17-28 2026)
const GYM_RENTAL_TOTAL = 5929; // $5,929 total permit fee
const GYM_DAILY_RATE = 564;    // $94/hr × 6 hrs
const GYM_DAYS = 10;           // Aug 17-21 + Aug 24-28
const COUNSELOR_PAY_PER_SESSION = 80;  // $80/session (3 hrs)
const KIDS_PER_COUNSELOR = 5;
const PROFIT_MAX = 20000; // Chart goes up to $20K profit

export const ProjectedProfitsSubTab = ({ registrations, counselors, counselorSchedule, gymRentals, content, sessionCost }) => {
  const analysis = useMemo(() => {
    const basePrice = sessionCost || 60;

    // --- Categorize registrations ---
    const activeRegs = (registrations || []).filter(r => r.status !== 'cancelled');
    const paidRegs = activeRegs.filter(r => r.status === 'approved' && ['paid', 'confirmed'].includes(r.paymentStatus));
    const unpaidRegs = activeRegs.filter(r => !(r.status === 'approved' && ['paid', 'confirmed'].includes(r.paymentStatus)));

    // Count camper-sessions (each entry in sessions array = 1 camper-session)
    const countSessions = (regs) => regs.reduce((sum, r) => sum + (r.sessions?.length || 0), 0);
    const sumRevenue = (regs) => regs.reduce((sum, r) => sum + (parseFloat(r.totalAmount) || 0), 0);

    const paidSessions = countSessions(paidRegs);
    const unpaidSessions = countSessions(unpaidRegs);
    const totalRegisteredSessions = paidSessions + unpaidSessions;
    const paidRevenue = sumRevenue(paidRegs);
    const unpaidRevenue = sumRevenue(unpaidRegs);
    const totalRegisteredRevenue = paidRevenue + unpaidRevenue;

    // --- Calculate counselor costs based on actual registrations ---
    // Group by date+session to figure out counselors needed
    const sessionSlots = {}; // { "2026-08-17_morning": count }
    activeRegs.forEach(r => {
      (r.sessions || []).forEach(s => {
        const key = `${r.date}_${s}`;
        sessionSlots[key] = (sessionSlots[key] || 0) + 1;
      });
    });

    let totalCounselorsNeeded = 0;
    const slotDetails = [];
    Object.entries(sessionSlots).forEach(([key, camperCount]) => {
      const needed = Math.ceil(camperCount / KIDS_PER_COUNSELOR);
      totalCounselorsNeeded += needed;
      slotDetails.push({ key, camperCount, counselorsNeeded: needed });
    });

    const estimatedCounselorCost = totalCounselorsNeeded * COUNSELOR_PAY_PER_SESSION;
    const totalFixedCosts = GYM_RENTAL_TOTAL;
    const totalCosts = totalFixedCosts + estimatedCounselorCost;

    // --- Profit calculations ---
    const profitIfAllPay = totalRegisteredRevenue - totalCosts;
    const profitPaidOnly = paidRevenue - totalCosts;

    // --- Projection model ---
    // Average revenue per session (accounts for discounts)
    const avgRevenuePerSession = totalRegisteredSessions > 0
      ? totalRegisteredRevenue / totalRegisteredSessions
      : basePrice;

    // Marginal counselor cost per camper-session
    const marginalCounselorCost = COUNSELOR_PAY_PER_SESSION / KIDS_PER_COUNSELOR; // $16
    const netPerSession = avgRevenuePerSession - marginalCounselorCost;

    // Sessions needed for various profit milestones
    // Revenue = sessions × avgRevenuePerSession
    // CounselorCost = sessions × marginalCounselorCost
    // Profit = Revenue - GYM_RENTAL_TOTAL - CounselorCost
    // Profit = sessions × netPerSession - GYM_RENTAL_TOTAL
    // sessions = (Profit + GYM_RENTAL_TOTAL) / netPerSession
    const sessionsForProfit = (targetProfit) => Math.ceil((targetProfit + GYM_RENTAL_TOTAL) / netPerSession);
    const revenueForProfit = (targetProfit) => sessionsForProfit(targetProfit) * avgRevenuePerSession;

    const milestones = [
      { label: 'Break Even', profit: 0, sessions: sessionsForProfit(0), revenue: revenueForProfit(0) },
    ];
    for (let p = 1000; p <= PROFIT_MAX; p += 1000) {
      milestones.push({ label: `$${(p / 1000).toFixed(0)}K Profit`, profit: p, sessions: sessionsForProfit(p), revenue: revenueForProfit(p) });
    }

    // Max sessions on chart
    const maxSessions = milestones[milestones.length - 1].sessions;

    // Per-day breakdown for the detail table
    const dayBreakdown = {};
    const rentalDates = gymRentals ? Object.keys(gymRentals).sort() : [];
    rentalDates.forEach(date => {
      dayBreakdown[date] = { morning: { campers: 0, counselors: 0 }, afternoon: { campers: 0, counselors: 0 } };
    });
    activeRegs.forEach(r => {
      if (!dayBreakdown[r.date]) return;
      (r.sessions || []).forEach(s => {
        if (dayBreakdown[r.date][s]) {
          dayBreakdown[r.date][s].campers++;
        }
      });
    });
    Object.values(dayBreakdown).forEach(day => {
      day.morning.counselors = Math.ceil(day.morning.campers / KIDS_PER_COUNSELOR);
      day.afternoon.counselors = Math.ceil(day.afternoon.campers / KIDS_PER_COUNSELOR);
    });

    return {
      basePrice, avgRevenuePerSession, marginalCounselorCost, netPerSession,
      paidSessions, unpaidSessions, totalRegisteredSessions,
      paidRevenue, unpaidRevenue, totalRegisteredRevenue,
      estimatedCounselorCost, totalFixedCosts, totalCosts,
      profitIfAllPay, profitPaidOnly,
      milestones, maxSessions,
      totalCounselorsNeeded, slotDetails, dayBreakdown, rentalDates
    };
  }, [registrations, counselors, counselorSchedule, gymRentals, content, sessionCost]);

  const {
    basePrice, avgRevenuePerSession, marginalCounselorCost, netPerSession,
    paidSessions, unpaidSessions, totalRegisteredSessions,
    paidRevenue, unpaidRevenue, totalRegisteredRevenue,
    estimatedCounselorCost, totalFixedCosts, totalCosts,
    profitIfAllPay, profitPaidOnly,
    milestones, maxSessions,
    totalCounselorsNeeded, dayBreakdown, rentalDates
  } = analysis;

  const fmt = (n) => '$' + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  const fmtFull = (n) => '$' + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Chart dimensions
  const chartWidth = 800;
  const chartHeight = 520;
  const leftMargin = 95;
  const rightMargin = 30;
  const topMargin = 40;
  const bottomMargin = 60;
  const barAreaWidth = chartWidth - leftMargin - rightMargin;
  const barHeight = 18;
  const barGap = 4;

  // Only show a subset of milestones on chart (break even + every $2K + $20K)
  const chartMilestones = milestones.filter((m, i) => i === 0 || m.profit % 2000 === 0);
  const rowHeight = barHeight + barGap;
  const adjustedChartHeight = topMargin + chartMilestones.length * rowHeight + bottomMargin;

  const xScale = (sessions) => leftMargin + (sessions / maxSessions) * barAreaWidth;
  const paidX = xScale(paidSessions);
  const registeredX = xScale(totalRegisteredSessions);

  const formatDate = (dateStr) => {
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  return (
    <div className="space-y-6">
      {/* Executive Summary */}
      <div className="bg-white rounded-xl shadow p-6">
        <h3 className="font-bold text-xl text-gray-800 mb-1">Projected Profits</h3>
        <p className="text-sm text-gray-500 mb-4">Financial projections based on current registrations, gym rental costs, and counselor pay.</p>

        {/* Top-line profit/loss */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className={`rounded-xl p-4 text-center border-2 ${profitPaidOnly >= 0 ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}`}>
            <p className="text-sm font-medium text-gray-600">Profit (Paid Only)</p>
            <p className={`text-3xl font-bold ${profitPaidOnly >= 0 ? 'text-green-700' : 'text-red-700'}`}>
              {profitPaidOnly < 0 ? '-' : ''}{fmt(profitPaidOnly)}
            </p>
            <p className="text-xs text-gray-500">{paidSessions} sessions collected</p>
          </div>
          <div className={`rounded-xl p-4 text-center border-2 border-dashed ${profitIfAllPay >= 0 ? 'bg-green-50 border-green-300' : 'bg-orange-50 border-orange-300'}`}>
            <p className="text-sm font-medium text-gray-600">Profit (If All Registered Pay)</p>
            <p className={`text-3xl font-bold ${profitIfAllPay >= 0 ? 'text-green-700' : 'text-orange-700'}`}>
              {profitIfAllPay < 0 ? '-' : ''}{fmt(profitIfAllPay)}
            </p>
            <p className="text-xs text-gray-500">{totalRegisteredSessions} total sessions</p>
          </div>
          <div className="bg-orange-50 border-2 border-orange-400 rounded-xl p-4 text-center">
            <p className="text-sm font-medium text-orange-700">Unpaid Gap — Chase the Money!</p>
            <p className="text-3xl font-bold text-orange-700">{fmt(unpaidRevenue)}</p>
            <p className="text-xs text-orange-600">{unpaidSessions} sessions registered but unpaid</p>
          </div>
        </div>
      </div>

      {/* Cost & Revenue Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Costs */}
        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="font-bold text-lg text-red-700 mb-3">Costs</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b">
              <div>
                <p className="font-medium text-gray-800">Gym Rental</p>
                <p className="text-xs text-gray-500">Magnuson CC — Permit #R282920 — {GYM_DAYS} days @ {fmt(GYM_DAILY_RATE)}/day + fees</p>
              </div>
              <p className="font-bold text-red-700">{fmtFull(totalFixedCosts)}</p>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <div>
                <p className="font-medium text-gray-800">Counselor Pay (estimated)</p>
                <p className="text-xs text-gray-500">{totalCounselorsNeeded} counselor-sessions @ {fmt(COUNSELOR_PAY_PER_SESSION)}/session — based on {totalRegisteredSessions} registered camper-sessions</p>
              </div>
              <p className="font-bold text-red-700">{fmtFull(estimatedCounselorCost)}</p>
            </div>
            <div className="flex justify-between items-center py-2 bg-red-50 rounded-lg px-3">
              <p className="font-bold text-gray-800">Total Estimated Costs</p>
              <p className="font-bold text-red-700 text-lg">{fmtFull(totalCosts)}</p>
            </div>
          </div>
        </div>

        {/* Revenue */}
        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="font-bold text-lg text-green-700 mb-3">Revenue</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b">
              <div>
                <p className="font-medium text-green-800">Paid Revenue</p>
                <p className="text-xs text-gray-500">{paidSessions} camper-sessions confirmed & paid</p>
              </div>
              <p className="font-bold text-green-700">{fmtFull(paidRevenue)}</p>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <div>
                <p className="font-medium text-orange-700">Unpaid Registered Revenue</p>
                <p className="text-xs text-orange-600">{unpaidSessions} camper-sessions registered but NOT paid</p>
              </div>
              <p className="font-bold text-orange-600">{fmtFull(unpaidRevenue)}</p>
            </div>
            <div className="flex justify-between items-center py-2 bg-green-50 rounded-lg px-3">
              <p className="font-bold text-gray-800">Total Potential Revenue</p>
              <p className="font-bold text-green-700 text-lg">{fmtFull(totalRegisteredRevenue)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Profit Milestone Chart */}
      <div className="bg-white rounded-xl shadow p-6">
        <h3 className="font-bold text-lg text-gray-800 mb-1">Sessions Needed for Profit Goals</h3>
        <p className="text-sm text-gray-500 mb-4">
          Each bar shows how many camper-sessions you need to sell to hit that profit level.
          Green fill = paid sessions ({paidSessions}). Orange fill = registered but unpaid ({unpaidSessions}). Gray = still needed.
        </p>

        <div className="overflow-x-auto -mx-2">
          <svg viewBox={`0 0 ${chartWidth} ${adjustedChartHeight}`} className="w-full max-w-4xl mx-auto" style={{ minWidth: '600px' }}>
            {/* Background */}
            <rect x="0" y="0" width={chartWidth} height={adjustedChartHeight} fill="white" rx="8" />

            {/* Column header */}
            <text x={leftMargin + barAreaWidth / 2} y={topMargin - 16} textAnchor="middle" fontSize="12" fill="#6b7280" fontWeight="600">
              Camper-Sessions Sold
            </text>

            {/* Milestone rows */}
            {chartMilestones.map((m, i) => {
              const y = topMargin + i * rowHeight;
              const barW = xScale(m.sessions) - leftMargin;
              const isBreakEven = m.profit === 0;

              return (
                <g key={m.label}>
                  {/* Alternating row background */}
                  {i % 2 === 0 && <rect x={leftMargin} y={y} width={barAreaWidth} height={rowHeight} fill="#f9fafb" />}

                  {/* Break-even line highlight */}
                  {isBreakEven && <rect x={leftMargin} y={y} width={barAreaWidth} height={rowHeight} fill="#fef3c7" />}

                  {/* Label */}
                  <text x={leftMargin - 8} y={y + barHeight / 2 + 1} textAnchor="end" fontSize="11" fill={isBreakEven ? '#92400e' : '#374151'} fontWeight={isBreakEven ? '700' : '500'} dominantBaseline="middle">
                    {m.label}
                  </text>

                  {/* Full bar background (gray = still needed) */}
                  <rect x={leftMargin} y={y + 1} width={barW} height={barHeight - 2} fill="#e5e7eb" rx="3" />

                  {/* Paid fill (green) */}
                  {paidSessions > 0 && (
                    <rect x={leftMargin} y={y + 1} width={Math.min(xScale(paidSessions) - leftMargin, barW)} height={barHeight - 2} fill="#22c55e" rx="3" />
                  )}

                  {/* Registered unpaid fill (orange) - starts after paid */}
                  {totalRegisteredSessions > paidSessions && (
                    <rect
                      x={Math.min(xScale(paidSessions), leftMargin + barW)}
                      y={y + 1}
                      width={Math.max(0, Math.min(xScale(totalRegisteredSessions), leftMargin + barW) - Math.min(xScale(paidSessions), leftMargin + barW))}
                      height={barHeight - 2}
                      fill="#fb923c"
                      rx="0"
                    />
                  )}

                  {/* Sessions count at end of bar */}
                  <text x={leftMargin + barW + 6} y={y + barHeight / 2 + 1} fontSize="10" fill="#6b7280" dominantBaseline="middle">
                    {m.sessions} sessions ({fmt(m.revenue)})
                  </text>
                </g>
              );
            })}

            {/* Current position markers */}
            {paidSessions > 0 && (
              <g>
                <line x1={paidX} y1={topMargin - 6} x2={paidX} y2={topMargin + chartMilestones.length * rowHeight} stroke="#15803d" strokeWidth="2" strokeDasharray="4,3" />
                <text x={paidX} y={topMargin + chartMilestones.length * rowHeight + 14} textAnchor="middle" fontSize="10" fill="#15803d" fontWeight="700">
                  Paid: {paidSessions}
                </text>
              </g>
            )}
            {totalRegisteredSessions > paidSessions && (
              <g>
                <line x1={registeredX} y1={topMargin - 6} x2={registeredX} y2={topMargin + chartMilestones.length * rowHeight} stroke="#ea580c" strokeWidth="2" strokeDasharray="4,3" />
                <text x={registeredX} y={topMargin + chartMilestones.length * rowHeight + 28} textAnchor="middle" fontSize="10" fill="#ea580c" fontWeight="700">
                  Registered: {totalRegisteredSessions}
                </text>
              </g>
            )}

            {/* Legend */}
            <g transform={`translate(${leftMargin}, ${topMargin + chartMilestones.length * rowHeight + 40})`}>
              <rect x="0" y="0" width="12" height="12" fill="#22c55e" rx="2" />
              <text x="16" y="10" fontSize="10" fill="#374151">Paid</text>
              <rect x="60" y="0" width="12" height="12" fill="#fb923c" rx="2" />
              <text x="76" y="10" fontSize="10" fill="#374151">Registered (Unpaid)</text>
              <rect x="190" y="0" width="12" height="12" fill="#e5e7eb" rx="2" />
              <text x="206" y="10" fontSize="10" fill="#374151">Still Needed</text>
            </g>
          </svg>
        </div>
      </div>

      {/* Unit Economics */}
      <div className="bg-white rounded-xl shadow p-6">
        <h3 className="font-bold text-lg text-gray-800 mb-3">Unit Economics</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500">Revenue per Session</p>
            <p className="text-xl font-bold text-gray-800">{fmtFull(avgRevenuePerSession)}</p>
            <p className="text-xs text-gray-400">{avgRevenuePerSession < basePrice ? '(avg w/ discounts)' : '(base price)'}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500">Counselor Cost per Session</p>
            <p className="text-xl font-bold text-red-600">{fmtFull(marginalCounselorCost)}</p>
            <p className="text-xs text-gray-400">{fmt(COUNSELOR_PAY_PER_SESSION)} / {KIDS_PER_COUNSELOR} kids</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500">Net per Session</p>
            <p className="text-xl font-bold text-green-700">{fmtFull(netPerSession)}</p>
            <p className="text-xs text-gray-400">after counselor cost</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500">Break-Even Sessions</p>
            <p className="text-xl font-bold text-amber-700">{milestones[0].sessions}</p>
            <p className="text-xs text-gray-400">to cover {fmt(GYM_RENTAL_TOTAL)} gym rental</p>
          </div>
        </div>
      </div>

      {/* Daily Breakdown Table */}
      {rentalDates.length > 0 && (
        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="font-bold text-lg text-gray-800 mb-1">Daily Breakdown</h3>
          <p className="text-sm text-gray-500 mb-4">Registered campers and estimated counselors needed per session.</p>
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b">
                  <th className="p-2 font-medium">Date</th>
                  <th className="p-2 font-medium text-center" colSpan="2">Morning (9 AM - 12 PM)</th>
                  <th className="p-2 font-medium text-center" colSpan="2">Afternoon (12 - 3 PM)</th>
                  <th className="p-2 font-medium text-right">Day Cost</th>
                  <th className="p-2 font-medium text-right">Day Revenue</th>
                </tr>
                <tr className="text-xs text-gray-400 border-b">
                  <th className="p-1"></th>
                  <th className="p-1 text-center font-normal">Campers</th>
                  <th className="p-1 text-center font-normal">Counselors</th>
                  <th className="p-1 text-center font-normal">Campers</th>
                  <th className="p-1 text-center font-normal">Counselors</th>
                  <th className="p-1"></th>
                  <th className="p-1"></th>
                </tr>
              </thead>
              <tbody>
                {rentalDates.map(date => {
                  const d = dayBreakdown[date];
                  if (!d) return null;
                  const dayCounselorCost = (d.morning.counselors + d.afternoon.counselors) * COUNSELOR_PAY_PER_SESSION;
                  const dayGymCost = GYM_DAILY_RATE;
                  const dayTotalCost = dayCounselorCost + dayGymCost;
                  const dayRevenue = (d.morning.campers + d.afternoon.campers) * avgRevenuePerSession;
                  const dayProfit = dayRevenue - dayTotalCost;
                  return (
                    <tr key={date} className="border-b hover:bg-gray-50">
                      <td className="p-2 font-medium">{formatDate(date)}</td>
                      <td className="p-2 text-center">{d.morning.campers || <span className="text-gray-300">0</span>}</td>
                      <td className="p-2 text-center text-gray-500">{d.morning.counselors || <span className="text-gray-300">0</span>}</td>
                      <td className="p-2 text-center">{d.afternoon.campers || <span className="text-gray-300">0</span>}</td>
                      <td className="p-2 text-center text-gray-500">{d.afternoon.counselors || <span className="text-gray-300">0</span>}</td>
                      <td className="p-2 text-right text-red-600">{fmt(dayTotalCost)}</td>
                      <td className="p-2 text-right text-green-700">{fmt(dayRevenue)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-300 font-bold">
                  <td className="p-2">Total</td>
                  <td className="p-2 text-center">{Object.values(dayBreakdown).reduce((s, d) => s + d.morning.campers, 0)}</td>
                  <td className="p-2 text-center text-gray-500">{Object.values(dayBreakdown).reduce((s, d) => s + d.morning.counselors, 0)}</td>
                  <td className="p-2 text-center">{Object.values(dayBreakdown).reduce((s, d) => s + d.afternoon.campers, 0)}</td>
                  <td className="p-2 text-center text-gray-500">{Object.values(dayBreakdown).reduce((s, d) => s + d.afternoon.counselors, 0)}</td>
                  <td className="p-2 text-right text-red-700">{fmt(totalCosts)}</td>
                  <td className="p-2 text-right text-green-700">{fmt(totalRegisteredRevenue)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Assumptions */}
      <div className="bg-gray-50 rounded-xl p-4 text-xs text-gray-500">
        <p className="font-medium text-gray-600 mb-1">Assumptions</p>
        <ul className="list-disc list-inside space-y-0.5">
          <li>Session price: {fmt(basePrice)}/camper-session{avgRevenuePerSession < basePrice ? ` (avg with discounts: ${fmtFull(avgRevenuePerSession)})` : ''}</li>
          <li>Counselor pay: {fmt(COUNSELOR_PAY_PER_SESSION)}/session, 1 counselor per {KIDS_PER_COUNSELOR} campers</li>
          <li>Gym rental: {fmt(GYM_RENTAL_TOTAL)} total ({GYM_DAYS} days — Magnuson Community Center permit #R282920)</li>
          <li>Counselor costs scale with registrations — more campers per session = more counselors needed</li>
          <li>Projections use average revenue per session to account for week/multi-week discounts</li>
        </ul>
      </div>
    </div>
  );
};
