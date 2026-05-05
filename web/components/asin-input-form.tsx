"use client"

import { useState } from "react"
import { Plus, X, Zap } from "lucide-react"

interface Props {
  onScrape: (asins: string[]) => void
  isRunning: boolean
}

export function AsinInputForm({ onScrape, isRunning }: Props) {
  const [input, setInput] = useState("")
  const [asins, setAsins] = useState<string[]>([])
  const [error, setError] = useState("")

  const addAsin = () => {
    // Split by comma, newline, or space
    const rawAsins = input.split(/[,\n\s]+/)
    const validNewAsins: string[] = []
    let hasError = false

    rawAsins.forEach(raw => {
      const val = raw.trim().toUpperCase()
      if (!val) return
      
      if (!/^[A-Z0-9]{10}$/.test(val)) {
        setError(`"${val}" is not a valid 10-character ASIN.`)
        hasError = true
        return
      }
      
      if (asins.includes(val) || validNewAsins.includes(val)) {
        return // Skip duplicates
      }
      
      if (asins.length + validNewAsins.length >= 20) {
        setError("Maximum 20 ASINs at once.")
        hasError = true
        return
      }
      
      validNewAsins.push(val)
    })

    if (validNewAsins.length > 0) {
      setAsins(prev => [...prev, ...validNewAsins])
      setInput("")
      if (!hasError) setError("")
    } else if (!hasError && input.trim()) {
      setError("No valid ASINs found in input.")
    }
  }

  const remove = (asin: string) => setAsins(prev => prev.filter(a => a !== asin))

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") addAsin()
  }

  const handleScrape = () => {
    if (asins.length === 0) {
      setError("Add at least one ASIN.")
      return
    }
    onScrape(asins)
    setAsins([])
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Scrape ASINs</h3>
        <span className="text-xs text-slate-500">{asins.length}/10 added</span>
      </div>

      {/* Input row */}
      <div className="flex gap-2">
        <input
          type="text"
          maxLength={10}
          value={input}
          onChange={e => { setInput(e.target.value.toUpperCase()); setError("") }}
          onKeyDown={handleKey}
          placeholder="e.g. B08N5WRWNW"
          className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-mono tracking-wider"
          disabled={isRunning}
        />
        <button
          onClick={addAsin}
          disabled={isRunning}
          className="flex items-center gap-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 px-3 py-2 text-sm text-white transition-colors disabled:opacity-40"
        >
          <Plus className="w-4 h-4" /> Add
        </button>
      </div>

      {error && <p className="text-xs text-rose-400">{error}</p>}

      {/* ASIN pills */}
      {asins.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {asins.map(asin => (
            <span
              key={asin}
              className="inline-flex items-center gap-1.5 rounded-full bg-slate-800 border border-slate-700 px-3 py-1 text-xs font-mono text-slate-200"
            >
              {asin}
              <button
                onClick={() => remove(asin)}
                className="text-slate-500 hover:text-rose-400 transition-colors"
                disabled={isRunning}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Scrape button */}
      <button
        onClick={handleScrape}
        disabled={isRunning || asins.length === 0}
        className="w-full flex items-center justify-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Zap className="w-4 h-4" />
        {isRunning ? "Scraping in progress…" : `Start Scraping ${asins.length > 0 ? `(${asins.length} ASIN${asins.length > 1 ? "s" : ""})` : ""}`}
      </button>
    </div>
  )
}
