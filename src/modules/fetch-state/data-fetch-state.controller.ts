import { Controller, Get, Query, ValidationPipe } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsArray, IsNumber, IsOptional } from 'class-validator';
import { DataFetchStateService } from 'src/modules/fetch-state/data-fetch-state.service';

class QueryParams {
  @IsOptional()
  @IsNumber({}, { each: true })
  @Transform(({ value }) => value.split(',').map(v => +v))
  @IsArray()
  @ApiProperty({
    type: 'string',
    description: 'Comma-separated list of network numbers',
    required: false,
  })
  networks?: number[];

  @IsOptional()
  @Transform(({ value }) => +value)
  @IsNumber()
  @ApiProperty({
    type: 'number',
    description: 'Network number',
    required: false,
  })
  network?: number;
}
@Controller('fetch-state')
export class DataFetchStateController {
  constructor(private readonly dataFetchStateService: DataFetchStateService) {}

  @Get('least-indexed-block-timestamp')
  @ApiOperation({ summary: 'Get least indexed block timestamp' })
  @ApiOkResponse({
    type: Number,
    description:
      'The timestamp of the last indexed block of the least recently updated network.',
  })
  async getLeastIndexedBlockTimestamp(
    @Query(new ValidationPipe({ transform: true }))
    params: QueryParams,
  ): Promise<number> {
    return this.dataFetchStateService.getLeastIndexedBlocksTimestamp(
      params.networks || params.network,
    );
  }
}
