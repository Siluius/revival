import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'findById', standalone: true })
export class FindByIdPipe implements PipeTransform {
  transform<T extends { id: string | null | undefined }>(items: T[] | null | undefined, id: string | null | undefined): T | null {
    if (!items || !id) return null;
    return items.find(i => i.id === id) ?? null;
  }
}
