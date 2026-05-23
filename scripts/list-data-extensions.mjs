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

async function listDataExtensions() {
  const client = new SFMCAPIService(sfmcConfig);
  try {
    // SFMC requires a $search parameter; try several safe search terms (letters/digits)
    const searchCandidates = ['a','e','i','o','u','s','t','r','n','0','1','2','3'];
    const found = new Map();

    for (const term of searchCandidates) {
      const params = { $pageSize: 200, $search: term };
      try {
        const res = await client.getData('/data/v1/customobjects', params);
        // Normalize response to an array of custom objects
        let arr = [];
        if (Array.isArray(res)) arr = res;
        else if (Array.isArray(res.items)) arr = res.items;
        else if (Array.isArray(res.customObjects)) arr = res.customObjects;
        else if (Array.isArray(res.objects)) arr = res.objects;
        else if (res && Array.isArray(res.body)) arr = res.body;

        for (const it of arr) {
          const name = it.name || it.Name || it.customerKey || it.key || it.id || null;
          if (name && !found.has(name)) {
            found.set(name, it);
            if (found.size >= 10) break;
          }
        }
        if (found.size >= 10) break;
      } catch (innerErr) {
        // Ignore search terms that return errors and continue
        // console.error(`Search term '${term}' failed:`, innerErr.message || innerErr);
      }
    }

    const top = Array.from(found.keys()).slice(0, 10);
    if (top.length === 0) {
      console.log('No Data Extensions found with the tried search terms.');
    } else {
      console.log('Top Data Extensions by name (up to 10):');
      top.forEach((t, i) => console.log(`${i + 1}. ${t}`));
    }
  } catch (err) {
    console.error('Error fetching Data Extensions:', err.message || err);
    process.exit(1);
  }
}

listDataExtensions();
