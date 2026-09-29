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

/**
 * Mirrors the backend's CustomFormTriggerEligibility.HasConfirmedCustomFormTrigger(configJson)
 * exactly, reading the raw UserService config JSON directly rather than a component's
 * already-normalized item list. The dev-approved config's top-level "trigger" array (written by
 * ServiceCatalogService) is the canonical source of confirmed triggers and is not represented in
 * the confirmedAddons/requestedAddons/addonIds shapes that the per-page parsers build for
 * rendering, so eligibility must be checked against the raw config to avoid drifting from the
 * server-side gate that actually controls share-link generation.
 */
export function hasConfirmedCustomFormTriggerInConfig(configJson: string | null | undefined): boolean {
  if (!configJson) return false;
  try {
    const parsed = JSON.parse(configJson);

    const triggerNames = Array.isArray(parsed?.trigger) ? parsed.trigger : [];
    if (triggerNames.some((name: unknown) => isCustomFormTriggerName(String(name ?? '')))) return true;

    const confirmedAddons = Array.isArray(parsed?.confirmedAddons) ? parsed.confirmedAddons : [];
    return confirmedAddons.some((addon: any) =>
      String(addon?.type ?? '').toLowerCase() === 'trigger' && isCustomFormTriggerName(addon?.name));
  } catch {
    return false;
  }
}
