import {
  IService,
  IAddon,
  IPackage,
  IUser,
  IUserService,
} from '../interfaces/i-service.interface';

// ─── Services ───────────────────────────────────────────────────────────────

export const DEMO_SERVICES: IService[] = [
  {
    service_id: 1,
    ServiceName: 'WhatsApp Agent',
    Price: 3000.00,
    HasAddons: true,
    Conditional: false,
    ServiceDescription:
      'A flexible WhatsApp Agent that handles enquiries, automates quotes, creates job cards, and manages client comms — pick exactly what you need.',
  },
  {
    service_id: 2,
    ServiceName: 'Quote System',
    Price: 3000.00,
    HasAddons: true,
    Conditional: false,
    ServiceDescription:
      'End-to-end quote automation — triggered by email, webhook, or WhatsApp, linked to Xero, and approved by the right person automatically.',
  },
  {
    service_id: 3,
    ServiceName: 'Project Management System',
    Price: 3000.00,
    HasAddons: true,
    Conditional: false,
    ServiceDescription:
      'Auto-generate job cards from any trigger — email, webhook, or WhatsApp — synced with Trello and managed by AI agents.',
  },
  {
    service_id: 4,
    ServiceName: 'Marketing Systems',
    Price: 3000.00,
    HasAddons: true,
    Conditional: false,
    ServiceDescription:
      'Automated marketing workflows — bulk messaging, campaign triggers, and scheduled broadcasts via WhatsApp and email.',
  },
  {
    // Conditional service — used as the toggle switch between Xero Suite
    // (without WhatsApp, package_id: 4) and Xero Suite (with WhatsApp, package_id: 5).
    // When a config references this service with Conditional: true, the pricing
    // engine should resolve to parent_package_id: 4 → 5 based on the toggle state.
    service_id: 5,
    ServiceName: 'WhatsApp Agent [Xero Suite Add-on]',
    Price: 3000.00,
    HasAddons: true,
    Conditional: true,
    ServiceDescription:
      'The WhatsApp Agent as a conditional add-on within the Xero Suite package. ' +
      'Enabling this switches the active package from "Xero Suite (without WhatsApp)" ' +
      'to "Xero Suite (with WhatsApp Agent)", applying the higher bundle discount.',
  },
];

// ─── Addons ─────────────────────────────────────────────────────────────────

export const DEMO_ADDONS: IAddon[] = [
  // WhatsApp Agent (service_id: 1)
  { addon_id: 1,  service_id: 1, AddonName: 'Marketing Messaging',       AddonDescription: 'Broadcast marketing messages to your client list via WhatsApp.',                   Price: 800  },
  { addon_id: 2,  service_id: 1, AddonName: 'Automated Quoting [Xero]', AddonDescription: 'Allow the WhatsApp agent to generate and send Xero-linked quotes automatically.', Price: 1200 },
  { addon_id: 3,  service_id: 1, AddonName: '5M+ Token Upgrade',        AddonDescription: 'Increase your AI token allocation beyond the standard 2M included.',               Price: 600  },
  { addon_id: 4,  service_id: 1, AddonName: 'Template/Forms Messaging', AddonDescription: 'Send templated or form-based messages for structured client interactions.',         Price: 500  },

  // Quote System (service_id: 2)
  { addon_id: 5,  service_id: 2, AddonName: 'Xero Invoices',            AddonDescription: 'Automatically convert approved quotes into Xero invoices.',                        Price: 800  },
  { addon_id: 6,  service_id: 2, AddonName: 'Invoice Follow-Ups [Xero]',AddonDescription: 'Automated follow-up reminders sent for outstanding Xero invoices.',                Price: 600  },

  // Project Management System (service_id: 3)
  { addon_id: 7,  service_id: 3, AddonName: 'Custom Setup',             AddonDescription: 'Bespoke configuration and custom workflow design for your specific business.',      Price: 1000 },
  { addon_id: 8,  service_id: 3, AddonName: 'Payroll Excel Generation', AddonDescription: 'Auto-generate payroll-ready Excel reports from your job card data.',                Price: 900  },

  // Marketing Systems (service_id: 4)
  { addon_id: 9,  service_id: 4, AddonName: 'Scheduled Broadcasts',     AddonDescription: 'Schedule recurring bulk messages at set times or dates.',                         Price: 500  },
  { addon_id: 10, service_id: 4, AddonName: 'Campaign Analytics',       AddonDescription: 'Track delivery, open, and response rates per campaign.',                          Price: 600  },

  // WhatsApp Agent [Xero Suite Add-on] (service_id: 5) — mirrors service_id: 1 addons
  { addon_id: 11, service_id: 5, AddonName: 'Marketing Messaging',       AddonDescription: 'Broadcast marketing messages to your client list via WhatsApp.',                   Price: 800  },
  { addon_id: 12, service_id: 5, AddonName: 'Automated Quoting [Xero]', AddonDescription: 'Allow the WhatsApp agent to generate and send Xero-linked quotes automatically.', Price: 1200 },
  { addon_id: 13, service_id: 5, AddonName: '5M+ Token Upgrade',        AddonDescription: 'Increase your AI token allocation beyond the standard 2M included.',               Price: 600  },
  { addon_id: 14, service_id: 5, AddonName: 'Template/Forms Messaging', AddonDescription: 'Send templated or form-based messages for structured client interactions.',         Price: 500  },
];

