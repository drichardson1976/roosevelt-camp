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

// ==================== ADMINS TAB ====================
export const AdminsTab = ({ admins, currentAdminId, onSave, showToast }) => {
  const [editingAdmin, setEditingAdmin] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const [formData, setFormData] = useState({
    username: '', password: '', name: '', email: ''
  });

  const resetForm = () => {
    setFormData({ username: '', password: '', name: '', email: '' });
    setShowAddForm(false);
    setEditingAdmin(null);
  };

  const handleSave = () => {
    if (!formData.username || !formData.password || !formData.name) {
      showToast('Username, password, and name are required', 'error');
      return;
    }
    // Check for duplicate username
    if (admins.some(a => a.username === formData.username && a.id !== editingAdmin?.id)) {
      showToast('Username already exists', 'error');
      return;
    }

    if (editingAdmin) {
      const updated = admins.map(a => a.id === editingAdmin.id ? { ...a, ...formData } : a);
      onSave(updated, `Updated admin ${formData.name}`);
    } else {
      const newAdmin = {
        id: 'admin_' + Date.now(),
        ...formData,
        createdAt: new Date().toISOString()
      };
      onSave([...admins, newAdmin], `Added admin ${formData.name}`);
    }
    resetForm();
    showToast(editingAdmin ? 'Admin updated!' : 'Admin added!');
  };

  const handleDelete = (admin) => {
    if (admins.length <= 1) {
      showToast('Cannot delete the last admin!', 'error');
      return;
    }
    if (admin.id === currentAdminId) {
      showToast('Cannot delete yourself!', 'error');
      return;
    }
    setConfirmDelete(admin);
  };

  const confirmDeleteAdmin = () => {
    if (deleteConfirmText !== 'DELETE') {
      showToast('Please type DELETE to confirm', 'error');
      return;
    }
    const updated = admins.filter(a => a.id !== confirmDelete.id);
    onSave(updated, `Deleted admin ${confirmDelete.name}`);
    setConfirmDelete(null);
    setDeleteConfirmText('');
    showToast('Admin deleted');
  };

  const startEdit = (admin) => {
    setFormData({
      username: admin.username,
      password: admin.password,
      name: admin.name,
      email: admin.email || ''
    });
    setEditingAdmin(admin);
    setShowAddForm(true);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="font-bold text-xl text-purple-800">👑 Admin Accounts</h3>
            <p className="text-sm text-gray-500">{admins.length} admin{admins.length !== 1 ? 's' : ''} • At least 1 admin required</p>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            + Add Admin
          </button>
        </div>

        {/* Admin List */}
        <div className="space-y-3">
          {admins.map(admin => (
            <div key={admin.id} className="border rounded-lg p-4 flex justify-between items-center hover:bg-gray-50">
              <div>
                <div className="font-bold text-lg">{admin.name}</div>
                <div className="text-sm text-gray-600">
                  Username: <span className="font-mono bg-gray-100 px-2 rounded">{admin.username}</span>
                  {admin.email && <span className="ml-3">• {admin.email}</span>}
                </div>
                <div className="text-xs text-gray-400">
                  Created: {new Date(admin.createdAt).toLocaleDateString()}
                  {admin.id === currentAdminId && <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 rounded">You</span>}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => startEdit(admin)}
                  className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(admin)}
                  disabled={admins.length <= 1 || admin.id === currentAdminId}
                  className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add/Edit Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-xl mb-4">{editingAdmin ? 'Edit Admin' : 'Add New Admin'}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Name *</label>
                <input
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Full Name"
                  autoComplete="off"
                  data-1p-ignore="true"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Username *</label>
                <input
                  value={formData.username}
                  onChange={e => setFormData({ ...formData, username: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg font-mono"
                  placeholder="login_username"
                  autoComplete="off"
                  data-1p-ignore="true"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Password *</label>
                <input
                  type="text"
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg font-mono"
                  placeholder="password"
                  autoComplete="off"
                  data-1p-ignore="true"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Email (optional)</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="admin@example.com"
                  autoComplete="off"
                  data-1p-ignore="true"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={resetForm} className="flex-1 px-4 py-2 border rounded-lg">Cancel</button>
              <button onClick={handleSave} className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                {editingAdmin ? 'Save Changes' : 'Add Admin'}
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
            <h3 className="font-bold text-xl text-red-600 mb-2">Delete Admin Account</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to delete <strong>{confirmDelete.name}</strong>?
              <br />This cannot be undone.
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
              <button onClick={confirmDeleteAdmin} disabled={deleteConfirmText !== 'DELETE'} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300">
                Delete Admin
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

