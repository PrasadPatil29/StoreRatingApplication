const { Router } = require("express");
const router = Router();
const db = require("../db");
const { signupSchema, loginSchema } = require("../utils/validators");
const { authMiddleware, roleMiddleware } = require("../middleware/auth");


// Signup
router.post('/signup', async (req, res) => {
    const parseResult = signupSchema.safeParse(req.body);
    if (!parseResult.success) {
        return res.status(400).json({ error: parseResult.error.errors });
    }

    const { name, email, address, password } = req.body;

    try {
        const [result] = await db.query(
            "INSERT INTO users (name, email, address, password) VALUES (?, ?, ?, ?)",
            [name, email, address, password]
        );
        res.status(201).json({ message: "User created successfully" });
    } catch (err) {
        res.status(500).json({ error: "Something went wrong" });
    }
});
// Login
router.post('/login', async (req, res) => {
   const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
        return res.status(400).json({ error: parseResult.error.errors });
    }

    const { email, password } = req.body;

    try {
        const [rows] = await db.query(
            "SELECT * FROM users WHERE email = ? AND password = ?",
            [email, password]
        );

        if (rows.length === 0) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        const user = rows[0];
        res.status(200).json({
            message: "Login successful",
            role: user.role
        });
    } catch (err) {
        res.status(500).json({ error: "Login failed" });
    }
});


router.post('/admin/add-user', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  const { name, email, address, password, role } = req.body;

  try {
    await db.query(
      "INSERT INTO users (name, email, address, password, role) VALUES (?, ?, ?, ?, ?)",
      [name, email, address, password, role]
    );
    res.status(201).json({ message: "User added successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to add user" });
  }
});

router.post('/admin/add-store', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  const { name, email, address, owner_id } = req.body;

  try {
    await db.query(
      "INSERT INTO stores (name, email, address, owner_id) VALUES (?, ?, ?, ?)",
      [name, email, address, owner_id]
    );
    res.status(201).json({ message: "Store added successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to add store" });
  }
});

router.get('/admin/dashboard', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  try {
    const [[users]] = await db.query("SELECT COUNT(*) AS totalUsers FROM users");
    const [[stores]] = await db.query("SELECT COUNT(*) AS totalStores FROM stores");
    const [[ratings]] = await db.query("SELECT COUNT(*) AS totalRatings FROM ratings");

    res.status(200).json({
      totalUsers: users.totalUsers,
      totalStores: stores.totalStores,
      totalRatings: ratings.totalRatings
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to load dashboard" });
  }
});



module.exports = router;
