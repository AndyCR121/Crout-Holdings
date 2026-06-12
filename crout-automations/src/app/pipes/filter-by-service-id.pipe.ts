import { Pipe, PipeTransform } from '@angular/core';
import { IAddon } from '../interfaces/i-service.interface';

@Pipe({ name: 'filterByServiceId', standalone: true, pure: true })
export class FilterByServiceIdPipe implements PipeTransform {
  transform(addons: IAddon[], serviceId: number): IAddon[] {
    return addons.filter(a => a.serviceId === serviceId);
  }
}
