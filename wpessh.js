#! /usr/bin/env node
const node_ssh = require("node-ssh");
const passgen = require("secure-random-password");
const colors = require("colors");

// IMPORT CONFIG
const config = require("./config.json");
const wp_install = "apitests3";
const wp_user = config.wpengine.default_wp_user;
const wp_privatekey = config.plugins.private_key;
const wp_plugins = config.plugins.activate;
const wpmgdb_license = config.plugins.migratedb.license;
const wpe_cwd = "/home/wpe-user/sites/" + wp_install;

const wp_pass = passgen.randomPassword({
	length: 20,
	characters:
		"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#%^?*_-~+|{}"
});

const ssh = new node_ssh();

const ssh_commands = [
	"wp plugin install --activate --force " + wp_plugins.join(" "),
	"wp migratedb setting update license " + wpmgdb_license,
	"wp plugin update --all",
	"wp migratedb setting get connection-key",
	"wp user update " + wp_user + " --user_pass=" + wp_pass
];

// Connect
ssh.connect({
	host: wp_install + ".ssh.wpengine.net",
	username: wp_install,
	privateKey: wp_privatekey
})
	.then(function() {
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
			console.log(
				"WP Migrate DB Pro connection string should be in SSH output above. "
					.blue
			);
			console.log("User password: ".yellow, wp_pass.blue.bold);
		});
	})
	.catch(function(err) {
		console.log(err);
	});
