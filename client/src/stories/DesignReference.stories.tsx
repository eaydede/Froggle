import type { Meta, StoryObj } from '@storybook/react'

const meta: Meta = {
  title: 'Design Reference',
  parameters: {
    layout: 'fullscreen',
  },
}

export default meta
type Story = StoryObj

/* ── Data ────────────────────────────────────────── */

const CORE_COLORS = [
  { token: '--card', value: '#FFFFFF', label: 'Card / Surface' },
  { token: '--text', value: '#1A1A1A', label: 'Primary Text' },
  { token: '--text-mid', value: '#666666', label: 'Mid Text' },
  { token: '--text-muted', value: '#999999', label: 'Muted Text' },
  { token: '--label-color', value: '#999999', label: 'Config Labels' },
  { token: '--track', value: '#F2F2F2', label: 'Track / Input BG' },
  { token: 'body bg', value: '#FAFAF8', label: 'Page Background' },
]

const ACCENT_COLORS = [
  { token: '--accent', value: '#6B9B7D', label: 'Accent (Sage Green)' },
  { token: '--accent-hover', value: '#5A8A6C', label: 'Accent Hover' },
]

const DARK_MODE_COLORS = [
  { token: 'dark-bg', value: '#2C2C2E', label: 'Dark Background (Slate)' },
  { token: 'dark-surface', value: '#3A3A3C', label: 'Dark Surface / Card' },
  { token: 'dark-text', value: '#E5E5E7', label: 'Dark Primary Text' },
  { token: 'dark-text-muted', value: 'rgba(255,255,255,0.45)', label: 'Dark Muted Text' },
  { token: 'dark-border', value: 'rgba(255,255,255,0.06)', label: 'Dark Border' },
  { token: 'dark-btn-primary-bg', value: '#FAF8F5', label: 'Dark Primary Button BG' },
  { token: 'dark-btn-primary-text', value: '#2C2C2E', label: 'Dark Primary Button Text' },
  { token: 'dark-btn-secondary-bg', value: 'rgba(255,255,255,0.15)', label: 'Dark Secondary Button BG' },
  { token: 'dark-btn-tertiary-border', value: 'rgba(255,255,255,0.25)', label: 'Dark Tertiary Border' },
]

const DOT_COLORS = [
  { token: '--dot', value: '#D4D4D4', label: 'Grid Dot (default)' },
  { token: '--dot-hi', value: '#333333', label: 'Grid Dot (selected)' },
  { token: '--dot-hi2', value: '#888888', label: 'Grid Dot (secondary)' },
]

const CELL_COLORS = [
  { token: '--cell-bg', value: '#E8E2DA', label: 'Cell Background' },
  { token: '--cell-text', value: '#2C2C2E', label: 'Cell Text' },
  { token: '--cell-edge', value: '#CFC9C1', label: 'Cell Edge (dice)' },
  { token: '--cell-edge-deep', value: '#C4BEB6', label: 'Cell Edge Deep (dice)' },
]

const BOARD_FEEDBACK = [
  { label: 'Selected', value: 'hsl(207, 58%, 63%)', token: '--color-selected' },
  { label: 'Valid', value: 'hsl(122, 29%, 57%)', token: '--color-valid' },
  { label: 'Invalid', value: 'hsl(4, 60%, 63%)', token: '--color-invalid' },
  { label: 'Duplicate', value: 'hsl(45, 65%, 60%)', token: '--color-duplicate' },
]

const SCORE_TIERS = [
  { points: '1pt', color: '#B0B0B0', label: 'Gray' },
  { points: '2pt', color: '#6AAB6A', label: 'Green' },
  { points: '3pt', color: '#6B9BF7', label: 'Blue' },
  { points: '5pt', color: '#A855F7', label: 'Purple' },
  { points: '11pt', color: '#D4A030', label: 'Gold' },
]

