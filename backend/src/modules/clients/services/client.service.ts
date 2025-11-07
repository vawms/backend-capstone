import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client } from '../../../entities/client.entity';

export interface FindOrCreateClientInput {
  company_id: string;
  name: string;
  email: string;
  phone: string;
}

@Injectable()
export class ClientService {
  constructor(
    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,
  ) {}

  /**
   * Find existing client or create new one (deduplication)
   *
   * Strategy:
   * 1. Try to find by email for this company
   * 2. If not found, try by phone for this company
   * 3. If still not found, create new client
   *
   * Returns: existing or newly created client
   */
  async findOrCreateClient(input: FindOrCreateClientInput): Promise<Client> {
    const { company_id, email, phone, name } = input;

    // Try to find by email
    let client = await this.clientRepository.findOne({
      where: {
        company_id,
        email,
      },
    });

    if (client) {
      return client;
    }

    // Try to find by phone
    client = await this.clientRepository.findOne({
      where: {
        company_id,
        phone,
      },
    });

    if (client) {
      return client;
    }

    // Create new client
    const newClient = this.clientRepository.create({
      company_id,
      name,
      email,
      phone,
    });

    return this.clientRepository.save(newClient);
  }

  /**
   * Get client by ID
   */
  async getClientById(id: string): Promise<Client> {
    const client = await this.clientRepository.findOne({ where: { id } });

    if (!client) {
      throw new NotFoundException(`Client with ID ${id} not found`);
    }

    return client;
  }
}
