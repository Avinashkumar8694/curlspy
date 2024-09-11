import fs from 'fs';

// Function to extract query parameters from a URL
const getQueryParameters = (url) => {
    const urlObj = new URL(url);
    const queryParams = [];
    urlObj.searchParams.forEach((value, key) => {
        queryParams.push({
            key,
            value,
            description: '',
            disabled: false
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

// Function to generate a Postman request item
const generatePostmanRequest = (curlDetails, environmentVariables) => {
    const {
        url,
        method = 'get',
        headers = {},
        data = {}
    } = curlDetails;

    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname;
    const requestPath = parsedUrl.pathname + (parsedUrl.search ? parsedUrl.search : '');

    // Use the environment variable for the base URL
    const baseUrlVariable = environmentVariables[hostname] || `{{BASE_URL}}`; // Fallback to a default
    const envUrl = `${baseUrlVariable}${requestPath}`;

    const queryParams = getQueryParameters(url);

    const requestHeaders = Object.entries(headers).map(([key, value]) => ({
        key,
        value
    }));

    return {
        name: parsedUrl.pathname,
        request: {
            method: method.toUpperCase(),
            header: requestHeaders,
            url: {
                raw: envUrl,
                host: [baseUrlVariable],
                path: requestPath.split('/').filter(part => part),
                query: queryParams
            },
            body: data && method.toLowerCase() !== 'get' ? {
                mode: 'raw',
                raw: JSON.stringify(data),
                options: {
                    raw: {
                        language: 'json'
                    }
                }
            } : undefined,
            description: `Converted from cURL command: ${buildCurlCommand(curlDetails)}`
        }
    };
};

// Function to create a Postman collection
const generatePostmanCollection = (curlData, environmentVariables) => {
    const postmanCollection = {
        info: {
            name: 'Generated Postman Collection',
            schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
        },
        item: curlData.map(curlDetails => generatePostmanRequest(curlDetails, environmentVariables))
    };
    return postmanCollection;
};

// Function to create environment variables in Postman
const generatePostmanEnvironment = (envName, baseUrls) => {
    const environment = {
        name: envName,
        values: baseUrls.map(url => ({
            key: url.key,
            value: url.value,
            enabled: true
        }))
    };
    return environment;
};

// Function to process JSON file and generate Postman collection and environment
export const processJsonFileForPostman = (inputFilePath, outputCollectionPath, outputEnvPath) => {
    try {
        const fileContent = fs.readFileSync(inputFilePath, 'utf8');
        const jsonData = typeof fileContent === 'string' ? JSON.parse(fileContent) : fileContent;

        // Find all unique hostnames and create environment variables
        const environmentVariables = {};
        jsonData.forEach(curlDetails => {
            const parsedUrl = new URL(curlDetails.url);
            const hostname = parsedUrl.hostname;
            if (!environmentVariables[hostname]) {
                environmentVariables[hostname] = `{{BASE_URL_${Object.keys(environmentVariables).length + 1}}}`;
            }
        });

        // Generate the Postman Collection
        const postmanCollection = generatePostmanCollection(jsonData, environmentVariables);

        // Generate the Postman Environment
        const postmanEnvironment = generatePostmanEnvironment('My Environment', Object.entries(environmentVariables).map(([key, value]) => ({
            key: value.replace('{{', '').replace('}}', ''), // Remove braces for environment key names
            value: `https://${key}`, // Use the original hostname as the value
        })));

        // Write the Postman Collection and Environment to files
        fs.writeFileSync(outputCollectionPath, JSON.stringify(postmanCollection, null, 2));
        fs.writeFileSync(outputEnvPath, JSON.stringify(postmanEnvironment, null, 2));

        console.log(`Postman Collection output saved to ${outputCollectionPath}`);
        console.log(`Postman Environment output saved to ${outputEnvPath}`);
    } catch (error) {
        console.error('Error processing JSON file:', error);
    }
};
