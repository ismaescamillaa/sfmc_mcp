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

async function resolveCategoryPath(client, categoryId) {
  if (!categoryId) return null;
  const pieces = [];
  let currentId = categoryId;
  let safety = 0;
  while (currentId && safety < 20) {
    safety++;
    try {
      const res = await client.getData(`/asset/v1/content/categories/${currentId}`);
      // Normalize
      let cat = null;
      if (!res) break;
      if (res.id || res.name) cat = res;
      else if (Array.isArray(res.items) && res.items.length > 0) cat = res.items[0];
      else if (Array.isArray(res.categories) && res.categories.length > 0) cat = res.categories[0];
      if (!cat) break;
      pieces.unshift(cat.name || cat.displayName || `(${cat.id})`);
      if (!cat.parentId || cat.parentId === 0 || cat.parentId === null) break;
      currentId = cat.parentId;
    } catch (err) {
      // If the categories endpoint is not available for this id, stop
      break;
    }
  }
  return pieces.length > 0 ? '/' + pieces.join('/') : null;
}

async function main() {
  const client = new SFMCAPIService(sfmcConfig);
  const searchTerm = 'Austin Grill and Chill Reminder';
  try {
    const params = { $pageSize: 50, $search: searchTerm };
    const res = await client.getData('/data/v1/customobjects', params);
    let arr = [];
    if (Array.isArray(res)) arr = res;
    else if (Array.isArray(res.items)) arr = res.items;
    else if (Array.isArray(res.customObjects)) arr = res.customObjects;
    else if (Array.isArray(res.objects)) arr = res.objects;
    else if (res && Array.isArray(res.body)) arr = res.body;

    // Try to find exact match
    const match = arr.find(it => (it.name === searchTerm) || (it.Name === searchTerm) || (it.customerKey === searchTerm) || (it.key === searchTerm));

    if (!match) {
      console.log(`No exact match found for '${searchTerm}'. Showing all returned items (${arr.length}):`);
      console.log(JSON.stringify(arr, null, 2));
      return;
    }

    console.log('Found Data Extension object:');
    console.log(JSON.stringify(match, null, 2));

    // Attempt to detect folder/category id field
    const categoryId = match.categoryId || match.CategoryId || match.categoryID || match.folderId || match.folderID || match.category || match.categoryID;

    if (!categoryId) {
      console.log('No category/folder id present on the object. The API did not return folder info.');
      return;
    }

    console.log(`Found category/folder id: ${categoryId}`);
    const path = await resolveCategoryPath(client, categoryId);
    if (path) {
      console.log(`Resolved path: ${path}`);
    } else {
      console.log('Could not resolve folder path from categories endpoint; category name/parent info may not be available over REST.');
    }
  } catch (err) {
    console.error('Error querying SFMC:', err.message || err);
  }
}

main();
