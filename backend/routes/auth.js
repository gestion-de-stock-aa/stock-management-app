const express = require('express');
const router = express.Router();
const pool = require('../model/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const verifyAdmin = require('../middleware/verifyAdmin');

// 🔢 حساب المسافة الإقليدية
function euclideanDistance(arr1, arr2) {
  let sum = 0;
  for (let i = 0; i < arr1.length; i++) {
    const diff = arr1[i] - arr2[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

// ✅ REGISTER: تسجيل مستخدم جديد
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, faceDescriptors } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: 'جميع الحقول مطلوبة' });
    }

    if (role === 'staff') {
      if (!faceDescriptors || !Array.isArray(faceDescriptors) || faceDescriptors.length === 0) {
        return res.status(400).json({ message: 'الوجوه مطلوبة لموظفي الـ staff' });
      }
    }

    const userExists = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (userExists.rows.length > 0) {
      return res.status(409).json({ message: 'المستخدم موجود مسبقاً' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    let faceDescriptorBuffer = null;
    if (role === 'staff') {
      const meanDescriptor = faceDescriptors[0].map((_, i) => {
        let sum = 0;
        for (let desc of faceDescriptors) {
          sum += desc[i];
        }
        return sum / faceDescriptors.length;
      });

      faceDescriptorBuffer = Buffer.from(new Float32Array(meanDescriptor).buffer);
    }

    await pool.query(
      `INSERT INTO users (name, email, password_hash, role, face_descriptor)
       VALUES ($1, $2, $3, $4, $5::bytea)`,
      [name, email, hashedPassword, role, faceDescriptorBuffer || null]
    );

    res.json({ message: 'تم التسجيل بنجاح!' });

  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ message: 'حدث خطأ في الخادم' });
  }
});

// ✅ LOGIN: تسجيل الدخول
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password required.' });
  }

  try {
    const result = await pool.query(
      'SELECT id, password_hash, role FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'User not found.' });
    }

    const user = result.rows[0];
    if (!user.password_hash) {
      return res.status(500).json({ message: 'Password not set for this user.' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ message: 'Invalid password.' });
    }

    if (user.role === 'admin') {
      const token = jwt.sign(
        { userId: user.id, role: 'admin', email },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
      return res.json({ token, role: 'admin' });
    }

    return res.json({ valid: true, role: 'staff' });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error during login.' });
  }
  console.log('Password entered:', password);
console.log('Password in DB:', user.password_hash);

});

// ✅ Face Login for staff only
router.post('/face-login', async (req, res) => {
  const { email, descriptor } = req.body;

  if (!email || !descriptor) {
    return res.status(400).json({ message: 'Email and face descriptor required' });
  }

  try {
    const result = await pool.query(
      'SELECT id, role, face_descriptor FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'User not found' });
    }

    const user = result.rows[0];

    if (user.role !== 'staff') {
      return res.status(403).json({ message: 'Only staff can login with Face ID.' });
    }

    if (!user.face_descriptor) {
      return res.status(401).json({ message: 'Face data not registered.' });
    }

    const buf = user.face_descriptor;
    const storedDescriptor = new Float32Array(buf.buffer, buf.byteOffset, buf.length / Float32Array.BYTES_PER_ELEMENT);

    const distance = euclideanDistance(descriptor, Array.from(storedDescriptor));
    const THRESHOLD = 0.45;

    if (distance > THRESHOLD) {
      return res.status(401).json({ message: 'Face not recognized.' });
    }

    const token = jwt.sign(
      { userId: user.id, role: 'staff', email },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({ token, message: 'Face login successful' });

  } catch (err) {
    console.error('Face login error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ✅ Get All Staff Users (Admin only)
router.get('/users', verifyAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, email FROM users WHERE role = $1', ['staff']);
    res.json(result.rows);
  } catch (err) {
    console.error('Error getting users:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// حذف موظف حسب ID - خاص بالمدير فقط
router.delete('/:id', verifyAdmin, async (req, res) => {
  const id = req.params.id;
  try {
    const check = await pool.query('SELECT role FROM users WHERE id = $1', [id]);
    if (check.rows.length === 0) return res.status(404).json({ message: 'User not found' });
    if (check.rows[0].role === 'admin') return res.status(403).json({ message: 'Cannot delete admin user' });

    await pool.query('DELETE FROM users WHERE id = $1', [id]);
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ message: 'Server error' });
  }
});


module.exports = router;
