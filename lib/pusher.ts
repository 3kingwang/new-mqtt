import * as PusherPushNotifications from "@pusher/push-notifications-web"

export const pusherClient = new PusherPushNotifications.Client({
  instanceId: process.env.NEXT_PUBLIC_PUSHER_INSTANCE_ID!,
})
