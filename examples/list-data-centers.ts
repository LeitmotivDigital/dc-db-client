/**
 * List data centers with filtering and pagination.
 *
 * Usage:
 *   BASE_URL=http://localhost:3000 API_KEY=lm_... npx tsx examples/list-data-centers.ts
 */
import { DataCenterClient } from '../src/index.js';

const client = new DataCenterClient({
  baseUrl: process.env.BASE_URL || 'http://localhost:3000',
  apiKey: process.env.API_KEY!,
});

async function main() {
  // List data centers in the Netherlands
  const result = await client.dataCenters.list({
    country: 'NL',
    per_page: 10,
  });

  console.log(`Found ${result.pagination.total} data centers in NL\n`);

  for (const dc of result.data) {
    console.log(`  ${dc.data_center_name} (${dc.operator_name ?? 'unknown operator'})`);
    console.log(`    Type: ${dc.data_center_type ?? 'N/A'} | Power: ${dc.total_power_capacity_kw ?? 'N/A'} kW`);
    console.log();
  }

  // Paginate through all results
  if (result.hasNextPage) {
    console.log(`Page ${result.pagination.page} of ${result.pagination.total_pages}`);
    console.log('Fetching next page...\n');

    const page2 = await client.dataCenters.list({
      country: 'NL',
      per_page: 10,
      page: 2,
    });

    console.log(`Page 2: ${page2.data.length} results`);
  }

  // Search across name, operator, owner, city
  const search = await client.dataCenters.list({ search: 'equinix' });
  console.log(`\nSearch "equinix": ${search.pagination.total} results`);

  // Filter by type
  const hyperscale = await client.dataCenters.list({ type: 'Hyperscale' });
  console.log(`Hyperscale data centers: ${hyperscale.pagination.total}`);
}

main().catch(console.error);
