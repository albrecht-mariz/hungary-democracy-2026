// Hungary Democracy Index — Dark Version
// V-Dem Liberal Democracy Index 2010–2025 · 179 countries

import { useState, useMemo, useRef } from 'react'
import * as d3 from 'd3'
import domtoimage from 'dom-to-image-more'
import rawCsv from '../../data/vdem_2010_2025.csv?raw'

const BG   = '#0d0c14'
const YEARS = d3.range(2010, 2026)

// ── Data ──────────────────────────────────────────────────────────────────────
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

const RANKED = Object.entries(SPOTLIGHT)
  .sort((a, b) => a[1].delta - b[1].delta)
  .map(([iso, sp], i) => ({ iso, rank: i + 1, ...sp }))

// ── Chart dimensions ───────────────────────────────────────────────────────────
const W   = 520
const ML  = 34
const MR  = 16
const MT  = 28
const MB  = 22
const IW  = W - ML - MR
const IH  = 268

const xScale = d3.scalePoint().domain(YEARS).range([0, IW]).padding(0.05)
const yScale = d3.scaleLinear().domain([0.04, 0.92]).range([IH, 0])

const lineGen = d3.line()
  .x(d => xScale(d.year)).y(d => yScale(d.libdem))
  .curve(d3.curveCatmullRom.alpha(0.5))
  .defined(d => Number.isFinite(d.libdem))

