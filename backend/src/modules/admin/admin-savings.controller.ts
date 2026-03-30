import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ProductCapacitySnapshot } from '../savings/savings.service';
import { PageOptionsDto } from '../../common/dto/page-options.dto';
import { CreateProductDto } from '../savings/dto/create-product.dto';
import { UpdateProductDto } from '../savings/dto/update-product.dto';
import { AdminSavingsService } from './admin-savings.service';

@ApiTags('admin/savings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller({ path: 'admin/savings/products', version: '1' })
export class AdminSavingsController {
  constructor(private readonly adminSavingsService: AdminSavingsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a savings product' })
  createProduct(@Body() dto: CreateProductDto) {
    return this.adminSavingsService.createProduct(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a savings product' })
  updateProduct(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.adminSavingsService.updateProduct(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete (archive) a savings product' })
  archiveProduct(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminSavingsService.archiveProduct(id);
  }

  @Patch(':id/activate')
  @ApiOperation({ summary: 'Enable or disable a savings product' })
  setActive(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { isActive: boolean },
  ) {
    return this.adminSavingsService.setActive(id, body.isActive);
  }

  @Get(':id/subscribers')
  @ApiOperation({ summary: 'List all subscribers for a savings product' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  getSubscribers(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() opts: PageOptionsDto,
  ) {
    return this.adminSavingsService.getSubscribers(id, opts);
  }

  @Post('products/:id/migrations')
  @ApiOperation({
    summary: 'Migrate active subscriptions to another product version (admin)',
  })
  @ApiResponse({
    status: 200,
    description: 'Subscriptions migrated to the target product version',
  })
  async migrateProductSubscriptions(
    @Param('id') id: string,
    @Body() body: { targetProductId: string; subscriptionIds?: string[] },
    @CurrentUser() user: { id: string; email: string },
  ): Promise<{ migratedCount: number; targetProductId: string }> {
    const result = await this.savingsService.migrateSubscriptionsToVersion(
      id,
      body.targetProductId,
      user.id,
      body.subscriptionIds,
    );

    return {
      migratedCount: result.migratedCount,
      targetProductId: result.targetProduct.id,
    };
  @Get('products/:id/capacity-metrics')
  @ApiOperation({ summary: 'Get live capacity utilization metrics (admin)' })
  @ApiResponse({
    status: 200,
    description: 'Live capacity metrics',
  })
  async getCapacityMetrics(
    @Param('id') id: string,
  ): Promise<ProductCapacitySnapshot> {
    return await this.savingsService.getProductCapacitySnapshot(id);
  }
}
