import type { PillarCode, RiskBand } from './types'

// Deck palette (also mirrored as CSS variables in index.css).
export const COLORS = {
  green: '#1f9d57',
  blue: '#1565c0',
  purple: '#6a39b8',
  teal: '#00897b',
  amber: '#e2860c',
  red: '#d8483a',
} as const

export const PILLAR_COLOR: Record<PillarCode, string> = {
  E: '#1f9d57',
  S: '#1565c0',
  G: '#6a39b8',
  Other: '#9aa3ad',
}

export const PILLAR_LABEL: Record<PillarCode, string> = {
  E: 'Environmental',
  S: 'Social',
  G: 'Governance',
  Other: 'Other / boilerplate',
}

// Stable colour per metric family.
export const FAMILY_COLOR: Record<string, string> = {
  'Emissions & energy': '#1f9d57',
  'Water, waste & workforce': '#1565c0',
  Safety: '#d8483a',
  'Localization (ICV/IKTVA)': '#6a39b8',
}

export const ENTITY_COLOR: Record<string, string> = {
  FRAMEWORK: '#1565c0',
  CERTIFICATION: '#00897b',
  TARGET_YEAR: '#1f9d57',
  LOCALIZATION: '#6a39b8',
  ASSURANCE: '#e2860c',
  POLICY: '#d8483a',
}

export const ENTITY_LABEL: Record<string, string> = {
  FRAMEWORK: 'Frameworks',
  CERTIFICATION: 'Certifications',
  TARGET_YEAR: 'Targets',
  LOCALIZATION: 'Localization',
  ASSURANCE: 'Assurance',
  POLICY: 'Policies',
}

export function bandClass(band: RiskBand): string {
  return band === 'Low' ? 'band-low' : band === 'Moderate' ? 'band-moderate' : 'band-high'
}

export function bandColor(band: RiskBand): string {
  return band === 'Low' ? COLORS.green : band === 'Moderate' ? COLORS.amber : COLORS.red
}

export function familyColor(family: string): string {
  return FAMILY_COLOR[family] ?? '#5a6776'
}
