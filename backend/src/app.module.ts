import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { typeOrmAsyncConfig } from './config/database.config';
import { TicketsModule } from './tickets/tickets.module';
import { CustomersModule } from './customers/customers.module';
import { AuthModule } from './auth/auth.module';
import { AiModule } from './ai/ai.module';
import { AgentTicketsModule } from './agent-tickets/agent-tickets.module';
import { TeamsModule } from './teams/teams.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync(typeOrmAsyncConfig),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const isTls = configService.get<string>('REDIS_TLS') === 'true';
        return {
          connection: {
            host: configService.get<string>('REDIS_HOST', 'localhost'),
            port: parseInt(configService.get<string>('REDIS_PORT', '6379'), 10),
            username: configService.get<string>('REDIS_USERNAME') || undefined,
            password: configService.get<string>('REDIS_PASSWORD') || undefined,
            ...(isTls ? { tls: {} } : {}),
          },
        };
      },
    }),
    CustomersModule,
    TicketsModule,
    AuthModule,
    AiModule,
    AgentTicketsModule,
    TeamsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
