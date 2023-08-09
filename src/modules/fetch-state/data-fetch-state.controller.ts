import { Controller, Get, Query, ValidationPipe } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsArray, IsNumber, IsOptional } from 'class-validator';
import { DataFetchStateService } from 'src/modules/fetch-state/data-fetch-state.service';

class QueryParams {
  @IsOptional()
  @IsNumber({}, { each: true })
  @Transform(({ value }) => value.map(v => +v))
  @IsArray()
  networks?: number[];

  @IsOptional()
  @Transform(({ value }) => +value)
  @IsNumber()
  network?: number;
}
@Controller('fetch-state')
export class DataFetchStateController {
  constructor(private readonly dataFetchStateService: DataFetchStateService) {}

  @Get('least-indexed-block-timestamp')
  async getLeastIndexedBlockTimestamp(
    @Query(new ValidationPipe({ transform: true }))
    params: QueryParams,
  ): Promise<number> {
    return this.dataFetchStateService.getLeastIndexedBlocksTimestamp(
      params.networks || params.network,
    );
  }
}
