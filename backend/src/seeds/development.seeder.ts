import { Seeder, runSeeder } from 'typeorm-extension';
import { DataSource } from 'typeorm';

// Baseline Mandatory Essential System Data
import TeamsSeeder from './baseline/teams.seeder';
import CustomersSeeder from './baseline/customers.seeder';
import UsersSeeder from './baseline/users.seeder';

// Mock Development Test Data
import MockCustomersSeeder from './mock/mock-customers.seeder';
import MockAgentsSeeder from './mock/mock-agents.seeder';

export default class DevelopmentSeeder implements Seeder {
  public async run(dataSource: DataSource): Promise<void> {
    console.log('🌱 Executing DevelopmentSeeder...');

    // 1. Mandatory Baseline Essential System Data
    console.log('  → Seeding Support Teams...');
    await runSeeder(dataSource, TeamsSeeder);

    console.log('  → Seeding Baseline Customer...');
    await runSeeder(dataSource, CustomersSeeder);

    console.log('  → Seeding Baseline Users...');
    await runSeeder(dataSource, UsersSeeder);

    // 2. Development Mock Test Data
    console.log('  → Seeding Mock Customers...');
    await runSeeder(dataSource, MockCustomersSeeder);

    console.log('  → Seeding Mock Agents across Support Teams...');
    await runSeeder(dataSource, MockAgentsSeeder);

    console.log('✅ DevelopmentSeeder execution complete!');
  }
}

