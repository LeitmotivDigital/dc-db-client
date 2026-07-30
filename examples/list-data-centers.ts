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
    country: 'Netherlands',
    per_page: 10,
  });

  console.log(`Found ${result.pagination.total} data centers in the Netherlands\n`);

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
      country: 'Netherlands',
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

  // Embed associated data in the listing (batch-fetched, not one call per row)
  const withSources = await client.dataCenters.list({
    country: 'Germany',
    per_page: 5,
    include: ['sources', 'tags'],
  });

  console.log('\nWith associated data:');
  for (const dc of withSources.data) {
    const tags = (dc.tags ?? []).map((t) => `${t.type}: ${t.value}`).join(', ');
    console.log(`  ${dc.data_center_name}`);
    console.log(`    ${dc.sources?.length ?? 0} sources | ${tags || 'no tags'}`);
  }

  // Filter by tag, and by the German-dataset classification columns
  const protests = await client.dataCenters.list({ tag: 'protest' });
  console.log(`\nData centers with civil action "protest": ${protests.pagination.total}`);

  const rumored = await client.dataCenters.list({
    data_source_type: 'Rumor',
    construction_status: 'planning',
  });
  console.log(`Rumored + still in planning: ${rumored.pagination.total}`);

  // The detail response always carries everything
  const first = withSources.data[0];
  if (first) {
    const detail = await client.dataCenters.get(first.id);
    console.log(
      `\n${detail.data_center_name}: ${detail.notes.length} notes, ` +
        `${detail.sources.length} sources, ${detail.tenants.length} tenants, ` +
        `${detail.tags.length} tags, ${detail.updates.length} updates`
    );
  }
}

main().catch(console.error);
