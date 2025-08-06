import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "express";
import { z } from "zod";
import { SFMCAPIService } from "./sfmc_api.js";
import { registerDataExtensionTools } from "./sfmc_data_extension_tools.js";
import { registerAssetTools } from "./sfmc_asset_tools.js";
import { Request, Response } from "express";
import dotenv from "dotenv";

dotenv.config();

// This function initializes the MCP server with tools for interacting with Salesforce Marketing Cloud (SFMC).
function getServer()
    // Tool to get the list of Assets from Marketing Cloud
    // This tool allows you to fetch the list of Assets in the account.
    // More information: https://developer.salesforce.com/docs/marketing/marketing-cloud/references/mc_rest_assets/assetSimpleQuery.html
{
    // Create server instance
    const server = new McpServer({
    name: "MCP_SFMC",
    version: "1.0.0",
    capabilities: {
    tools: {},
    },
    });

    // Load environment variables
    const sfmcConfig = {
    clientId: process.env.SFMC_CLIENT_ID || "",
    clientSecret: process.env.SFMC_CLIENT_SECRET || "",
    authBaseUri: process.env.SFMC_AUTH_BASE_URI || "",
    restBaseUri: process.env.SFMC_REST_BASE_URI || "",
    accountId: process.env.SFMC_ACCOUNT_ID,
    // Add proxy settings if needed
    proxy: process.env.HTTP_PROXY || process.env.HTTPS_PROXY || undefined
    };

    // Initialize SFMC client
    const sfmcClient = new SFMCAPIService(sfmcConfig);

    // Validate if required credentials are provided
    if (!sfmcConfig.clientId || !sfmcConfig.clientSecret || !sfmcConfig.authBaseUri || !sfmcConfig.restBaseUri) {
    console.error("ERROR: Missing required SFMC credentials in environment variables.");
    console.error("Make sure to set SFMC_CLIENT_ID, SFMC_CLIENT_SECRET, SFMC_AUTH_BASE_URI, and SFMC_REST_BASE_URI in Claude Desktop config.");
    process.exit(1);
    }

    // Log proxy information if available
    if (sfmcConfig.proxy) {
    console.error(`Using proxy: ${sfmcConfig.proxy}`);
    }


    // Register Data Extension tools
    registerDataExtensionTools(server, sfmcClient);

    // Register Asset tools
    registerAssetTools(server, sfmcClient);

    return server;
}


// Start the server with StdioServerTransport for local development
function startStdioServer() {
    try {
        console.error("Starting SFMC MCP Server...");
        var server = getServer();
        const transport = new StdioServerTransport();
        server.connect(transport);
        
        console.error("SFMC MCP Server running");
    }
    catch (error: any) {
        console.error("Failed to start SFMC MCP Server:", error);
        process.exit(1);
    }
}

// Start the server with StreamableHTTPServerTransport for server
function startStreamableHTTPServer() {
    // Create an Express application
    const app = express();
    app.use(express.json());

    app.post("/mcp", async (req: Request, res: Response) => {
        try {
            const server = getServer();
            const transport = new StreamableHTTPServerTransport({
                    sessionIdGenerator: undefined,
            });

            res.on("close", () => {
                console.log("Client disconnected, closing transport");
                transport.close();
                server.close();
            });

            await server.connect(transport);
            await transport.handleRequest(req, res, req.body);
        } catch (error: any) {
            console.error("Error processing request:", error);
            if(!res.headersSent) {
                res.status(500).json({
                    jsonrpc: "2.0",
                    error: {
                        code: -32603,
                        message: "Internal Server Error"
                    },
                    id:null
                });
            }
        
        }
    });

    const port = process.env.MCP_WS_PORT || 3000;
    app.listen(port, () => {
        console.error(`SFMC MCP Server listening on port ${port}`);
    });
}

if (process.env.MCP_TRANSPORT === "stream") {
    // Start the server with StreamableHTTPServerTransport
    startStreamableHTTPServer();
}
else {
    // Start the server with StdioServerTransport for local development
    startStdioServer();
}