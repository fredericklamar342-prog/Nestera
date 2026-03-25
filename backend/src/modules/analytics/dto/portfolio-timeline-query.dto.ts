import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum PortfolioTimeframe {
  DAY = '1D',
  WEEK = '1W',
  MONTH = '1M',
  YTD = 'YTD',
}

export class PortfolioTimelineQueryDto {
  @ApiProperty({
    enum: PortfolioTimeframe,
    description: 'The timeframe for the portfolio timeline',
    example: PortfolioTimeframe.WEEK,
  })
  @IsEnum(PortfolioTimeframe)
  @IsNotEmpty()
  timeframe: PortfolioTimeframe;
}
