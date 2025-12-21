// How to create and apply the config
import { Module } from '@nestjs/common';
import { ConfigService } from './config.service';
import { validateConfig } from './config';
import { config } from 'dotenv';

config();

@Module({
  // Services & classes this module create
  providers: [
    {
      // When someone asks for this
      provide: ConfigService,
      // This is provided
      useValue: new ConfigService(
        validateConfig(process.env as Record<string, unknown>),
      ),
    },
  ],
  // What other modules can use from this modue
  exports: [ConfigService],
})
// Other modules can import this class and use ConfigService so it is reused instead of created everywhere
export class AppConfigModule {}
