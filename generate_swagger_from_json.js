import fs from 'fs';

// Function to generate Swagger specification from parsed cURL details
const generateSwagger = (curlDetails, baseURLs) => {
    const {
        url,
        method = 'get',
        headers = {},
        data = {}
    } = curlDetails;

    // Handle cases where data is 'undefined'
    const requestBody = {
        content: {
            'application/json': {
                schema: {
                    type: 'object',
                    properties: {}
                }
            }
        }
    };

    if (data !== 'undefined') {
        requestBody.content['application/json'].schema = {
            type: 'object',
            example: data
        };
    } else {
        requestBody.content['application/json'].schema = {
            type: 'object',
            example: {}
        };
    }

    // Convert base URLs array to server objects for Swagger
    const servers = baseURLs.map(url => ({ url }));

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
                    requestBody: requestBody,
                    responses: {
                        '200': {
                            description: 'Successful response'
                        }
                    },
                    parameters: Object.keys(headers).map(headerName => ({
                        name: headerName,
                        in: 'header',
                        schema: {
                            type: 'string'
                        }
                    }))
                }
            }
        }
    };

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
