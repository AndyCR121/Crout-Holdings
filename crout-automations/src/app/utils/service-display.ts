import { IService } from '../interfaces/i-service.interface';
import { IServiceDisplay, ServiceAccent } from '../interfaces/i-service-display.interface';

const DEFAULT_SERVICE_ICON = `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5"/><circle cx="12" cy="16" r="1"/></svg>`;

const SERVICE_ICONS: Record<string, string> = {
  'quote-system': `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`,
  'whatsapp-agent': `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>`,
  'project-management': `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>`,
  'marketing-systems': `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>`,
  'policy-comparison': `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M12 3l7 4v10l-7 4-7-4V7l7-4z"/><path d="M9 10h6"/><path d="M9 14h4"/></svg>`,
  default: DEFAULT_SERVICE_ICON,
};

export const SERVICE_ICON_OPTIONS = [
  { key: '', label: 'Auto' },
  { key: 'quote-system', label: 'Quote / Document' },
  { key: 'whatsapp-agent', label: 'WhatsApp / Chat' },
  { key: 'project-management', label: 'Project Grid' },
  { key: 'marketing-systems', label: 'Marketing / Video' },
  { key: 'policy-comparison', label: 'Policy / Comparison' },
  { key: 'default', label: 'Generic Circle' },
] as const;

export function serviceSlug(service: Pick<IService, 'serviceName'>): string {
  return slugify(service.serviceName);
}

export function serviceRoute(service: Pick<IService, 'serviceName'>): string {
  return `/services/${serviceSlug(service)}`;
}

export function serviceLabel(service: Pick<IService, 'serviceName' | 'displayName'>): string {
  return service.displayName?.trim() || service.serviceName;
}

export function serviceTagline(service: Pick<IService, 'serviceDescription' | 'displayTagline'>): string {
  return service.displayTagline?.trim()
    || service.serviceDescription?.trim()
    || 'Custom automation designed around your business.';
}

export function serviceIcon(service: Pick<IService, 'serviceName' | 'iconKey' | 'iconSvg'>): string {
  const customIcon = service.iconSvg?.trim();
  if (customIcon) return customIcon;

  const configuredKey = service.iconKey?.trim().toLowerCase();
  if (configuredKey && SERVICE_ICONS[configuredKey]) return SERVICE_ICONS[configuredKey];

  const fallbackKey = serviceSlug(service);
  return SERVICE_ICONS[fallbackKey] ?? SERVICE_ICONS['default'];
}

export function serviceAccent(index: number): ServiceAccent {
  return index % 2 === 0 ? 'orange' : 'blue';
}

export function buildServiceDisplay(service: IService, index: number): IServiceDisplay {
  return {
    ...service,
    slug: serviceSlug(service),
    icon: serviceIcon(service),
    label: serviceLabel(service),
    tagline: serviceTagline(service),
    features: service.features ?? [],
    accent: serviceAccent(index),
  };
}

export function sortServicesForDisplay<T extends IService>(services: T[]): T[] {
  return [...services].sort((left, right) =>
    (left.displayOrder ?? Number.MAX_SAFE_INTEGER) - (right.displayOrder ?? Number.MAX_SAFE_INTEGER)
    || serviceLabel(left).localeCompare(serviceLabel(right))
    || left.serviceId - right.serviceId
  );
}

export function dedupeAddonsById<T extends { addonId: number }>(addons: T[]): T[] {
  const seen = new Map<number, T>();
  for (const addon of addons) {
    if (!seen.has(addon.addonId)) {
      seen.set(addon.addonId, addon);
    }
  }
  return [...seen.values()];
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
