import crypto from "crypto"

const secret = crypto.randomBytes(1024).toString('base64');

export default secret;
