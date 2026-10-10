import { Coins, Info, SlidersHorizontal } from 'lucide-react';
import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { DEFAULT_TARIFF, SUPPORTED_CURRENCIES } from '../../config/app';
import { useI18n } from '../../i18n/context';
import type { OverviewModel } from '../../app/overview-model';
import type { CurrencyCode, ResourceTariff } from '../../types/domain';
import { Card } from '../common/Card';
import { SelectField } from '../common/controls';
import { Delta } from '../common/Delta';
import { Popover } from '../common/Popover';

const C = { water: '#2a78d6', energy: '#eb6834', grid: '#e3e8ef', tick: '#74829a' };

function TariffForm({ tariff, onApply, close }: { tariff: ResourceTariff; onApply: (t: ResourceTariff) => void; close: () => void }) {
  const { t } = useI18n();
  const [currency, setCurrency] = useState<CurrencyCode>(tariff.currency);
  const [water, setWater] = useState(String(tariff.waterPricePerM3));
  const [energy, setEnergy] = useState(String(tariff.electricityPricePerKWh));
  const w = Number(water.replace(',', '.'));
  const e = Number(energy.replace(',', '.'));
  const valid = water.trim() !== '' && energy.trim() !== '' && Number.isFinite(w) && Number.isFinite(e) && w >= 0 && e >= 0;

  return (
    <form
      className="space-y-3 p-4 text-xs"
      onSubmit={(ev) => {
        ev.preventDefault();
        if (!valid) return;
        onApply({ currency, waterPricePerM3: w, electricityPricePerKWh: e, source: 'user' });
        close();
      }}
    >
      <p className="text-sm font-semibold text-ink">{t('costs.tariffs')}</p>
      <div className="space-y-1">
        <span className="text-ink-2">{t('costs.currency')}</span>
        <SelectField label={t('costs.currency')} value={currency} onChange={setCurrency} options={SUPPORTED_CURRENCIES.map((c) => ({ value: c, label: c }))} className="w-full" />
      </div>
      {[
        { label: t('costs.waterPrice'), value: water, set: setWater },
        { label: t('costs.elecPrice'), value: energy, set: setEnergy },
      ].map((f) => (
        <label key={f.label} className="block space-y-1">
          <span className="text-ink-2">{f.label} ({currency})</span>
          <input
            inputMode="decimal"
            value={f.value}
            onChange={(ev) => f.set(ev.target.value)}
            className="tabular h-8 w-full rounded-lg border border-line px-2.5 text-xs focus:border-navy-500"
          />
        </label>
      ))}
      {!valid && <p className="text-crit">{t('costs.invalid')}</p>}
      <p className="text-ink-3">{t('costs.currencyNote')}</p>
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <button type="submit" disabled={!valid} className="rounded-md bg-navy-800 px-3 py-1.5 font-medium text-white hover:bg-navy-700 disabled:opacity-50">
          {t('costs.save')}
        </button>
        <button type="button" onClick={close} className="rounded-md border border-line px-3 py-1.5 font-medium text-ink-2 hover:bg-subtle">
          {t('costs.cancel')}
        </button>
        <button
          type="button"
          onClick={() => {
            onApply(DEFAULT_TARIFF);
            close();
          }}
          className="ms-auto text-navy-700 underline-offset-2 hover:underline"
        >
          {t('costs.reset')}
        </button>
      </div>
    </form>
  );
}

