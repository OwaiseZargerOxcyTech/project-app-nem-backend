const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/user");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
require("dotenv").config();

//signup
exports.register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Check if the user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const otp = crypto.randomInt(100000, 999999).toString();

    // Create new user
    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      verified: "N",
      verifyotp: otp,
      company_existing: "N",
    });
    await newUser.save();

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: false, // Ignore self-signed certificates
      },
    });

    const mailOptions = {
      from: process.env.SMTP_USER,
      to: email,
      subject: "Verify Email",
      html: `<p>Use this OTP-<strong>${otp}</strong> to verify your email. Use Link http://localhost:5173/verify-email</p>`,
    };

    await transporter.sendMail(mailOptions);

    res
      .status(201)
      .json({ message: "Sent email verification OTP successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

//login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email });

    if (user.verified === "N") {
      return res.status(200).json({ message: "User Email not verified" });
    }

    if (!user) {
      return res.status(200).json({ message: "Invalid credentials" });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(200).json({ message: "Invalid credentials" });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.SECRET_KEY,
      {
        expiresIn: "24h",
      }
    );

    res.json({ token });
  } catch (error) {
    console.error(error);
    res.status(200).json({ message: error.message });
  }
};

//getusers

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}, "username"); // Retrieve only usernames
    res.status(200).json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.verifyEmail = async (req, res) => {
  const { otp } = req.body;
  console.log("otp", otp);
  try {
    const user = await User.findOneAndUpdate(
      { verifyotp: otp },
      { $set: { verifyotp: null, verified: "Y" } },
      { new: true }
    );

    if (!user) {
      return res.status(200).json({ message: "Invalid or expired OTP" });
    }

    return res.status(200).json({ message: "User verified successfully!" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
