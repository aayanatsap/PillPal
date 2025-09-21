"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getRiskToday, apiFetch, type RiskOut, type RiskInsights } from "@/lib/api"
import { cn } from "@/lib/utils"

export default function RiskInsightCard({ className }: { className?: string }) {
  const [risk, setRisk] = useState<RiskOut | null>(null)
  const [insights, setInsights] = useState<RiskInsights | null>(null)

  useEffect(() => {
    let active = true
    Promise.all([getRiskToday(), apiFetch<RiskInsights>("/api/v1/risk/insights")])
      .then(([r, i]) => { if (!active) return; setRisk(r); setInsights(i) })
      .catch(() => {})
    return () => { active = false }
  }, [])

  if (!risk || !insights) {
    return <Card className={cn("p-4 glass-card h-28 animate-pulse", className)} />
  }

  const color = risk.bucket === 'low' ? 'text-teal-600 dark:text-teal-400'
    : risk.bucket === 'medium' ? 'text-amber-600 dark:text-amber-400'
    : 'text-red-600 dark:text-red-400'

  return (
    <Card className={cn("p-4 glass-card space-y-3", className)}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-heading text-lg font-semibold text-foreground">{insights.title || 'Adherence Risk'}</h3>
          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
            {typeof insights.misses_7d === 'number' && <span>{insights.misses_7d} misses (7d)</span>}
            {typeof insights.snoozes_7d === 'number' && <span>• {insights.snoozes_7d} snoozes (7d)</span>}
            {insights.top_missed_block && <span>• most missed: {insights.top_missed_block}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn("text-2xl font-bold font-heading", color)}>{risk.score_0_100}</span>
          <Badge variant={risk.bucket === 'low' ? 'success' : risk.bucket === 'high' ? 'destructive' : 'default'}>
            {risk.bucket.toUpperCase()}
          </Badge>
        </div>
      </div>

      {insights.highlights && insights.highlights.length > 0 && (
        <ul className="list-disc pl-5 space-y-1 text-sm text-foreground/90">
          {insights.highlights.map((h, idx) => (
            <li key={`hl-${idx}`}>{h}</li>
          ))}
        </ul>
      )}

      <div className="text-sm text-muted-foreground">
        {insights.advice}
      </div>

      {insights.next_best_action && (
        <div className="pt-2">
          <Badge className="bg-primary/10 text-primary border border-primary/20">
            Next: {insights.next_best_action}
          </Badge>
        </div>
      )}
    </Card>
  )
}
