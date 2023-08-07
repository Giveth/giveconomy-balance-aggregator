import { Controller, Get, Query, ValidationPipe } from '@nestjs/common';
import { Transform } from 'class-transformer';
import {
  IsArray,
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
  address: string;

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

class QueryParamsByTimestamp extends QueryParams {
  @IsNumber()
  timestamp: number;
}

export interface TokenBalanceResponse {
  address: string;
  networks: number | number[];
  timestamp: number | 'latest';
  balance: string;
  update_at: Date;
}

@Controller('power-balance')
export class TokenBalanceController {
  constructor(private readonly tokenBalanceService: TokenBalanceService) {}

  @Get('by-timestamp')
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
      return null;
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
}
