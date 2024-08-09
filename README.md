# curlspy

`curlspy` is a CLI tool to scrape URLs and generate curl commands using Puppeteer. It allows you to intercept network requests and convert them into curl commands for easy replication and testing.

## Features

- Scrape URLs and generate cURL commands
- Convert cURL commands to JSON
- Generate Swagger specifications from JSON
- Save scraped URLs and cURL commands to files
- Periodically save URLs and cURL commands

## Installation

To install CurlSpy, you need to have [Node.js](https://nodejs.org/) version 18 or higher. Then, you can install CurlSpy globally using npm:

```bash
    npm install -g curlspy

    Usage
    The curlspy CLI tool accepts the following optional arguments:

    --skipKeywords (-k): Comma separated skip keywords (default: "dist,assets,embed,Icons,static,auth,constants,locales,dcp-oauth,interaction,.js,.css,.ttf,.pdf,.png,.svg,.jpg,.ico,data:,www.google,analytics.,px.ads,googleads,/t.co")
    --methods (-m): HTTP methods to scrape (default: "POST,PUT,DELETE,GET")
    --url (-u): URL to scrape (default: "https://www.google.com")
    --interval (-i): Interval to save to file in seconds (default: 15)
```
## Usage
### Scrape URLs and Generate cURL Commands
- To scrape URLs and generate cURL commands, run:
```bash
    curlspy -u <url> -d <directory>
```
### Options:
- -u, --url <url>: The URL to scrape. (Default: https://www.google.com)
- -d, --directory <directory>: Directory to save files. (Default: Current working directory)
- -k, --skipKeywords <keywords>: Comma-separated list of keywords to skip URLs. (Default: dist,assets,embed,Icons,static,auth,constants,locales,dcp-oauth,interaction,.js,.css,.ttf,.pdf,.png,.svg,.jpg,.ico,data:,www.google,analytics.,px.ads,googleads,/t.co)
- -m, --methods <methods>: HTTP methods to scrape. (Default: POST,PUT,DELETE,GET)
- -i, --interval <interval>: Interval to save to file in seconds. (Default: 15)
- -r, --restore <restore>: option to load exist curl and urls to continue with the same otherwise it will create new

## Generate Swagger Specification

```bash 
    curlspy -g -j <json-file> -s <swagger-file>
```
### Options:
- -g, --generate-swagger: Flag to generate Swagger specification.
- -j, --json-file <file>: Path to the JSON file with cURL commands. (Default: curl-to-json.json)
- -s, --swagger-file <file>: Path to save the generated Swagger specification. (Default: swagger.json)

## Example

- Start scraping and generating cURL commands:
```bash 
    curlspy -u https://www.example.com -d ./data
```

- Generate Swagger specification from the cURL commands:

```bash 
    curlspy -g -j ./data/curl-to-json.json -s ./data/swagger.json
```

## CLI Commands
### Display help information:
```bash
    curlspy -h
```


## Development
- To contribute to CurlSpy, clone the repository and install dependencies:
```bash
    git clone https://github.com/Avinashkumar8694/curlspy.git
    cd curlspy
    npm install
```

- To run the tool locally:
```
    npm start -- -u <url> -d <directory>
```

## License
- CurlSpy is licensed under the MIT License. See the LICENSE file for more details.

## Author
Avinash Kumar Gupta
Email: avinash.kumar8694@gmail.com
GitHub: Avinashkumar8694


This `README.md` file includes installation instructions, usage examples, CLI commands, and development guidelines. You can adjust the details to fit any additional requirements or changes to the project.
