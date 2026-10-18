import React from 'react';

/**
 * Reusable skeleton loader for post/job/mentorship cards.
 * Usage: <SkeletonCard lines={3} />
 */
const SkeletonCard = ({ lines = 2, avatar = false, wide = false }) => (
  <div className={`bg-white rounded-2xl border border-slate-100 p-6 shadow-sm animate-pulse ${wide ? 'w-full' : ''}`}>
    <div className="flex items-center gap-4 mb-4">
      {avatar && <div className="h-11 w-11 rounded-full bg-slate-200 flex-shrink-0" />}
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-slate-200 rounded-full w-3/5" />
        <div className="h-3 bg-slate-100 rounded-full w-2/5" />
      </div>
    </div>
    {Array.from({ length: lines }).map((_, i) => (
      <div
        key={i}
        className="h-3 bg-slate-100 rounded-full mb-2"
        style={{ width: `${90 - i * 15}%` }}
      />
    ))}
    <div className="mt-4 h-8 bg-slate-100 rounded-xl w-28" />
  </div>
);

export default SkeletonCard;
