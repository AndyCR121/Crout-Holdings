import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CtaBannerComponent } from '../../../components/cta-banner/cta-banner.component';
import { ScrollRevealDirective } from '../../../directives/scroll-reveal.directive';
import { SafeHtmlPipe } from '../../../pipes/safe-html.pipe';

@Component({
  selector: 'ca-marketing-systems',
  standalone: true,
  imports: [CommonModule, RouterModule, CtaBannerComponent, ScrollRevealDirective, SafeHtmlPipe],
  templateUrl: './marketing-systems.component.html',
  styleUrl: './marketing-systems.component.scss'
})
export class MarketingSystemsComponent {

  subServices = [
    {
      icon: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`,
      title: 'Branded Image Generation',
      description: 'AI generates on-brand social media images weekly — matched to your brand colours, fonts, and messaging. No designer needed, no briefs, just content that looks like you.',
      features: ['On-brand AI image creation','Custom style templates','Caption generation','Multi-format output','Weekly content calendar','Revision workflows']
    },
    {
      icon: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>`,
      title: 'Faceless AI Videos',
      description: 'Short-form video content generated automatically using AI voiceovers, stock visuals, and your brand overlay — ready to post on TikTok, Instagram Reels, and YouTube Shorts.',
      features: ['AI script generation','AI voiceover','Auto visual assembly','Brand overlay & watermark','Short-form optimised','Platform format exports']
    },
    {
      icon: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="8" r="4"/><path d="M6 20v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/><path d="M15 5.5A2.5 2.5 0 0 1 17.5 8"/></svg>`,
      title: 'Face & Voice AI Videos',
      description: 'Use your own face and voice — AI lip-syncs and animates a consistent spokesperson persona across your content, giving your brand a human face without filming every week.',
      features: ['Face-synced AI video','Voice cloning (with consent)','Weekly content output','Consistent brand persona','Script-to-video pipeline','Multi-platform sizing']
    },
    {
      icon: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>`,
      title: 'All Platforms Auto-Scheduling',
      description: 'Content is automatically scheduled and posted across Instagram, Facebook, TikTok, LinkedIn, YouTube, and X — on optimal posting times, every week.',
      features: ['Instagram & Facebook','TikTok & YouTube Shorts','LinkedIn & X (Twitter)','Optimal time scheduling','Weekly automation','Post performance logging']
    },
    {
      icon: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`,
      title: 'SEO & Analytics',
      description: 'Track keyword rankings, monitor site performance, and receive automated weekly SEO reports. AI identifies content gaps and suggests next actions to grow your organic reach.',
      features: ['Keyword rank tracking','Weekly SEO reports','Content gap analysis','Competitor monitoring','Google Search Console sync','AI-suggested actions']
    },
    {
      icon: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12"/><path d="M1 1l22 22"/></svg>`,
      title: 'After-Hours AI Receptionist',
      description: 'An AI receptionist that answers calls, qualifies leads, takes messages, and books appointments when your team is unavailable — so you never miss an enquiry.',
      features: ['24/7 call handling','Lead qualification','Appointment booking','Message taking & routing','CRM logging','Custom call scripts']
    }
  ];

  steps = [
    { num: '01', title: 'Brand Setup', desc: 'We train the system on your brand — colours, tone, fonts, products, and typical content style.' },
    { num: '02', title: 'Content Generated', desc: 'AI creates images, captions, and videos weekly based on your content calendar and business events.' },
    { num: '03', title: 'Auto-Posted', desc: 'Content goes live on all your platforms at optimal times — no manual uploads, no missed posts.' },
    { num: '04', title: 'Report & Optimise', desc: 'Weekly analytics reports surface what’s working, and the system adjusts content direction accordingly.' }
  ];
}
