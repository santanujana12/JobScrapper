import React from 'react';
import { Download, Printer } from 'lucide-react';

export const ExportPDF = ({ targetId, disabled }) => {
  const handleExport = () => {
    // Relying on native browser print dialog, which is much more reliable 
    // for modern CSS (Tailwind v4) than html2canvas which tends to freeze.
    window.print();
  };

  return (
    <button
      onClick={handleExport}
      disabled={disabled}
      className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-white font-medium rounded-xl disabled:opacity-50 transition-all shadow-md border border-gray-600"
      title="Print or Save as PDF"
    >
      <Printer className="w-4 h-4" />
      Save as PDF
    </button>
  );
};

