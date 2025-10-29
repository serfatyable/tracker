/**
 * Environment Variable Validation
 *
 * This module validates that all required environment variables are present
 * at application startup. Failing fast with clear error messages prevents
 * runtime failures in production due to misconfiguration.
 *
 * SECURITY: This validation helps prevent partial deployments where missing
 * credentials could cause unexpected behavior or security issues.
 *
 * Usage:
 *   import { validateEnv } from '@/lib/config/validateEnv';
 *   validateEnv(); // Throws if any required vars are missing
 */

type EnvVar = {
  name: string;
  required: boolean;
  description: string;
  validIn?: ('development' | 'production' | 'test')[];
};

/**
 * Environment variable configuration
 *
 * Add new environment variables here to ensure they're validated at startup
 */
const ENV_VARS: EnvVar[] = [
  // Firebase Client Configuration (Public)
  {
    name: 'NEXT_PUBLIC_FIREBASE_API_KEY',
    required: true,
    description: 'Firebase Web API Key',
    validIn: ['development', 'production'],
  },
  {
    name: 'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
    required: true,
    description: 'Firebase Auth Domain',
    validIn: ['development', 'production'],
  },
  {
    name: 'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    required: true,
    description: 'Firebase Project ID',
    validIn: ['development', 'production'],
  },
  {
    name: 'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
    required: true,
    description: 'Firebase Storage Bucket',
    validIn: ['development', 'production'],
  },
  {
    name: 'NEXT_PUBLIC_FIREBASE_APP_ID',
    required: true,
    description: 'Firebase App ID',
    validIn: ['development', 'production'],
  },

  // Firebase Admin Configuration (Private - Server-side only)
  // Only required in production and for server-side operations
  {
    name: 'FIREBASE_PROJECT_ID',
    required: false, // Optional in development
    description: 'Firebase Admin SDK Project ID (server-side only)',
  },
  {
    name: 'FIREBASE_CLIENT_EMAIL',
    required: false, // Optional in development
    description: 'Firebase Admin SDK Service Account Email (server-side only)',
  },
  {
    name: 'FIREBASE_PRIVATE_KEY',
    required: false, // Optional in development
    description: 'Firebase Admin SDK Private Key (server-side only)',
  },

  // Application Configuration
  {
    name: 'NEXT_PUBLIC_APP_ENV',
    required: false,
    description: 'Application Environment (development, staging, production)',
  },
  {
    name: 'NEXT_PUBLIC_APP_URL',
    required: false,
    description: 'Application Base URL',
  },

  // Development Configuration
  {
    name: 'NEXT_PUBLIC_USE_FIREBASE_EMULATORS',
    required: false,
    description: 'Enable Firebase Emulators (development only)',
    validIn: ['development'],
  },

  // Rate Limiting Configuration (Private - Server-side only)
  {
    name: 'UPSTASH_REDIS_REST_URL',
    required: false, // Optional in development (rate limiting disabled if missing)
    description: 'Upstash Redis REST URL for rate limiting',
  },
  {
    name: 'UPSTASH_REDIS_REST_TOKEN',
    required: false, // Optional in development
    description: 'Upstash Redis REST Token for rate limiting',
  },

  // Error Tracking Configuration
  {
    name: 'NEXT_PUBLIC_SENTRY_DSN',
    required: false, // Optional in all environments (error tracking disabled if missing)
    description: 'Sentry DSN for error tracking',
  },
  {
    name: 'SENTRY_AUTH_TOKEN',
    required: false, // Only needed for source map uploads
    description: 'Sentry Auth Token for uploading source maps (optional)',
  },
];

/**
 * Validation error details for better debugging
 */
export type ValidationError = {
  varName: string;
  description: string;
  suggestion: string;
};

/**
 * Validation result
 */
export type ValidationResult = {
  valid: boolean;
  missingRequired: ValidationError[];
  missingOptional: string[];
  warnings: string[];
};

/**
 * Get current environment (development, production, test)
 */
function getCurrentEnv(): 'development' | 'production' | 'test' {
  if (process.env.NODE_ENV === 'test') return 'test';
  if (process.env.NODE_ENV === 'production') return 'production';
  return 'development';
}

/**
 * Check if a variable should be validated in the current environment
 */
function shouldValidate(envVar: EnvVar, currentEnv: string): boolean {
  if (!envVar.validIn) return true; // Validate in all environments if not specified
  return envVar.validIn.includes(currentEnv as 'development' | 'production' | 'test');
}

/**
 * Get helpful suggestion for missing environment variable
 */
function getSuggestion(varName: string): string {
  if (varName.startsWith('NEXT_PUBLIC_FIREBASE_')) {
    return 'Get from: Firebase Console → Project Settings → General → Your apps';
  }

  if (varName.startsWith('FIREBASE_')) {
    return 'Get from: Firebase Console → Project Settings → Service Accounts → Generate New Private Key';
  }

  if (varName.startsWith('UPSTASH_')) {
    return 'Sign up at https://upstash.com to get Redis credentials (or skip for development)';
  }

  if (varName.includes('SENTRY')) {
    return 'Sign up at https://sentry.io to get DSN (or skip for development)';
  }

  if (varName === 'NEXT_PUBLIC_APP_URL') {
    return 'Set to your application base URL (e.g., https://tracker.app or http://localhost:3000)';
  }

  return 'Add this variable to your .env.local file (see .env.example for template)';
}

