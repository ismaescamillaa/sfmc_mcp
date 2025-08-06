import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { SFMCAPIService } from "./sfmc_api.js";

/**
 * Registers Asset related tools on the MCP server.
 */
export function registerAssetTools(server: McpServer, sfmcClient: SFMCAPIService) {
    server.tool("sfmc_list_assets", "Get list of Assets", {
        search: z.string().optional().describe("Search term to filter assets by name or description"),
        page: z.number().optional().describe("Page number for pagination (default: 1)"),
        pageSize: z.number().optional().describe("Page size for pagination (default: 50)"),
        fields: z.array(z.string()).optional().describe("Fields to return (leave empty for all fields)"),
        orderBy: z.string().optional().describe("Field to order by, e.g. 'name' or 'createdDate'"),
    }, async ({ search, page, pageSize, fields, orderBy }) => {
        try {
            const endpoint = "/asset/v1/content/assets";
            const parameters: Record<string, string | number> = {};
            if (page) parameters.page = page;
            if (pageSize) parameters.pageSize = pageSize;
            if (search) parameters.$filter = `name like '%${search}%' or description like '%${search}%'`;
            if (fields && fields.length > 0) parameters.$fields = fields.join(',');
            if (orderBy) parameters.$orderBy = orderBy;
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
            console.error(`ERROR getting list of Assets:`, error);
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
