import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { EventsService } from '../../../shared/events/events.service';
import { AppEvent } from '../../../shared/events/events.interfaces';

@Component({
  selector: 'app-event-form-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  templateUrl: './event-form-dialog.component.html'
})
export class EventFormDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(EventsService);
  private readonly dialogRef = inject(MatDialogRef<EventFormDialogComponent>);
  protected readonly data = inject<AppEvent | undefined>(MAT_DIALOG_DATA, { optional: true });

  protected readonly form = this.fb.group({
    name: ['', [Validators.required]],
    description: [''],
    costUSD: [0, [Validators.min(0)]]
  });

  constructor() {
    if (this.data) {
      this.form.patchValue({ name: this.data.name, description: this.data.description ?? '', costUSD: this.data.costUSD ?? 0 });
    }
  }

  async save(): Promise<void> {
    if (this.form.invalid) return;
    const value = this.form.getRawValue();
    if (this.data?.id) {
      await this.service.update(this.data.id, { name: value.name!, description: value.description ?? '', costUSD: Number(value.costUSD ?? 0) });
    } else {
      await this.service.create({ name: value.name!, description: value.description ?? '', costUSD: Number(value.costUSD ?? 0) });
    }
    this.dialogRef.close(true);
  }
}