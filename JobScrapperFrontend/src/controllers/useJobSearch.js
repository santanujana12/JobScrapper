'use client';

import { useState, useRef } from 'react';
import { createResumeModel } from '../models/ResumeModel';
import { createJobModel } from '../models/JobModel';

/**
 * Central controller hook that wires the UI to the GraphQL backend.
 *
 * Flow:
 *  1. User provides resume (text or PDF) → handleAnalyzeResume
 *     → Gemini extracts skills + suggestedRoles
 *     → auto-fills jobTitle with the first suggested role.
 *  2. User adjusts filters → handleScrapeJobs
 *     → enqueues scraping task on the backend
 *     → polls every 2 s until completed/failed
 *     → updates jobs list.
 */
export const useJobSearch = () => {
  // ── Input state ───────────────────────────────────────────────────────────
  const [resumeText, setResumeText] = useState('');
  const [resumeFile, setResumeFile] = useState(null);
  const [analyzedData, setAnalyzedData] = useState(null);
  const [filters, setFilters] = useState({ location: '', jobTitle: '' });

  // ── Output state ──────────────────────────────────────────────────────────
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [phase, setPhase] = useState('idle'); // 'idle' | 'analyzing' | 'scraping'

  // Models created once per hook instance (avoids SSR singleton issues)
  const resumeModel = useRef(createResumeModel()).current;
  const jobModel = useRef(createJobModel()).current;

  // Track active poll so we can abandon it on a new search
  const pollTimer = useRef(null);

  // ── Analyze Resume ────────────────────────────────────────────────────────

  const handleAnalyzeResume = async () => {
    const input = resumeFile || resumeText;
    if (!input) {
      setError('Please provide resume text or upload a PDF');
      return;
    }

    // Cancel any in-flight poll
    if (pollTimer.current) clearTimeout(pollTimer.current);

    setLoading(true);
    setPhase('analyzing');
    setError(null);

    try {
      const result = await resumeModel.analyze(input);
      setAnalyzedData(result);

      // Auto-fill job title with the first AI-suggested role
      const firstRole = result.suggestedRoles?.[0] || result.jobTitles?.[0] || '';
      if (firstRole) {
        setFilters((prev) => ({ ...prev, jobTitle: firstRole }));
      }
    } catch (err) {
      setError(err.message || 'Failed to analyze resume');
    } finally {
      setLoading(false);
      setPhase('idle');
    }
  };

  // ── Scrape Jobs ───────────────────────────────────────────────────────────

  const handleScrapeJobs = async () => {
    if (!filters.jobTitle?.trim()) {
      setError('Please enter a target job title');
      return;
    }

    // Cancel any in-flight poll
    if (pollTimer.current) clearTimeout(pollTimer.current);

    setLoading(true);
    setPhase('scraping');
    setError(null);
    setJobs([]);

    let enteredPolling = false;

    try {
      const result = await jobModel.scrape({
        jobTitle: filters.jobTitle,
        location: filters.location,
        resumeKeywords: analyzedData?.keywords || '',
      });

      if (result?.taskId) {
        enteredPolling = true;

        const poll = async () => {
          try {
            const status = await jobModel.checkStatus(result.taskId);

            if (status?.status === 'completed') {
              setJobs(status.jobs || []);
              setLoading(false);
              setPhase('idle');
            } else if (status?.status === 'failed') {
              setError('Scraping job failed on the server');
              setLoading(false);
              setPhase('idle');
            } else {
              // pending / in_progress — keep polling
              pollTimer.current = setTimeout(poll, 2000);
            }
          } catch (err) {
            setError('Failed to check job status: ' + err.message);
            setLoading(false);
            setPhase('idle');
          }
        };

        pollTimer.current = setTimeout(poll, 2000);
        return; // ← exit here; poll loop owns loading state from now on
      }

      // Fallback (no taskId): results returned synchronously
      setJobs(result?.jobs || []);
    } catch (err) {
      setError(err.message || 'Failed to scrape jobs');
    } finally {
      // Only stop loading if we did NOT enter the polling branch
      if (!enteredPolling) {
        setLoading(false);
        setPhase('idle');
      }
    }
  };

  // ── Reset ─────────────────────────────────────────────────────────────────

  const resetSearch = () => {
    if (pollTimer.current) clearTimeout(pollTimer.current);
    setJobs([]);
    setError(null);
    setAnalyzedData(null);
    setLoading(false);
    setPhase('idle');
  };

  return {
    // Input
    resumeText,
    setResumeText,
    resumeFile,
    setResumeFile,
    // Analysis output
    analyzedData,
    // Search filters
    filters,
    setFilters,
    // Results
    jobs,
    // Status
    loading,
    phase,  // 'idle' | 'analyzing' | 'scraping' — lets UI show specific messages
    error,
    // Actions
    handleAnalyzeResume,
    handleScrapeJobs,
    resetSearch,
  };
};
