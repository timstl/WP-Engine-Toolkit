const WPENGINE_PASSWORD = process.env.WPENGINE_PASSWORD;
const WPENGINE_USER_ID = process.env.WPENGINE_USER_ID;

class WPEAccess {
	getpassword() {
		return WPENGINE_PASSWORD;
	}

	getuserid() {
		return WPENGINE_USER_ID;
	}

	getauth() {
		if (!WPENGINE_USER_ID || !WPENGINE_PASSWORD) {
			return false;
		}

		return (
			"Basic " +
			Buffer.from(WPENGINE_USER_ID + ":" + WPENGINE_PASSWORD).toString(
				"base64"
			)
		);
	}
}

module.exports = WPEAccess;
