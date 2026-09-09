import { Injectable } from "@nestjs/common";
import { OnGatewayConnection, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { JwtService } from "@nestjs/jwt";

/**
 * Gateway único de eventos em tempo real (spec §7): status de OS,
 * cronômetro do mecânico e notificações. Todos os clientes autenticados
 * entram na mesma sala do tenant e recebem os eventos relevantes — simples
 * o bastante para uma única oficina, sem exigir infraestrutura de fila.
 */
@Injectable()
@WebSocketGateway({ cors: { origin: "*" }, namespace: "/realtime" })
export class RealtimeGateway implements OnGatewayConnection {
  @WebSocketServer()
  server!: Server;

  constructor(private readonly jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    const token = client.handshake.auth?.token as string | undefined;
    try {
      if (token) {
        await this.jwtService.verifyAsync(token, { secret: process.env.JWT_ACCESS_SECRET });
      }
    } catch {
      client.disconnect();
    }
  }

  emitServiceOrderUpdated(payload: { id: string; number: number; status: string }) {
    this.server?.emit("service-order.updated", payload);
  }

  emitWorkSessionUpdated(payload: {
    serviceOrderId: string;
    mechanicId: string;
    mechanicName?: string;
    serviceOrderNumber?: number;
    status: "STARTED" | "FINISHED";
    durationSeconds?: number;
  }) {
    this.server?.emit("work-session.updated", payload);
  }

  emitNotification(payload: { title: string; body?: string }) {
    this.server?.emit("notification.created", payload);
  }
}
