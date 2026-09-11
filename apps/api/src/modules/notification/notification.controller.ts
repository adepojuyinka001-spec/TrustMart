import { ApiTags } from "@nestjs/swagger";
import { Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { NotificationService } from "./notification.service";
import { JwtAuthGuard } from "../identity/jwt-auth.guard";
import { CurrentUser } from "../identity/current-user.decorator";
import type { RequestUser } from "../identity/authenticated-request";
import { ListNotificationsDto } from "./dto/list-notifications.dto";

@ApiTags("Notifications")
@Controller("notifications")
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get("mine")
  listMine(@Query() query: ListNotificationsDto, @CurrentUser() user: RequestUser) {
    return this.notificationService.listMine(
      user.userId,
      { unreadOnly: query.unreadOnly },
      { take: query.take ?? 20, skip: query.skip ?? 0 },
    );
  }

  @Patch(":id/read")
  markRead(@Param("id") id: string, @CurrentUser() user: RequestUser) {
    return this.notificationService.markRead(id, user.userId);
  }

  @Post("mark-all-read")
  markAllRead(@CurrentUser() user: RequestUser) {
    return this.notificationService.markAllRead(user.userId);
  }
}
