import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "express";
import { z } from "zod";
import { SFMCAPIService } from "./sfmc_api.js";
import { Request, Response } from "express";
import dotenv from "dotenv";

dotenv.config();
    
function getServer()
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

    // Tool to get the list of Data Extensions
    // This tool allows you to fetch the list of Data Extensions in the account.
    // More information: https://developer.salesforce.com/docs/marketing/marketing-cloud/references/mc-custom_objects?meta=getDataExtensions
    server.tool("sfmc_list_data_extensions", "Get list of Data Extensions", {
    search: z.string().describe("Search term to filter Data Extensions"),
    page: z.number().optional().describe("Page number for pagination"),
    pageSize: z.number().optional().describe("Page size for pagination (default: 50)"),
    }, async ({ search, page, pageSize }) => {
    try {
    // Construct the endpoint
    const endpoint = `/data/v1/customobjects`;

    // Construct parameters
    const parameters: Record<string, string | number> = {};
    parameters.$search = search;

    if (page) parameters.$page = page;
    if (pageSize) parameters.$pageSize = pageSize;

    // Make the request
    const result = await sfmcClient.getData(endpoint, parameters);

    return {
        content: [
            {
                type: "text",
                text: JSON.stringify(result, null, 2),
            },
        ],
    };
    }
    catch (error: any) {
    console.error(`ERROR getting list of Data Extensions:`, error);
    return {
        content: [
            {
                type: "text",
                text: `Error: ${error.message}`,
            },
        ],
        isError: true,
    };
    }
    });


    // Tool to get rows from a SFMC Data Extension by key
    // This tool allows you to fetch rows from a specific Data Extension using its external key. 
    server.tool("sfmc_get_data_extension", "Get rows from a SFMC Data Extension by key", {
    key: z.string().describe("External key of the Data Extension"),
    filter: z.string().optional().describe("Optional filter expression"),
    fields: z.array(z.string()).optional().describe("Fields to return (leave empty for all fields)"),
    orderBy: z.string().optional().describe("Field to order by"),
    page: z.number().optional().describe("Page number for pagination"),
    pageSize: z.number().optional().describe("Page size for pagination (default: 50)"),
    }, async ({ key, filter, fields, orderBy, page, pageSize }) => {
    try {
    // Construct the endpoint
    const endpoint = `/data/v1/customobjectdata/key/${key}/rowset`;

    // Construct parameters
    const parameters: Record<string, string | number | boolean> = {};
    if (filter) parameters.$filter = filter;
    if (fields && fields.length > 0) parameters.$fields = fields.join(',');
    if (orderBy) parameters.$orderBy = orderBy;
    if (page) parameters.$page = page;
    if (pageSize) parameters.$pageSize = pageSize;

    // Make the request
    const result = await sfmcClient.getData(endpoint, parameters);

    return {
        content: [
            {
                type: "text",
                text: JSON.stringify(result, null, 2),
            },
        ],
    };
    }
    catch (error: any) {
    console.error(`ERROR getting data from Data Extension ${key}:`, error);
    return {
        content: [
            {
                type: "text",
                text: `Error: ${error.message}`,
            },
        ],
        isError: true,
    };
    }
    });

    // Tool to get fields from a SFMC Data Extension by id
    // This tool allows you to fetch the fields of a specific Data Extension using its id.
    // More information can be found in the SFMC documentation: https://developer.salesforce.com/docs/marketing/marketing-cloud/references/mc-custom_objects?meta=getDataExtensionFields
    server.tool("sfmc_get_data_extension_fields", "Get fields from a SFMC Data Extension by id", {
    id: z.string().describe("Id of the Data Extension"),
    }, async ({ id }) => {
    try {
    // Construct the endpoint for fields
    const endpoint = `/data/v1/customobjects/${id}/fields`;

    // Make the request
    const result = await sfmcClient.getData(endpoint);

    return {
        content: [
            {
                type: "text",
                text: JSON.stringify(result, null, 2),
            },
        ],
    };
    }
    catch (error: any) {
    console.error(`ERROR getting fields from Data Extension ${id}:`, error);
    return {
        content: [
            {
                type: "text",
                text: `Error: ${error.message}`,
            },
        ],
        isError: true,
    };
    }
    });

    return server;
}

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

// Start the server
/*async function main() {
    try {
        console.error("Starting SFMC MCP Server...");
     
        const transport = new StdioServerTransport();
        await server.connect(transport);
        
        console.error("SFMC MCP Server running");
    }
    catch (error: any) {
        console.error("Failed to start SFMC MCP Server:", error);
        process.exit(1);
    }
}
    */


//main();

