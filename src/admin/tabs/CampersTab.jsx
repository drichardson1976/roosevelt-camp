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

// ==================== CAMPERS TAB ====================
export const CampersTab = ({ parents, registrations, campers, camperParentLinks, emergencyContacts, onSaveCampers, onSaveLinks, onDeleteCamper, onSaveEmergencyContacts, showToast, addToHistory, assignments }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [editingCamper, setEditingCamper] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [managingParents, setManagingParents] = useState(null);
  const [viewingContacts, setViewingContacts] = useState(null);
  const [ecPhotoModal, setEcPhotoModal] = useState(null); // { type: 'camper' | 'ec', id, currentPhoto }
  const [viewingLargePhoto, setViewingLargePhoto] = useState(null); // url string for full-size view
  const [expandedCamper, setExpandedCamper] = useState(null); // camper id for expanded card

  const [formData, setFormData] = useState({
    name: '', birthdate: '', grade: '', phone: '', photo: null
  });

  // Get all campers
  const getAllCampers = () => {
    // All campers from the campers collection with their linked parents and registrations
    return campers.map(c => ({
      ...c,
      parents: camperParentLinks
        .filter(link => link.camperId === c.id)
        .map(link => parents.find(u => u.email === link.parentEmail))
        .filter(Boolean),
      registrations: registrations.filter(r => r.camperId === c.id || r.childId === c.id)
    }));
  };

  const allCampers = getAllCampers();

  const filteredCampers = allCampers.filter(c =>
    c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.parents?.some(p => p?.name?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const sortedCampers = [...filteredCampers].sort((a, b) => {
    switch (sortBy) {
      case 'name': return (a.name || '').localeCompare(b.name || '');
      case 'age': return (a.birthdate || '').localeCompare(b.birthdate || '');
      case 'grade': return (a.grade || '').localeCompare(b.grade || '');
      case 'registrations': return b.registrations.length - a.registrations.length;
      default: return 0;
    }
  });

  const getAge = (birthdate) => {
    if (!birthdate) return null;
    const today = new Date();
    const birth = new Date(birthdate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  const resetForm = () => {
    setFormData({ name: '', birthdate: '', grade: '', phone: '', photo: null });
    setShowAddForm(false);
    setEditingCamper(null);
  };

  const handleSave = () => {
    if (!formData.name) {
      showToast('Name is required', 'error');
      return;
    }

    if (editingCamper) {
      // Update existing camper
      if (editingCamper.isStandalone) {
        const updated = campers.map(c => c.id === editingCamper.id ? { ...c, ...formData } : c);
        onSaveCampers(updated, `Updated camper ${formData.name}`);
      } else {
        // Legacy camper - migrate to standalone
        const newCamper = { id: editingCamper.id, ...formData, createdAt: new Date().toISOString() };
        onSaveCampers([...campers, newCamper], `Migrated and updated camper ${formData.name}`);
        // Add link to original parent
        if (editingCamper.parentEmail) {
          onSaveLinks([...camperParentLinks, { camperId: editingCamper.id, parentEmail: editingCamper.parentEmail }]);
        }
      }
    } else {
      // Add new camper
      const newCamper = {
        id: 'camper_' + Date.now(),
        ...formData,
        createdAt: new Date().toISOString()
      };
      onSaveCampers([...campers, newCamper], `Added camper ${formData.name}`);
    }
    resetForm();
    showToast(editingCamper ? 'Camper updated!' : 'Camper added!');
  };

  const handleDelete = async () => {
    if (deleteConfirmText !== 'DELETE') {
      showToast('Please type DELETE to confirm', 'error');
      return;
    }
    const camper = confirmDelete;
    if (onDeleteCamper) {
      await onDeleteCamper(camper.id, camper.name);
    } else if (camper.isStandalone) {
      onSaveCampers(campers.filter(c => c.id !== camper.id), `Deleted camper ${camper.name}`);
      onSaveLinks(camperParentLinks.filter(l => l.camperId !== camper.id));
      showToast('Camper deleted');
    }
    setConfirmDelete(null);
    setDeleteConfirmText('');
  };

  const startEdit = (camper) => {
    setFormData({
      name: camper.name || '',
      birthdate: camper.birthdate || '',
      grade: camper.grade || '',
      phone: camper.phone || '',
      photo: camper.photo || null
    });
    setEditingCamper(camper);
    setShowAddForm(true);
  };

  const toggleParentLink = (camperId, parentEmail) => {
    const exists = camperParentLinks.some(l => l.camperId === camperId && l.parentEmail === parentEmail);
    if (exists) {
      onSaveLinks(camperParentLinks.filter(l => !(l.camperId === camperId && l.parentEmail === parentEmail)));
    } else {
      onSaveLinks([...camperParentLinks, { camperId, parentEmail }]);
    }
  };

  const getCamperParents = (camperId) => {
    return camperParentLinks
      .filter(l => l.camperId === camperId)
      .map(l => users.find(u => u.email === l.parentEmail))
      .filter(Boolean);
  };

  return (
    <div className="space-y-6">
      {/* Header with search and actions */}
      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="font-bold text-xl text-green-800">🏀 Campers</h3>
            <p className="text-sm text-gray-500">{allCampers.length} campers registered</p>
          </div>
          <div className="flex gap-2 items-center">
            <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="px-3 py-2 border rounded-lg">
              <option value="name">Sort by Name</option>
              <option value="age">Sort by Age</option>
              <option value="grade">Sort by Grade</option>
              <option value="registrations">Sort by Registrations</option>
            </select>
            <button onClick={() => setShowAddForm(true)} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
              + Add Camper
            </button>
          </div>
        </div>

        <input
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="Search campers or parents..."
          className="w-full px-4 py-2 border rounded-lg"
          autoComplete="off"
          data-1p-ignore="true"
        />
      </div>

      {/* Campers List */}
      {sortedCampers.length === 0 ? (
        <div className="bg-white rounded-xl shadow p-12 text-center text-gray-500">
          <p className="text-4xl mb-4">🏀</p>
          <p>{allCampers.length === 0 ? 'No campers yet. Campers are added when parents complete onboarding.' : 'No campers match your search'}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedCampers.map(camper => {
            const isExpanded = expandedCamper === camper.id;
            const camperParentEmails = (camper.parents || []).map(p => p?.email).filter(Boolean);
            const camperContacts = emergencyContacts.filter(ec => camperParentEmails.includes(ec.userEmail));
            const parentCount = camper.parents?.length || 0;
            const activeRegs = camper.registrations.filter(r => r.status !== 'cancelled');
            const totalSessions = activeRegs.reduce((sum, r) => sum + (r.sessions?.length || 0), 0);
            const paidSessions = camper.registrations.filter(r => r.status === 'approved').reduce((sum, r) => sum + (r.sessions?.length || 0), 0);
            const inPods = (() => {
              let count = 0;
              const asgn = assignments || {};
              Object.keys(asgn).forEach(key => {
                const counselors = asgn[key] || {};
                Object.values(counselors).forEach(camperIds => {
                  if ((camperIds || []).includes(camper.id)) count++;
                });
              });
              return count;
            })();

            return (
              <div key={camper.id} className="bg-white rounded-xl shadow overflow-hidden">
                {/* Camper Header */}
                <div className="p-4 flex items-center gap-4">
                  <div
                    className="flex-1 cursor-pointer"
                    onClick={() => setExpandedCamper(isExpanded ? null : camper.id)}
                  >
                    <div className="flex items-center gap-3">
                      {getDisplayPhoto(camper.photo) ? (
                        <img src={getDisplayPhoto(camper.photo)} alt={camper.name} className="w-12 h-12 rounded-full object-cover" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-teal-200 flex items-center justify-center text-xl font-bold text-teal-700">
                          {camper.name?.[0]?.toUpperCase() || '?'}
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-800">{camper.name}</span>
                          {camper.grade && (
                            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-teal-100 text-teal-700">Grade {camper.grade}</span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">
                          {getAge(camper.birthdate) ? `${getAge(camper.birthdate)} years old` : ''}
                          {getAge(camper.birthdate) && camper.parents?.length > 0 ? ' • ' : ''}
                          {camper.parents?.length > 0 ? camper.parents.map(p => p?.name).filter(Boolean).join(', ') : 'No parents linked'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex gap-3 text-center flex-wrap">
                    <div title="Parents linked to this camper">
                      <div className={`text-lg font-bold ${parentCount > 0 ? 'text-teal-600' : 'text-gray-400'}`}>{parentCount}</div>
                      <div className="text-xs text-gray-500">Parents</div>
                    </div>
                    <div title="Total registered session slots (non-cancelled)">
                      <div className={`text-lg font-bold ${totalSessions > 0 ? 'text-blue-600' : 'text-gray-400'}`}>{totalSessions}</div>
                      <div className="text-xs text-gray-500">Sessions</div>
                    </div>
                    <div title="Paid session slots (approved)">
                      <div className={`text-lg font-bold ${paidSessions > 0 ? 'text-green-600' : 'text-gray-400'}`}>{paidSessions}</div>
                      <div className="text-xs text-gray-500">Paid</div>
                    </div>
                    <div title="Pod assignments (date+session slots assigned to a counselor)">
                      <div className={`text-lg font-bold ${inPods > 0 ? 'text-purple-600' : 'text-gray-400'}`}>{inPods}</div>
                      <div className="text-xs text-gray-500">In Pods</div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); startEdit(camper); }}
                      className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 text-sm"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => setExpandedCamper(isExpanded ? null : camper.id)}
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
                        onClick={() => startEdit(camper)}
                        className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 text-sm"
                      >
                        ✏️ Edit Camper
                      </button>
                      <button
                        onClick={() => setManagingParents(camper)}
                        className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 text-sm"
                      >
                        👨‍👩‍👧 Manage Parents
                      </button>
                      {camperContacts.length > 0 && (
                        <button
                          onClick={() => {
                            const resolvedContacts = camperContacts.map(contact => {
                              if (contact.isParent && contact.parentEmail) {
                                const p = (parents || []).find(pr => pr.email === contact.parentEmail);
                                if (p) return { ...contact, name: p.name };
                              }
                              if (contact.isAutoCreated && contact.sourceEmail) {
                                const p = (parents || []).find(pr => pr.email === contact.sourceEmail);
                                if (p) return { ...contact, name: p.name };
                              }
                              return contact;
                            });
                            setViewingContacts({ camper, contacts: resolvedContacts });
                          }}
                          className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 text-sm"
                        >
                          📞 View Emergency Contacts
                        </button>
                      )}
                      <button
                        onClick={() => setConfirmDelete(camper)}
                        className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm"
                      >
                        🗑️ Delete Camper
                      </button>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      {/* Parents */}
                      <div>
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="font-bold text-gray-700">👨‍👩‍👧 Parents ({camper.parents?.length || 0})</h4>
                          <button
                            onClick={() => setManagingParents(camper)}
                            className="text-xs text-blue-600 hover:underline"
                          >
                            Manage Parents
                          </button>
                        </div>
                        {(!camper.parents || camper.parents.length === 0) ? (
                          <p className="text-gray-500 text-sm">No parents linked yet. Click "Manage Parents" to add.</p>
                        ) : (
                          <div className="space-y-2">
                            {camper.parents.map(p => p && (
                              <div key={p.email} className="flex items-center gap-3 p-2 bg-white rounded-lg">
                                <div className="w-8 h-8 rounded-full bg-green-200 flex items-center justify-center text-sm font-bold text-green-700">
                                  {p.name?.[0]?.toUpperCase() || '?'}
                                </div>
                                <div className="flex-1">
                                  <div className="font-medium text-sm">{p.name}</div>
                                  <div className="text-xs text-gray-500">{p.email}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Registrations */}
                      <div>
                        <h4 className="font-bold text-gray-700 mb-3">📋 Registrations ({camper.registrations.length})</h4>
                        {camper.registrations.length === 0 ? (
                          <p className="text-gray-500 text-sm">No registrations yet</p>
                        ) : (
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            {camper.registrations.map(reg => (
                              <div key={reg.id} className="flex items-center gap-2 p-2 bg-white rounded-lg text-sm">
                                <div className="flex-1">
                                  <div className="font-medium">{new Date(reg.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</div>
                                  <div className="text-xs text-gray-500">{reg.sessions?.map(s => s === 'morning' ? 'AM' : 'PM').join(' + ')}</div>
                                </div>
                                <span className={`px-2 py-0.5 rounded text-xs ${
                                  reg.status === 'approved' ? 'bg-green-100 text-green-700' :
                                  reg.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-gray-100 text-gray-600'
                                }`}>{reg.status}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Emergency Contacts */}
                    {camperContacts.length > 0 && (
                      <div className="mt-4 pt-4 border-t">
                        <h4 className="font-bold text-gray-700 mb-3">📞 Emergency Contacts ({camperContacts.length})</h4>
                        <div className="flex gap-2 flex-wrap">
                          {camperContacts.map((contact, idx) => (
                            <div key={idx} className="text-sm px-3 py-1.5 bg-white rounded-lg border">
                              <span className="font-medium">{contact.name}</span>
                              <span className="text-gray-500 ml-1">• {contact.relationship}</span>
                              <span className="text-gray-500 ml-1">• {contact.phone}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Camper Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-xl mb-4">{editingCamper ? 'Edit Camper' : 'Add New Camper'}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Name *</label>
                <input
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Camper's full name"
                  autoComplete="off"
                  data-1p-ignore="true"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Birthdate</label>
                <input
                  type="date"
                  value={formData.birthdate}
                  onChange={e => setFormData({ ...formData, birthdate: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  min={new Date(new Date().getFullYear() - 15, 0, 1).toISOString().split('T')[0]}
                  max={new Date().toISOString().split('T')[0]}
                />
                {formData.birthdate && (
                  <p className="text-sm text-gray-500 mt-1">Age: {getAge(formData.birthdate)} years old</p>
                )}
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Grade (Fall 2026)</label>
                <select
                  value={formData.grade}
                  onChange={e => setFormData({ ...formData, grade: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">Select grade...</option>
                  <option value="3rd">3rd Grade</option>
                  <option value="4th">4th Grade</option>
                  <option value="5th">5th Grade</option>
                  <option value="6th">6th Grade</option>
                  <option value="7th">7th Grade</option>
                  <option value="8th">8th Grade</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Phone (optional)</label>
                <input
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: formatPhone(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="(555) 555-5555"
                  autoComplete="off"
                  data-1p-ignore="true"
                />
              </div>
            </div>

            {/* Emergency Contacts for Editing Camper */}
            {editingCamper && (() => {
              const camperContacts = emergencyContacts.filter(ec =>
                editingCamper.parents?.some(p => ec.userEmail === p?.email)
              );
              return camperContacts.length > 0 ? (
                <div className="mt-4 pt-4 border-t">
                  <h4 className="font-medium text-gray-700 mb-2">Emergency Contacts ({camperContacts.length})</h4>
                  <div className="space-y-2">
                    {camperContacts.map((contact, idx) => (
                      <div key={idx} className="text-sm p-2 bg-gray-50 rounded border">
                        <div className="font-medium">{contact.name} {contact.isParent && <span className="text-xs text-blue-600">(Parent)</span>}</div>
                        <div className="text-gray-600">{contact.relationship} • {contact.phone}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null;
            })()}

            <div className="flex gap-3 mt-6">
              <button onClick={resetForm} className="flex-1 px-4 py-2 border rounded-lg">Cancel</button>
              <button onClick={handleSave} className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                {editingCamper ? 'Save Changes' : 'Add Camper'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 text-center" onClick={e => e.stopPropagation()}>
            <div className="text-5xl mb-4">⚠️</div>
            <h3 className="font-bold text-xl text-red-600 mb-2">Delete Camper</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to delete <strong>{confirmDelete.name}</strong>?
              <br />This will also remove all their registrations.
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
              <button onClick={() => { setConfirmDelete(null); setDeleteConfirmText(''); }} className="flex-1 px-4 py-2 border rounded-lg">Cancel</button>
              <button onClick={handleDelete} disabled={deleteConfirmText !== 'DELETE'} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300">
                Delete Camper
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manage Parents Modal */}
      {managingParents && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-xl mb-2">Manage Parents for {managingParents.name}</h3>
            <p className="text-sm text-gray-500 mb-4">Select which parents are associated with this camper. A camper can have multiple parents.</p>

            {parents.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No parent accounts exist yet.</p>
            ) : (
              <div className="space-y-2 mb-4">
                {parents.map(parent => {
                  const isLinked = managingParents.isStandalone
                    ? camperParentLinks.some(l => l.camperId === managingParents.id && l.parentEmail === parent.email)
                    : managingParents.parentEmail === parent.email;
                  return (
                    <label key={parent.email} className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 ${isLinked ? 'border-green-500 bg-green-50' : ''}`}>
                      <input
                        type="checkbox"
                        checked={isLinked}
                        onChange={() => {
                          if (managingParents.isStandalone) {
                            toggleParentLink(managingParents.id, parent.email);
                          } else {
                            showToast('Migrate camper to standalone first by editing', 'error');
                          }
                        }}
                        className="w-5 h-5"
                        disabled={!managingParents.isStandalone}
                      />
                      <div>
                        <div className="font-medium">{parent.name}</div>
                        <div className="text-sm text-gray-500">{parent.email}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}

            {!managingParents.isStandalone && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 text-sm text-yellow-800">
                ⚠️ This is a legacy camper. Edit and save to enable multi-parent support.
              </div>
            )}

            <button onClick={() => setManagingParents(null)} className="w-full px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200">
              Done
            </button>
          </div>
        </div>
      )}

      {/* Emergency Contacts Viewing Modal */}
      {viewingContacts && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setViewingContacts(null)}>
          <div className="bg-white rounded-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-xl mb-4">Emergency Contacts for {viewingContacts.camper.name}</h3>

            {/* Camper Photo */}
            <div className="flex items-center gap-4 mb-5 p-4 bg-green-50 border-2 border-green-300 rounded-lg">
              <div className="flex-shrink-0">
                {getDisplayPhoto(viewingContacts.camper.photo) ? (
                  <img
                    src={getDisplayPhoto(viewingContacts.camper.photo)}
                    className="w-20 h-20 rounded-full object-cover border-2 border-green-600 cursor-pointer hover:opacity-80"
                    onClick={() => setViewingLargePhoto(getDisplayPhoto(viewingContacts.camper.photo))}
                    title="Click to view larger"
                  />
                ) : (
                  <div
                    onClick={() => setEcPhotoModal({ type: 'camper', id: viewingContacts.camper.id, currentPhoto: viewingContacts.camper.photo })}
                    className="w-20 h-20 rounded-full bg-gray-200 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-300"
                  >
                    <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                    <span className="text-[8px] text-gray-500 font-medium">add photo</span>
                  </div>
                )}
              </div>
              <div>
                <div className="font-bold text-lg text-green-800">{viewingContacts.camper.name}</div>
                <div className="text-sm text-green-600">Camper</div>
                <button
                  onClick={() => setEcPhotoModal({ type: 'camper', id: viewingContacts.camper.id, currentPhoto: viewingContacts.camper.photo })}
                  className="text-xs text-blue-600 hover:text-blue-800 mt-1"
                >
                  {getDisplayPhoto(viewingContacts.camper.photo) ? 'Change photo' : 'Add photo'}
                </button>
              </div>
            </div>

            <p className="text-sm text-gray-500 mb-3">{viewingContacts.contacts.length} emergency contact{viewingContacts.contacts.length > 1 ? 's' : ''}</p>

            <div className="space-y-3">
              {viewingContacts.contacts.map((contact, idx) => (
                <div key={idx} className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex items-start gap-4">
                    {/* EC Photo */}
                    <div className="flex-shrink-0">
                      {getDisplayPhoto(contact.photo) ? (
                        <img
                          src={getDisplayPhoto(contact.photo)}
                          className="w-16 h-16 rounded-full object-cover border-2 border-gray-400 cursor-pointer hover:opacity-80"
                          onClick={() => setViewingLargePhoto(getDisplayPhoto(contact.photo))}
                          title="Click to view larger"
                        />
                      ) : (
                        <div
                          onClick={() => setEcPhotoModal({ type: 'ec', id: contact.id, currentPhoto: contact.photo })}
                          className="w-16 h-16 rounded-full bg-gray-200 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-300"
                        >
                          <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                          <span className="text-[6px] text-gray-500 font-medium">add photo</span>
                        </div>
                      )}
                    </div>
                    {/* EC Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div className="font-medium text-lg">{contact.name}</div>
                        {contact.isParent && (
                          <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-700 flex-shrink-0">Parent</span>
                        )}
                      </div>
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500 w-24">Relationship:</span>
                          <span className="font-medium">{contact.relationship}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500 w-24">Phone:</span>
                          <span className="font-medium">{contact.phone}</span>
                        </div>
                        {contact.email && (
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500 w-24">Email:</span>
                            <span className="font-medium">{contact.email}</span>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => setEcPhotoModal({ type: 'ec', id: contact.id, currentPhoto: contact.photo })}
                        className="text-xs text-blue-600 hover:text-blue-800 mt-2"
                      >
                        {getDisplayPhoto(contact.photo) ? 'Change photo' : 'Add photo'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button onClick={() => setViewingContacts(null)} className="w-full px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 mt-4">
              Close
            </button>
          </div>
        </div>
      )}

      {/* Large Photo Viewer */}
      {viewingLargePhoto && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4" onClick={() => setViewingLargePhoto(null)}>
          <div className="relative max-w-md w-full" onClick={e => e.stopPropagation()}>
            <img src={viewingLargePhoto} className="w-full rounded-xl object-cover" />
            <button
              onClick={() => setViewingLargePhoto(null)}
              className="absolute top-2 right-2 w-8 h-8 bg-white/80 rounded-full flex items-center justify-center text-gray-700 hover:bg-white text-lg font-bold"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Photo Upload Modal for EC popup */}
      {ecPhotoModal && (
        <PhotoUploadModal
          currentPhoto={ecPhotoModal.currentPhoto}
          onSave={(img) => {
            if (ecPhotoModal.type === 'camper') {
              const updated = campers.map(c => c.id === ecPhotoModal.id ? { ...c, photo: img } : c);
              onSaveCampers(updated, `Updated photo for camper`);
              setViewingContacts(prev => prev ? { ...prev, camper: { ...prev.camper, photo: img } } : null);
            } else {
              const updated = (emergencyContacts || []).map(ec => ec.id === ecPhotoModal.id ? { ...ec, photo: img } : ec);
              onSaveEmergencyContacts(updated, `Updated photo for emergency contact`);
              setViewingContacts(prev => prev ? {
                ...prev,
                contacts: prev.contacts.map(c => c.id === ecPhotoModal.id ? { ...c, photo: img } : c)
              } : null);
            }
            setEcPhotoModal(null);
            showToast('Photo updated!', 'success');
          }}
          onCancel={() => setEcPhotoModal(null)}
        />
      )}
    </div>
  );
};

