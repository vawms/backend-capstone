import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

console.log('🔍 Environment Check:');
console.log('DATABASE_URL:', process.env.DATABASE_URL);
console.log('PORT:', process.env.PORT);
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('Current directory:', process.cwd());
console.log('---');

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Enable CORS (development-safe)
  app.enableCors({
    origin: true, // Reflects request origin, allows all
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 Backend running on http://0.0.0.0:${port}`);
}
bootstrap();
