import dotenv from 'dotenv';

// Tests use a SEPARATE database defined in .env.test
dotenv.config({ path: '.env.test', override: true });
process.env.NODE_ENV = 'test';
