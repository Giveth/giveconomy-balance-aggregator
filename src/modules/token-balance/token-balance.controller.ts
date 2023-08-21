import { Controller, Get, Query, ValidationPipe } from '@nestjs/common';
import { ApiOperation, ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsDate,
  IsNumber,
  IsOptional,
  IsString,
  Validate,
  ValidatorConstraintInterface,
} from 'class-validator';
import { TokenBalanceService } from 'src/modules/token-balance/token-balance.service';
import { isNumber } from 'src/utils';

class EthereumAddress implements ValidatorConstraintInterface {
  validate(value: string) {
    return value.length === 42 && value.startsWith('0x');
  }

  defaultMessage() {
    return 'Invalid Ethereum address';
  }
}

class QueryParams {
  @IsString({ each: true })
  @Validate(EthereumAddress)
  @Transform(({ value }) =>
    value.split(',').map((address: string) => address.toLowerCase()),
  )
  @ApiProperty({
    type: 'string',
    description: 'Comma-seperated list of user addresses',
  })
  addresses: string[];

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
  @Type(() => Number)
  @ApiProperty({
    type: 'number',
    description: 'Network number',
    required: false,
  })
  network?: number;
}

class QueryParamsByTimestamp extends QueryParams {
  @IsNumber()
  @Transform(({ value }) => +value)
  @ApiProperty({ type: 'number', description: 'Unix timestamp second' })
  timestamp: number;
}

class QueryParamsUpdatedAfterDate {
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

  @IsDate()
  @Transform(({ value }) => new Date(isNumber(value) ? +value : value))
  @ApiProperty({
    oneOf: [
      { type: 'number', description: 'Date in timestamp milliseconds' },
      {
        type: 'string',
        description:
          'Date in acceptable by NodeJS Date constructor (e.g. ISO, ...)',
      },
    ],
  })
  date: Date;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @ApiProperty({
    type: 'number',
    description: 'Limit of results',
    required: false,
    default: 1000,
  })
  take?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @ApiProperty({
    type: 'number',
    description: 'Skip of results',
    required: false,
    default: 0,
  })
  skip?: number;
}
export interface TokenBalanceResponse {
  address: string;
  networks: number | number[];
  timestamp: number | 'latest';
  balance: string;
  update_at: Date | 'n/a';
}

export interface UpdatedAfterDateResponse {
  count: number;
  balances: {
    address: string;
    networks?: number | number[];
    balance: string;
    update_at: Date;
  }[];
}

@Controller('power-balance')
export class TokenBalanceController {
  constructor(private readonly tokenBalanceService: TokenBalanceService) {}

  @Get('by-timestamp')
  @ApiOperation({ summary: 'Get the balance of an address at a timestamp' })
  async getBalanceByTimestamp(
    @Query(new ValidationPipe({ transform: true }))
    params: QueryParamsByTimestamp,
  ): Promise<TokenBalanceResponse[]> {
    const { addresses, timestamp, networks, network } = params;
    const result = await this.tokenBalanceService.getBalance({
      addresses: addresses,
      timestamp: timestamp,
      networks: networks || network,
    });
    if (!result) {
      return [];
    }
    return result.map(_result => {
      return {
        address: _result.address,
        networks: _result.networks,
        timestamp: timestamp || 'latest',
        balance: _result.balance,
        update_at: _result.update_at,
      };
    });
  }

  @Get()
  @ApiOperation({ summary: 'Get the latest balance of an address' })
  async getBalance(
    @Query(new ValidationPipe({ transform: true }))
    params: QueryParams,
  ): Promise<TokenBalanceResponse[]> {
    const { addresses, networks, network } = params;
    const result = await this.tokenBalanceService.getBalance({
      addresses: addresses,
      networks: networks || network,
    });
    if (!result) {
      return null;
    }
    return result.map(_result => {
      return {
        address: _result.address,
        networks: _result.networks,
        timestamp: 'latest',
        balance: _result.balance,
        update_at: _result.update_at,
      };
    });
  }

  @Get('updated-after-date')
  @ApiOperation({ summary: 'Get balances updated after date' })
  async getBalanceUpdatedAfterDate(
    @Query(new ValidationPipe({ transform: true }))
    params: QueryParamsUpdatedAfterDate,
  ): Promise<UpdatedAfterDateResponse> {
    const { date, networks, network, take = 1000, skip } = params;
    const [balances, count] =
      await this.tokenBalanceService.getBalancesUpdateAfterDate({
        since: date,
        networks: networks || network,
        take,
        skip,
      });
    return {
      count,
      balances,
    };
  }
}
