require('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors');
const authRouter = require('./routes/auth');
const sel3aRouter = require('./routes/sel3a');
// neww bass mysql
app.use(cors());
app.use(express.json());


// راوترات
app.use('/api/auth', authRouter);
app.use('/api/sel3a', sel3aRouter);

// مسار افتراضي
app.get('/', (req, res) => {
  res.send('Server is running');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
