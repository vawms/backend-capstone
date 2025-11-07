import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  Index,
  JoinColumn,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Unique,
} from 'typeorm';
import { Company } from './company.entity';
import { ServiceRequest } from './service-request.entity';

@Entity('assets')
@Index('idx_assets_qr_token', ['qr_token']) // Index on qr_token
@Index('idx_assets_company_id', ['company_id']) // Index on company_id
export class Asset {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  company_id!: string;

  @Column()
  name!: string;

  @Column()
  model!: string;

  @Column()
  serial_number!: string;

  @Column()
  location_address!: string;

  @Column('decimal', { precision: 10, scale: 8 })
  location_lat!: number;

  @Column('decimal', { precision: 11, scale: 8 })
  location_lng!: number;

  @Column({ unique: true })
  qr_token!: string;

  @CreateDateColumn()
  created_at!: Date;

  // Relationships
  @ManyToOne(() => Company, (company) => company.assets, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'company_id' }) // ADD THIS LINE
  company!: Company;

  @OneToMany(() => ServiceRequest, (sr) => sr.asset)
  service_requests!: ServiceRequest[];
}
