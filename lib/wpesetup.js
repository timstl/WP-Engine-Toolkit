const prompt = require("prompt-promise");
const fetch = require("node-fetch");
const colors = require("colors");

let authorization = null;
let wpe_account_id = null;

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
let install_object = null;

class WPESetup {
	constructor(auth, account_id) {
		authorization = auth;
		wpe_account_id = account_id;
	}

	/**
	 * Creates a new site.
	 */
	createsite() {
		fetch("https://api.wpengineapi.com/v1/sites", {
			method: "POST",
			headers: {
				Authorization: authorization,
				Accept: "application/json",
				"Content-Type": "application/json"
			},
			body: JSON.stringify({
				name: sitename_input,
				account_id: wpe_account_id
			})
		})
			.then(res => res.json())
			.then(json => {
				// Log the JSON response.
				console.log(json);

				if (json.errors || !json.id) {
					// Error occurred, re-prompt.
					this.siteprompt();
				} else {
					// Store the site ID and begin creating an install.
					site_id_created = json.id;
					console.log("Site created.".blue);
					console.log("Create install now...\r\n".yellow);
					this.installenvprompt();
				}
			});
	}

	/**
	 * Create an install within new site.
	 */
	createinstall() {
		fetch("https://api.wpengineapi.com/v1/installs", {
			method: "POST",
			headers: {
				Authorization: authorization,
				Accept: "application/json",
				"Content-Type": "application/json"
			},
			body: JSON.stringify({
				name: installname_input,
				account_id: wpe_account_id,
				site_id: site_id_created,
				environment: installenv_input
			})
		})
			.then(res => res.json())
			.then(json => {
				console.log(json);
				if (json.errors || !json.id) {
					// Error occurred, re-prompt. Typically would happen if an install name is taken.
					this.installprompt();
				} else {
					// All done.
					install_object = json;
					install_id_created = json.id;
					console.log(
						"Install is created and pending. Waiting for active status..."
							.blue
					);
					setTimeout(this.awaitactiveinstall.bind(this), 30000);
				}
			});
	}

	/**
	 * Get install status.
	 */
	async getinstallstatus() {
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

		install_object = json;
		return json.status;
	}
	/**
	 * Await active install.
	 *
	 * There is no real use for this right now, but in the future we could perform other tasks after an install goes from "pending" to "active" status.
	 */
	awaitactiveinstall() {
		this.getinstallstatus()
			.then(status => {
				if (status == "active") {
					console.log("Install is now active.".blue.bold);

					(async function() {
						/**
						 * Open browser tabs.
						 */
						const open = require("open");

						/**
						 * Get config values.
						 */
						const WPEConfig = require("./wpeconfig");
						const wpeconfig = new WPEConfig();

						/**
						 * Do some tasks over SSH.
						 */
						const WPESSH = require("./wpessh");
						const wpessh = new WPESSH();

						if (await wpessh.doSSH(install_object.name)) {
							if (wpeconfig.legacystagingenabled()) {
								const WPEStaging = require("./wpestaging");
								const wpestaging = new WPEStaging();

								if (
									await wpestaging.setupStaging(
										wpeconfig.getdefaultwpuser(),
										wpessh.get_pass(),
										install_object
									)
								) {
									console.log(
										"Deployment of your legacy staging site triggered. It should be available in a few minutes at: https://"
											.blue +
											install_object.primary_domain.replace(
												".wpengine.com",
												".staging.wpengine.com"
											).blue +
											"\r\n"
									);
								} else {
									console.log(
										"There was a problem deploying legacy staging. Opening browser tab...\r\n"
											.red
									);

									await open(
										"https://" +
											install_object.primary_domain +
											"/wp-admin/admin.php?page=wpengine-staging"
									);
								}
							}
						}

						console.log("WP Engine setup complete.\r\n".green.bold);

						const wpmgdb_connection = wpessh.get_wpmgdb_connection();

						if (wpmgdb_connection) {
							console.log(
								"WP Migrate DB Pro connection string: ".yellow,
								wpmgdb_connection.blue.bold,
								"\r\n"
							);
						}

						if (wpeconfig.localenabled()) {
							const WPELocal = require("./wpelocal");
							const wpelocal = new WPELocal();

							await wpelocal.setupLocal(
								sitename_input,
								install_object,
								wpessh.get_pass(),
								wpmgdb_connection
							);

							await open(
								"http://" +
									wpeconfig.getlocalsitesurl() +
									install_object.name +
									"/wp-admin/"
							);
						}

						console.log(
							"wp-admin user password: ".yellow,
							wpessh.get_pass().blue.bold,
							"\r\n"
						);

						/**
						 * Open WP Engine page.
						 */
						await open(
							"https://my.wpengine.com/installs/" +
								install_object.name
						);

						prompt.finish();
					})();
				} else {
					console.log("Install is pending. waiting...".yellow);
					setTimeout(this.awaitactiveinstall.bind(this), 30000);
				}
			})
			.catch(reason => console.log(reason.message.red));
	}

	/**
	 * Site creation prompt.
	 */
	siteprompt() {
		prompt("Site name: ")
			.then(val => {
				if (val === "" || !val || val === null) {
					// Name is required, re-prompt.
					this.siteprompt();
				} else {
					sitename_input = val;
					console.log("Creating site...\r\n".yellow);
					this.createsite();
				}
			})
			.catch(function rejected(err) {
				console.log("Error:".red, err.stack);
				prompt.finish();
			});
	}

	/**
	 * Install Environment prompt
	 */
	installenvprompt() {
		console.log(
			"Environment options:".blue.bold,
			"[d for dev, s for stage, p for prod]"
		);
		prompt("Environment [s]: ")
			.then(val => {
				if (val == "d") {
					installenv_input = "development";
				} else if (val == "p") {
					installenv_input = "production";
				} else {
					// Default
					installenv_input = "staging";
				}
				this.installprompt();
			})
			.catch(function rejected(err) {
				console.log("Error:".red, err.stack);
				prompt.finish();
			});
	}

	/**
	 * Install prompt
	 */
	installprompt() {
		prompt("Install name: ")
			.then(val => {
				if (val === "" || !val || val === null) {
					// Install name is required.
					this.installprompt();
				} else {
					installname_input = val;
					console.log("Creating install...\r\n".yellow);
					this.createinstall();
				}
			})
			.catch(function rejected(err) {
				console.log("Error:".red, err.stack);
				prompt.finish();
			});
	}

	/**
	 * Start WPESetup.
	 */
	async dosetup() {
		await this.siteprompt();
		return true;
	}
}

// Export
module.exports = WPESetup;