// ── Chart ──────────────────────────────────────────────────────────────────────
function DemocracyChart({ focus, hovered, onHover, onPin }) {
  const threshY = yScale(0.5)
  const yTicks  = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9]
  const x2018   = xScale(2018)
  const hunData = ALL_TIMELINES.find(t => t.iso === 'HUN')
  // Fill only the band between the 0.5 threshold and Hungary's line, where Hungary < 0.5
  const areaGenThresh = d3.area()
    .x(d => xScale(d.year)).y0(threshY).y1(d => yScale(d.libdem))
    .curve(d3.curveCatmullRom.alpha(0.5))
    .defined(d => Number.isFinite(d.libdem) && yScale(d.libdem) > threshY)

  const lineOp = iso => {
    if (!focus) return SPOTLIGHT[iso] ? (iso === 'HUN' ? 0.92 : 0.58) : 0.09
    if (iso === hovered)                  return 1
    if (iso === focus && iso !== hovered) return 0.85
    return SPOTLIGHT[iso] ? 0.1 : 0.03
  }

  const sorted = useMemo(() => {
    const bg   = ALL_TIMELINES.filter(t => !SPOTLIGHT[t.iso])
    const spot = ALL_TIMELINES.filter(t => SPOTLIGHT[t.iso] && t.iso !== 'HUN' && t.iso !== focus)
    const top  = focus && focus !== 'HUN' ? ALL_TIMELINES.find(t => t.iso === focus) : null
    return [...bg, ...spot, ...(top ? [top] : [])]
  }, [focus])

  return (
    <svg
      viewBox={`0 0 ${W} ${IH + MT + MB}`}
      width="100%"
      style={{ display: 'block', overflow: 'visible' }}
      onClick={e => { if (e.target === e.currentTarget) onPin(null) }}
    >
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
              fontFamily="'IBM Plex Sans', system-ui">
              {t.toFixed(1)}
            </text>
          </g>
        ))}

        {/* Threshold label */}
        <text x={IW - 6} y={threshY - 6} textAnchor="end"
          fontSize={7.5} fontWeight={600} fontFamily="'IBM Plex Sans', system-ui"
          fill="rgba(239,68,68,0.45)" letterSpacing="0.05em">
          0.5 THRESHOLD
        </text>

        {/* 2018 autocracy annotation */}
        <line x1={x2018} x2={x2018} y1={0} y2={IH}
          stroke="rgba(239,68,68,0.2)" strokeWidth={1} strokeDasharray="3 3" />
        <text x={x2018 + 3} y={7}
          fontSize={7} fontFamily="'IBM Plex Sans', system-ui"
          fill="rgba(239,68,68,0.48)" letterSpacing="0.02em">
          electoral autocracy
        </text>

        {/* X-axis */}
        {[2010, 2013, 2016, 2019, 2022, 2025].map(y => (
          <text key={y} x={xScale(y)} y={IH + 16} textAnchor="middle"
            fill="rgba(255,255,255,0.22)" fontSize={9}
            fontFamily="'IBM Plex Sans', system-ui">{y}</text>
        ))}

        {/* Background country lines */}
        {ALL_TIMELINES.filter(t => !SPOTLIGHT[t.iso]).map(t => (
          <path key={t.iso} d={lineGen(t.records)} fill="none"
            stroke="rgba(255,255,255,1)" strokeWidth={0.6}
            strokeOpacity={lineOp(t.iso)} />
        ))}

        {/* Spotlight lines — non-Hungary */}
        {sorted.filter(t => SPOTLIGHT[t.iso] && t.iso !== 'HUN').map(t => {
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
                stroke={sp.color} strokeWidth={isH ? 2.2 : 1.6}
                strokeOpacity={lineOp(t.iso)} />
            </g>
          )
        })}

        {/* Global average */}
        <path d={lineGen(GLOBAL_AVG)} fill="none"
          stroke="rgba(255,255,255,0.7)" strokeWidth={1.8}
          strokeDasharray="5 3"
          strokeOpacity={focus ? 0.2 : 0.58} />
        <text x={8} y={yScale(GLOBAL_AVG[0].libdem) - 6}
          textAnchor="start" fontSize={8.5} fontFamily="'IBM Plex Sans', system-ui"
          fontStyle="italic"
          fill={`rgba(255,255,255,${focus ? 0.18 : 0.48})`}>
          World avg
        </text>

        {/* Hungary — area fill (below 0.5 only) + line, always on top */}
        {hunData && (() => {
          const sp   = SPOTLIGHT.HUN
          const isH  = hovered === 'HUN'
          const last = hunData.records.at(-1)
          const op   = lineOp('HUN')
          return (
            <g style={{ cursor: 'pointer' }}
              onMouseEnter={() => onHover('HUN')}
              onMouseLeave={() => onHover(null)}
              onClick={e => { e.stopPropagation(); onPin('HUN') }}>
              {/* Fill between 0.5 threshold and Hungary's line, only where Hungary < 0.5 */}
              <path d={areaGenThresh(hunData.records)} fill="#ef4444"
                fillOpacity={0.18} opacity={op} pointerEvents="none" />
              <path d={lineGen(hunData.records)} fill="none"
                stroke={sp.color} strokeWidth={isH ? 3 : 2.2}
                strokeOpacity={op} />
              {last && (
                <circle cx={xScale(last.year)} cy={yScale(last.libdem)}
                  r={4.5} fill={sp.color} stroke={BG} strokeWidth={1.5}
                  fillOpacity={op} />
              )}
              {last && (() => {
                const lx  = xScale(last.year) - 10
                const ly  = yScale(last.libdem)
                const dim = focus && focus !== 'HUN' ? 0.12 : 0.92
                return (
                  <g opacity={dim} pointerEvents="none">
                    <text x={lx} y={isH ? ly - 36 : ly - 24}
                      textAnchor="end" dominantBaseline="middle"
                      fontSize={11} fontWeight={700}
                      fontFamily="'IBM Plex Sans', system-ui" fill={sp.color}>
                      Hungary
                    </text>
                    {isH && (
                      <text x={lx} y={ly - 22}
                        textAnchor="end" dominantBaseline="middle"
                        fontSize={9} fontFamily="'IBM Plex Sans', system-ui"
                        fill="rgba(255,255,255,0.7)">
                        {last.libdem.toFixed(3)} in 2025
                      </text>
                    )}
                    <text x={lx} y={isH ? ly - 10 : ly - 11}
                      textAnchor="end" dominantBaseline="middle"
                      fontSize={8.5} fontFamily="'IBM Plex Sans', system-ui"
                      fill="rgba(255,255,255,0.5)">
                      Elections {sp.election}
                    </text>
                  </g>
                )
              })()}
            </g>
          )
        })()}

        {/* Floating tooltip for focused non-Hungary */}
        {focus && focus !== 'HUN' && (() => {
          const fd = ALL_TIMELINES.find(t => t.iso === focus)
          const sp = SPOTLIGHT[focus]
          if (!fd || !sp) return null
          const last = fd.records.at(-1)
          if (!last) return null
          const px = xScale(last.year) - 10
          const py = yScale(last.libdem)
          return (
            <g pointerEvents="none">
              <rect x={px - 68} y={py - 18} width={72} height={30}
                fill={BG} fillOpacity={0.9} rx={3}
                stroke={sp.color} strokeOpacity={0.25} strokeWidth={1} />
              <text x={px - 32} y={py - 7}
                textAnchor="middle" dominantBaseline="middle"
                fontSize={10} fontWeight={700}
                fontFamily="'IBM Plex Sans', system-ui" fill={sp.color}>
                {sp.label}
              </text>
              <text x={px - 32} y={py + 7}
                textAnchor="middle" dominantBaseline="middle"
                fontSize={9} fontFamily="'IBM Plex Sans', system-ui"
                fill="rgba(255,255,255,0.55)">
                {last.libdem.toFixed(3)} in 2025
              </text>
            </g>
          )
        })()}

      </g>
    </svg>
  )
}

