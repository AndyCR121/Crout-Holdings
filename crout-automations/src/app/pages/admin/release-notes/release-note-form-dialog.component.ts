import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { AdminService } from '../../../services/admin.service';
import { IReleaseNote } from '../../../interfaces/i-service.interface';

interface ReleaseNoteDialogData {
  mode: 'create' | 'edit';
  releaseNote?: IReleaseNote;
}

@Component({
  selector: 'ca-release-note-form-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule],
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
      this.data.releaseNote?.releaseDate ?? '',
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
    const payload = {
      releaseVersion: (formValue.releaseVersion ?? '').trim(),
      releaseDate: `${formValue.releaseDate ?? ''}`,
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
}
