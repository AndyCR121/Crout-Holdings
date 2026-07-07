import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { IReleaseNote } from '../../../interfaces/i-service.interface';
import { AdminService } from '../../../services/admin.service';
import { AuthService } from '../../../services/auth.service';
import { ConfirmDialogService } from '../../../services/confirm-dialog.service';
import { ReleaseNoteFormDialogComponent } from './release-note-form-dialog.component';

@Component({
  selector: 'ca-admin-release-notes',
  standalone: true,
  imports: [CommonModule, MatDialogModule],
  templateUrl: './admin-release-notes.component.html',
  styleUrl: './admin-release-notes.component.scss',
})
export class AdminReleaseNotesComponent {
  private readonly auth = inject(AuthService);
  private readonly admin = inject(AdminService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);

  readonly items = signal<IReleaseNote[]>([]);
  readonly total = signal(0);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly pageSize = signal(10);
  readonly pageIndex = signal(0);
  readonly sortBy = signal<'releaseVersion' | 'releaseDate'>('releaseVersion');
  readonly sortDirection = signal<'asc' | 'desc'>('desc');
  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize())));
  readonly hasMore = computed(() => (this.pageIndex() + 1) * this.pageSize() < this.total());

  constructor() {
    const user = this.auth.currentUser();
    if (!user?.isAdmin) {
      void this.router.navigate(['/client/dashboard']);
      return;
    }

    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);

    this.admin.getReleaseNotes(
      this.pageIndex() + 1,
      this.pageSize(),
      this.sortBy(),
      this.sortDirection()
    ).subscribe({
      next: result => {
        this.items.set(result.items);
        this.total.set(result.total);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load release notes.');
        this.loading.set(false);
      }
    });
  }

  openCreate(): void {
    this.dialog.open(ReleaseNoteFormDialogComponent, {
      width: '760px',
      maxWidth: '95vw',
      panelClass: 'ca-admin-modal-panel',
      data: { mode: 'create' }
    }).afterClosed().subscribe(result => {
      if (result) {
        this.pageIndex.set(0);
        this.load();
      }
    });
  }

  openEdit(releaseNote: IReleaseNote): void {
    this.dialog.open(ReleaseNoteFormDialogComponent, {
      width: '760px',
      maxWidth: '95vw',
      panelClass: 'ca-admin-modal-panel',
      data: { mode: 'edit', releaseNote }
    }).afterClosed().subscribe(result => {
      if (result === 'deleted') {
        this.error.set('This release note no longer exists.');
        this.load();
        return;
      }

      if (result) {
        this.load();
      }
    });
  }

  async deleteReleaseNote(releaseNote: IReleaseNote): Promise<void> {
    const confirmed = await this.confirmDialog.open(
      `Delete release ${releaseNote.releaseVersion}?`,
      `Are you sure you want to delete release ${releaseNote.releaseVersion}? This action cannot be undone.`,
      'Delete'
    );

    if (!confirmed) {
      return;
    }

    this.admin.deleteReleaseNote(releaseNote.refRelease).subscribe({
      next: () => {
        const nextPageIndex = this.items().length === 1 && this.pageIndex() > 0
          ? this.pageIndex() - 1
          : this.pageIndex();
        this.pageIndex.set(nextPageIndex);
        this.load();
      },
      error: (error: HttpErrorResponse) => {
        this.error.set(error.status === 404
          ? 'This release note no longer exists.'
          : 'Failed to delete release note.');
        this.load();
      }
    });
  }

  prevPage(): void {
    if (this.pageIndex() === 0) {
      return;
    }

    this.pageIndex.set(this.pageIndex() - 1);
    this.load();
  }

  nextPage(): void {
    if (!this.hasMore()) {
      return;
    }

    this.pageIndex.set(this.pageIndex() + 1);
    this.load();
  }

  toggleSort(column: 'releaseVersion' | 'releaseDate'): void {
    if (this.sortBy() === column) {
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortBy.set(column);
      this.sortDirection.set('desc');
    }

    this.pageIndex.set(0);
    this.load();
  }

  sortIndicator(column: 'releaseVersion' | 'releaseDate'): string {
    if (this.sortBy() !== column) {
      return '';
    }

    return this.sortDirection() === 'asc' ? 'ASC' : 'DESC';
  }
}
