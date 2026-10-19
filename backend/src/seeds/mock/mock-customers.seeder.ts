import { Seeder } from 'typeorm-extension';
import { DataSource } from 'typeorm';
import { faker } from '@faker-js/faker';
import { Customer } from '../../customers/entities/customer.entity';

const DEMO_CUSTOMERS = [
  { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', name: 'Fatima Malik', email: 'fatima.malik@example.com', phone: '+92-300-1234567' },
  { id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', name: 'Ahmed Raza', email: 'ahmed.raza@example.com', phone: '+92-321-7654321' },
  { id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', name: 'Sara Khan', email: 'sara.khan@example.com', phone: '+92-333-9876543' },
  { id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', name: 'Omar Sheikh', email: 'omar.sheikh@example.com', phone: '+92-311-5551234' },
  { id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', name: 'Ayesha Siddiqui', email: 'ayesha.siddiqui@example.com', phone: '+92-345-1112233' },
  { id: 'ffffffff-ffff-4fff-8fff-ffffffffffff', name: 'Bilal Hassan', email: 'bilal.hassan@example.com', phone: '+92-322-4445566' },
  { id: 'a1b2c3d4-e5f6-4a1b-8c3d-a1b2c3d4e5f6', name: 'Zara Hussain', email: 'zara.hussain@example.com', phone: '+92-312-6667788' },
  { id: 'b2c3d4e5-f6a1-4b2c-8d4e-b2c3d4e5f6a1', name: 'Usman Tariq', email: 'usman.tariq@example.com', phone: '+92-300-9990011' },
  { id: 'c3d4e5f6-a1b2-4c3d-8e5f-c3d4e5f6a1b2', name: 'Hina Akhtar', email: 'hina.akhtar@example.com', phone: '+92-334-2223344' },
];

export default class MockCustomersSeeder implements Seeder {
  public async run(dataSource: DataSource): Promise<void> {
    const repo = dataSource.getRepository(Customer);

    // Upsert fixed demo customers for stable dev UI testing
    await repo.upsert(DEMO_CUSTOMERS, ['email']);

    // Generate 5 additional randomized mock customers using @faker-js/faker
    const randomCustomers = Array.from({ length: 5 }).map(() => ({
      name: faker.person.fullName(),
      email: faker.internet.email().toLowerCase(),
      phone: faker.phone.number({ style: 'international' }),
    }));

    await repo.upsert(randomCustomers, ['email']);
  }
}

