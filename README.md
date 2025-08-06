# sfmc_mcp

MCP for Salesforce Marketing Cloud.

## Features
Data Extensions:
- Query Data Extensions
- Query Data of a Specific Data Extension
- Get Fields of a Data Extentions
Assets:

More usage and configuration details will be added soon.

## To run in your local windows (Powershell)
- Install depences:
npm install

- Build MCP:
npm run build

3- Add in you MCP Client the SFMC Server (VSCode, Cloude Desktop, etc), you also could use .env file:

{
  "mcpServers": {
    "sfmc": {
      "command": "node",
      "args": [ "C:\\wks\\my\\Projects\\mcps\\sfmc_mcp\\build\\server.js" ],
      "env": {
        "SFMC_CLIENT_ID": "********",
        "SFMC_CLIENT_SECRET": "*******",
        "SFMC_AUTH_BASE_URI": "https://yourdomain.auth.marketingcloudapis.com",
        "SFMC_REST_BASE_URI": "https://yourdomain.rest.marketingcloudapis.com"
      }
    }
  }
}

### To run in server mode
- Configure .env, setup MCP_TRANSPORT="stream" and MCP_WS_PORT="4042".
- Run "npm run build"
- Run "npm start"
- Use Inspector to validate:
  - Run "npx @modelcontextprotocol/inspector"
  - On MCP inspector web, select the transport type: "Stremable HTTP"
  - Set the your local server URL: e.g. "http://localhost:4042/mcp"
- To configure your MCP 
  "sfmc": {
    "url": "http://localhost:4042/mcp",
  }

### To run Docker for remote MCP Server
- Configure .env
- docker compose up --build

