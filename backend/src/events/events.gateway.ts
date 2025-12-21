import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class EventsGateway {
  @WebSocketServer()
  server!: Server;

  @SubscribeMessage('joinRoom')
  handleJoinRoom(
    @MessageBody() room: string,
    @ConnectedSocket() client: Socket,
  ) {
    client.join(room);
    return { event: 'joinedRoom', room };
  }

  @SubscribeMessage('leaveRoom')
  handleLeaveRoom(
    @MessageBody() room: string,
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(room);
    return { event: 'leftRoom', room };
  }

  emitServiceRequestUpdate(companyId: string, data: any) {
    // Emit to company-specific room
    this.server
      .to(`company:${companyId}`)
      .emit('service-request.updated', data);

    // Also emit to global room for admin dashboards
    this.server.to('global').emit('service-request.updated', data);
  }
}
