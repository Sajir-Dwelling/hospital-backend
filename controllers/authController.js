const User = require('../models/User');
const generateToken = require('../utils/generateToken');

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res, next) => {
  try {
    const { name, email, password, role, phone, age, bloodGroup, department, qualification, experience } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      res.statusCode = 400;
      throw new Error('Email already registered');
    }

    // Only allow patient/doctor self-registration; admin is seeded
    const allowedRoles = ['patient', 'doctor'];
    const userRole = allowedRoles.includes(role) ? role : 'patient';

    const user = await User.create({
      name, email, password, role: userRole,
      phone: phone || '',
      age: age || undefined,
      bloodGroup: bloodGroup || '',
      department: department || '',
      qualification: qualification || '',
      experience: experience || '',
      avatar: name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(),
    });

    res.status(201).json({
      success: true,
      token: generateToken(user._id),
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.statusCode = 400;
      throw new Error('Please provide email and password');
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.matchPassword(password))) {
      res.statusCode = 401;
      throw new Error('Invalid email or password');
    }

    if (!user.isActive) {
      res.statusCode = 403;
      throw new Error('Account is deactivated. Contact admin.');
    }

    res.json({
      success: true,
      token: generateToken(user._id),
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        department: user.department,
        bloodGroup: user.bloodGroup,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get logged-in user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
};

// @desc    Update profile
// @route   PUT /api/auth/me
// @access  Private
const updateMe = async (req, res, next) => {
  try {
    const fields = ['name', 'phone', 'address', 'age', 'bloodGroup', 'department', 'qualification', 'experience'];
    const updates = {};
    fields.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
};

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select('+password');

    if (!(await user.matchPassword(currentPassword))) {
      res.statusCode = 400;
      throw new Error('Current password is incorrect');
    }

    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, getMe, updateMe, changePassword };
