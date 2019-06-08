const fetch = require("node-fetch");
let authorization = null;

class WPEAccounts {
	constructor(auth) {
		authorization = auth;
	}
	async getaccounts() {
		try {
			let res = await fetch("https://api.wpengineapi.com/v1/accounts/", {
				method: "GET",
				headers: {
					Authorization: authorization
				}
			});

			let json = await res.json();
			if (json.errors) {
				return false;
			}

			return json;
		} catch (err) {
			console.log(err);
			return false;
		}
	}
}

module.exports = WPEAccounts;
