import React, { useState, useEffect } from 'react';
import { supabase, SCHEMA } from '../config';
import { RELEASE_NOTES } from '../release-notes';

export const VersionBanner = ({ isVisible, isDev, version, buildDate }) => {
  const [elapsed, setElapsed] = useState('0s');
  const [dbStatus, setDbStatus] = useState('checking');
  const [showNotes, setShowNotes] = useState(false);

  const formatBuildDate = () => {
    const d = buildDate;
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    let hours = d.getHours();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${days[d.getDay()]} ${months[d.getMonth()]} ${d.getDate()} ${hours}:${min} ${ampm} PST`;
  };

  useEffect(() => {
    const update = () => {
      const diff = Math.floor((new Date() - buildDate) / 1000);
      const h = Math.floor(diff / 3600), m = Math.floor((diff % 3600) / 60), s = diff % 60;
      setElapsed((h > 0 ? h + 'h ' : '') + (m > 0 ? m + 'm ' : '') + s + 's');
    };
    update();
    const i = setInterval(update, 1000);
    supabase.from('camp_content').select('id').limit(1).then(({ error }) => setDbStatus(error ? 'error' : 'connected')).catch(() => setDbStatus('error'));
    return () => clearInterval(i);
  }, []);

  if (!isVisible) return null;

  return (
    <React.Fragment>
      <div className={(isDev ? 'bg-red-600' : 'bg-green-600') + ' text-white text-center py-2 text-sm font-mono'}>
        <span className="font-bold">{isDev ? 'DEVELOPMENT' : 'PRODUCTION'}</span>
        <span className="mx-2">&bull;</span>
        <span>v{version}</span>
        <span className="mx-2">&bull;</span>
        <span>{dbStatus === 'connected' ? '✓ DB (' + SCHEMA + ')' : dbStatus === 'checking' ? '⏳...' : '✗ DB Error'}</span>
        <span className="mx-2">&bull;</span>
        <span>Built: {formatBuildDate()} ({elapsed} ago)</span>
        <span className="mx-2">&bull;</span>
        <button onClick={() => setShowNotes(true)} className="underline">Notes</button>
      </div>
      {showNotes && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowNotes(false)}>
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-6 pb-2">
              <h2 className="font-bold text-xl">Release Notes</h2>
            </div>
            <div className="flex-1 overflow-y-auto px-6 pb-2">
              {RELEASE_NOTES.map((r, i) => (
                <div key={r.version} className={i > 0 ? 'mt-3 pt-3 border-t' : ''}>
                  <div className="font-mono text-green-700">v{r.version} <span className="text-gray-400 text-sm">{r.date}{r.time && ` at ${r.time}`}</span>{r.author && <span className="text-blue-600 text-sm ml-2">by {r.author}</span>}</div>
                  <ul className="text-sm text-gray-600 mt-1">{r.changes.map((c, j) => <li key={j}>&bull; {c}</li>)}</ul>
                </div>
              ))}
            </div>
            <div className="p-6 pt-2">
              <button onClick={() => setShowNotes(false)} className="w-full py-2 bg-green-600 text-white rounded-lg">Close</button>
            </div>
          </div>
        </div>
      )}
    </React.Fragment>
  );
};
