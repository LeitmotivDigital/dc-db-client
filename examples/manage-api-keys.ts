/**
 * Manage API keys (requires an admin key).
 *
 * Usage:
 *   BASE_URL=http://localhost:3000 API_KEY=lm_admin_key... npx tsx examples/manage-api-keys.ts
 */
import { DataCenterClient } from '../src/index.js';

const client = new DataCenterClient({
  baseUrl: process.env.BASE_URL || 'http://localhost:3000',
  apiKey: process.env.API_KEY!,
});

async function main() {
  // Create a new API key
  const newKey = await client.apiKeys.create({
    organization_name: 'Example Research Institute',
    contact_email: 'admin@example.org',
    description: 'Used for automated EED data submission',
    expires_at: '2027-01-01T00:00:00Z',
  });

  console.log('New API key created:');
  console.log(`  ID: ${newKey.id}`);
  console.log(`  Key: ${newKey.key}`);
  console.log(`  Prefix: ${newKey.key_prefix}`);
  console.log(`  Organization: ${newKey.organization_name}`);
  console.log();
  console.log('  IMPORTANT: Save the key above — it cannot be retrieved again!');

  // List all keys
  const keys = await client.apiKeys.list();
  console.log(`\nTotal API keys: ${keys.length}`);
  for (const key of keys) {
    console.log(`  ${key.key_prefix} — ${key.organization_name} (active: ${key.active})`);
  }

  // Deactivate the key we just created
  await client.apiKeys.delete(newKey.id);
  console.log(`\nDeactivated key ${newKey.key_prefix}`);
}

main().catch(console.error);
