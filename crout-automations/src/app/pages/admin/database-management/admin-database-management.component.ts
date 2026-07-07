import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast.service';
import { AdminService } from '../../../services/admin.service';
import {
  IDatabaseManagementTarget,
  IMigrationSelection,
  ISchemaDifference,
  ISchemaSyncPlan,
  ISqlUpdatePreview,
  ISqlUpdaterSummary,
  SchemaDifferenceSeverity,
} from '../../../interfaces/i-service.interface';

@Component({
  selector: 'ca-admin-database-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-database-management.component.html',
  styleUrls: ['./admin-database-management.component.scss'],
})
export class AdminDatabaseManagementComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly admin = inject(AdminService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly loadingTargets = signal(true);
  readonly targets = signal<IDatabaseManagementTarget[]>([]);
  readonly error = signal<string | null>(null);

  readonly sqlTargetKey = signal('');
  readonly sqlPreview = signal<ISqlUpdatePreview | null>(null);
  readonly sqlResult = signal<ISqlUpdaterSummary | null>(null);
  readonly sqlLoading = signal(false);
  readonly sqlRunning = signal(false);
  readonly sqlConfirmationChecked = signal(false);
  readonly sqlConfirmationText = signal('');

  readonly schemaSourceTargetKey = signal('');
  readonly schemaSourceDatabaseName = signal('');
  readonly schemaTargetTargetKey = signal('');
  readonly schemaTargetDatabaseName = signal('');
  readonly schemaPlan = signal<ISchemaSyncPlan | null>(null);
  readonly schemaLoading = signal(false);
  readonly schemaGenerating = signal(false);
  readonly schemaConfirmationChecked = signal(false);
  readonly schemaConfirmationText = signal('');
  readonly severityFilter = signal<string>('All');
  readonly categoryFilter = signal<string>('All');

  ngOnInit(): void {
    const user = this.auth.currentUser();
    if (!user?.isAdmin) {
      void this.router.navigate(['/client/dashboard']);
      return;
    }

    this.loadTargets();
  }

  loadTargets(): void {
    this.loadingTargets.set(true);
    this.error.set(null);
    this.admin.getDatabaseManagementTargets().subscribe({
      next: targets => {
        this.targets.set(targets);
        const sqlTarget = targets.find(target => target.allowSqlUpdates);
        const schemaSource = targets.find(target => target.allowMigrationSource);
        const schemaTarget = targets.find(target => target.allowMigrationDestination && target.key !== schemaSource?.key)
          ?? targets.find(target => target.allowMigrationDestination);

        if (sqlTarget) {
          this.sqlTargetKey.set(sqlTarget.key);
          this.sqlConfirmationText.set('');
          this.loadSqlPreview();
        }

        if (schemaSource) {
          this.schemaSourceTargetKey.set(schemaSource.key);
          this.schemaSourceDatabaseName.set(schemaSource.databaseName);
        }

        if (schemaTarget) {
          this.schemaTargetTargetKey.set(schemaTarget.key);
          this.schemaTargetDatabaseName.set(schemaTarget.databaseName);
        }

        this.loadingTargets.set(false);
      },
      error: err => {
        this.error.set(err?.error?.error ?? 'Failed to load database targets.');
        this.loadingTargets.set(false);
      }
    });
  }

  loadSqlPreview(): void {
    const targetKey = this.sqlTargetKey();
    if (!targetKey) return;

    this.sqlLoading.set(true);
    this.error.set(null);
    this.admin.getSqlUpdatePreview(targetKey).subscribe({
      next: preview => {
        this.sqlPreview.set(preview);
        this.sqlResult.set(preview.latestResult ?? null);
        this.sqlConfirmationText.set('');
        this.sqlConfirmationChecked.set(false);
        this.sqlLoading.set(false);
      },
      error: err => {
        this.error.set(err?.error?.error ?? 'Failed to load migration preview.');
        this.sqlLoading.set(false);
      }
    });
  }

  refreshLatestSqlResult(): void {
    const targetKey = this.sqlTargetKey();
    if (!targetKey) return;

    this.sqlLoading.set(true);
    this.admin.getLatestSqlUpdateResult(targetKey).subscribe({
      next: result => {
        this.sqlResult.set(result);
        this.sqlLoading.set(false);
      },
      error: err => {
        this.error.set(err?.error?.error ?? 'No previous migration result is available yet.');
        this.sqlLoading.set(false);
      }
    });
  }

  runSqlUpdate(): void {
    const preview = this.sqlPreview();
    if (!preview?.target) return;

    this.sqlRunning.set(true);
    this.error.set(null);
    this.admin.runSqlUpdate(preview.target.key, this.sqlConfirmationText()).subscribe({
      next: result => {
        this.sqlResult.set(result);
        this.sqlRunning.set(false);
        this.sqlConfirmationChecked.set(false);
        this.sqlConfirmationText.set('');
        this.toast.success(result.success ? 'Numbered migrations completed.' : 'Migration run finished with errors.');
        this.loadSqlPreview();
      },
      error: err => {
        this.error.set(err?.error?.error ?? 'Failed to run numbered migrations.');
        this.sqlRunning.set(false);
      }
    });
  }

  compareSchema(): void {
    this.schemaLoading.set(true);
    this.error.set(null);
    this.admin.compareSchema(this.schemaSourceSelection(), this.schemaTargetSelection()).subscribe({
      next: response => {
        this.schemaPlan.set(response.plan ?? null);
        this.schemaLoading.set(false);
      },
      error: err => {
        this.error.set(err?.error?.error ?? 'Schema comparison failed.');
        this.schemaLoading.set(false);
      }
    });
  }

  generateSchemaSyncMigration(): void {
    this.schemaGenerating.set(true);
    this.error.set(null);
    this.admin.generateSchemaSyncMigration(
      this.schemaSourceSelection(),
      this.schemaTargetSelection(),
      this.schemaConfirmationText(),
    ).subscribe({
      next: plan => {
        this.schemaPlan.set(plan);
        this.schemaGenerating.set(false);
        this.schemaConfirmationChecked.set(false);
        this.schemaConfirmationText.set('');
        this.toast.success(`Generated ${plan.generatedMigrationFileName}.`);
        this.downloadGeneratedSchemaSyncMigration(plan.generatedMigrationFileName);
        this.loadSqlPreview();
      },
      error: err => {
        this.error.set(err?.error?.error ?? 'Failed to generate a reviewed migration file.');
        this.schemaGenerating.set(false);
      }
    });
  }

  onSchemaSourceTargetChange(): void {
    const target = this.targets().find(item => item.key === this.schemaSourceTargetKey());
    this.schemaSourceDatabaseName.set(target?.databaseName ?? '');
    this.resetSchemaState();
  }

  onSchemaTargetChange(): void {
    const target = this.targets().find(item => item.key === this.schemaTargetTargetKey());
    this.schemaTargetDatabaseName.set(target?.databaseName ?? '');
    this.resetSchemaState();
  }

  resetSchemaState(): void {
    this.schemaPlan.set(null);
    this.schemaConfirmationChecked.set(false);
    this.schemaConfirmationText.set('');
    this.severityFilter.set('All');
    this.categoryFilter.set('All');
  }

  filteredDifferences(): ISchemaDifference[] {
    const plan = this.schemaPlan();
    if (!plan) return [];

    return plan.differences.filter(difference => {
      const severityMatch = this.severityFilter() === 'All' || difference.severity === this.severityFilter();
      const categoryMatch = this.categoryFilter() === 'All' || difference.category === this.categoryFilter();
      return severityMatch && categoryMatch;
    });
  }

  severityOptions(): string[] {
    const plan = this.schemaPlan();
    return ['All', ...(plan?.severityCounts.map(item => item.key) ?? [])];
  }

  categoryOptions(): string[] {
    const plan = this.schemaPlan();
    return ['All', ...(plan?.categoryCounts.map(item => item.key) ?? [])];
  }

  countForSeverity(severity: SchemaDifferenceSeverity): number {
    return this.schemaPlan()?.severityCounts.find(item => item.key === severity)?.count ?? 0;
  }

  downloadGeneratedSchemaSyncMigration(fileName?: string | null): void {
    const resolvedFileName = fileName?.trim();
    if (!resolvedFileName) return;

    this.triggerSqlDownload(this.admin.getSchemaSyncMigrationDownloadUrl(resolvedFileName), resolvedFileName);
  }

  private schemaSourceSelection(): IMigrationSelection {
    return {
      targetKey: this.schemaSourceTargetKey(),
      databaseNameOverride: this.schemaSourceDatabaseName().trim() || undefined,
    };
  }

  private schemaTargetSelection(): IMigrationSelection {
    return {
      targetKey: this.schemaTargetTargetKey(),
      databaseNameOverride: this.schemaTargetDatabaseName().trim() || undefined,
    };
  }

  private triggerSqlDownload(downloadUrl: string, fileName: string): void {
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = fileName;
    link.rel = 'noopener';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    link.remove();
  }
}
