import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ICompany, IService, IUserService } from '../../interfaces/i-service.interface';
import { ServiceTriggerConfig } from '../../interfaces/i-service-trigger.interface';
import { MediaAsset, TimelineItem, TimelineTrack, VideoProject } from '../../interfaces/i-video-project.interface';
import { ToastService } from '../../services/toast.service';
import { VideoProjectService } from '../../services/video-project.service';

interface MarketingIntegration {
  name: string;
  confirmed: boolean;
  category: 'trigger' | 'action' | 'output';
}

type WorkspaceTab = 'editor' | 'analytics';
type MarketingDialog = 'generate' | 'upload' | null;

interface MarketingDraftForm {
  contentType: 'photo' | 'video';
  topic: string;
  platforms: string[];
  tone: string;
  notes: string;
  publishDate: string;
  publishTime: string;
}

interface MarketingAsset {
  id: string;
  type: 'image' | 'video' | 'audio' | 'brand';
  name: string;
  source: 'generated' | 'uploaded';
  url?: string;
}

interface MarketingLimitSummary {
  allowedDays: string[];
  postsPerWeek: number | null;
  videosPerWeek: number | null;
  photosPerWeek: number | null;
  postsPerBatch: number | null;
  nextGeneration?: string | null;
  lastRun?: string | null;
  queueSize?: number | null;
}

interface MarketingAnalyticsPlatform {
  platform: string;
  views?: number;
  likes?: number;
  shares?: number;
  comments?: number;
  saves?: number;
  engagementRate?: string;
}

@Component({
  selector: 'ca-marketing-workspace',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './marketing-workspace.component.html',
  styleUrl: './marketing-workspace.component.scss'
})
export class MarketingWorkspaceComponent implements OnInit, OnChanges {
  private readonly videos = inject(VideoProjectService);
  private readonly toast = inject(ToastService);

  @Input({ required: true }) service!: IService;
  @Input({ required: true }) userService!: IUserService;
  @Input({ required: true }) company!: ICompany;
  @Input() integrations: MarketingIntegration[] = [];
  @Input() triggers: ServiceTriggerConfig[] = [];
  @Input() triggersLoading = false;

  @Output() updateCredentials = new EventEmitter<void>();
  @Output() triggerExecuted = new EventEmitter<void>();

  readonly projects = signal<VideoProject[]>([]);
  readonly loadingProjects = signal(false);
  readonly selectedProjectId = signal<number | null>(null);
  readonly selectedAssetId = signal<string | null>(null);
  readonly activeTab = signal<WorkspaceTab>('editor');
  readonly activeDialog = signal<MarketingDialog>(null);
  readonly actionMenuOpen = signal(false);
  readonly currentWeekStart = signal(this.startOfWeek(new Date()));
  readonly uploadFiles = signal<File[]>([]);
  readonly renderNotes = signal('');

  readonly tones = ['Professional', 'Casual', 'Friendly', 'Luxury', 'Promotional', 'Educational'];
  readonly fallbackPlatforms = ['Instagram', 'TikTok', 'YouTube Shorts', 'Facebook', 'LinkedIn', 'X'];
  readonly draftForm = signal<MarketingDraftForm>({
    contentType: 'video',
    topic: '',
    platforms: [],
    tone: 'Professional',
    notes: '',
    publishDate: '',
    publishTime: ''
  });

