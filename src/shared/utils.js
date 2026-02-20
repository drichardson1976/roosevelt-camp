// ES module version of utils.js — used by Vite-built pages
// The root utils.js is kept for prd.html and tests.html (CDN Babel)

import React from 'react';
import { supabase, SCHEMA, ENV } from './config.js';

// ==================== STORAGE ====================
export var storage = {
  get: async function(table) {
    if (!supabase) return null;
    try {
      var result = await supabase.from(table).select('*');
      if (result.error) throw result.error;
      return result.data;
    } catch (e) {
      console.error('Error fetching ' + table + ':', e);
      return null;
    }
  },
  set: async function(table, id, data) {
    if (!supabase) return false;
    try {
      var result = await supabase.from(table).upsert({ id: id, data: data, updated_at: new Date().toISOString() });
      if (result.error) throw result.error;
      return true;
    } catch (e) {
      console.error('Error saving to ' + table + ':', e);
      return false;
    }
  },
  deleteRow: async function(table, id) {
    if (!supabase) return false;
    try {
      var result = await supabase.from(table).delete().eq('id', id);
      if (result.error) throw result.error;
      return true;
    } catch (e) {
      console.error('Error deleting from ' + table + ':', e);
      return false;
    }
  }
};

// ==================== ENVIRONMENT ====================
export var isDev = function() { return ENV === 'development'; };

// ==================== FORMATTING ====================
export var formatPhone = function(value) {
  var digits = value.replace(/\D/g, '').slice(0, 10);
  if (digits.length === 0) return '';
  if (digits.length <= 3) return '(' + digits;
  if (digits.length <= 6) return '(' + digits.slice(0, 3) + ') ' + digits.slice(3);
  return '(' + digits.slice(0, 3) + ') ' + digits.slice(3, 6) + '-' + digits.slice(6);
};

export var isValidPhone = function(phone) { return (phone || '').replace(/\D/g, '').length === 10; };

export var formatBirthdate = function(birthdate) {
  if (!birthdate) return '';
  var d = new Date(birthdate + 'T12:00:00');
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
};

export var formatTimestamp = function(date) {
  var d = new Date(date);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
};

// ==================== DISPLAY ====================
export var getDisplayPhoto = function(photo) {
  if (!photo) return null;
  return typeof photo === 'string' ? photo : (photo.cropped || null);
};

// ==================== CALCULATIONS ====================
export var calculateAge = function(birthdate) {
  if (!birthdate) return null;
  var today = new Date();
  var birth = new Date(birthdate);
  var age = today.getFullYear() - birth.getFullYear();
  if (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) age--;
  return age;
};

export var generateVenmoCode = function(name, salt) {
  if (!name) return 'CAMP000';
  var parts = name.trim().split(' ');
  var first = (parts[0] || 'XXX').substring(0, 3).toUpperCase();
  var last = (parts[parts.length - 1] || 'XXX').substring(0, 3).toUpperCase();
  var hash = 0;
  var seed = name + (salt || '');
  for (var i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash = hash & hash;
  }
  return first + last + Math.abs(hash % 1000).toString().padStart(3, '0');
};

export var getSessionCost = function(content) { return parseInt((content.sessionCost || '$60').replace(/[^0-9]/g, '')) || 60; };

// ==================== PHOTO STORAGE (CDN) ====================
export var photoStorage = {
  isUrl: function(value) {
    if (!value) return false;
    if (typeof value === 'string') return value.startsWith('http');
    if (value.cropped) return value.cropped.startsWith('http');
    return false;
  },

  upload: async function(folder, filename, base64) {
    if (!base64 || !supabase) return null;
    if (base64.startsWith('http')) return base64;
    try {
      var match = base64.match(/^data:image\/(.*?);base64,(.*)$/);
      if (!match) return null;
      var ext = match[1] === 'jpeg' ? 'jpg' : match[1];
      var raw = atob(match[2]);
      var arr = new Uint8Array(raw.length);
      for (var j = 0; j < raw.length; j++) arr[j] = raw.charCodeAt(j);
      var blob = new Blob([arr], { type: 'image/' + match[1] });

      var path = SCHEMA + '/' + folder + '/' + filename + '.' + ext;

      var result = await supabase.storage.from('camp-photos').upload(path, blob, {
        contentType: 'image/' + match[1],
        upsert: true
      });
      if (result.error) throw result.error;

      var urlResult = supabase.storage.from('camp-photos').getPublicUrl(path);
      return urlResult.data.publicUrl;
    } catch (e) {
      console.error('Photo upload failed:', e);
      return null;
    }
  },

  uploadPhoto: async function(folder, filename, photo) {
    if (!photo) return null;
    if (typeof photo === 'string' && photo.startsWith('http')) return photo;
    var cropped = typeof photo === 'string' ? photo : photo.cropped;
    if (!cropped) return null;
    if (cropped.startsWith('http')) return cropped;
    var url = await photoStorage.upload(folder, filename, cropped);
    return url;
  }
};

// ==================== CONSTANTS ====================
export var KIDS_PER_COUNSELOR = 5;

// ==================== ERROR BOUNDARY ====================
export var ErrorBoundary = class extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return React.createElement('div', { className: 'p-6 bg-red-50 border border-red-200 rounded-xl m-4 text-center' },
        React.createElement('h3', { className: 'text-red-800 font-semibold text-lg' }, 'Something went wrong'),
        React.createElement('p', { className: 'text-red-600 text-sm mt-2' }, this.state.error?.message || 'An unexpected error occurred'),
        React.createElement('button', {
          className: 'mt-4 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700',
          onClick: () => this.setState({ hasError: false, error: null })
        }, 'Try Again')
      );
    }
    return this.props.children;
  }
};
