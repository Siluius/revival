import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ActivitiesService } from '../../../shared/activities/activities.service';
import { ActivityModule, ActivityRecord } from '../../../shared/activities/activities.interfaces';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { AgGridModule } from 'ag-grid-angular';
import { ColDef, GridApi, GridOptions, ModuleRegistry, AllCommunityModule, themeQuartz } from 'ag-grid-community';

ModuleRegistry.registerModules([AllCommunityModule]);

@Component({
  selector: 'app-activities',
  standalone: true,
  imports: [CommonModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatIconModule, AgGridModule],
  templateUrl: './activities.component.html'
})
export class ActivitiesComponent {
  private readonly service = inject(ActivitiesService);

  protected gridApi?: GridApi;
  protected readonly theme = themeQuartz;

  protected readonly module = signal<ActivityModule | 'all'>('all');
  protected readonly userId = signal<string | 'all'>('all');
  protected readonly search = signal('');

  protected readonly all = toSignal(this.service.getAll$(), { initialValue: [] as ActivityRecord[] });

  protected readonly rowData = computed(() => {
    const mod = this.module();
    const uid = this.userId();
    const q = this.search().toLowerCase().trim();
    return this.all().filter(r => {
      const matchesMod = mod === 'all' || r.module === mod;
      const matchesUser = uid === 'all' || r.userId === uid;
      const detailsText = JSON.stringify(r.details ?? '').toLowerCase();
      const who = `${r.userEmail ?? ''} ${r.userDisplayName ?? ''}`.toLowerCase();
      const matchesSearch = !q || `${r.action} ${r.module} ${r.entityCollection ?? ''} ${r.entityId ?? ''} ${who} ${detailsText}`.includes(q);
      return matchesMod && matchesUser && matchesSearch;
    });
  });

  protected readonly columnDefs: ColDef[] = [
    { field: 'createdAt', headerName: 'When', valueFormatter: p => {
        const v: any = p.value; const d = (v?.toDate?.() ?? v) as Date | undefined; return d ? new Date(d).toLocaleString() : '';
      }, sort: 'desc', comparator: (a: any, b: any) => new Date(a).getTime() - new Date(b).getTime(), width: 180 },
    { field: 'module', headerName: 'Module', flex: 1 },
    { field: 'action', headerName: 'Action', width: 120 },
    { headerName: 'Entity', valueGetter: p => `${p.data.entityCollection}/${p.data.entityId}` },
    { headerName: 'Who', valueGetter: p => p.data.userDisplayName || p.data.userEmail || p.data.userId || '-' },
    { field: 'details', headerName: 'Details', valueFormatter: p => JSON.stringify(p.value) }
  ];

  protected readonly gridOptions: GridOptions = {
    rowModelType: 'clientSide',
    theme: themeQuartz,
    pagination: true,
    paginationPageSize: 10,
    suppressCellFocus: true,
    animateRows: true,
    defaultColDef: { sortable: true, filter: true, resizable: true }
  } as GridOptions;

  onGridReady(event: any) { this.gridApi = event.api as GridApi; this.gridApi.setGridOption('quickFilterText', this.search()); }
}