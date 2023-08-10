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

class EthereumAddress implements ValidatorConstraintInterface {
  validate(value: string) {
    return value.length === 42 && value.startsWith('0x');
  }

  defaultMessage() {
    return 'Invalid Ethereum address';
  }
}

class QueryParams {
  @IsString()
  @Validate(EthereumAddress)
  @Transform(({ value }) => value.toLowerCase())
  @ApiProperty({ type: 'string', description: 'Ethereum address' })
  address: string;

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
  @Type(() => Date)
  @ApiProperty({
    type: 'Date | string | number',
    description:
      'Date in acceptable by NodeJS Date constructor (e.g. ISO, Timestamp milliseconds, ...)',
  })
  date: Date;

  @IsOptional()
  @IsNumber()
  @ApiProperty({
    type: 'number',
    description: 'Limit of results',
    required: false,
    default: 1000,
  })
  take?: number;

  @IsOptional()
  @IsNumber()
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
  ): Promise<TokenBalanceResponse> {
    const { address, timestamp, networks, network } = params;
    const result = await this.tokenBalanceService.getBalanceSingleUser({
      address: address,
      timestamp: timestamp,
      networks: networks || network,
    });
    if (!result) {
      return {
        address: address,
        networks: [],
        timestamp: timestamp,
        balance: '0',
        update_at: 'n/a',
      };
    }
    return {
      address: result.address,
      networks: result.networks,
      timestamp: timestamp || 'latest',
      balance: result.balance,
      update_at: result.update_at,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get the latest balance of an address' })
  async getBalance(
    @Query(new ValidationPipe({ transform: true }))
    params: QueryParams,
  ): Promise<TokenBalanceResponse> {
    const { address, networks, network } = params;
    const result = await this.tokenBalanceService.getBalanceSingleUser({
      address: address,
      networks: networks || network,
    });
    if (!result) {
      return null;
    }
    return {
      address: result.address,
      networks: result.networks,
      timestamp: 'latest',
      balance: result.balance,
      update_at: result.update_at,
    };
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
