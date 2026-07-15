import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import type { IncomingMessage } from 'http';
import type { Duplex } from 'stream';
import { WebSocket, WebSocketServer } from 'ws';
import { RedisService } from '../redis/redis.service';
import { GAME_TICKS_CHANNEL } from '../redis/redis-channels';

const GAME_PATH = /^\/ws\/games\/(football|basketball|baseball|volleyball)\/(\d+)\/?$/;
const TENNIS_PATH = /^\/ws\/tennis\/(\d+)\/?$/;

function keyForUrl(url: string): string | null {
  const gameMatch = url.match(GAME_PATH);
  if (gameMatch) return `game-${gameMatch[1]}-${gameMatch[2]}`;
  const tennisMatch = url.match(TENNIS_PATH);
  if (tennisMatch) return `match-tennis-${tennisMatch[1]}`;
  return null;
}

interface TrackedClient extends WebSocket {
  gameKey?: string;
}

// Wires a plain `ws` server directly onto the underlying HTTP server's
// 'upgrade' event rather than going through @nestjs/websockets'
// @WebSocketGateway/WsAdapter — that adapter routes upgrades by exact
// pathname equality (see @nestjs/platform-ws's ensureHttpServerExists),
// which can't express a path with a dynamic id like
// /ws/games/football/<id>/. Regex-matching the raw request URL here
// mirrors exactly what Django Channels' URLRouter already does per
// connection, and keeps the frontend's plain-WebSocket client
// (useLiveGame.ts) working with zero changes — no subscribe handshake,
// one socket per game/match, connect straight to the per-game URL.
@Injectable()
export class LiveGateway implements OnModuleInit {
  private readonly logger = new Logger(LiveGateway.name);
  private readonly wss = new WebSocketServer({ noServer: true });
  private readonly subscriptions = new Map<string, Set<TrackedClient>>();

  constructor(
    private readonly adapterHost: HttpAdapterHost,
    private readonly redis: RedisService,
  ) {}

  onModuleInit() {
    // Subscribing here (rather than to a local EventEmitter2 event) is what
    // makes this work across multiple backend instances: a tick published by
    // whichever instance's scraper/simulator produced it reaches every
    // instance's subscriber, so it can fan out to whatever clients are
    // connected to it specifically — no shared in-process state needed.
    this.redis.subscribe(GAME_TICKS_CHANNEL, (message) => {
      let parsed: { gameKey: string; payload: unknown };
      try {
        parsed = JSON.parse(message);
      } catch {
        this.logger.warn(`Discarding malformed tick message: ${message.slice(0, 100)}`);
        return;
      }
      this.broadcast(parsed.gameKey, parsed.payload);
    });

    const httpServer = this.adapterHost.httpAdapter.getHttpServer();

    httpServer.on('upgrade', (request: IncomingMessage, socket: Duplex, head: Buffer) => {
      const gameKey = keyForUrl(request.url ?? '');
      if (!gameKey) {
        socket.destroy();
        return;
      }

      this.wss.handleUpgrade(request, socket, head, (client: TrackedClient) => {
        client.gameKey = gameKey;
        if (!this.subscriptions.has(gameKey)) this.subscriptions.set(gameKey, new Set());
        this.subscriptions.get(gameKey)!.add(client);
        this.logger.log(`WS connected: ${gameKey} (${this.subscriptions.get(gameKey)!.size} watching)`);

        client.on('close', () => {
          const set = this.subscriptions.get(gameKey);
          if (!set) return;
          set.delete(client);
          if (set.size === 0) this.subscriptions.delete(gameKey);
        });
      });
    });
  }

  private broadcast(gameKey: string, payload: unknown) {
    const clients = this.subscriptions.get(gameKey);
    if (!clients || clients.size === 0) return;
    const message = JSON.stringify(payload);
    for (const client of clients) {
      if (client.readyState === WebSocket.OPEN) client.send(message);
    }
  }
}
