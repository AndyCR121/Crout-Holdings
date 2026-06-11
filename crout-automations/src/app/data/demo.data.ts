import {
  IService,
  IAddon,
  IPackage,
  IUser,
  ICompany,
  IUserService,
} from '../interfaces/i-service.interface';

// ─── Services ────────────────────────────────────────────────────────────────────

export const DEMO_SERVICES: IService[] = [
  {
    service_id: 1,
    ServiceName: 'WhatsApp Agent',
    Price: 3000.00,
    HasAddons: true,
    Conditional: false,
    ServiceDescription:
      'A flexible WhatsApp Agent that handles enquiries, automates quotes, creates job cards, and manages client comms — pick exactly what you need.',
    features: [
      'Client Support',
      'Team Notifications',
      'Client Notifications',
      'Quote Gathering & Generation',
      'Marketing Reach',
      'Custom Flows',
    ],
  },
  {
    service_id: 2,
    ServiceName: 'Quote System',
    Price: 3000.00,
    HasAddons: true,
    Conditional: false,
    ServiceDescription:
      'End-to-end quote automation — triggered by email, webhook, or WhatsApp, linked to Xero, and approved by the right person automatically.',
    features: [
      'Xero Integration',
      'Multi-Platform Accounting',
      'Custom Calculations',
      'Auto Invoice Follow-Ups',
      'Quote-to-Invoice Pipeline',
      'Smart Summaries',
    ],
  },
  {
    service_id: 3,
    ServiceName: 'Project Management System',
    Price: 3000.00,
    HasAddons: true,
    Conditional: false,
    ServiceDescription:
      'Auto-generate job cards from any trigger — email, webhook, or WhatsApp — synced with Trello and managed by AI agents.',
    features: [
      'Auto Trello Card Creation',
      'Trello Board Management',
      'Jira Integration',
      'Custom Trigger Workflows',
      'Team Notifications',
      'Custom Systems',
    ],
  },
  {
    service_id: 4,
    ServiceName: 'Marketing Systems',
    Price: 3000.00,
    HasAddons: true,
    Conditional: false,
    ServiceDescription:
      'Automated marketing workflows — bulk messaging, campaign triggers, and scheduled broadcasts via WhatsApp and email.',
    features: [
      'Branded Image Generation',
      'Faceless & Face Videos',
      'All Social Platforms',
      'Weekly Scheduling',
      'SEO & Analytics',
      'After-Hours Receptionist',
    ],
  },
  {
    service_id: 5,
    ServiceName: 'WhatsApp Agent [Xero Suite Add-on]',
    Price: 3000.00,
    HasAddons: true,
    Conditional: true,
    ServiceDescription:
      'The WhatsApp Agent as a conditional add-on within the Xero Suite package. ' +
      'Enabling this switches the active package from "Xero Suite (without WhatsApp)" ' +
      'to "Xero Suite (with WhatsApp Agent)", applying the higher bundle discount.',
    features: [],
  },
];

// ─── Addons ─────────────────────────────────────────────────────────────────────

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

// ─── Packages ────────────────────────────────────────────────────────────────────────

export const DEMO_PACKAGES: IPackage[] = [
  {
    package_id: 1,
    service_ids: [1],
    PackageName: 'WhatsApp Agent — Full Bundle',
    PackageDescription:
      'WhatsApp Agent base with all addons (Marketing Messaging, Automated Quoting [Xero], 5M+ Token Upgrade, Template/Forms Messaging) at a bundle discount.',
    Discount: 0.15,
    minimumRequiredAddons: 2,
  },
  {
    package_id: 2,
    service_ids: [2],
    PackageName: 'Quote System — Full Bundle',
    PackageDescription:
      'Quote System base with Xero Invoices and Invoice Follow-Ups [Xero] at a bundle discount.',
    Discount: 0.15,
    minimumRequiredAddons: 2,
  },
  {
    package_id: 3,
    service_ids: [3],
    PackageName: 'Project Management — Full Bundle',
    PackageDescription:
      'Project Management System base with Custom Setup and Payroll Excel Generation at a bundle discount.',
    Discount: 0.15,
    minimumRequiredAddons: 2,
  },
  {
    // Base Xero Suite — no WhatsApp. Discount always active (no addon gate).
    package_id: 4,
    service_ids: [2, 3],
    PackageName: 'Xero Suite (without WhatsApp)',
    PackageDescription:
      'Quote System + Xero Invoices + Invoice Follow-Ups + Project Management System + Payroll Excel Generation at a bundle discount.',
    Discount: 0.15,
    // minimumRequiredAddons omitted — discount applies unconditionally
  },
  {
    // Extended Xero Suite — WhatsApp toggled ON. Discount always active.
    package_id: 5,
    parent_package_id: 4,
    service_ids: [5],
    PackageName: 'Xero Suite (with WhatsApp Agent)',
    PackageDescription:
      'Everything in Xero Suite plus the full WhatsApp Agent with all addons at a bundle discount.',
    Discount: 0.20,
    // minimumRequiredAddons omitted — discount applies unconditionally
  },
];

// ─── Users ─────────────────────────────────────────────────────────────────────────
// Company is no longer stored on IUser — see DEMO_COMPANIES below.

export const DEMO_USERS: IUser[] = [
  {
    user_id: 0,
    Username: 'Andrew',
    Password: 'pwd1',
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
    FirstName: 'Jaco',
    Surname: 'Visser',
    Email: 'admin@woodenweld.co.za',
    CellNumber: '(+27) 79 024 6945',
    Active: true,
    IsAdmin: false,
  },
];

// ─── Companies ──────────────────────────────────────────────────────────────────────
// Each user can own multiple companies. Services are linked per company.

export const DEMO_COMPANIES: ICompany[] = [
  {
    company_id: 1,
    user_id: 0,
    CompanyName: 'Crout Holdings',
    Industry: 'Technology / Automation',
    VATNumber: null,
    RegistrationNumber: null,
    Email: 'andrew@crout-holdings.com',
    Phone: '(+27) 64 656 9894',
    Address: 'Bloemfontein, Free State, ZA',
    Active: true,
  },
  {
    company_id: 2,
    user_id: 1,
    CompanyName: 'WoodenWeld',
    Industry: 'Manufacturing / Woodwork',
    VATNumber: null,
    RegistrationNumber: null,
    Email: 'admin@woodenweld.co.za',
    Phone: '(+27) 79 024 6945',
    Address: null,
    Active: true,
  },
  {
    company_id: 3,
    user_id: 1,
    CompanyName: 'Globefurn',
    Industry: 'Furniture / Retail',
    VATNumber: null,
    RegistrationNumber: null,
    Email: null,
    Phone: null,
    Address: null,
    Active: true,
  },
];

// ─── User Services ──────────────────────────────────────────────────────────────────────
// Services are now linked to company_id, not user_id.
// WoodenWeld (company_id: 2) → Project Management System (service_id: 3)
// Globefurn  (company_id: 3) → Quote System             (service_id: 2)

export const DEMO_USER_SERVICES: IUserService[] = [
  {
    company_id: 2,
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
    company_id: 3,
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
