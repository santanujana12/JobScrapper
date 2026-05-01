import React from 'react';
import { Search, MapPin, Briefcase } from 'lucide-react';

export const JobFilters = ({ filters, setFilters, onSearch, loading }) => {
  return (
    <div className="bg-white/5 border border-white/10 p-6 rounded-2xl backdrop-blur-sm shadow-xl transition-all duration-300 hover:shadow-2xl hover:border-white/20">
      <h2 className="text-2xl font-semibold mb-4 text-white flex items-center gap-2">
        <Search className="w-6 h-6 text-purple-400" />
        2. Set Target Job
      </h2>

      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Target Role / Title</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Briefcase className="h-4 w-4 text-gray-500" />
            </div>
            <input
              type="text"
              className="w-full bg-black/40 border border-gray-700 rounded-xl pl-10 pr-4 py-3 text-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
              placeholder="e.g. Frontend Developer"
              value={filters.jobTitle}
              onChange={(e) => setFilters({ ...filters, jobTitle: e.target.value })}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Location</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MapPin className="h-4 w-4 text-gray-500" />
            </div>
            <input
              type="text"
              className="w-full bg-black/40 border border-gray-700 rounded-xl pl-10 pr-4 py-3 text-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
              placeholder="e.g. New York, NY or Remote"
              value={filters.location}
              onChange={(e) => setFilters({ ...filters, location: e.target.value })}
            />
          </div>
        </div>
      </div>

      <button
        onClick={onSearch}
        disabled={!filters.location || !filters.jobTitle || loading}
        className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 text-white font-medium rounded-xl transition-all duration-300 transform active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20"
      >
        {loading ? (
          <span className="animate-pulse">Scraping Jobs...</span>
        ) : (
          <>
            Start Job Hunt
            <Search className="w-4 h-4" />
          </>
        )}
      </button>
    </div>
  );
};
