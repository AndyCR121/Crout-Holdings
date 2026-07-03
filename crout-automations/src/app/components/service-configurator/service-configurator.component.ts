import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, OnInit, SimpleChanges, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { IAddon, IPackage, IPricingComponent, IService, IDeveloperReferralOption } from '../../interfaces/i-service.interface';
import { IAddonState, IPackageView } from '../../interfaces/i-service-display.interface';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { CompanyService } from '../../services/company.service';
import { ToastService } from '../../services/toast.service';
import { AuthModalComponent } from '../auth-modal/auth-modal.component';

@Component({
  selector: 'ca-service-configurator',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, AuthModalComponent],
  templateUrl: './service-configurator.component.html',
  styleUrl: './service-configurator.component.scss'
})
export class ServiceConfiguratorComponent implements OnInit, OnChanges {
  private readonly auth = inject(AuthService);
  private readonly api = inject(ApiService);
  private readonly companies = inject(CompanyService);
  private readonly toast = inject(ToastService);

  /** The single service this configurator is scoped to */
  @Input() services: IService[] = [];
  /** All addons (will be filtered to this service internally) */
  @Input() addons: IAddon[] = [];
  /** Packages scoped to this service (root + child) */
  @Input() packages: IPackage[] = [];
  /**
   * Full services list, needed to resolve conditional services that live
   * in a child package (the Conditional flag is on the IService row).
   */
  @Input() allServices: IService[] = [];
  /** Pass-through from parent so skeleton shows while parent is loading */
  @Input() loading = false;

  packageViews: IPackageView[] = [];
  requiredPricingComponents: IPricingComponent[] = [];
  developerReferrals: IDeveloperReferralOption[] = [];
  developerReferralsLoading = false;
  referralCode = '';
  selectedCompanyId: number | null = null;
  savingConfig = signal<number | null>(null);
  showAuthModal = signal(false);

  readonly user = this.auth.currentUser;
  readonly isLoggedIn = this.auth.isLoggedIn;
  readonly companyList = this.companies.companies;
  readonly hasCompanies = computed(() => this.companyList().length > 0);

  readonly PACKAGE_DISCOUNT = 0.15;
  skeletonPackages = Array(1).fill(null);

  constructor() {
    effect(() => {
      const companies = this.companyList();
      if (!this.selectedCompanyId && companies.length > 0) {
        this.selectedCompanyId = companies.find(c => c.active)?.companyId ?? companies[0].companyId;
      }
    });
  }

