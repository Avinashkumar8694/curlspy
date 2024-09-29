#!/usr/bin/env node

import puppeteer from 'puppeteer';
import chrome from 'chrome-aws-lambda';
import fs from 'fs';
import path from 'path';
import { Command } from 'commander';

// Initialize the command-line interface
const program = new Command();

program
    .option('-u, --url <url>', 'URL to scrape', 'https://www.google.com')
    .option('-rec, --record', 'Record test steps', false)
    .option('-p, --play', 'Play recorded test steps', false)
    .option('-d, --directory <directory>', 'Directory to save files', process.cwd());

program.parse(process.argv);

const options = program.opts();
const saveDirectory = options.directory;
const isRecording = options.record;
const isPlaying = options.play;
const testStepsFilePath = path.join(saveDirectory, 'test_steps.json');
let currentTestStep = 0;
let recordedTestSteps = [];

// Function to record test steps
const recordTestStep = async (action, target, value) => {
    if (isRecording) {
        recordedTestSteps.push({ action, target, value });
        fs.writeFileSync(testStepsFilePath, JSON.stringify(recordedTestSteps), 'utf-8');
        console.log('Test step recorded:', action, target, value);
    }
};

// Function to play back recorded test steps
const playTestStep = async (step, page) => {
    const { action, target, value } = step;
    switch (action) {
        case 'click':
            await page.click(target);
            break;
        case 'type':
            await page.type(target, value || '');
            break;
        case 'fileUpload':
            await page.evaluate(selector => {
                const input = document.querySelector(selector);
                if (input) {
                    input.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }, target);
            break;
        case 'hover':
            await page.hover(target);
            break;
        case 'rightClick':
            await page.click(target, { button: 'right' });
            break;
        case 'keyDown':
            await page.keyboard.press(value || '');
            break;
        default:
            console.error('Unsupported action:', action);
    }
};

// Helper function to inject listeners
const injectListeners = async (page) => {
    await page.evaluate(() => {
        const getSelector = (element) => {
            // Helper function to get unique attributes like ID or classes
            const getUniqueAttribute = (el) => {
                if (el.id) {
                    return `#${el.id}`; // Use ID if present and unique
                }
                if (el.className && el.className.trim() !== '') {
                    return `.${el.className.trim().split(/\s+/).join('.')}`; // Use class if available
                }
                return ''; // Fallback to tag name
            };
        
            // Build the full selector by traversing up the DOM tree
            const buildSelector = (el) => {
                let selector = getUniqueAttribute(el) || el.tagName.toLowerCase();
        
                // If ID or class makes it unique, stop here
                if (el.id || el.className) {
                    return selector;
                }
        
                // Continue with parent hierarchy if no unique selector found
                let parent = el.parentElement;
                while (parent) {
                    let siblingIndex = 1;
                    let totalSameTagSiblings = 0;
        
                    // Calculate how many sibling elements of the same type exist
                    for (let sibling of parent.children) {
                        if (sibling.tagName === el.tagName) {
                            totalSameTagSiblings++;
                        }
                    }
        
                    // Add nth-of-type if needed
                    if (totalSameTagSiblings > 1) {
                        siblingIndex = 1; // Reset index for nth-of-type
                        for (let sibling of parent.children) {
                            if (sibling === el) {
                                selector = `${parent.tagName.toLowerCase()} > ${el.tagName.toLowerCase()}:nth-of-type(${siblingIndex}) > ${selector}`;
                                break;
                            }
                            if (sibling.tagName === el.tagName) {
                                siblingIndex++;
                            }
                        }
                    } else {
                        // If no nth-of-type is needed, just add parent tag
                        selector = `${parent.tagName.toLowerCase()} > ${selector}`;
                    }
        
                    el = parent;
                    parent = parent.parentElement;
                }
        
                return selector;
            };
        
            // Final selector cleanup to avoid unnecessary child selectors
            return cleanUpSelector(buildSelector(element));
        };
        
        // Helper to remove unnecessary extra elements like repeated tags in final selector
        const cleanUpSelector = (xpath) => {
            const parts = xpath.split(' > ');
            
            // Array to hold cleaned parts
            const cleanedParts = [];
            
            for (let i = 0; i < parts.length; i++) {
                const part = parts[i];
        
                // Check if the current part contains 'nth-of-type'
                if (part.includes('nth-of-type')) {
                    cleanedParts.push(part); // Keep the nth-of-type part
                    
                    // Skip the next part if it's the same element type (without nth-of-type)
                    if (i + 1 < parts.length && parts[i + 1] === part.split(':nth-of-type')[0]) {
                        i++; // Skip the next part
                    }
                } else {
                    cleanedParts.push(part); // Add other parts
                }
            }
        
            // Join cleaned parts back into a single XPath string
            return cleanedParts.join(' > ');
        };
        
        

        // Remove existing listeners
        document.removeEventListener('click', window._clickListener);
        document.removeEventListener('input', window._inputListener);
        document.removeEventListener('mouseover', window._hoverListener);
        document.removeEventListener('contextmenu', window._contextMenuListener);
        document.removeEventListener('keydown', window._keyDownListener);
        document.removeEventListener('change', window._changeListener);

        // Define and set new listeners
        window._clickListener = (event) => {
            const target = event.target;
            if (target) {
                window.recordTestStep('click', getSelector(target));
            }
        };

        window._inputListener = (event) => {
            const target = event.target;
            if (target && (target.tagName.toLowerCase() === 'input' || target.tagName.toLowerCase() === 'textarea')) {
                window.recordTestStep('type', getSelector(target), (target.value || ''));
            }
        };

        window._hoverListener = (event) => {
            const target = event.target;
            if (target) {
                window.recordTestStep('hover', getSelector(target));
            }
        };

        window._contextMenuListener = (event) => {
            const target = event.target;
            if (target) {
                window.recordTestStep('rightClick', getSelector(target));
            }
        };

        window._keyDownListener = (event) => {
            window.recordTestStep('keyDown', event.key);
        };

        window._changeListener = (event) => {
            const target = event.target;
            if (target && (target.type === 'file')) {
                window.recordTestStep('fileUpload', getSelector(target));
            }
        };

        // Attach listeners
        document.addEventListener('click', window._clickListener);
        document.addEventListener('input', window._inputListener);
        // document.addEventListener('mouseover', window._hoverListener);
        document.addEventListener('contextmenu', window._contextMenuListener);
        document.addEventListener('keydown', window._keyDownListener);
        document.addEventListener('change', window._changeListener);

        window.addEventListener('beforeunload', () => {
            window.recordTestStep('pageRefresh', window.location.href);
        });
    });
};

(async () => {
    const browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        defaultViewport: null,
        executablePath: await chrome.executablePath,
        headless: false,
        timeout: 2400000
    });

    const page = await browser.newPage();

    // Expose function to the browser context
    await page.exposeFunction('recordTestStep', recordTestStep);

    // Attach listeners when page is loaded or navigated
    page.on('load', () => injectListeners(page));
    page.on('domcontentloaded', () => injectListeners(page));

    // Navigate to URL
    await page.goto(options.url);
    // Handle recorded test steps playback
    if (isPlaying) {
        if (fs.existsSync(testStepsFilePath)) {
            recordedTestSteps = JSON.parse(fs.readFileSync(testStepsFilePath, 'utf-8'));
            for (const step of recordedTestSteps) {
                await playTestStep(step, page);
            }
        } else {
            console.error(`Test steps file not found at ${testStepsFilePath}`);
        }
    }


    // Close the browser
    // await browser.close();
})();
