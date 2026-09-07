# Graph Report - crout-automations  (2026-09-06)

## Corpus Check
- 189 files · ~302,175 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1730 nodes · 3486 edges · 126 communities (69 shown, 57 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 66 edges (avg confidence: 0.7)
- Token cost: 385,418 input · 0 output

## Community Hubs (Navigation)
- Services Admin
- Pages Dev
- Mixed (directives Scroll Reveal Directive Ts + Others)
- Mixed (interfaces I Service Interface Ts + Others)
- Components Marketing Workspace
- Pages Portal
- Components Pricing
- Pages Dev
- Components Service Configurator
- Components Service Trigger Renderer
- Mixed (pages Dev + Others)
- Pages Admin
- Services Auth
- Pages Dev
- Services Api
- Components Auth Modal
- Services Booking
- Tsconfig
- Mixed (utils Service Display Ts + Others)
- Mixed (services Company Ts + Others)
- Pages Admin
- Pages Admin
- Pages Dev
- Pages Admin
- Pages Admin
- Pages Admin
- Package
- Pages Portal
- Pages Admin
- Mixed (services Confirm Dialog Ts + Others)
- Pages Dev
- Services Admin
- Pages Admin
- Package
- Pages Dev
- Pages Admin
- Mixed (components Marketing Workspace + Others)
- Pages Admin
- Pages Portal
- Pages Admin
- Mixed (services Toast Ts + Others)
- Pages Admin
- Pages Admin
- Angular
- Mixed (app Ts + Others)
- Pages Contact
- Pages Portal
- Mixed (components Pricing + Others)
- Components Service Trigger Renderer
- Pages Dev
- Pages Admin
- Pages Portal
- Pages Book Consultation
- Services Paystack
- Mixed (pages Portal + Others)
- Services Video Project
- Pages Dev
- Angular
- Angular
- Tsconfig Spec
- Tsconfig App
- Mixed (components Auth Modal + Others)
- Components Account Button
- Components Navbar
- Pages Admin
- Pages Portal
- Components Service Trigger Renderer
- Pages Dev
- Interfaces I Service Trigger Interface
- Pages Admin
- Pages Portal
- Services N8n
- Angular
- Mixed (components Release Notes Dialog + Others)
- Components Portal Sidebar
- Mixed (components Privacy Policy + Others)
- Services Service Trigger Api
- Services Integration Definition Api
- Services Webhook
- Src
- Angular
- Mixed (components Cta Banner + Others)
- Components Navigation Page
- Angular
- Pages Home
- Package
- Components Marketing Workspace
- Pages Portal
- Services Seo
- Package
- Services Admin Integration Draft
- Pages Services
- Pages Services
- Pages Services
- Pages Services
- Services Auth
- README Md
- Pages Book Consultation
- Components Integration Action Button
- Components Privacy Policy
- Pages Not Found
- Package
- Package
- Package
- Docker
- Package
- Package
- README Md
- Interfaces I How It Works Step Interface
- Interfaces I Pricing Tier Interface
- Interfaces I Service Card Interface
- Interfaces I Why Feature Interface
- Pages Admin
- Src
- README Md
- README Md
- Components Confirm Dialog
- Components How It Works
- Components Navigation Page
- Pages Admin
- Pages Admin
- WORDPRESS DEPLOY Md

## God Nodes (most connected - your core abstractions)
1. `DevServiceFormBuilderComponent` - 139 edges
2. `AdminService` - 84 edges
3. `ServiceTriggerRendererComponent` - 72 edges
4. `IService` - 59 edges
5. `AuthService` - 52 edges
6. `MarketingWorkspaceComponent` - 51 edges
7. `ServiceConfiguratorComponent` - 50 edges
8. `IAddon` - 48 edges
9. `IPackageView` - 43 edges
10. `PricingComponent` - 41 edges

## Surprising Connections (you probably didn't know these)
- `errorInterceptor()` --indirect_call--> `AuthService`  [INFERRED]
  src/app/interceptors/error.interceptor.ts → src/app/services/auth.service.ts
- `Current SPA Deployment Model` --cites--> `Crout Automations Project (README)`  [EXTRACTED]
  WORDPRESS-DEPLOY.md → README.md
- `Docker Compose Hosting Workflow` --references--> `crout-automations-spa Docker Compose Service`  [EXTRACTED]
  README.md → docker-compose.yml
- `crout-automations-spa Docker Compose Service` --references--> `env.js Runtime API URL Injection`  [EXTRACTED]
  docker-compose.yml → README.md
- `Portal Sidebar Component` --semantically_similar_to--> `Account Button Component`  [INFERRED] [semantically similar]
  src/app/components/portal-sidebar/portal-sidebar.component.html → src/app/components/account-button/account-button.component.html

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Landing-page scroll-reveal section pattern** — src_app_components_hero_hero_component_hero, src_app_components_pain_point_pain_point_component_pain_point, src_app_components_how_it_works_how_it_works_component_how_it_works, src_app_components_services_overview_services_overview_component_services_overview, src_app_components_why_crout_why_crout_component_why_crout, src_app_components_pricing_pricing_component_pricing [INFERRED 0.80]
- **Shared client-portal dashboard navigation across app shells** — src_app_components_navbar_navbar_component_navbar, src_app_components_account_button_account_button_component_account_button, src_app_components_portal_sidebar_portal_sidebar_component_portal_sidebar, src_app_pages_admin_admin_component_admin_shell [INFERRED 0.85]
- **Addon pricing and configuration flow across admin, pricing, and configurator** — src_app_pages_admin_addons_admin_addons_component_admin_addons, src_app_components_pricing_pricing_component_pricing, src_app_components_service_configurator_service_configurator_component_service_configurator [INFERRED 0.85]
- **Inline-Edit CRUD Table Pattern** — src_app_pages_admin_companies_admin_companies_component_template, src_app_pages_admin_users_admin_users_component_template, src_app_pages_admin_services_admin_services_component_template, src_app_pages_admin_packages_admin_packages_component_template, src_app_pages_admin_service_features_admin_service_features_component_template, src_app_pages_admin_client_services_admin_client_services_component_template [INFERRED 0.85]
- **Developer Service Assignment and Commission Flow** — src_app_pages_admin_dev_management_admin_dev_management_component_template, src_app_pages_dev_dashboard_dev_dashboard_component_template, src_app_pages_dev_services_dev_services_component_template, src_app_pages_dev_service_guide_dev_service_guide_component_template [INFERRED 0.85]
- **Dynamic Custom Form Builder Flow** — src_app_pages_dev_service_guide_dev_service_guide_component_template, src_app_pages_dev_service_guide_form_builder_dev_service_form_builder_component_template, external_ca_service_trigger_renderer [INFERRED 0.85]
- **Shared Public Service-Page Template Pattern** — src_app_pages_services_marketing_systems_marketing_systems_component, src_app_pages_services_project_management_project_management_component, src_app_pages_services_quote_system_quote_system_component, src_app_pages_services_whatsapp_agent_whatsapp_agent_component, src_app_pages_services_service_detail_service_detail_component [EXTRACTED 1.00]
- **Portal User-Service Management & Integration-Status Flow** — src_app_pages_portal_services_portal_services_component, src_app_pages_portal_services_service_details_portal_service_details_component, src_app_pages_portal_dashboard_portal_dashboard_component [EXTRACTED 1.00]
- **Paystack-Based Billing & Card-Capture Flow** — src_app_pages_portal_billing_portal_billing_component, src_app_pages_portal_billing_subscriptions_portal_subscriptions_component, src_app_pages_portal_billing_payment_methods_portal_payment_methods_component, src_index_paystack_script [EXTRACTED 1.00]

## Communities (126 total, 57 thin omitted)

### Community 0 - "Services Admin"
Cohesion: 0.08
Nodes (6): IServiceFeature, AdminService, normalizeAddon(), normalizePackage(), normalizeService(), Injectable

### Community 1 - "Pages Dev"
Cohesion: 0.08
Nodes (8): IDevPortalService, IPagedResult, DevDashboardComponent, Component, DevServicesComponent, Component, DevService, Injectable

### Community 2 - "Mixed (directives Scroll Reveal Directive Ts + Others)"
Cohesion: 0.09
Nodes (21): Directive, CtaBannerComponent, Component, HeroComponent, Component, HowItWorksComponent, Component, PainPointComponent (+13 more)

### Community 3 - "Mixed (interfaces I Service Interface Ts + Others)"
Cohesion: 0.12
Nodes (23): IntegrationStatusBadgeComponent, Component, ICompany, IDatabaseMigrationStep, IDatabaseMigrationSummary, IDevDashboard, IntegrationLifecycleStatus, ISchemaCount (+15 more)

### Community 4 - "Components Marketing Workspace"
Cohesion: 0.07
Nodes (4): MarketingWorkspaceComponent, Component, Input, Output

### Community 6 - "Components Pricing"
Cohesion: 0.12
Nodes (6): PricingComponent, Component, IPackageView, IService, FindByIdPipe, Pipe

### Community 7 - "Pages Dev"
Cohesion: 0.10
Nodes (3): CustomFormParagraphElement, DevServiceFormBuilderComponent, Component

### Community 8 - "Components Service Configurator"
Cohesion: 0.11
Nodes (4): ServiceConfiguratorComponent, Component, Input, IAddonState

### Community 9 - "Components Service Trigger Renderer"
Cohesion: 0.10
Nodes (6): ServiceTriggerRendererComponent, Component, HostListener, Input, Output, ServiceTriggerConfig

### Community 10 - "Mixed (pages Dev + Others)"
Cohesion: 0.10
Nodes (17): PendingChangesComponent, pendingChangesGuard(), CustomFormBaseElement, CustomFormDividerElement, CustomFormElementType, CustomFormHeaderElement, CustomFormListItemBaseField, CustomFormListItemCheckboxField (+9 more)

### Community 12 - "Services Auth"
Cohesion: 0.10
Nodes (13): adminGuard(), authGuard(), devGuard(), IUser, AdminComponent, Component, AuthService, IAuthResponse (+5 more)

### Community 14 - "Services Api"
Cohesion: 0.14
Nodes (12): BundleRequiredComponentView, IDeveloperReferralOption, IPackage, IPricingComponent, ApiService, normalizeAddon(), normalizeDeveloperReferralOption(), normalizePackage() (+4 more)

### Community 15 - "Components Auth Modal"
Cohesion: 0.10
Nodes (7): AuthModalComponent, AuthTab, AuthView, PasswordField, Component, getPasswordValidationErrors(), isValidEmail()

### Community 16 - "Services Booking"
Cohesion: 0.10
Nodes (11): FormState, BookingService, IAvailabilityBlock, IBooking, IBookingAvailabilitySettings, IBookingCalendar, IBookingCalendarSettings, Injectable (+3 more)

### Community 17 - "Tsconfig"
Cohesion: 0.07
Nodes (27): dom, ES2022, angularCompilerOptions, enableI18nLegacyMessageIdFormat, strictInjectionParameters, strictInputAccessModifiers, strictTemplates, compileOnSave (+19 more)

### Community 18 - "Mixed (utils Service Display Ts + Others)"
Cohesion: 0.18
Nodes (18): BundleRequiredComponentView, IServiceDisplay, ServiceAccent, ServiceDetailComponent, Component, ServicesComponent, Component, buildServiceDisplay() (+10 more)

### Community 19 - "Mixed (services Company Ts + Others)"
Cohesion: 0.12
Nodes (10): ILoginPayload, IPasswordResetSessionResponse, ISignupPayload, CompanyService, Injectable, EnvironmentService, Injectable, ShellContextService (+2 more)

### Community 20 - "Pages Admin"
Cohesion: 0.11
Nodes (4): IAdminClientService, IAdminClientServiceUpsert, AdminClientServicesComponent, Component

### Community 23 - "Pages Admin"
Cohesion: 0.14
Nodes (6): IReleaseNote, AdminReleaseNotesComponent, Component, ReleaseNoteDialogData, ReleaseNoteFormDialogComponent, Component

### Community 24 - "Pages Admin"
Cohesion: 0.14
Nodes (4): ISchemaDifference, SchemaDifferenceSeverity, AdminDatabaseManagementComponent, Component

### Community 26 - "Package"
Cohesion: 0.10
Nodes (21): @angular/cli, @angular/compiler-cli, @angular-devkit/build-angular, jasmine-core, karma, karma-chrome-launcher, karma-coverage, karma-jasmine (+13 more)

### Community 27 - "Pages Portal"
Cohesion: 0.14
Nodes (5): TimelineItem, TimelineTrack, PortalVideoEditorComponent, Component, Input

### Community 28 - "Pages Admin"
Cohesion: 0.17
Nodes (3): DynamicFieldOption, AdminIntegrationCredentialBuilderComponent, Component

### Community 29 - "Mixed (services Confirm Dialog Ts + Others)"
Cohesion: 0.13
Nodes (10): ConfirmDialogComponent, Component, ICreateDevServiceAssignment, IDevServiceAssignment, IUpdateDevServiceAssignment, ActiveFilter, AssignedFilter, ConfirmDialogService (+2 more)

### Community 31 - "Services Admin"
Cohesion: 0.15
Nodes (8): IDatabaseManagementTarget, IDatabaseMigrationOperation, IDatabaseMigrationValidation, IMigrationSelection, ISchemaComparisonResponse, ISchemaSyncPlan, ISqlUpdatePreview, ISqlUpdaterSummary

### Community 33 - "Package"
Cohesion: 0.11
Nodes (19): @angular/animations, @angular/common, @angular/core, @angular/material, @angular/platform-browser, @angular/platform-browser-dynamic, @angular/router, dependencies (+11 more)

### Community 36 - "Mixed (components Marketing Workspace + Others)"
Cohesion: 0.15
Nodes (14): MarketingAnalyticsPlatform, MarketingAsset, MarketingDialog, MarketingDraftForm, MarketingIntegration, MarketingLimitSummary, WorkspaceTab, MediaAsset (+6 more)

### Community 38 - "Pages Portal"
Cohesion: 0.16
Nodes (3): PortalPaymentMethodsComponent, Component, IPaystackCard

### Community 39 - "Pages Admin"
Cohesion: 0.16
Nodes (16): ca-integration-status-badge Component (external), ca-service-trigger-renderer Component (external), Admin Client Services Component Template, Admin Companies Component Template, Admin Dev Management Component Template, Admin Integrations Component Template, Admin Integration Credential Builder Component Template, Admin Packages Component Template (+8 more)

### Community 40 - "Mixed (services Toast Ts + Others)"
Cohesion: 0.18
Nodes (7): errorInterceptor(), STATUS_MESSAGES, SUPPRESS_ERROR_TOAST, ReleaseNotesService, Injectable, ToastService, Injectable

### Community 43 - "Angular"
Cohesion: 0.17
Nodes (15): options, assets, browser, fileReplacements, index, outputPath, polyfills, scripts (+7 more)

### Community 44 - "Mixed (app Ts + Others)"
Cohesion: 0.19
Nodes (8): AppComponent, Component, appConfig, routes, ToastComponent, Component, authInterceptor(), Toast

### Community 45 - "Pages Contact"
Cohesion: 0.17
Nodes (3): ContactComponent, Component, ContactConfig

### Community 47 - "Mixed (components Pricing + Others)"
Cohesion: 0.18
Nodes (7): IAddon, AddonLinkGroup, ServiceRow, FilterByServiceIdPipe, Pipe, PagedResult, SERVICE_ICON_OPTIONS

### Community 50 - "Pages Admin"
Cohesion: 0.25
Nodes (3): IAdminPaystackMapping, AdminPaystackManagementComponent, Component

### Community 54 - "Mixed (pages Portal + Others)"
Cohesion: 0.22
Nodes (8): R50 Card-Capture Refund Notice, PortalBillingComponent, Component, ICardCaptureResult, ICompanyBilling, ICompanySubscriptions, IPaystackPlan, IPaystackSubscription

### Community 55 - "Services Video Project"
Cohesion: 0.26
Nodes (3): VideoProject, Injectable, VideoProjectService

### Community 57 - "Angular"
Cohesion: 0.20
Nodes (9): prefix, projectType, root, sourceRoot, newProjectRoot, projects, crout-automations, $schema (+1 more)

### Community 58 - "Angular"
Cohesion: 0.20
Nodes (10): serve, production, proxyConfig, budgets, buildTarget, outputHashing, builder, configurations (+2 more)

### Community 59 - "Tsconfig Spec"
Cohesion: 0.20
Nodes (9): jasmine, src/**/*.spec.ts, compilerOptions, outDir, types, extends, include, src/**/*.d.ts (+1 more)

### Community 60 - "Tsconfig App"
Cohesion: 0.20
Nodes (9): src/main.ts, compilerOptions, outDir, types, extends, files, include, src/**/*.d.ts (+1 more)

### Community 61 - "Mixed (components Auth Modal + Others)"
Cohesion: 0.24
Nodes (10): Account Button Component, Auth Modal Component, OTP-Based Password Reset Flow, Navbar Component, Portal Sidebar Component, Pricing Component, Service Configurator Component, Service Trigger Renderer Component (+2 more)

### Community 62 - "Components Account Button"
Cohesion: 0.20
Nodes (3): AccountButtonComponent, Component, HostListener

### Community 63 - "Components Navbar"
Cohesion: 0.27
Nodes (4): NavbarComponent, Component, HostListener, Input

### Community 66 - "Components Service Trigger Renderer"
Cohesion: 0.33
Nodes (3): DynamicFieldConfig, CredentialFormOption, CredentialOption

### Community 68 - "Interfaces I Service Trigger Interface"
Cohesion: 0.25
Nodes (7): CustomFormSchema, DynamicFieldFormatter, DynamicFieldType, FileUploadConfig, ServiceTriggerResponseMode, ServiceTriggerType, SupportedCredentialFieldType

### Community 71 - "Services N8n"
Cohesion: 0.28
Nodes (4): IDailyRun, IN8nExecution, N8nService, Injectable

### Community 72 - "Angular"
Cohesion: 0.25
Nodes (8): schematics, standalone, style, standalone, standalone, @schematics/angular:component, @schematics/angular:directive, @schematics/angular:pipe

### Community 73 - "Mixed (components Release Notes Dialog + Others)"
Cohesion: 0.25
Nodes (5): FooterComponent, Component, Input, ReleaseNotesDialogComponent, Component

### Community 75 - "Mixed (components Privacy Policy + Others)"
Cohesion: 0.29
Nodes (5): PrivacyPolicyComponent, Component, Input, PrivacyPolicyPageComponent, Component

### Community 76 - "Services Service Trigger Api"
Cohesion: 0.32
Nodes (3): ExecuteTriggerResponse, ServiceTriggerApiService, Injectable

### Community 78 - "Services Webhook"
Cohesion: 0.25
Nodes (6): ContactConfigAddon, ContactConfigService, ContactPayload, Injectable, WebhookResponse, WebhookService

### Community 79 - "Src"
Cohesion: 0.25
Nodes (8): Crout Automations Wordmark Logo, Crout Family Crest Logo (Transparent), Crout Holdings Luxury Logo (Grey), Crout Holdings Luxury Logo (Grey, Transparent), Crout Shield-Only Emblem, App Root HTML Shell (index.html), env.js Runtime Config Script, Paystack Inline JS Script

### Community 80 - "Angular"
Cohesion: 0.29
Nodes (7): build, test, builder, configurations, defaultConfiguration, architect, builder

### Community 81 - "Mixed (components Cta Banner + Others)"
Cohesion: 0.29
Nodes (7): CTA Banner Component, Footer Component, Hero Section Component, Pain Point Component, Release Notes Dialog Component, Services Overview (Solution) Component, Why Crout Component

### Community 82 - "Components Navigation Page"
Cohesion: 0.38
Nodes (3): NavigationPageComponent, Component, Input

### Community 84 - "Angular"
Cohesion: 0.33
Nodes (6): development, buildTarget, extractLicenses, fileReplacements, optimization, sourceMap

### Community 85 - "Pages Home"
Cohesion: 0.33
Nodes (6): ca-hero Component (external), ca-how-it-works Component (external), ca-pain-point Component (external), ca-pricing Component (external), ca-services-overview Component (external), Home Component Template

### Community 86 - "Package"
Cohesion: 0.33
Nodes (6): scripts, build, ng, start, test, watch

### Community 87 - "Components Marketing Workspace"
Cohesion: 0.33
Nodes (6): Marketing Workspace Analytics Tab, Marketing Workspace Content Calendar, Generate/Schedule Content Dialog, Marketing Workspace Component, Upload Assets Dialog, Marketing Workspace Video Editor Tab

### Community 89 - "Services Seo"
Cohesion: 0.33
Nodes (3): SeoConfig, SeoService, Injectable

### Community 90 - "Package"
Cohesion: 0.40
Nodes (3): name, private, version

### Community 98 - "README Md"
Cohesion: 0.67
Nodes (3): crout-automations-spa Docker Compose Service, Docker Compose Hosting Workflow, env.js Runtime API URL Injection

### Community 99 - "Pages Book Consultation"
Cohesion: 0.67
Nodes (3): ca-auth-modal Component (external), Book Consultation Component Template, Contact Component Template

### Community 101 - "Components Privacy Policy"
Cohesion: 0.67
Nodes (3): POPIA (Protection of Personal Information Act), Privacy Policy & Terms Component, WhatsApp Zero Data Collection Policy (rationale: avoids storing conversation content/metadata to preserve end-to-end encryption trust and limit liability, relying entirely on WhatsApp's own security)

## Ambiguous Edges - Review These
- `marketing-systems.component.ts` → `service-detail.component.ts`  [AMBIGUOUS]
  src/app/pages/services/service-detail/service-detail.component.html · relation: semantically_similar_to

## Knowledge Gaps
- **201 isolated node(s):** `$schema`, `version`, `newProjectRoot`, `projectType`, `style` (+196 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **57 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `marketing-systems.component.ts` and `service-detail.component.ts`?**
  _Edge tagged AMBIGUOUS (relation: semantically_similar_to) - confidence is low._
- **Why does `IService` connect `Components Pricing` to `Pages Admin`, `Services Admin`, `Pages Portal`, `Mixed (interfaces I Service Interface Ts + Others)`, `Mixed (components Marketing Workspace + Others)`, `Components Marketing Workspace`, `Mixed (directives Scroll Reveal Directive Ts + Others)`, `Components Service Configurator`, `Pages Admin`, `Services Api`, `Mixed (components Pricing + Others)`, `Mixed (utils Service Display Ts + Others)`, `Pages Portal`, `Mixed (services Company Ts + Others)`, `Pages Admin`, `Services Admin`?**
  _High betweenness centrality (0.070) - this node is a cross-community bridge._
- **Why does `DevServiceFormBuilderComponent` connect `Pages Dev` to `Pages Dev`, `Pages Dev`, `Mixed (pages Dev + Others)`, `Pages Dev`, `Pages Dev`, `Pages Dev`, `Pages Dev`, `Pages Dev`?**
  _High betweenness centrality (0.066) - this node is a cross-community bridge._
- **Why does `AuthService` connect `Services Auth` to `Pages Admin`, `Services Admin`, `Services Auth`, `Mixed (interfaces I Service Interface Ts + Others)`, `Interfaces I Service Trigger Interface`, `Mixed (services Toast Ts + Others)`, `Mixed (app Ts + Others)`, `Services Api`, `Components Auth Modal`, `Mixed (components Pricing + Others)`, `Services Booking`, `Pages Admin`, `Mixed (services Company Ts + Others)`, `Mixed (pages Portal + Others)`, `Pages Admin`, `Services Admin`, `Mixed (services Confirm Dialog Ts + Others)`, `Components Navbar`?**
  _High betweenness centrality (0.065) - this node is a cross-community bridge._
- **Are the 4 inferred relationships involving `AuthService` (e.g. with `adminGuard()` and `authGuard()`) actually correct?**
  _`AuthService` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `$schema`, `version`, `newProjectRoot` to the rest of the system?**
  _201 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Services Admin` be split into smaller, more focused modules?**
  _Cohesion score 0.07910014513788098 - nodes in this community are weakly interconnected._