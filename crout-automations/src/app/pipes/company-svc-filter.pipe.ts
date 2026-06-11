import { Pipe, PipeTransform } from '@angular/core';
import { IUserService } from '../interfaces/i-service.interface';

/** Filters a list of IUserService to only those belonging to a given company_id. */
@Pipe({
  name: 'companySvcFilter',
  standalone: true,
  pure: true,
})
export class CompanySvcFilterPipe implements PipeTransform {
  transform(services: IUserService[], companyId: number): IUserService[] {
    if (!services?.length) return [];
    return services.filter(s => s.company_id === companyId);
  }
}
