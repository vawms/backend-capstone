import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ServiceRequest, ServiceRequestStatus } from './service-request.entity';
import { Technician } from './technician.entity';

export enum ServiceRequestHistoryEventType {
  CREATED = 'CREATED',
  STATUS_CHANGED = 'STATUS_CHANGED',
  ASSIGNED = 'ASSIGNED',
  RESCHEDULED = 'RESCHEDULED',
  TECHNICIAN_NOTES_UPDATED = 'TECHNICIAN_NOTES_UPDATED',
  CLIENT_MEDIA_ADDED = 'CLIENT_MEDIA_ADDED',
  TECHNICIAN_MEDIA_ADDED = 'TECHNICIAN_MEDIA_ADDED',
  FOLLOW_UP_CREATED = 'FOLLOW_UP_CREATED',
}

@Entity('service_request_history')
@Index('idx_service_request_history_request_created', [
  'service_request_id',
  'created_at',
])
@Index('idx_service_request_history_company_created', [
  'company_id',
  'created_at',
])
@Index('idx_service_request_history_event_type', ['event_type'])
export class ServiceRequestHistory {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  company_id!: string;

  @Column('uuid')
  service_request_id!: string;

  @Column('enum', {
    enum: ServiceRequestHistoryEventType,
    enumName: 'service_request_history_event_type_enum',
  })
  event_type!: ServiceRequestHistoryEventType;

  @Column('enum', {
    enum: ServiceRequestStatus,
    enumName: 'service_requests_status_enum',
    nullable: true,
  })
  from_status!: ServiceRequestStatus | null;

  @Column('enum', {
    enum: ServiceRequestStatus,
    enumName: 'service_requests_status_enum',
    nullable: true,
  })
  to_status!: ServiceRequestStatus | null;

  @Column('uuid', { nullable: true })
  technician_id!: string | null;

  @Column('timestamp', { nullable: true })
  scheduled_date!: Date | null;

  @Column('text', { nullable: true })
  summary!: string | null;

  @Column('jsonb', { nullable: true })
  metadata!: Record<string, unknown> | null;

  @CreateDateColumn()
  created_at!: Date;

  @ManyToOne(() => ServiceRequest, (sr) => sr.history, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'service_request_id' })
  service_request!: ServiceRequest;

  @ManyToOne(() => Technician, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'technician_id' })
  technician!: Technician | null;
}