  ngOnInit(): void {
    this.loadProjects();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['company'] || changes['userService']) this.loadProjects();
  }

  get selectedProject(): VideoProject | null {
    return this.projects().find(project => project.id === this.selectedProjectId()) ?? this.projects()[0] ?? null;
  }

  get weekDays(): Date[] {
    const start = this.currentWeekStart();
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return date;
    });
  }

  get weekEnd(): Date {
    return this.weekDays[6] ?? this.currentWeekStart();
  }

  get availablePlatforms(): string[] {
    const platformNames = this.integrations
      .map(item => item.name)
      .filter(name => this.looksLikeMarketingPlatform(name));
    return platformNames.length ? platformNames : this.fallbackPlatforms;
  }

  get hasAnalyticalAi(): boolean {
    return this.integrations.some(item => /analytical ai|analytics|campaign analytics/i.test(item.name));
  }

  get assets(): MarketingAsset[] {
    const fromProjects = this.projects().flatMap(project =>
      (project.metadata?.assets ?? []).map(asset => ({
        id: `${project.id}-${asset.id}`,
        type: asset.type === 'video' ? 'video' as const : asset.type === 'audio' ? 'audio' as const : 'image' as const,
        name: asset.name,
        source: 'generated' as const,
        url: asset.url
      }))
    );

    const uploads = this.uploadFiles().map((file, index) => ({
      id: `upload-${index}-${file.name}`,
      type: this.assetTypeFromFile(file),
      name: file.name,
      source: 'uploaded' as const
    }));

    return [...uploads, ...fromProjects];
  }

  get selectedAsset(): MarketingAsset | null {
    return this.assets.find(asset => asset.id === this.selectedAssetId()) ?? this.assets[0] ?? null;
  }

  get timeline(): TimelineTrack[] {
    return this.selectedProject?.timeline?.tracks ?? [];
  }

  get analyticsPlatforms(): MarketingAnalyticsPlatform[] {
    const project = this.selectedProject;
    if (!project || project.status !== 'posted') return [];
    return [
      { platform: project.platform, views: 1240, likes: 86, shares: 18, comments: 12, saves: 22, engagementRate: '8.4%' }
    ];
  }

  get topAnalyticsPlatform(): MarketingAnalyticsPlatform | null {
    return this.analyticsPlatforms[0] ?? null;
  }

  get limits(): MarketingLimitSummary {
    const config = this.parseConfig();
    return {
      allowedDays: this.stringArray(config['allowedPostingDays']) ?? ['Mon', 'Wed', 'Fri'],
      postsPerWeek: this.numberOrNull(config['postsPerWeek']),
      videosPerWeek: this.numberOrNull(config['videosPerWeek']),
      photosPerWeek: this.numberOrNull(config['photosPerWeek']),
      postsPerBatch: this.numberOrNull(config['postsPerBatch']),
      nextGeneration: typeof config['nextGenerationAt'] === 'string' ? config['nextGenerationAt'] : null,
      lastRun: typeof config['lastSchedulerRunAt'] === 'string' ? config['lastSchedulerRunAt'] : null,
      queueSize: this.numberOrNull(config['queueSize'])
    };
  }

  openDialog(dialog: Exclude<MarketingDialog, null>): void {
    this.activeDialog.set(dialog);
    this.actionMenuOpen.set(false);
  }

  closeDialog(): void {
    this.activeDialog.set(null);
  }

  setTab(tab: WorkspaceTab): void {
    this.activeTab.set(tab);
  }

  selectProject(project: VideoProject): void {
    this.selectedProjectId.set(project.id);
  }

  selectAsset(asset: MarketingAsset): void {
    this.selectedAssetId.set(asset.id);
  }

  previousWeek(): void {
    this.moveWeek(-7);
  }

  nextWeek(): void {
    this.moveWeek(7);
  }

  today(): void {
    this.currentWeekStart.set(this.startOfWeek(new Date()));
  }

  scheduledForDay(day: Date): VideoProject[] {
    return this.projects().filter(project => {
      if (!project.scheduledFor) return false;
      const scheduled = new Date(project.scheduledFor);
      return scheduled.toDateString() === day.toDateString();
    });
  }

  onPlatformToggle(platform: string): void {
    const form = { ...this.draftForm() };
    form.platforms = form.platforms.includes(platform)
      ? form.platforms.filter(item => item !== platform)
      : [...form.platforms, platform];
    this.draftForm.set(form);
  }

  isPlatformSelected(platform: string): boolean {
    return this.draftForm().platforms.includes(platform);
  }

  updateDraft(key: keyof MarketingDraftForm, value: string): void {
    const form = { ...this.draftForm() };
    if (key === 'contentType') form.contentType = value === 'photo' ? 'photo' : 'video';
    if (key === 'topic') form.topic = value;
    if (key === 'tone') form.tone = value;
    if (key === 'notes') form.notes = value;
    if (key === 'publishDate') form.publishDate = value;
    if (key === 'publishTime') form.publishTime = value;
    this.draftForm.set(form);
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.uploadFiles.set(Array.from(input.files ?? []));
  }

  submitDraft(): void {
    this.toast.success('Content request captured. Backend scheduling validation will confirm limits and replacements.');
    this.closeDialog();
  }

  submitUpload(): void {
    this.toast.success('Assets added to the workspace. Upload persistence will use the media API once available.');
    this.closeDialog();
  }

  renderProject(): void {
    const project = this.selectedProject;
    if (!project) return;
    this.videos.render(project.id, this.renderNotes()).subscribe({
      next: response => this.toast.success(response.message),
      error: err => this.toast.error(err?.error?.error ?? 'Content render could not be queued.')
    });
  }

  submitSelectedPost(): void {
    this.renderProject();
  }

  trackWidth(item: TimelineItem): number {
    return Math.max(8, Math.min(100, (item.endTime - item.startTime) * 3));
  }

  trackLeft(item: TimelineItem): number {
    return Math.max(0, Math.min(88, item.startTime * 3));
  }

  assetName(assetId: string): string {
    const projectAssets: MediaAsset[] = this.selectedProject?.metadata?.assets ?? [];
    return projectAssets.find(asset => asset.id === assetId)?.name ?? assetId;
  }

  statusClass(status: string): string {
    return `is-${status}`;
  }

  private loadProjects(): void {
    if (!this.company?.companyId) return;
    this.loadingProjects.set(true);
    this.videos.list(this.company.companyId).subscribe({
      next: projects => {
        const serviceProjects = projects.filter(project =>
          project.serviceId === this.service?.serviceId ||
          project.userServiceId === this.userService?.userServiceId
        );
        this.projects.set(serviceProjects);
        this.selectedProjectId.set(serviceProjects[0]?.id ?? null);
        this.loadingProjects.set(false);
      },
      error: () => {
        this.projects.set([]);
        this.loadingProjects.set(false);
      }
    });
  }

  private moveWeek(days: number): void {
    const next = new Date(this.currentWeekStart());
    next.setDate(next.getDate() + days);
    this.currentWeekStart.set(next);
  }

  private startOfWeek(date: Date): Date {
    const copy = new Date(date);
    const day = copy.getDay();
    const diff = copy.getDate() - day + (day === 0 ? -6 : 1);
    copy.setDate(diff);
    copy.setHours(0, 0, 0, 0);
    return copy;
  }

  private parseConfig(): Record<string, unknown> {
    try {
      const parsed: unknown = JSON.parse(this.userService?.config ?? '{}');
      return parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : {};
    } catch {
      return {};
    }
  }

  private stringArray(value: unknown): string[] | null {
    return Array.isArray(value) ? value.map(item => String(item)) : null;
  }

  private numberOrNull(value: unknown): number | null {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  }

  private looksLikeMarketingPlatform(name: string): boolean {
    return /instagram|tiktok|youtube|facebook|linkedin|twitter|threads|pinterest|google business|x\b/i.test(name);
  }

  private assetTypeFromFile(file: File): MarketingAsset['type'] {
    if (file.type.startsWith('video/')) return 'video';
    if (file.type.startsWith('audio/')) return 'audio';
    if (file.type.startsWith('image/')) return 'image';
    return 'brand';
  }
}
