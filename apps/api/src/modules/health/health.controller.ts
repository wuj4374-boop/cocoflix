import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

import { HealthService } from './health.service';

@ApiTags('健康检查')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: '系统健康检查' })
  @ApiResponse({ status: 200, description: '系统正常' })
  @ApiResponse({ status: 503, description: '系统异常' })
  async check() {
    const health = await this.healthService.check();

    if (health.status === 'error') {
      return {
        ...health,
        code: 50000,
        message: '系统异常',
      };
    }

    return {
      ...health,
      code: 0,
      message: '系统正常',
    };
  }
}
