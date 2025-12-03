const express = require('express');
const router = express.Router();
const pool = require('../model/db');
const verifyAdmin = require('../middleware/verifyAdmin');

const verifyUser = (req, res, next) => {
  const userEmail = req.headers['x-user-email'];
  if (!userEmail) {
    return res.status(401).json({ message: 'غير مصرح' });
  }
  req.user = { email: userEmail };
  next();
};

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM sel3a ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

router.post('/', verifyUser, async (req, res) => {
  const { name, price, quantity } = req.body;
  const added_by = req.user.email;

  if (!name || !price || quantity == null) {
    return res.status(400).json({ message: 'الاسم، السعر، الكمية مطلوبة' });
  }

  try {
    await pool.query(
      'INSERT INTO sel3a (name, price, quantity, added_by) VALUES ($1, $2, $3, $4)',
      [name, price, quantity, added_by]
    );
    res.json({ message: 'تم إضافة المنتج' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'حدث خطأ أثناء الحفظ' });
  }
});

router.put('/:id', verifyUser, async (req, res) => {
  const id = req.params.id;
  const { name, price, quantity } = req.body;
  const userEmail = req.user.email;

  try {
    const checkOwner = await pool.query('SELECT added_by FROM sel3a WHERE id = $1', [id]);
    if (checkOwner.rows.length === 0) {
      return res.status(404).json({ message: 'المنتج غير موجود' });
    }
    if (checkOwner.rows[0].added_by !== userEmail) {
      return res.status(403).json({ message: 'غير مسموح لك بتعديل هذا المنتج' });
    }

    await pool.query(
      'UPDATE sel3a SET name=$1, price=$2, quantity=$3 WHERE id=$4',
      [name, price, quantity, id]
    );
    res.json({ message: 'تم تعديل المنتج' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'حدث خطأ أثناء التعديل' });
  }
});

router.delete('/:id', verifyUser, async (req, res) => {
  const id = req.params.id;
  const userEmail = req.user.email;

  try {
    const checkOwner = await pool.query('SELECT added_by FROM sel3a WHERE id = $1', [id]);
    if (checkOwner.rows.length === 0) {
      return res.status(404).json({ message: 'المنتج غير موجود' });
    }
    if (checkOwner.rows[0].added_by !== userEmail) {
      return res.status(403).json({ message: 'غير مسموح لك بحذف هذا المنتج' });
    }

    await pool.query('DELETE FROM sel3a WHERE id=$1', [id]);
    res.json({ message: 'تم حذف المنتج' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'حدث خطأ أثناء الحذف' });
  }
});

// أخذ كمية من سلعة معيّنة
router.post('/take/:id', verifyUser, async (req, res) => {
  const sel3aId = req.params.id;
  const takenBy = req.user.email;
  const { quantity } = req.body;

  if (!quantity || quantity <= 0) {
    return res.status(400).json({ message: 'الكمية غير صالحة' });
  }

  try {
    // التثبت من وجود السلعة
    const result = await pool.query('SELECT quantity FROM sel3a WHERE id = $1', [sel3aId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'السلعة غير موجودة' });
    }

    const currentQuantity = result.rows[0].quantity;
    if (quantity > currentQuantity) {
      return res.status(400).json({ message: 'الكمية المطلوبة غير متوفرة' });
    }

    // تنقيص الكمية من السلعة
    await pool.query('UPDATE sel3a SET quantity = quantity - $1 WHERE id = $2', [quantity, sel3aId]);

    // تسجيل العملية في جدول sel3a_taken
    await pool.query(
      'INSERT INTO sel3a_taken (sel3a_id, taken_by, taken_quantity) VALUES ($1, $2, $3)',
      [sel3aId, takenBy, quantity]
    );

    res.json({ message: 'تم أخذ الكمية بنجاح' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'حدث خطأ أثناء العملية' });
  }
});

// GET تقرير الكميات المأخوذة مع أسماء السلع والمستخدمين
router.get('/taken-report', verifyUser, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT st.id, st.taken_quantity, st.taken_at, st.taken_by, s.name AS sel3a_name
      FROM sel3a_taken st
      JOIN sel3a s ON st.sel3a_id = s.id
      ORDER BY st.taken_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'حدث خطأ أثناء جلب التقرير' });
  }
});
router.get('/taken-report/summary', verifyUser, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        s.id AS sel3a_id,
        s.name AS sel3a_name,
        COALESCE(SUM(st.taken_quantity), 0) AS total_taken_quantity
      FROM sel3a s
      LEFT JOIN sel3a_taken st ON s.id = st.sel3a_id
      GROUP BY s.id, s.name
      ORDER BY s.name
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'حدث خطأ أثناء جلب ملخص التقرير' });
  }
});
router.get('/taken-report/details/:id', verifyUser, async (req, res) => {
  const sel3aId = req.params.id;

  try {
    const sel3aRes = await pool.query(
      `SELECT 
        name, 
        added_by, 
        quantity AS remaining_quantity,
        (quantity + COALESCE((SELECT SUM(taken_quantity) FROM sel3a_taken WHERE sel3a_id = $1), 0)) AS total_added
       FROM sel3a 
       WHERE id = $1`,
      [sel3aId]
    );

    if (sel3aRes.rows.length === 0) {
      return res.status(404).json({ message: 'السلعة غير موجودة' });
    }

    const detailsRes = await pool.query(
      'SELECT id, taken_quantity, taken_by, taken_at FROM sel3a_taken WHERE sel3a_id = $1 ORDER BY taken_at DESC',
      [sel3aId]
    );

    res.json({
      sel3a_name: sel3aRes.rows[0].name,
      added_by: sel3aRes.rows[0].added_by,
      total_added: sel3aRes.rows[0].total_added,
      remaining_quantity: sel3aRes.rows[0].remaining_quantity,
      details: detailsRes.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'حدث خطأ أثناء جلب التفاصيل' });
  }
});

// 📜 تقرير كامل بالعمليات
router.get('/taken-report/all', async (req, res) => {
  try {
    const query = `
      SELECT t.id, s.name AS sel3a_name, t.taken_quantity, u.name AS taken_by, t.taken_at
      FROM sel3a_taken t
      JOIN sel3a s ON t.sel3a_id = s.id
      JOIN users u ON t.taken_by = u.email
      ORDER BY t.taken_at DESC
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching taken report:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// API لجلب قائمة السلع كاملة
router.get('/list', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT s.id, s.name, s.price, s.quantity, u.name AS added_by_name
      FROM sel3a s
      LEFT JOIN users u ON s.added_by = u.email
      ORDER BY s.name
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching sel3a list:', err);
    res.status(500).json({ message: 'Server error' });
  }
});



module.exports = router;
