import { Controller, ForbiddenException, Get, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { Customer } from './entities/customer.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.types';
import { UserRole } from '../auth/entities/user.entity';

@Controller('customers')
@UseGuards(JwtAuthGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get('default')
  getDefaultCustomer(@CurrentUser() user: AuthenticatedUser): Promise<Customer> {
    if (user.role === UserRole.CUSTOMER && user.customerId) {
      return this.customersService.findById(user.customerId);
    }
    return this.customersService.getDefaultCustomer();
  }

  @Get(':id')
  findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Customer> {
    if (user.role === UserRole.CUSTOMER && user.customerId !== id) {
      throw new ForbiddenException('Customers can only view their own profile');
    }
    return this.customersService.findById(id);
  }
}

