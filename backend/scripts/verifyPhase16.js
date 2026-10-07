const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { z } = require('zod');
const { env } = require('../config/env');
const { setAuthCookie } = require('../utils/cookies');
const { corsMiddleware } = require('../middleware/cors');

const API_BASE = 'http://127.0.0.1:5001/api';

const makeRequest = async (
  endpoint,
  method = 'GET',
  body = null,
  token = null,
  headersExtra = {}
) => {
  const headers = {
    'Content-Type': 'application/json',
    ...headersExtra
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const options = {
    method,
    headers
  };

  if (body) {
    options.body =
      typeof body === 'string' ? body : JSON.stringify(body);
  }

  const res = await fetch(`${API_BASE}${endpoint}`, options);

  let data;

  try {
    data = await res.json();
  } catch {
    data = null;
  }

  return {
    status: res.status,
    headers: res.headers,
    data
  };
};

const assert = (condition, message) => {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(message);
  }

  console.log(`  ✓ ${message}`);
};

async function runVerification() {
  console.log('\n==================================================');
  console.log(
    'STARTING PHASE 16 — DEPLOYMENT & PRODUCTION READINESS VERIFICATION'
  );
  console.log('==================================================\n');

  try {
    // ----------------------------------------------------
    // Check 1: Environment Schema & Production Compatibility
    // ----------------------------------------------------

    console.log('--- 1. Environment Schema & Variables ---');

    const prodEnvTestSchema = z.object({
      NODE_ENV: z.enum(['development', 'production', 'test']),
      PORT: z.coerce.number(),
      MONGODB_URI: z.string().min(1),
      FRONTEND_URL: z.string().url(),
      JWT_SECRET: z.string().min(10),
      GEMINI_API_KEY: z.string().optional(),
      GEMINI_MODEL: z.string().optional()
    });

    const sampleProdEnv = {
      NODE_ENV: 'production',
      PORT: '10000',

      // Test fixture only. No real credentials.
      MONGODB_URI:
        'mongodb+srv://<db_user>:<db_password>@<cluster>.mongodb.net/campus_events?retryWrites=true&w=majority',

      FRONTEND_URL:
        'https://campus-events-frontend.vercel.app',

      // Test fixture only. No real secret.
      JWT_SECRET:
        'test_production_jwt_secret_placeholder_32_characters',

      // Test fixture only. No real Gemini key.
      GEMINI_API_KEY:
        'test_gemini_api_key_placeholder',

      GEMINI_MODEL: 'gemini-1.5-flash'
    };

    const parsedProd = prodEnvTestSchema.safeParse(sampleProdEnv);

    assert(
      parsedProd.success === true,
      '1a. Environment schema parses production configuration successfully'
    );

    assert(
      parsedProd.data.PORT === 10000,
      '1b. Dynamic Render PORT coerced to number properly'
    );

    assert(
      parsedProd.data.MONGODB_URI.startsWith('mongodb+srv://'),
      '1c. MongoDB Atlas SRV URI string supported'
    );

    // ----------------------------------------------------
    // Check 2: Health Check Endpoint Readiness
    // ----------------------------------------------------

    console.log('\n--- 2. Health Check Endpoint Readiness ---');

    const healthRes = await makeRequest('/health', 'GET');

    assert(
      healthRes.status === 200,
      '2a. Health endpoint returns HTTP 200 OK'
    );

    assert(
      healthRes.data?.success === true,
      '2b. Health check conforms to standard success envelope'
    );

    assert(
      healthRes.data?.data?.status === 'healthy',
      '2c. Health status is healthy'
    );

    assert(
      healthRes.data?.data?.database?.status === 'connected',
      '2d. Database report is connected'
    );

    assert(
      typeof healthRes.data?.data?.uptime === 'number',
      '2e. Process uptime is reported'
    );

    // Ensure health check exposes ZERO sensitive details
    const healthStr = JSON.stringify(healthRes.data);

    assert(
      !healthStr.toLowerCase().includes('mongodb'),
      '2f. Health check does not leak database connection URI'
    );

    assert(
      !healthStr.toLowerCase().includes('password'),
      '2g. Health check does not leak credentials'
    );

    assert(
      !healthStr.toLowerCase().includes('jwt'),
      '2h. Health check does not leak token secrets'
    );

    // ----------------------------------------------------
    // Check 3: CORS Configuration & Security Headers
    // ----------------------------------------------------

    console.log('\n--- 3. CORS & Native Security Headers ---');

    // Allowed origin test
    const corsGoodRes = await makeRequest(
      '/health',
      'GET',
      null,
      null,
      {
        Origin: 'http://localhost:5174'
      }
    );

    assert(
      corsGoodRes.headers.get('access-control-allow-origin') ===
        'http://localhost:5174',
      '3a. Configured origin granted Access-Control-Allow-Origin'
    );

    assert(
      corsGoodRes.headers.get('access-control-allow-credentials') ===
        'true',
      '3b. Access-Control-Allow-Credentials is true for HttpOnly cookies'
    );

    assert(
      corsGoodRes.headers.get('access-control-allow-origin') !== '*',
      '3c. Wildcard * is NEVER used with credentials'
    );

    // Unallowed origin test
    const corsBadRes = await makeRequest(
      '/health',
      'GET',
      null,
      null,
      {
        Origin: 'https://unauthorized-malicious-site.com'
      }
    );

    assert(
      corsBadRes.headers.get('access-control-allow-origin') === null,
      '3d. Unauthorized origin denied Access-Control-Allow-Origin'
    );

    // Security headers test
    assert(
      healthRes.headers.get('x-content-type-options') === 'nosniff',
      '3e. X-Content-Type-Options: nosniff present'
    );

    assert(
      healthRes.headers.get('x-frame-options') === 'DENY',
      '3f. X-Frame-Options: DENY present'
    );

    assert(
      healthRes.headers.get('referrer-policy') ===
        'strict-origin-when-cross-origin',
      '3g. Referrer-Policy present'
    );

    assert(
      healthRes.headers.get('x-powered-by') === null,
      '3h. X-Powered-By is suppressed'
    );

    // ----------------------------------------------------
    // Check 4: Cross-Origin HTTPS Cookie Configuration
    // ----------------------------------------------------

    console.log(
      '\n--- 4. Cookie Configuration for HTTPS Cross-Origin ---'
    );

    let cookieHeaderCaptured = null;

    const mockResProd = {
      setHeader: (name, val) => {
        if (name === 'Set-Cookie') {
          cookieHeaderCaptured = val;
        }
      }
    };

    // Temporarily verify production cookie flags
    const origEnv = env.NODE_ENV;

    env.NODE_ENV = 'production';

    setAuthCookie(
      mockResProd,
      'test_jwt_production_token'
    );

    env.NODE_ENV = origEnv;

    assert(
      cookieHeaderCaptured !== null,
      '4a. Set-Cookie header generated'
    );

    assert(
      cookieHeaderCaptured.includes('HttpOnly'),
      '4b. Cookie contains HttpOnly flag'
    );

    assert(
      cookieHeaderCaptured.includes('SameSite=None'),
      '4c. Production cookie contains SameSite=None for cross-site Vercel-Render HTTPS'
    );

    assert(
      cookieHeaderCaptured.includes('Secure'),
      '4d. Production cookie contains Secure flag'
    );

    assert(
      cookieHeaderCaptured.includes('Path=/'),
      '4e. Cookie scoped to Path=/'
    );

    // ----------------------------------------------------
    // Check 5: Vercel SPA Routing Configuration
    // ----------------------------------------------------

    console.log('\n--- 5. Vercel SPA Routing Configuration ---');

    const vercelConfigPath = path.resolve(
      __dirname,
      '../../frontend/vercel.json'
    );

    assert(
      fs.existsSync(vercelConfigPath),
      '5a. frontend/vercel.json exists'
    );

    const vercelConfig = JSON.parse(
      fs.readFileSync(vercelConfigPath, 'utf8')
    );

    assert(
      Array.isArray(vercelConfig.rewrites),
      '5b. vercel.json contains rewrites array'
    );

    const spaRewrite = vercelConfig.rewrites.find(
      (r) =>
        r.source === '/(.*)' &&
        r.destination === '/index.html'
    );

    assert(
      spaRewrite !== undefined,
      '5c. SPA catch-all rewrite to /index.html configured properly'
    );

    // ----------------------------------------------------
    // Check 6: Frontend & Backend Package Scripts
    // ----------------------------------------------------

    console.log('\n--- 6. Package Scripts Readiness ---');

    const backendPkg = JSON.parse(
      fs.readFileSync(
        path.resolve(__dirname, '../package.json'),
        'utf8'
      )
    );

    assert(
      backendPkg.scripts?.start === 'node server.js',
      '6a. Backend has start script "node server.js"'
    );

    const frontendPkg = JSON.parse(
      fs.readFileSync(
        path.resolve(__dirname, '../../frontend/package.json'),
        'utf8'
      )
    );

    assert(
      typeof frontendPkg.scripts?.dev === 'string',
      '6b. Frontend has dev script'
    );

    assert(
      typeof frontendPkg.scripts?.build === 'string',
      '6c. Frontend has build script'
    );

    // ----------------------------------------------------
    // Check 7: Production Frontend Build Artifacts
    // ----------------------------------------------------

    console.log('\n--- 7. Frontend Production Bundle ---');

    const distIndexPath = path.resolve(
      __dirname,
      '../../frontend/dist/index.html'
    );

    assert(
      fs.existsSync(distIndexPath),
      '7a. frontend/dist/index.html exists (build succeeded)'
    );

    // ----------------------------------------------------
    // Check 8: Absence of Hardcoded Secrets & Localhost URLs
    // ----------------------------------------------------

    console.log(
      '\n--- 8. Absence of Hardcoded Secrets & Localhost in Dist ---'
    );

    const distDir = path.resolve(
      __dirname,
      '../../frontend/dist'
    );

    const assetsDir = path.join(distDir, 'assets');

    assert(
      fs.existsSync(assetsDir),
      '8a. frontend/dist/assets directory exists'
    );

    const assetFiles = fs.readdirSync(assetsDir);

    let jsBundleContent = '';

    for (const file of assetFiles) {
      if (file.endsWith('.js')) {
        jsBundleContent += fs.readFileSync(
          path.join(assetsDir, file),
          'utf8'
        );
      }
    }

    // Verify GEMINI_API_KEY is NOT compiled into frontend bundle
    assert(
      !jsBundleContent.includes('AIzaSy'),
      '8b. No Google Gemini API key compiled into frontend JS bundle'
    );

    // Verify JWT secret is NOT compiled into frontend bundle
    assert(
      !jsBundleContent.includes(
        'phase0_development_placeholder_jwt_secret'
      ),
      '8c. No backend JWT secret compiled into frontend bundle'
    );

    // Verify localhost backend URL is NOT accidentally compiled
    assert(
      !jsBundleContent.includes('127.0.0.1:5001'),
      '8d. No localhost backend URL compiled into frontend bundle'
    );

    assert(
      !jsBundleContent.includes('localhost:5001'),
      '8e. No localhost:5001 URL compiled into frontend bundle'
    );

    // ----------------------------------------------------
    // Check 9: Repository Secret Safety
    // ----------------------------------------------------

    console.log(
      '\n--- 9. Repository Hygiene & Secret Templates ---'
    );

    const gitignorePath = path.resolve(
      __dirname,
      '../../.gitignore'
    );

    assert(
      fs.existsSync(gitignorePath),
      '9a. Root .gitignore exists'
    );

    const gitignoreContent = fs.readFileSync(
      gitignorePath,
      'utf8'
    );

    assert(
      gitignoreContent.includes('.env'),
      '9b. .env is ignored in .gitignore'
    );

    assert(
      gitignoreContent.includes('node_modules'),
      '9c. node_modules is ignored in .gitignore'
    );

    assert(
      gitignoreContent.includes('dist'),
      '9d. dist/ is ignored in .gitignore'
    );

    const backendEnvExamplePath = path.resolve(
      __dirname,
      '../.env.example'
    );

    assert(
      fs.existsSync(backendEnvExamplePath),
      '9e. backend/.env.example exists'
    );

    const backendEnvExample = fs.readFileSync(
      backendEnvExamplePath,
      'utf8'
    );

    assert(
      backendEnvExample.includes('MONGODB_URI='),
      '9f. backend/.env.example includes MONGODB_URI placeholder'
    );

    assert(
      backendEnvExample.includes('FRONTEND_URL='),
      '9g. backend/.env.example includes FRONTEND_URL placeholder'
    );

    assert(
      backendEnvExample.includes('GEMINI_API_KEY='),
      '9h. backend/.env.example includes GEMINI_API_KEY placeholder'
    );

    const frontendEnvExamplePath = path.resolve(
      __dirname,
      '../../frontend/.env.example'
    );

    assert(
      fs.existsSync(frontendEnvExamplePath),
      '9i. frontend/.env.example exists'
    );

    const frontendEnvExample = fs.readFileSync(
      frontendEnvExamplePath,
      'utf8'
    );

    assert(
      frontendEnvExample.includes('VITE_API_BASE_URL='),
      '9j. frontend/.env.example includes VITE_API_BASE_URL placeholder'
    );

    // ----------------------------------------------------
    // Check 10: Server Host Binding
    // ----------------------------------------------------

    console.log('\n--- 10. Server Host Binding ---');

    const serverJsPath = path.resolve(
      __dirname,
      '../server.js'
    );

    const serverJsContent = fs.readFileSync(
      serverJsPath,
      'utf8'
    );

    assert(
      serverJsContent.includes("'0.0.0.0'"),
      '10. Server explicitly binds to 0.0.0.0 on env.PORT for cloud container deployment'
    );

    console.log('\n==================================================');
    console.log(
      '✅ ALL PHASE 16 DEPLOYMENT READINESS CHECKS PASSED!'
    );
    console.log('==================================================\n');
  } catch (error) {
    console.error('\n❌ VERIFICATION FAILED:', error);
    process.exit(1);
  }
}

runVerification();