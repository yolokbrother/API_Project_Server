// backend/routes.js
const express = require("express");
const { auth, db, firebaseStorage, admin } = require("./firebaseAdmin"); // Import db and firebaseStorage
const router = express.Router();
const multer = require("multer");
const { storage } = multer.memoryStorage();
const upload = multer({ storage: storage });
const authenticate = require('./authMiddleware');
//twitter
const { postTweet } = require('./twitter');

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *         password:
 *           type: string
 *           format: password
 *         signUpCode:
 *           type: string
 *           description: Optional sign up code for employee registration
 *       example:
 *         email: user@example.com
 *         password: password123
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Cat:
 *       type: object
 *       required:
 *         - id
 *         - catBreed
 *         - catName
 *         - catDescription
 *         - location
 *         - userUid
 *         - catImage
 *       properties:
 *         id:
 *           type: string
 *         catBreed:
 *           type: string
 *         catName:
 *           type: string
 *         catDescription:
 *           type: string
 *         location:
 *           type: string
 *         userUid:
 *           type: string
 *         catImage:
 *           type: string
 *       example:
 *         id: abc123
 *         catBreed: Maine Coon
 *         catName: Fluffy
 *         catDescription: A very fluffy cat.
 *         location: New York, NY
 *         userUid: user123
 *         catImage: https://example.com/cat-image.jpg
 */

/**
 * @swagger
 * /register:
 *   post:
 *     summary: Register a new user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/User'
 *     responses:
 *       201:
 *         description: User created successfully
 *       400:
 *         description: Error creating user
 */
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

/**
 * @swagger
 * /login:
 *   post:
 *     summary: Login the user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/User'
 *     responses:
 *       200:
 *         description: User found
 *       400:
 *         description: Error finding user
 */
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const userRecord = await auth.getUserByEmail(email);
    res.status(200).json({ user: userRecord });
  } catch (error) {
    res.status(400).json({ error: `Error finding user: ${error.message}` });
  }
});

/**
 * @swagger
 * /userRole/{userId}:
 *   get:
 *     summary: Fetch user role
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User role fetched successfully
 *       500:
 *         description: Error fetching user role
 */
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


/**
 * @swagger
 * /userData/{userId}:
 *   get:
 *     summary: Fetch user data
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User data fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *       500:
 *         description: Error fetching user data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
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

/**
 * @swagger
 * /cats:
 *   get:
 *     summary: Get all cats for a specific user
 *     parameters:
 *       - in: query
 *         name: userUid
 *         required: false
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Cat data fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *       500:
 *         description: Error fetching cat data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
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

/**
 * @swagger
 * /AllCats:
 *   get:
 *     summary: Get all cats
 *     responses:
 *       200:
 *         description: Cat data fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *       500:
 *         description: Error fetching cat data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
router.get("/AllCats", async (req, res) => {
  try {
    let catQuery = db.collection("Cats");
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


/**
 * @swagger
 * /cats/{catId}:
 *   get:
 *     summary: Fetch a single cat entry
 *     parameters:
 *       - in: path
 *         name: catId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Cat entry fetched successfully
 *       404:
 *         description: Cat not found
 *       500:
 *         description: Error fetching cat
 */
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

/**
 * @swagger
 * /chat:
 *   post:
 *     summary: Post a chat message
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - catId
 *               - message
 *             properties:
 *               catId:
 *                 type: string
 *               message:
 *                 type: object
 *                 properties:
 *                   userId:
 *                     type: string
 *                   text:
 *                     type: string
 *                   timestamp:
 *                     type: string
 *             example:
 *               catId: abc123
 *               message:
 *                 userId: user123
 *                 text: Hello, world!
 *                 timestamp: "2023-06-18T00:00:00.000Z"
 *     responses:
 *       201:
 *         description: Message added successfully
 *       400:
 *         description: Error adding message
 */
router.post('/chat', async (req, res) => {
  const { catId, message } = req.body;

  try {
    const messagesRef = db.collection('messages');
    console.log(message)
    await messagesRef.add({
      catId,
      userId: message.userId,
      text: message.text,
      timestamp: message.timestamp,
    });

    let messageId = message.id;
    res.status(201).json({ message: 'Message added successfully', messageId });
  } catch (error) {
    console.error('Error in /chat POST:', error);
    res.status(400).json({ error: `Error adding message: ${error.message}` });
  }
});

/**
 * @swagger
 * /chat/{catId}:
 *   get:
 *     summary: Fetch chat messages for a specific cat
 *     parameters:
 *       - in: path
 *         name: catId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Chat messages fetched successfully
 *       400:
 *         description: Error fetching messages
 */
router.get('/chat/:catId', async (req, res) => {
  const { catId } = req.params;

  try {
    const messagesRef = db.collection('messages');
    const messagesSnapshot = await messagesRef.where('catId', '==', catId).orderBy('timestamp').get();

    console.log('catId:', catId);
    console.log('messagesSnapshot size:', messagesSnapshot.size);

    const messages = [];

    messagesSnapshot.forEach((doc) => {
      const message = {
        id: doc.id,
        ...doc.data(),
      };
      messages.push(message);
    });

    res.status(200).json({ messages });
  } catch (error) {
    console.error('Error in /chat/:catId:', error);
    res.status(400).json({ error: `Error fetching messages: ${error.message}` });
  }
});

