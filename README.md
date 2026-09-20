![Logo](admin/web-watch.png)
# ioBroker.web-watch

[![NPM version](https://img.shields.io/npm/v/iobroker.web-watch.svg)](https://www.npmjs.com/package/iobroker.web-watch)
[![Downloads](https://img.shields.io/npm/dm/iobroker.web-watch.svg)](https://www.npmjs.com/package/iobroker.web-watch)
![Number of Installations](https://iobroker.live/badges/web-watch-installed.svg)
![Current version in stable repository](https://iobroker.live/badges/web-watch-stable.svg)

[![NPM](https://nodei.co/npm/iobroker.web-watch.png?downloads=true)](https://nodei.co/npm/iobroker.web-watch/)

**Tests:** ![Test and Release](https://github.com/rg-engineering/ioBroker.web_watch/workflows/Test%20and%20Release/badge.svg)

**If you like it, please consider a donation:**
                                                                          
[![paypal](https://www.paypalobjects.com/en_US/DK/i/btn/btn_donateCC_LG.gif)](https://www.paypal.com/donate/?hosted_button_id=34ESBMJ932QZC) 



## web-watch adapter for ioBroker

web-watch regularly searches the web for information based on a search query defined by the user and optionally uses Google Gemini AI to analyze and process the search results.

## How it works
### Web Search
web-watch uses the Google Search API to search the web for the configured query.

### AI Processing
The search results are then passed to the Google Gemini API for further processing. You can configure the Gemini prompt yourself to define what the AI should extract, analyze or summarize.

If available, the web search results are automatically added to the AI prompt.

Both functions can be enabled or disabled independently. This allows you to use web search only, AI processing only, or combine both.

### API Keys

You need your own API key for both services:

(Google Search API)[https://serpapi.com/dashboard] – required for web searches
(Google Gemini API)[https://ai.google.dev/api/interactions-api?hl=de] – required for AI processing

You must create and configure these API keys yourself through the respective Google services. The API keys are not included with web_watch.

### Free Tier Limitations

Please be aware that both Google services are subject to usage limits and quotas, especially when using their free tiers. Limits may include the number of requests per day, rate limits, or restrictions on available models and services.

The exact limits and pricing can change over time. Please check the current Google documentation and your API account for the applicable limits and costs.

Using web_watch with frequent searches or AI processing may therefore result in reaching the free-tier limits or generating additional API costs.


## known issues
* please create issues at [github](https://github.com/rg-engineering/ioBroker.web_watch/issues) if you find bugs or whish new features.

## Changelog
<!--
  Placeholder for the next version (at the beginning of the line):
  ### **WORK IN PROGRESS**
-->
### 0.0.4 (2026-09-20)
* (Rene) initial release





[Older changelogs can be found there](CHANGELOG_OLD.md)

## License
MIT License

Copyright (c) 2026 Rene <info@rg-engineering.eu>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.