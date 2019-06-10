const fetch = require("node-fetch");
const FormData = require("form-data");
const DOMParser = require("dom-parser");

class WPEStaging {
	parseCookies(response) {
		const raw = response.headers.raw()["set-cookie"];
		return raw
			.map(entry => {
				const parts = entry.split(";");
				const cookiePart = parts[0];
				return cookiePart;
			})
			.join(";");
	}
	/**
	 * Deploy Legacy Staging
	 */
	async setupStaging(user_login, user_pass, wpe_install) {
		const wpurl = "https://" + wpe_install.primary_domain;

		/**
		 * Login to wp-admin
		 */
		let formData = new FormData();
		formData.append("log", user_login);
		formData.append("pwd", user_pass);
		formData.append("wp-submit", "Login");
		formData.append("testcookie", "1");
		formData.append("wpe-login", "true");

		let res = await fetch(wpurl + "/wp-login.php?wpe-login=true", {
			method: "post",
			body: formData,
			headers: {
				accept: "*/*",
				redirect: "follow"
			}
		});

		const parsedCookies = await this.parseCookies(res);

		/**
		 * Fetch WP Engine Staging page.
		 */
		let res2 = await fetch(
			wpurl + "/wp-admin/admin.php?page=wpengine-staging",
			{
				method: "post",
				headers: {
					accept: "*/*",
					cookie: parsedCookies
				}
			}
		);

		/**
		 * Find _wpnonce value
		 */
		let text = await res2.text();

		const parser = new DOMParser();
		const htmlDocument = parser.parseFromString(text, "text/html");
		const form = htmlDocument.getElementById("staging");

		if (!form) {
			return false;
		}

		const nonce = form.getElementById("_wpnonce").getAttribute("value");

		if (!nonce) {
			return false;
		}

		/**
		 * POST Deploy to Staging form
		 */
		let formData_deploy = new FormData();
		formData_deploy.append("_wpnonce", nonce);
		formData_deploy.append("snapshot", "Create staging area");

		let res3 = await fetch(
			wpurl + "/wp-admin/admin.php?page=wpengine-staging",
			{
				method: "post",
				body: formData_deploy,

				headers: {
					accept: "*/*",
					cookie: parsedCookies
				}
			}
		);

		return true;
	}
}

module.exports = WPEStaging;
