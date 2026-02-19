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

// ==================== PHOTO STORAGE (CDN) ====================
var photoStorage = {
  // Check if a value is already a URL (vs base64 data)
  isUrl: function(value) {
    if (!value) return false;
    if (typeof value === 'string') return value.startsWith('http');
    if (value.cropped) return value.cropped.startsWith('http');
    return false;
  },

  // Upload a base64 image to Supabase Storage, return the public URL
  // folder: 'site', 'food', 'counselors', 'parents', 'campers', 'emergency-contacts'
  // filename: e.g. 'hero', 'c_123456', 'snack_fruit'
  // base64: the data URL from the crop tool (data:image/jpeg;base64,...)
  upload: async function(folder, filename, base64) {
    if (!base64 || !supabase) return null;
    // If it's already a URL, no need to upload
    if (base64.startsWith('http')) return base64;
    try {
      // Extract the binary data from the base64 string
      var match = base64.match(/^data:image\/(.*?);base64,(.*)$/);
      if (!match) return null;
      var ext = match[1] === 'jpeg' ? 'jpg' : match[1];
      var raw = atob(match[2]);
      var arr = new Uint8Array(raw.length);
      for (var j = 0; j < raw.length; j++) arr[j] = raw.charCodeAt(j);
      var blob = new Blob([arr], { type: 'image/' + match[1] });

      // Build the path: schema/folder/filename.ext
      var path = SCHEMA + '/' + folder + '/' + filename + '.' + ext;

      // Upload (upsert so re-uploads overwrite)
      var result = await supabase.storage.from('camp-photos').upload(path, blob, {
        contentType: 'image/' + match[1],
        upsert: true
      });
      if (result.error) throw result.error;

      // Return the public URL
      var urlResult = supabase.storage.from('camp-photos').getPublicUrl(path);
      return urlResult.data.publicUrl;
    } catch (e) {
      console.error('Photo upload failed:', e);
      return null;
    }
  },

  // Upload a photo object (with cropped/original/transform) — only uploads the cropped version
  // Returns the URL string (not the object) since we no longer need to store originals in the DB
  uploadPhoto: async function(folder, filename, photo) {
    if (!photo) return null;
    // Already a URL string
    if (typeof photo === 'string' && photo.startsWith('http')) return photo;
    // Photo object with cropped field
    var cropped = typeof photo === 'string' ? photo : photo.cropped;
    if (!cropped) return null;
    // Already a URL
    if (cropped.startsWith('http')) return cropped;
    // Upload and return URL
    var url = await photoStorage.upload(folder, filename, cropped);
    return url;
  }
};

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
