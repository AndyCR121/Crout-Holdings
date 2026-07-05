import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminSidebarComponent } from '../../../components/admin-sidebar/admin-sidebar.component';
import { AuthService } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast.service';
import { AdminService } from '../../../services/admin.service';
import {
  IDatabaseManagementTarget,
  IDatabaseMigrationOperation,
  IDatabaseMigrationValidation,
  IMigrationSelection,
  ISqlUpdatePreview,
  ISqlUpdaterSummary,
} from '../../../interfaces/i-service.interface';

@Component({
  selector: 'ca-admin-database-management',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminSidebarComponent],
  templateUrl: './admin-database-management.component.html',
  styleUrls: ['./admin-database-management.component.scss'],
})
export class AdminDatabaseManagementComponent implements OnInit, OnDestroy {
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

  readonly migrationSourceTargetKey = signal('');
  readonly migrationSourceDatabaseName = signal('');
  readonly migrationDestinationTargetKey = signal('');
  readonly migrationDestinationDatabaseName = signal('');
  readonly migrationValidation = signal<IDatabaseMigrationValidation | null>(null);
  readonly migrationLoading = signal(false);
  readonly migrationStarting = signal(false);
  readonly migrationSourceConfirmationText = signal('');
  readonly migrationDestinationConfirmationText = signal('');
  readonly migrationConfirmationChecked = signal(false);
  readonly migrationOperation = signal<IDatabaseMigrationOperation | null>(null);

  private migrationPollHandle: number | null = null;

  ngOnInit(): void {
    const user = this.auth.currentUser();
    if (!user?.isAdmin) {
      void this.router.navigate(['/client/dashboard']);
      return;
    }

    this.loadTargets();
  }

  ngOnDestroy(): void {
    this.stopMigrationPolling();
  }

  loadTargets(): void {
    this.loadingTargets.set(true);
    this.error.set(null);
    this.admin.getDatabaseManagementTargets().subscribe({
      next: targets => {
        this.targets.set(targets);
        const sqlTarget = targets.find(target => target.allowSqlUpdates);
        const migrationSource = targets.find(target => target.allowMigrationSource);
        const migrationDestination = targets.find(target => target.allowMigrationDestination && target.key !== migrationSource?.key)
          ?? targets.find(target => target.allowMigrationDestination);

        if (sqlTarget) {
          this.sqlTargetKey.set(sqlTarget.key);
          this.sqlConfirmationText.set('');
          this.loadSqlPreview();
        }

        if (migrationSource) {
          this.migrationSourceTargetKey.set(migrationSource.key);
          this.migrationSourceDatabaseName.set(migrationSource.databaseName);
        }

        if (migrationDestination) {
          this.migrationDestinationTargetKey.set(migrationDestination.key);
          this.migrationDestinationDatabaseName.set(migrationDestination.databaseName);
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
        this.error.set(err?.error?.error ?? 'Failed to load SQL update preview.');
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
        this.error.set(err?.error?.error ?? 'No previous SQL update result is available yet.');
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
        this.toast.success(result.success ? 'SQL updates completed.' : 'SQL update finished with errors.');
        this.loadSqlPreview();
      },
      error: err => {
        this.error.set(err?.error?.error ?? 'Failed to run SQL updates.');
        this.sqlRunning.set(false);
      }
    });
  }

  validateMigration(): void {
    this.migrationLoading.set(true);
    this.error.set(null);
    this.admin.validateDatabaseMigration(this.migrationSourceSelection(), this.migrationDestinationSelection()).subscribe({
      next: validation => {
        this.migrationValidation.set(validation);
        this.migrationLoading.set(false);
      },
      error: err => {
        this.error.set(err?.error?.error ?? 'Migration validation failed.');
        this.migrationLoading.set(false);
      }
    });
  }

  startMigration(): void {
    this.migrationStarting.set(true);
    this.error.set(null);
    this.stopMigrationPolling();

    this.admin.startDatabaseMigration(
      this.migrationSourceSelection(),
      this.migrationDestinationSelection(),
      this.migrationSourceConfirmationText(),
      this.migrationDestinationConfirmationText(),
    ).subscribe({
      next: operation => {
        this.migrationOperation.set(operation);
        this.migrationStarting.set(false);
        this.startMigrationPolling(operation.operationId);
      },
      error: err => {
        this.error.set(err?.error?.error ?? 'Failed to start database migration.');
        this.migrationStarting.set(false);
      }
    });
  }

  onSourceTargetChange(): void {
    const target = this.targets().find(item => item.key === this.migrationSourceTargetKey());
    this.migrationSourceDatabaseName.set(target?.databaseName ?? '');
    this.resetMigrationState();
  }

  onDestinationTargetChange(): void {
    const target = this.targets().find(item => item.key === this.migrationDestinationTargetKey());
    this.migrationDestinationDatabaseName.set(target?.databaseName ?? '');
    this.resetMigrationState();
  }

  resetMigrationState(): void {
    this.migrationValidation.set(null);
    this.migrationOperation.set(null);
    this.migrationConfirmationChecked.set(false);
    this.migrationSourceConfirmationText.set('');
    this.migrationDestinationConfirmationText.set('');
    this.stopMigrationPolling();
  }

  private startMigrationPolling(operationId: string): void {
    this.migrationPollHandle = window.setInterval(() => {
      this.admin.getDatabaseMigrationStatus(operationId).subscribe({
        next: operation => {
          this.migrationOperation.set(operation);
          if (['Succeeded', 'Failed', 'ValidationFailed'].includes(operation.status)) {
            this.stopMigrationPolling();
            this.migrationValidation.set(operation.validation ?? null);
            this.toast.info(`Migration ${operation.status.toLowerCase()}.`);
          }
        },
        error: err => {
          this.error.set(err?.error?.error ?? 'Failed to refresh migration status.');
          this.stopMigrationPolling();
        }
      });
    }, 2000);
  }

  private stopMigrationPolling(): void {
    if (this.migrationPollHandle !== null) {
      window.clearInterval(this.migrationPollHandle);
      this.migrationPollHandle = null;
    }
  }

  private migrationSourceSelection(): IMigrationSelection {
    return {
      targetKey: this.migrationSourceTargetKey(),
      databaseNameOverride: this.migrationSourceDatabaseName().trim() || undefined,
    };
  }

  private migrationDestinationSelection(): IMigrationSelection {
    return {
      targetKey: this.migrationDestinationTargetKey(),
      databaseNameOverride: this.migrationDestinationDatabaseName().trim() || undefined,
    };
  }
}
