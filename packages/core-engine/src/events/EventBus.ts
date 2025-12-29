/**
 * EventBus.ts - Core event bus implementation for GenesisX
 *
 * Type-safe, high-performance event bus supporting:
 * - Synchronous and asynchronous event handling
 * - Priority-based handler execution
 * - One-time subscriptions
 * - Event history for debugging and replay
 */

import {
  EventType,
  EventTypes,
  EventPayloadMap,
  GameEvent,
  EventHandler,
  GenericEventHandler,
  EventSubscription,
  EventFilter,
} from './EventTypes';

// ============================================================================
// Configuration
// ============================================================================

export interface EventBusConfig {
  historySize: number;
  asyncHandling: boolean;
  debugMode: boolean;
  defaultPriority: number;
  catchHandlerErrors: boolean;
}

export const DEFAULT_CONFIG: EventBusConfig = {
  historySize: 1000,
  asyncHandling: false,
  debugMode: false,
  defaultPriority: 0,
  catchHandlerErrors: true,
};

export interface EventBusStats {
  totalEventsEmitted: number;
  eventsPerType: Map<EventType, number>;
  activeSubscriptions: number;
  historySize: number;
  lastEventTimestamp: number | null;
}

export interface EventObserver {
  name: string;
  onEvent(event: GameEvent): void | Promise<void>;
  onError?(error: Error, event: GameEvent): void;
}

// ============================================================================
// EventBus Class
// ============================================================================

export class EventBus {
  private subscriptions: Map<EventType, EventSubscription[]> = new Map();
  private wildcardSubscriptions: EventSubscription[] = [];
  private history: GameEvent[] = [];
  private observers: EventObserver[] = [];
  private config: EventBusConfig;
  private stats: EventBusStats;
  private eventIdCounter: number = 0;
  private isPaused: boolean = false;
  private pauseQueue: GameEvent[] = [];

  constructor(config: Partial<EventBusConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.stats = {
      totalEventsEmitted: 0,
      eventsPerType: new Map(),
      activeSubscriptions: 0,
      historySize: 0,
      lastEventTimestamp: null,
    };

    Object.values(EventTypes).forEach((type) => {
      this.subscriptions.set(type as EventType, []);
    });
  }

  on<T extends EventType>(
    eventType: T,
    handler: EventHandler<T>,
    options: { priority?: number; once?: boolean } = {}
  ): () => void {
    const subscription: EventSubscription = {
      id: this.generateSubscriptionId(),
      eventType,
      handler: handler as GenericEventHandler,
      priority: options.priority ?? this.config.defaultPriority,
      once: options.once ?? false,
    };

    const handlers = this.subscriptions.get(eventType) || [];
    handlers.push(subscription);
    handlers.sort((a, b) => b.priority - a.priority);
    this.subscriptions.set(eventType, handlers);
    this.stats.activeSubscriptions++;

    return () => this.off(eventType, subscription.id);
  }

  once<T extends EventType>(eventType: T, handler: EventHandler<T>, priority?: number): () => void {
    return this.on(eventType, handler, { priority, once: true });
  }

  onAny(handler: GenericEventHandler, options: { priority?: number } = {}): () => void {
    const subscription: EventSubscription = {
      id: this.generateSubscriptionId(),
      eventType: '*' as EventType,
      handler,
      priority: options.priority ?? this.config.defaultPriority,
      once: false,
    };

    this.wildcardSubscriptions.push(subscription);
    this.wildcardSubscriptions.sort((a, b) => b.priority - a.priority);
    this.stats.activeSubscriptions++;

    return () => this.offAny(subscription.id);
  }

  off(eventType: EventType, subscriptionId: string): boolean {
    const handlers = this.subscriptions.get(eventType);
    if (!handlers) return false;

    const index = handlers.findIndex((s) => s.id === subscriptionId);
    if (index === -1) return false;

    handlers.splice(index, 1);
    this.stats.activeSubscriptions--;
    return true;
  }

  offAny(subscriptionId: string): boolean {
    const index = this.wildcardSubscriptions.findIndex((s) => s.id === subscriptionId);
    if (index === -1) return false;

    this.wildcardSubscriptions.splice(index, 1);
    this.stats.activeSubscriptions--;
    return true;
  }

  offAll(eventType?: EventType): void {
    if (eventType) {
      const handlers = this.subscriptions.get(eventType);
      if (handlers) {
        this.stats.activeSubscriptions -= handlers.length;
        this.subscriptions.set(eventType, []);
      }
    } else {
      this.subscriptions.forEach((handlers) => {
        this.stats.activeSubscriptions -= handlers.length;
      });
      this.subscriptions.forEach((_, key) => {
        this.subscriptions.set(key, []);
      });
      this.stats.activeSubscriptions -= this.wildcardSubscriptions.length;
      this.wildcardSubscriptions = [];
    }
  }

  emit<T extends keyof EventPayloadMap>(
    type: T,
    payload: EventPayloadMap[T],
    options: { source?: string; metadata?: Record<string, unknown> } = {}
  ): GameEvent<T> {
    const event = this.createEvent(type, payload, options);

    if (this.isPaused) {
      this.pauseQueue.push(event as GameEvent);
      return event;
    }

    this.dispatchEvent(event as GameEvent);
    return event;
  }

  async emitAsync<T extends keyof EventPayloadMap>(
    type: T,
    payload: EventPayloadMap[T],
    options: { source?: string; metadata?: Record<string, unknown> } = {}
  ): Promise<GameEvent<T>> {
    const event = this.createEvent(type, payload, options);

    if (this.isPaused) {
      this.pauseQueue.push(event as GameEvent);
      return event;
    }

    await this.dispatchEventAsync(event as GameEvent);
    return event;
  }

