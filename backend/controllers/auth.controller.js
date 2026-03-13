const pool = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const MASTER_ADMIN = {
  admin_id: 0,
  name: "Master Admin",
  email: "test@admin.com",
  password: "admin123",
};

function signAdminToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "7d" });
}

// ─── REGISTER ───────────────────────────────────────────
exports.register = async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password)
    return res.status(400).json({ message: "All fields are required" });

  if (password.length < 6)
    return res
      .status(400)
      .json({ message: "Password must be at least 6 characters" });

  try {
    // Check if email already exists
    const [existing] = await pool.query(
      "SELECT admin_id FROM Admins WHERE email = ?",
      [email],
    );
    if (existing.length > 0)
      return res.status(409).json({ message: "Email already registered" });

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // Insert admin
    const [result] = await pool.query(
      "INSERT INTO Admins (name, email, password_hash) VALUES (?, ?, ?)",
      [name, email, password_hash],
    );

    // Generate JWT
    const token = signAdminToken({
      admin_id: result.insertId,
      name,
      email,
      is_master: false,
    });

    res.status(201).json({
      message: "Account created successfully",
      token,
      admin: { admin_id: result.insertId, name, email, is_master: false },
    });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── LOGIN ───────────────────────────────────────────────
exports.login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ message: "Email and password are required" });

  try {
    if (
      email === MASTER_ADMIN.email &&
      password === MASTER_ADMIN.password
    ) {
      const token = signAdminToken({
        admin_id: MASTER_ADMIN.admin_id,
        name: MASTER_ADMIN.name,
        email: MASTER_ADMIN.email,
        is_master: true,
      });

      return res.json({
        message: "Login successful",
        token,
        admin: {
          admin_id: MASTER_ADMIN.admin_id,
          name: MASTER_ADMIN.name,
          email: MASTER_ADMIN.email,
          is_master: true,
        },
      });
    }

    // Find admin by email
    const [rows] = await pool.query("SELECT * FROM Admins WHERE email = ?", [
      email,
    ]);
    if (rows.length === 0)
      return res.status(401).json({ message: "Invalid email or password" });

    const admin = rows[0];

    // Compare password
    const match = await bcrypt.compare(password, admin.password_hash);
    if (!match)
      return res.status(401).json({ message: "Invalid email or password" });

    // Generate JWT
    const token = signAdminToken({
      admin_id: admin.admin_id,
      name: admin.name,
      email: admin.email,
      is_master: false,
    });

    res.json({
      message: "Login successful",
      token,
      admin: {
        admin_id: admin.admin_id,
        name: admin.name,
        email: admin.email,
        is_master: false,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── GET CURRENT ADMIN (verify token) ────────────────────
exports.getMe = async (req, res) => {
  try {
    if (req.user.is_master) {
      return res.json({
        admin: {
          admin_id: MASTER_ADMIN.admin_id,
          name: MASTER_ADMIN.name,
          email: MASTER_ADMIN.email,
          is_master: true,
        },
      });
    }

    const [rows] = await pool.query(
      "SELECT admin_id, name, email, created_at FROM Admins WHERE admin_id = ?",
      [req.user.admin_id],
    );
    if (rows.length === 0)
      return res.status(404).json({ message: "Admin not found" });

    res.json({ admin: { ...rows[0], is_master: false } });
  } catch (err) {
    console.error("GetMe error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
