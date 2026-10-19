import { Seeder } from 'typeorm-extension';
import { DataSource } from 'typeorm';
import { Customer } from '../../customers/entities/customer.entity';

export const JANE_DOE_CUSTOMER_ID = '11111111-1111-1111-1111-111111111111';

export default class CustomersSeeder implements Seeder {
  public async run(dataSource: DataSource): Promise<void> {
    const repo = dataSource.getRepository(Customer);

    // Idempotent upsert by 'email' conflict target
    await repo.upsert(
      [
        {
          id: JANE_DOE_CUSTOMER_ID,
          name: 'Jane Doe',
          email: 'jane.doe@example.com',
          phone: '+1-555-0199',
        },
      ],
      ['email'],
    );
  }
}

