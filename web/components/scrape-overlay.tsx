"use client"

import { useState, useRef } from "react"
import { ShaderAnimation } from "@/components/ui/shader-animation"
import { Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"

interface ScrapeStatus {
  isRunning: boolean
  totalListings: number
  reviewsCollected: number
  currentAsin: string | null
  jobId: string | null
  error: string | null
}

interface ScrapeOverlayProps {
  status: ScrapeStatus
  onDismiss: () => void
}

export function ScrapeOverlay({ status, onDismiss }: ScrapeOverlayProps) {
  if (!status.isRunning) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Full-screen shader background */}
      <div className="absolute inset-0">
        <ShaderAnimation />
      </div>

      {/* Dark scrim for readability */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" />

      {/* Status card */}
      <div className="relative z-10 flex flex-col items-center gap-6 rounded-2xl border border-white/10 bg-black/60 px-10 py-8 shadow-2xl backdrop-blur-md text-center max-w-sm w-full mx-4">
        {/* Animated ring */}
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-2 border-emerald-500/20 animate-ping" />
          <div className="absolute inset-0 rounded-full border-2 border-emerald-400/60" />
          <Loader2 className="absolute inset-0 m-auto w-8 h-8 text-emerald-400 animate-spin" />
        </div>

        {/* Main message */}
        <div className="space-y-2">
          {status.error ? (
            <>
              <h2 className="text-xl font-bold text-rose-400 leading-tight">
                Job Failed
              </h2>
              <p className="text-xs text-rose-300/70 bg-rose-500/10 p-2 rounded border border-rose-500/20">
                {status.error}
              </p>
              <button 
                onClick={onDismiss}
                className="mt-2 text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 px-4 py-1.5 rounded-full transition-colors"
              >
                Dismiss
              </button>
            </>
          ) : (
            <>
              <h2 className="text-xl font-bold text-white leading-tight">
                Scraping{" "}
                <span className="text-emerald-400">{status.totalListings}</span>{" "}
                listing{status.totalListings !== 1 ? "s" : ""}…
              </h2>
              {status.currentAsin && (
                <p className="text-xs text-slate-400 font-mono tracking-wider">
                  Current: {status.currentAsin}
                </p>
              )}
            </>
          )}
        </div>

        {/* Reviews counter */}
        <div className="w-full rounded-xl bg-white/5 border border-white/10 px-6 py-4">
          <p className="text-4xl font-black text-white tabular-nums">
            {status.reviewsCollected.toLocaleString()}
          </p>
          <p className="text-xs text-slate-400 uppercase tracking-widest mt-1">
            Reviews collected
          </p>
        </div>

        {/* Progress dots */}
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>

        <p className="text-xs text-slate-500 leading-relaxed">
          This runs in the background. You can leave this page
          <br />and return when the job is complete.
        </p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Hook — manages scrape job state and polling
// ---------------------------------------------------------------------------
export function useScrapeJob() {
  const router = useRouter();
  const scrapeAsinsRef = useRef<string[]>([]);
  const [status, setStatus] = useState<ScrapeStatus>({
    isRunning: false,
    totalListings: 0,
    reviewsCollected: 0,
    currentAsin: null,
    jobId: null,
    error: null,
  })

  const startScrape = async (asins: string[]) => {
    scrapeAsinsRef.current = asins;
    setStatus({
      isRunning: true,
      totalListings: asins.length,
      reviewsCollected: 0,
      currentAsin: asins[0] ?? null,
      jobId: null,
      error: null,
    })

    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ asins }),
      })

      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()

      setStatus(prev => ({ ...prev, jobId: data.jobId }))

      // Poll /api/scrape/status every 5 s until done
      const poll = setInterval(async () => {
        try {
          const statsRes = await fetch("/api/scrape/status")
          if (!statsRes.ok) return
          const stats = await statsRes.json()
          setStatus(prev => ({
            ...prev,
            reviewsCollected: stats.totalReviews ?? prev.reviewsCollected,
            currentAsin: stats.currentAsin ?? prev.currentAsin,
            isRunning: stats.isRunning ?? prev.isRunning,
          }))

          if (!stats.isRunning) {
            clearInterval(poll)
            // Trigger AI analysis for each ASIN sequentially
            if (scrapeAsinsRef.current.length > 0) {
              for (const asin of scrapeAsinsRef.current) {
                try {
                  await fetch('/api/analyse', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ asin }),
                  });
                } catch (e) {
                  console.error('Analyse failed for', asin, e);
                }
              }
              // Force a hard refresh to ensure the server component re-fetches everything
              router.refresh();
              setTimeout(() => {
                window.location.reload();
              }, 1500);
            } else {
              setStatus(prev => ({ ...prev, isRunning: false }));
            }
          }
        } catch {}
      }, 5000)
    } catch (err: any) {
      setStatus(prev => ({ ...prev, isRunning: false, error: err.message }))
    }
  }

  const dismiss = () =>
    setStatus(prev => ({ ...prev, isRunning: false }))

  return { status, startScrape, dismiss }
}
