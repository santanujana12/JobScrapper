import React, { useState, useMemo } from 'react';
import { ExternalLink, Star, Clock, ChevronLeft, ChevronRight } from 'lucide-react';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const PAGE_SIZE = 10;

const SOURCE_LABELS = {
  remoteok:  { label: 'RemoteOK',  color: 'bg-green-500/20  text-green-400  border-green-500/30' },
  remotive:  { label: 'Remotive',  color: 'bg-blue-500/20   text-blue-400   border-blue-500/30' },
  arbeitnow: { label: 'Arbeitnow', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  jobicy:    { label: 'Jobicy',    color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  himalayas: { label: 'Himalayas', color: 'bg-cyan-500/20   text-cyan-400   border-cyan-500/30' },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatPostedAge(postedAt) {
  if (!postedAt) return null;
  const days = Math.floor((Date.now() - postedAt) / (1000 * 60 * 60 * 24));
  if (days === 0) return 'Today';
  if (days === 1) return '1 day ago';
  return `${days}d ago`;
}

function ageColor(postedAt) {
  if (!postedAt) return 'text-gray-500';
  const days = Math.floor((Date.now() - postedAt) / (1000 * 60 * 60 * 24));
  if (days <= 7)  return 'text-emerald-400';
  if (days <= 20) return 'text-yellow-400';
  return 'text-orange-400';
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------
function SourceBadge({ source }) {
  const meta = SOURCE_LABELS[source] ?? { label: source, color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' };
  return (
    <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${meta.color}`}>
      {meta.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export const ResultsTable = ({ jobs }) => {
  const [page, setPage] = useState(1);
  const [activeSource, setActiveSource] = useState('all');

  // Derive available sources from current results
  const sources = useMemo(() => {
    const seen = new Set(jobs.map(j => j.source).filter(Boolean));
    return ['all', ...seen];
  }, [jobs]);

  // Filter by source tab
  const filtered = useMemo(() => {
    setPage(1); // reset to page 1 on filter change
    return activeSource === 'all' ? jobs : jobs.filter(j => j.source === activeSource);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSource, jobs]);

  // Paginate
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages);
  const pageJobs   = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // ── Empty state ───────────────────────────────────────────────────────────
  if (!jobs || jobs.length === 0) {
    return (
      <div className="bg-white/5 border border-white/10 p-12 rounded-2xl flex flex-col items-center justify-center text-center backdrop-blur-sm">
        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
          <Star className="w-8 h-8 text-gray-500" />
        </div>
        <h3 className="text-xl font-medium text-gray-300 mb-2">No Jobs Found Yet</h3>
        <p className="text-gray-500 max-w-sm">
          Upload your resume and set your target job filters above to start scraping for the best matches.
        </p>
      </div>
    );
  }

  // ── Table ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4">

      {/* Source filter tabs */}
      <div className="flex flex-wrap gap-2">
        {sources.map(src => {
          const meta = src === 'all'
            ? { label: `All (${jobs.length})`, color: '' }
            : { label: `${SOURCE_LABELS[src]?.label ?? src} (${jobs.filter(j => j.source === src).length})`, color: '' };

          const isActive = activeSource === src;
          return (
            <button
              key={src}
              onClick={() => { setActiveSource(src); setPage(1); }}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all duration-200 ${
                isActive
                  ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20'
                  : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20 hover:text-gray-200'
              }`}
            >
              {meta.label}
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-sm shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 border-b border-white/10">
                <th className="py-4 px-5 font-semibold text-gray-300 text-sm">Match</th>
                <th className="py-4 px-5 font-semibold text-gray-300 text-sm">Job Title</th>
                <th className="py-4 px-5 font-semibold text-gray-300 text-sm">Company</th>
                <th className="py-4 px-5 font-semibold text-gray-300 text-sm">Location</th>
                <th className="py-4 px-5 font-semibold text-gray-300 text-sm">Posted</th>
                <th className="py-4 px-5 font-semibold text-gray-300 text-sm text-right">Apply</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {pageJobs.map((job, idx) => {
                const score       = Math.round((job.score || 0) * 100);
                const postedLabel = formatPostedAge(job.postedAt);
                const postedClass = ageColor(job.postedAt);

                return (
                  <tr key={job.id || idx} className="hover:bg-white/5 transition-colors group">
                    {/* Score */}
                    <td className="py-3 px-5">
                      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-green-400/20 to-emerald-600/20 border border-emerald-500/30 flex items-center justify-center">
                        <span className="text-emerald-400 font-bold text-xs">{score}%</span>
                      </div>
                    </td>

                    {/* Title + source badge */}
                    <td className="py-3 px-5">
                      <div className="font-medium text-gray-100 group-hover:text-blue-400 transition-colors leading-snug mb-1">
                        {job.title}
                      </div>
                      {job.source && <SourceBadge source={job.source} />}
                    </td>

                    {/* Company */}
                    <td className="py-3 px-5 text-gray-300 text-sm">{job.company}</td>

                    {/* Location */}
                    <td className="py-3 px-5 text-gray-400 text-sm max-w-[160px] truncate">{job.location}</td>

                    {/* Posted age */}
                    <td className="py-3 px-5">
                      {postedLabel ? (
                        <span className={`flex items-center gap-1 text-xs whitespace-nowrap ${postedClass}`}>
                          <Clock className="w-3 h-3 flex-shrink-0" />
                          {postedLabel}
                        </span>
                      ) : (
                        <span className="text-gray-600 text-xs">—</span>
                      )}
                    </td>

                    {/* Apply */}
                    <td className="py-3 px-5 text-right">
                      <a
                        href={job.applyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600/20 text-blue-400 text-sm rounded-lg hover:bg-blue-600/30 transition-colors"
                      >
                        Apply
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ── Pagination bar ───────────────────────────────────────────────── */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-white/10 bg-white/2">
            {/* Info */}
            <span className="text-sm text-gray-500">
              Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length} jobs
            </span>

            {/* Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Page numbers — show at most 5 */}
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(n => n === 1 || n === totalPages || Math.abs(n - safePage) <= 1)
                .reduce((acc, n, i, arr) => {
                  if (i > 0 && n - arr[i - 1] > 1) acc.push('…');
                  acc.push(n);
                  return acc;
                }, [])
                .map((item, i) =>
                  item === '…' ? (
                    <span key={`ellipsis-${i}`} className="text-gray-600 px-1 text-sm">…</span>
                  ) : (
                    <button
                      key={item}
                      onClick={() => setPage(item)}
                      className={`w-8 h-8 rounded-lg text-sm font-medium transition-all ${
                        item === safePage
                          ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                          : 'bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {item}
                    </button>
                  )
                )}

              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
