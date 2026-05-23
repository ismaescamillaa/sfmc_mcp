import dotenv from 'dotenv';
import { SFMCAPIService } from '../build/sfmc_api.js';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const sfmcConfig = {
  clientId:     process.env.SFMC_CLIENT_ID,
  clientSecret: process.env.SFMC_CLIENT_SECRET,
  authBaseUri:  process.env.SFMC_AUTH_BASE_URI,
  restBaseUri:  process.env.SFMC_REST_BASE_URI,
  accountId:    process.env.SFMC_ACCOUNT_ID,
  proxy:        process.env.HTTP_PROXY || process.env.HTTPS_PROXY || undefined,
};

const client = new SFMCAPIService(sfmcConfig);
const deName = `TriaPrima_MCP_SmokeTest_${Date.now()}`;
const deKey  = uuidv4();

const body = {
  name:        deName,
  key:         deKey,
  description: 'MCP smoke test DE — safe to delete',
  isSendable:  false,
  categoryId:  70108,
  fields: [
    {
      name:            'id',
      type:            'Text',
      length:          36,
      IsPrimaryKey:    true,
      isNullable:      false,
      isTemplateField: false,
      isInheritable:   true,
      isOverridable:   true,
      isHidden:        false,
      isReadOnly:      false,
      mustOverride:    false,
      ordinal:         1,
    },
    {
      name:            'email',
      type:            'EmailAddress',
      length:          254,
      IsPrimaryKey:    false,
      isNullable:      true,
      isTemplateField: false,
      isInheritable:   true,
      isOverridable:   true,
      isHidden:        false,
      isReadOnly:      false,
      mustOverride:    false,
      ordinal:         2,
    },
    {
      name:            'createdAt',
      type:            'Date',
      IsPrimaryKey:    false,
      isNullable:      true,
      isTemplateField: false,
      isInheritable:   true,
      isOverridable:   true,
      isHidden:        false,
      isReadOnly:      false,
      mustOverride:    false,
      ordinal:         3,
    },
  ],
};

console.log(`Creating DE: "${deName}"`);
console.log(`Key: ${deKey}`);
console.log(`CategoryId: 70108\n`);

try {
  const result = await client.createData('/data/v1/customobjects', body);
  console.log('Raw API response:');
  console.dir(result, { depth: null });
  console.log('\n--- Summary ---');
  console.log(`id:         ${result.id}`);
  console.log(`key:        ${result.key}`);
  console.log(`categoryId: ${result.categoryId}`);
} catch (err) {
  console.error('createData failed:', err.message);
  process.exit(1);
}
