#! /usr/bin/env node

/**
 * Test file used for testing new features before integration.
 */

const project_dir = "/Users/timgieseking/projects/fabric/Sites/";
const site_name = "testsite";
const gitignore =
	"https://gist.githubusercontent.com/timstl/285a43a80d03c37d0687419c7a680406/raw/d54af6b0895508cd5e21efd2b2323590d7298972/.gitignore";

(async () => {
	const fs = require("fs");
	const dir = project_dir + site_name;

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

		fs.writeFile(gitignore_file, gitignore_text, function() {
			console.log("gitignore created");

			/**
			 * SSH to Vagrant machine
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
			];

			/**
			 * Locally
			 *
			 * make initial commit
			 * create develop branch
			 * switch to develop branch
			 * remove master branch
			 */

			simpleGit.add("*", function() {
				simpleGit.commit("initial commit", function() {
					simpleGit.checkoutLocalBranch("develop", function() {
						simpleGit.deleteLocalBranch("master", function() {});
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
					project_dir + site_name + "/wp-content/themes/basetheme/"
				)
			) {
				const { exec } = require("child_process");
				exec(
					"cd " +
						project_dir +
						site_name +
						"/wp-content/themes/basetheme/ && npm install",
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
