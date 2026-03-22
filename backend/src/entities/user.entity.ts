import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToOne,
} from 'typeorm';
import { Company } from './company.entity';
import { Technician } from './technician.entity';

export enum UserRole {
  OPERATOR = 'OPERATOR',
  TECHNICIAN = 'TECHNICIAN',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  company_id!: string;

  @Column({ type: 'text', unique: true })
  username!: string;

  @Column('text')
  password!: string;

  @Column({ type: 'enum', enum: UserRole })
  role!: UserRole;

  @Column({ type: 'uuid', nullable: true })
  technician_id!: string | null;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  // Relationships
  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company!: Company;

  @OneToOne(() => Technician, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'technician_id' })
  technician!: Technician | null;
}
