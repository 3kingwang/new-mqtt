"use client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import useMQTTStore from "@/stores/mqttStore"

export default function OnlineUsers() {
  const { username, onlineUsers } = useMQTTStore()

  // 只有 test2 用户才显示此组件
  if (username !== "test2") {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>在线用户</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {onlineUsers.map((user) => (
            <Badge key={user} variant="secondary">
              {user}
            </Badge>
          ))}
        </div>
        {onlineUsers.length === 0 && (
          <p className="text-sm text-muted-foreground text-center">
            暂无在线用户
          </p>
        )}
      </CardContent>
    </Card>
  )
}