  emitRaw(event: GameEvent): void {
    if (this.isPaused) {
      this.pauseQueue.push(event);
      return;
    }
    this.dispatchEvent(event);
  }

  private dispatchEvent(event: GameEvent): void {
    this.recordEvent(event);
    this.notifyObservers(event);

    const handlers = this.subscriptions.get(event.type) || [];
    const allHandlers = [...handlers, ...this.wildcardSubscriptions];

    const toRemove: EventSubscription[] = [];

    for (const subscription of allHandlers) {
      try {
        subscription.handler(event);
        if (subscription.once) {
          toRemove.push(subscription);
        }
      } catch (error) {
        this.handleError(error as Error, event, subscription);
      }
    }

    toRemove.forEach((sub) => {
      if (sub.eventType === ('*' as EventType)) {
        this.offAny(sub.id);
      } else {
        this.off(sub.eventType, sub.id);
      }
    });
  }

  private async dispatchEventAsync(event: GameEvent): Promise<void> {
    this.recordEvent(event);
    await this.notifyObserversAsync(event);

    const handlers = this.subscriptions.get(event.type) || [];
    const allHandlers = [...handlers, ...this.wildcardSubscriptions];

    const toRemove: EventSubscription[] = [];

    for (const subscription of allHandlers) {
      try {
        await subscription.handler(event);
        if (subscription.once) {
          toRemove.push(subscription);
        }
      } catch (error) {
        this.handleError(error as Error, event, subscription);
      }
    }

    toRemove.forEach((sub) => {
      if (sub.eventType === ('*' as EventType)) {
        this.offAny(sub.id);
      } else {
        this.off(sub.eventType, sub.id);
      }
    });
  }

  addObserver(observer: EventObserver): void {
    this.observers.push(observer);
  }

  removeObserver(name: string): boolean {
    const index = this.observers.findIndex((o) => o.name === name);
    if (index === -1) return false;
    this.observers.splice(index, 1);
    return true;
  }

  private notifyObservers(event: GameEvent): void {
    for (const observer of this.observers) {
      try {
        observer.onEvent(event);
      } catch (error) {
        observer.onError?.(error as Error, event);
      }
    }
  }

  private async notifyObserversAsync(event: GameEvent): Promise<void> {
    for (const observer of this.observers) {
      try {
        await observer.onEvent(event);
      } catch (error) {
        observer.onError?.(error as Error, event);
      }
    }
  }

  getHistory(filter?: EventFilter): GameEvent[] {
    if (!filter) {
      return [...this.history];
    }

    return this.history.filter((event) => {
      if (filter.types && !filter.types.includes(event.type)) return false;
      if (filter.timeRange) {
        if (filter.timeRange.start && event.timestamp < filter.timeRange.start) return false;
        if (filter.timeRange.end && event.timestamp > filter.timeRange.end) return false;
      }
      if (filter.custom && !filter.custom(event)) return false;
      return true;
    });
  }

  replay(events: GameEvent[]): void {
    for (const event of events) {
      this.dispatchEvent(event);
    }
  }

  clearHistory(): void {
    this.history = [];
    this.stats.historySize = 0;
  }

  pause(): void {
    this.isPaused = true;
  }

  resume(): void {
    this.isPaused = false;
    const queued = [...this.pauseQueue];
    this.pauseQueue = [];
    queued.forEach((event) => this.dispatchEvent(event));
  }

  get paused(): boolean {
    return this.isPaused;
  }

  get queuedCount(): number {
    return this.pauseQueue.length;
  }

  getStats(): EventBusStats {
    return {
      ...this.stats,
      eventsPerType: new Map(this.stats.eventsPerType),
    };
  }

  getSubscriptionCount(eventType?: EventType): number {
    if (eventType) {
      return (this.subscriptions.get(eventType) || []).length;
    }
    return this.stats.activeSubscriptions;
  }

  hasSubscribers(eventType: EventType): boolean {
    const handlers = this.subscriptions.get(eventType);
    return (handlers && handlers.length > 0) || this.wildcardSubscriptions.length > 0;
  }

  private createEvent<T extends keyof EventPayloadMap>(
    type: T,
    payload: EventPayloadMap[T],
    options: { source?: string; metadata?: Record<string, unknown> }
  ): GameEvent<T> {
    return {
      id: this.generateEventId(),
      type,
      payload,
      timestamp: Date.now(),
      source: options.source,
      metadata: options.metadata,
    } as GameEvent<T>;
  }

  private recordEvent(event: GameEvent): void {
    if (this.config.historySize > 0) {
      this.history.push(event);
      if (this.history.length > this.config.historySize) {
        this.history.shift();
      }
      this.stats.historySize = this.history.length;
    }

    this.stats.totalEventsEmitted++;
    this.stats.lastEventTimestamp = event.timestamp;

    const count = this.stats.eventsPerType.get(event.type) || 0;
    this.stats.eventsPerType.set(event.type, count + 1);

    if (this.config.debugMode) {
      console.log(`[EventBus] ${event.type}:`, event.payload);
    }
  }

  private handleError(error: Error, event: GameEvent, _subscription: EventSubscription): void {
    if (this.config.catchHandlerErrors) {
      console.error(`[EventBus] Handler error for ${event.type}:`, error);
    } else {
      throw error;
    }
  }

  private generateEventId(): string {
    return `evt_${Date.now()}_${++this.eventIdCounter}`;
  }

  private generateSubscriptionId(): string {
    return `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

let defaultBus: EventBus | null = null;

export function getDefaultEventBus(): EventBus {
  if (!defaultBus) {
    defaultBus = new EventBus();
  }
  return defaultBus;
}

export function setDefaultEventBus(bus: EventBus): void {
  defaultBus = bus;
}

export default EventBus;
