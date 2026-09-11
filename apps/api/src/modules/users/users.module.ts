import { Module } from "@nestjs/common";
import { UsersController } from "./users.controller";
import { AdminUserController } from "./admin-user.controller";
import { AdminRoleController } from "./admin-role.controller";
import { UsersService } from "./users.service";

@Module({
  controllers: [UsersController, AdminUserController, AdminRoleController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
