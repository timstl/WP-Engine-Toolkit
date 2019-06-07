#! /usr/bin/env node
const fetch = require("node-fetch");
const prompt = require("prompt-promise");

/**
 * Setup environment variables for password, user ID, and account ID.
 * Reference: https://wpengineapi.com/
 */
const WPENGINE_PASSWORD = process.env.WPENGINE_PASSWORD;
const WPENGINE_USER_ID = process.env.WPENGINE_USER_ID;
const WPENGINE_ACCOUNTID = process.env.WPENGINE_ACCOUNTID;

/**
 * Create authorization string.
 */
const authorization =
	"Basic " +
	Buffer.from(WPENGINE_USER_ID + ":" + WPENGINE_PASSWORD).toString("base64");

/**
 * User input values.
 */
let sitename_input = null;
let installname_input = null;
let installenv_input = null;

/**
 * Save site and install IDs after they are created.
 */
let site_id_created = null;
let install_id_created = null;

/**
 * Creates a new site.
 */
const createsite = () => {
	fetch("https://api.wpengineapi.com/v1/sites", {
		method: "POST",
		headers: {
			Authorization: authorization,
			Accept: "application/json",
			"Content-Type": "application/json"
		},
		body: JSON.stringify({
			name: sitename_input,
			account_id: WPENGINE_ACCOUNTID
		})
	})
		.then(res => res.json())
		.then(json => {
			// Log the JSON response.
			console.log(json);

			if (json.errors || !json.id) {
				// Error occurred, re-prompt.
				siteprompt();
			} else {
				// Store the site ID and begin creating an install.
				site_id_created = json.id;
				console.log("create install now...\r\n");
				installenvprompt();
			}
		});
};

/**
 * Create an install within new site.
 */
const createinstall = () => {
	fetch("https://api.wpengineapi.com/v1/installs", {
		method: "POST",
		headers: {
			Authorization: authorization,
			Accept: "application/json",
			"Content-Type": "application/json"
		},
		body: JSON.stringify({
			name: installname_input,
			account_id: WPENGINE_ACCOUNTID,
			site_id: site_id_created,
			environment: installenv_input
		})
	})
		.then(res => res.json())
		.then(json => {
			console.log(json);
			if (json.errors || !json.id) {
				// Error occurred, re-prompt. Typically would happen if an install name is taken.
				installprompt();
			} else {
				// All done.
				install_id_created = json.id;
				console.log(
					"install is created and pending. waiting for active state..."
				);
				setTimeout(awaitactiveinstall, 30000);
			}
		});
};

/**
 * Get install status.
 */
const getinstallstatus = async () => {
	let res = await fetch(
		"https://api.wpengineapi.com/v1/installs/" + install_id_created,
		{
			method: "GET",
			headers: {
				Authorization: authorization
			}
		}
	);

	let json = await res.json();
	console.log(json);
	if (json.errors) {
		return false;
	}

	return json.status;
};
/**
 * Await active install.
 *
 * There is no real use for this right now, but in the future we could perform other tasks after an install goes from "pending" to "active" status.
 */
const awaitactiveinstall = () => {
	getinstallstatus()
		.then(status => {
			if (status == "active") {
				console.log("install is now active.");
				prompt.finish();
			} else {
				console.log("install is pending. waiting...");
				setTimeout(awaitactiveinstall, 30000);
			}
		})
		.catch(reason => console.log(reason.message));
};

/**
 * Site creation prompt.
 */
const siteprompt = () => {
	prompt("site name: ")
		.then(function sitename(val) {
			if (val === "" || !val || val === null) {
				// Name is required, re-prompt.
				siteprompt();
			} else {
				sitename_input = val;
				console.log("creating site...\r\n");
				createsite();
			}
		})
		.catch(function rejected(err) {
			console.log("error:", err.stack);
			prompt.finish();
		});
};

/**
 * Install Environment prompt
 */
const installenvprompt = () => {
	prompt("environment (d for dev, s for stage, p for prod) [default: s]: ")
		.then(function installenv(val) {
			if (val == "d") {
				installenv_input = "development";
			} else if (val == "p") {
				installenv_input = "production";
			} else {
				// Default
				installenv_input = "staging";
			}
			installprompt();
		})
		.catch(function rejected(err) {
			console.log("error:", err.stack);
			prompt.finish();
		});
};

/**
 * Install prompt
 */
const installprompt = () => {
	prompt("install name: ")
		.then(function installname(val) {
			if (val === "" || !val || val === null) {
				// Install name is required.
				installprompt();
			} else {
				installname_input = val;
				console.log("creating install...\r\n");
				createinstall();
			}
		})
		.catch(function rejected(err) {
			console.log("error:", err.stack);
			prompt.finish();
		});
};

// Start
siteprompt();
