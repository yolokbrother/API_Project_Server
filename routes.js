// backend/routes.js
const express = require("express");
const { auth, db, firebaseStorage } = require("./firebaseAdmin"); // Import db and firebaseStorage
const router = express.Router();
const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// backend/routes.js
router.post("/register", async (req, res) => {
  const { email, password, signUpCode } = req.body;

  try {
    const userRecord = await auth.createUser({ email, password });

    // Check if the entered code matches the code in signUpCode collection
    const signUpCodeRef = db.collection("signUpCode").doc("employee");
    const signUpCodeDoc = await signUpCodeRef.get();

    let role = "public";
    let userName = "default";
    if (signUpCodeDoc.exists && signUpCodeDoc.data().code === signUpCode) {
      role = "employee";
    }

    console.log("SignUpCode data:", signUpCodeDoc.data()); // Debugging log
    console.log("Entered code:", signUpCode); // Debugging log
    console.log("Assigned role:", role); // Debugging log

    // Create a new userProfile document in the Firestore collection
    await db.collection("userProfile").doc(userRecord.uid).set({
      userName,
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

//fetch userRole
router.get("/userRole/:userId", async (req, res) => {
  const userId = req.params.userId;

  try {
    const role = await fetchUserRole(userId);
    res.status(200).json({ role });
  } catch (error) {
    console.error("Error fetching user role:", error);
    res.status(500).json({ error: "Error fetching user role" });
  }
});
//fetch userData
router.get("/userData/:userId", async (req, res) => {
  const userId = req.params.userId;

  try {
    const userData = await fetchUserData(userId);
    res.status(200).json(userData);
  } catch (error) {
    console.error("Error fetching user data:", error);
    res.status(500).json({ error: "Error fetching user data" });
  }
});

//add cats
router.post("/add-cat", upload.single("catImage"), async (req, res) => {
  try {
    const { catBreed, catName, catDescription, location,userUid } = req.body;
    const catImage = req.file;

    // Save the cat data in Firestore
    const catRef = db.collection("Cats").doc();
    await catRef.set({
      catId: catRef.id,
      catBreed,
      catName,
      catDescription,
      location,
      userUid
    });

    // Upload the image to Firebase Storage
    const bucket = firebaseStorage.bucket(); // Use firebaseStorage instead of storage
    const imageFileName = `cat-images/${catRef.id}/${catImage.originalname}`;
    const imageFile = bucket.file(imageFileName);
    const stream = imageFile.createWriteStream({
      metadata: {
        contentType: catImage.mimetype,
      },
    });

    stream.on("error", (err) => {
      console.error(err);
      return res.status(500).send(err);
    });

    stream.on("finish", async () => {
      // Get the public URL of the uploaded image
      const publicUrl = await imageFile.getSignedUrl({
        action: "read",
        expires: "03-01-2500",
      });

      // Update the cat document with the image URL
      await catRef.update({ catImage: publicUrl[0] });

      res.status(200).send({ success: true, catId: catRef.id });
    });

    stream.end(catImage.buffer);
  } catch (error) {
    console.error(error);
    res.status(500).send(error);
  }
});

// Get all cats for a specific user
router.get("/cats", async (req, res) => {
  try {
    const userUid = req.query.userUid;
    let catQuery = db.collection("Cats");

    if (userUid) {
      catQuery = catQuery.where("userUid", "==", userUid);
    }

    const catSnapshot = await catQuery.get();
    const catData = [];
    catSnapshot.forEach((doc) => {
      catData.push({ id: doc.id, ...doc.data() });
    });
    res.status(200).json(catData);
  } catch (error) {
    console.error("Error fetching cat data:", error);
    res.status(500).json({ error: "Error fetching cat data" });
  }
});

//fetching a single cat entry
router.get("/cats/:catId", async (req, res) => {
  try {
    const { catId } = req.params;
    const catRef = db.collection("Cats").doc(catId);
    const catDoc = await catRef.get();

    if (!catDoc.exists) {
      res.status(404).json({ error: "Cat not found" });
      return;
    }

    const catData = catDoc.data();
    res.status(200).json(catData);
  } catch (error) {
    console.error("Error fetching cat:", error);
    res.status(500).json({ error: `Error fetching cat: ${error.message}` });
  }
});


//delete cats
router.delete("/cats/:catId", async (req, res) => {
  try {
    const { catId } = req.params;
    await db.collection("Cats").doc(catId).delete();
    res.status(200).json({ message: "Cat entry deleted successfully" });
  } catch (error) {
    console.error("Error deleting cat entry:", error);
    res.status(500).json({ error: "Error deleting cat entry" });
  }
});


//update cats
router.put("/cats/:catId", async (req, res) => {
  try {
    const { catId } = req.params;
    const { catBreed, catName, catDescription, location } = req.body;

    const catRef = db.collection("Cats").doc(catId);
    await catRef.update({
      catBreed,
      catName,
      catDescription,
      location,
    });

    res.status(200).json({ message: `Cat entry updated successfully: ${catId}` });
  } catch (error) {
    console.error("Error updating cat entry:", error);
    res.status(500).json({ error: `Error updating cat entry: ${error.message}` });
  }
});

module.exports = router;

//functions
async function fetchUserRole(userId) {
  try {
    const userDoc = await db.collection("userProfile").doc(userId).get();
    if (userDoc.exists) {
      return userDoc.data().role;
    } else {
      throw new Error("User not found");
    }
  } catch (error) {
    console.error("Error fetching user role:", error);
    throw error;
  }
}

// Fetch user data function
async function fetchUserData(userId) {
  try {
    const userDoc = await db.collection("userProfile").doc(userId).get();
    if (userDoc.exists) {
      return userDoc.data();
    } else {
      throw new Error("User not found");
    }
  } catch (error) {
    console.error("Error fetching user data:", error);
    throw error;
  }
}