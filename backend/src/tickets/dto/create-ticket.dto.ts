import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateTicketDto {
  @IsString()
  @IsNotEmpty({ message: 'Subject is required' })
  @MaxLength(255, { message: 'Subject must be less than 255 characters' })
  subject: string;

  @IsString()
  @IsNotEmpty({ message: 'Description is required' })
  description: string;

  // @IsUUID('4', { message: 'Customer ID must be a valid UUID' })
  @IsOptional()
  customerId?: string;
}
