import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ViewChild, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSort, MatSortModule, Sort } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { IReleaseNote } from '../../../interfaces/i-service.interface';
import { AdminService } from '../../../services/admin.service';
import { AuthService } from '../../../services/auth.service';
import { ConfirmDialogService } from '../../../services/confirm-dialog.service';
import { ReleaseNoteFormDialogComponent } from './release-note-form-dialog.component';

@Component({
  selector: 'ca-admin-release-notes',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatSortModule,
    MatTableModule,
  ],
  templateUrl: './admin-release-notes.component.html',
  styleUrl: './admin-release-notes.component.scss',
})
export class AdminReleaseNotesComponent implements AfterViewInit {
  private readonly auth = inject(AuthService);
  private readonly admin = inject(AdminService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);

  @ViewChild(MatPaginator) paginator?: MatPaginator;
  @ViewChild(MatSort) sort?: MatSort;

  readonly displayedColumns = ['releaseVersion', 'releaseDate', 'actions'];
  readonly items = signal<IReleaseNote[]>([]);
  readonly total = signal(0);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly pageSize = signal(10);
  readonly pageIndex = signal(0);
  readonly sortBy = signal<'releaseVersion' | 'releaseDate'>('releaseVersion');
  readonly sortDirection = signal<'asc' | 'desc'>('desc');

  constructor() {
    const user = this.auth.currentUser();
    if (!user?.isAdmin) {
      void this.router.navigate(['/client/dashboard']);
      return;
    }

    this.load();
  }

  ngAfterViewInit(): void {
    if (this.sort) {
      this.sort.active = 'releaseVersion';
      this.sort.direction = 'desc';
    }
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

  onPage(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    this.load();
  }

  onSortChange(event: Sort): void {
    this.sortBy.set((event.active === 'releaseDate' ? 'releaseDate' : 'releaseVersion'));
    this.sortDirection.set((event.direction === 'asc' ? 'asc' : 'desc'));
    this.pageIndex.set(0);
    this.load();
  }
}