  ngOnInit(): void {
    const user = this.user();
    if (user) this.companies.load(user.userId);

    this.loadDeveloperReferrals();

    this.api.getRequiredPricingComponents().subscribe({
      next: components => {
        this.requiredPricingComponents = components.filter(c =>
          c.isActive
          && c.isRequiredDefault
          && !c.componentName.toLowerCase().includes('setup')
          && !c.componentKey.toLowerCase().includes('setup')
        );
      },
      error: () => {
        this.requiredPricingComponents = [];
      }
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.loading && this.packages.length > 0) {
      this.buildViews();
    }
  }

  get hasDeveloperReferralOptions(): boolean {
    return this.developerReferrals.length > 0;
  }

  developerReferralLabel(option: IDeveloperReferralOption): string {
    return `${option.firstName} ${option.surname} - ${option.referral}`.replace(/\s+/g, ' ').trim();
  }

  private loadDeveloperReferrals(): void {
    this.developerReferralsLoading = true;
    this.api.getDeveloperReferrals().subscribe({
      next: referrals => {
        this.developerReferrals = referrals;
        this.developerReferralsLoading = false;
      },
      error: () => {
        this.developerReferrals = [];
        this.developerReferralsLoading = false;
        this.toast.error('Developer referrals could not be loaded. You can continue without one.');
      }
    });
  }

  private selectedReferral(): string | undefined {
    const referral = this.referralCode.trim();
    return referral || undefined;
  }

  private buildViews(): void {
    const rootPackages = this.packages.filter(pkg => pkg.parentPackageId == null);

    this.packageViews = rootPackages.map(pkg => {
      const childPkg = this.packages.find(p => p.parentPackageId === pkg.packageId) ?? null;
      const serviceIds = [...new Set([...(pkg.serviceIds ?? [])])];
      const childServiceIds = childPkg?.serviceIds ?? [];

      const rootServices: IService[] = serviceIds.reduce<IService[]>((acc, id) => {
        const svc = this.allServices.find(s => s.serviceId === id);
        if (svc) acc.push(svc);
        return acc;
      }, []);

      const conditionalService = childServiceIds
        .map(id => this.allServices.find(s => s.serviceId === id))
        .find((svc): svc is IService => !!svc && (svc.conditional || !serviceIds.includes(svc.serviceId)))
        ?? null;

      const rootAddonStates: IAddonState[] = serviceIds.flatMap(svcId =>
        this.addons
          .filter(a => (a.serviceIds?.length ? a.serviceIds.includes(svcId) : a.serviceId === svcId))
          .map(a => ({ addon: a, enabled: false }))
      );

      return {
        pkg,
        childPkg,
        conditionalService,
        conditionalEnabled: false,
        rootServices,
        rootAddonStates,
        childAddonStates: [],
        conditionalIndex: -1,
        addonStates: [...rootAddonStates],
      } satisfies IPackageView;
    });
  }

  toggleConditional(view: IPackageView): void {
    view.conditionalEnabled = !view.conditionalEnabled;

    if (view.conditionalEnabled && view.childPkg && view.childAddonStates.length === 0) {
      view.childAddonStates = (view.childPkg.serviceIds ?? []).flatMap(svcId =>
        this.addons
          .filter(a => (a.serviceIds?.length ? a.serviceIds.includes(svcId) : a.serviceId === svcId))
          .map(a => ({ addon: a, enabled: false, isConditionalChild: true }))
      );
    }

    view.addonStates = this.buildMergedAddonList(view);
  }

  private buildMergedAddonList(view: IPackageView): IAddonState[] {
    if (!view.conditionalEnabled) return [...view.rootAddonStates];
    return [...view.rootAddonStates, ...view.childAddonStates];
  }

  toggleAddon(state: IAddonState): void {
    state.enabled = !state.enabled;
  }

  activePkg(view: IPackageView): IPackage {
    return view.conditionalEnabled && view.childPkg ? view.childPkg : view.pkg;
  }

  activeServices(view: IPackageView): IService[] {
    if (view.conditionalEnabled && view.childPkg) {
      const childServices = (view.childPkg.serviceIds ?? []).reduce<IService[]>((acc, id) => {
        const svc = this.allServices.find(s => s.serviceId === id);
        if (svc) acc.push(svc);
        return acc;
      }, []);

      const seen = new Set(view.rootServices.map(s => s.serviceId));
      const merged = [...view.rootServices];
      for (const svc of childServices) {
        if (!seen.has(svc.serviceId)) merged.push(svc);
      }
      return merged;
    }

    return view.rootServices;
  }

  enabledAddonCount(view: IPackageView): number {
    return view.addonStates.filter(s => s.enabled).length;
  }

  private minAddonsRequired(view: IPackageView): number {
    return this.activePkg(view).minimumRequiredAddons ?? 0;
  }

  discountUnlocked(view: IPackageView): boolean {
    const min = this.minAddonsRequired(view);
    return min === 0 || this.enabledAddonCount(view) >= min;
  }

  addonsNeededForDiscount(view: IPackageView): number {
    return Math.max(0, this.minAddonsRequired(view) - this.enabledAddonCount(view));
  }

  basePrice(view: IPackageView): number {
    return this.activeServices(view).reduce((sum, svc) => sum + (svc.price ?? 0), 0);
  }

  enabledAddonTotal(view: IPackageView): number {
    return view.addonStates
      .filter(s => s.enabled)
      .reduce((sum, s) => sum + s.addon.price, 0);
  }

  requiredTotal(): number {
    return this.requiredPricingComponents.reduce((sum, c) => sum + (c.amount ?? 0), 0);
  }

  fullTotal(view: IPackageView): number {
    return this.basePrice(view) + this.enabledAddonTotal(view) + this.requiredTotal();
  }

  discountedTotal(view: IPackageView): number {
    if (!this.discountUnlocked(view)) return this.fullTotal(view);
    const discount = this.activePkg(view).discount ?? 0;
    return Math.round(this.fullTotal(view) * (1 - discount));
  }

  saving(view: IPackageView): number {
    return this.fullTotal(view) - this.discountedTotal(view);
  }

  formatPrice(n: number): string {
    return n.toLocaleString('en-ZA');
  }

  contactUrl(view: IPackageView): string {
    const params = new URLSearchParams({
      service: this.primaryService(view)?.serviceName ?? this.activePkg(view).packageName,
      package: this.activePkg(view).packageName,
      config: encodeURIComponent(JSON.stringify(this.buildContactConfig(view)))
    });

    const referral = this.selectedReferral();
    if (referral) params.set('referral', referral);

    return `/contact-us/?${params.toString()}`;
  }

  addToAccount(view: IPackageView): void {
    const companyId = this.selectedCompanyId ?? this.companyList().find(c => c.active)?.companyId ?? null;
    const service = this.primaryService(view);
    if (!companyId || !service) {
      this.toast.error('Select a company before adding this service.');
      return;
    }

    this.savingConfig.set(view.pkg.packageId);
    this.api.createUserServiceFromConfig({
      companyId,
      serviceId: service.serviceId,
      packageId: this.activePkg(view).packageId,
      addonIds: view.addonStates.filter(s => s.enabled).map(s => s.addon.addonId),
      referral: this.selectedReferral(),
      requestNote: 'Created from website service configurator.'
    }).subscribe({
      next: () => {
        this.toast.success('Service added to your account.');
        this.savingConfig.set(null);
      },
      error: () => {
        this.toast.error('Could not add the service. Please try again or contact us.');
        this.savingConfig.set(null);
      }
    });
  }

  openAuthPrompt(): void {
    this.showAuthModal.set(true);
  }

  private primaryService(view: IPackageView): IService | null {
    return this.activeServices(view).find(s => !s.conditional) ?? this.activeServices(view)[0] ?? null;
  }

  private buildContactConfig(view: IPackageView) {
    const service = this.primaryService(view);
    return {
      serviceId: service?.serviceId,
      serviceName: service?.serviceName,
      packageId: this.activePkg(view).packageId,
      packageName: this.activePkg(view).packageName,
      basePrice: this.basePrice(view),
      requiredComponents: this.requiredPricingComponents.map(c => ({
        componentKey: c.componentKey,
        componentName: c.componentName,
        amount: c.amount
      })),
      requiredTotal: this.requiredTotal(),
      fullTotal: this.fullTotal(view),
      discountedTotal: this.discountedTotal(view),
      discount: this.activePkg(view).discount,
      services: this.activeServices(view).map(s => ({
        serviceId: s.serviceId,
        serviceName: s.serviceName,
        price: s.price
      })),
      addons: view.addonStates.filter(s => s.enabled).map(s => ({
        addonId: s.addon.addonId,
        addonName: s.addon.addonName,
        price: s.addon.price
      }))
    };
  }
}