const FONTS = [
  {
    name: 'Merriweather',
    token: '--font-serif',
    family: "'Merriweather', Georgia, serif",
    weights: [400, 700, 900],
    usage: 'Headings, word list, definitions, share button',
  },
  {
    name: 'Inter',
    token: '--font-sans',
    family: "'Inter', system-ui, sans-serif",
    weights: [400, 500, 600, 700],
    usage: 'Body text, config labels, config options, subtitles',
  },
  {
    name: 'Outfit',
    token: '--font-sans',
    family: "'Outfit', sans-serif",
    weights: [400, 500, 600, 700, 800],
    usage: 'Action buttons, board cells, current word display',
  },
]

const TYPOGRAPHY_ROLES = [
  { role: 'Page Heading', token: '--font-heading', weight: '--font-heading-weight (900)', size: '1.35rem', tracking: '-0.025em', example: 'Froggle' },
  { role: 'Card Title', token: '--font-body', weight: '700', size: '0.95rem', tracking: 'normal', example: 'Daily Puzzle' },
  { role: 'Config Label', token: '--font-label', weight: '--font-label-weight (600)', size: '0.68rem', tracking: '0.06em', example: 'TIMER' },
  { role: 'Config Option', token: '--font-option', weight: '--font-option-weight (600)', size: '1.15rem', tracking: 'normal', example: '2:00' },
  { role: 'Option Subtitle', token: '--font-option', weight: '--font-option-weight (600)', size: '0.52rem', tracking: 'normal', example: 'Standard' },
  { role: 'Action Button', token: '--font-button', weight: '--font-button-weight (700)', size: '0.85rem', tracking: 'normal', example: 'Start Game' },
  { role: 'Body / Subtitle', token: '--font-body', weight: '--font-body-weight (400)', size: '0.75rem', tracking: 'normal', example: 'Choose your settings' },
  { role: 'Board Cell', token: '--font-cell', weight: '--font-cell-weight (800)', size: 'responsive', tracking: 'normal', example: 'F' },
  { role: 'Current Word', token: '--font-cell', weight: '--font-cell-weight (800)', size: '1.4rem', tracking: '0.05em', example: 'FROG' },
  { role: 'Seed Code', token: '--font-body', weight: '600', size: '0.75rem', tracking: '0.05em', example: 'FIRE-BOLD-LAMP' },
  { role: 'Results Word', token: '--font-serif', weight: '800', size: '0.8125rem', tracking: '0.5px', example: 'LEAP' },
  { role: 'Definition', token: '--font-serif', weight: '400', size: '0.8125rem', tracking: 'normal', example: 'A tailless amphibian...' },
  { role: 'Share Button', font: 'Merriweather', weight: 600, size: '0.8125rem', tracking: 'normal', example: 'Share Results' },
]

