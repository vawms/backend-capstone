import { AppDataSource } from '../ormconfig';
import { Company } from '../entities/company.entity';
import { Asset } from '../entities/asset.entity';
import { Client } from '../entities/client.entity';
import { QrTokenGenerator } from '../common/utils/qr-token.generator';

async function seed() {
  await AppDataSource.initialize();

  const companyRepo = AppDataSource.getRepository(Company);
  const assetRepo = AppDataSource.getRepository(Asset);
  const clientRepo = AppDataSource.getRepository(Client);
  const qrGenerator = new QrTokenGenerator();

  console.log('Seeding database...');

  // Create company
  const company = companyRepo.create({
    name: 'TechCorp',
    logo_url: 'https://example.com/logo.png',
    primary_color: '#0066CC',
  });
  await companyRepo.save(company);
  console.log(`✓ Created company: ${company.id}`);

  // Create assets
  const asset1 = assetRepo.create({
    company_id: company.id,
    name: 'Server A',
    model: 'Dell PowerEdge R750',
    serial_number: 'SN-12345-67890',
    location_address: '123 Tech Lane, San Francisco, CA',
    location_lat: 37.7749,
    location_lng: -122.4194,
    qr_token: qrGenerator.generateToken(),
  });

  const asset2 = assetRepo.create({
    company_id: company.id,
    name: 'Printer B',
    model: 'HP LaserJet Pro',
    serial_number: 'SN-99999-88888',
    location_address: '456 Innovation Ave, San Francisco, CA',
    location_lat: 37.7849,
    location_lng: -122.4294,
    qr_token: qrGenerator.generateToken(),
  });

  await assetRepo.save([asset1, asset2]);
  console.log(`✓ Created assets: ${asset1.id}, ${asset2.id}`);

  // Create client
  const client = clientRepo.create({
    company_id: company.id,
    name: 'John Smith',
    email: 'john@example.com',
    phone: '555-1234',
  });
  await clientRepo.save(client);
  console.log(`✓ Created client: ${client.id}`);

  console.log('\n✓ Seeding complete!');
  console.log(`Company ID: ${company.id}`);
  console.log(`Asset 1 QR Token: ${asset1.qr_token}`);
  console.log(`Asset 2 QR Token: ${asset2.qr_token}`);

  await AppDataSource.destroy();
}

seed().catch((error) => {
  console.error('Seeding failed:', error);
  process.exit(1);
});
