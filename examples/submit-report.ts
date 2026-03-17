/**
 * Submit an annual report for a data center.
 *
 * Usage:
 *   BASE_URL=http://localhost:3000 API_KEY=lm_... DC_ID=<uuid> npx tsx examples/submit-report.ts
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

  // Submit a company-sourced report
  const report = await client.dataCenters.reports(dataCenterId).create({
    reporting_year: 2024,
    source_type: 'company',
    source_name: 'Example Corp Annual Sustainability Report 2024',
    total_energy_consumption_kwh: 52_000_000,
    it_energy_consumption_kwh: 32_000_000,
    total_renewable_energy_kwh: 40_000_000,
    total_water_consumption_liters: 15_000_000,
    total_servers: 8000,
    pue: 1.35,
  });
  console.log('Created report:', report.id);
  console.log(`  Year: ${report.reporting_year}, Source: ${report.source_type}`);
  console.log(`  Energy: ${report.total_energy_consumption_kwh} kWh`);
  console.log(`  PUE: ${report.pue}`);

  // List all reports for this DC
  const reports = await client.dataCenters.reports(dataCenterId).list();
  console.log(`\nTotal reports for this DC: ${reports.pagination.total}`);

  // List reports across all DCs for 2024
  const allReports = await client.reports.list({
    year: 2024,
    source_type: 'company',
  });
  console.log(`Company reports for 2024 across all DCs: ${allReports.pagination.total}`);
}

main().catch(console.error);
