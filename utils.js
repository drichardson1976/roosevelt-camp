// Shared utilities — loaded by all HTML files
// Storage helper, formatting, validation, and display functions
// Uses var so globals are accessible from Babel-transpiled script blocks

// ==================== STORAGE ====================
var storage = {
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
var isDev = function() { return ENV === 'development'; };

// ==================== FORMATTING ====================
var formatPhone = function(value) {
  var digits = value.replace(/\D/g, '').slice(0, 10);
  if (digits.length === 0) return '';
  if (digits.length <= 3) return '(' + digits;
  if (digits.length <= 6) return '(' + digits.slice(0, 3) + ') ' + digits.slice(3);
  return '(' + digits.slice(0, 3) + ') ' + digits.slice(3, 6) + '-' + digits.slice(6);
};

var isValidPhone = function(phone) { return (phone || '').replace(/\D/g, '').length === 10; };

var formatBirthdate = function(birthdate) {
  if (!birthdate) return '';
  var d = new Date(birthdate + 'T12:00:00');
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
};

var formatTimestamp = function(date) {
  var d = new Date(date);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
};

// ==================== DISPLAY ====================
var getDisplayPhoto = function(photo) {
  if (!photo) return null;
  return typeof photo === 'string' ? photo : (photo.cropped || null);
};

// ==================== CALCULATIONS ====================
var calculateAge = function(birthdate) {
  if (!birthdate) return null;
  var today = new Date();
  var birth = new Date(birthdate);
  var age = today.getFullYear() - birth.getFullYear();
  if (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) age--;
  return age;
};

var generateVenmoCode = function(name, salt) {
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

var getSessionCost = function(content) { return parseInt((content.sessionCost || '$60').replace(/[^0-9]/g, '')) || 60; };

// ==================== CONSTANTS ====================
var KIDS_PER_COUNSELOR = 5;

// ==================== ERROR BOUNDARY ====================
var ErrorBoundary = class extends React.Component {
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
}
