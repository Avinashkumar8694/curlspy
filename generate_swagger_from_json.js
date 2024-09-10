import fs from 'fs';

// Function to extract query parameters from a URL
const getQueryParameters = (url) => {
    const urlObj = new URL(url);
    const queryParams = [];
    urlObj.searchParams.forEach((value, key) => {
        queryParams.push({
            name: key,
            in: 'query',
            schema: {
                type: 'string'
            },
            example: value
        });
    });
    return queryParams;
};

// Function to reconstruct the original cURL command
const buildCurlCommand = (curlDetails) => {
    const {
        url,
        method = 'get',
        headers = {},
        data
    } = curlDetails;

    let curlCommand = `curl -X ${method.toUpperCase()} "${url}"`;

    // Add headers to the cURL command
    Object.entries(headers).forEach(([headerName, headerValue]) => {
        curlCommand += ` -H "${headerName}: ${headerValue}"`;
    });

    // Add data to the cURL command, if present and allowed for the method
    if (data && data !== 'undefined' && !['get', 'head'].includes(method.toLowerCase())) {
        curlCommand += ` --data '${JSON.stringify(data)}'`;
    }

    return curlCommand;
};

// Function to generate Swagger specification from parsed cURL details
const generateSwagger = (curlDetails, baseURLs) => {
    const {
        url,
        method = 'get',
        headers = {},
        data = {}
    } = curlDetails;

    // Extract query parameters from the URL
    const queryParams = getQueryParameters(url);

    // Handle cases where data is 'undefined' or the method doesn't support a body
    let requestBody = null;
    if (!['get', 'head'].includes(method.toLowerCase())) {
        requestBody = {
            content: {
                'application/json': {
                    schema: {
                        type: 'object',
                        example: data !== 'undefined' ? data : {}
                    }
                }
            }
        };
    }

    // Convert base URLs array to server objects for Swagger
    const servers = baseURLs.map(url => ({ url }));

    // Reconstruct the cURL command
    const curlCommand = buildCurlCommand(curlDetails);

    // Construct the Swagger specification
    const swagger = {
        openapi: '3.0.0',
        info: {
            title: 'Converted cURL to Swagger',
            version: '1.0.0'
        },
        servers: servers, // Add multiple server URLs
        paths: {
            [new URL(url).pathname]: {
                [method.toLowerCase()]: {
                    summary: 'Converted from cURL',
                    description: `cURL: \n\`${curlCommand}\``, // Add cURL as a description
                    'x-curl-command': curlCommand, // Add cURL as an OpenAPI extension
                    requestBody: requestBody, // Include requestBody only if method supports it
                    responses: {
                        '200': {
                            description: 'Successful response'
                        }
                    },
                    parameters: [
                        // Combine headers and query parameters
                        ...Object.keys(headers).map(headerName => ({
                            name: headerName,
                            in: 'header',
                            schema: {
                                type: 'string'
                            }
                        })),
                        ...queryParams
                    ]
                }
            }
        }
    };

    // Remove requestBody if it's null
    if (!requestBody) {
        delete swagger.paths[new URL(url).pathname][method.toLowerCase()].requestBody;
    }

    return swagger;
};

// Function to process JSON file and generate Swagger
export const processJsonFile = (inputFilePath, outputFilePath, baseURLs) => {
    try {
        // Read JSON data from the file
        const jsonData = JSON.parse(fs.readFileSync(inputFilePath, 'utf8'));

        // Generate Swagger for each entry in the JSON file
        const swaggerPaths = {};
        jsonData.forEach(curlDetails => {
            const swagger = generateSwagger(curlDetails, baseURLs);
            Object.assign(swaggerPaths, swagger.paths);
        });

        // Convert base URLs array to server objects for Swagger
        const servers = baseURLs.map(url => ({ url }));

        // Construct the final Swagger specification
        const finalSwagger = {
            openapi: '3.0.0',
            info: {
                title: 'Combined Swagger Specification',
                version: '1.0.0'
            },
            servers: servers, // Add multiple server URLs
            paths: swaggerPaths
        };

        // Write Swagger JSON to the output file
        fs.writeFileSync(outputFilePath, JSON.stringify(finalSwagger, null, 2));
        console.log(`Swagger JSON output saved to ${outputFilePath}`);
    } catch (error) {
        console.error('Error processing JSON file:', error);
    }
};

// Example usage
// const inputFilePath = 'curl-to-json.json'; // Input file with JSON data
// const outputFilePath = 'swagger.json'; // Output file for Swagger JSON
// const baseURLs = ['https://api.example.com', 'https://api-backup.example.com']; // Array of base URLs for the server

// processJsonFile(inputFilePath, outputFilePath, baseURLs);
