const admin = require("firebase-admin");

const serviceAccount = require("./apinode-64713-firebase-adminsdk-e49t7-dbbc307cc1.json");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();
const auth = admin.auth();

module.exports = { auth, db };