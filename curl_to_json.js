import fs from 'fs';
import { toJsonString } from 'curlconverter';

// Function to convert a single cURL command to JSON
const convertCurlToJson = (curlCommand) => {
    try {
        // Convert cURL command to JSON
        const json = toJsonString(curlCommand);
        return JSON.parse(json); // Ensure the result is parsed to an object
    } catch (error) {
        console.error('Error converting cURL to JSON:', error);
        return null;
    }
};

// Function to process the cURL commands file
export const processCurlFile = (inputFilePath, outputFilePath) => {
    try {
        // Read cURL commands from the file
        const curlCommands = fs.readFileSync(inputFilePath, 'utf8').split('\n').filter(line => line.trim() !== '');

        // Initialize an array to store JSON results
        const jsonResults = [];

        // Process each cURL command
        curlCommands.forEach(curlCommand => {
            const json = convertCurlToJson(curlCommand);
            if (json) {
                jsonResults.push(json);
            }
        });

        // Write JSON results to the output file
        fs.writeFileSync(outputFilePath, JSON.stringify(jsonResults, null, 2));
        console.log(`JSON output saved to ${outputFilePath}`);
    } catch (error) {
        console.error('Error processing cURL commands:', error);
    }
};

// Example usage
const inputFilePath = 'curl_commands.txt'; // Input file with cURL commands
const outputFilePath = 'curl-to-json.json'; // Output file for JSON results

processCurlFile(inputFilePath, outputFilePath);
