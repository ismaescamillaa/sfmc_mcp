import dotenv from 'dotenv';
import { SFMCAPIService } from '../build/sfmc_api.js';

dotenv.config();

const sfmcConfig = {
  clientId: process.env.SFMC_CLIENT_ID,
  clientSecret: process.env.SFMC_CLIENT_SECRET,
  authBaseUri: process.env.SFMC_AUTH_BASE_URI,
  restBaseUri: process.env.SFMC_REST_BASE_URI,
  accountId: process.env.SFMC_ACCOUNT_ID,
  proxy: process.env.HTTP_PROXY || process.env.HTTPS_PROXY || undefined,
};

const client = new SFMCAPIService(sfmcConfig);

console.log('Calling soapRetrieve for DataFolder ID 84154...\n');

try {
  const results = await client.soapRetrieve(
    'DataFolder',
    ['ID', 'Name', 'ParentFolder.ID'],
    { property: 'ID', operator: 'equals', value: 84154 }
  );
  console.log('Raw parsed results:');
  console.dir(results, { depth: null });
} catch (err) {
  console.error('soapRetrieve failed:', err.message);
  process.exit(1);
}
