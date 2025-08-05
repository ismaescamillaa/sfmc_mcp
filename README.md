# sfmc_mcp

MCP for Salesforce Marketing Cloud.

## Features
Data Extensions:
- Query Data Extensions
- Query Data of a Specific Data Extension
- Get Fields of a Data Extentions

More usage and configuration details will be added soon.

## To run in your local windows (Powershell)
1- Install depences:
npm install

2- Build MCP:
npm run build

3- Add in you MCP Client the SFMC Server (VSCode, Cloude Desktop, etc), you also could use .env file:

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

### To run in server mode
1- Configure .env, setup MCP_TRANSPORT="stream" and MCP_WS_PORT="4042".
2- Run "npm run build"
3- Run "npm start"
4- Use Inspector to validate:
4.1- Run "npx @modelcontextprotocol/inspector"
4.2- On MCP inspector web, select the transport type: "Stremable HTTP"
4.3- Set the your local server URL: e.g. "http://localhost:4042/mcp"
5- To configure your MCP 
  "sfmc": {
    "url": "http://localhost:4042/mcp",
  }

### To run Docker for remote MCP Server
1- configure .env

2- docker compose up --build

