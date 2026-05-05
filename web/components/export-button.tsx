"use client";

import React, { useState, useRef, useEffect } from "react";
import { Download, FileText, Printer, FileJson, ChevronDown } from "lucide-react";

type MenuItem =
  | { type: "header"; label: string }
  | { type: "divider" }
  | { type?: never; label: string; icon: React.ReactNode; action: () => void };

export default function ExportButton() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const exportCsv = (type: string) => { window.location.href = "/api/export/csv?type=" + type; setOpen(false); };
  const exportJson = () => { window.location.href = "/api/export/json"; setOpen(false); };
  const printReport = () => { window.open("/report/print", "_blank"); setOpen(false); };

  const items: MenuItem[] = [
    { type: "header", label: "CSV Exports" },
    { label: "Full Report (All Data)", icon: <FileText className="w-4 h-4" />, action: () => exportCsv("full") },
    { label: "Listings & Revenue",     icon: <FileText className="w-4 h-4" />, action: () => exportCsv("listings") },
    { label: "Purchase Criteria",      icon: <FileText className="w-4 h-4" />, action: () => exportCsv("criteria") },
    { label: "Top Complaints",         icon: <FileText className="w-4 h-4" />, action: () => exportCsv("complaints") },
    { label: "Sentiment Breakdown",    icon: <FileText className="w-4 h-4" />, action: () => exportCsv("sentiment") },
    { type: "header", label: "Raw Data" },
    { label: "JSON Export",    icon: <FileJson className="w-4 h-4" />, action: exportJson },
    { type: "divider" },
    { label: "Print to PDF", icon: <Printer className="w-4 h-4" />, action: printReport },
  ];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors"
      >
        <Download className="w-4 h-4" />
        Export Report
        <ChevronDown className={"w-3.5 h-3.5 transition-transform " + (open ? "rotate-180" : "")} />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-700 bg-slate-900/95 backdrop-blur shadow-2xl z-50 py-1 text-sm">
          {items.map((item, i) => {
            if (item.type === "header") {
              return (
                <div key={i} className="px-3 py-1.5 text-xs font-semibold text-slate-500 uppercase tracking-widest mt-1">
                  {item.label}
                </div>
              );
            }
            if (item.type === "divider") {
              return <div key={i} className="my-1 border-t border-slate-800" />;
            }
            return (
              <button
                key={i}
                onClick={item.action}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-200 hover:bg-slate-800 hover:text-white transition-colors text-left"
              >
                <span className="text-slate-400">{item.icon}</span>
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
