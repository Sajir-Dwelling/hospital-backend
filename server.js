require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

// Connect to MongoDB
connectDB();

const app = express();

// Middleware
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Request logger (dev only)
if (process.env.NODE_ENV === 'development') {
  app.use((req, _res, next) => {
    console.log(`${req.method} ${req.originalUrl}`);
    next();
  });
}

// ── Routes ────────────────────────────────────────────────────────
app.use('/api/auth',          require('./routes/auth'));
app.use('/api/appointments',  require('./routes/appointments'));
app.use('/api/prescriptions', require('./routes/prescriptions'));
app.use('/api/billing',       require('./routes/billing'));
app.use('/api/admin',         require('./routes/admin'));
app.use('/api/doctors',       require('./routes/doctors'));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ success: true, message: 'MedCore HMS API is running ✅', env: process.env.NODE_ENV });
});

app.get('/api/seed-demo', async (req, res) => {
  const User = require('./models/User');
  await User.deleteMany({});
  const users = [
    { name:'Admin User', email:'admin@hms.com', password:'admin123', role:'admin', avatar:'AD', phone:'01700-000000' },
    { name:'Dr. Nusrat Khan', email:'doctor@hms.com', password:'doctor123', role:'doctor', avatar:'NK', department:'Cardiology', qualification:'MBBS, MD', experience:'12 years', phone:'01711-001001', rating:4.9 },
    { name:'Dr. Tariq Hossain', email:'tariq@hms.com', password:'doctor123', role:'doctor', avatar:'TH', department:'Neurology', qualification:'MBBS, MD', experience:'8 years', phone:'01711-002002', rating:4.7 },
    { name:'Rafiq Ahmed', email:'patient@hms.com', password:'patient123', role:'patient', avatar:'RA', age:45, bloodGroup:'B+', phone:'01800-111111' },
  ];
  for (const u of users) await User.create(u);
  res.json({ success: true, message: 'Seeded successfully!' });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Global error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🚀 Server running on http://localhost:${PORT}`);
  console.log(`📋 Environment: ${process.env.NODE_ENV || 'development'}\n`);
});
