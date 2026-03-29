import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { SweepTasksService } from './sweep-tasks.service';
import { StorageModule } from '../storage/storage.module';
import { BlockchainModule } from '../blockchain/blockchain.module';
import { User } from './entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User]), StorageModule, BlockchainModule],
  controllers: [UserController],
  providers: [UserService, SweepTasksService],
  exports: [UserService, SweepTasksService],
})
export class UserModule {}
