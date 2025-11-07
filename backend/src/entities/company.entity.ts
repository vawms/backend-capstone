import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Asset } from './asset.entity';
import { Client } from './client.entity';
import { ServiceRequest } from './service-request.entity';

@Entity('companies')
export class Company {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column({ type: 'varchar', nullable: true, name: 'logo_url' })
  logo_url!: string;

  @Column({ type: 'varchar', nullable: true, name: 'primary_color' })
  primary_color!: string;

  @CreateDateColumn({ name: 'created_at' })
  created_at!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at!: Date;

  // Relationships
  @OneToMany(() => Asset, (asset) => asset.company)
  assets!: Asset[];

  @OneToMany(() => Client, (client) => client.company)
  clients!: Client[];

  @OneToMany(() => ServiceRequest, (sr) => sr.company)
  service_requests!: ServiceRequest[];
}
