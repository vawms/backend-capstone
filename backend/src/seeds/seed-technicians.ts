import { AppDataSource } from '../ormconfig';
import { Company } from '../entities/company.entity';
import { Technician } from '../entities/technician.entity';

async function seedTechnicians() {
  await AppDataSource.initialize();

  const companyRepo = AppDataSource.getRepository(Company);
  const technicianRepo = AppDataSource.getRepository(Technician);

  console.log('Seeding technicians...');

  // Get the first company (or create one if none exists)
  let company = await companyRepo.findOne({ where: {} });
  
  if (!company) {
    console.log('No company found. Creating one first...');
    company = companyRepo.create({
      name: 'TechCorp',
      logo_url: 'https://example.com/logo.png',
      primary_color: '#0066CC',
    });
    await companyRepo.save(company);
    console.log(`✓ Created company: ${company.id}`);
  } else {
    console.log(`✓ Using existing company: ${company.id}`);
  }

  // Create 5 technicians
  const technicians = [
    {
      company_id: company.id,
      name: 'Sarah Martinez',
      email: 'sarah.martinez@techcorp.com',
      phone: '+1-555-0101',
    },
    {
      company_id: company.id,
      name: 'James Thompson',
      email: 'james.thompson@techcorp.com',
      phone: '+1-555-0102',
    },
    {
      company_id: company.id,
      name: 'Emily Chen',
      email: 'emily.chen@techcorp.com',
      phone: '+1-555-0103',
    },
    {
      company_id: company.id,
      name: 'Michael Rodriguez',
      email: 'michael.rodriguez@techcorp.com',
      phone: '+1-555-0104',
    },
    {
      company_id: company.id,
      name: 'Lisa Anderson',
      email: 'lisa.anderson@techcorp.com',
      phone: '+1-555-0105',
    },
  ];

  const createdTechnicians: Technician[] = [];
  for (const techData of technicians) {
    const technician = technicianRepo.create(techData);
    const saved = await technicianRepo.save(technician);
    createdTechnicians.push(saved);
    console.log(`✓ Created technician: ${saved.name} (${saved.id})`);
  }

  console.log('\n✓ Technician seeding complete!');
  console.log(`Total technicians created: ${createdTechnicians.length}`);
  console.log('\nTechnician IDs:');
  createdTechnicians.forEach((tech) => {
    console.log(`  - ${tech.name}: ${tech.id}`);
  });

  await AppDataSource.destroy();
}

seedTechnicians().catch((error) => {
  console.error('Technician seeding failed:', error);
  process.exit(1);
});