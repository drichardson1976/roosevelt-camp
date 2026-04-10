import React, { useMemo } from 'react';

// ==================== PROJECTED PROFITS SUB-TAB ====================
// Financial constants from gym permit #R282920 (Magnuson CC, Aug 17-28 2026)
const GYM_RENTAL_TOTAL = 5929; // $5,929 total permit fee
const GYM_DAILY_RATE = 564;    // $94/hr × 6 hrs
const GYM_DAYS = 10;           // Aug 17-21 + Aug 24-28
const COUNSELOR_PAY_PER_SESSION = 80;  // $80/session (3 hrs)
const KIDS_PER_COUNSELOR = 5;
const PROFIT_MAX = 20000; // Chart goes up to $20K profit
const PAYMENT_PROCESSING_RATE = 0.029; // 2.9% Stripe/Venmo business fee
const PAYMENT_PROCESSING_FIXED = 0.30; // $0.30 per transaction (estimated)
const MAX_CAMPERS_PER_SESSION = 30;
const SESSIONS_PER_DAY = 2;
const MAX_CAPACITY = MAX_CAMPERS_PER_SESSION * SESSIONS_PER_DAY * GYM_DAYS; // 600
const DONATION_RATE = 0.50; // 50% of profit donated to RHS Girls Varsity Basketball

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
    // ProcessingFees = Revenue × PAYMENT_PROCESSING_RATE + estimatedTransactions × PAYMENT_PROCESSING_FIXED
    // Profit = Revenue - GYM_RENTAL_TOTAL - CounselorCost - ProcessingFees
    // For simplicity, estimate ~2 sessions per transaction (AM+PM same day)
    const processingPctCost = avgRevenuePerSession * PAYMENT_PROCESSING_RATE + PAYMENT_PROCESSING_FIXED * 0.5; // ~$0.30 per 2 sessions
    const netPerSessionAfterFees = avgRevenuePerSession - marginalCounselorCost - processingPctCost;
    const sessionsForProfit = (targetProfit) => Math.ceil((targetProfit + GYM_RENTAL_TOTAL) / netPerSessionAfterFees);

    const buildMilestone = (targetProfit, label) => {
      const sessions = sessionsForProfit(targetProfit);
      const revenue = sessions * avgRevenuePerSession;
      const counselorCost = sessions * marginalCounselorCost;
      const processingFees = revenue * PAYMENT_PROCESSING_RATE + (sessions * 0.5) * PAYMENT_PROCESSING_FIXED;
      const profit = revenue - GYM_RENTAL_TOTAL - counselorCost - processingFees;
      const donation = Math.max(0, profit * DONATION_RATE);
      const netProfit = profit - donation;
      return { label, profit: targetProfit, actualProfit: profit, sessions, revenue, gymCost: GYM_RENTAL_TOTAL, counselorCost, processingFees, donation, netProfit, overCapacity: sessions > MAX_CAPACITY };
    };

    const milestones = [buildMilestone(0, 'Break Even')];
    for (let p = 1000; p <= PROFIT_MAX; p += 1000) {
      milestones.push(buildMilestone(p, `$${(p / 1000).toFixed(0)}K`));
    }

    // Filter out milestones that exceed max capacity
    const reachableMilestones = milestones.filter(m => m.sessions <= MAX_CAPACITY);
    // Max revenue on chart (for scaling bars by revenue) — capped at capacity
    const maxRevenueAtCapacity = MAX_CAPACITY * avgRevenuePerSession;
    const maxRevenue = reachableMilestones.length > 0 ? Math.max(reachableMilestones[reachableMilestones.length - 1].revenue, maxRevenueAtCapacity) : maxRevenueAtCapacity;
    const maxSessions = MAX_CAPACITY;

    // Per-day breakdown for the detail table — only camp dates (Aug 17-28)
    const CAMP_START = '2026-08-17';
    const CAMP_END = '2026-08-28';
    const dayBreakdown = {};
    const rentalDates = gymRentals
      ? Object.keys(gymRentals).filter(d => d >= CAMP_START && d <= CAMP_END).sort()
      : [];
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

    // Estimated processing fees for current registrations
    const estimatedProcessingFees = totalRegisteredRevenue * PAYMENT_PROCESSING_RATE + (totalRegisteredSessions * 0.5) * PAYMENT_PROCESSING_FIXED;
    const totalCostsWithFees = totalFixedCosts + estimatedCounselorCost + estimatedProcessingFees;
    const profitIfAllPayWithFees = totalRegisteredRevenue - totalCostsWithFees;
    const paidProcessingFees = paidRevenue * PAYMENT_PROCESSING_RATE + (paidSessions * 0.5) * PAYMENT_PROCESSING_FIXED;
    const profitPaidOnlyWithFees = paidRevenue - totalFixedCosts - (paidSessions * marginalCounselorCost) - paidProcessingFees;

    return {
      basePrice, avgRevenuePerSession, marginalCounselorCost, netPerSession,
      paidSessions, unpaidSessions, totalRegisteredSessions,
      paidRevenue, unpaidRevenue, totalRegisteredRevenue,
      estimatedCounselorCost, totalFixedCosts, totalCosts: totalCostsWithFees,
      estimatedProcessingFees,
      profitIfAllPay: profitIfAllPayWithFees, profitPaidOnly: profitPaidOnlyWithFees,
      milestones, reachableMilestones, maxSessions, maxRevenue,
      totalCounselorsNeeded, slotDetails, dayBreakdown, rentalDates
    };
  }, [registrations, counselors, counselorSchedule, gymRentals, content, sessionCost]);

  const {
    basePrice, avgRevenuePerSession, marginalCounselorCost, netPerSession,
    paidSessions, unpaidSessions, totalRegisteredSessions,
    paidRevenue, unpaidRevenue, totalRegisteredRevenue,
    estimatedCounselorCost, totalFixedCosts, totalCosts,
    estimatedProcessingFees,
    profitIfAllPay, profitPaidOnly,
    milestones, reachableMilestones, maxSessions, maxRevenue,
    totalCounselorsNeeded, dayBreakdown, rentalDates
  } = analysis;

  const fmt = (n) => '$' + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  const fmtFull = (n) => '$' + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Chart dimensions
  const chartWidth = 960;
  const leftMargin = 110;
  const rightMargin = 240;
  const currentBarHeight = 54; // 3× the milestone bar height
  const currentBarGap = 16;
  const topMargin = 40 + currentBarHeight + currentBarGap;
  const bottomMargin = 50;
  const barAreaWidth = chartWidth - leftMargin - rightMargin;
  const barHeight = 20;
  const barGap = 4;

  // Only show a subset of reachable milestones on chart (break even + every $2K)
  const chartMilestones = reachableMilestones.filter((m, i) => i === 0 || m.profit % 2000 === 0);
  const rowHeight = barHeight + barGap;
  const adjustedChartHeight = topMargin + chartMilestones.length * rowHeight + bottomMargin;

  // Scale bars by revenue (proportional to total money flowing through)
  const revenueScale = (rev) => leftMargin + (rev / maxRevenue) * barAreaWidth;

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
            <div className="flex justify-between items-center py-2 border-b">
              <div>
                <p className="font-medium text-gray-800">Payment Processing Fees (estimated)</p>
                <p className="text-xs text-gray-500">~2.9% + $0.30/transaction on {fmtFull(totalRegisteredRevenue)} registered revenue</p>
              </div>
              <p className="font-bold text-red-700">{fmtFull(estimatedProcessingFees)}</p>
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
        <h3 className="font-bold text-lg text-gray-800 mb-1">Where the Money Goes at Each Profit Goal</h3>
        <p className="text-sm text-gray-500 mb-4">
          Each bar shows total revenue at that session count, broken down by cost category and remaining profit.
        </p>

        <div className="overflow-x-auto -mx-2">
          <svg viewBox={`0 0 ${chartWidth} ${adjustedChartHeight}`} className="w-full max-w-4xl mx-auto" style={{ minWidth: '600px' }}>
            {/* Background */}
            <rect x="0" y="0" width={chartWidth} height={adjustedChartHeight} fill="white" rx="8" />

            {/* ====== CURRENT STATUS BAR (3× height) ====== */}
            {(() => {
              const cy = 30;
              const currentRevenue = paidRevenue;
              const currentSessions = paidSessions;
              const currentCounselorCost = currentSessions * marginalCounselorCost;
              const currentFees = currentRevenue * 0.029 + (currentSessions * 0.5) * 0.30;
              const currentGrossProfit = currentRevenue - GYM_RENTAL_TOTAL - currentCounselorCost - currentFees;
              const currentDonation = Math.max(0, currentGrossProfit * DONATION_RATE);
              const currentNetProfit = currentGrossProfit - currentDonation;
              const totalBarW = currentRevenue > 0 ? (currentRevenue / maxRevenue) * barAreaWidth : 0;

              // Segment widths
              const gW = currentRevenue > 0 ? (GYM_RENTAL_TOTAL / currentRevenue) * totalBarW : 0;
              const cW = currentRevenue > 0 ? (currentCounselorCost / currentRevenue) * totalBarW : 0;
              const fW = currentRevenue > 0 ? (currentFees / currentRevenue) * totalBarW : 0;
              const dW = currentRevenue > 0 && currentDonation > 0 ? (currentDonation / currentRevenue) * totalBarW : 0;
              const pW = Math.max(0, totalBarW - gW - cW - fW - dW);

              return (
                <g>
                  {/* Background for current bar area */}
                  <rect x={leftMargin} y={cy} width={barAreaWidth} height={currentBarHeight} fill="#f0fdf4" rx="4" stroke="#86efac" strokeWidth="1" />

                  {/* Label */}
                  <text x={leftMargin - 8} y={cy + currentBarHeight / 2} textAnchor="end" fontSize="13" fill="#15803d" fontWeight="700" dominantBaseline="middle">
                    Current
                  </text>
                  <text x={leftMargin - 8} y={cy + currentBarHeight / 2 + 14} textAnchor="end" fontSize="10" fill="#6b7280" dominantBaseline="middle">
                    {currentSessions} paid
                  </text>

                  {/* Stacked segments */}
                  {totalBarW > 0 && (
                    <>
                      <rect x={leftMargin} y={cy + 4} width={gW} height={currentBarHeight - 8} fill="#ef4444" rx="4" />
                      <rect x={leftMargin + gW} y={cy + 4} width={cW} height={currentBarHeight - 8} fill="#f97316" />
                      <rect x={leftMargin + gW + cW} y={cy + 4} width={fW} height={currentBarHeight - 8} fill="#6366f1" />
                      {dW > 0 && <rect x={leftMargin + gW + cW + fW} y={cy + 4} width={dW} height={currentBarHeight - 8} fill="#ec4899" />}
                      {pW > 0 && <rect x={leftMargin + gW + cW + fW + dW} y={cy + 4} width={pW} height={currentBarHeight - 8} fill="#22c55e" rx="4" />}
                    </>
                  )}

                  {/* Profit/loss label — to the right of bar */}
                  <text x={leftMargin + barAreaWidth + 8} y={cy + currentBarHeight / 2 - 8} fontSize="14" fill={currentGrossProfit >= 0 ? '#15803d' : '#dc2626'} fontWeight="700" dominantBaseline="middle">
                    {currentGrossProfit < 0 ? '-' : ''}{fmt(currentGrossProfit)} {currentGrossProfit >= 0 ? 'profit' : 'loss'}
                  </text>
                  <text x={leftMargin + barAreaWidth + 8} y={cy + currentBarHeight / 2 + 6} fontSize="11" fill="#6b7280" dominantBaseline="middle">
                    {fmtFull(paidRevenue)} revenue from {paidSessions} sessions
                  </text>
                  {currentDonation > 0 && (
                    <text x={leftMargin + barAreaWidth + 8} y={cy + currentBarHeight / 2 + 20} fontSize="11" fill="#ec4899" fontWeight="600" dominantBaseline="middle">
                      {fmt(currentDonation)} to RHS Girls Basketball
                    </text>
                  )}
                  {currentGrossProfit < 0 && (
                    <text x={leftMargin + barAreaWidth + 8} y={cy + currentBarHeight / 2 + 20} fontSize="11" fill="#9ca3af" dominantBaseline="middle">
                      {milestones[0].sessions - currentSessions} more sessions to break even
                    </text>
                  )}
                </g>
              );
            })()}

            {/* Separator line */}
            <line x1={leftMargin} y1={topMargin - currentBarGap / 2} x2={leftMargin + barAreaWidth} y2={topMargin - currentBarGap / 2} stroke="#e5e7eb" strokeWidth="1" strokeDasharray="4,4" />

            {/* Column header */}
            <text x={leftMargin + barAreaWidth / 2} y={topMargin - 4} textAnchor="middle" fontSize="11" fill="#9ca3af" fontWeight="500">
              Profit Goals
            </text>

            {/* Milestone rows */}
            {chartMilestones.map((m, i) => {
              const y = topMargin + i * rowHeight;
              const totalBarW = revenueScale(m.revenue) - leftMargin;
              const isBreakEven = m.profit === 0;

              // Cost segment widths (proportional to revenue)
              const gymW = (m.gymCost / m.revenue) * totalBarW;
              const counselorW = (m.counselorCost / m.revenue) * totalBarW;
              const feesW = (m.processingFees / m.revenue) * totalBarW;
              const donationW = (m.donation / m.revenue) * totalBarW;
              const netProfitW = Math.max(0, totalBarW - gymW - counselorW - feesW - donationW);

              // Precompute x offsets for stacked segments
              const gymX = leftMargin;
              const counselorX = gymX + gymW;
              const feesX = counselorX + counselorW;
              const donationX = feesX + feesW;
              const profitX = donationX + donationW;

              return (
                <g key={m.label}>
                  {/* Alternating row background */}
                  {i % 2 === 0 && <rect x={leftMargin} y={y} width={barAreaWidth} height={rowHeight} fill="#f9fafb" />}

                  {/* Break-even row highlight */}
                  {isBreakEven && <rect x={leftMargin} y={y} width={barAreaWidth} height={rowHeight} fill="#fef3c7" />}

                  {/* Left label: session count */}
                  <text x={leftMargin - 8} y={y + barHeight / 2 + 1} textAnchor="end" fontSize="11" fill={isBreakEven ? '#92400e' : '#374151'} fontWeight={isBreakEven ? '700' : '500'} dominantBaseline="middle">
                    {m.sessions} sessions
                  </text>

                  {/* Stacked bar segments */}
                  {/* Gym Rental (red) */}
                  <rect x={gymX} y={y + 1} width={gymW} height={barHeight - 2} fill="#ef4444" rx="3" />

                  {/* Counselor Pay (orange) */}
                  <rect x={counselorX} y={y + 1} width={counselorW} height={barHeight - 2} fill="#f97316" />

                  {/* Processing Fees (indigo) */}
                  <rect x={feesX} y={y + 1} width={feesW} height={barHeight - 2} fill="#6366f1" />

                  {/* RHS Donation (pink/rose) */}
                  {donationW > 0 && (
                    <rect x={donationX} y={y + 1} width={donationW} height={barHeight - 2} fill="#ec4899" />
                  )}

                  {/* Net Profit (green) */}
                  {netProfitW > 0 && (
                    <rect x={profitX} y={y + 1} width={netProfitW} height={barHeight - 2} fill="#22c55e" rx="3" />
                  )}

                  {/* Right label: profit amount — fixed position right of bar area */}
                  <text x={leftMargin + barAreaWidth + 8} y={y + barHeight / 2 + 1} fontSize="11" fill={isBreakEven ? '#92400e' : '#15803d'} fontWeight="600" dominantBaseline="middle">
                    {isBreakEven ? 'Break Even' : fmt(m.profit) + ' profit' + (m.donation > 0 ? ' (' + fmt(m.donation) + ' to RHS)' : '')}
                  </text>
                </g>
              );
            })}

            {/* Legend */}
            <g transform={`translate(${leftMargin}, ${topMargin + chartMilestones.length * rowHeight + 12})`}>
              <rect x="0" y="0" width="12" height="12" fill="#ef4444" rx="2" />
              <text x="16" y="10" fontSize="10" fill="#374151">Gym Rental</text>
              <rect x="90" y="0" width="12" height="12" fill="#f97316" rx="2" />
              <text x="106" y="10" fontSize="10" fill="#374151">Counselor Pay</text>
              <rect x="200" y="0" width="12" height="12" fill="#6366f1" rx="2" />
              <text x="216" y="10" fontSize="10" fill="#374151">Processing Fees</text>
              <rect x="320" y="0" width="12" height="12" fill="#ec4899" rx="2" />
              <text x="336" y="10" fontSize="10" fill="#374151">RHS Donation (50%)</text>
              <rect x="450" y="0" width="12" height="12" fill="#22c55e" rx="2" />
              <text x="466" y="10" fontSize="10" fill="#374151">Net Profit</text>
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
                  <th className="p-2 font-medium text-right">Gym Rental</th>
                  <th className="p-2 font-medium text-right">Counselor Pay</th>
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
                  <th className="p-1"></th>
                </tr>
              </thead>
              <tbody>
                {rentalDates.map(date => {
                  const d = dayBreakdown[date];
                  if (!d) return null;
                  const dayCounselorCost = (d.morning.counselors + d.afternoon.counselors) * COUNSELOR_PAY_PER_SESSION;
                  const dayRevenue = (d.morning.campers + d.afternoon.campers) * avgRevenuePerSession;
                  return (
                    <tr key={date} className="border-b hover:bg-gray-50">
                      <td className="p-2 font-medium">{formatDate(date)}</td>
                      <td className="p-2 text-center">{d.morning.campers || <span className="text-gray-300">0</span>}</td>
                      <td className="p-2 text-center text-gray-500">{d.morning.counselors || <span className="text-gray-300">0</span>}</td>
                      <td className="p-2 text-center">{d.afternoon.campers || <span className="text-gray-300">0</span>}</td>
                      <td className="p-2 text-center text-gray-500">{d.afternoon.counselors || <span className="text-gray-300">0</span>}</td>
                      <td className="p-2 text-right text-red-600">{fmt(GYM_DAILY_RATE)}</td>
                      <td className="p-2 text-right text-orange-600">{dayCounselorCost > 0 ? fmt(dayCounselorCost) : <span className="text-gray-300">$0</span>}</td>
                      <td className="p-2 text-right text-green-700">{dayRevenue > 0 ? fmt(dayRevenue) : <span className="text-gray-300">$0</span>}</td>
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
                  <td className="p-2 text-right text-red-700">{fmt(GYM_DAILY_RATE * rentalDates.length)}</td>
                  <td className="p-2 text-right text-orange-700">{fmt(Object.values(dayBreakdown).reduce((s, d) => s + (d.morning.counselors + d.afternoon.counselors) * COUNSELOR_PAY_PER_SESSION, 0))}</td>
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
          <li>Payment processing: {(PAYMENT_PROCESSING_RATE * 100).toFixed(1)}% + {fmtFull(PAYMENT_PROCESSING_FIXED)}/transaction (Stripe/Venmo business rate)</li>
          <li>Counselor costs scale with registrations — more campers per session = more counselors needed</li>
          <li>Projections use average revenue per session to account for week/multi-week discounts</li>
        </ul>
      </div>
    </div>
  );
};
