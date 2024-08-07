# curlspy

`curlspy` is a CLI tool to scrape URLs and generate curl commands using Puppeteer. It allows you to intercept network requests and convert them into curl commands for easy replication and testing.

## Features

- Intercepts HTTP requests and generates curl commands.
- Customizable keywords to skip specific URLs.
- Supports filtering by HTTP methods.
- Periodically saves unique URLs and curl commands to files.

## Installation

To install `curlspy` globally, use npm:

```bash
    npm install -g curlspy

    Usage
    The curlspy CLI tool accepts the following optional arguments:

    --skipKeywords (-k): Comma separated skip keywords (default: "dist,assets,embed,Icons,static,auth,constants,locales,dcp-oauth,interaction,.js,.css,.ttf,.pdf,.png,.svg,.jpg,.ico,data:,www.google,analytics.,px.ads,googleads,/t.co")
    --methods (-m): HTTP methods to scrape (default: "POST,PUT,DELETE,GET")
    --url (-u): URL to scrape (default: "https://www.google.com")
    --interval (-i): Interval to save to file in seconds (default: 15)
```
## Example
To scrape a specific URL and generate curl commands, run:
```bash
    curlspy --skipKeywords "dist,assets" --methods "GET,POST" --url "https://example.com" --interval 10
```
This command will skip URLs containing "dist" or "assets", only intercept GET and POST requests, start scraping from https://example.com, and save unique URLs and curl commands every 10 seconds.

### How It Works:
- Launch Puppeteer: The tool launches a Puppeteer browser instance in non-headless mode.
- Intercept Requests: It intercepts network requests and filters them based on the provided keywords and HTTP methods.
- Generate Curl Commands: For each intercepted request, a corresponding curl command is generated.
- Save to Files: Unique URLs and curl commands are periodically saved to urls.json and curl_commands.txt respectively.

