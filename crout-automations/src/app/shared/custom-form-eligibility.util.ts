/**
 * Mirrors the backend's ServiceTriggerService.IsCustomFormName/HasConfirmedCustomFormTrigger
 * normalization exactly, so the "Share" action's eligibility check never drifts from the
 * server-side check that actually gates share-link generation.
 */
export function isCustomFormTriggerName(name: string | null | undefined): boolean {
  const normalized = (name ?? '').trim().toLowerCase().replace(/[\s\-_]/g, '');
  return normalized === 'websiteform' || normalized === 'customform';
}

export interface ConfirmedTriggerLike {
  name: string;
  confirmed: boolean;
  category: 'trigger' | 'action' | 'output';
}

export function hasConfirmedCustomFormTrigger(items: ConfirmedTriggerLike[] | null | undefined): boolean {
  if (!items?.length) return false;
  return items.some(item => item.category === 'trigger' && item.confirmed && isCustomFormTriggerName(item.name));
}
