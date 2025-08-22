import { Component, Inject, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { EventsService, AppEvent, EventStatus } from '../../../shared/events/events.service';

@Component({
  selector: 'app-event-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule
  ],
  template: `
  <h2 mat-dialog-title>{{ data ? 'Edit Event' : 'New Event' }}</h2>
  <div mat-dialog-content>
    <form [formGroup]="form" class="form">
      <mat-form-field appearance="outline" style="width:100%">
        <mat-label>Name</mat-label>
        <input matInput formControlName="name" />
      </mat-form-field>

      <mat-form-field appearance="outline" style="width:100%">
        <mat-label>Description</mat-label>
        <textarea matInput formControlName="description" rows="3"></textarea>
      </mat-form-field>

      <mat-form-field appearance="outline" style="width:100%">
        <mat-label>Status</mat-label>
        <mat-select formControlName="status">
          <mat-option value="proposal">Proposal</mat-option>
          <mat-option value="scheduled">Scheduled</mat-option>
          <mat-option value="executed">Executed</mat-option>
        </mat-select>
      </mat-form-field>

      <mat-form-field appearance="outline" style="width:100%">
        <mat-label>Start</mat-label>
        <input matInput type="datetime-local" formControlName="start" />
      </mat-form-field>

      <mat-form-field appearance="outline" style="width:100%">
        <mat-label>End</mat-label>
        <input matInput type="datetime-local" formControlName="end" />
      </mat-form-field>
    </form>
  </div>
  <div mat-dialog-actions>
    <button mat-button mat-dialog-close>Cancel</button>
    <button mat-raised-button color="primary" (click)="onSubmit()" [disabled]="saving()">{{ data ? 'Update' : 'Create' }}</button>
  </div>
  `
})
export class EventFormDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly events = inject(EventsService);
  private readonly dialogRef = inject(MatDialogRef<EventFormDialogComponent, boolean>);

  constructor(@Inject(MAT_DIALOG_DATA) public data: AppEvent | null) {
    if (data) {
      this.form.patchValue({
        name: data.name,
        description: data.description,
        status: data.status,
        start: this.toLocalDateTimeInput(data.start),
        end: this.toLocalDateTimeInput(data.end)
      });
    }
  }

  protected readonly saving = signal(false);

  readonly form = this.fb.group({
    name: ['', [Validators.required]],
    description: ['', [Validators.required]],
    status: ['proposal' as EventStatus, [Validators.required]],
    start: ['', [Validators.required]],
    end: ['', [Validators.required]]
  });

  private toLocalDateTimeInput(d: Date): string {
    const pad = (n: number) => n.toString().padStart(2, '0');
    const yyyy = d.getFullYear();
    const MM = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const hh = pad(d.getHours());
    const mm = pad(d.getMinutes());
    return `${yyyy}-${MM}-${dd}T${hh}:${mm}`;
  }

  private fromLocalDateTimeInput(v: string): Date {
    return new Date(v);
  }

  async onSubmit(): Promise<void> {
    if (this.saving()) return;
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    try {
      const raw = this.form.getRawValue();
      const payload = {
        name: raw.name!,
        description: raw.description!,
        status: raw.status!,
        start: this.fromLocalDateTimeInput(raw.start!),
        end: this.fromLocalDateTimeInput(raw.end!)
      } as const;

      if (!this.data) {
        await this.events.create(payload);
      } else {
        await this.events.update(this.data.id, payload);
      }
      this.dialogRef.close(true);
    } finally {
      this.saving.set(false);
    }
  }
}