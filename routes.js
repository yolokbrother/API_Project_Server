// backend/routes.js
const express = require("express");
const { auth } = require("./firebaseAdmin");
const router = express.Router();

// backend/routes.js
router.post("/register", async (req, res) => {
  const { email, password } = req.body;
  try {
    const userRecord = await auth.createUser({ email, password });
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