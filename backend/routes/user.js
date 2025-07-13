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

router.get('/stores', authMiddleware, roleMiddleware('user'), async (req, res) => {
  try {
    const [stores] = await db.query(`
      SELECT s.*, 
        (SELECT AVG(rating_value) FROM ratings WHERE store_id = s.id) AS average_rating
      FROM stores s
    `);
    res.status(200).json({ stores });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch stores" });
  }
});

router.get('/stores/search', authMiddleware, roleMiddleware('user'), async (req, res) => {
  const { q } = req.query;
  try {
    const [stores] = await db.query(`
      SELECT s.*, 
        (SELECT AVG(rating_value) FROM ratings WHERE store_id = s.id) AS average_rating
      FROM stores s
      WHERE s.name LIKE ? OR s.address LIKE ?
    `, [`%${q}%`, `%${q}%`]);
    res.status(200).json({ stores });
  } catch (err) {
    res.status(500).json({ error: "Search failed" });
  }
});

router.post('/rate/:storeId', authMiddleware, roleMiddleware('user'), async (req, res) => {
  const storeId = parseInt(req.params.storeId);
  const rating = parseInt(req.body.rating);
  const userId = req.user.id;

  if (rating < 1 || rating > 5) {
    return res.status(400).json({ error: "Rating must be between 1 and 5" });
  }

  try {
    
    await db.query(`
      INSERT INTO ratings (user_id, store_id, rating_value)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE rating_value = VALUES(rating_value)
    `, [userId, storeId, rating]);

    res.status(200).json({ message: "Rating submitted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to submit rating" });
  }
});

router.get('/owner/dashboard', authMiddleware, roleMiddleware('owner'), async (req, res) => {
  const ownerId = req.user.id;

  try {
   
    const [stores] = await db.query("SELECT id, name FROM stores WHERE owner_id = ?", [ownerId]);

    if (stores.length === 0) {
      return res.status(404).json({ error: "No store found for this owner" });
    }

    const store = stores[0];

    const [[avg]] = await db.query(
      "SELECT AVG(rating_value) as average FROM ratings WHERE store_id = ?",
      [store.id]
    );

    const [raters] = await db.query(`
      SELECT u.name, u.email, r.rating_value
      FROM ratings r
      JOIN users u ON r.user_id = u.id
      WHERE r.store_id = ?
    `, [store.id]);

    res.status(200).json({
      storeName: store.name,
      averageRating: avg.average || 0,
      ratings: raters
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to load dashboard" });
  }
});


router.get('/admin/users', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  const { search = "", sortBy = "name", order = "asc" } = req.query;
  const validSortFields = ["name", "email", "address", "role"];
  const sort = validSortFields.includes(sortBy) ? sortBy : "name";
  const sortOrder = order.toLowerCase() === "desc" ? "DESC" : "ASC";

  try {
    const [users] = await db.query(`
      SELECT id, name, email, address, role 
      FROM users 
      WHERE name LIKE ? OR email LIKE ? OR address LIKE ? OR role LIKE ?
      ORDER BY ${sort} ${sortOrder}
    `, [`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`]);

    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
});



module.exports = router;
