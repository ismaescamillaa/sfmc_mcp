import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { SFMCAPIService } from "./sfmc_api.js";

const folderPathCache = new Map<number, string>();

async function resolveFolderPath(categoryId: number, sfmcClient: SFMCAPIService): Promise<string> {
    if (folderPathCache.has(categoryId)) {
        return folderPathCache.get(categoryId)!;
    }

    const results = await sfmcClient.soapRetrieve(
        'DataFolder',
        ['ID', 'Name', 'ParentFolder.ID'],
        { property: 'ID', operator: 'equals', value: categoryId }
    );

    if (!results || results.length === 0) {
        throw new Error(`Folder with ID ${categoryId} not found`);
    }

    const folder = results[0];
    const name: string = String(folder.Name);
    const parentId: number = folder.ParentFolder?.ID ?? 0;

    let path: string;
    if (parentId === 0) {
        path = name;
    } else {
        const parentPath = await resolveFolderPath(parentId, sfmcClient);
        path = `${parentPath} > ${name}`;
    }

    folderPathCache.set(categoryId, path);
    return path;
}

export function registerFolderTools(server: McpServer, sfmcClient: SFMCAPIService) {
    server.tool(
        "sfmc_get_folder_path",
        "Resolve an SFMC CategoryID to its full folder path (e.g. 'Data Extensions > Banking > Campaigns')",
        {
            categoryId: z.number().describe("The SFMC Category ID to resolve to a folder path"),
        },
        async ({ categoryId }) => {
            try {
                const path = await resolveFolderPath(categoryId, sfmcClient);
                return {
                    content: [{ type: "text", text: path }],
                };
            } catch (error: any) {
                console.error(`ERROR resolving folder path for categoryId ${categoryId}:`, error);
                return {
                    content: [{ type: "text", text: `Error: ${error.message}` }],
                    isError: true,
                };
            }
        }
    );
}
