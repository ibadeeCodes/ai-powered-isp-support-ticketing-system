import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

/**
 * Query parameters for the agent customer lookup endpoint.
 *
 * Supports filtering by id (exact UUID match) or phone (partial, case-insensitive),
 * with standard page/limit pagination.
 */
export class AgentCustomerQueryDto {
  /** Exact customer UUID. Returns at most one result. */
  @IsOptional()
  @IsUUID(undefined, { message: 'id must be a valid UUID' })
  id?: string;

  /**
   * Partial phone number search (case-insensitive ILIKE).
   * Allows agents to type a partial number during a phone-in call.
   */
  @IsOptional()
  @IsString({ message: 'phone must be a string' })
  phone?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page must be an integer' })
  @Min(1, { message: 'page must be at least 1' })
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit must be an integer' })
  @Min(1, { message: 'limit must be at least 1' })
  @Max(100, { message: 'limit must be at most 100' })
  limit?: number = 20;
}

