#!/usr/bin/env node

const puppeteer = require('puppeteer');
const chrome = require('chrome-aws-lambda');
const fs = require('fs');
const path = require('path');
const { Command } = require('commander');

const program = new Command();

program
    .option('-k, --skipKeywords <keywords>', 'Comma separated skip keywords', 'dist,assets,embed,Icons,static,auth,constants,locales,dcp-oauth,interaction,.js,.css,.ttf,.pdf,.png,.svg,.jpg,.ico,data:,www.google,analytics.,px.ads,googleads,/t.co')
    .option('-m, --methods <methods>', 'HTTP methods to scrape', 'POST,PUT,DELETE,GET')
    .option('-u, --url <url>', 'URL to scrape', 'https://www.google.com')
    .option('-i, --interval <interval>', 'Interval to save to file in seconds', '15')
    .option('-d, --directory <directory>', 'Directory to save files', process.cwd());

program.parse(process.argv);

const options = program.opts();
const skipKeywords = options.skipKeywords.split(',');
const httpMethods = options.methods.split(',');
const saveDirectory = options.directory;

const urlsFilePath = path.join(saveDirectory, 'urls.json');
const curlCommandsFilePath = path.join(saveDirectory, 'curl_commands.txt');

(async () => {
    const browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox'] ,
        defaultViewport: null,
        executablePath: await chrome.executablePath,
        headless:  false,
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

    // Load existing curl commands from file if it exists
    if (fs.existsSync(curlCommandsFilePath)) {
        const storedCurlCommands = fs.readFileSync(curlCommandsFilePath, 'utf-8').split('\n');
        storedCurlCommands.forEach(command => {
            if (command) {
                curlCommands.push(command);
            }
        });
        console.log(`Loaded ${storedCurlCommands.length} curl commands from ${curlCommandsFilePath}`);
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
        if (skipKeywords.some(keyword => url.includes(keyword)) || !httpMethods.includes(request.method())) {
            request.continue();
            return;
        }

        if (!uniqueUrls.has(url)) {
            uniqueUrls.add(url);

            // Generate curl command
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
            console.log(curlCommand);

            // Append the new curl command to the file
            fs.appendFileSync(curlCommandsFilePath, curlCommand + '\n', 'utf-8');
        }
        request.continue();
    });

    // Keep the browser open to continue recording
    console.log('Browser is open. Navigate to different URLs to record curl commands.');

    // Save URLs periodically
    const saveInterval = setInterval(saveUniqueUrls, options.interval * 1000); // Save at specified interval

    // Navigate to the specified URL
    await page.goto(options.url);

    // Optionally close the browser after a certain time
    // setTimeout(async () => {
    //     clearInterval(saveInterval);
    //     await browser.close();
    // }, 600000); // Close after 10 minutes
})();