const COMPONENT_PATTERNS = [
  {
    name: 'Card',
    description: 'Primary container surface',
    specs: 'bg: var(--card), rounded-2xl, shadow: 0 0 0 1px rgba(0,0,0,0.04) + 0 4px 24px rgba(0,0,0,0.06)',
  },
  {
    name: 'Segmented Control',
    description: 'Timer, Min Letters pickers',
    specs: 'Track: var(--track) rounded-xl p-[3px]. Sliding pill: var(--card) with subtle shadow. 250ms transition.',
  },
  {
    name: 'Board Size Card',
    description: 'Selectable card with MiniGrid',
    specs: 'Selected: accent border-2, card bg, subtle shadow. Unselected: transparent border, track bg. hover lifts to card bg.',
  },
  {
    name: 'Action Button',
    description: 'Start Game, Play Again, Start Daily',
    specs: 'Full width, bg: var(--accent), text-white, rounded-xl, py-3.5, Outfit 700. Hover: var(--accent-hover).',
  },
  {
    name: 'Daily Card (Unplayed)',
    description: 'Main CTA on landing',
    specs: 'bg: var(--accent), text-white, rounded-2xl, shadow with accent tint (0.30 alpha). Config tags with white/12% bg.',
  },
  {
    name: 'Daily Card (Completed)',
    description: 'Shows results summary',
    specs: 'bg: var(--card), accent left border (3px), shadow with accent tint (0.18 alpha). Result boxes in var(--track).',
  },
  {
    name: 'Back Arrow',
    description: 'Navigation back',
    specs: 'Unicode ← at 0.85rem, text-muted, hover text. Positioned absolute left, inline with heading.',
  },
  {
    name: 'Board Cell',
    description: 'Game board letter tile',
    specs: '4 base styles (Soft Cards default). Inline computed styles for hover/press/feedback. Outfit 800.',
  },
  {
    name: 'Timer Bar',
    description: 'Game countdown',
    specs: 'h-2 rounded, track: #e0e0e0, fill: var(--accent). Unlimited: #9e9e9e.',
  },
  {
    name: 'Disabled Control',
    description: 'Locked config (Daily Puzzle)',
    specs: 'Selected: opacity-70. Unselected: opacity-30. Click triggers disabled-shake (0.3s). pointer-events preserved for shake.',
  },
]

/* ── Helpers ─────────────────────────────────────── */

const sectionStyle: React.CSSProperties = { marginBottom: 48 }
const headingStyle: React.CSSProperties = { fontFamily: "'Merriweather', Georgia, serif", fontWeight: 900, fontSize: 18, color: '#1a1a1a', marginBottom: 6 }
const subStyle: React.CSSProperties = { fontSize: 12, color: '#999', marginBottom: 20 }
const labelStyle: React.CSSProperties = { fontSize: 11, color: '#999', fontFamily: "'Inter', sans-serif", fontWeight: 500 }
const monoStyle: React.CSSProperties = { fontSize: 11, fontFamily: "'Roboto Mono', monospace", color: '#666' }

function Swatch({ color, size = 48, rounded = 8 }: { color: string; size?: number; rounded?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: rounded,
        backgroundColor: color,
        border: color === '#FFFFFF' || color === '#FAFAF8' || color === '#F2F2F2' ? '1px solid #e0e0e0' : 'none',
      }}
    />
  )
}

/* ── Stories ──────────────────────────────────────── */

