#! /usr/bin/env node
const colors = require("colors");

const WPEAccess = require("./lib/wpeaccess");
const wpeaccess = new WPEAccess();
const wpeauth = wpeaccess.getauth();

const WPEConfig = require("./lib/wpeconfig");
const wpeconfig = new WPEConfig();

/**
 * Start our WPE prompt.
 */
function startwpe() {
	/**
	 * Only supports 1 account right now but could support multiple in the future.
	 */
	const wpe_account_id = wpeconfig.getaccountid();

	const prompt = require("prompt-promise");

	console.log("\r\nWhat would you like to do?\r\n".yellow.bold);
	console.log(
		"setup".blue.bold,
		"[creates a new site, environment, and install]"
	);
	console.log(
		"accounts".blue.bold,
		"[lists accounts you have access to (limit: 100)]"
	);
	console.log("quit, q".blue.bold, "[exit WP Engine Toolkit]\r\n");

	prompt("command: ")
		.then(async function wpego(val) {
			if (val === "accounts") {
				/**
				 * Display accounts
				 */
				const WPEAccounts = require("./lib/wpeaccounts");
				const wpeaccounts = new WPEAccounts(wpeauth);
				await wpeaccounts.consoleaccounts();
				prompt.finish();
			} else if (val === "setup") {
				/**
				 * Setup a new site and install.
				 */
				const WPESetup = require("./lib/wpesetup");
				const wpesetup = new WPESetup(wpeauth, wpe_account_id);
				await wpesetup.dosetup();
				//prompt.finish();
			} else if (val === "q" || val === "quit") {
				/**
				 * Quit
				 */
				prompt.finish();
			} else {
				/**
				 * Blank, start over.
				 */
				startwpe();
				return false;
			}
		})
		.catch(function rejected(err) {
			console.log("error:", err.stack);
			prompt.finish();
		});
}

/**
 * Verify we have a valid authorization string for API calls.
 */
if (!wpeauth) {
	console.log(
		"Your API access doesn't appear to be setup.\r\nGenerate API keys in your WP Engine account and export them as environment variables (~/.bash_profile)\r\nReference: http://wpengineapi.com\r\nAlready done this? Try restarting terminal."
			.red
	);
} else {
	(async function() {
		try {
			/**
			 * Validate our config and start.
			 */
			if (await wpeconfig.validateconfig(wpeauth)) {
				startwpe();
			}
		} catch (e) {
			/**
			 * Validate our config and start.
			 */
			if (await wpeconfig.validateconfig(wpeauth)) {
				startwpe();
			}
		}
	})();
}
