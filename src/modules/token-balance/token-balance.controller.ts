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

class MyQueryParams {
  @IsString()
  @Validate(EthereumAddress)
  @Transform(({ value }) => value.toLowerCase())
  address: string;

  @IsOptional()
  @IsNumber()
  timestamp?: number;

  @IsOptional()
  @IsNumber({}, { each: true })
  @IsArray()
  networks?: number | number[];
}

export interface TokenBalanceResponse {
  address: string;
  networks: number | number[];
  timestamp: number | 'latest';
  balance: string;
}

@Controller('power-balance')
export class TokenBalanceController {
  constructor(private readonly tokenBalanceService: TokenBalanceService) {}

  @Get('by-timestamp')
  async getBalanceByTimestamp(
    @Query(new ValidationPipe({ transform: true })) params: MyQueryParams,
  ): Promise<TokenBalanceResponse> {
    const { address, timestamp, networks } = params;
    const result = await this.tokenBalanceService.getBalanceSingleUser({
      address: address,
      timestamp: timestamp,
      networks: networks,
    });
    if (!result) {
      return null;
    }
    return {
      address: result.address,
      networks: result.networks,
      timestamp: timestamp || 'latest',
      balance: result.balance,
    };
  }
}
