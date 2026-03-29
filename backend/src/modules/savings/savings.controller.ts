import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Delete,
  HttpCode,
  HttpStatus,
  UseGuards,
  UseInterceptors,
  Param,
  Query,
} from '@nestjs/common';
import { CacheInterceptor, CacheKey, CacheTTL } from '@nestjs/cache-manager';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { SavingsService } from './savings.service';
import { SavingsProduct, RiskLevel } from './entities/savings-product.entity';
import { UserSubscription } from './entities/user-subscription.entity';
import { SavingsGoal } from './entities/savings-goal.entity';
import { SubscribeDto } from './dto/subscribe.dto';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { SavingsProductDto } from './dto/savings-product.dto';
import { ProductDetailsDto } from './dto/product-details.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RpcThrottleGuard } from '../../common/guards/rpc-throttle.guard';
import {
  SavingsGoalProgress,
  UserSubscriptionWithLiveBalance,
} from './savings.service';

@ApiTags('savings')
@Controller('savings')
export class SavingsController {
  constructor(private readonly savingsService: SavingsService) {}

  @Get('products')
  @UseInterceptors(CacheInterceptor)
  @CacheKey('pools_all')
  @CacheTTL(60000)
  @ApiOperation({ summary: 'List all savings products' })
  @ApiQuery({ name: 'sort', required: false, enum: ['apy', 'tvl'] })
  @ApiResponse({
    status: 200,
    description: 'List of savings products',
    type: [SavingsProductDto],
  })
  async getProducts(
    @Query('sort') sort?: 'apy' | 'tvl',
  ): Promise<SavingsProductDto[]> {
    return await this.savingsService.findAllProducts(true, sort);
  }

  @Get('products/:id')
  @Throttle({ rpc: { limit: 30, ttl: 60000 } })
  @ApiOperation({
    summary: 'Get detailed product information with live contract data',
    description:
      'Retrieve a single savings product by ID with live total_assets from the Soroban vault contract',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'Product UUID',
  })
  @ApiResponse({
    status: 200,
    description: 'Product details with live contract data',
    type: ProductDetailsDto,
  })
  @ApiResponse({ status: 404, description: 'Product not found' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  @ApiResponse({
    status: 503,
    description: 'Soroban RPC service unavailable',
  })
  @ApiResponse({
    status: 504,
    description: 'Soroban RPC request timeout',
  })
  async getProductDetails(@Param('id') id: string): Promise<ProductDetailsDto> {
    const { product, totalAssets } =
      await this.savingsService.findProductWithLiveData(id);

    const totalAssetsXlm = totalAssets / 10_000_000;

    return {
      id: product.id,
      name: product.name,
      type: product.type,
      description: product.description,
      interestRate: product.interestRate,
      minAmount: product.minAmount,
      maxAmount: product.maxAmount,
      tenureMonths: product.tenureMonths,
      isActive: product.isActive,
      contractId: product.contractId,
      totalAssets,
      totalAssetsXlm,
      riskLevel: product.riskLevel || RiskLevel.LOW,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }

  @Post('subscribe')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Subscribe to a savings product' })
  @ApiBody({ type: SubscribeDto })
  @ApiResponse({
    status: 201,
    description: 'Subscription created',
    type: UserSubscription,
  })
  @ApiResponse({ status: 400, description: 'Invalid product or amount' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async subscribe(
    @Body() dto: SubscribeDto,
    @CurrentUser() user: { id: string; email: string },
  ): Promise<UserSubscription> {
    return await this.savingsService.subscribe(
      user.id,
      dto.productId,
      dto.amount,
    );
  }

  @Get('my-subscriptions')
  @Throttle({ rpc: { limit: 10, ttl: 60000 } })
  @UseGuards(JwtAuthGuard, RpcThrottleGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user subscriptions' })
  @ApiResponse({ status: 200, description: 'List of user subscriptions' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async getMySubscriptions(
    @CurrentUser() user: { id: string; email: string },
  ): Promise<UserSubscriptionWithLiveBalance[]> {
    return await this.savingsService.findMySubscriptions(user.id);
  }

  @Get('my-goals')
  @Throttle({ rpc: { limit: 10, ttl: 60000 } })
  @UseGuards(JwtAuthGuard, RpcThrottleGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Get current user savings goals enriched with live Soroban balance progress',
  })
  @ApiResponse({
    status: 200,
    description:
      'List of savings goals with current balance and percentage completion',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async getMyGoals(
    @CurrentUser() user: { id: string; email: string },
  ): Promise<SavingsGoalProgress[]> {
    return await this.savingsService.findMyGoals(user.id);
  }

  @Post('goals')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new savings goal' })
  @ApiBody({ type: CreateGoalDto })
  @ApiResponse({
    status: 201,
    description: 'Savings goal created',
    type: SavingsGoal,
  })
  @ApiResponse({ status: 400, description: 'Invalid goal data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createGoal(
    @Body() dto: CreateGoalDto,
    @CurrentUser() user: { id: string; email: string },
  ): Promise<SavingsGoal> {
    return await this.savingsService.createGoal(
      user.id,
      dto.goalName,
      dto.targetAmount,
      dto.targetDate,
      dto.metadata,
    );
  }

  @Patch('goals/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update a savings goal (user-scoped via JwtAuthGuard)',
    description:
      'Update goal details. Prevents IDOR by validating goal ownership via userId from JWT token.',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'Goal UUID',
  })
  @ApiBody({ type: UpdateGoalDto })
  @ApiResponse({
    status: 200,
    description: 'Goal updated',
    type: SavingsGoal,
  })
  @ApiResponse({ status: 400, description: 'Invalid goal data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Goal not found' })
  async updateGoal(
    @Param('id') id: string,
    @Body() dto: UpdateGoalDto,
    @CurrentUser() user: { id: string; email: string },
  ): Promise<SavingsGoal> {
    return await this.savingsService.updateGoal(id, user.id, dto);
  }

  @Delete('goals/:id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete a savings goal (user-scoped via JwtAuthGuard)',
    description:
      'Delete a goal. Prevents IDOR by validating goal ownership via userId from JWT token.',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'Goal UUID',
  })
  @ApiResponse({ status: 204, description: 'Goal deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Goal not found' })
  async deleteGoal(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; email: string },
  ): Promise<void> {
    return await this.savingsService.deleteGoal(id, user.id);
  }
}
