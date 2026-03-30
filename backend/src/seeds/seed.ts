import { AppDataSource } from '../ormconfig';
import { Company } from '../entities/company.entity';
import { Asset } from '../entities/asset.entity';
import { Client } from '../entities/client.entity';
import { QrTokenGenerator } from '../common/utils/qr-token.generator';
import { User, UserRole } from '../entities/user.entity';
import { Technician } from '../entities/technician.entity';
import {
  ServiceRequest,
  ServiceRequestChannel,
  ServiceRequestStatus,
  ServiceRequestType,
} from '../entities/service-request.entity';
import * as bcrypt from 'bcrypt';

async function seed() {
  await AppDataSource.initialize();

  const companyRepo = AppDataSource.getRepository(Company);
  const assetRepo = AppDataSource.getRepository(Asset);
  const clientRepo = AppDataSource.getRepository(Client);
  const userRepo = AppDataSource.getRepository(User);
  const technicianRepo = AppDataSource.getRepository(Technician);
  const serviceRequestRepo = AppDataSource.getRepository(ServiceRequest);
  const qrGenerator = new QrTokenGenerator();

  console.log('--- 🚀 Seeding started ---');

  // 1. Clear existing data (optional but recommended for a clean test state)
  // Note: Order matters due to foreign keys
  // Uses query builder because .delete({}) rejects empty criteria in newer TypeORM
  console.log('Clearing existing data...');
  await serviceRequestRepo.createQueryBuilder().delete().execute();
  await userRepo.createQueryBuilder().delete().execute();
  await technicianRepo.createQueryBuilder().delete().execute();
  await clientRepo.createQueryBuilder().delete().execute();
  await assetRepo.createQueryBuilder().delete().execute();
  await companyRepo.createQueryBuilder().delete().execute();

  // 2. Create Company
  const company = companyRepo.create({
    name: 'TechCorp',
    logo_url: 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=200&h=200&fit=crop',
    primary_color: '#0066CC',
  });
  await companyRepo.save(company);
  console.log(`✓ Created company: ${company.name} (${company.id})`);

  // 3. Create Operator User
  const operatorPassword = await bcrypt.hash('operator123', 10);
  const operatorUser = userRepo.create({
    username: 'operator',
    password: operatorPassword,
    role: UserRole.OPERATOR,
    company_id: company.id,
  });
  await userRepo.save(operatorUser);
  console.log(`✓ Created operator user: operator / operator123`);

  // 4. Create Assets
  const asset1 = assetRepo.create({
    company_id: company.id,
    name: 'Server A',
    model: 'Dell PowerEdge R750',
    serial_number: 'SN-11111',
    location_address: '123 Tech Lane, San Francisco, CA',
    location_lat: 37.7749,
    location_lng: -122.4194,
    qr_token: qrGenerator.generateToken(),
  });

  const asset2 = assetRepo.create({
    company_id: company.id,
    name: 'Core Router',
    model: 'Cisco ASR 1001-X',
    serial_number: 'SN-22222',
    location_address: '123 Tech Lane, San Francisco, CA',
    location_lat: 37.7749,
    location_lng: -122.4194,
    qr_token: qrGenerator.generateToken(),
  });

  const asset3 = assetRepo.create({
    company_id: company.id,
    name: 'Industrial A/C Unit',
    model: 'Carrier WeatherMaker',
    serial_number: 'SN-33333',
    location_address: '456 Business Blvd, San Jose, CA',
    location_lat: 37.3382,
    location_lng: -121.8863,
    qr_token: qrGenerator.generateToken(),
  });

  await assetRepo.save([asset1, asset2, asset3]);
  console.log(`✓ Created ${[asset1, asset2, asset3].length} assets`);

  // 5. Create Client
  const client = clientRepo.create({
    company_id: company.id,
    name: 'Alice Johnson',
    email: 'alice@example.com',
    phone: '555-0100',
  });
  await clientRepo.save(client);
  console.log(`✓ Created client: ${client.name}`);

  // 6. Create Technicians & Technician Users
  const techPassword = await bcrypt.hash('tech123', 10);
  const techData = [
    { name: 'Sarah Martinez', email: 'sarah.m@techcorp.com', phone: '555-0101' },
    { name: 'James Thompson', email: 'james.t@techcorp.com', phone: '555-0102' },
    { name: 'Emily Chen', email: 'emily.c@techcorp.com', phone: '555-0103' },
  ];

  const technicians: Technician[] = [];
  for (const data of techData) {
    const tech = technicianRepo.create({
      company_id: company.id,
      ...data,
    });
    const savedTech = await technicianRepo.save(tech);
    technicians.push(savedTech);

    const techUser = userRepo.create({
      username: data.email,
      password: techPassword,
      role: UserRole.TECHNICIAN,
      company_id: company.id,
      technician_id: savedTech.id,
    });
    await userRepo.save(techUser);
    console.log(`✓ Created technician: ${data.name} (${data.email})`);
  }

  // 7. Create Service Requests
  const requests = [
    serviceRequestRepo.create({
      company_id: company.id,
      asset_id: asset1.id,
      client_id: client.id,
      channel: ServiceRequestChannel.QR,
      type: ServiceRequestType.MAINTENANCE,
      description: 'Monthly server maintenance and dust cleaning.',
      status: ServiceRequestStatus.PENDING,
    }),
    serviceRequestRepo.create({
      company_id: company.id,
      asset_id: asset2.id,
      client_id: client.id,
      channel: ServiceRequestChannel.QR,
      type: ServiceRequestType.MALFUNCTION,
      description: 'Router frequently dropping connections during peak hours.',
      status: ServiceRequestStatus.ASSIGNED,
      technician_id: technicians[0].id,
      technician_notes: 'Initial diagnosis suggests overheating.',
    }),
    serviceRequestRepo.create({
      company_id: company.id,
      asset_id: asset3.id,
      client_id: client.id,
      channel: ServiceRequestChannel.MANUAL,
      type: ServiceRequestType.MAINTENANCE,
      description: 'Annual inspection for A/C unit.',
      status: ServiceRequestStatus.RESOLVED,
      technician_id: technicians[1].id,
      technician_notes: 'All filters replaced. System running efficiently.',
    }),
  ];

  await serviceRequestRepo.save(requests);
  console.log(`✓ Created ${requests.length} service requests`);

  // 8. Create a follow-up for the resolved A/C inspection (demonstrates the chain feature)
  const followUp = serviceRequestRepo.create({
    company_id: company.id,
    asset_id: asset3.id,
    client_id: client.id,
    channel: ServiceRequestChannel.MANUAL,
    type: ServiceRequestType.MAINTENANCE,
    description:
      'Follow-up visit: compressor belt shows early wear. Scheduling replacement before failure.',
    followup_reason:
      'Compressor belt showing early signs of wear during annual inspection.',
    parent_id: requests[2].id,
    status: ServiceRequestStatus.ASSIGNED,
    technician_id: technicians[1].id,
  });
  await serviceRequestRepo.save(followUp);
  console.log(`✓ Created follow-up service request (parent: ${requests[2].id})`);

  console.log('\n--- ✅ Seeding complete! ---');
  console.log(`Company ID: ${company.id}`);
  console.log(`Operator Login: operator / operator123`);
  console.log(`Tech Login: ${techData[0].email} / tech123`);
  console.log('----------------------------');

  await AppDataSource.destroy();
}

seed().catch((error) => {
  console.error('❌ Seeding failed:', error);
  process.exit(1);
});
