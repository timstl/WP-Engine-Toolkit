
#  WP Engine API Toolkit

A toolkit for managing sites using the WP Engine API. Currently supports creating a new site, environment, and install, or pulling account information. This setup process automates tasks that we normally would be doing manually. While a config is included to allow for some flexibility, you may find it necessary to fork and modify to fit your process.

<img  src="https://github.com/timstl/WP-Engine-Toolkit/raw/master/lib/img/screenshot.png"  alt="terminal screenshot"  width="600"  />

## Prerequisites

 - You must have WP Engine API access enabled and your environment variables setup: WPENGINE_PASSWORD and WPENGINE_USER_ID. [Reference WP Engine API.](https://wpengineapi.com/)
 - Your WP Engine account must support SSH. This is required to install plugins (which are optional), and reset the main user password (not optional).
 - You must have an SSH key added to your WP Engine account. Your key can't require a password at this time.
 - You must have an account that supports Sites and Environments.

##  Installation

 1. Setup the WP Engine API and your SSH key as outlined above.
2. Run `npm install`
3. Run `npm link` to create commands
4. Run `wpe` to launch toolkit

The first time you run `wpe` your WP Engine account IDs will be displayed, and you will be prompted to add them to your config.json. After this is complete `wpe` will give you 3 options: setup, accounts, quit.

## Commands

### setup

The `setup` command will perform several tasks:

 1. Creates a Site, Environment and Install with provided names.
 2. Pauses and monitors the new install until it switches from "Pending" to "Active" status.
 3. Updates WordPress core.
 4. Installs plugins included in config.json (optional).
 5. Updates plugins.
 6. Activates WP Migrate DB Pro license and outputs connection string (optional).
 7. Resets primary WordPress user password.
 8. Deploys Legacy Staging (optional).

### accounts

The `accounts` command outputs JSON object that includes all account IDs that you have access to.

## Config

In order to use this tool you must have a valid config.json file. A sample is included.

 - wpengine
	 - **default_wp_user:** The default username used by WP Engine when a new WP install is created. Typically your account login email.
	 - **accounts:** An array of objects in key:string format* (Example: "accounts": [{"id": "XXXXXX-XXXXXX-XXXXX-XXXXX"}]). `wpe` will assist you in finding your account ID the first time it is able to connect to the WP Engine API.
 - setup
	 - plugins
		 - **enabled:** (true or false) Must enable and provide array of plugins to install
		 - **private_key:** Your local private key used to access WP Engine via SSH. Your private key cannot require a password.
		 - **sites_path:** The path to sites on your WP Engine server. (Typically: "/home/wpe-user/sites/")
		 - **activate:** An array of plugins to install and activate via WP-CLI. WP-CLI supports both plugin slugs and URLs. You can host plugins that aren't in the WordPress repository on a server and provide URLs to zip files in this array.
		 - migratedb
			 -  **enabled:** (true or false). In addition to enabling, you must also include Migrate DB Pro in the *setup.plugins.activate* array above, along with any add-ons you'd like to install.
			 - **license:** Your Migrate DB Pro license key.
	 - legacy_staging
		 - **enabled:** (true or false). If enabled, deployment of your legacy staging environment will be automatically triggered.

##  To-do

 - Add support for multiple account IDs. Right now only the first account ID is used.
 - Add support for all available WP Engine API endpoints.