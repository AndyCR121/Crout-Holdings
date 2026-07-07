import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { HttpErrorResponse } from '@angular/common/http';
import { AdminService } from '../../../services/admin.service';
import { IReleaseNote } from '../../../interfaces/i-service.interface';

interface ReleaseNoteDialogData {
  mode: 'create' | 'edit';
  releaseNote?: IReleaseNote;
}

@Component({
  selector: 'ca-release-note-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatDatepickerModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatNativeDateModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './release-note-form-dialog.component.html',
  styleUrl: './release-note-form-dialog.component.scss',
})
export class ReleaseNoteFormDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly admin = inject(AdminService);
  private readonly dialogRef = inject(MatDialogRef<ReleaseNoteFormDialogComponent, IReleaseNote | 'deleted'>);
  readonly data = inject<ReleaseNoteDialogData>(MAT_DIALOG_DATA);

  duplicateError = '';
  notFoundError = '';

  readonly form = this.fb.group({
    releaseVersion: [
      this.data.releaseNote?.releaseVersion ?? '',
      [Validators.required, Validators.pattern(/^\d+\.\d+\.\d+$/)]
    ],
    releaseDate: [
      this.data.releaseNote ? this.parseDate(this.data.releaseNote.releaseDate) : null,
      [Validators.required]
    ],
    releaseNotes: [
      this.data.releaseNote?.releaseNotes ?? '',
      [Validators.required]
    ],
  });

  isSaving = false;

  get title(): string {
    return this.data.mode === 'create' ? 'Create Release Note' : 'Edit Release Note';
  }

  submit(): void {
    this.duplicateError = '';
    this.notFoundError = '';

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving = true;
    const formValue = this.form.getRawValue();
    const dateValue = formValue.releaseDate!;
    const payload = {
      releaseVersion: (formValue.releaseVersion ?? '').trim(),
      releaseDate: this.formatDate(dateValue),
      releaseNotes: (formValue.releaseNotes ?? '').trim(),
    };

    const request = this.data.mode === 'create'
      ? this.admin.createReleaseNote(payload)
      : this.admin.updateReleaseNote(this.data.releaseNote!.refRelease, payload);

    request.subscribe({
      next: item => {
        this.isSaving = false;
        this.dialogRef.close(item);
      },
      error: (error: HttpErrorResponse) => {
        this.isSaving = false;
        if (error.status === 409) {
          this.duplicateError = 'A release note already exists for this version.';
          return;
        }

        if (error.status === 404) {
          this.notFoundError = 'This release note no longer exists.';
          this.dialogRef.close('deleted');
        }
      }
    });
  }

  private formatDate(value: Date): string {
    const year = value.getFullYear();
    const month = `${value.getMonth() + 1}`.padStart(2, '0');
    const day = `${value.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private parseDate(value: string): Date {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, (month || 1) - 1, day || 1);
  }
}