export const ColorPalette: Story = {
  render: () => (
    <div style={{ padding: 48, maxWidth: 900, fontFamily: "'Inter', sans-serif" }}>
      <div style={sectionStyle}>
        <div style={headingStyle}>Core Colors</div>
        <div style={subStyle}>Neutral palette for surfaces, text, and UI chrome</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 16 }}>
          {CORE_COLORS.map(c => (
            <div key={c.token} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Swatch color={c.value} />
              <div style={{ fontSize: 12, fontWeight: 600, color: '#333' }}>{c.label}</div>
              <div style={monoStyle}>{c.value}</div>
              <div style={labelStyle}>{c.token}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={sectionStyle}>
        <div style={headingStyle}>Accent</div>
        <div style={subStyle}>Sage green — used for buttons, daily card, timer bar, selected state indicators</div>
        <div style={{ display: 'flex', gap: 24 }}>
          {ACCENT_COLORS.map(c => (
            <div key={c.token} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Swatch color={c.value} size={64} />
              <div style={{ fontSize: 12, fontWeight: 600, color: '#333' }}>{c.label}</div>
              <div style={monoStyle}>{c.value}</div>
              <div style={labelStyle}>{c.token}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={sectionStyle}>
        <div style={headingStyle}>MiniGrid Dots</div>
        <div style={subStyle}>Board size selector dot colors</div>
        <div style={{ display: 'flex', gap: 24 }}>
          {DOT_COLORS.map(c => (
            <div key={c.token} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Swatch color={c.value} size={32} rounded={4} />
              <div style={{ fontSize: 12, fontWeight: 600, color: '#333' }}>{c.label}</div>
              <div style={monoStyle}>{c.value}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={sectionStyle}>
        <div style={headingStyle}>Cell</div>
        <div style={subStyle}>Board cell surface and dice edge colors</div>
        <div style={{ display: 'flex', gap: 24 }}>
          {CELL_COLORS.map(c => (
            <div key={c.token} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Swatch color={c.value} size={48} rounded={12} />
              <div style={{ fontSize: 12, fontWeight: 600, color: '#333' }}>{c.label}</div>
              <div style={monoStyle}>{c.value}</div>
              <div style={labelStyle}>{c.token}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={sectionStyle}>
        <div style={headingStyle}>Board Feedback</div>
        <div style={subStyle}>Cell colors during gameplay (defaults at 35% wash)</div>
        <div style={{ display: 'flex', gap: 24 }}>
          {BOARD_FEEDBACK.map(c => (
            <div key={c.label} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Swatch color={c.value} size={48} rounded={12} />
              <div style={{ fontSize: 12, fontWeight: 600, color: '#333' }}>{c.label}</div>
              <div style={monoStyle}>{c.value}</div>
              <div style={labelStyle}>{c.token}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={sectionStyle}>
        <div style={headingStyle}>Score Tiers</div>
        <div style={subStyle}>Point value color coding in results</div>
        <div style={{ display: 'flex', gap: 20 }}>
          {SCORE_TIERS.map(c => (
            <div key={c.points} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: c.color }} />
              <div style={{ fontSize: 12, fontWeight: 700, color: c.color }}>{c.points}</div>
              <div style={labelStyle}>{c.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={sectionStyle}>
        <div style={headingStyle}>Dark Mode</div>
        <div style={subStyle}>Colors for dark surfaces (slate #2C2C2E background)</div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', padding: 24, borderRadius: 16, backgroundColor: '#2C2C2E' }}>
          {DARK_MODE_COLORS.map(c => (
            <div key={c.token} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Swatch color={c.value} size={48} />
              <div style={{ fontSize: 12, fontWeight: 600, color: '#E5E5E7' }}>{c.label}</div>
              <div style={{ ...monoStyle, color: 'rgba(255,255,255,0.5)' }}>{c.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  ),
}

export const Typography: Story = {
  render: () => (
    <div style={{ padding: 48, maxWidth: 900, fontFamily: "'Inter', sans-serif" }}>
      <div style={sectionStyle}>
        <div style={headingStyle}>Font Families</div>
        <div style={subStyle}>Three typefaces, each referenced via CSS variable</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          {FONTS.map(f => (
            <div key={f.name}>
              <div style={{ fontFamily: f.family, fontSize: 28, fontWeight: f.weights[f.weights.length - 1], color: '#1a1a1a', marginBottom: 4 }}>
                {f.name}
              </div>
              <div style={monoStyle}>{f.token}</div>
              <div style={{ ...labelStyle, marginTop: 2 }}>{f.family}</div>
              <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
                {f.weights.map(w => (
                  <span key={w} style={{ fontFamily: f.family, fontWeight: w, fontSize: 14, color: '#555' }}>
                    {w}
                  </span>
                ))}
              </div>
              <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>{f.usage}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={sectionStyle}>
        <div style={headingStyle}>Type Scale</div>
        <div style={subStyle}>How each font is applied across the app</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '130px 130px 180px 80px 80px 1fr', gap: 8, padding: '8px 0', borderBottom: '1px solid #eee' }}>
            <div style={{ ...labelStyle, fontWeight: 700 }}>Role</div>
            <div style={{ ...labelStyle, fontWeight: 700 }}>Token</div>
            <div style={{ ...labelStyle, fontWeight: 700 }}>Weight</div>
            <div style={{ ...labelStyle, fontWeight: 700 }}>Size</div>
            <div style={{ ...labelStyle, fontWeight: 700 }}>Tracking</div>
            <div style={{ ...labelStyle, fontWeight: 700 }}>Example</div>
          </div>
          {TYPOGRAPHY_ROLES.map(t => (
            <div key={t.role} style={{ display: 'grid', gridTemplateColumns: '130px 130px 180px 80px 80px 1fr', gap: 8, padding: '10px 0', borderBottom: '1px solid #f5f5f5', alignItems: 'center' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#333' }}>{t.role}</div>
              <div style={monoStyle}>{t.token}</div>
              <div style={monoStyle}>{t.weight}</div>
              <div style={monoStyle}>{t.size}</div>
              <div style={monoStyle}>{t.tracking}</div>
              <div style={{
                fontFamily: `var(${t.token})`,
                fontWeight: parseInt(String(t.weight)) || 400,
                fontSize: t.size === 'responsive' ? 16 : t.size,
                letterSpacing: t.tracking,
                color: '#1a1a1a',
              }}>
                {t.example}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  ),
}

export const ComponentPatterns: Story = {
  render: () => (
    <div style={{ padding: 48, maxWidth: 900, fontFamily: "'Inter', sans-serif" }}>
      <div style={headingStyle}>Component Patterns</div>
      <div style={subStyle}>Reusable patterns and their specifications</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {COMPONENT_PATTERNS.map(p => (
          <div key={p.name} style={{ padding: '16px 0', borderBottom: '1px solid #f0f0f0' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 4 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a' }}>{p.name}</div>
              <div style={{ fontSize: 12, color: '#999' }}>{p.description}</div>
            </div>
            <div style={{ fontSize: 12, color: '#555', lineHeight: 1.6, fontFamily: "'Roboto Mono', monospace" }}>
              {p.specs}
            </div>
          </div>
        ))}
      </div>
    </div>
  ),
}

export const Animations: Story = {
  render: () => (
    <div style={{ padding: 48, maxWidth: 900, fontFamily: "'Inter', sans-serif" }}>
      <div style={headingStyle}>Animations</div>
      <div style={subStyle}>Named keyframe animations and their usage</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {[
          { name: 'disabled-shake', duration: '0.3s', usage: 'Horizontal shake when tapping a disabled config control' },
          { name: 'word-bounce', duration: '0.4s', usage: 'Valid word feedback — bounces up and settles' },
          { name: 'word-pulse', duration: '0.4s', usage: 'Valid word feedback — brightness pulse' },
          { name: 'word-slide', duration: '0.5s', usage: 'Valid word feedback — slides up and returns' },
          { name: 'letter-wave', duration: '0.4s', usage: 'Valid word feedback — each letter waves sequentially (40ms stagger)' },
          { name: 'word-shake', duration: '0.3s', usage: 'Invalid / duplicate word feedback' },
          { name: 'gold-glow-square', duration: '3s infinite', usage: 'Rotating glow on 11pt score squares in results' },
          { name: 'gold-glow-dot', duration: '3s infinite', usage: 'Rotating glow on 11pt score dots in word list' },
        ].map(a => (
          <div key={a.name} style={{ padding: '12px 0', borderBottom: '1px solid #f0f0f0', display: 'grid', gridTemplateColumns: '180px 100px 1fr', gap: 12, alignItems: 'center' }}>
            <div style={monoStyle}>{a.name}</div>
            <div style={labelStyle}>{a.duration}</div>
            <div style={{ fontSize: 12, color: '#555' }}>{a.usage}</div>
          </div>
        ))}
      </div>
    </div>
  ),
}

export const FullReference: Story = {
  render: () => (
    <div style={{ padding: 48, maxWidth: 1000, fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div style={{ marginBottom: 48, borderBottom: '2px solid #1a1a1a', paddingBottom: 24 }}>
        <h1 style={{ fontFamily: "'Merriweather', Georgia, serif", fontWeight: 900, fontSize: 28, color: '#1a1a1a', margin: '0 0 4px 0' }}>
          Froggle Design Reference
        </h1>
        <p style={{ fontSize: 13, color: '#999', margin: 0 }}>
          Visual language, tokens, and component patterns
        </p>
      </div>

      {/* Colors */}
      <div style={sectionStyle}>
        <div style={headingStyle}>Color Palette</div>
        <div style={{ display: 'flex', gap: 48, flexWrap: 'wrap' }}>
          <div>
            <div style={{ ...labelStyle, marginBottom: 12, fontWeight: 700 }}>Core</div>
            <div style={{ display: 'flex', gap: 12 }}>
              {CORE_COLORS.map(c => (
                <div key={c.token} style={{ textAlign: 'center' }}>
                  <Swatch color={c.value} size={40} />
                  <div style={{ ...monoStyle, fontSize: 9, marginTop: 4 }}>{c.value}</div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div style={{ ...labelStyle, marginBottom: 12, fontWeight: 700 }}>Accent</div>
            <div style={{ display: 'flex', gap: 12 }}>
              {ACCENT_COLORS.map(c => (
                <div key={c.token} style={{ textAlign: 'center' }}>
                  <Swatch color={c.value} size={40} />
                  <div style={{ ...monoStyle, fontSize: 9, marginTop: 4 }}>{c.value}</div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div style={{ ...labelStyle, marginBottom: 12, fontWeight: 700 }}>Board Feedback</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {BOARD_FEEDBACK.map(c => (
                <div key={c.label} style={{ textAlign: 'center' }}>
                  <Swatch color={c.value} size={40} rounded={10} />
                  <div style={{ ...labelStyle, fontSize: 9, marginTop: 4 }}>{c.label}</div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div style={{ ...labelStyle, marginBottom: 12, fontWeight: 700 }}>Score Tiers</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {SCORE_TIERS.map(c => (
                <div key={c.points} style={{ textAlign: 'center' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: c.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 11, fontWeight: 700 }}>
                    {c.points}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div style={{ ...labelStyle, marginBottom: 12, fontWeight: 700 }}>Dark Mode</div>
            <div style={{ display: 'flex', gap: 8, padding: '8px 12px', borderRadius: 10, backgroundColor: '#2C2C2E' }}>
              {DARK_MODE_COLORS.slice(0, 5).map(c => (
                <div key={c.token} style={{ textAlign: 'center' }}>
                  <Swatch color={c.value} size={40} />
                  <div style={{ fontSize: 9, marginTop: 4, color: 'rgba(255,255,255,0.5)' }}>{c.label.replace('Dark ', '')}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Typography */}
      <div style={sectionStyle}>
        <div style={headingStyle}>Typography</div>
        <div style={{ display: 'flex', gap: 48 }}>
          {FONTS.map(f => (
            <div key={f.name}>
              <div style={{ fontFamily: f.family, fontSize: 20, fontWeight: f.weights[f.weights.length - 1], color: '#1a1a1a' }}>
                {f.name}
              </div>
              <div style={{ ...labelStyle, marginTop: 2 }}>
                {f.weights.join(' / ')}
              </div>
              <div style={{ fontSize: 11, color: '#888', marginTop: 4, maxWidth: 160 }}>{f.usage}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Component Specs */}
      <div style={sectionStyle}>
        <div style={headingStyle}>Components</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
          {COMPONENT_PATTERNS.map(p => (
            <div key={p.name} style={{ padding: 16, backgroundColor: '#fafaf8', borderRadius: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a', marginBottom: 2 }}>{p.name}</div>
              <div style={{ fontSize: 11, color: '#999', marginBottom: 8 }}>{p.description}</div>
              <div style={{ fontSize: 10, color: '#666', fontFamily: "'Roboto Mono', monospace", lineHeight: 1.5 }}>{p.specs}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  ),
}
