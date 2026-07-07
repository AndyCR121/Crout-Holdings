import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { APP_VERSION } from '../../app-version';
import { IReleaseNote } from '../../interfaces/i-service.interface';
import { ReleaseNotesService } from '../../services/release-notes.service';

@Component({
  selector: 'ca-release-notes-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    MatSelectModule,
  ],
  templateUrl: './release-notes-dialog.component.html',
  styleUrl: './release-notes-dialog.component.scss',
})
export class ReleaseNotesDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<ReleaseNotesDialogComponent>);
  private readonly releaseNotes = inject(ReleaseNotesService);
  readonly currentVersion = APP_VERSION;

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly items = signal<IReleaseNote[]>([]);
  readonly selectedVersion = signal<string | null>(null);
  readonly selectedRelease = computed(() =>
    this.items().find(item => item.releaseVersion === this.selectedVersion()) ?? null
  );

  constructor() {
    this.releaseNotes.getAll().subscribe({
      next: items => {
        this.items.set(items);
        this.selectedVersion.set(items[0]?.releaseVersion ?? null);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Unable to load release notes. Please try again later.');
        this.loading.set(false);
      }
    });
  }

  close(): void {
    this.dialogRef.close();
  }
}
