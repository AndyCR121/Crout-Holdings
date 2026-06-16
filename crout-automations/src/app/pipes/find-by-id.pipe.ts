import { Pipe, PipeTransform } from '@angular/core';
import { IService } from '../interfaces/i-service.interface';

@Pipe({ name: 'findById', standalone: true, pure: true })
export class FindByIdPipe implements PipeTransform {
  transform(services: IService[], id: number): IService | undefined {
    return services.find(s => s.serviceId === id);
  }
}
