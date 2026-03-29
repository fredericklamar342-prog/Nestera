import { ApiProperty } from '@nestjs/swagger';

export class VotingPowerResponseDto {
  @ApiProperty({
    description: "The user's voting power as a formatted string",
    example: '12,500 NST',
  })
  votingPower: string;
}
