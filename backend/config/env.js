const fs = require('fs');
const path = require('path');
const { z } = require('zod');

// Safely load .env file if it exists using Node's native process.loadEnvFile()
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath) && typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile(envPath);
  } catch (err) {
    console.warn(`[Env] Note: Could not load .env file directly: ${err.message}`);
  }
}

// Zod schema for Phase 0 environment variables
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(5001),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required').default('mongodb://127.0.0.1:27017/campus_events'),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  JWT_SECRET: z.string().default('phase0_development_placeholder_jwt_secret_min32chars'),
  GEMINI_API_KEY: z.string().optional().default(''),
  GEMINI_MODEL: z.string().optional().default('gemini-1.5-flash'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('[Env] Invalid environment configuration:');
  console.error(parsed.error.format());
  process.exit(1);
}

module.exports = {
  env: parsed.data,
};
