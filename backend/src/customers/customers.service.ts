import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from './entities/customer.entity';

export const DEFAULT_DEMO_CUSTOMER_ID = '11111111-1111-1111-1111-111111111111';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
  ) {}

  async findById(id: string): Promise<Customer> {
    const customer = await this.customerRepository.findOne({ where: { id } });
    if (!customer) {
      throw new NotFoundException(`Customer with ID "${id}" not found`);
    }
    return customer;
  }

  async findByPhone(phone: string): Promise<Customer | null> {
    return this.customerRepository.findOne({ where: { phone } });
  }

  async getDefaultCustomer(): Promise<Customer> {
    let customer = await this.customerRepository.findOne({
      where: { id: DEFAULT_DEMO_CUSTOMER_ID },
    });

    if (!customer) {
      customer = this.customerRepository.create({
        id: DEFAULT_DEMO_CUSTOMER_ID,
        name: 'Jane Doe',
        email: 'jane.doe@example.com',
        phone: '+1-555-0199',
      });
      await this.customerRepository.save(customer);
    }

    return customer;
  }
}

