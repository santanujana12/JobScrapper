'use client';

import React from 'react';
import { useJobSearch } from '../controllers/useJobSearch';
import { ResumeUpload } from '../views/ResumeUpload';
import { JobFilters } from '../views/JobFilters';
import { ResultsTable } from '../views/ResultsTable';
import { ExportPDF } from '../views/ExportPDF';
import { Sparkles, Briefcase, ChevronRight } from 'lucide-react';

export default function Home() {
  const {
    resumeText,
    setResumeText,
    resumeFile,
    setResumeFile,
    analyzedData,
    filters,
    setFilters,
    jobs,
    loading,
    error,
    handleAnalyzeResume,
    handleScrapeJobs
  } = useJobSearch();

  return (
    <main className="min-h-screen p-6 md:p-12 lg:p-24 max-w-7xl mx-auto flex flex-col gap-12 font-sans relative">
      {/* Decorative background elements */}
      <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-[128px] opacity-20 animate-blob"></div>
      <div className="absolute top-0 -right-4 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-[128px] opacity-20 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-8 left-20 w-72 h-72 bg-emerald-500 rounded-full mix-blend-multiply filter blur-[128px] opacity-20 animate-blob animation-delay-4000"></div>

      {/* Header */}
      <header className="relative text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm mb-4 backdrop-blur-md">
          <Sparkles className="w-4 h-4" />
          <span>AI-Powered Job Scraper</span>
        </div>
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">
          Find Your Perfect Match
        </h1>
        <p className="text-gray-400 max-w-2xl mx-auto text-lg md:text-xl">
          Upload your resume and let our Agentic AI scan, analyze, and scrape the best opportunities across top job boards tailored specifically to your skills.
        </p>
      </header>

      {error && (
        <div className="relative p-4 bg-red-900/30 border border-red-500/30 rounded-xl text-red-200 text-center shadow-lg backdrop-blur-md">
          <span className="font-semibold mr-2">Error:</span> {error}
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 relative z-10">
        <ResumeUpload 
          resumeText={resumeText}
          setResumeText={setResumeText}
          resumeFile={resumeFile}
          setResumeFile={setResumeFile}
          onAnalyze={handleAnalyzeResume}
          loading={loading && !jobs.length} // Only show loading here if it's the analyze phase
          analyzedData={analyzedData}
        />
        
        <div className="flex flex-col h-full justify-between">
          <JobFilters 
            filters={filters}
            setFilters={setFilters}
            onSearch={handleScrapeJobs}
            loading={loading && jobs.length === 0} // Show loading here if scraping
          />
          
          {/* Visual Connector / Hint */}
          <div className="hidden lg:flex flex-col items-center justify-center flex-1 opacity-50 mt-8">
            <Briefcase className="w-12 h-12 text-gray-600 mb-2" />
            <div className="flex space-x-2">
              <ChevronRight className="w-6 h-6 text-gray-600 animate-pulse" />
              <ChevronRight className="w-6 h-6 text-gray-600 animate-pulse delay-75" />
              <ChevronRight className="w-6 h-6 text-gray-600 animate-pulse delay-150" />
            </div>
          </div>
        </div>
      </div>

      {/* Results Section */}
      <section className="relative z-10 mt-8" id="results-section">
        <div className="flex flex-col md:flex-row justify-between items-end mb-6 gap-4">
          <div>
            <h2 className="text-3xl font-bold text-white flex items-center gap-2">
              Job Matches
              {jobs.length > 0 && (
                <span className="text-sm font-medium bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full border border-blue-500/20">
                  {jobs.length} Found
                </span>
              )}
            </h2>
            <p className="text-gray-400 mt-1">AI-ranked job opportunities based on your resume.</p>
          </div>
          
          {jobs.length > 0 && (
            <ExportPDF targetId="results-section" disabled={loading} />
          )}
        </div>
        
        <ResultsTable jobs={jobs} />
      </section>
    </main>
  );
}
