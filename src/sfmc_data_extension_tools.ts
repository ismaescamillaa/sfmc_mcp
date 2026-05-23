import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
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

    // Tool to create a new SFMC Data Extension
    server.tool(
        "sfmc_create_data_extension",
        "Create a new SFMC Data Extension",
        {
            name: z.string().describe("Name of the Data Extension"),
            externalKey: z.string().optional().describe("External key (max 36 chars). Auto-generated UUID if omitted."),
            description: z.string().optional().describe("Optional description"),
            folderId: z.number().optional().describe("CategoryID of the folder to create the DE in"),
            isSendable: z.boolean().optional().describe("Whether this DE can be used as a send audience (default: false)"),
            sendableDataExtensionField: z.string().optional().describe("DE field name used to identify subscribers (e.g. 'EmailAddress'). Required when isSendable is true."),
            sendableSubscriberField: z.string().optional().describe("Subscriber attribute to match against (e.g. '_SubscriberKey'). Required when isSendable is true."),
            fields: z.array(
                z.object({
                    name:         z.string().describe("Field name"),
                    type:         z.enum(["Text", "Number", "Date", "Boolean", "Decimal", "EmailAddress", "Phone", "Locale"]).describe("SFMC field type"),
                    length:       z.number().optional().describe("Field length. Required for Decimal. Defaults to 50 for Text, 254 for EmailAddress."),
                    scale:        z.number().optional().describe("Decimal scale. Required for Decimal fields."),
                    isPrimaryKey: z.boolean().optional().describe("Whether this field is a primary key"),
                    isNullable:   z.boolean().optional().describe("Whether this field is nullable. Auto-forced false on primary key fields."),
                    defaultValue: z.string().optional().describe("Default value. Omitted from the request body if not provided."),
                }).superRefine((f, ctx) => {
                    if (f.type === "Decimal") {
                        if (f.length === undefined)
                            ctx.addIssue({ code: "custom", message: `Field "${f.name}": Decimal type requires length` });
                        if (f.scale === undefined)
                            ctx.addIssue({ code: "custom", message: `Field "${f.name}": Decimal type requires scale` });
                    }
                })
            ).min(1).describe("Field definitions. At least one field must have isPrimaryKey: true."),
            retention: z.object({
                rowBasedRetention:            z.boolean().optional().describe("Use row-based retention"),
                resetRetentionPeriodOnImport: z.boolean().optional().describe("Reset retention period on import"),
                deleteAtEndOfRetentionPeriod: z.boolean().optional().describe("Delete rows at end of retention period"),
                rowBasedThreshold:            z.number().optional().describe("Row count threshold for row-based retention"),
            }).optional().describe("Data retention settings"),
        },
        async ({ name, externalKey, description, folderId, isSendable, sendableDataExtensionField, sendableSubscriberField, fields, retention }) => {
            try {
                // --- Client-side validations ---
                if (externalKey && externalKey.length > 36) {
                    return { content: [{ type: "text", text: "Error: externalKey must be 36 characters or fewer" }], isError: true };
                }
                if (!fields.some(f => f.isPrimaryKey === true)) {
                    return { content: [{ type: "text", text: "Error: At least one field must be designated as a primary key" }], isError: true };
                }
                const nullablePk = fields.find(f => f.isPrimaryKey === true && f.isNullable === true);
                if (nullablePk) {
                    return { content: [{ type: "text", text: `Error: Primary key field "${nullablePk.name}" must not be nullable` }], isError: true };
                }
                if (isSendable && (!sendableDataExtensionField || !sendableSubscriberField)) {
                    return { content: [{ type: "text", text: "Error: sendableDataExtensionField and sendableSubscriberField are required when isSendable is true" }], isError: true };
                }

                // --- Field body builder ---
                const buildFieldBody = (f: typeof fields[number], index: number) => {
                    const obj: Record<string, any> = {
                        name:            f.name,
                        type:            f.type,
                        IsPrimaryKey:    f.isPrimaryKey ?? false,
                        isNullable:      f.isPrimaryKey ? false : (f.isNullable ?? true),
                        isTemplateField: false,
                        isInheritable:   true,
                        isOverridable:   true,
                        isHidden:        false,
                        isReadOnly:      false,
                        mustOverride:    false,
                        ordinal:         index + 1,
                    };
                    if (f.type === "Text")         obj.length = f.length ?? 50;
                    if (f.type === "EmailAddress") obj.length = f.length ?? 254;
                    if (f.type === "Decimal")      { obj.length = f.length; obj.scale = f.scale; }
                    if (f.defaultValue !== undefined) obj.defaultValue = f.defaultValue;
                    return obj;
                };

                // --- Top-level body ---
                const body: Record<string, any> = {
                    name,
                    key:         externalKey ?? uuidv4(),
                    description: description ?? "",
                    isSendable:  isSendable ?? false,
                    fields:      fields.map(buildFieldBody),
                };
                if (folderId !== undefined)  body.categoryId = folderId;
                if (isSendable) {
                    body.sendableCustomObjectField = sendableDataExtensionField;
                    body.sendableSubscriberField   = sendableSubscriberField;
                }
                if (retention) {
                    const rp: Record<string, any> = {};
                    if (retention.rowBasedRetention            !== undefined) rp.isRowBasedRetention            = retention.rowBasedRetention;
                    if (retention.resetRetentionPeriodOnImport !== undefined) rp.isResetRetentionPeriodOnImport = retention.resetRetentionPeriodOnImport;
                    if (retention.deleteAtEndOfRetentionPeriod !== undefined) rp.isDeleteAtEndOfRetentionPeriod = retention.deleteAtEndOfRetentionPeriod;
                    if (retention.rowBasedThreshold            !== undefined) rp.rowBasedThreshold              = retention.rowBasedThreshold;
                    if (Object.keys(rp).length > 0) body.dataRetentionProperties = rp;
                }

                const result = await sfmcClient.createData("/data/v1/customobjects", body);
                return {
                    content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
                };
            } catch (error: any) {
                console.error(`ERROR creating Data Extension "${name}":`, error);
                const msg: string = error.message ?? "";
                if (msg.includes("already exists")) {
                    return { content: [{ type: "text", text: "Error: A Data Extension with that name or external key already exists" }], isError: true };
                }
                if (msg.toLowerCase().includes("category") || msg.toLowerCase().includes("categoryid")) {
                    return { content: [{ type: "text", text: `Error: Folder ID ${folderId} not found or not accessible` }], isError: true };
                }
                return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
            }
        }
    );
}
