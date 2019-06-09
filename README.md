# WP Engine API Toolkit

A toolkit for managing sites using the WP Engine API. Currently supports creating a new site, environment, and install, or pulling account information.

<img src="https://github.com/timstl/WP-Engine-Toolkit/raw/master/lib/img/screenshot.png" alt="terminal screenshot" width="600" />

## Installation

1.  Setup environment variables for WPENGINE_PASSWORD and WPENGINE_USER_ID. [Reference WP Engine API.](https://wpengineapi.com/)
2.  Run `npm install`
3.  Run `npm link` to create commands
4.  Run `wpe` to launch toolkit

The first time you run `wpe` you will be prompted to create a wpeaccounts.json file, which contains your account IDs. Once this file is created `wpe` will give you 3 options: setup, accounts, quit.

## Known Issues

-   Must have an account that supports Sites and Environments.
-   Only supports 1 account ID at this time.
