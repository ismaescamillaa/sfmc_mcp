
/**
 * SFMCAPIService provides a wrapper for authenticating and making REST API requests to Salesforce Marketing Cloud (SFMC).
 * Handles token management, proxy configuration, and error handling for robust integration.
 */
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import https from 'https';
import { XMLParser } from 'fast-xml-parser';

// Export the interface so it can be imported in index.ts
export interface SFMCConfig {
    clientId: string; // SFMC API client ID
    clientSecret: string; // SFMC API client secret
    authBaseUri: string; // Base URI for authentication
    restBaseUri: string; // Base URI for REST API calls
    accountId?: string; // Optional: MID/account ID for authentication
    proxy?: string; // Optional: Proxy URL (e.g., http://proxy:8080)
    // Optional: SSL configuration options
    rejectUnauthorized?: boolean; // Whether to reject unauthorized SSL certs
    certPath?: string; // Path to custom SSL certificate
}

export class SFMCAPIService {
    private config: SFMCConfig;
    private axiosInstance: AxiosInstance;
    private accessToken: string | null = null;
    private tokenExpiration: Date | null = null;

    /**
     * Initialize the SFMC API service with configuration.
     * Sets up Axios instance with optional proxy and SSL settings.
     */
    constructor(config: SFMCConfig) {
        this.config = config;

        // Create axios instance with base headers and optional proxy/SSL config
        this.axiosInstance = axios.create({
            headers: {
                'Content-Type': 'application/json',
            },
            // For production, always validate SSL certificates
            httpsAgent: new https.Agent({
                rejectUnauthorized: true
            }),
            proxy: this.createProxyConfig(this.config.proxy),
        });

        // Log if proxy is being used for transparency
        if (config.proxy) {
            console.error(`Using proxy for SFMC API requests: ${config.proxy}`);
        }
    }

    /**
     * Convert proxy string to Axios proxy config
     */
    /**
     * Convert a proxy URL string to Axios proxy config object.
     * Returns undefined if no proxy is set or if the URL is invalid.
     */
    private createProxyConfig(proxyUrl?: string): AxiosRequestConfig['proxy'] {
        if (!proxyUrl)
            return undefined;
        try {
            const url = new URL(proxyUrl);
            return {
                host: url.hostname,
                port: parseInt(url.port || '80'),
                protocol: url.protocol.replace(':', '')
            };
        }
        catch (error) {
            console.error('Invalid proxy URL format:', error);
            return undefined;
        }
    }

