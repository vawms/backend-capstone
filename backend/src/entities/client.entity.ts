import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  Index,
  JoinColumn,
} from 'typeorm';
import { Company } from './company.entity';
import { ServiceRequest } from './service-request.entity';

@Entity('clients')
@Index('idx_clients_company_id', ['company_id'])
@Index('idx_clients_email', ['email'])
export class Client {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  company_id!: string;

  @Column()
  name!: string;

  @Column()
  email!: string;

  @Column({ nullable: true })
  phone!: string;

  @CreateDateColumn()
  created_at!: Date;

  // Relationships
  @ManyToOne(() => Company, (company) => company.clients, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'company_id' }) // ADD THIS LINE
  company!: Company;

  @OneToMany(() => ServiceRequest, (sr) => sr.client)
  service_requests!: ServiceRequest[];
}
