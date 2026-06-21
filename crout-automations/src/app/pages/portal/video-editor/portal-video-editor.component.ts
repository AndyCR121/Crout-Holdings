import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { PortalSidebarComponent } from '../../../components/portal-sidebar/portal-sidebar.component';
import { ServiceTriggerRendererComponent } from '../../../components/service-trigger-renderer/service-trigger-renderer.component';
import { ICompany, IService, IUserService } from '../../../interfaces/i-service.interface';
import { ServiceTriggerConfig } from '../../../interfaces/i-service-trigger.interface';
import { MediaAsset, TimelineItem, TimelineTrack, VideoProject } from '../../../interfaces/i-video-project.interface';
import { ApiService } from '../../../services/api.service';
import { AuthService } from '../../../services/auth.service';
import { ServiceTriggerApiService } from '../../../services/service-trigger-api.service';
import { ToastService } from '../../../services/toast.service';
import { VideoProjectService } from '../../../services/video-project.service';

@Component({
  selector: 'ca-portal-video-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, PortalSidebarComponent, ServiceTriggerRendererComponent],
  templateUrl: './portal-video-editor.component.html',
  styleUrl: './portal-video-editor.component.scss'
})
export class PortalVideoEditorComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly api = inject(ApiService);
  private readonly videos = inject(VideoProjectService);
  private readonly triggersApi = inject(ServiceTriggerApiService);
  private readonly toast = inject(ToastService);

  @Input() embedded = false;

  readonly user = computed(() => this.auth.currentUser());
  readonly companies = signal<ICompany[]>([]);
  readonly projects = signal<VideoProject[]>([]);
  readonly services = signal<IService[]>([]);
  readonly userServices = signal<IUserService[]>([]);
  readonly triggers = signal<ServiceTriggerConfig[]>([]);
  readonly selectedProjectId = signal<number | null>(null);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly rendering = signal(false);
  readonly renderNotes = signal('');
  readonly draggedItem = signal<TimelineItem | null>(null);

  readonly project = computed(() => this.projects().find(p => p.id === this.selectedProjectId()) ?? this.projects()[0] ?? null);
  readonly assets = computed<MediaAsset[]>(() => this.project()?.metadata?.assets ?? []);
  readonly timeline = computed<TimelineTrack[]>(() => this.project()?.timeline?.tracks ?? []);
  readonly selectedCompanyId = computed(() => this.project()?.companyId ?? this.companies()[0]?.companyId ?? 0);
  readonly selectedUserServiceId = computed(() => this.project()?.userServiceId ?? null);
  readonly selectedServiceId = computed(() => this.project()?.serviceId ?? 4);

  ngOnInit(): void {
    const uid = this.user()?.userId;
    if (uid == null) {
      this.loading.set(false);
      return;
    }

    forkJoin({
      companies: this.api.getCompaniesByUser(uid),
      services: this.api.getServices(),
      projects: this.videos.list()
    }).pipe(
      switchMap(({ companies, services, projects }) => {
        const companyServiceCalls = companies.length
          ? forkJoin(companies.map(company => this.api.getCompanyServices(company.companyId)))
          : of([] as IUserService[][]);
        return forkJoin({
          companies: of(companies),
          services: of(services),
          projects: of(projects),
          companyServices: companyServiceCalls
        });
      })
    ).subscribe({
      next: ({ companies, services, projects, companyServices }) => {
        this.companies.set(companies);
        this.services.set(services);
        this.projects.set(projects);
        this.userServices.set(companyServices.flat());
        this.selectedProjectId.set(projects[0]?.id ?? null);
        this.loading.set(false);
        this.loadTriggers();
      },
      error: () => {
        this.loading.set(false);
        this.toast.error('Video projects could not be loaded.');
      }
    });
  }

  selectProject(projectId: number): void {
    this.selectedProjectId.set(projectId);
    this.loadTriggers();
  }

  saveTimeline(): void {
    const project = this.project();
    if (!project?.timeline) return;
    this.saving.set(true);
    this.videos.saveTimeline(project, project.timeline).subscribe({
      next: saved => {
        this.projects.update(projects => projects.map(item => item.id === saved.id ? saved : item));
        this.saving.set(false);
        this.toast.success('Timeline saved.');
      },
      error: err => {
        this.saving.set(false);
        this.toast.error(err?.error?.error ?? 'Timeline could not be saved.');
      }
    });
  }

  renderProject(): void {
    const project = this.project();
    if (!project) return;
    this.rendering.set(true);
    this.videos.render(project.id, this.renderNotes()).subscribe({
      next: response => {
        this.rendering.set(false);
        this.toast.success(response.message);
      },
      error: err => {
        this.rendering.set(false);
        this.toast.error(err?.error?.error ?? 'Render could not be queued.');
      }
    });
  }

  updateItem(track: TimelineTrack, item: TimelineItem, key: 'startTime' | 'endTime', value: string): void {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return;
    item[key] = Math.max(0, numeric);
    if (item.endTime <= item.startTime) item.endTime = item.startTime + 1;
    this.touchTimeline(track);
  }

  dragStart(item: TimelineItem): void {
    this.draggedItem.set(item);
  }

  dropOnTrack(track: TimelineTrack, event: DragEvent): void {
    event.preventDefault();
    const item = this.draggedItem();
    if (!item) return;
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    const duration = Math.max(1, item.endTime - item.startTime);
    item.startTime = Math.round(pct * 30);
    item.endTime = item.startTime + duration;
    this.touchTimeline(track);
    this.draggedItem.set(null);
  }

  assetName(assetId: string): string {
    return this.assets().find(asset => asset.id === assetId)?.name ?? assetId;
  }

  trackWidth(item: TimelineItem): number {
    return Math.max(8, Math.min(100, (item.endTime - item.startTime) * 3));
  }

  trackLeft(item: TimelineItem): number {
    return Math.max(0, Math.min(88, item.startTime * 3));
  }

  statusClass(status: string): string {
    return `is-${status}`;
  }

  private loadTriggers(): void {
    const companyId = this.selectedCompanyId();
    const serviceId = this.selectedServiceId();
    if (!companyId || !serviceId) return;
    this.triggersApi.getConfigs(companyId, serviceId).subscribe({
      next: configs => this.triggers.set(configs),
      error: () => this.triggers.set([])
    });
  }

  private touchTimeline(track: TimelineTrack): void {
    this.projects.update(projects => [...projects]);
  }
}
