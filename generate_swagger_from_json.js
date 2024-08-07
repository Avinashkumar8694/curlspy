import fs from 'fs';

// Function to generate Swagger specification from parsed cURL details
const generateSwagger = (curlDetails) => {
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

    // Construct the Swagger specification
    const swagger = {
        openapi: '3.0.0',
        info: {
            title: 'Converted cURL to Swagger',
            version: '1.0.0'
        },
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
const processJsonFile = (inputFilePath, outputFilePath) => {
    try {
        // Read JSON data from the file
        const jsonData = JSON.parse(fs.readFileSync(inputFilePath, 'utf8'));

        // Generate Swagger for each entry in the JSON file
        const swaggerPaths = {};
        jsonData.forEach(curlDetails => {
            const swagger = generateSwagger(curlDetails);
            Object.assign(swaggerPaths, swagger.paths);
        });

        // Construct the final Swagger specification
        const finalSwagger = {
            openapi: '3.0.0',
            info: {
                title: 'Combined Swagger Specification',
                version: '1.0.0'
            },
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
const inputFilePath = 'curl-to-json.json'; // Input file with JSON data
const outputFilePath = 'swagger.json'; // Output file for Swagger JSON

processJsonFile(inputFilePath, outputFilePath);
