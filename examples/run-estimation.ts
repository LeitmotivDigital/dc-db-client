/**
 * Trigger estimations and view aggregated results.
 *
 * Usage:
 *   BASE_URL=http://localhost:3000 API_KEY=lm_... DC_ID=<uuid> npx tsx examples/run-estimation.ts
 */
import { DataCenterClient } from '../src/index.js';

const client = new DataCenterClient({
  baseUrl: process.env.BASE_URL || 'http://localhost:3000',
  apiKey: process.env.API_KEY!,
});

const dataCenterId = process.env.DC_ID!;

async function main() {
  if (!dataCenterId) {
    console.error('Set DC_ID environment variable to a data center UUID');
    process.exit(1);
  }

  // Trigger estimation for a single DC
  const estimation = await client.dataCenters.estimations(dataCenterId).create({
    reporting_year: 2024,
    estimation_source: 'api-client-example',
  });

  console.log('Estimation created:', estimation.id);
  console.log(`  PUE: ${estimation.estimated_pue}`);
  console.log(`  Total Energy: ${estimation.estimated_total_energy_consumption_kwh} kWh`);
  console.log(`  IT Energy: ${estimation.estimated_it_energy_consumption_kwh} kWh`);
  console.log(`  Servers: ${estimation.estimated_total_servers}`);
  console.log(`  Grid Emissions: ${estimation.estimated_grid_emissions_tonnes} tonnes CO2`);

  // List estimation history for this DC
  const history = await client.dataCenters.estimations(dataCenterId).list();
  console.log(`\nEstimation history: ${history.pagination.total} records`);

  // Run batch estimation for all data centers
  console.log('\nRunning batch estimation...');
  const batch = await client.estimations.batch({
    reporting_year: 2024,
    estimation_source: 'api-client-example',
  });
  console.log(`  Created: ${batch.created}, Skipped: ${batch.skipped}, Errors: ${batch.errors}`);

  // View aggregated stats
  const aggregates = await client.estimations.aggregates({ year: 2024 });
  console.log('\nAggregated Statistics:');
  console.log(`  Data Centers: ${aggregates.data_centers_count}`);
  console.log(`  Total Power Capacity: ${aggregates.total_power_capacity_mw} MW`);
  console.log(`  Total Energy: ${aggregates.total_energy_consumption_twh} TWh`);
  console.log(`  Average PUE: ${aggregates.average_pue}`);
  console.log(`  Grid Emissions: ${aggregates.total_grid_emissions_tonnes} tonnes CO2`);
  console.log(`  Total Servers: ${aggregates.total_servers}`);
}

main().catch(console.error);