// ── Ranked panel ───────────────────────────────────────────────────────────────
const BAR_SCALE = 0.5

function RankedRow({ entry, focus, hovered, onHover, onPin }) {
  const { iso, rank, label, color, delta } = entry
  const isPin  = focus === iso
  const isHov  = hovered === iso
  const active = isPin || isHov
  const barPct = `${(Math.abs(delta) / BAR_SCALE) * 100}%`

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
        <div style={{ ...rp.barFill, width: barPct, background: color, opacity: active ? 0.9 : 0.55 }} />
      </div>
      <span style={{ ...rp.delta, color: active ? color : 'rgba(255,255,255,0.35)' }}>
        {delta.toFixed(2)}
      </span>
      <span style={{ ...rp.pin, opacity: isPin ? 1 : 0 }}>●</span>
    </div>
  )
}

function RankedPanel({ focus, hovered, onHover, onPin }) {
  return (
    <div style={rp.wrap}>
      <div style={rp.header}>
        <span style={rp.headerTitle}>Top 5 biggest falls · 2010 → 2025</span>
      </div>
      <div style={rp.col}>
        {RANKED.slice(0, 5).map(e => (
          <RankedRow key={e.iso} entry={e} focus={focus} hovered={hovered}
            onHover={onHover} onPin={onPin} />
        ))}
      </div>
    </div>
  )
}

const rp = {
  wrap: { border: '1px solid rgba(255,255,255,0.07)', borderRadius: 6, overflow: 'hidden',
          fontFamily: "'IBM Plex Sans', system-ui" },
  header: { padding: '7px 12px', background: 'rgba(255,255,255,0.03)',
            borderBottom: '1px solid rgba(255,255,255,0.07)' },
  headerTitle: { fontSize: 9, letterSpacing: '0.07em', textTransform: 'uppercase',
                 color: 'rgba(255,255,255,0.28)', fontWeight: 600 },
  col:  { display: 'flex', flexDirection: 'column' },
  row:  { display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px',
          cursor: 'pointer', borderRadius: 3, transition: 'background 0.1s' },
  rank:     { width: 16, fontSize: 9, color: 'rgba(255,255,255,0.22)', textAlign: 'right', flexShrink: 0 },
  dot:      { width: 7, height: 7, borderRadius: '50%', flexShrink: 0 },
  name:     { width: 88, fontSize: 10.5, flexShrink: 0, transition: 'color 0.1s' },
  barTrack: { flex: 1, height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2 },
  barFill:  { height: '100%', borderRadius: 2, transition: 'opacity 0.1s' },
  delta:    { width: 36, fontSize: 10, textAlign: 'right', fontVariantNumeric: 'tabular-nums', flexShrink: 0 },
  pin:      { width: 10, fontSize: 8, color: 'rgba(255,255,255,0.5)', flexShrink: 0, transition: 'opacity 0.15s' },
}

