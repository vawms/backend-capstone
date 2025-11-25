import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Company } from './company.entity';
import { ServiceRequest } from './service-request.entity';

@Entity('technicians')
export class Technician {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  company_id!: string;

  @Column('text')
  name!: string;

  @Column('text')
  email!: string;

  @Column('text')
  phone!: string;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  // Relationships
  @ManyToOne(() => Company, (company) => company.technicians, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'company_id' })
  company!: Company;

  @OneToMany(
    () => ServiceRequest,
    (serviceRequest) => serviceRequest.technician,
  )
  service_requests!: ServiceRequest[];
}
