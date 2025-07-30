# sfmc_mcp

MCP for Salesforce Marketing Cloud.

## Features
- Query Data Extensions
- Create Data Extensions
- Update Data Extensions
- Delete Data Extensions

More usage and configuration details will be added soon.


## To run in your local windows local machine (Powershell) 
$env:SFMC_CLIENT_ID="tuClientId"
$env:SFMC_CLIENT_SECRET="tuClientSecret"
$env:SFMC_AUTH_BASE_URI="https://YOUR_SUBDOMAIN.auth.marketingcloudapis.com"
$env:SFMC_REST_BASE_URI="https://YOUR_SUBDOMAIN.rest.marketingcloudapis.com"
npx -y tsx ./src/index.ts

## Using Inspector run in your Windows local machine (Powershell) 
$env:SFMC_CLIENT_ID="tuClientId"
$env:SFMC_CLIENT_SECRET="tuClientSecret"
$env:SFMC_AUTH_BASE_URI="https://YOUR_SUBDOMAIN.auth.marketingcloudapis.com"
$env:SFMC_REST_BASE_URI="https://YOUR_SUBDOMAIN.rest.marketingcloudapis.com"
npx -y @modelcontextprotocol/inspector npx -y tsx file:///C:/wks/my/Projects/mcps/sfmc_mcp/src/index.ts