import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class HealthService {
  constructor(private readonly dataSource: DataSource) {}

  // Asynchronous meaning it will eventually return what it is promising
  async checkDatabase(): Promise<string> {
    try {
      await this.dataSource.query('SELECT 1');
      return 'up';
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      return 'down';
    }
  }
}
