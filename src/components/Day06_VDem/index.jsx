// Day 06 — V-Dem · "Is Democracy Falling?"
// Line chart: Liberal Democracy Index 2010–2025, 179 countries
// Data: V-Dem Institute, Country-Year Core v16

import { useState, useMemo, useRef } from 'react'
import * as d3 from 'd3'
import domtoimage from 'dom-to-image-more'
import rawCsv from '../../data/vdem_2010_2025.csv?raw'

const BG    = '#0d0c14'
const YEARS = d3.range(2010, 2026)

// ── Parse ─────────────────────────────────────────────────────────────────────
const ALL_ROWS = (() => {
  const lines = rawCsv.trim().split('\n')
  const hdr   = lines[0].split(',')
  const col   = Object.fromEntries(hdr.map((h, i) => [h, i]))
  return lines.slice(1).filter(Boolean).map(line => {
    const v = line.split(',')
    return { iso: v[col.country_text_id], country: v[col.country_name],
             year: +v[col.year], libdem: +v[col.v2x_libdem] }
  }).filter(r => Number.isFinite(r.libdem))
})()

const ALL_TIMELINES = (() => {
  const g = d3.group(ALL_ROWS, r => r.iso)
  return Array.from(g, ([iso, recs]) => {
    const sorted = [...recs].sort((a, b) => a.year - b.year)
    return {
      iso, country: sorted.at(-1).country, records: sorted,
      v2010: sorted.find(r => r.year === 2010)?.libdem ?? null,
      v2025: sorted.find(r => r.year === 2025)?.libdem ?? null,
    }
  })
})()

const GLOBAL_AVG = YEARS.map(year => ({
  year, libdem: d3.mean(ALL_ROWS.filter(r => r.year === year), r => r.libdem)
}))

// ── Top 10 global declines ────────────────────────────────────────────────────
// (pre-computed; delta = v2025 - v2010, sorted ascending)
const SPOTLIGHT = {
  HUN: { label: 'Hungary',       color: '#ef4444', delta: -0.362, election: '12 April 2026' },
  SLV: { label: 'El Salvador',   color: '#f97316', delta: -0.332, election: null },
  SRB: { label: 'Serbia',        color: '#34d399', delta: -0.295, election: null },
  USA: { label: 'United States', color: '#60a5fa', delta: -0.277, election: null },
  IND: { label: 'India',         color: '#fbbf24', delta: -0.272, election: null },
  MLI: { label: 'Mali',          color: '#a78bfa', delta: -0.255, election: null },
  TUR: { label: 'Türkiye',       color: '#fb923c', delta: -0.250, election: null },
  BFA: { label: 'Burkina Faso',  color: '#f43f5e', delta: -0.248, election: null },
  GRC: { label: 'Greece',        color: '#818cf8', delta: -0.244, election: null },
  MEX: { label: 'Mexico',        color: '#2dd4bf', delta: -0.244, election: null },
}

// Ordered list for ranked panel (worst first)
const RANKED = Object.entries(SPOTLIGHT)
  .sort((a, b) => a[1].delta - b[1].delta)
  .map(([iso, sp], i) => ({ iso, rank: i + 1, ...sp }))

// ── Chart layout ──────────────────────────────────────────────────────────────
const W   = 580
const ML  = 30
const MR  = 18    // labels removed — panel handles legend
const MT  = 24
const MB  = 20
const IW  = W - ML - MR
const IH  = 340

const xScale = d3.scalePoint().domain(YEARS).range([0, IW]).padding(0.05)
const yScale = d3.scaleLinear().domain([0.04, 0.92]).range([IH, 0])
const lineGen = d3.line()
  .x(d => xScale(d.year)).y(d => yScale(d.libdem))
  .curve(d3.curveCatmullRom.alpha(0.5))
  .defined(d => Number.isFinite(d.libdem))

