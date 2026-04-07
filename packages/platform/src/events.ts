import Redis from "ioredis";

export type RealtimeChannel = "alerts" | "bandwidth" | "sites.status";

export class EventBus {
  private readonly publisher: Redis;
  private readonly subscriber: Redis;

  constructor(redisUrl: string) {
    this.publisher = new Redis(redisUrl, { maxRetriesPerRequest: null });
    this.subscriber = new Redis(redisUrl, { maxRetriesPerRequest: null });
  }

  async publish(channel: RealtimeChannel, payload: unknown) {
    await this.publisher.publish(channel, JSON.stringify(payload));
  }

  async subscribe(channel: RealtimeChannel, handler: (payload: unknown) => void) {
    await this.subscriber.subscribe(channel);
    this.subscriber.on("message", (incomingChannel, message) => {
      if (incomingChannel === channel) {
        handler(JSON.parse(message));
      }
    });
  }
}