/**
 * Validate environment variables without throwing
 *
 * @returns Validation result with details about missing/invalid variables
 */
export function validateEnvSafe(): ValidationResult {
  const currentEnv = getCurrentEnv();
  const missingRequired: ValidationError[] = [];
  const missingOptional: string[] = [];
  const warnings: string[] = [];

  // Validate each environment variable
  for (const envVar of ENV_VARS) {
    // Skip if not valid in current environment
    if (!shouldValidate(envVar, currentEnv)) {
      continue;
    }

    const value = process.env[envVar.name];
    const isMissing = !value || value.trim() === '';

    if (isMissing) {
      if (envVar.required) {
        missingRequired.push({
          varName: envVar.name,
          description: envVar.description,
          suggestion: getSuggestion(envVar.name),
        });
      } else {
        missingOptional.push(envVar.name);
      }
    }
  }

  // Production-specific validations
  if (currentEnv === 'production') {
    // In production, Firebase Admin SDK credentials should be present
    const hasAdminCreds =
      process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY;

    if (!hasAdminCreds) {
      warnings.push(
        'WARNING: Firebase Admin SDK credentials not found. Server-side operations may fail.'
      );
    }

    // In production, rate limiting should be configured
    const hasRateLimiting =
      process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!hasRateLimiting) {
      warnings.push(
        'WARNING: Upstash Redis credentials not found. Rate limiting will be disabled. ' +
        'This is a security risk in production!'
      );
    }

    // In production, error tracking should be configured
    if (!process.env.NEXT_PUBLIC_SENTRY_DSN) {
      warnings.push(
        'WARNING: Sentry DSN not found. Error tracking will be disabled. ' +
        'You will not be notified of production errors!'
      );
    }

    // In production, APP_URL should be set
    if (!process.env.NEXT_PUBLIC_APP_URL) {
      warnings.push(
        'WARNING: NEXT_PUBLIC_APP_URL not set. Calendar subscriptions and absolute URLs may not work correctly.'
      );
    }
  }

  // Development-specific warnings
  if (currentEnv === 'development') {
    const usingEmulators = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === 'true';
    const hasFirebaseConfig = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

    if (!usingEmulators && !hasFirebaseConfig) {
      warnings.push(
        'INFO: Neither Firebase credentials nor emulators are configured. ' +
        'Set NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true to use emulators, ' +
        'or add Firebase credentials to .env.local'
      );
    }
  }

  return {
    valid: missingRequired.length === 0,
    missingRequired,
    missingOptional,
    warnings,
  };
}

/**
 * Validate environment variables and throw if any required variables are missing
 *
 * Call this early in application startup (e.g., in firebase client initialization)
 * to fail fast with clear error messages.
 *
 * @throws {Error} If any required environment variables are missing
 *
 * @example
 * ```typescript
 * // In lib/firebase/client.ts
 * validateEnv(); // Throws if misconfigured
 * const app = initializeApp(firebaseConfig);
 * ```
 */
export function validateEnv(): void {
  const result = validateEnvSafe();

  // Print warnings (non-fatal)
  if (result.warnings.length > 0) {
    console.warn('\n⚠️  Environment Configuration Warnings:\n');
    result.warnings.forEach((warning) => console.warn(`  ${warning}`));
    console.warn('');
  }

  // Print optional missing vars (informational)
  if (result.missingOptional.length > 0 && getCurrentEnv() === 'development') {
    console.info('\nℹ️  Optional environment variables not set:');
    console.info(`  ${result.missingOptional.join(', ')}`);
    console.info('  These are optional. Set them if you need the corresponding features.\n');
  }

  // Throw if required variables are missing
  if (!result.valid) {
    const currentEnv = getCurrentEnv();
    console.error('\n❌ Environment Variable Validation Failed\n');
    console.error(`Environment: ${currentEnv}`);
    console.error('\nMissing required environment variables:\n');

    result.missingRequired.forEach((error) => {
      console.error(`  ${error.varName}`);
      console.error(`    Description: ${error.description}`);
      console.error(`    How to fix: ${error.suggestion}\n`);
    });

    console.error('Fix these issues and restart the application.');
    console.error('See .env.example for a template, or ENV_TEMPLATE.md for detailed instructions.\n');

    throw new Error(
      `Missing required environment variables: ${result.missingRequired.map((e) => e.varName).join(', ')}`
    );
  }
}

/**
 * Get a safe summary of environment configuration (for debugging)
 *
 * This function returns a summary of which environment variables are configured
 * WITHOUT exposing their actual values (for security).
 *
 * Useful for troubleshooting configuration issues in logs.
 */
export function getEnvSummary(): {
  environment: string;
  configured: string[];
  missing: string[];
  optional: string[];
} {
  const currentEnv = getCurrentEnv();
  const configured: string[] = [];
  const missing: string[] = [];
  const optional: string[] = [];

  for (const envVar of ENV_VARS) {
    if (!shouldValidate(envVar, currentEnv)) continue;

    const value = process.env[envVar.name];
    const isConfigured = value && value.trim() !== '';

    if (isConfigured) {
      configured.push(envVar.name);
    } else {
      if (envVar.required) {
        missing.push(envVar.name);
      } else {
        optional.push(envVar.name);
      }
    }
  }

  return {
    environment: currentEnv,
    configured,
    missing,
    optional,
  };
}