// ─── Packages ────────────────────────────────────────────────────────────────

export const DEMO_PACKAGES: IPackage[] = [
  {
    package_id: 1,
    service_ids: [1],
    PackageName: 'WhatsApp Agent — Full Bundle',
    PackageDescription:
      'WhatsApp Agent base with all addons (Marketing Messaging, Automated Quoting [Xero], 5M+ Token Upgrade, Template/Forms Messaging) at a bundle discount.',
    Discount: 0.15,
  },
  {
    package_id: 2,
    service_ids: [2],
    PackageName: 'Quote System — Full Bundle',
    PackageDescription:
      'Quote System base with Xero Invoices and Invoice Follow-Ups [Xero] at a bundle discount.',
    Discount: 0.15,
  },
  {
    package_id: 3,
    service_ids: [3],
    PackageName: 'Project Management — Full Bundle',
    PackageDescription:
      'Project Management System base with Custom Setup and Payroll Excel Generation at a bundle discount.',
    Discount: 0.15,
  },
  {
    // Base Xero Suite — no WhatsApp. parent_package_id is undefined (root package).
    package_id: 4,
    service_ids: [2, 3],
    PackageName: 'Xero Suite (without WhatsApp)',
    PackageDescription:
      'Quote System + Xero Invoices + Invoice Follow-Ups + Project Management System + Payroll Excel Generation at a bundle discount.',
    Discount: 0.15,
  },
  {
    // Extended Xero Suite — WhatsApp toggled ON.
    // parent_package_id: 4 signals this is the "upgraded" variant of package 4.
    // When the conditional service (service_id: 5) is enabled in config,
    // resolve to this package instead of package_id: 4.
    package_id: 5,
    parent_package_id: 4,
    service_ids: [2, 3, 5],
    PackageName: 'Xero Suite (with WhatsApp Agent)',
    PackageDescription:
      'Everything in Xero Suite plus the full WhatsApp Agent with all addons at a bundle discount.',
    Discount: 0.20,
  },
];

// ─── Users ───────────────────────────────────────────────────────────────────

export const DEMO_USERS: IUser[] = [
  {
    user_id: 0,
    Username: 'Andrew',
    Password: 'pwd1',
    Company: 'Crout Holdings',
    FirstName: 'Andrew',
    Surname: 'Crout',
    Email: 'andrew@crout-holdings.com',
    CellNumber: '(+27) 64 656 9894',
    Active: true,
    IsAdmin: true,
  },
  {
    user_id: 1,
    Username: 'Jaco',
    Password: 'pwd2',
    Company: 'WoodenWeld',
    FirstName: 'Jaco',
    Surname: 'Visser',
    Email: 'admin@woodenweld.co.za',
    CellNumber: '(+27) 79 024 6945',
    Active: true,
    IsAdmin: false,
  },
  {
    user_id: 2,
    Username: 'Jaco',
    Password: 'pwd3',
    Company: 'Globefurn',
    FirstName: 'Jaco',
    Surname: 'Visser',
    Email: 'admin@woodenweld.co.za',
    CellNumber: '(+27) 79 024 6945',
    Active: true,
    IsAdmin: false,
  },
];

// ─── User Services ────────────────────────────────────────────────────────────
// WoodenWeld (user_id: 1) → Project Management System (service_id: 3)
// Globefurn  (user_id: 2) → Quote System             (service_id: 2)

export const DEMO_USER_SERVICES: IUserService[] = [
  {
    user_id: 1,
    service_id: 3,
    package_id: null,
    subscription_id: null,
    config: JSON.stringify({
      integrations: ['Trello', 'Google Sheets', 'IMAP Email'],
      custom: 'true',
    }),
    Active: true,
    Status: 2,
  },
  {
    user_id: 2,
    service_id: 2,
    package_id: null,
    subscription_id: null,
    config: JSON.stringify({
      integrations: ['Google Sheets', 'AI Agent', 'IMAP Email'],
      custom: 'true',
    }),
    Active: true,
    Status: 1,
  },
];
