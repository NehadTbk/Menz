const { User } = require('../models');
const {
  isValidEmail,
  isValidBelgianPhone,
  isValidPostalCode,
  containsNoDigits,
  isBlank,
} = require('../utils/validators');
const { generateToken } = require('../utils/token');

const REQUIRED_FIELDS = [
  'first_name',
  'last_name',
  'email',
  'phone',
  'street',
  'house_number',
  'postal_code',
  'city',
  'password',
  'confirm_password',
];

function validateRegisterInput(body) {
  const errors = [];
  const {
    first_name, last_name, email, phone, postal_code, password, confirm_password,
  } = body;

  for (const field of REQUIRED_FIELDS) {
    if (isBlank(body[field])) {
      errors.push(`${field} is required`);
    }
  }

  if (!isBlank(first_name) && !containsNoDigits(first_name)) {
    errors.push('First name cannot contain digits');
  }
  if (!isBlank(last_name) && !containsNoDigits(last_name)) {
    errors.push('Last name cannot contain digits');
  }
  if (!isBlank(email) && !isValidEmail(email)) {
    errors.push('Invalid email format');
  }
  if (!isBlank(phone) && !isValidBelgianPhone(phone)) {
    errors.push('Phone number must be a valid Belgian format (e.g. +32 470 12 34 56 or 0470 12 34 56)');
  }
  if (!isBlank(postal_code) && !isValidPostalCode(postal_code)) {
    errors.push('Postal code must be exactly 4 digits');
  }
  if (!isBlank(password) && password.length < 6) {
    errors.push('Password must be at least 6 characters long');
  }
  if (!isBlank(password) && !isBlank(confirm_password) && password !== confirm_password) {
    errors.push('Passwords do not match');
  }

  return errors;
}

async function register(req, res, next) {
  try {
    const errors = validateRegisterInput(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    const {
      first_name, last_name, email, phone, street, house_number, postal_code, city, password,
    } = req.body;

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(409).json({ errors: ['Email is already registered'] });
    }

    const user = await User.create({
      first_name,
      last_name,
      email,
      phone,
      street,
      house_number,
      postal_code,
      city,
      password,
      role: 'client',
    });

    return res.status(201).json({
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      role: user.role,
    });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password, remember_me } = req.body;

    const errors = [];
    if (isBlank(email)) errors.push('email is required');
    else if (!isValidEmail(email)) errors.push('Invalid email format');
    if (isBlank(password)) errors.push('password is required');

    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    const genericError = { errors: ['Invalid email/password combination'] };

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json(genericError);
    }

    const passwordMatches = await user.comparePassword(password);
    if (!passwordMatches) {
      return res.status(401).json(genericError);
    }

    const { token, maxAge } = generateToken(
      { id: user.id, role: user.role },
      Boolean(remember_me),
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge,
    });

    return res.status(200).json({ role: user.role });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login };