/**
 * @swagger
 * /chat/{catId}/{messageId}:
 *   delete:
 *     summary: Delete a chat message
 *     parameters:
 *       - in: path
 *         name: catId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Message deleted successfully
 *       404:
 *         description: Message not found
 *       500:
 *         description: Error deleting message
 */
router.delete('/chat/:catId/:messageId', async (req, res) => {
  const { catId, messageId } = req.params;

  console.log('Received DELETE request for catId:', catId, 'and messageId:', messageId);

  try {
    const chatRef = db.collection('messages').doc(messageId);
    const chatSnapshot = await chatRef.get();

    if (chatSnapshot.exists) {
      console.log('Message found:', chatSnapshot.data());

      if (chatSnapshot.data().catId === catId) {
        await chatRef.delete();
        res.status(200).json({ message: 'Message deleted successfully' });
      } else {
        console.log('Mismatched catId for the message');
        res.status(404).json({ error: 'Message not found' });
      }
    } else {
      console.log('Message not found');
      res.status(404).json({ error: 'Message not found' });
    }
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ error: 'Error deleting message' });
  }
});

/**
 * @swagger
 * /add-cat:
 *   post:
 *     summary: Add a new cat entry
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - catBreed
 *               - catName
 *               - catDescription
 *               - location
 *               - userUid
 *               - catImage
 *             properties:
 *               catBreed:
 *                 type: string
 *               catName:
 *                 type: string
 *               catDescription:
 *                 type: string
 *               location:
 *                 type: string
 *               userUid:
 *                 type: string
 *               catImage:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Cat entry added successfully
 *       500:
 *         description: Error adding cat entry
 */
router.post("/add-cat", authenticate, upload.single("catImage"), async (req, res) => {
  try {
    const { catBreed, catName, catDescription, location, userUid } = req.body;
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

/**
 * @swagger
 * /cats/{catId}:
 *   delete:
 *     summary: Delete a cat entry
 *     parameters:
 *       - in: path
 *         name: catId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Cat entry deleted successfully
 *       500:
 *         description: Error deleting cat entry
 */
router.delete("/cats/:catId", authenticate, async (req, res) => {
  try {
    const { catId } = req.params;
    await db.collection("Cats").doc(catId).delete();
    res.status(200).json({ message: "Cat entry deleted successfully" });
  } catch (error) {
    console.error("Error deleting cat entry:", error);
    res.status(500).json({ error: "Error deleting cat entry" });
  }
});

/**
 * @swagger
 * /cats/{catId}:
 *   put:
 *     summary: Update a cat entry
 *     parameters:
 *       - in: path
 *         name: catId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               catBreed:
 *                 type: string
 *               catName:
 *                 type: string
 *               catDescription:
 *                 type: string
 *               location:
 *                 type: string
 *     responses:
 *       200:
 *         description: Cat entry updated successfully
 *       500:
 *         description: Error updating cat entry
 */
router.put("/cats/:catId", authenticate, async (req, res) => {
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

/**
 * @swagger
 * /add-favorite:
 *   post:
 *     summary: Add a favorite cat
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Cat'
 *     responses:
 *       200:
 *         description: Favorite added successfully
 *       500:
 *         description: Error adding favorite
 */
router.post('/add-favorite', authenticate, async (req, res) => {
  try {
    const cat = req.body;
    await db.collection('favorites').doc(cat.id).set(cat);
    res.status(200).send({ message: 'Favorite added successfully' });
  } catch (error) {
    console.error('Error adding favorite:', error);
    res.status(500).send({ message: 'Error adding favorite', error });
  }
});

/**
 * @swagger
 * /FavouriteCats:
 *   get:
 *     summary: Fetch favorite cats
 *     parameters:
 *       - in: query
 *         name: userUid
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Cat data fetched successfully
 *       500:
 *         description: Error fetching cat data
 */
router.get("/FavouriteCats", authenticate, async (req, res) => {
  try {
    const userUid = req.query.userUid;
    let catQuery = db.collection("favorites");
    if (userUid) {
      catQuery = catQuery.where("favouriteUid", "==", userUid);
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

/**
 * @swagger
 * /post-tweet:
 *   post:
 *     summary: Post a tweet
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               tweet:
 *                 type: string
 *             example:
 *               tweet: Check out this adorable cat!
 *     responses:
 *       201:
 *         description: Tweet posted successfully
 *       400:
 *         description: Error posting tweet
 */
router.post('/post-tweet', authenticate, async (req, res) => {
  const { tweet } = req.body;

  try {
    const tweetId = await postTweet(tweet);
    res.status(201).json({ message: 'Tweet posted successfully', tweetId });
  } catch (error) {
    console.error('Error in /post-tweet POST:', error);
    res.status(400).json({ error: `Error posting tweet: ${error.message}` });
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