import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

interface HealthStatus {
  status: 'ok' | 'error';
  timestamp: string;
  uptime: number;
  database: {
    status: 'ok' | 'error';
    responseTime: number;
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  disk?: {
    status: 'ok' | 'error';
    total: string;
    used: string;
    available: string;
  };
}

@Injectable()
export class HealthService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async check(): Promise<HealthStatus> {
    const dbCheck = await this.checkDatabase();
    const memoryCheck = this.checkMemory();

    const status: HealthStatus = {
      status: dbCheck.status === 'ok' ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: dbCheck,
      memory: memoryCheck,
    };

    return status;
  }

  private async checkDatabase(): Promise<{ status: 'ok' | 'error'; responseTime: number }> {
    const start = Date.now();
    try {
      await this.dataSource.query('SELECT 1');
      return {
        status: 'ok',
        responseTime: Date.now() - start,
      };
    } catch {
      return {
        status: 'error',
        responseTime: Date.now() - start,
      };
    }
  }

  private checkMemory(): { used: number; total: number; percentage: number } {
    const memoryUsage = process.memoryUsage();
    const used = memoryUsage.heapUsed;
    const total = memoryUsage.heapTotal;
    return {
      used: Math.round(used / 1024 / 1024),
      total: Math.round(total / 1024 / 1024),
      percentage: Math.round((used / total) * 100),
    };
  }
}