export function CostSummaryCard({ model, onTariffChange }: { model: OverviewModel; onTariffChange: ((t: ResourceTariff) => void) | null }) {
  const { t, fmt } = useI18n();
  const { costs, tariff, period } = model;
  const cur = tariff.currency;
  const data = costs.series.map((p) => ({ label: fmt.bucket(p.start, period.granularity), long: fmt.bucketLong(p.start, period.granularity), water: p.water, energy: p.energy }));

  const CostTooltip = ({ active, payload }: { active?: boolean; payload?: ReadonlyArray<{ payload?: unknown }> }) => {
    if (!active || !payload?.length) return null;
    const p = payload[0].payload as (typeof data)[number];
    return (
      <div className="rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-pop">
        <p className="mb-1 font-semibold">{p.long}</p>
        {(['water', 'energy'] as const).map((k) => (
          <p key={k} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-ink-2">
              <span className="size-2.5 rounded-full" style={{ background: C[k] }} />
              {t(`costs.${k}`)}
            </span>
            <span className="tabular font-medium">{p[k] === null ? '—' : fmt.currency(p[k] as number, cur)}</span>
          </p>
        ))}
      </div>
    );
  };

  return (
    <Card
      title={t('costs.title')}
      subtitle={t('costs.subtitle')}
      icon={<Coins className="size-[18px]" />}
      actions={
        onTariffChange && (
        <Popover
          label={t('costs.tariffs')}
          trigger={({ toggle, open }) => (
            <button type="button" onClick={toggle} aria-expanded={open} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line px-2.5 text-xs font-medium text-ink-2 hover:bg-subtle">
              <SlidersHorizontal aria-hidden className="size-3.5" /> {t('costs.editTariffs')}
            </button>
          )}
        >
          {(close) => <TariffForm tariff={tariff} onApply={onTariffChange} close={close} />}
        </Popover>
        )
      }
      footer={
        <span className="flex items-start gap-1.5">
          <Info aria-hidden className="mt-px size-3.5 shrink-0" />
          {t('costs.noSavings')}
        </span>
      }
    >
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-xs text-ink-3">
            {t('costs.total')} · {t(`range.long.${period.range}`)}
          </p>
          <p className="tabular text-2xl font-semibold text-ink">{fmt.currency(costs.current.total, cur)}</p>
        </div>
        <Delta pct={costs.changePct} caption={t(`range.vs.${period.range}`)} />
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
        {(
          [
            ['water', costs.current.waterCost, fmt.volume(costs.current.waterM3)],
            ['energy', costs.current.energyCost, fmt.energy(costs.current.energyKWh)],
          ] as const
        ).map(([k, value, qty]) => (
          <div key={k} className="rounded-lg border border-line px-2.5 py-2">
            <dt className="flex items-center gap-1.5 text-ink-3">
              <span className="size-2.5 rounded-full" style={{ background: C[k] }} aria-hidden />
              {t(`costs.${k}`)}
            </dt>
            <dd className="tabular mt-0.5 text-sm font-semibold text-ink">{fmt.currency(value, cur)}</dd>
            <dd className="tabular text-[11px] text-ink-3">{qty}</dd>
          </div>
        ))}
      </dl>

      <div dir="ltr" className="mt-3 h-36 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -12 }} barCategoryGap="20%">
            <CartesianGrid vertical={false} stroke={C.grid} />
            <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: C.grid }} tick={{ fontSize: 10, fill: C.tick }} minTickGap={16} interval="preserveStartEnd" />
            <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: C.tick }} width={44} tickFormatter={(v: number) => fmt.number(v, v < 10 ? 1 : 0)} />
            <Tooltip content={CostTooltip} cursor={{ fill: 'rgba(15,29,51,0.04)' }} />
            <Bar dataKey="water" stackId="c" fill={C.water} isAnimationActive={false} />
            <Bar dataKey="energy" stackId="c" fill={C.energy} radius={[3, 3, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <p className="mt-2 text-[11px] text-ink-3">
        {t('costs.rates', {
          water: fmt.currency(tariff.waterPricePerM3, cur, 3),
          energy: fmt.currency(tariff.electricityPricePerKWh, cur, 3),
          source: t(`costs.source.${tariff.source}`),
        })}
        {costs.current.unmeteredEnergyEvents > 0 && <> · {t('costs.unmeteredEnergy', { count: costs.current.unmeteredEnergyEvents })}</>}
      </p>
    </Card>
  );
}
