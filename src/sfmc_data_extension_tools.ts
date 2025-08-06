import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { SFMCAPIService } from "./sfmc_api.js";

/**
 * Registers Data Extension related tools on the MCP server.
 */
export function registerDataExtensionTools(server: McpServer, sfmcClient: SFMCAPIService) {
    // Tool to get the list of Data Extensions
    server.tool("sfmc_list_data_extensions", "Get list of Data Extensions", {
        search: z.string().describe("Search term to filter Data Extensions"),
        page: z.number().optional().describe("Page number for pagination"),
        pageSize: z.number().optional().describe("Page size for pagination (default: 50)"),
    }, async ({ search, page, pageSize }) => {
        try {
            const endpoint = `/data/v1/customobjects`;
            const parameters: Record<string, string | number> = {};
            parameters.$search = search;
            if (page) parameters.$page = page;
            if (pageSize) parameters.$pageSize = pageSize;
            const result = await sfmcClient.getData(endpoint, parameters);
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(result, null, 2),
                    },
                ],
            };
        } catch (error: any) {
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
    server.tool("sfmc_get_data_extension", "Get rows from a SFMC Data Extension by key", {
        key: z.string().describe("External key of the Data Extension"),
        filter: z.string().optional().describe("Optional filter expression"),
        fields: z.array(z.string()).optional().describe("Fields to return (leave empty for all fields)"),
        orderBy: z.string().optional().describe("Field to order by"),
        page: z.number().optional().describe("Page number for pagination"),
        pageSize: z.number().optional().describe("Page size for pagination (default: 50)"),
    }, async ({ key, filter, fields, orderBy, page, pageSize }) => {
        try {
            const endpoint = `/data/v1/customobjectdata/key/${key}/rowset`;
            const parameters: Record<string, string | number | boolean> = {};
            if (filter) parameters.$filter = filter;
            if (fields && fields.length > 0) parameters.$fields = fields.join(',');
            if (orderBy) parameters.$orderBy = orderBy;
            if (page) parameters.$page = page;
            if (pageSize) parameters.$pageSize = pageSize;
            const result = await sfmcClient.getData(endpoint, parameters);
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(result, null, 2),
                    },
                ],
            };
        } catch (error: any) {
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
    server.tool("sfmc_get_data_extension_fields", "Get fields from a SFMC Data Extension by id", {
        id: z.string().describe("Id of the Data Extension")
    }, async ({ id }) => {
        try {
            const endpoint = `/data/v1/customobjects/${id}/fields`;
            const result = await sfmcClient.getData(endpoint);
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(result, null, 2),
                    },
                ],
            };
        } catch (error: any) {
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
}
