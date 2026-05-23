import dotenv from 'dotenv';
import axios from 'axios';
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

function soapEndpointFromAuth(authBase) {
  if (!authBase) return null;
  // authBase example: https://abc123.auth.marketingcloudapis.com/
  return authBase.replace('.auth.', '.soap.').replace(/\/?$/, '') + '/Service.asmx';
}

function buildRetrieveEnvelope(objectType, properties, filterProperty, filterValue, token) {
  // minimal SOAP envelope with fueloauth in header
  const propsXml = properties.map(p => `<ns:Properties>${p}</ns:Properties>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
  <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ns="http://exacttarget.com/wsdl/partnerAPI">
    <soapenv:Header>
      <fueloauth xmlns="http://exacttarget.com">${token}</fueloauth>
    </soapenv:Header>
    <soapenv:Body>
      <ns:RetrieveRequestMsg>
        <ns:RetrieveRequest>
          <ns:ObjectType>${objectType}</ns:ObjectType>
          ${propsXml}
          <ns:Filter>
            <ns:SimpleFilterPart>
              <ns:Property>${filterProperty}</ns:Property>
              <ns:SimpleOperator>equals</ns:SimpleOperator>
              <ns:Value>${filterValue}</ns:Value>
            </ns:SimpleFilterPart>
          </ns:Filter>
        </ns:RetrieveRequest>
      </ns:RetrieveRequestMsg>
    </soapenv:Body>
  </soapenv:Envelope>`;
}

function extractTag(xml, tag) {
  const re = new RegExp(`<${tag}>([\s\S]*?)<\/${tag}>`,'i');
  const m = xml.match(re);
  return m ? m[1].trim() : null;
}

async function getFolderByIdSOAP(client, id) {
  const token = await client.getAccessToken();
  const soapUrl = soapEndpointFromAuth(sfmcConfig.authBaseUri);
  if (!soapUrl) throw new Error('Cannot determine SOAP endpoint from SFMC_AUTH_BASE_URI');

  const envelope = buildRetrieveEnvelope('DataFolder', ['ID','Name','Description','ParentFolder.ID','ParentFolder.Name'], 'ID', id, token);

  const headers = {
    // Use SOAP 1.1 content type and include SOAPAction for Retrieve
    'Content-Type': 'text/xml; charset=utf-8',
    'Accept': 'text/xml',
    'SOAPAction': 'Retrieve',
  };
  const res = await axios.post(soapUrl, envelope, { headers, timeout: 15000 });
  return res.data;
}

async function main() {
  const client = new SFMCAPIService(sfmcConfig);
  const categoryId = 84154; // from previous discovery
  try {
    const xml = await getFolderByIdSOAP(client, categoryId);
    // crude parse
    // try to find Name and ParentFolder.ID / ParentFolder.Name
    console.log('SOAP response (truncated):');
    console.log(xml.slice(0, 2000));

    const name = extractTag(xml, 'Name');
    const parentName = extractTag(xml, 'ParentFolder.Name') || extractTag(xml, 'ParentFolderName') || extractTag(xml, 'ParentFolder');
    const parentId = extractTag(xml, 'ParentFolder.ID') || extractTag(xml, 'ParentFolderID') || extractTag(xml, 'ParentFolder');

    console.log('Parsed folder info:');
    console.log({ id: categoryId, name, parentId, parentName });

    if (!parentId) {
      console.log('Unable to find parent id in SOAP response. The folder may be top-level.');
      return;
    }

    // If parentId exists and is not zero, try to resolve parent chain (limited depth)
    const chain = [];
    let currentId = parentId;
    let depth = 0;
    while (currentId && depth < 10) {
      depth++;
      const xml2 = await getFolderByIdSOAP(client, currentId);
      const nm = extractTag(xml2, 'Name') || `(${currentId})`;
      chain.unshift(nm);
      const pId = extractTag(xml2, 'ParentFolder.ID') || extractTag(xml2, 'ParentFolderID');
      if (!pId || pId === '0' || pId === 'null') break;
      currentId = pId;
    }

    const fullPath = chain.length > 0 ? '/' + chain.join('/') + `/${name}` : `/${name}`;
    console.log('Resolved path:', fullPath);
  } catch (err) {
    console.error('SOAP lookup failed:', err.response ? `${err.response.status} ${err.response.statusText}` : err.message);
    if (err.response && err.response.data) {
      console.error('Response body (truncated):', String(err.response.data).slice(0,1000));
    }
  }
}

main();
