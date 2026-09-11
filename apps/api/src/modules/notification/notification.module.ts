import { Module } from "@nestjs/common";
import { NotificationController } from "./notification.controller";
import { NotificationService } from "./notification.service";
import { NotificationListenerService } from "./notification-listener.service";

@Module({
  controllers: [NotificationController],
  providers: [NotificationService, NotificationListenerService],
  exports: [NotificationService],
})
export class NotificationModule {}
