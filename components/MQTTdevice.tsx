"use client"

import useMQTTStore from "@/stores/mqttStore"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function MQTTdevice() {
  const { messages, isConnected } = useMQTTStore()
  const lastMessage = messages[0]

  if (!isConnected) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>最新消息</CardTitle>
      </CardHeader>
      <CardContent>
        {lastMessage ? (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {lastMessage.timestamp}
            </p>
            <p className="font-mono text-sm text-primary">
              {lastMessage.topic}
            </p>
            <p className="text-sm">{lastMessage.payload}</p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">暂无消息</p>
        )}
      </CardContent>
    </Card>
  )
}
