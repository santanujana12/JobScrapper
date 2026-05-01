import React, { useRef } from 'react';
import { UploadCloud, CheckCircle, FileText, X } from 'lucide-react';

export const ResumeUpload = ({ resumeText, setResumeText, resumeFile, setResumeFile, onAnalyze, loading, analyzedData }) => {
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setResumeFile(file);
      setResumeText(''); // Clear text if a file is uploaded
    }
  };

  const handleClearFile = () => {
    setResumeFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="bg-white/5 border border-white/10 p-6 rounded-2xl backdrop-blur-sm shadow-xl transition-all duration-300 hover:shadow-2xl hover:border-white/20">
      <h2 className="text-2xl font-semibold mb-4 text-white flex items-center gap-2">
        <UploadCloud className="w-6 h-6 text-blue-400" />
        1. Upload Resume
      </h2>
      
      <p className="text-gray-400 mb-4 text-sm">
        Upload your PDF resume or paste your text below. Our Gemini AI will analyze your skills and suggest job targets.
      </p>

      {resumeFile ? (
        <div className="mb-4 p-4 border border-blue-500/30 bg-blue-500/10 rounded-xl flex justify-between items-center text-blue-200">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-400" />
            <span className="font-medium truncate max-w-[200px]">{resumeFile.name}</span>
          </div>
          <button onClick={handleClearFile} className="p-1 hover:bg-blue-500/20 rounded-full transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <textarea 
          className="w-full h-48 bg-black/40 border border-gray-700 rounded-xl p-4 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none mb-4"
          placeholder="Paste your resume text here..."
          value={resumeText}
          onChange={(e) => setResumeText(e.target.value)}
        />
      )}

      <div className="flex justify-between items-center mb-4">
        {!resumeFile && (
          <div>
            <input 
              type="file" 
              accept=".pdf" 
              onChange={handleFileChange} 
              className="hidden" 
              ref={fileInputRef}
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
            >
              <UploadCloud className="w-4 h-4" /> Upload File Instead
            </button>
          </div>
        )}
      </div>

      <button
        onClick={onAnalyze}
        disabled={(!resumeText.trim() && !resumeFile) || loading}
        className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white font-medium rounded-xl transition-all duration-300 transform active:scale-[0.98] flex items-center justify-center gap-2"
      >
        {loading ? (
          <span className="animate-pulse">Analyzing...</span>
        ) : (
          <>
            Analyze Resume
            <CheckCircle className="w-4 h-4" />
          </>
        )}
      </button>

      {analyzedData && (
        <div className="mt-6 p-4 bg-emerald-900/20 border border-emerald-500/20 rounded-xl text-emerald-100 animate-in fade-in slide-in-from-bottom-4">
          <h3 className="font-semibold text-emerald-400 mb-2">Analysis Complete</h3>
          <p className="text-sm opacity-90"><span className="font-medium">Detected Skills:</span> {analyzedData.skills?.slice(0, 5).join(', ')}{analyzedData.skills?.length > 5 ? ', ...' : ''}</p>
          <p className="text-sm opacity-90"><span className="font-medium">Suggested Roles:</span> {analyzedData.suggestedRoles?.join(', ')}</p>
          {analyzedData.summary && (
            <p className="text-sm opacity-75 mt-2 italic">"{analyzedData.summary}"</p>
          )}
        </div>
      )}
    </div>
  );
};
