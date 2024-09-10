#!/usr/bin/env node

// Import required modules
import * as puppeteer from 'puppeteer';
import * as chrome from 'chrome-aws-lambda';
import * as fs from 'fs';
import * as path from 'path';
import { Command } from 'commander';
import { processCurlFile } from './curl_to_json.js';
import { processJsonFile } from './generate_swagger_from_json.js';

// Initialize the command-line interface
const program = new Command();

program
    .option('-sk, --skipKeywords <keywords>', 'Comma separated skip keywords', 'dist,assets,embed,Icons,static,auth,constants,locales,dcp-oauth,interaction,.js,.css,.ttf,.pdf,.png,.svg,.jpg,.ico,data:,www.google,analytics.,px.ads,googleads,/t.co')
    .option('-ik, --includeKeywords <keywords>', 'Comma separated include keywords', '')
    .option('-m, --methods <methods>', 'HTTP methods to scrape', 'POST,PUT,DELETE,GET')
    .option('-a, --all <all>', 'collect all curl', 'true')
    .option('-u, --url <url>', 'URL to scrape', 'https://www.google.com')
    .option('-i, --interval <interval>', 'Interval to save to file in seconds', '15')
    .option('-r, --restore <restore>', 'option to load exist curl and urls to continue with the same', 'false')
    .option('-d, --directory <directory>', 'Directory to save files', process.cwd())
    .option('-g, --generate-swagger', 'Generate Swagger specification from cURL commands')
    .option('-j, --json-file <file>', 'Path to the JSON file with cURL commands', 'curl-to-json.json')
    .option('-s, --swagger-file <file>', 'Path to save the generated Swagger specification', 'swagger.json');

program.parse(process.argv);

const options = program.opts();
const skipKeywords = options.skipKeywords?.length ? options.skipKeywords.split(',') : [];
const includeKeywords = options.includeKeywords?.length ? options.includeKeywords.split(',') : [];
const httpMethods = options.methods.split(',');
const saveDirectory = options.directory;
const restore = options.restore == 'true';
const all = options.all;
const urlsFilePath = path.join(saveDirectory, 'urls.json');
const curlCommandsFilePath = path.join(saveDirectory, 'curl_commands.txt');
const jsonFilePath = path.join(saveDirectory, options.jsonFile);
const swaggerFilePath = path.join(saveDirectory, options.swaggerFile);

// // Create necessary files if they don't exist
// const createFileIfNotExists = (filePath) => {
//     if (!fs.existsSync(filePath)) {
//         fs.writeFileSync(filePath, '', 'utf-8');
//     }
// };

// Create file
const createFile = (filePath, data) => {
    fs.writeFileSync(filePath, data, 'utf-8');
};

if(!restore){
    if(!options.generateSwagger){
        createFile(curlCommandsFilePath, '');
        createFile(jsonFilePath, '[]');
    }
}

// // Ensure necessary files are created
// createFileIfNotExists(curlCommandsFilePath);
// createFileIfNotExists(jsonFilePath);

if (options.generateSwagger) {
    // Generate Swagger specification from cURL commands
    // Ensure the JSON file is created before processing
    try {
        console.log('Converting cURL commands to JSON...');
        processCurlFile(curlCommandsFilePath, jsonFilePath);

        // Check if the JSON file was created
        if (fs.existsSync(jsonFilePath)) {
            console.log('Generating Swagger specification from JSON...');
            processJsonFile(jsonFilePath, swaggerFilePath);
        } else {
            console.error(`Error: JSON file ${jsonFilePath} not found.`);
        }
    } catch (error) {
        console.error('Error generating Swagger:', error);
    }
} else {
    (async () => {
        const browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            defaultViewport: null,
            executablePath: await chrome.executablePath,
            headless: false,
        });

        const page = await browser.newPage();

        const uniqueUrls = new Set();
        const curlCommands = [];

        // Load URLs from file if it exists
        if (fs.existsSync(urlsFilePath)) {
            const storedUrls = JSON.parse(fs.readFileSync(urlsFilePath, 'utf-8'));
            storedUrls.forEach(url => uniqueUrls.add(url));
            console.log(`Loaded ${storedUrls.length} URLs from ${urlsFilePath}`);
        }

        // Load existing cURL commands from file if it exists
        if (fs.existsSync(curlCommandsFilePath)) {
            const storedCurlCommands = fs.readFileSync(curlCommandsFilePath, 'utf-8').split('\n');
            storedCurlCommands.forEach(command => {
                if (command) {
                    curlCommands.push(command);
                }
            });
            console.log(`Loaded ${storedCurlCommands.length} cURL commands from ${curlCommandsFilePath}`);
        }

        // Function to save unique URLs to a file
        const saveUniqueUrls = () => {
            fs.writeFileSync(urlsFilePath, JSON.stringify([...uniqueUrls]), 'utf-8');
            console.log(`Saved ${uniqueUrls.size} unique URLs to ${urlsFilePath}`);
        };

        // Intercept network requests
        await page.setRequestInterception(true);
        page.on('request', async request => {
            const url = request.url();

            // Check if URL contains any of the skip keywords
            if (skipKeywords.some(keyword => url.includes(keyword)) || !httpMethods.includes(request.method()) || includeKeywords.length && !includeKeywords.some(keyword => url.includes(keyword))) {
                request.continue();
                return;
            }
            const _continue = all == 'true' ? true : !uniqueUrls.has(url)
            if (_continue) {
                uniqueUrls.add(url);

                // Generate cURL command
                const headers = request.headers();
                let curlCommand = `curl '${url}'`;

                for (const [key, value] of Object.entries(headers)) {
                    curlCommand += ` -H '${key}: ${value}'`;
                }

                if (['POST', 'PUT'].includes(request.method())) {
                    const postData = request.postData();
                    curlCommand += ` --data '${postData}'`;
                }

                curlCommands.push(curlCommand);

                // Append the new cURL command to the file
                fs.appendFileSync(curlCommandsFilePath, curlCommand + '\n', 'utf-8');
            }
            request.continue();
        });

        // Keep the browser open to continue recording
        console.log('Browser is open. Navigate to different URLs to record cURL commands.');

        // Save URLs periodically
        const saveInterval = setInterval(saveUniqueUrls, options.interval * 1000); // Save at specified interval

        // Navigate to the specified URL
        await page.goto(options.url);

        // Optionally close the browser after a certain time
        // setTimeout(async () => {
        //     clearInterval(saveInterval);
        //     await browser.close();
        // }, 600000); // Close after 10 minutes

        // Close the browser
        // await browser.close();
    })();
}
