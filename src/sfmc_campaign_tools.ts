import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { SFMCAPIService } from "./sfmc_api.js";

/**
 * Registers Campaign related tools on the MCP server.
 * Implements GET /asset/v1/campaigns endpoint from SFMC REST API.
 * Docs: https://developer.salesforce.com/docs/marketing/marketing-cloud/references/mc_rest_campaigns?meta=getCampaigns
 */
export function registerCampaignTools(server: McpServer, sfmcClient: SFMCAPIService) {
    server.tool(
        "sfmc_list_campaigns",
        "Get list of Campaigns",
        {
            page: z.number().optional().describe("Page number for pagination (default: 1)"),
            pageSize: z.number().optional().describe("Page size for pagination (default: 50)"),
            orderBy: z.string().optional().describe("Field to order by, e.g. 'name' or 'createdDate'"),
        },
        async ({page, pageSize, orderBy }) => {
            try {
                const endpoint = "/hub/v1/campaigns";
                const parameters: Record<string, string | number> = {};
                if (page) parameters.page = page;
                if (pageSize) parameters.pageSize = pageSize;                
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
                console.error(`ERROR getting list of Campaigns:`, error);
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
        }
    );
}
