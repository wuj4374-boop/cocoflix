import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { Media } from '../media/entities/media.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Media])],
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}
