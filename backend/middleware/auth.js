const db = require("../db");

// Middleware to authenticate user via email header
async function authMiddleware(req, res, next) {
  const email = req.headers.email;
  if (!email) return res.status(401).json({ error: "Missing email header" });

  try {
    const [rows] = await db.query("SELECT * FROM users WHERE email = ?", [email]);
    if (rows.length === 0) {
      return res.status(401).json({ error: "User not found" });
    }
    req.user = rows[0]; // attach user to req
    next();
  } catch (err) {
    return res.status(500).json({ error: "Authentication failed" });
  }
}

function roleMiddleware(requiredRole) {
  return (req, res, next) => {
    if (req.user.role !== requiredRole) {
      return res.status(403).json({ error: "Access denied" });
    }
    next();
  };
}

module.exports = {
  authMiddleware,
  roleMiddleware
};
