#! /usr/bin/env node
node_ssh = require("node-ssh");

// Variables removed for security.
// IMPORT CONFIG

ssh = new node_ssh();
ssh.connect({
	host: wp_install + ".ssh.wpengine.net",
	username: wp_install,
	privateKey: wp_privatekey
}).then(function() {
	console.log("SSH Connected.");
	console.log("Installing WP Migrate DB Pro.");
	ssh.execCommand(
		"wp plugin install --activate --force " + wp_plugins.join(" "),
		{
			cwd: "/home/wpe-user/sites/" + wp_install,
			stream: "both"
		}
	).then(function(result) {
		console.log(result);
		console.log("Installation complete.");
		console.log("Activating license.");
		ssh.execCommand(
			"wp migratedb setting update license " + wpmgdb_license,
			{
				cwd: "/home/wpe-user/sites/" + wp_install,
				stream: "both",
				onStdout(chunk) {
					console.log(chunk.toString("utf8"));
				},
				onStderr(chunk) {
					console.log(chunk.toString("utf8"));
				}
			}
		).then(function(result) {
			console.log(result.stdout);
			console.log("Installing plugin updates.");
			ssh.execCommand("wp plugin update --all", {
				cwd: "/home/wpe-user/sites/" + wp_install,
				stream: "both",
				onStdout(chunk) {
					console.log(chunk.toString("utf8"));
				},
				onStderr(chunk) {
					console.log(chunk.toString("utf8"));
				}
			}).then(function(result) {
				ssh.execCommand("wp migratedb setting get connection-key", {
					cwd: "/home/wpe-user/sites/" + wp_install,
					stream: "both",
					onStdout(chunk) {
						console.log(chunk.toString("utf8"));
					},
					onStderr(chunk) {
						console.log(chunk.toString("utf8"));
					}
				}).then(function(result) {
					console.log("Resetting user password.");
					ssh.execCommand(
						"wp user update " +
							wp_user +
							' --user_pass="' +
							wp_pass +
							'"',
						{
							cwd: "/home/wpe-user/sites/" + wp_install,
							stream: "both",
							onStdout(chunk) {
								console.log(chunk.toString("utf8"));
							},
							onStderr(chunk) {
								console.log(chunk.toString("utf8"));
							}
						}
					).then(function(result) {
						console.log(result.stdout);
						console.log(result.stderr);
						ssh.dispose();
					});
				});
			});
		});
	});
});