    /**
     * Get an access token for SFMC API
     */
    /**
     * Retrieve an OAuth access token for SFMC API requests.
     * Caches the token until expiration to avoid unnecessary requests.
     * Throws detailed errors if authentication fails.
     */
    async getAccessToken(): Promise<string> {
        // Return cached token if still valid
        if (this.accessToken && this.tokenExpiration && this.tokenExpiration > new Date()) {
            return this.accessToken;
        }
        try {
            // Prepare authentication request body
            const requestBody: Record<string, string> = {
                grant_type: 'client_credentials',
                client_id: this.config.clientId,
                client_secret: this.config.clientSecret,
            };

            // Optionally add account_id if provided
            if (this.config.accountId) {
                requestBody.account_id = this.config.accountId;
            }
            
            // Request token from SFMC auth endpoint
            const response = await this.axiosInstance.post(
                `${this.config.authBaseUri}/v2/token`, 
                requestBody,
                {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );
            
            this.accessToken = response.data.access_token;
            
            // Set expiration time (subtract 60s for safety margin)
            const expiresInSeconds = response.data.expires_in || 1140; // Default to 19 minutes
            this.tokenExpiration = new Date(Date.now() + (expiresInSeconds - 60) * 1000);
            
            if (!this.accessToken) {
                throw new Error('No access token received from SFMC');
            }
            return this.accessToken;
        }
        catch (error: any) {
            // Log error details for debugging
            if (error.response) {
                console.error(`SFMC Auth Error - Status: ${error.response.status}`);
                console.error('Response:', JSON.stringify(error.response.data, null, 2));
            }
            else if (error.request) {
                console.error('No response received from SFMC (possible network issue)');
            }
            else {
                console.error('Error details:', error.message);
            }
            
            // Throw the original error message for transparency
            if (error.response && error.response.data) {
                throw new Error(`SFMC Authentication Error: ${JSON.stringify(error.response.data)}`);
            }
            else if (error.message) {
                throw new Error(`SFMC Authentication Error: ${error.message}`);
            }
            else {
                throw new Error(`SFMC Authentication Error: ${JSON.stringify(error)}`);
            }
        }
    }

    /**
     * Make a request to the SFMC REST API
     */
    /**
     * Make a REST API request to SFMC.
     * Handles token injection, endpoint formatting, and error reporting.
     * @param method HTTP method (get, post, put, patch, delete)
     * @param endpoint REST endpoint (relative or absolute URL)
     * @param data Optional request body for POST/PUT/PATCH
     * @param parameters Optional query parameters
     * @returns Response data from SFMC
     */
    async makeRequest<T = any>(
        method: string, 
        endpoint: string, 
        data?: any, 
        parameters?: Record<string, string | number | boolean>
    ): Promise<T> {
        try {
            const accessToken = await this.getAccessToken();
            
            // Ensure endpoint is absolute
            const url = endpoint.startsWith('http') ? 
                endpoint : 
                `${this.config.restBaseUri}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
            
            const config: AxiosRequestConfig = {
                method: method.toLowerCase(),
                url,
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                params: parameters
            };
            
            // Attach data for write operations
            if (data && (method.toLowerCase() === 'post' || method.toLowerCase() === 'put' || method.toLowerCase() === 'patch')) {
                config.data = data;
            }
            
            const response = await this.axiosInstance.request<T>(config);
            return response.data;
        }
        catch (error: any) {
            // Log and rethrow errors with details for easier debugging
            console.error(`Error making SFMC API request to ${endpoint}:`);
            if (error.response) {
                console.error(`Status: ${error.response.status}`);
                console.error('Response:', JSON.stringify(error.response.data, null, 2));
                throw new Error(`SFMC API error (${error.response.status}): ${JSON.stringify(error.response.data)}`);
            }
            else if (error.request) {
                console.error('No response received (possible network issue)');
                throw new Error(`SFMC API request failed: No response received`);
            }
            else {
                console.error('Error:', error.message);
                throw new Error(`SFMC API request failed: ${error.message}`);
            }
        }
    }

    /**
     * Get SFMC data from a REST endpoint (GET request)
     */
    /**
     * Perform a GET request to a SFMC REST endpoint.
     * @param endpoint REST endpoint (relative or absolute URL)
     * @param parameters Optional query parameters
     * @returns Response data from SFMC
     */
    async getData<T = any>(endpoint: string, parameters?: Record<string, string | number | boolean>): Promise<T> {
        return this.makeRequest<T>('get', endpoint, undefined, parameters);
    }

    /**
     * Create SFMC data (POST request)
     */
    /**
     * Perform a POST request to create data in SFMC.
     * @param endpoint REST endpoint
     * @param data Request body
     * @param parameters Optional query parameters
     * @returns Response data from SFMC
     */
    async createData<T = any>(endpoint: string, data: any, parameters?: Record<string, string | number | boolean>): Promise<T> {
        return this.makeRequest<T>('post', endpoint, data, parameters);
    }

    /**
     * Update SFMC data (PUT/PATCH request)
     */
    /**
     * Perform a PUT or PATCH request to update data in SFMC.
     * @param endpoint REST endpoint
     * @param data Request body
     * @param parameters Optional query parameters
     * @param method HTTP method ('put' or 'patch')
     * @returns Response data from SFMC
     */
    async updateData<T = any>(
        endpoint: string, 
        data: any, 
        parameters?: Record<string, string | number | boolean>, 
        method: 'put' | 'patch' = 'put'
    ): Promise<T> {
        return this.makeRequest<T>(method, endpoint, data, parameters);
    }

    /**
     * Delete SFMC data (DELETE request)
     */
    /**
     * Perform a DELETE request to remove data from SFMC.
     * @param endpoint REST endpoint
     * @param parameters Optional query parameters
     * @returns Response data from SFMC
     */
    async deleteData<T = any>(endpoint: string, parameters?: Record<string, string | number | boolean>): Promise<T> {
        return this.makeRequest<T>('delete', endpoint, undefined, parameters);
    }

    private getSoapEndpoint(): string {
        return this.config.authBaseUri
            .replace('.auth.', '.soap.')
            .replace(/\/?$/, '') + '/Service.asmx';
    }

    async soapRetrieve(
        objectType: string,
        properties: string[],
        filter: { property: string; operator: string; value: string | number }
    ): Promise<any[]> {
        try {
            const token = await this.getAccessToken();
            const soapEndpoint = this.getSoapEndpoint();

            const propsXml = properties
                .map(p => `        <ns:Properties>${p}</ns:Properties>`)
                .join('\n');

            const envelope = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ns="http://exacttarget.com/wsdl/partnerAPI" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <soapenv:Header>
    <fueloauth xmlns="http://exacttarget.com">${token}</fueloauth>
  </soapenv:Header>
  <soapenv:Body>
    <ns:RetrieveRequestMsg>
      <ns:RetrieveRequest>
        <ns:ObjectType>${objectType}</ns:ObjectType>
${propsXml}
        <ns:Filter xsi:type="ns:SimpleFilterPart">
          <ns:Property>${filter.property}</ns:Property>
          <ns:SimpleOperator>${filter.operator}</ns:SimpleOperator>
          <ns:Value>${filter.value}</ns:Value>
        </ns:Filter>
      </ns:RetrieveRequest>
    </ns:RetrieveRequestMsg>
  </soapenv:Body>
</soapenv:Envelope>`;

            const response = await this.axiosInstance.post(soapEndpoint, envelope, {
                headers: {
                    'Content-Type': 'text/xml; charset=utf-8',
                    'SOAPAction': 'Retrieve',
                },
            });

            const parser = new XMLParser({
                removeNSPrefix: true,
                parseTagValue: true,
                isArray: (name) => name === 'Results',
            });

            const parsed = parser.parse(response.data as string);
            const msg = parsed?.Envelope?.Body?.RetrieveResponseMsg;

            if (!msg) {
                throw new Error('Unexpected SOAP response structure');
            }

            const status: string = msg.OverallStatus;
            if (status && status !== 'OK' && status !== 'MoreDataAvailable') {
                throw new Error(`SFMC SOAP error: ${status}${msg.OverallStatusMessage ? ' - ' + msg.OverallStatusMessage : ''}`);
            }

            return msg.Results ?? [];
        } catch (error: any) {
            console.error(`Error making SFMC SOAP Retrieve for ${objectType}:`);
            if (error.response) {
                console.error(`Status: ${error.response.status}`);
                console.error('Response:', String(error.response.data).slice(0, 500));
                throw new Error(`SFMC SOAP error (${error.response.status}): ${String(error.response.data).slice(0, 200)}`);
            } else if (error.request) {
                console.error('No response received (possible network issue)');
                throw new Error('SFMC SOAP request failed: No response received');
            } else {
                throw new Error(`SFMC SOAP request failed: ${error.message}`);
            }
        }
    }
}