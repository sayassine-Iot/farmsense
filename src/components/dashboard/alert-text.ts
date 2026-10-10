import type { I18nValue, MessageKey } from '../../i18n/context';
import type { Alert, Species } from '../../types/domain';

/** Localized title, explanation and subject label for an alert. */
export function alertText(alert: Alert, { t, fmt }: Pick<I18nValue, 't' | 'fmt'>) {
  const p = alert.params;
  const num = (k: string) => Number(p[k]);
  const formatted: Record<string, string | number> = { ...p };

  switch (alert.type) {
    case 'high_water_use':
      formatted.flow = fmt.flow(num('flow'));
      formatted.design = fmt.flow(num('design'));
      break;
    case 'low_soil_moisture':
    case 'high_soil_moisture':
      formatted.value = fmt.percent(num('value'), 1);
      formatted.threshold = fmt.percent(num('threshold'));
      break;
    case 'tank_low':
      formatted.level = fmt.percent(num('level'));
      formatted.threshold = fmt.percent(num('threshold'));
      formatted.volume = fmt.volume(num('volume'));
      break;
    case 'pump_long_run':
      formatted.minutes = fmt.duration(num('minutes'));
      formatted.max = fmt.duration(num('max'));
      break;
    case 'device_offline':
      formatted.minutes = num('minutes') < 0 ? t('common.never') : fmt.duration(num('minutes'));
      break;
    case 'low_battery':
      formatted.battery = fmt.percent(num('battery'));
      break;
    case 'activity_deviation':
      formatted.pct = fmt.percent(num('pct'));
      formatted.direction = t(`alert.activity_deviation.${p.direction === 'above' ? 'above' : 'below'}`);
      formatted.species = t(`species.${p.species as Species}`);
      break;
    case 'body_temperature_high':
      formatted.value = fmt.temperature(num('value'));
      formatted.threshold = fmt.temperature(num('threshold'));
      formatted.species = t(`species.${p.species as Species}`);
      break;
    case 'respiration_high':
    case 'heart_rate_high':
    case 'rumination_low':
      formatted.value = fmt.number(num('value'));
      formatted.threshold = fmt.number(num('threshold'));
      formatted.species = t(`species.${p.species as Species}`);
      break;
    case 'irrigation_completed':
      formatted.volume = fmt.volume(num('volume'), 1);
      formatted.minutes = fmt.duration(num('minutes'));
      break;
  }

  const subject = String(p.zone ?? p.field ?? p.animal ?? p.device ?? p.tank ?? alert.target.id);
  return {
    title: t(`alert.${alert.type}.title` as MessageKey),
    body: t(`alert.${alert.type}.body` as MessageKey, formatted),
    subject,
    targetLabel: t(`alerts.target.${alert.target.kind}`),
  };
}
