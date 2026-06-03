import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CtaBannerComponent } from '../../../components/cta-banner/cta-banner.component';
import { ScrollRevealDirective } from '../../../directives/scroll-reveal.directive';
import { SafeHtmlPipe } from '../../../pipes/safe-html.pipe';

@Component({
  selector: 'ca-project-management',
  standalone: true,
  imports: [CommonModule, RouterModule, CtaBannerComponent, ScrollRevealDirective, SafeHtmlPipe],
  templateUrl: './project-management.component.html',
  styleUrl: './project-management.component.scss'
})
export class ProjectManagementComponent {

  subServices = [
    {
      icon: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="2" y="2" width="9" height="9"/><rect x="13" y="2" width="9" height="9"/><rect x="13" y="13" width="9" height="9"/><rect x="2" y="13" width="9" height="9"/></svg>`,
      title: 'Auto Trello Card Creation',
      description: 'Automatically create Trello cards the moment a trigger fires — a new client form, a WhatsApp message, a quote approval. Each card pre-populated with the right details.',
      features: ['Form-triggered card creation','Pre-populated card fields','Auto checklist attachment','Label & member assignment','Due date logic','Multi-board routing']
    },
    {
      icon: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>`,
      title: 'Trello Board Management',
      description: 'Full lifecycle management of your Trello boards — move cards between lists on status changes, archive completed cards, and keep boards clean without manual effort.',
      features: ['Automated card movement','Status-based list transitions','Auto-archive completed items','Due date monitoring','Overdue escalation alerts','Board health reporting']
    },
    {
      icon: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>`,
      title: 'Jira Integration',
      description: 'Create and manage Jira issues, sprints, and epics automatically. Keep developers and project managers in sync without anyone having to manually log tickets.',
      features: ['Auto Jira issue creation','Sprint & epic management','Status transition automation','Custom field population','Cross-team notifications','Velocity & burndown data pulls']
    },
    {
      icon: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/></svg>`,
      title: 'Custom Project Systems',
      description: 'No tool perfectly fits your workflow? We build custom project management systems from scratch — tailored triggers, stages, roles, and automations designed around how your team operates.',
      features: ['Bespoke stage logic','Custom role & RACI automation','Multi-tool orchestration','Client-facing status portals','Custom dashboards','Any trigger source']
    }
  ];

  steps = [
    { num: '01', title: 'Trigger Event', desc: 'A form submission, client message, quote approval, or any defined event initiates the workflow.' },
    { num: '02', title: 'System Builds', desc: 'Cards, tickets, or tasks are created in Trello or Jira, pre-filled with all relevant data.' },
    { num: '03', title: 'Team Notified', desc: 'The right team members receive instant WhatsApp or email notifications with direct links.' },
    { num: '04', title: 'Progress Tracked', desc: 'Status changes, completions, and overdue items trigger further automations automatically.' }
  ];
}
