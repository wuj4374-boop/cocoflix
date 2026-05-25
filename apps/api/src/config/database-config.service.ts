import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmOptionsFactory, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { join } from 'path';

@Injectable()
export class DatabaseConfigService implements TypeOrmOptionsFactory {
  constructor(private readonly configService: ConfigService) {}

  createTypeOrmOptions(): TypeOrmModuleOptions {
    return {
      type: 'sqljs',
      entities: [join(__dirname, '..', 'modules', '**', 'entities', '*.entity.{ts,js}')],
      migrations: [join(__dirname, '..', 'database', 'migrations', '*.{ts,js}')],
      synchronize: this.configService.get<boolean>('database.synchronize'),
      logging: this.configService.get<boolean>('database.logging'),
      autoSave: true,
      location: this.configService.get<string>('database.database', './data/cocoflix.db'),
    };
  }
}
