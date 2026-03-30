import {
  Body,
  Controller,
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
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { AdminUsersService } from './admin-users.service';
import { AdminUsersQueryDto } from './dto/admin-users-query.dto';
import {
  BulkActionDto,
  UpdateUserRoleDto,
  UpdateUserStatusDto,
} from './dto/admin-user.dto';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller({ path: 'admin/users', version: '1' })
export class AdminUsersController {
  constructor(private readonly adminUsersService: AdminUsersService) {}

  @Get()
  @ApiOperation({ summary: 'List users with pagination, search, and filters' })
  @ApiResponse({
    status: 200,
    description: 'Paginated user list with savings and transaction totals',
  })
  listUsers(@Query() query: AdminUsersQueryDto) {
    return this.adminUsersService.listUsers(query);
  }

  @Get(':id/details')
  @ApiOperation({ summary: 'Full user profile with activity summary' })
  getUserDetails(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminUsersService.getUserDetails(id);
  }

  @Patch(':id/role')
  @ApiOperation({ summary: 'Update user role' })
  updateRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserRoleDto,
  ) {
    return this.adminUsersService.updateRole(id, dto.role);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Activate or deactivate a user account' })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserStatusDto,
  ) {
    return this.adminUsersService.updateStatus(id, dto.isActive);
  }

  @Post('bulk-action')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bulk activate/deactivate/email/export users' })
  bulkAction(@Body() dto: BulkActionDto) {
    return this.adminUsersService.bulkAction(dto);
  }
}
