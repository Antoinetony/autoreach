const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Routes
const reviewRoutes = require('./routes/reviews');
const feedbackRoutes = require('./routes/feedback');
const dashboardRoutes = require('./routes/dashboard');
const authRoutes = require('./routes/auth');
const loyaltyRoutes = require('./routes/loyalty');

app.use('/api/reviews', reviewRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/loyalty', loyaltyRoutes);

// Serve HTML pages
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/review', (req, res) => res.sendFile(path.join(__dirname, 'public', 'review.html')));
app.get('/feedback', (req, res) => res.sendFile(path.join(__dirname, 'public', 'feedback.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'public', 'dashboard.html')));
app.get('/signup', (req, res) => res.sendFile(path.join(__dirname, 'public', 'signup.html')));
app.get('/sms-landing', (req, res) => res.sendFile(path.join(__dirname, 'public', 'sms-landing.html')));
app.get('/loyalty', (req, res) => res.sendFile(path.join(__dirname, 'public', 'loyalty.html'))); app.get('/qr-design', (req, res) => res.sendFile(path.join(__dirname, 'public', 'qr-design.html')));

app.listen(PORT, () => {
  console.log(`Autoreach running on port ${PORT}`);
});

module.exports = app;