// ── Main export ────────────────────────────────────────────────────────────────
export default function HungaryDemocracy() {
  const [hovered, setHovered] = useState(null)
  const [pinned,  setPinned]  = useState('HUN')
  const [busy,    setBusy]    = useState(false)
  const [showWhy, setShowWhy] = useState(false)
  const cardRef = useRef(null)

  const focus    = hovered || pinned
  const handlePin = iso => setPinned(p => p === iso ? null : iso)

  const exportPng = async () => {
    if (!cardRef.current) return
    setBusy(true)
    const el  = cardRef.current
    const btn = el.querySelector('[data-no-export]')
    el.style.width = `${W}px`
    if (btn) btn.style.display = 'none'
    await new Promise(r => setTimeout(r, 120))
    try {
      const url = await domtoimage.toPng(el, { scale: 2 })
      const a = document.createElement('a')
      a.download = 'hungary-democracy-dark.png'
      a.href = url; a.click()
    } finally {
      el.style.width = ''
      if (btn) btn.style.display = ''
      setBusy(false)
    }
  }

  return (
    <div style={s.page} className="page-container">
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
              Liberal Democracy Index 2010–2025 · 179 countries · top 5 falls highlighted
            </p>
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

          <button
            onClick={() => setShowWhy(w => !w)}
            style={s.whyBtn}
            data-no-export="true"
          >
            <span>{showWhy ? '▲' : '▼'}</span>{' '}Why Hungary?
          </button>

          {showWhy && (() => {
            const hun = ALL_TIMELINES.find(t => t.iso === 'HUN')
            if (!hun) return null
            const pctFall = Math.abs(((hun.v2025 - hun.v2010) / hun.v2010) * 100).toFixed(0)
            return (
              <div style={s.whyBox}>
                <p style={s.whyText}>
                  In 2010 Hungary scored{' '}
                  <strong style={{ color: '#4ade80' }}>{hun.v2010.toFixed(3)}</strong>{' '}
                  — a consolidated EU democracy. Since Viktor Orbán's return to power that year it has
                  declined in <strong style={{ color: '#ef4444' }}>nearly every year</strong>, reaching{' '}
                  <strong style={{ color: '#ef4444' }}>{hun.v2025.toFixed(3)}</strong> in 2025: a loss
                  of <strong style={{ color: '#ef4444' }}>{pctFall}%</strong> of its starting score and
                  the <strong style={{ color: '#ef4444' }}>largest absolute decline of all 179 countries</strong>{' '}
                  in the dataset. V-Dem classifies Hungary as an{' '}
                  <em>electoral autocracy</em> since 2018 — the only EU member state with this
                  classification. Elections on{' '}
                  <strong style={{ color: '#ef4444' }}>12 April 2026</strong>.
                </p>
                <div style={s.whyStats}>
                  <div style={s.whyStat}>
                    <span style={{ ...s.whyNum, color: '#4ade80' }}>{hun.v2010.toFixed(2)}</span>
                    <span style={s.whyLbl}>2010</span>
                  </div>
                  <span style={{ fontSize: 18, color: 'rgba(255,255,255,0.18)', alignSelf: 'center' }}>→</span>
                  <div style={s.whyStat}>
                    <span style={{ ...s.whyNum, color: '#ef4444' }}>{hun.v2025.toFixed(2)}</span>
                    <span style={s.whyLbl}>2025</span>
                  </div>
                  <div style={{ ...s.whyStat, marginLeft: 8 }}>
                    <span style={{ ...s.whyNum, color: '#ef4444', fontSize: 18 }}>−{pctFall}%</span>
                    <span style={s.whyLbl}>decline</span>
                  </div>
                </div>
              </div>
            )
          })()}

          <div style={s.divider} />

          <div style={s.footer}>
            <span>
              V-Dem Institute · Country-Year Core v16 (March 2026) · v-dem.net ·
              Regime classification: Lührmann et al. (2018)
            </span>
            <span>
              Analysis &amp; visualisation by{' '}
              <a href="https://github.com/albrecht-mariz/" target="_blank" rel="noreferrer"
                style={{ color: 'inherit', textDecoration: 'underline' }}>
                Albrecht Mariz
              </a>
              {' '}· Data, code &amp; interactive version:{' '}
              <a href="https://github.com/albrecht-mariz/hungary-democracy-2026" target="_blank" rel="noreferrer"
                style={{ color: 'inherit', textDecoration: 'underline' }}>
                github.com/albrecht-mariz/hungary-democracy-2026
              </a>
            </span>
          </div>

        </div>
      </div>
    </div>
  )
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const s = {
  page: {
    minHeight: '100vh', display: 'flex', alignItems: 'center',
    justifyContent: 'center', padding: '32px 16px',
    background: BG,
    fontFamily: "'IBM Plex Sans', system-ui, sans-serif",
    overflowX: 'hidden',
  },
  exportWrapper: {
    background: BG, padding: '32px 24px 18px',
    width: '100%', maxWidth: W,
  },
  card: { display: 'flex', flexDirection: 'column', gap: 14 },
  title: {
    fontSize: 28, fontWeight: 700, letterSpacing: '-0.025em',
    color: '#fff', lineHeight: 1.1, margin: 0,
    fontFamily: "'Playfair Display', Georgia, serif",
  },
  subtitle: { fontSize: 12, color: 'rgba(255,255,255,0.46)', margin: '6px 0 0' },
  hint: { fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: '-6px 0 0',
          fontStyle: 'italic', letterSpacing: '0.03em' },
  divider: { height: 1, background: 'rgba(255,255,255,0.07)' },
  whyBtn: {
    alignSelf: 'flex-start', padding: '5px 14px', fontSize: 11, fontWeight: 600,
    letterSpacing: '0.05em', cursor: 'pointer', whiteSpace: 'nowrap',
    background: 'rgba(239,68,68,0.1)', color: '#ef4444',
    border: '1px solid rgba(239,68,68,0.25)', borderRadius: 20,
    fontFamily: "'IBM Plex Sans', system-ui",
  },
  whyBox: {
    padding: '12px 14px',
    background: 'rgba(239,68,68,0.05)',
    border: '1px solid rgba(239,68,68,0.15)', borderRadius: 6,
    marginTop: -6,
  },
  whyText: { fontSize: 12, color: 'rgba(255,255,255,0.65)', lineHeight: 1.7,
             margin: '0 0 10px', fontFamily: "'IBM Plex Sans', system-ui" },
  whyStats: { display: 'flex', alignItems: 'center', gap: 10 },
  whyStat:  { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 },
  whyNum:   { fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1 },
  whyLbl:   { fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.06em',
              fontFamily: "'IBM Plex Sans', system-ui" },
  footer: {
    display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4,
    fontSize: 10, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.04em',
  },
  exportBtns: { position: 'fixed', bottom: 20, right: 20, zIndex: 100 },
  btn: {
    padding: '7px 18px', fontSize: 11, fontWeight: 600,
    letterSpacing: '0.08em', background: 'rgba(255,255,255,0.9)', color: BG,
    border: 'none', borderRadius: 4, cursor: 'pointer',
    fontFamily: "'IBM Plex Sans', system-ui",
    boxShadow: '0 1px 6px rgba(0,0,0,0.4)',
  },
}
