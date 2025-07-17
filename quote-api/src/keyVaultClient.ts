import { DefaultAzureCredential } from "@azure/identity";
import { SecretClient } from "@azure/keyvault-secrets";

// Environment variables for Key Vault configuration
const KEY_VAULT_URL = process.env.AZURE_KEY_VAULT_URL || process.env.KEY_VAULT_URL;
const REDIS_SECRET_NAME = process.env.REDIS_SECRET_NAME || "redis-connection-string";

// Use DefaultAzureCredential for managed identity authentication
const credential = new DefaultAzureCredential();

let secretClient: SecretClient | null = null;
let redisConnectionString: string | null = null;

/**
 * Initialize the Key Vault client
 */
function initializeKeyVaultClient(): SecretClient {
  if (!KEY_VAULT_URL) {
    throw new Error("AZURE_KEY_VAULT_URL or KEY_VAULT_URL environment variable is required");
  }

  if (!secretClient) {
    secretClient = new SecretClient(KEY_VAULT_URL, credential);
    console.log(`Key Vault client initialized for: ${KEY_VAULT_URL}`);
  }

  return secretClient;
}

/**
 * Get Redis connection string from Key Vault
 * Uses caching to avoid multiple calls to Key Vault
 */
export async function getRedisConnectionString(): Promise<string> {
  // Return cached value if available
  if (redisConnectionString) {
    return redisConnectionString;
  }

  try {
    const client = initializeKeyVaultClient();
    
    console.log(`Retrieving Redis connection string from Key Vault secret: ${REDIS_SECRET_NAME}`);
    const secret = await client.getSecret(REDIS_SECRET_NAME);
    
    if (!secret.value) {
      throw new Error(`Secret ${REDIS_SECRET_NAME} is empty or not found`);
    }

    // Cache the connection string
    redisConnectionString = secret.value;
    console.log("Redis connection string retrieved successfully from Key Vault");
    
    return secret.value;
  } catch (error) {
    console.error("Failed to retrieve Redis connection string from Key Vault:", error);
    
    // Fallback to environment variable for local development
    const fallback = process.env.REDIS_CONNECTION_STRING;
    if (fallback) {
      console.warn("Using fallback Redis connection string from environment variable");
      redisConnectionString = fallback;
      return fallback;
    }
    
    // Default fallback for local development
    const defaultRedis = "redis://localhost:6379";
    console.warn("Using default Redis connection string for local development");
    redisConnectionString = defaultRedis;
    return defaultRedis;
  }
}

/**
 * Clear cached connection string (useful for testing or credential refresh)
 */
export function clearConnectionStringCache(): void {
  redisConnectionString = null;
  console.log("Redis connection string cache cleared");
}

/**
 * Test Key Vault connectivity
 */
export async function testKeyVaultConnectivity(): Promise<boolean> {
  try {
    const client = initializeKeyVaultClient();
    
    // Try to list secret properties to test connectivity
    const secretsIterator = client.listPropertiesOfSecrets();
    const firstSecret = await secretsIterator.next();
    
    console.log("Key Vault connectivity test successful");
    return true;
  } catch (error) {
    console.error("Key Vault connectivity test failed:", error);
    return false;
  }
} 