# WPEngine API Toolkit

A toolkit for managing sites using the WPEngine API. This toolkit currently contains one command: `wpesetup`

The command `wpesetup` will create a Site, Environment, and Install in your WPEngine account. It will then monitor the install and wait for it to be active before ending the prompt.

## Installation

1.  Setup environment variables for WPENGINE_PASSWORD, WPENGINE_USER_ID, and WPENGINE_ACCOUNTID. [Reference WPEngine API.]([https://wpengineapi.com/)
2.  Run `npm install`
3.  Run `npm link` to create commands
4.  Run `wpesetup` to begin site setup.

## Known Issues

-   Must have an account that supports Sites and Environments.

## To-do

-   Add command to quickly retrieve account ID. Consider not storing account ID in env variables.
-   When install becomes active, trigger additional setup such as password reset and legacy staging site creation.
-   Make modular so this can be included as part of a dev / staging automated setup.
