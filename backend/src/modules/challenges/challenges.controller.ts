import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { CreateChallengeDto } from './dto/create-challenge.dto';
import { ChallengesService } from './challenges.service';

@ApiTags('challenges')
@Controller('challenges')
export class ChallengesController {
  constructor(private readonly challengesService: ChallengesService) {}

  @Get()
  @ApiOperation({ summary: 'List active savings challenges' })
  listChallenges() {
    return this.challengesService.listChallenges();
  }

  @Post('admin/create')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin API for creating challenges' })
  createChallenge(@Body() dto: CreateChallengeDto) {
    return this.challengesService.createChallenge(dto);
  }

  @Post('join/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Join a challenge' })
  @ApiResponse({ status: 201, description: 'Joined challenge' })
  joinChallenge(
    @Param('id') challengeId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.challengesService.joinChallenge(user.id, challengeId);
  }

  @Get(':id/leaderboard')
  @ApiOperation({ summary: 'Leaderboard for a challenge' })
  leaderboard(@Param('id') challengeId: string) {
    return this.challengesService.getChallengeLeaderboard(challengeId);
  }

  @Get('achievements/me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List current user challenge achievements' })
  myAchievements(@CurrentUser() user: { id: string }) {
    return this.challengesService.getUserAchievements(user.id);
  }

  @Get('achievements/share/:achievementId')
  @ApiOperation({ summary: 'Social sharing payload for an achievement' })
  sharePayload(@Param('achievementId') achievementId: string) {
    return this.challengesService.socialSharePayload(achievementId);
  }
}
