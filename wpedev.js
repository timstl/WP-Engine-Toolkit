#! /usr/bin/env node

/**
 * Test file used for testing new features before integration.
 */
const WPEConfig = require("./lib/wpeconfig");
const wpeconfig = new WPEConfig();

const colors = require("colors");

const project_dir = wpeconfig.getlocalprojectsdir();
const vagrant_projects_dir = wpeconfig.getvagrantprojectsdir();
const site_name = "testsite";
const site_title = "Test Site";
const gitignore = wpeconfig.getlocalgitignore();
const node_ssh = require("node-ssh");

(async () => {
	const fs = require("fs");
	const dir = project_dir + site_name;
	console.log(dir);
	if (fs.existsSync(dir)) {
		console.log("Sorry, that directory already exists.");
		return false;
	}

	fs.mkdirSync(dir);

	/**
	 * Init repo and create .gitignore
	 */
	if (fs.existsSync(dir)) {
		console.log("created directory");
		// init repo
		const simpleGit = require("simple-git")(dir);
		simpleGit.init();

		const fs = require("fs");
		const fetch = require("node-fetch");
		const gitignore_file = dir + "/.gitignore";

		let res = await fetch(gitignore, {
			method: "get",
			headers: {
				redirect: "follow"
			}
		});

		let gitignore_text = await res.text();

		fs.writeFile(gitignore_file, gitignore_text, async function() {
			console.log("gitignore created");

			/**
			 * SSH to Vagrant machine
			 */
			// Make sure the database is unique.
			const database = site_name + "_" + Date.now();
			const vagrant_site_dir = vagrant_projects_dir + site_name + "/";

			const passgen = require("secure-random-password");
			const wp_pass = passgen.randomPassword({
				length: 20,
				characters:
					"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#%^?*_-~+|{}"
			});

			const wp_theme = wpeconfig.getlocaltheme();
			let wp_plugins = wpeconfig.getplugins();
			let wp_local_plugins = wpeconfig.getlocalplugins();

			if (!wp_plugins) {
				wp_plugins = [];
			}

			if (wp_local_plugins) {
				wp_plugins.concat(wp_local_plugins);
			}

			let wpmgdb_license = null;

			if (wpeconfig.migratedbenabled()) {
				wpmgdb_license = wpeconfig.getmigratedblicense();
			}

			const ssh_commands = [
				/*
				Create a database
				WP Core install.
				Install additional needed plugins. WP Migrate DB Pro and Media Files Addon. Can also install ACF, Gravity Forms, etc., now if you want.
				Use WP Migrate DB Pro to pull from staging.
				Download latest Basetheme (https://github.com/timstl/basetheme-scss/archive/master.zip) and Basetheme Helper Plugin (https://github.com/timstl/basetheme-helper-plugin/archive/master.zip) and Basetheme Modify Core Blocks (https://github.com/timstl/basetheme-modify-core-blocks/archive/master.zip)
				Rename your Basetheme folder to be unique to the site. Also update the Basetheme style.css comments to be unique to this site.
				Activate Basetheme and Basetheme helper plugin.
				Activate other plugins
				Push new database to staging
				*/
				'mysql -u root -pvagrant -e "create database ' +
					database +
					';"',
				"wp core download",
				"wp config create --dbname=" +
					database +
					" --dbuser=" +
					wpeconfig.getlocalmysqluser() +
					" --dbpass=" +
					wpeconfig.getlocalmysqlpassword() +
					" --extra-php=\"define( 'WP_DEBUG', true );\ndefine( 'WP_DEBUG_LOG', true );\ndefine( 'WP_DEBUG_DISPLAY', false );\n\"",
				"wp core install  --skip-email --url=" +
					wpeconfig.getlocalsitesurl() +
					" --admin_user=" +
					wpeconfig.getdefaultwpuser() +
					" --admin_password=" +
					wp_pass +
					" --admin_email=" +
					wpeconfig.getdefaultwpuser() +
					' --title="' +
					site_title +
					'"'
			];

			if (wp_plugins) {
				ssh_commands.push(
					"wp plugin install --activate --force " +
						wp_plugins.join(" ")
				);

				if (wpmgdb_license) {
					ssh_commands.push(
						"wp migratedb setting update license " + wpmgdb_license
					);
				}

				ssh_commands.push("wp plugin update --all");

				if (wpmgdb_license) {
					ssh_commands.push(
						"wp migratedb setting get connection-key"
					);
				}

				// pull migrate db pro from staging HERE if possible
			}

			if (wp_theme.url) {
				ssh_commands.push(
					"wp theme install " + wp_theme.url + " --force"
				);

				if (wp_theme.match_site_name.enabled === true) {
					ssh_commands.push(
						"mv " +
							vagrant_site_dir +
							"wp-content/themes/" +
							wp_theme.match_site_name.base_slug +
							"/ " +
							vagrant_site_dir +
							"wp-content/themes/" +
							site_name +
							"/"
					);

					ssh_commands.push(
						"sed -i 's/Basetheme/" +
							site_title +
							"/g' " +
							vagrant_site_dir +
							"wp-content/themes/" +
							site_name +
							"/style.css"
					);
				}

				ssh_commands.push("wp theme activate " + site_name);
			}

			/**
			 * SSH
			 */
			const ssh = new node_ssh();

			try {
				await ssh.connect({
					host: wpeconfig.getvagrantsshserver(),
					port: wpeconfig.getvagrantsshport(),
					username: wpeconfig.getvagrantsshusername(),
					privateKey: wpeconfig.getvagrantsshprivatekey()
				});
				console.log("SSH Connected.".blue);
			} catch (e) {
				console.log(e);
				return false;
			}

			try {
				await ssh.execCommand(ssh_commands.join(" && "), {
					cwd: vagrant_site_dir,
					onStdout(chunk) {
						console.log(chunk.toString("utf8"));
					},
					onStderr(chunk) {
						console.log(chunk.toString("utf8"));
					}
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

			/**
			 * Locally
			 *
			 * make initial commit
			 * create develop branch
			 * switch to develop branch
			 * remove master branch
			 * add remote staging branch
			 */

			simpleGit.add("*", function() {
				simpleGit.commit("initial commit", function() {
					simpleGit.checkoutLocalBranch("develop", function() {
						simpleGit.deleteLocalBranch("master", function() {
							simpleGit.addRemote(
								"wpengine-staging",
								"git@git.wpengine.com:staging/" +
									site_name +
									".git"
							);
						});
					});
				});
			});

			/**
			 * Locally
			 *
			 * npm install in theme directory
			 */
			if (
				fs.existsSync(
					project_dir + site_name + "/wp-content/themes/" + site_name
				)
			) {
				const { exec } = require("child_process");
				exec(
					"cd " +
						project_dir +
						site_name +
						"/wp-content/themes/" +
						site_name +
						"/ && npm install",
					(err, stdout, stderr) => {
						if (err) {
							// node couldn't execute the command
							return;
						}

						// the *entire* stdout and stderr (buffered)
						console.log(`stdout: ${stdout}`);
						console.log(`stderr: ${stderr}`);
					}
				);
			} else {
				console.log("Theme directory not found.");
			}
		});
	}
})();
