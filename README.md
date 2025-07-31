# sfmc_mcp

MCP for Salesforce Marketing Cloud.

## Features
Data Extensions:
- Query Data Extensions
- Query Data of a Specific Data Extension
- Get Fields of a Data Extentions

More usage and configuration details will be added soon.

## To run in your local windows local machine (Powershell)
1- Install depences:
npm install

2- Build MCP:
npm run build

3- Add in you MCP Client the SFMC Server (VSCode, Cloude Desktop, etc):
{
"mcpServers": {
  "sfmc": {
    "command": "node",
    "args": [ "C:\\wks\\my\\Projects\\mcps\\sfmc_mcp\\build\\index.js" ],
    "env": {
      "SFMC_CLIENT_ID": "********",
      "SFMC_CLIENT_SECRET": "*******",
      "SFMC_AUTH_BASE_URI": "https://yourdomain.auth.marketingcloudapis.com",
      "SFMC_REST_BASE_URI": "https://yourdomain.rest.marketingcloudapis.com"
    }
  }
}
}

