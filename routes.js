// backend/routes.js
const express = require("express");
const { auth, db } = require("./firebaseAdmin"); // Import db
const router = express.Router();

// backend/routes.js
router.post("/register", async (req, res) => {
  const { email, password, code } = req.body;

  try {
    const userRecord = await auth.createUser({ email, password });

    // Check if the entered code matches the code in signUpCode collection
    const signUpCodeRef = db.collection("signUpCode").doc("employee");
    const signUpCodeDoc = await signUpCodeRef.get();

    let role = "public";
    if (signUpCodeDoc.exists && signUpCodeDoc.data().code === code) {
      role = "employee";
    }

    // Create a new userProfile document in the Firestore collection
    await db.collection("userProfile").doc(userRecord.uid).set({
      email,
      role,
    });

    res.status(201).json({ message: `User created successfully: ${userRecord.uid}` });
  } catch (error) {
    console.error("Error in /register:", error);
    res.status(400).json({ error: `Error creating user: ${error.message}` });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const userRecord = await auth.getUserByEmail(email);
    res.status(200).json({ message: `User found: ${userRecord.uid}` });
  } catch (error) {
    res.status(400).json({ error: `Error finding user: ${error.message}` });
  }
});

module.exports = router;