/**
 * Create a new data center and fetch it back.
 *
 * Usage:
 *   BASE_URL=http://localhost:3000 API_KEY=lm_... npx tsx examples/create-data-center.ts
 */
import { DataCenterClient, ConflictError } from '../src/index.js';

const client = new DataCenterClient({
  baseUrl: process.env.BASE_URL || 'http://localhost:3000',
  apiKey: process.env.API_KEY!,
});

async function main() {
  // Create a data center
  let dc;
  try {
    dc = await client.dataCenters.create({
      data_center_name: 'Example DC Amsterdam 2',
      data_center_type: 'Co-Location',
      operator_name: 'Example Corp',
      country: 'NL',
      city: 'Amsterdam',
      latitude: 52.3676,
      longitude: 4.9041,
      total_power_capacity_kw: 10000,
      floor_space_sqm: 5000,
      year_built: 2020,
    });
    console.log('Created data center:', dc.id);
  } catch (err) {
    if (err instanceof ConflictError) {
      console.log('Data center already exists:', err.details);
      return;
    }
    throw err;
  }

  // Fetch it back with latest reports and estimation
  const detail = await client.dataCenters.get(dc.id);
  console.log('\nData center detail:');
  console.log(`  Name: ${detail.data_center_name}`);
  console.log(`  Type: ${detail.data_center_type}`);
  console.log(`  Reports: ${detail.latest_reports.length}`);
  console.log(`  Estimation: ${detail.latest_estimation ? 'yes' : 'none'}`);

  // Update it
  const updated = await client.dataCenters.update(dc.id, {
    design_pue: 1.3,
    tier_level: 3,
  });
  console.log(`\nUpdated PUE: ${updated.design_pue}, Tier: ${updated.tier_level}`);
}

main().catch(console.error);
