let config = null;

class WPEConfig {
	constructor() {
		try {
			config = require("../config.json");
		} catch (e) {}
	}

	getaccountid() {
		if (!config.wpengine.accounts || !config.wpengine.accounts[0].id) {
			return false;
		}

		return config.wpengine.accounts[0].id;
	}

	getmigratedblicense() {
		return config.setup.plugins.migratedb.license;
	}

	getdefaultwpuser() {
		return config.wpengine.default_wp_user;
	}

	getprivatekey() {
		return config.setup.plugins.private_key;
	}

	getsitespath() {
		if (config.setup.plugins.sites_path) {
			return config.setup.plugins.sites_path;
		}

		return "/home/wpe-user/sites/";
	}

	getplugins() {
		if (!this.pluginsenabled()) {
			return false;
		}
		return config.setup.plugins.activate;
	}

	pluginsenabled() {
		if (
			config.setup.plugins.enabled === true &&
			config.setup.plugins.activate.length > 0
		) {
			return true;
		}

		return false;
	}

	migratedbenabled() {
		return config.setup.plugins.migratedb.enabled;
	}

	legacystagingenabled() {
		return config.setup.legacy_staging.enabled;
	}

	localenabled() {
		return config.setup.local.enabled;
	}

	getlocalprojectsdir() {
		return config.setup.local.projects_dir;
	}

	getvagrantprojectsdir() {
		return config.setup.local.vagrant.projects_dir;
	}

	getvagrantsshserver() {
		return config.setup.local.vagrant.ssh.server;
	}

	getvagrantsshusername() {
		return config.setup.local.vagrant.ssh.username;
	}

	getvagrantsshprivatekey() {
		return config.setup.local.vagrant.ssh.private_key;
	}

	getvagrantsshport() {
		return config.setup.local.vagrant.ssh.port;
	}

	getlocalgitignore() {
		return config.setup.local.gitignore;
	}

	getlocaltheme() {
		return config.setup.local.theme;
	}

	getlocalplugins() {
		if (config.setup.local.plugins.activate.length === 0) {
			return false;
		}
		return config.setup.local.plugins.activate;
	}

	getlocalmysqluser() {
		return config.setup.local.vagrant.mysql.user;
	}

	getlocalmysqlpassword() {
		return config.setup.local.vagrant.mysql.password;
	}

	getlocalsitesurl() {
		return config.setup.local.sites_base_url;
	}

	getmigratedbremotebasepath() {
		return config.setup.local.plugins.migratedb.remote_base_path;
	}

	sourcetreeenabled() {
		return config.setup.local.sourcetree.enabled;
	}

	validateconfig(wpeauth) {
		let valid = true;

		/**
		 * Make sure we have a config.
		 */
		if (!config) {
			console.log(
				"Config Error".red.bold,
				"Your config appears to be missing or invalid.".red
			);
			return false;
		}

		/**
		 * Make sure we have a default WP user if needed.
		 */
		if (this.pluginsenabled() && !this.getdefaultwpuser()) {
			console.log(
				"Config Error".red.bold,
				"You have plugins enabled but no default WP user.".red.red
			);

			valid = false;
		}

		if (this.pluginsenabled() && !this.getprivatekey()) {
			console.log(
				"Config Error".red.bold,
				"You have plugins enabled but no private key path.".red
			);

			valid = false;
		}

		if (!this.pluginsenabled() && this.migratedbenabled()) {
			console.log(
				"Config Error".red.bold,
				"In order to use Migrate DB, you must have plugins enabled and Migrate DB available for download and activation."
					.red
			);

			valid = false;
		}

		if (this.migratedbenabled() && !this.getmigratedblicense()) {
			console.log(
				"Config Error".red.bold,
				"You must supply your license key or disable Migrate DB Pro".red
			);

			valid = false;
		}

		/**
		 * Make sure we have account IDs.
		 */
		if (!this.getaccountid()) {
			console.log(
				"Config Error".red.bold,
				"You have not yet added any accounts to config.json. Fetching..."
					.yellow
			);
			this.createaccountjson(wpeauth);

			valid = false;
		}

		return valid;
	}

	/**
	 * This function will generate a JSON object to put in our wpeaccounts.json file.
	 */
	async createaccountjson(wpeauth) {
		const WPEAccounts = require("./wpeaccounts");
		const wpeaccounts = new WPEAccounts(wpeauth);

		/**
		 * Fetch accounts from API
		 */
		let fetchedAccounts = await wpeaccounts.getaccounts();

		if (fetchedAccounts && fetchedAccounts.results) {
			let accountsarr = [];

			fetchedAccounts.results.forEach(function(item) {
				accountsarr.push({ id: item.id });
			});

			console.log("Add your account ID to config.json:".green);
			console.log('"accounts":' + JSON.stringify(accountsarr));
		} else {
			console.log("An error occurred".red);
		}
	}
}

module.exports = WPEConfig;
