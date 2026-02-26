import { defineConfig } from 'prisma/config';
import 'dotenv/config';

// @ts-ignore - earlyAccess is valid at runtime in Prisma 7
export default defineConfig({
  earlyAccess: true,
  migrate: {
    adapter: async () => {
      const { PrismaPg } = await import('@prisma/adapter-pg');
      const { Pool } = await import('pg');
      const pool = new Pool({ connectionString: process.env.DATABASE_URL });
      return new PrismaPg(pool);
    },
  },
  datasource: {
    url: process.env.DATABASE_URL!,
  },
});