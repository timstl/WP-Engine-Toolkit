#! /usr/bin/env node
const WPEAccess = require("./lib/wpeaccess");
const colors = require("colors");

/**
 * Verify we have a valid authorization string for API calls.
 */
const wpeaccess = new WPEAccess();
const wpeauth = wpeaccess.getauth();

if (!wpeauth) {
	console.log(
		"Your API access doesn't appear to be setup.\r\nGenerate API keys in your WP Engine account and export them as environment variables (~/.bash_profile)\r\nReference: http://wpengineapi.com\r\nAlready done this? Try restarting terminal."
			.red
	);
}

/**
 * Make sure we have a valid account ID in wpeaccounts.json
 *
 * Only supports 1 account right now but could support multiple in the future.
 */
let wpeaccountids = null;

/**
 * This function will generate a JSON object to put in our wpeaccounts.json file.
 */
async function createaccountjson() {
	const WPEAccounts = require("./lib/wpeaccounts");
	const wpeaccounts = new WPEAccounts(wpeauth);

	/**
	 * Fetch accounts from API
	 */
	let fetchedAccounts = await wpeaccounts.getaccounts();

	if (fetchedAccounts && fetchedAccounts.results) {
		let accountsobj = { accounts: [] };

		fetchedAccounts.results.forEach(function(item) {
			accountsobj.accounts.push({ id: item.id });
		});

		console.log("Create a wpeaccounts.json file and add this:".green);
		console.log(accountsobj);

		return false;
	} else {
		console.log("An error occurred".red);
		return false;
	}
}

/**
 * Check the account IDs; if none exist, create the JSON.
 */
function checkaccountids() {
	if (
		!wpeaccountids ||
		wpeaccountids.accounts.length == 0 ||
		!wpeaccountids.accounts[0].id
	) {
		console.log(
			"You have not yet added any accounts to wpeaccounts.json. Fetching..."
				.yellow
		);

		return createaccountjson();
	}

	return true;
}

/**
 * Start our WPE prompt.
 */
function startwpe() {
	console.log("starting!");
}

/**
 * First check the account IDs, then start if we have valid JSON.
 */
(async function() {
	try {
		wpeaccountids = require("./wpeaccounts.json");
		if (await checkaccountids()) {
			startwpe();
		}
	} catch (e) {
		if (await checkaccountids()) {
			startwpe();
		}
	}
})();
