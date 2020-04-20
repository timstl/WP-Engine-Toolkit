const node_ssh = require("node-ssh");
const passgen = require("secure-random-password");
const colors = require("colors");
const WPEConfig = require("./wpeconfig");
let wp_pass = null;
let wpmgdb_connection = null;

class WPESSH {
	set_pass() {
		wp_pass = passgen.randomPassword({
			length: 20,
			characters:
				"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#%^?*_-~+|{}",
		});
	}

	get_pass() {
		return wp_pass;
	}

	get_wpmgdb_connection() {
		return wpmgdb_connection;
	}

	/**
	 * Exec SSH commands
	 */
	async doSSH(wpe_install) {
		/**
		 * Get config values.
		 */
		const wpeconfig = new WPEConfig();

		const wp_plugins = wpeconfig.getplugins();
		const wp_user = wpeconfig.getdefaultwpuser();
		const wp_privatekey = wpeconfig.getprivatekey();
		const wpe_cwd = wpeconfig.getsitespath();
		let wpmgdb_license = null;

		if (wpeconfig.migratedbenabled()) {
			wpmgdb_license = wpeconfig.getmigratedblicense();
		}

		/**
		 * Generate WP Password for default user.
		 */
		this.set_pass();

		/**
		 * Create array of SSH commands.
		 */
		let ssh_commands = ["wp core update", "wp core update-db"];

		if (wp_plugins) {
			ssh_commands.push(
				"wp plugin install --activate --force " + wp_plugins.join(" ")
			);

			if (wpmgdb_license) {
				ssh_commands.push(
					"wp migratedb setting update license " + wpmgdb_license
				);
			}

			ssh_commands.push("wp plugin update --all");

			if (wpmgdb_license) {
				ssh_commands.push("wp migratedb setting update pull on");
				ssh_commands.push("wp migratedb setting update push on");
				ssh_commands.push("echo 'WP Migrate DB Connection String:'");
				ssh_commands.push("wp migratedb setting get connection-key");
			}
		}

		ssh_commands.push(
			"wp user update " + wp_user + " --user_pass=" + wp_pass
		);

		/**
		 * SSH
		 */
		const ssh = new node_ssh();

		try {
			await ssh.connect({
				host: wpe_install + ".ssh.wpengine.net",
				username: wpe_install,
				privateKey: wp_privatekey,
			});
			console.log("SSH Connected.".blue);
		} catch (e) {
			console.log(e);
			return false;
		}

		try {
			let migratedb_next = false;

			await ssh.execCommand(ssh_commands.join(" && "), {
				cwd: wpe_cwd,
				onStdout(chunk) {
					const stdout = chunk.toString("utf8").trim();

					if (migratedb_next === true) {
						wpmgdb_connection = stdout;
						migratedb_next = false;
					}

					if (stdout == "WP Migrate DB Connection String:") {
						migratedb_next = true;
					}

					console.log(stdout);
				},
				onStderr(chunk) {
					console.log(chunk.toString("utf8").trim());
				},
			});
		} catch (e) {
			console.log(e);
			return false;
		}

		try {
			await ssh.dispose();
		} catch (e) {
			console.log(e);
		}

		return true;
	}
}

// Export
module.exports = WPESSH;