// ── Line chart ────────────────────────────────────────────────────────────────
function DemocracyChart({ focus, hovered, onHover, onPin }) {
  const threshY = yScale(0.5)
  const yTicks  = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9]

  // opacity helpers
  const lineOp = iso => {
    if (!focus) return SPOTLIGHT[iso] ? (iso === 'HUN' ? 0.92 : 0.58) : 0.09
    if (iso === hovered)               return 1
    if (iso === focus && iso !== hovered) return 0.85
    return SPOTLIGHT[iso] ? 0.1 : 0.03
  }

  // render order: bg → spotlights → focused on top
  const sorted = useMemo(() => {
    const bg   = ALL_TIMELINES.filter(t => !SPOTLIGHT[t.iso])
    const spot = ALL_TIMELINES.filter(t =>  SPOTLIGHT[t.iso] && t.iso !== focus)
    const top  = ALL_TIMELINES.find(t => t.iso === focus)
    return [...bg, ...spot, ...(top ? [top] : [])]
  }, [focus])

  const focusedData = focus ? ALL_TIMELINES.find(t => t.iso === focus) : null
  const focusedSP   = focus ? SPOTLIGHT[focus] : null

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${IH + MT + MB}`}
      style={{ display: 'block', overflow: 'visible' }}
      onClick={e => { if (e.target === e.currentTarget) onPin(null) }}>
      <g transform={`translate(${ML},${MT})`}>

        {/* Autocracy zone */}
        <rect x={0} y={threshY} width={IW} height={IH - threshY}
          fill="rgba(239,68,68,0.04)" />

        {/* Grid + y-axis */}
        {yTicks.map(t => (
          <g key={t}>
            <line x1={0} x2={IW} y1={yScale(t)} y2={yScale(t)}
              stroke={t === 0.5 ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.05)'}
              strokeWidth={t === 0.5 ? 1.5 : 1}
              strokeDasharray={t === 0.5 ? '5 4' : 'none'} />
            <text x={-6} y={yScale(t)} textAnchor="end" dominantBaseline="middle"
              fill={t === 0.5 ? 'rgba(239,68,68,0.55)' : 'rgba(255,255,255,0.18)'}
              fontSize={t === 0.5 ? 9.5 : 9} fontWeight={t === 0.5 ? 600 : 400}
              fontFamily="system-ui">{t.toFixed(1)}</text>
          </g>
        ))}

        {/* Threshold label */}
        <text x={IW - 6} y={threshY - 6} textAnchor="end"
          fontSize={8} fontWeight={600} fontFamily="system-ui"
          fill="rgba(239,68,68,0.45)" letterSpacing="0.05em">
          0.5 THRESHOLD
        </text>

        {/* X-axis */}
        {[2010, 2013, 2016, 2019, 2022, 2025].map(y => (
          <text key={y} x={xScale(y)} y={IH + 15} textAnchor="middle"
            fill="rgba(255,255,255,0.22)" fontSize={9} fontFamily="system-ui">{y}</text>
        ))}

        {/* Background lines */}
        {sorted.map(t => {
          if (SPOTLIGHT[t.iso]) return null
          return (
            <path key={t.iso} d={lineGen(t.records)} fill="none"
              stroke="rgba(255,255,255,1)" strokeWidth={0.6}
              strokeOpacity={lineOp(t.iso)} />
          )
        })}

        {/* Spotlight lines (non-focused) */}
        {sorted.map(t => {
          if (!SPOTLIGHT[t.iso] || t.iso === 'HUN') return null
          const sp  = SPOTLIGHT[t.iso]
          const isH = t.iso === hovered
          return (
            <g key={t.iso} style={{ cursor: 'pointer' }}
              onMouseEnter={() => onHover(t.iso)}
              onMouseLeave={() => onHover(null)}
              onClick={e => { e.stopPropagation(); onPin(t.iso) }}>
              <path d={lineGen(t.records)} fill="none"
                stroke="rgba(255,255,255,0.01)" strokeWidth={14} />
              <path d={lineGen(t.records)} fill="none"
                stroke={sp.color}
                strokeWidth={isH ? 2.2 : 1.6}
                strokeOpacity={lineOp(t.iso)} />
            </g>
          )
        })}

        {/* Global average */}
        <path d={lineGen(GLOBAL_AVG)} fill="none"
          stroke="rgba(255,255,255,0.9)" strokeWidth={2}
          strokeDasharray="5 3"
          strokeOpacity={focus ? 0.18 : 0.65} />
        <text x={IW - 6} y={yScale(GLOBAL_AVG.at(-1).libdem) - 7}
          textAnchor="end" fontSize={9} fontFamily="system-ui" fontStyle="italic"
          fill={`rgba(255,255,255,${focus ? 0.14 : 0.45})`}>
          World avg
        </text>

        {/* Hungary — always prominent */}
        {(() => {
          const t  = ALL_TIMELINES.find(t => t.iso === 'HUN')
          if (!t) return null
          const sp  = SPOTLIGHT.HUN
          const isH = hovered === 'HUN'
          const last = t.records.at(-1)
          return (
            <g style={{ cursor: 'pointer' }}
              onMouseEnter={() => onHover('HUN')}
              onMouseLeave={() => onHover(null)}
              onClick={e => { e.stopPropagation(); onPin('HUN') }}>
              <path d={lineGen(t.records)} fill="none"
                stroke={sp.color} strokeWidth={7} strokeOpacity={focus ? 0.05 : 0.1} />
              <path d={lineGen(t.records)} fill="none"
                stroke={sp.color} strokeWidth={isH ? 3 : 2.2}
                strokeOpacity={lineOp('HUN')} />
              {last && (
                <circle cx={xScale(last.year)} cy={yScale(last.libdem)}
                  r={4.5} fill={sp.color} stroke={BG} strokeWidth={1.5}
                  fillOpacity={lineOp('HUN')} />
              )}
              {/* Permanent label */}
              {last && (() => {
                const lx  = xScale(last.year) - 10
                const ly  = yScale(last.libdem)
                const dim = focus && focus !== 'HUN' ? 0.12 : 0.92
                // stack above dot (dot top ≈ ly - 5): 3 lines when hovered, 2 otherwise
                const y0 = isH ? ly - 36 : ly - 24   // country name
                const y1 = ly - 22                    // score (hovered only)
                const y2 = isH ? ly - 10 : ly - 11   // elections date
                return (
                  <g opacity={dim} pointerEvents="none">
                    <text x={lx} y={y0}
                      textAnchor="end" dominantBaseline="middle"
                      fontSize={11} fontWeight={700} fontFamily="system-ui" fill={sp.color}>
                      Hungary
                    </text>
                    {isH && (
                      <text x={lx} y={y1}
                        textAnchor="end" dominantBaseline="middle"
                        fontSize={9} fontFamily="system-ui" fill="rgba(255,255,255,0.7)">
                        {last.libdem.toFixed(3)} in 2025
                      </text>
                    )}
                    <text x={lx} y={y2}
                      textAnchor="end" dominantBaseline="middle"
                      fontSize={8.5} fontFamily="system-ui" fill="rgba(255,255,255,0.65)">
                      Elections {sp.election}
                    </text>
                  </g>
                )
              })()}
            </g>
          )
        })()}

        {/* Floating label for focused non-Hungary country */}
        {focus && focus !== 'HUN' && focusedData && focusedSP && (() => {
          const last = focusedData.records.at(-1)
          if (!last) return null
          const px = xScale(last.year) - 10
          const py = yScale(last.libdem)
          return (
            <g pointerEvents="none">
              <rect x={px - 68} y={py - 18} width={72} height={30}
                fill={BG} fillOpacity={0.85} rx={3} />
              <text x={px - 32} y={py - 7}
                textAnchor="middle" dominantBaseline="middle"
                fontSize={10} fontWeight={700} fontFamily="system-ui"
                fill={focusedSP.color}>
                {focusedSP.label}
              </text>
              <text x={px - 32} y={py + 7}
                textAnchor="middle" dominantBaseline="middle"
                fontSize={9} fontFamily="system-ui"
                fill="rgba(255,255,255,0.65)">
                {last.libdem.toFixed(3)} in 2025
              </text>
            </g>
          )
        })()}

      </g>
    </svg>
  )
}

// ── Ranked panel ──────────────────────────────────────────────────────────────
const MAX_DELTA = Math.abs(RANKED[0].delta)  // Hungary's delta = largest

function RankedRow({ entry, focus, hovered, onHover, onPin }) {
  const { iso, rank, label, color, delta } = entry
  const isPin = focus === iso
  const isHov = hovered === iso
  const active = isPin || isHov
  const barW = (Math.abs(delta) / MAX_DELTA) * 72   // max 72px

  return (
    <div
      style={{
        ...rp.row,
        background: isPin ? 'rgba(255,255,255,0.07)' : isHov ? 'rgba(255,255,255,0.04)' : 'transparent',
        outline: isPin ? `1px solid ${color}33` : 'none',
      }}
      onMouseEnter={() => onHover(iso)}
      onMouseLeave={() => onHover(null)}
      onClick={() => onPin(isPin ? null : iso)}
    >
      <span style={rp.rank}>{rank}</span>
      <span style={{ ...rp.dot, background: color, opacity: active ? 1 : 0.7 }} />
      <span style={{
        ...rp.name,
        color: active ? color : 'rgba(255,255,255,0.55)',
        fontWeight: active ? 700 : 400,
      }}>
        {label}
      </span>
      <div style={rp.barTrack}>
        <div style={{ ...rp.barFill, width: barW, background: color, opacity: active ? 0.9 : 0.55 }} />
      </div>
      <span style={{ ...rp.delta, color: active ? color : 'rgba(255,255,255,0.35)' }}>
        {delta.toFixed(2)}
      </span>
      <span style={{ ...rp.pin, opacity: isPin ? 1 : 0 }}>●</span>
    </div>
  )
}

function RankedPanel({ focus, hovered, onHover, onPin }) {
  const colA = RANKED.slice(0, 5)
  const colB = RANKED.slice(5, 10)

  return (
    <div style={rp.wrap}>
      <div style={rp.header}>
        <span style={rp.headerTitle}>Top 10 biggest falls · 2010 → 2025</span>
      </div>
      <div style={rp.grid} className="ranked-grid">
        <div style={rp.col}>
          {colA.map(e => <RankedRow key={e.iso} entry={e} focus={focus} hovered={hovered} onHover={onHover} onPin={onPin} />)}
        </div>
        <div style={rp.col}>
          {colB.map(e => <RankedRow key={e.iso} entry={e} focus={focus} hovered={hovered} onHover={onHover} onPin={onPin} />)}
        </div>
      </div>
    </div>
  )
}

const rp = {
  wrap: {
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 6, overflow: 'hidden',
    fontFamily: 'system-ui',
  },
  header: {
    padding: '7px 12px',
    background: 'rgba(255,255,255,0.03)',
    borderBottom: '1px solid rgba(255,255,255,0.07)',
  },
  headerTitle: {
    fontSize: 9, letterSpacing: '0.07em', textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.28)', fontWeight: 600,
  },
  grid: { display: 'flex', flexWrap: 'wrap' },
  col:  { flex: '1 1 180px', display: 'flex', flexDirection: 'column' },
  row:  {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '5px 10px', cursor: 'pointer',
    borderRadius: 3, transition: 'background 0.1s',
  },
  rank:  { width: 16, fontSize: 9, color: 'rgba(255,255,255,0.22)', textAlign: 'right', flexShrink: 0 },
  dot:   { width: 7, height: 7, borderRadius: '50%', flexShrink: 0 },
  name:  { width: 88, fontSize: 10.5, flexShrink: 0, transition: 'color 0.1s' },
  barTrack: { flex: 1, height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'visible' },
  barFill:  { height: '100%', borderRadius: 2, transition: 'opacity 0.1s' },
  delta: { width: 36, fontSize: 10, textAlign: 'right', fontVariantNumeric: 'tabular-nums', flexShrink: 0 },
  pin:   { width: 10, fontSize: 8, color: 'rgba(255,255,255,0.5)', flexShrink: 0, transition: 'opacity 0.15s' },
}

// ── Hungary panel ─────────────────────────────────────────────────────────────
function HungaryPanel() {
  const hun = ALL_TIMELINES.find(t => t.iso === 'HUN')
  if (!hun) return null
  const pctFall = Math.abs(((hun.v2025 - hun.v2010) / hun.v2010) * 100).toFixed(0)
  return (
    <div style={hp.wrap}>
      <div style={hp.flag}>🇭🇺</div>
      <div style={hp.body}>
        <div style={hp.heading}>Why Hungary?</div>
        <p style={hp.text}>
          In 2010 Hungary scored{' '}
          <strong style={{ color: '#4ade80' }}>{hun.v2010.toFixed(3)}</strong> -
          a consolidated EU democracy. Since Viktor Orban's return to power that year it has
          declined <strong style={{ color: '#ef4444' }}>every single year</strong>, reaching{' '}
          <strong style={{ color: '#ef4444' }}>{hun.v2025.toFixed(3)}</strong> in 2025: a loss
          of <strong style={{ color: '#ef4444' }}>{pctFall}%</strong> of its starting score and
          the <strong style={{ color: '#ef4444' }}>largest absolute decline of all 179 countries</strong>{' '}
          in the dataset. V-Dem classifies Hungary as an{' '}
          <em>electoral autocracy</em> since 2018 - the only EU member state with this
          classification. Elections on <strong style={{ color: '#ef4444' }}>12 April 2026</strong>.
        </p>
      </div>
      <div style={hp.stats} className="hun-stats">
        <div style={hp.stat}>
          <span style={{ ...hp.num, color: '#4ade80' }}>{hun.v2010.toFixed(2)}</span>
          <span style={hp.lbl}>2010</span>
        </div>
        <span style={{ fontSize: 16, color: 'rgba(255,255,255,0.18)', alignSelf: 'center' }}>→</span>
        <div style={hp.stat}>
          <span style={{ ...hp.num, color: '#ef4444' }}>{hun.v2025.toFixed(2)}</span>
          <span style={hp.lbl}>2025</span>
        </div>
      </div>
    </div>
  )
}

const hp = {
  wrap: {
    display: 'flex', gap: 14, alignItems: 'flex-start', flexWrap: 'wrap',
    padding: '12px 14px',
    background: 'rgba(239,68,68,0.05)',
    border: '1px solid rgba(239,68,68,0.15)', borderRadius: 6,
  },
  flag: { fontSize: 22, flexShrink: 0, paddingTop: 2 },
  body: { flex: 1 },
  heading: {
    fontSize: 10, fontWeight: 700, letterSpacing: '0.07em',
    textTransform: 'uppercase', color: '#ef4444', marginBottom: 5,
  },
  text: { fontSize: 11.5, color: 'rgba(255,255,255,0.48)', lineHeight: 1.7, margin: 0 },
  stats: { display: 'flex', alignItems: 'center', gap: 8, paddingTop: 4 },
  stat:  { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 },
  num:   { fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1 },
  lbl:   { fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.06em' },
}

// ── Day06VDem ─────────────────────────────────────────────────────────────────
export default function Day06VDem() {
  const [hovered, setHovered] = useState(null)
  const [pinned,  setPinned]  = useState('HUN')
  const [busy,    setBusy]    = useState(false)
  const cardRef = useRef(null)

  const focus = hovered || pinned   // hovered always wins over pinned

  const handlePin = iso => setPinned(p => p === iso ? null : iso)

  const exportPng = () => {
    if (!cardRef.current) return
    setBusy(true)
    domtoimage.toPng(cardRef.current, { scale: 2 })
      .then(url => {
        const a = document.createElement('a')
        a.download = 'day06-democracy-falling.png'
        a.href = url; a.click()
      })
      .finally(() => setBusy(false))
  }

  return (
    <div style={s.page}>
      <div style={s.exportBtns}>
        <button onClick={exportPng} disabled={busy}
          style={{ ...s.btn, ...(busy ? { opacity: 0.5 } : {}) }}>
          {busy ? 'exporting…' : '↓ PNG'}
        </button>
      </div>

      <div ref={cardRef} style={s.exportWrapper}>
        <div style={s.card}>

          <div>
            <h1 style={s.title}>Is democracy falling in Hungary?</h1>
            <p style={s.subtitle}>
              Liberal Democracy Index 2010-2025 · 179 countries · top 10 falls highlighted
            </p>
          </div>

          <div style={s.methodNote}>
            <strong style={{ color: 'rgba(255,255,255,0.55)' }}>v2x_libdem</strong>{' '}
            (V-Dem Liberal Democracy Index) - combines electoral competition (v2x_polyarchy)
            and liberal principles (civil liberties, rule of law, independent judiciary,
            executive constraints). Scale 0-1; higher = more democratic. The dashed line
            at <strong style={{ color: 'rgba(239,68,68,0.75)' }}>0.5</strong> is a conventional
            reference point - V-Dem's official Regimes of the World classification
            (Luhrmann et al. 2018) uses separate thresholds on v2x_polyarchy (&gt;0.5) and
            v2x_liberal (&gt;0.8). 179 countries, unweighted.
          </div>

          <div style={s.divider} />

          <DemocracyChart
            focus={focus}
            hovered={hovered}
            onHover={setHovered}
            onPin={handlePin}
          />

          <p style={s.hint}>Hover or click a line to explore other countries</p>

          <RankedPanel
            focus={focus}
            hovered={hovered}
            onHover={setHovered}
            onPin={handlePin}
          />

          <div style={s.divider} />

          <HungaryPanel />

          <div style={s.divider} />

          <div style={s.footer}>
            <span>
              V-Dem Institute · Country-Year Core v16 (March 2026) · v-dem.net ·
              Regime classification: Lührmann et al. (2018) Regimes of the World (v2x_regime)
            </span>
            <span>Design: Albrecht Mariz</span>
          </div>

        </div>
      </div>
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = {
  page: {
    minHeight: '100vh', background: BG, padding: '24px 16px',
  },
  exportWrapper: {
    background: BG, padding: '24px 16px',
    width: '100%', maxWidth: W, margin: '0 auto',
  },
  card: { width: '100%', display: 'flex', flexDirection: 'column', gap: 14 },
  eyebrow: {
    fontSize: 10, fontWeight: 500, letterSpacing: '0.18em',
    color: 'rgba(255,255,255,0.22)', textTransform: 'uppercase',
  },
  titleRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16,
  },
  title: {
    fontSize: 30, fontWeight: 800, letterSpacing: '-0.02em',
    color: '#fff', lineHeight: 1.1, margin: 0,
  },
  subtitle: { fontSize: 12, color: 'rgba(255,255,255,0.38)', margin: '7px 0 0' },
  statsRow: { display: 'flex', gap: 24, flexShrink: 0, paddingTop: 4 },
  kpi:    { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 },
  kpiNum: { fontSize: 28, fontWeight: 800, lineHeight: 1, color: '#fff', letterSpacing: '-0.02em' },
  kpiLbl: { fontSize: 10, color: 'rgba(255,255,255,0.3)' },
  methodNote: {
    fontSize: 11, color: 'rgba(255,255,255,0.32)', lineHeight: 1.65,
    padding: '9px 12px',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)', borderRadius: 5,
  },
  hint: { fontSize: 10, color: 'rgba(255,255,255,0.22)', margin: '-6px 0 0', fontStyle: 'italic', letterSpacing: '0.03em' },
  divider: { height: 1, background: 'rgba(255,255,255,0.07)' },
  footer: {
    display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4,
    fontSize: 10, color: 'rgba(255,255,255,0.18)', letterSpacing: '0.04em',
  },
  exportBtns: { position: 'fixed', bottom: 20, right: 20, zIndex: 100 },
  btn: {
    padding: '6px 16px', fontSize: 11, fontFamily: 'inherit', fontWeight: 600,
    letterSpacing: '0.08em', background: 'rgba(255,255,255,0.9)', color: BG,
    border: 'none', borderRadius: 4, cursor: 'pointer',
  },
}
