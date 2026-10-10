import { Sprout } from 'lucide-react';
import { useState } from 'react';
import { useI18n } from '../../i18n/context';
import type { FieldCondition, FieldStatus } from '../../modules/water-crop/fields';
import { Card } from '../common/Card';
import { EmptyState, SelectField } from '../common/controls';
import { Freshness } from '../common/Freshness';
import { StatusBadge } from '../common/StatusBadge';
import type { Tone } from '../common/tone';

const STATUS_TONE: Record<FieldStatus, Tone> = { normal: 'ok', attention: 'warn', no_data: 'neutral' };
const SCALE_MAX = 50; // % VWC shown on the gauge

/** Horizontal gauge: shaded target band for this field, marker at the reading. */
function MoistureGauge({ c }: { c: FieldCondition }) {
  const { t, fmt } = useI18n();
  const pos = (v: number) => `${Math.min(100, Math.max(0, (v / SCALE_MAX) * 100))}%`;
  const { lowPct, highPct } = c.thresholds;
  const marker = c.status === 'attention' ? 'bg-warn-mark' : 'bg-water';
  return (
    <div>
      <div className="relative h-2 rounded-full bg-navy-50" role="img" aria-label={`${t('fields.moisture')}: ${c.moisturePct === null ? t('common.noData') : fmt.percent(c.moisturePct, 1)}; ${t('fields.targetBand', { low: lowPct, high: highPct })}`}>
        <div className="absolute inset-y-0 rounded-full bg-ok-mark/25 ring-1 ring-inset ring-ok-mark/40" style={{ insetInlineStart: pos(lowPct), width: `calc(${pos(highPct)} - ${pos(lowPct)})` }} />
        {c.moisturePct !== null && (
          <div className={`absolute top-1/2 size-3.5 -translate-y-1/2 rounded-full border-2 border-white shadow ${marker} ltr:-translate-x-1/2 rtl:translate-x-1/2`} style={{ insetInlineStart: pos(c.moisturePct) }} />
        )}
      </div>
      <p className="mt-1.5 text-[11px] text-ink-3">{t('fields.targetBand', { low: lowPct, high: highPct })}</p>
    </div>
  );
}

export function FieldConditions({ fields, now }: { fields: FieldCondition[]; now: number }) {
  const { t, fmt } = useI18n();
  const [status, setStatus] = useState<FieldStatus | 'all'>('all');
  const visible = fields.filter((f) => status === 'all' || f.status === status);

  return (
    <Card
      title={t('fields.title')}
      subtitle={t('fields.subtitle')}
      icon={<Sprout className="size-[18px]" />}
      actions={
        <SelectField
          label={t('zones.col.status')}
          value={status}
          onChange={setStatus}
          options={[
            { value: 'all', label: t('zones.allStatuses') },
            { value: 'normal', label: t('fields.status.normal') },
            { value: 'attention', label: t('fields.status.attention') },
            { value: 'no_data', label: t('fields.status.no_data') },
          ]}
        />
      }
    >
      {visible.length === 0 ? (
        <EmptyState>{t('zones.empty')}</EmptyState>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
          {visible.map((c) => (
            <li key={c.field.id} className="flex min-w-0 flex-col gap-3 rounded-lg border border-line bg-subtle/60 p-3.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-semibold text-ink">{c.field.name}</h3>
                  <p className="truncate text-xs text-ink-3">
                    {c.crop ? t(`crop.${c.crop.key}` as Parameters<typeof t>[0]) : '—'} · {t('fields.area', { area: fmt.number(c.field.areaHa, 1) })} · {t(`soil.${c.field.soilType}`)}
                  </p>
                </div>
                <StatusBadge tone={STATUS_TONE[c.status]} size="xs">
                  {t(`fields.status.${c.status}`)}
                </StatusBadge>
              </div>

              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs text-ink-3">{t('fields.moisture')}</span>
                {c.moisturePct === null ? (
                  <span className="text-sm font-medium text-ink-3">{t('common.unavailable')}</span>
                ) : (
                  <span className="flex items-baseline gap-1.5">
                    {c.deviation && <span className="text-[11px] font-medium text-warn">{t(c.deviation === 'low' ? 'fields.low' : 'fields.high')}</span>}
                    <span className="tabular text-lg font-semibold text-ink">{fmt.number(c.moisturePct, 1)}</span>
                    <span className="text-xs text-ink-3">% VWC</span>
                  </span>
                )}
              </div>

              <MoistureGauge c={c} />

              <div className="mt-auto flex flex-wrap items-center justify-between gap-x-2 gap-y-1 border-t border-line pt-2 text-[11px]">
                <span className="text-ink-3">{c.probesTotal === 0 ? t('fields.noProbes') : t('fields.probes', { reporting: c.probesReporting, total: c.probesTotal })}</span>
                {c.probesTotal > 0 && <Freshness timestamp={c.lastUpdate} now={now} quality={c.status === 'no_data' ? 'stale' : 'ok'} prefix={false} />}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
