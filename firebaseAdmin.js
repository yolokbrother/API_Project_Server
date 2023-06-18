const admin = require("firebase-admin");

const serviceAccount = require("./apinode-64713-firebase-adminsdk-e49t7-e08f14aba6.json");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket:"apinode-64713.appspot.com",
  });
}

const db = admin.firestore();
const auth = admin.auth();
const firebaseStorage = admin.storage();

module.exports = { auth, db, firebaseStorage, admin };