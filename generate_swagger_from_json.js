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

// Function to build cURL command including all headers
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
        curlCommand += ` -H "${headerName}: ${headerValue.replace(/"/g, '\\"')}"`;
    });

    // Add data to the cURL command if present and allowed for the method
    if (data && data !== 'undefined' && !['get', 'head'].includes(method.toLowerCase())) {
        const contentType = headers['Content-Type'] || headers['content-type'];

        if (contentType && contentType.includes('application/x-www-form-urlencoded')) {
            const formData = new URLSearchParams(data).toString();
            curlCommand += ` --data "${formData}"`;
        } else {
            curlCommand += ` --data '${JSON.stringify(data)}'`;
        }
    }

    return curlCommand;
};

// Function to determine the content type and format the request body
const getRequestBody = (data, headers, method) => {
    const contentType = headers['Content-Type'] || headers['content-type'];

    if (['get', 'head'].includes(method.toLowerCase())) {
        return null;
    }

    let requestBody = null;
    if (contentType) {
        if (contentType.includes('application/json')) {
            requestBody = {
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            example: typeof data === 'string' ? JSON.parse(data) : data
                        }
                    }
                }
            };
        } else if (contentType.includes('application/x-www-form-urlencoded')) {
            const formData = Object.fromEntries(new URLSearchParams(data));
            requestBody = {
                content: {
                    'application/x-www-form-urlencoded': {
                        schema: {
                            type: 'object',
                            properties: Object.keys(formData).reduce((acc, key) => {
                                acc[key] = { type: 'string', example: formData[key] };
                                return acc;
                            }, {})
                        }
                    }
                }
            };
        } else if (contentType.includes('multipart/form-data')) {
            requestBody = {
                content: {
                    'multipart/form-data': {
                        schema: {
                            type: 'object',
                            properties: {
                                file: {
                                    type: 'string',
                                    format: 'binary'
                                }
                            }
                        }
                    }
                }
            };
        } else {
            requestBody = {
                content: {
                    'text/plain': {
                        schema: {
                            type: 'string',
                            example: data
                        }
                    }
                }
            };
        }
    }

    return requestBody;
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

    // Determine the request body format based on content type
    const requestBody = getRequestBody(data, headers, method);

    // Convert base URLs array to server objects for Swagger
    const servers = baseURLs.map(url => ({ url }));

    // Reconstruct the cURL command
    const curlCommand = buildCurlCommand(curlDetails);

    // Define the security scheme dynamically
    const securitySchemes = {};
    let securityRequirement = [];
    if (headers['Authorization'] || headers['authorization']) {
        const authValue = headers['Authorization'] || headers['authorization'];
        if (authValue.startsWith('Bearer ')) {
            securitySchemes.BearerAuth = {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT'
            };
            securityRequirement = [{ BearerAuth: [] }];
        } else if (authValue.startsWith('Basic ')) {
            securitySchemes.BasicAuth = {
                type: 'http',
                scheme: 'basic'
            };
            securityRequirement = [{ BasicAuth: [] }];
        } else {
            securitySchemes.ApiKeyAuth = {
                type: 'apiKey',
                in: 'header',
                name: 'Authorization'
            };
            securityRequirement = [{ ApiKeyAuth: [] }];
        }
    }

    // Construct the Swagger specification
    const swagger = {
        openapi: '3.0.0',
        info: {
            title: 'Converted cURL to Swagger',
            version: '1.0.0'
        },
        servers: servers,
        components: {
            securitySchemes
        },
        paths: {
            [new URL(url).pathname]: {
                [method.toLowerCase()]: {
                    summary: 'Converted from cURL',
                    description: `Original cURL Command: \n\`${curlCommand}\``,
                    'x-curl-command': curlCommand,
                    requestBody: requestBody,
                    responses: {
                        '200': {
                            description: 'Successful response'
                        }
                    },
                    parameters: [
                        ...Object.entries(headers).map(([headerName, headerValue]) => ({
                            name: headerName,
                            in: 'header',
                            schema: {
                                type: 'string',
                                example: headerValue
                            }
                        })),
                        ...queryParams
                    ],
                    security: securityRequirement
                }
            }
        }
    };

    if (!requestBody) {
        delete swagger.paths[new URL(url).pathname][method.toLowerCase()].requestBody;
    }

    return swagger;
};

// Function to process JSON file and generate Swagger
export const processJsonFile = (inputFilePath, outputFilePath, baseURLs) => {
    try {
        const fileContent = fs.readFileSync(inputFilePath, 'utf8');
        const jsonData = typeof fileContent === 'string' ? JSON.parse(fileContent) : fileContent;

        const swaggerPaths = {};
        jsonData.forEach(curlDetails => {
            const swagger = generateSwagger(curlDetails, baseURLs);
            Object.assign(swaggerPaths, swagger.paths);
        });

        const servers = baseURLs.map(url => ({ url }));

        const finalSwagger = {
            openapi: '3.0.0',
            info: {
                title: 'Combined Swagger Specification',
                version: '1.0.0'
            },
            servers: servers,
            paths: swaggerPaths,
            components: {
                securitySchemes: {
                    BearerAuth: {
                        type: 'http',
                        scheme: 'bearer',
                        bearerFormat: 'JWT'
                    },
                    BasicAuth: {
                        type: 'http',
                        scheme: 'basic'
                    },
                    ApiKeyAuth: {
                        type: 'apiKey',
                        in: 'header',
                        name: 'Authorization'
                    }
                }
            }
        };

        fs.writeFileSync(outputFilePath, JSON.stringify(finalSwagger, null, 2));
        console.log(`Swagger JSON output saved to ${outputFilePath}`);
    } catch (error) {
        console.error('Error processing JSON file:', error);
    }
};
