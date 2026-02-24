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

// ==================== INVOICES SUB-TAB (Extracted for stable hook lifecycle) ====================
export const InvoicesSubTab = ({ registrations, users, addToHistory, showToast }) => {
// Collect all invoiced registrations grouped by invoiceId
const invoicedRegs = registrations.filter(r => r.invoiceId);
const byInvoice = {};
invoicedRegs.forEach(r => {
  if (!byInvoice[r.invoiceId]) byInvoice[r.invoiceId] = [];
  byInvoice[r.invoiceId].push(r);
});

const invoices = Object.entries(byInvoice).map(([invoiceId, regs]) => {
  const parent = users.find(u => u.email === regs[0].parentEmail);
  const camperNames = [...new Set(regs.map(r => r.camperName || r.childName))].join(', ');
  const totalAmount = regs.reduce((sum, r) => sum + (parseFloat(r.totalAmount) || 0), 0);
  const paidDate = regs[0]?.paymentConfirmedAt ? new Date(regs[0].paymentConfirmedAt) : null;
  return {
    invoiceId,
    regs,
    parentName: parent?.name || regs[0].parentName || '',
    parentEmail: regs[0].parentEmail || '',
    parentPhone: parent?.phone || '',
    camperNames,
    totalAmount,
    paidDate,
    sessionCount: regs.length
  };
});

// Executive summary totals
const newRegs = registrations.filter(r => r.status === 'pending' && r.paymentStatus === 'unpaid');
const pendingRegs = registrations.filter(r => r.status === 'pending' && ['sent', 'submitted'].includes(r.paymentStatus));
const paidRegs = registrations.filter(r => r.status === 'approved' && ['paid', 'confirmed'].includes(r.paymentStatus));
const newTotal = newRegs.reduce((s, r) => s + (parseFloat(r.totalAmount) || 0), 0);
const pendingTotal = pendingRegs.reduce((s, r) => s + (parseFloat(r.totalAmount) || 0), 0);
const paidTotal = paidRegs.reduce((s, r) => s + (parseFloat(r.totalAmount) || 0), 0);

// Search + Sort state
const [invoiceSearch, setInvoiceSearch] = React.useState('');
const [invoiceSort, setInvoiceSort] = React.useState('date-desc');
const [selectedInvoice, setSelectedInvoice] = React.useState(null);
const [emailForm, setEmailForm] = React.useState(null);
const [sendingEmail, setSendingEmail] = React.useState(false);

const filtered = invoices.filter(inv => {
  if (!invoiceSearch) return true;
  const q = invoiceSearch.toLowerCase();
  return inv.invoiceId.toLowerCase().includes(q)
    || inv.parentName.toLowerCase().includes(q)
    || inv.parentEmail.toLowerCase().includes(q)
    || inv.parentPhone.includes(q)
    || inv.camperNames.toLowerCase().includes(q)
    || inv.totalAmount.toFixed(2).includes(q);
});

const sorted = [...filtered].sort((a, b) => {
  switch (invoiceSort) {
    case 'date-desc': return (b.paidDate || 0) - (a.paidDate || 0);
    case 'date-asc': return (a.paidDate || 0) - (b.paidDate || 0);
    case 'amount-desc': return b.totalAmount - a.totalAmount;
    case 'amount-asc': return a.totalAmount - b.totalAmount;
    case 'parent-asc': return a.parentName.localeCompare(b.parentName);
    case 'parent-desc': return b.parentName.localeCompare(a.parentName);
    case 'invoice-asc': return a.invoiceId.localeCompare(b.invoiceId);
    case 'invoice-desc': return b.invoiceId.localeCompare(a.invoiceId);
    default: return 0;
  }
});

const buildInvoiceHtml = (inv) => {
  const sortedRegs = [...inv.regs].sort((a, b) => new Date(a.date) - new Date(b.date));
  const sessionRows = sortedRegs.map(r => `<tr><td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;">${r.camperName || r.childName}</td><td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;">${new Date(r.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</td><td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;">${(r.sessions || []).map(s => s === 'morning' ? 'AM' : 'PM').join(' + ')}</td><td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;text-align:right;">$${(parseFloat(r.totalAmount) || 0).toFixed(2)}</td></tr>`).join('');
  return `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;"><h2 style="color:#15803d;">Roosevelt Basketball Day Camp</h2><div style="background:#f0fdf4;border:2px solid #86efac;border-radius:8px;padding:16px;margin:16px 0;"><p style="margin:0 0 4px;font-size:13px;color:#666;">Invoice: <strong>${inv.invoiceId}</strong></p><p style="margin:0 0 4px;font-size:13px;color:#666;">Parent: <strong>${inv.parentName}</strong></p><p style="margin:0 0 12px;font-size:13px;color:#666;">Date: ${inv.paidDate ? inv.paidDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '—'}</p><table style="width:100%;border-collapse:collapse;font-size:14px;"><thead><tr style="background:#dcfce7;"><th style="padding:6px 10px;text-align:left;">Camper</th><th style="padding:6px 10px;text-align:left;">Date</th><th style="padding:6px 10px;text-align:left;">Session</th><th style="padding:6px 10px;text-align:right;">Amount</th></tr></thead><tbody>${sessionRows}</tbody><tfoot><tr><td colspan="3" style="padding:8px 10px;font-weight:bold;border-top:2px solid #15803d;">Total Paid</td><td style="padding:8px 10px;font-weight:bold;text-align:right;border-top:2px solid #15803d;color:#15803d;font-size:18px;">$${inv.totalAmount.toFixed(2)}</td></tr></tfoot></table></div><p style="color:#666;font-size:12px;">Roosevelt Basketball Day Camp — rhsbasketballdaycamp.com</p></div>`;
};

return (
<div className="space-y-6">
  {/* Executive Summary */}
  <div className="bg-white rounded-xl shadow p-6">
    <h3 className="font-bold text-xl text-gray-800 mb-4">📊 Revenue Summary</h3>
    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
      <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-4 text-center">
        <p className="text-sm text-orange-600 font-medium">New (Awaiting Payment)</p>
        <p className="text-2xl font-bold text-orange-700">${newTotal.toFixed(2)}</p>
        <p className="text-xs text-orange-500">{newRegs.length} session(s)</p>
      </div>
      <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 text-center">
        <p className="text-sm text-blue-600 font-medium">Pending Approval</p>
        <p className="text-2xl font-bold text-blue-700">${pendingTotal.toFixed(2)}</p>
        <p className="text-xs text-blue-500">{pendingRegs.length} session(s)</p>
      </div>
      <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 text-center">
        <p className="text-sm text-green-600 font-medium">Paid</p>
        <p className="text-2xl font-bold text-green-700">${paidTotal.toFixed(2)}</p>
        <p className="text-xs text-green-500">{paidRegs.length} session(s)</p>
      </div>
      <div className="bg-gray-50 border-2 border-gray-300 rounded-xl p-4 text-center">
        <p className="text-sm text-gray-600 font-medium">Total Registered</p>
        <p className="text-2xl font-bold text-gray-800">${(newTotal + pendingTotal + paidTotal).toFixed(2)}</p>
        <p className="text-xs text-gray-500">{newRegs.length + pendingRegs.length + paidRegs.length} session(s)</p>
      </div>
    </div>
  </div>

  {/* Invoices Table */}
  <div className="bg-white rounded-xl shadow p-6">
    <h3 className="font-bold text-xl text-purple-700 mb-2">🧾 Customer Invoices ({invoices.length})</h3>
    <p className="text-sm text-gray-500 mb-4">Click an invoice number to view details and email to parent.</p>

    {/* Search and Sort Controls */}
    <div className="flex flex-col sm:flex-row gap-3 mb-4">
      <div className="flex-1 relative">
        <input
          type="text"
          placeholder="Search by invoice #, parent, email, phone, camper, amount..."
          value={invoiceSearch}
          onChange={e => setInvoiceSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-300 focus:border-purple-400"
        />
        <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
      </div>
      <select
        value={invoiceSort}
        onChange={e => setInvoiceSort(e.target.value)}
        className="px-3 py-2 border rounded-lg bg-white text-sm"
      >
        <option value="date-desc">Date (Newest First)</option>
        <option value="date-asc">Date (Oldest First)</option>
        <option value="amount-desc">Amount (High to Low)</option>
        <option value="amount-asc">Amount (Low to High)</option>
        <option value="parent-asc">Parent (A to Z)</option>
        <option value="parent-desc">Parent (Z to A)</option>
        <option value="invoice-asc">Invoice # (A to Z)</option>
        <option value="invoice-desc">Invoice # (Z to A)</option>
      </select>
    </div>

    {sorted.length === 0 ? (
      <div className="text-center py-6 text-gray-400">
        <p className="text-3xl mb-2">🧾</p>
        <p>{invoices.length === 0 ? 'No invoices yet' : 'No invoices match your search'}</p>
      </div>
    ) : (
      <div className="overflow-x-auto -mx-4 sm:mx-0">
        <table className="w-full min-w-[700px] text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-500 border-b">
              <th className="p-2 font-medium">Invoice #</th>
              <th className="p-2 font-medium">Date</th>
              <th className="p-2 font-medium">Parent</th>
              <th className="p-2 font-medium">Email</th>
              <th className="p-2 font-medium">Phone</th>
              <th className="p-2 font-medium">Camper(s)</th>
              <th className="p-2 font-medium text-center">Sessions</th>
              <th className="p-2 font-medium text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(inv => (
              <tr key={inv.invoiceId} className="border-b hover:bg-purple-50 transition-colors cursor-pointer" onClick={() => setSelectedInvoice(inv)}>
                <td className="p-2 font-mono font-bold text-purple-700 underline">{inv.invoiceId}</td>
                <td className="p-2 text-gray-600">{inv.paidDate ? inv.paidDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</td>
                <td className="p-2 font-medium">{inv.parentName}</td>
                <td className="p-2 text-gray-600">{inv.parentEmail}</td>
                <td className="p-2 text-gray-600">{inv.parentPhone || '—'}</td>
                <td className="p-2">{inv.camperNames}</td>
                <td className="p-2 text-center">{inv.sessionCount}</td>
                <td className="p-2 text-right font-bold text-green-700">${inv.totalAmount.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-300">
              <td colSpan="6" className="p-2 font-bold text-right">Total ({sorted.length} invoices)</td>
              <td className="p-2 text-center font-bold">{sorted.reduce((sum, inv) => sum + inv.sessionCount, 0)}</td>
              <td className="p-2 text-right font-bold text-green-700 text-lg">${sorted.reduce((sum, inv) => sum + inv.totalAmount, 0).toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    )}
  </div>

  {/* Invoice Detail Modal */}
  {selectedInvoice && !emailForm && (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedInvoice(null)}>
      <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-4">
          <h3 className="font-bold text-xl text-purple-700">Invoice {selectedInvoice.invoiceId}</h3>
          <button onClick={() => setSelectedInvoice(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>
        <div className="space-y-3 mb-4">
          <div className="flex justify-between text-sm"><span className="text-gray-500">Parent:</span><span className="font-medium">{selectedInvoice.parentName}</span></div>
          <div className="flex justify-between text-sm"><span className="text-gray-500">Email:</span><span>{selectedInvoice.parentEmail}</span></div>
          {selectedInvoice.parentPhone && <div className="flex justify-between text-sm"><span className="text-gray-500">Phone:</span><span>{selectedInvoice.parentPhone}</span></div>}
          <div className="flex justify-between text-sm"><span className="text-gray-500">Date Paid:</span><span>{selectedInvoice.paidDate ? selectedInvoice.paidDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '—'}</span></div>
        </div>
        <div className="border rounded-lg overflow-hidden mb-4">
          <table className="w-full text-sm">
            <thead><tr className="bg-green-50"><th className="p-2 text-left">Camper</th><th className="p-2 text-left">Date</th><th className="p-2 text-left">Session</th><th className="p-2 text-right">Amount</th></tr></thead>
            <tbody>
              {[...selectedInvoice.regs].sort((a, b) => new Date(a.date) - new Date(b.date)).map(r => (
                <tr key={r.id} className="border-t">
                  <td className="p-2">{r.camperName || r.childName}</td>
                  <td className="p-2 text-gray-600">{new Date(r.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</td>
                  <td className="p-2 text-gray-600">{(r.sessions || []).map(s => s === 'morning' ? 'AM' : 'PM').join(' + ')}</td>
                  <td className="p-2 text-right font-medium">${(parseFloat(r.totalAmount) || 0).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr className="border-t-2 border-green-600"><td colSpan="3" className="p-2 font-bold">Total</td><td className="p-2 text-right font-bold text-green-700 text-lg">${selectedInvoice.totalAmount.toFixed(2)}</td></tr></tfoot>
          </table>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => {
              setEmailForm({
                to: selectedInvoice.parentEmail,
                cc: '',
                subject: `Invoice ${selectedInvoice.invoiceId} — Roosevelt Basketball Day Camp`,
                body: `Hi ${selectedInvoice.parentName},\n\nPlease find your invoice details below for Roosevelt Basketball Day Camp.\n\nIf you have any questions, please don't hesitate to reach out.\n\nThank you,\nRoosevelt Basketball Day Camp`
              });
            }}
            className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-green-700"
          >
            Email Invoice to Parent
          </button>
          <button onClick={() => setSelectedInvoice(null)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">Close</button>
        </div>
      </div>
    </div>
  )}

  {/* Email Invoice Modal */}
  {selectedInvoice && emailForm && (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setEmailForm(null)}>
      <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-4">
          <h3 className="font-bold text-lg text-green-700">Email Invoice {selectedInvoice.invoiceId}</h3>
          <button onClick={() => setEmailForm(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
            <input type="email" value={emailForm.to} readOnly className="w-full px-3 py-2 border rounded-lg bg-gray-50 text-gray-600" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">CC (comma-separated)</label>
            <input type="text" value={emailForm.cc} onChange={e => setEmailForm(prev => ({ ...prev, cc: e.target.value }))} className="w-full px-3 py-2 border rounded-lg" placeholder="email1@example.com, email2@example.com" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
            <input type="text" value={emailForm.subject} onChange={e => setEmailForm(prev => ({ ...prev, subject: e.target.value }))} className="w-full px-3 py-2 border rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Message (appears above invoice)</label>
            <textarea value={emailForm.body} onChange={e => setEmailForm(prev => ({ ...prev, body: e.target.value }))} rows="5" className="w-full px-3 py-2 border rounded-lg resize-y" />
          </div>
          <div className="bg-gray-50 rounded-lg p-3 border">
            <p className="text-xs text-gray-500 mb-2">Invoice preview (attached below your message):</p>
            <p className="text-sm font-mono text-purple-700">{selectedInvoice.invoiceId} — {selectedInvoice.camperNames} — ${selectedInvoice.totalAmount.toFixed(2)}</p>
          </div>
        </div>
        <div className="flex gap-3 mt-4">
          <button
            disabled={sendingEmail}
            onClick={async () => {
              setSendingEmail(true);
              try {
                const recipients = [emailForm.to, ...emailForm.cc.split(',').map(e => e.trim()).filter(Boolean)];
                const bodyHtml = emailForm.body.split('\n').map(line => `<p style="margin:0 0 8px;">${line || '&nbsp;'}</p>`).join('');
                const invoiceHtml = buildInvoiceHtml(selectedInvoice);
                await fetch('/.netlify/functions/send-email', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    to: recipients,
                    subject: emailForm.subject,
                    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">${bodyHtml}<hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />${invoiceHtml}</div>`
                  })
                });
                addToHistory('Invoice Emailed', `Emailed invoice ${selectedInvoice.invoiceId} ($${selectedInvoice.totalAmount.toFixed(2)}) to ${recipients.join(', ')}`, [selectedInvoice.parentEmail]);
                showToast(`Invoice emailed to ${emailForm.to}`);
                setEmailForm(null);
                setSelectedInvoice(null);
              } catch (err) {
                console.error('Email invoice failed:', err);
                showToast('Failed to send email. Please try again.');
              }
              setSendingEmail(false);
            }}
            className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
          >
            {sendingEmail ? 'Sending...' : 'Send Email'}
          </button>
          <button onClick={() => setEmailForm(null)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">Cancel</button>
        </div>
      </div>
    </div>
  )}
</div>
);
};

