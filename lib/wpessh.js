const node_ssh = require("node-ssh");
const passgen = require("secure-random-password");
const colors = require("colors");
const WPEConfig = require("./wpeconfig");

class WPESSH {
	/**
	 * Exec SSH commands
	 */
	doSSH(wpe_install) {
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
		const wp_pass = passgen.randomPassword({
			length: 20,
			characters:
				"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#%^?*_-~+|{}"
		});

		/**
		 * Create array of SSH commands.
		 */
		let ssh_commands = [];

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

		ssh.connect({
			host: wpe_install + ".ssh.wpengine.net",
			username: wpe_install,
			privateKey: wp_privatekey
		})
			.then(function() {
				/**
				 * Connected
				 */
				console.log("SSH Connected.".blue);
				ssh.execCommand(ssh_commands.join(" && "), {
					cwd: wpe_cwd,
					onStdout(chunk) {
						console.log(chunk.toString("utf8"));
					},
					onStderr(chunk) {
						console.log(chunk.toString("utf8"));
					}
				}).then(function() {
					ssh.dispose();

					if (wpmgdb_license) {
						console.log(
							"WP Migrate DB Pro connection string should be in SSH output above. "
								.blue
						);
					}
					console.log("User password: ".yellow, wp_pass.blue.bold);
				});
			})
			.catch(function(err) {
				console.log(err);
			});
	}
}

// Export
module.exports = WPESSH;