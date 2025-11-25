import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
  Index,
} from 'typeorm';
import { Company } from './company.entity';
import { Asset } from './asset.entity';
import { Client } from './client.entity';
import { Technician } from './technician.entity';

export enum ServiceRequestChannel {
  QR = 'QR',
  MANUAL = 'MANUAL',
}

export enum ServiceRequestType {
  MAINTENANCE = 'MAINTENANCE',
  MALFUNCTION = 'MALFUNCTION',
}

export enum ServiceRequestStatus {
  PENDING = 'PENDING',
  ASSIGNED = 'ASSIGNED',
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

@Entity('service_requests')
@Index('idx_service_requests_company_created', ['company_id', 'created_at'], {
  // Composite index for common query: "all requests for company, newest first"
})
@Index('idx_service_requests_status', ['status'])
export class ServiceRequest {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  company_id!: string;

  @Column('uuid')
  asset_id!: string;

  @Column('uuid', { nullable: true })
  client_id!: string;

  @Column('enum', { enum: ServiceRequestChannel })
  channel!: ServiceRequestChannel;

  @Column('enum', { enum: ServiceRequestType })
  type!: ServiceRequestType;

  @Column('text')
  description!: string;

  @Column('text', { nullable: true })
  technician_notes!: string;

  @Column('jsonb', { nullable: true })
  media!: Array<{ url: string; kind: 'image' | 'video' | 'document' }>;

  @Column('enum', {
    enum: ServiceRequestStatus,
    default: ServiceRequestStatus.PENDING,
  })
  status!: ServiceRequestStatus;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  // Relationships
  @ManyToOne(() => Company, (company) => company.service_requests, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'company_id' })
  company!: Company;

  @ManyToOne(() => Asset, (asset) => asset.service_requests, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'asset_id' })
  asset!: Asset;

  @ManyToOne(() => Client, (client) => client.service_requests, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'client_id' })
  client!: Client;

  @Column('uuid', { nullable: true })
  technician_id!: string;

  @ManyToOne(() => Technician, (technician) => technician.service_requests, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'technician_id' })
  technician!: Technician;
}
