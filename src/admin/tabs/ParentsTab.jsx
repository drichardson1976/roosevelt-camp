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
import { ParentOnboarding } from '../components/ParentOnboardingWizard';

// ==================== PARENTS TAB ====================
export const ParentsTab = ({ parents, registrations, onUpdateParents, onDeleteParent, onUpdateRegistrations, onDeleteRegistration, showToast, addToHistory, campers, camperParentLinks, onSaveLinks, onSaveCampers, onSaveCamperParentLinks, emergencyContacts, saveEmergencyContacts, saveOnboardingProgress }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedParents, setSelectedParents] = useState([]);
  const [expandedParent, setExpandedParent] = useState(null);
  // Admin edit/delete state
  const [editingParent, setEditingParent] = useState(null);
  const [editingChild, setEditingChild] = useState(null);
  const [editingReg, setEditingReg] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null); // { type: 'parent'|'child'|'registration', data: ... }
  // Add parent state - use full onboarding flow
  const [showAddParent, setShowAddParent] = useState(false);
  // Manage campers for parent
  const [managingCampers, setManagingCampers] = useState(null);
  // Create registration for parent
  const [creatingRegFor, setCreatingRegFor] = useState(null); // parent object
  const [newReg, setNewReg] = useState({ camperId: '', date: '', sessions: [] });

  // Get all campers
  const getAllCampers = () => campers || [];

  // Get campers linked to a parent
  const getParentCampers = (parentEmail) => {
    const linkedCamperIds = (camperParentLinks || [])
      .filter(l => l.parentEmail === parentEmail)
      .map(l => l.camperId);
    return (campers || []).filter(c => linkedCamperIds.includes(c.id));
  };


  const toggleCamperLink = (parentEmail, camperId) => {
    const exists = (camperParentLinks || []).some(l => l.camperId === camperId && l.parentEmail === parentEmail);
    if (exists) {
      onSaveLinks(camperParentLinks.filter(l => !(l.camperId === camperId && l.parentEmail === parentEmail)));
    } else {
      onSaveLinks([...(camperParentLinks || []), { camperId, parentEmail }]);
    }
  };

  const parentUsers = parents; // Now using separate parents table
  const filteredUsers = parentUsers.filter(u =>
    u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getParentRegs = (email) => registrations.filter(r => r.parentEmail === email);

  const toggleSelectParent = (email) => {
    setSelectedParents(prev =>
      prev.includes(email) ? prev.filter(e => e !== email) : [...prev, email]
    );
  };

  const selectAll = () => {
    if (selectedParents.length === filteredUsers.length) {
      setSelectedParents([]);
    } else {
      setSelectedParents(filteredUsers.map(u => u.email));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with search and actions */}
      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="font-bold text-xl text-green-800">👨‍👩‍👧 Parents</h3>
            <p className="text-sm text-gray-500">{parentUsers.length} registered parents</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowAddParent(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              + Add Parent
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="flex gap-4 items-center">
          <input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search parents by name or email..."
            className="flex-1 px-4 py-2 border rounded-lg"
            autoComplete="off"
            data-1p-ignore="true"
          />
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={selectedParents.length === filteredUsers.length && filteredUsers.length > 0}
              onChange={selectAll}
              className="w-4 h-4"
            />
            Select All
          </label>
        </div>
      </div>

      {/* Parents List */}
      {filteredUsers.length === 0 ? (
        <div className="bg-white rounded-xl shadow p-12 text-center text-gray-500">
          <p className="text-4xl mb-4">👨‍👩‍👧</p>
          <p>{parentUsers.length === 0 ? 'No parents have registered yet' : 'No parents match your search'}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredUsers.map(parent => {
            const regs = getParentRegs(parent.email);
            const isExpanded = expandedParent === parent.email;
            const countParentOrders = (filterFn) => new Set(regs.filter(filterFn).map(r => r.orderId || r.id)).size;
            const newRegs = countParentOrders(r => r.status === 'pending' && r.paymentStatus === 'unpaid');
            const pendingRegs = countParentOrders(r => r.status === 'pending' && ['sent', 'submitted'].includes(r.paymentStatus));
            const approvedRegs = countParentOrders(r => r.status === 'approved');
            const campersList = getParentCampers(parent.email);

            return (
              <div key={parent.email} className="bg-white rounded-xl shadow overflow-hidden">
                {/* Parent Header */}
                <div className="p-4 flex items-center gap-4">
                  <input
                    type="checkbox"
                    checked={selectedParents.includes(parent.email)}
                    onChange={() => toggleSelectParent(parent.email)}
                    className="w-5 h-5"
                  />

                  <div
                    className="flex-1 cursor-pointer"
                    onClick={() => setExpandedParent(isExpanded ? null : parent.email)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-green-200 flex items-center justify-center text-xl font-bold text-green-700">
                        {parent.name?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-800">{parent.name}</span>
                          {(() => {
                            const hasGoogle = parent.googleLinked || parent.lastLoginMethod === 'Google';
                            const hasPassword = !!parent.password;
                            if (hasGoogle && hasPassword) return <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-purple-100 text-purple-700">🔑 Google + Email/Password</span>;
                            if (hasGoogle) return <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-purple-100 text-purple-700">G Google</span>;
                            if (hasPassword) return <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-100 text-blue-700">🔑 Email/Password</span>;
                            return <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-500">⚠️ No Login</span>;
                          })()}
                        </div>
                        <div className="text-sm text-gray-500">{parent.email}</div>
                        {parent.phone && <div className="text-sm text-gray-500">{parent.phone}</div>}
                      </div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex gap-3 text-center flex-wrap">
                    <div title="Campers linked to this parent">
                      <div className="text-lg font-bold text-teal-600">{campersList.length}</div>
                      <div className="text-xs text-gray-500">Campers</div>
                    </div>
                    <div title="New registrations (unpaid)">
                      <div className={`text-lg font-bold ${newRegs > 0 ? 'text-red-600' : 'text-gray-400'}`}>{newRegs}</div>
                      <div className="text-xs text-gray-500">New</div>
                    </div>
                    <div title="Pending approval (payment sent)">
                      <div className={`text-lg font-bold ${pendingRegs > 0 ? 'text-yellow-600' : 'text-gray-400'}`}>{pendingRegs}</div>
                      <div className="text-xs text-gray-500">Pending</div>
                    </div>
                    <div title="Paid registrations">
                      <div className={`text-lg font-bold ${approvedRegs > 0 ? 'text-green-600' : 'text-gray-400'}`}>{approvedRegs}</div>
                      <div className="text-xs text-gray-500">Paid</div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setExpandedParent(isExpanded ? null : parent.email)}
                      className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 text-sm"
                    >
                      {isExpanded ? '▲ Less' : '▼ More'}
                    </button>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t bg-gray-50 p-4">
                    {/* Admin Actions Bar */}
                    <div className="flex gap-2 mb-4 pb-4 border-b">
                      <button
                        onClick={() => setEditingParent({ ...parent, originalEmail: parent.email })}
                        className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 text-sm"
                      >
                        ✏️ Edit Parent
                      </button>
                      <button
                        onClick={() => setConfirmDelete({ type: 'parent', data: parent })}
                        className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm"
                      >
                        🗑️ Delete Parent
                      </button>
                      {(parent.password || parent.lastLoginMethod) && (
                        <button
                          onClick={async () => {
                            try {
                              const hasGoogle = parent.googleLinked || parent.lastLoginMethod === 'Google';
                              const hasPassword = !!parent.password;
                              let methodHtml = '';
                              if (hasGoogle && hasPassword) {
                                methodHtml = '<p><strong>Login methods:</strong></p><ul><li>Sign in with Google (using your Google account)</li><li>Email &amp; Password (using your email and password)</li></ul><p>If you\'ve forgotten your password, you can reset it from the login page by clicking "Forgot Password?"</p>';
                              } else if (hasGoogle) {
                                methodHtml = '<p><strong>Login method:</strong> Sign in with Google</p><p>Click the "Sign in with Google" button on the login page and use your Google account.</p>';
                              } else {
                                methodHtml = '<p><strong>Login method:</strong> Email &amp; Password</p><p>If you\'ve forgotten your password, you can reset it from the login page by clicking "Forgot Password?"</p>';
                              }
                              const res = await fetch('/.netlify/functions/send-email', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  to: parent.email,
                                  subject: 'Your Roosevelt Basketball Day Camp Login Info',
                                  html: `<div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;"><h2 style="color: #15803d;">Your Login Information</h2><p>Hi ${parent.name},</p><p>Here's a reminder of how to log in to Roosevelt Basketball Day Camp:</p><p><strong>Email:</strong> ${parent.email}</p>${methodHtml}<p><a href="https://rhsbasketballdaycamp.com/#login" style="display: inline-block; background-color: #15803d; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Go to Login</a></p></div>`
                                })
                              });
                              if (res.ok) showToast(`Login reminder sent to ${parent.email}`);
                              else showToast('Failed to send reminder');
                            } catch (err) { showToast('Failed to send reminder'); }
                          }}
                          className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 text-sm"
                        >
                          📧 Send Login Reminder
                        </button>
                      )}
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      {/* Children */}
                      <div>
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="font-bold text-gray-700">🏀 Campers ({getParentCampers(parent.email).length})</h4>
                          <button
                            onClick={() => setManagingCampers(parent)}
                            className="text-xs text-blue-600 hover:underline"
                          >
                            Manage Campers
                          </button>
                        </div>
                        {getParentCampers(parent.email).length === 0 ? (
                          <p className="text-gray-500 text-sm">No campers linked yet. Click "Manage Campers" to add.</p>
                        ) : (
                          <div className="space-y-2">
                            {getParentCampers(parent.email).map(camper => (
                              <div key={camper.id} className="flex items-center gap-3 p-2 bg-white rounded-lg">
                                {getDisplayPhoto(camper.photo) ? (
                                  <img src={getDisplayPhoto(camper.photo)} className="w-10 h-10 rounded-full object-cover" />
                                ) : (
                                  <div className="w-10 h-10 rounded-full bg-gray-200 flex flex-col items-center justify-center">
                                    <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                                    <span className="text-[5px] text-gray-500 font-medium">add photo</span>
                                  </div>
                                )}
                                <div className="flex-1">
                                  <div className="font-medium">{camper.name}</div>
                                  <div className="text-xs text-gray-500">
                                    {camper.grade && `Grade ${camper.grade}`}
                                    {camper.birthdate && ` • ${calculateAge(camper.birthdate)} years old`}
                                  </div>
                                </div>
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => setEditingChild({ child: { ...camper }, parentEmail: parent.email, originalChildId: camper.id })}
                                    className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                    title="Edit camper"
                                  >✏️</button>
                                  <button
                                    onClick={() => setConfirmDelete({ type: 'camper', data: { camper, parentEmail: parent.email } })}
                                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                                    title="Delete camper"
                                  >🗑️</button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Registrations */}
                      <div>
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="font-bold text-gray-700">📋 Registrations ({new Set(regs.map(r => r.orderId || r.id)).size})</h4>
                          {campersList.length > 0 && (
                            <button
                              onClick={() => { setCreatingRegFor(parent); setNewReg({ camperId: '', date: '', sessions: [] }); }}
                              className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
                            >
                              + Create Registration
                            </button>
                          )}
                        </div>
                        {regs.length === 0 ? (
                          <p className="text-gray-500 text-sm">{campersList.length === 0 ? 'Add campers first to create registrations' : 'No registrations yet'}</p>
                        ) : (() => {
                          const byOrder = {};
                          regs.forEach(r => { const k = r.orderId || r.id; if (!byOrder[k]) byOrder[k] = []; byOrder[k].push(r); });
                          return (
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                              {Object.entries(byOrder).map(([orderKey, orderRegs]) => {
                                const status = orderRegs[0]?.status || 'pending';
                                const paymentStatus = orderRegs[0]?.paymentStatus || 'unpaid';
                                const byCamper = {};
                                orderRegs.forEach(r => { const n = r.childName || r.camperName || 'Unknown'; if (!byCamper[n]) byCamper[n] = []; byCamper[n].push(r); });
                                const camperNames = Object.keys(byCamper);
                                const totalDays = new Set(orderRegs.map(r => r.date)).size;
                                const statusLabel = status === 'approved' ? 'paid' : paymentStatus === 'unpaid' ? 'new' : 'pending';
                                return (
                                  <div key={orderKey} className="p-3 bg-white rounded-lg text-sm">
                                    <div className="flex items-center justify-between mb-1">
                                      <div className="font-medium">{camperNames.join(' & ')}</div>
                                      <div className="flex items-center gap-2">
                                        <span className={`px-2 py-0.5 rounded text-xs ${
                                          statusLabel === 'paid' ? 'bg-green-100 text-green-700' :
                                          statusLabel === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                          'bg-red-100 text-red-700'
                                        }`}>{statusLabel}</span>
                                        <button onClick={() => setEditingReg(orderRegs[0])} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="Edit registration">✏️</button>
                                        <button onClick={() => setConfirmDelete({ type: 'registration', data: orderRegs[0] })} className="p-1 text-red-600 hover:bg-red-50 rounded" title="Delete registration">🗑️</button>
                                      </div>
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {camperNames.length} camper{camperNames.length > 1 ? 's' : ''} • {totalDays} day{totalDays > 1 ? 's' : ''} • {orderRegs[0]?.sessions?.join(' + ') || ''}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Parent Modal */}
      {editingParent && (
        <AdminEditModal
          title="Edit Parent"
          onClose={() => setEditingParent(null)}
          onSave={() => {
            onUpdateUsers(users.map(u => u.email === editingParent.originalEmail ? { ...u, name: editingParent.name, email: editingParent.email, phone: editingParent.phone } : u));
            addToHistory('Admin Edit', `Updated parent: ${editingParent.name}`, [editingParent.email]);
            showToast('Parent updated!');
            setEditingParent(null);
          }}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                value={editingParent.name || ''}
                onChange={e => setEditingParent({ ...editingParent, name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                autoComplete="off" data-1p-ignore="true"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                value={editingParent.email || ''}
                onChange={e => setEditingParent({ ...editingParent, email: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                autoComplete="off" data-1p-ignore="true"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                value={editingParent.phone || ''}
                onChange={e => setEditingParent({ ...editingParent, phone: formatPhone(e.target.value) })}
                className="w-full px-3 py-2 border rounded-lg"
                autoComplete="off" data-1p-ignore="true"
              />
            </div>
          </div>
        </AdminEditModal>
      )}

      {/* Edit Child Modal */}
      {editingChild && (
        <AdminEditModal
          title="Edit Child"
          onClose={() => setEditingChild(null)}
          onSave={() => {
            const parent = users.find(u => u.email === editingChild.parentEmail);
            if (parent) {
              const updatedChildren = parent.children.map(c => c.id === editingChild.originalChildId ? { ...editingChild.child } : c);
              onUpdateUsers(users.map(u => u.email === editingChild.parentEmail ? { ...u, children: updatedChildren } : u));
              addToHistory('Admin Edit', `Updated child: ${editingChild.child.name}`, [editingChild.parentEmail]);
              showToast('Child updated!');
            }
            setEditingChild(null);
          }}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                value={editingChild.child.name || ''}
                onChange={e => setEditingChild({ ...editingChild, child: { ...editingChild.child, name: e.target.value } })}
                className="w-full px-3 py-2 border rounded-lg"
                autoComplete="off" data-1p-ignore="true"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Birthdate</label>
              <input
                type="date"
                value={editingChild.child.birthdate || ''}
                onChange={e => setEditingChild({ ...editingChild, child: { ...editingChild.child, birthdate: e.target.value } })}
                className="w-full px-3 py-2 border rounded-lg"
                min={new Date(new Date().getFullYear() - 15, 0, 1).toISOString().split('T')[0]}
                max={new Date().toISOString().split('T')[0]}
                data-1p-ignore="true"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Grade</label>
              <select
                value={editingChild.child.grade || ''}
                onChange={e => setEditingChild({ ...editingChild, child: { ...editingChild.child, grade: e.target.value } })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="">Select grade</option>
                {['3rd', '4th', '5th', '6th', '7th', '8th'].map(g => <option key={g} value={g}>{g} Grade</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone (optional)</label>
              <input
                value={editingChild.child.phone || ''}
                onChange={e => setEditingChild({ ...editingChild, child: { ...editingChild.child, phone: formatPhone(e.target.value) } })}
                className="w-full px-3 py-2 border rounded-lg"
                autoComplete="off" data-1p-ignore="true"
              />
            </div>
          </div>
        </AdminEditModal>
      )}

      {/* Create Registration Modal */}
      {creatingRegFor && (
        <AdminEditModal
          title={`Create Registration for ${creatingRegFor.name}`}
          onClose={() => setCreatingRegFor(null)}
          onSave={async () => {
            if (!newReg.camperId || !newReg.date || newReg.sessions.length === 0) return;
            const camper = getParentCampers(creatingRegFor.email).find(c => c.id === newReg.camperId);
            const registration = {
              id: 'reg_' + Date.now(),
              camperId: newReg.camperId,
              camperName: camper?.name || 'Unknown',
              parentEmail: creatingRegFor.email,
              parentName: creatingRegFor.name,
              date: newReg.date,
              sessions: newReg.sessions,
              status: 'pending',
              paymentStatus: 'unpaid',
              createdAt: new Date().toISOString(),
              createdBy: 'admin'
            };
            onUpdateRegistrations(registration);
            addToHistory('Admin', `Created registration for ${camper?.name} on ${newReg.date}`, [creatingRegFor.email]);
            showToast('Registration created!');
            setCreatingRegFor(null);
          }}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Camper *</label>
              <select
                value={newReg.camperId}
                onChange={e => setNewReg({ ...newReg, camperId: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="">-- Select a camper --</option>
                {getParentCampers(creatingRegFor.email).map(camper => (
                  <option key={camper.id} value={camper.id}>{camper.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Date *</label>
              <select
                value={newReg.date}
                onChange={e => setNewReg({ ...newReg, date: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="">-- Select a date --</option>
                {CAMP_DATES.map(date => (
                  <option key={date} value={date}>{new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sessions *</label>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => {
                    const sessions = newReg.sessions.includes('morning')
                      ? newReg.sessions.filter(s => s !== 'morning')
                      : [...newReg.sessions, 'morning'];
                    setNewReg({ ...newReg, sessions });
                  }}
                  className={`flex-1 py-3 rounded-lg border-2 font-medium ${
                    newReg.sessions.includes('morning')
                      ? 'bg-amber-100 border-amber-400 text-amber-800'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-amber-300'
                  }`}
                >
                  ☀️ AM {newReg.sessions.includes('morning') && '✓'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const sessions = newReg.sessions.includes('afternoon')
                      ? newReg.sessions.filter(s => s !== 'afternoon')
                      : [...newReg.sessions, 'afternoon'];
                    setNewReg({ ...newReg, sessions });
                  }}
                  className={`flex-1 py-3 rounded-lg border-2 font-medium ${
                    newReg.sessions.includes('afternoon')
                      ? 'bg-indigo-100 border-indigo-400 text-indigo-800'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-indigo-300'
                  }`}
                >
                  🌙 PM {newReg.sessions.includes('afternoon') && '✓'}
                </button>
              </div>
            </div>
            {(!newReg.camperId || !newReg.date || newReg.sessions.length === 0) && (
              <p className="text-sm text-gray-500 text-center">Please select a camper, date, and at least one session</p>
            )}
          </div>
        </AdminEditModal>
      )}

      {/* Edit Registration Modal */}
      {editingReg && (
        <AdminEditModal
          title="Edit Registration"
          onClose={() => setEditingReg(null)}
          onSave={() => {
            onUpdateRegistrations(editingReg);
            addToHistory('Admin Edit', `Updated registration for ${editingReg.camperName || editingReg.childName} on ${editingReg.date}`, [editingReg.parentEmail]);
            showToast('Registration updated!');
            setEditingReg(null);
          }}
        >
          <div className="space-y-4">
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="font-medium">{editingReg.camperName || editingReg.childName}</p>
              <p className="text-sm text-gray-500">{editingReg.date}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={editingReg.status || ''}
                onChange={e => setEditingReg({ ...editingReg, status: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Status</label>
              <select
                value={editingReg.paymentStatus || 'unpaid'}
                onChange={e => setEditingReg({ ...editingReg, paymentStatus: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="unpaid">Unpaid</option>
                <option value="submitted">Submitted</option>
                <option value="confirmed">Confirmed</option>
                <option value="paid">Paid (Legacy)</option>
                <option value="refunded">Refunded</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sessions</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editingReg.sessions?.includes('morning')}
                    onChange={e => {
                      const sessions = e.target.checked
                        ? [...(editingReg.sessions || []), 'morning']
                        : (editingReg.sessions || []).filter(s => s !== 'morning');
                      setEditingReg({ ...editingReg, sessions });
                    }}
                    className="w-4 h-4"
                  />
                  Morning
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editingReg.sessions?.includes('afternoon')}
                    onChange={e => {
                      const sessions = e.target.checked
                        ? [...(editingReg.sessions || []), 'afternoon']
                        : (editingReg.sessions || []).filter(s => s !== 'afternoon');
                      setEditingReg({ ...editingReg, sessions });
                    }}
                    className="w-4 h-4"
                  />
                  Afternoon
                </label>
              </div>
            </div>
          </div>
        </AdminEditModal>
      )}

      {/* Confirm Delete Modal */}
      {confirmDelete && (
        <AdminConfirmDelete
          type={confirmDelete.type}
          data={confirmDelete.data}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={async () => {
            if (confirmDelete.type === 'parent') {
              if (onDeleteParent) {
                await onDeleteParent(confirmDelete.data.email, confirmDelete.data.name);
              } else {
                onUpdateUsers(users.filter(u => u.email !== confirmDelete.data.email));
                addToHistory('Admin Delete', `Deleted parent: ${confirmDelete.data.name}`, [confirmDelete.data.email]);
                showToast('Parent deleted');
              }
              setExpandedParent(null);
            } else if (confirmDelete.type === 'child') {
              const { child, parentEmail } = confirmDelete.data;
              const parent = users.find(u => u.email === parentEmail);
              if (parent) {
                const updatedChildren = parent.children.filter(c => c.id !== child.id);
                onUpdateUsers(users.map(u => u.email === parentEmail ? { ...u, children: updatedChildren } : u));
                addToHistory('Admin Delete', `Deleted child: ${child.name}`, [parentEmail]);
                showToast('Child deleted');
              }
            } else if (confirmDelete.type === 'registration') {
              onDeleteRegistration(confirmDelete.data);
              addToHistory('Admin Delete', `Deleted registration: ${confirmDelete.data.childName} on ${confirmDelete.data.date}`, [confirmDelete.data.parentEmail]);
              showToast('Registration deleted');
            }
            setConfirmDelete(null);
          }}
        />
      )}

      {/* Add Parent - Full Onboarding Flow */}
      {showAddParent && (
        <div className="fixed inset-0 z-50 bg-white overflow-auto">
          <div className="sticky top-0 bg-purple-600 text-white px-4 py-3 flex items-center justify-between z-10">
            <h2 className="font-display text-xl">Add New Parent (Admin)</h2>
            <button onClick={() => setShowAddParent(false)} className="px-4 py-1 bg-purple-500 hover:bg-purple-400 rounded">Cancel</button>
          </div>
          <ParentOnboarding
            onComplete={(newUser) => {
              addToHistory('Parent', `Added parent ${newUser.name} via onboarding`, [newUser.email]);
              setShowAddParent(false);
              showToast(`Parent ${newUser.name} added successfully!`);
            }}
            onBack={() => setShowAddParent(false)}
            users={users}
            saveUsers={onUpdateUsers}
            saveEmergencyContacts={saveEmergencyContacts}
            emergencyContacts={emergencyContacts}
            saveOnboardingProgress={saveOnboardingProgress}
            campers={campers}
            saveCampers={onSaveCampers}
            saveCamperParentLinks={onSaveCamperParentLinks}
            camperParentLinks={camperParentLinks}
          />
        </div>
      )}

      {/* Manage Campers for Parent Modal */}
      {managingCampers && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-xl mb-2">Manage Campers for {managingCampers.name}</h3>
            <p className="text-sm text-gray-500 mb-4">Select which campers belong to this parent. A camper can have multiple parents.</p>

            {getAllCampers().length === 0 ? (
              <p className="text-gray-500 text-center py-8">No campers exist yet. Add campers during parent onboarding or in the Campers tab.</p>
            ) : (
              <div className="space-y-2 mb-4">
                {getAllCampers().map(camper => {
                  const isLinked = (camperParentLinks || []).some(l => l.camperId === camper.id && l.parentEmail === managingCampers.email);
                  return (
                    <label key={camper.id} className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 ${isLinked ? 'border-green-500 bg-green-50' : ''}`}>
                      <input
                        type="checkbox"
                        checked={isLinked}
                        onChange={() => toggleCamperLink(managingCampers.email, camper.id)}
                        className="w-5 h-5"
                      />
                      <div className="flex items-center gap-3">
                        {getDisplayPhoto(camper.photo) ? (
                          <img src={getDisplayPhoto(camper.photo)} alt={camper.name} className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gray-200 flex flex-col items-center justify-center">
                            <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                            <span className="text-[5px] text-gray-500 font-medium">add photo</span>
                          </div>
                        )}
                        <div>
                          <div className="font-medium">{camper.name}</div>
                          <div className="text-xs text-gray-500">{camper.grade || 'No grade'} {camper.birthdate ? `• Age ${calculateAge(camper.birthdate)}` : ''}</div>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}

            <button onClick={() => setManagingCampers(null)} className="w-full px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200">
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ==================== ADMIN EDIT MODAL ====================
const AdminEditModal = ({ title, children, onClose, onSave }) => {
  const mouseDownTarget = useRef(null);

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onMouseDown={e => mouseDownTarget.current = e.target}
      onClick={e => e.target === e.currentTarget && mouseDownTarget.current === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-xl max-w-md w-full overflow-hidden">
        <div className="bg-blue-600 text-white px-6 py-4 flex justify-between items-center">
          <h2 className="font-display text-xl">✏️ {title}</h2>
          <button onClick={onClose} className="text-2xl hover:bg-blue-500 rounded px-2">×</button>
        </div>
        <div className="p-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-yellow-800">⚠️ <strong>Warning:</strong> Changes made here cannot be automatically undone. Please verify all information before saving.</p>
          </div>
          {children}
          <div className="flex gap-4 mt-6">
            <button onClick={onClose} className="flex-1 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">Cancel</button>
            <button onClick={onSave} className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save Changes</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==================== ADMIN CONFIRM DELETE ====================
const AdminConfirmDelete = ({ type, data, onCancel, onConfirm }) => {
  const [confirmText, setConfirmText] = useState('');
  const requiredText = 'DELETE';

  const getDescription = () => {
    if (type === 'parent') return `parent account "${data.name}" and all their data`;
    if (type === 'child') return `child "${data.child.name}" from ${data.parentEmail}`;
    if (type === 'registration') return `registration for ${data.childName} on ${data.date}`;
    return 'this item';
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-md w-full overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="bg-red-600 text-white px-6 py-4">
          <h2 className="font-display text-xl">⚠️ Confirm Deletion</h2>
        </div>
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-red-800 font-medium mb-2">You are about to permanently delete:</p>
            <p className="text-red-700">{getDescription()}</p>
          </div>

          <p className="text-gray-700 mb-4">This action <strong>cannot be undone</strong>. All associated data will be permanently removed.</p>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type <span className="font-mono bg-gray-100 px-1">DELETE</span> to confirm:
            </label>
            <input
              value={confirmText}
              onChange={e => setConfirmText(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="DELETE"
              autoComplete="off"
              data-1p-ignore="true"
            />
          </div>

          <div className="flex gap-4">
            <button onClick={onCancel} className="flex-1 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">Cancel</button>
            <button
              onClick={onConfirm}
              disabled={confirmText !== requiredText}
              className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Delete Permanently
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

