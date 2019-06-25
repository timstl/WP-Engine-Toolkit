const node_ssh = require("node-ssh");
const fetch = require("node-fetch");
const passgen = require("secure-random-password");
const colors = require("colors");
const WPEConfig = require("./wpeconfig");
const fs = require("fs");
let local_dir = null;
let local_site_dir = null;
let vagrant_projects_dir = null;
let vagrant_site_dir = null;

class WPELocal {
	/**
	 * Exec SSH commands
	 */
	async setupLocal(site_title, wpe_install, wp_pass, wpmgdb_connection) {
		const wpeconfig = new WPEConfig();
		const site_name = wpe_install.name;

		/**
		 * Setup some vagrant and local directories.
		 */
		vagrant_projects_dir = wpeconfig.getvagrantprojectsdir();
		vagrant_site_dir = vagrant_projects_dir + site_name + "/";

		local_dir = wpeconfig.getlocalprojectsdir();
		local_site_dir = local_dir + site_name + "/";

		if (fs.existsSync(local_site_dir)) {
			console.log(
				"Local error: Directory already exists.".red.bold +
					" " +
					local_site_dir.red
			);
			return false;
		}

		fs.mkdirSync(local_site_dir);

		/**
		 * Init repo and create .gitignore if directory creation was successful.
		 */
		if (!fs.existsSync(local_site_dir)) {
			console.log("There was an error creating the dictory.".red.bold);
			return false;
		}

		console.log("Directory created:".blue, local_site_dir.blue);

		/**
		 * Init local repo and fetch .gitignore file.
		 */
		const simpleGit = require("simple-git/promise")(local_site_dir);
		await simpleGit.init();

		const gitignore_remote = wpeconfig.getlocalgitignore();
		const gitignore_file = local_site_dir + ".gitignore";

		let res = await fetch(gitignore_remote, {
			method: "get",
			headers: {
				redirect: "follow"
			}
		});
		let gitignore_text = await res.text();

		fs.writeFile(gitignore_file, gitignore_text, async function() {
			console.log(".gitignore created.".blue);
		});

		/**
		 * SSH to Vagrant machine
		 */

		// Make sure the database is unique.
		const database = site_name + "_" + Date.now();

		const wp_theme = wpeconfig.getlocaltheme();
		let wp_plugins = wpeconfig.getplugins();
		let wp_local_plugins = wpeconfig.getlocalplugins();

		if (!wp_plugins) {
			wp_plugins = [];
		}

		if (wp_local_plugins) {
			wp_plugins = wp_plugins.concat(wp_local_plugins);
		}

		let wpmgdb_license = null;
		if (wpeconfig.migratedbenabled()) {
			wpmgdb_license = wpeconfig.getmigratedblicense();
		}

		/**
		 * Setup vagrant SSH commands.
		 */
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
			'mysql -u root -pvagrant -e "create database ' + database + ';"',
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
				"wp plugin install --activate --force " + wp_plugins.join(" ")
			);

			if (wpmgdb_license) {
				ssh_commands.push(
					"wp migratedb setting update license " + wpmgdb_license
				);
			}

			ssh_commands.push("wp plugin update --all");

			if (wpmgdb_license && wpmgdb_connection) {
				const dblbackslash = "\\/\\/".toString();

				const wpmgdb_find = [
					"//" + wpe_install.primary_domain,

					dblbackslash + wpe_install.primary_domain,
					wpeconfig.getmigratedbremotebasepath() + site_name,
					"http:" +
						dblbackslash +
						wpeconfig
							.getlocalsitesurl()
							.replace("//", dblbackslash) +
						site_name,
					"https://" + wpeconfig.getlocalsitesurl() + site_name
				];

				const wpmgdb_replace = [
					"//" + wpeconfig.getlocalsitesurl() + site_name,
					dblbackslash +
						wpeconfig
							.getlocalsitesurl()
							.replace(
								"//",
								dblbackslash + "/" + dblbackslash + "/"
							) +
						site_name,
					vagrant_site_dir.replace(/\/$/, ""),
					"http:" +
						dblbackslash +
						wpeconfig
							.getlocalsitesurl()
							.replace("//", dblbackslash) +
						site_name,
					"http://" + wpeconfig.getlocalsitesurl() + site_name
				];

				ssh_commands.push(
					"wp migratedb pull https://" +
						wpe_install.primary_domain +
						"/ " +
						wpmgdb_connection +
						" --find=" +
						wpmgdb_find.join(",") +
						" --replace=" +
						wpmgdb_replace.join(",")
				);
			}
		}

		if (wp_theme.url) {
			ssh_commands.push("wp theme install " + wp_theme.url + " --force");

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
			console.log("SSH connected to vagrant machine.".blue);
		} catch (e) {
			console.log(e);
			return false;
		}

		try {
			await ssh.execCommand(ssh_commands.join(" && "), {
				cwd: vagrant_site_dir,
				onStdout(chunk) {
					console.log(chunk.toString("utf8").trim());
				},
				onStderr(chunk) {
					console.log(chunk.toString("utf8").trim());
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
		try {
			await simpleGit.add("*");
			await simpleGit.commit("initial commit");
			await simpleGit.checkoutLocalBranch("develop");
			await simpleGit.deleteLocalBranch("master");
			await simpleGit.addRemote(
				"wpengine-staging",
				"git@git.wpengine.com:staging/" + site_name + ".git"
			);
			console.log("Finished configuring local git repo.".blue);
		} catch (e) {
			// handle the error
			console.log(e);
		}

		/**
		 * npm install in theme directory
		 */
		if (
			fs.existsSync(
				local_dir + site_name + "/wp-content/themes/" + site_name
			)
		) {
			const util = require("util");
			const exec = util.promisify(require("child_process").exec);

			let local_commands = [
				"cd " +
					local_dir +
					site_name +
					"/wp-content/themes/" +
					site_name +
					"/",
				"npm install"
			];
			let local_messages = [];

			console.log("Running `npm install` in theme directory...".yellow);

			if (wpeconfig.sourcetreeenabled()) {
				local_commands.push("cd " + local_dir + site_name);
				local_commands.push("stree");
				local_messages.push("Launched Sourcetree.");
			}

			try {
				const { stdout, stderr } = await exec(
					local_commands.join(" && ")
				);

				if (stdout) {
					console.log(stdout);
				}

				if (stderr) {
					console.log(stderr.red);
				}
			} catch (e) {
				console.log(e.red);
			}

			local_messages.push(
				"Local site setup complete: ".blue.bold,
				"http://" + wpeconfig.getlocalsitesurl() + site_name
			);
			if (local_messages.length > 0) {
				console.log(local_messages.join("\n").blue);
			}
		} else {
			console.log("Theme directory not found.");
		}
	}
}

// Export
module.exports = WPELocal;
