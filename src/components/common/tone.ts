import type { AlertSeverity } from '../../types/domain';

export type Tone = 'ok' | 'warn' | 'crit' | 'info' | 'neutral';

export const SEVERITY_TONE: Record<AlertSeverity, Tone> = { critical: 'crit', warning: 'warn', info: 'info' };
