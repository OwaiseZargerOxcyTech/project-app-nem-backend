const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/user");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
require("dotenv").config();

const rfs = require("rotating-file-stream");
const path = require("path");
const fs = require("fs");
const cron = require("node-cron");

const CLIENT_ID = "Ov23li87CI6IGHklj3X2";

const CLIENT_SECRET = "c6264d2d43c4325eb996a87e78f00770ed96993e";

const logDirectory = path.join(process.cwd(), "log");

if (!fs.existsSync(logDirectory)) {
  fs.mkdirSync(logDirectory, { recursive: true }); // Create the directory if it doesn't exist
}

const consoleLogStream = rfs.createStream("console.log", {
  interval: "5m", // rotate daily
  path: logDirectory,
});

const originalConsoleLog = console.log;

console.log = function (message) {
  const utcTime = new Date();
  const istTime = new Date(utcTime.getTime() + 5.5 * 60 * 60 * 1000); // Add 5 hours and 30 minutes
  const istTimeString = istTime
    .toISOString()
    .replace("T", " ")
    .replace("Z", ""); // Convert to string and remove 'T' and 'Z'
  originalConsoleLog(`${istTimeString} - ${message}`); // Log to the console with IST time
  consoleLogStream.write(`${istTimeString} - ${message}\n`); // Log to the file with IST time
  // originalConsoleLog(message); // Log to the console
  // consoleLogStream.write(`${new Date().toISOString()} - ${message}\n`); // Log to the file
};

const deleteOldLogs = () => {
  const files = fs.readdirSync(logDirectory);
  const now = Date.now();

  files.forEach((file) => {
    const filePath = path.join(logDirectory, file);
    const fileStat = fs.statSync(filePath);
    // const fileAge = (now - fileStat.mtimeMs) / (1000 * 60 * 60 * 24); // Age in days
    const fileAge = (now - fileStat.mtimeMs) / (1000 * 60); // Age in minutes

    if (fileAge > 10) {
      // Older than 30 days
      fs.unlinkSync(filePath);
      console.log(`Deleted old log file: ${file}`);
    }
  });
};

// cron.schedule("0 0 * * *", () => {
//   console.log("Running daily log cleanup");
//   deleteOldLogs();
// });

cron.schedule("*/10 * * * *", () => {
  console.log("Running log cleanup every 10 minutes");
  deleteOldLogs();
});

exports.log = async (req, res) => {
  const { message } = req.body;
  try {
    console.log(message);
    res
      .status(200)
      .json({ message: "error message added to log successfully" });
  } catch (err) {
    res.status(500);
    res.json({ message: err.message });
  }
};

exports.getUserData = async (req, res) => {
  try {
    const response = await fetch("https://api.github.com/user", {
      method: "GET",
      headers: {
        Authorization: req.get("Authorization"), // Bearer ACCESSTOKEN
      },
    });

    if (!response.ok) {
      // Handle non-200 responses
      return res
        .status(response.status)
        .json({ error: "Failed to fetch data" });
    }

    const data = await response.json();
    console.log("data", data.login);

    const response1 = await fetch(
      `https://api.github.com/users/${data.login}`,
      {
        method: "GET",
      }
    );

    if (!response1.ok) {
      // Handle non-200 responses
      return res
        .status(response1.status)
        .json({ error: "Failed to fetch data" });
    }

    const data1 = await response1.json();
    res.json(data1);
  } catch (error) {
    // Handle network errors or other unexpected errors
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.getUserEmail = async (req, res) => {
  try {
    const response = await fetch("https://api.github.com/user/emails", {
      method: "GET",
      headers: {
        Authorization: req.get("Authorization"), // Bearer ACCESSTOKEN
      },
    });

    if (!response.ok) {
      // Handle non-200 responses
      return res
        .status(response.status)
        .json({ error: "Failed to fetch data" });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    // Handle network errors or other unexpected errors
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.getAccessToken = async (req, res) => {
  try {
    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code: req.query.code,
    });

    const response = await fetch(
      "https://github.com/login/oauth/access_token",
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      }
    );

    const text = await response.text();

    const token = JSON.parse(text);

    if (response.ok) {
      res.status(200).json(token);
    } else {
      res.status(response.status).json(token);
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

//signup
exports.register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Check if the user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(400);
      return res.json({ message: "User already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const otp = crypto.randomInt(100000, 999999).toString();

    // Create new user
    const newUser = await User.create({
      username,
      email,
      password: hashedPassword,
      verified: "N",
      verifyotp: otp,
      company_existing: "N",
    });

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

    res.status(201);
    res.json({ message: "Sent email verification OTP successfully" });
  } catch (error) {
    console.error(error);
    res.status(500);
    res.json({ message: "Internal server error" });
  }
};

//login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email });

    if (user.verified === "N") {
      res.status(200);
      return res.json({ message: "User Email not verified" });
    }

    if (!user) {
      res.status(200);
      return res.json({ message: "Invalid credentials" });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      res.status(200);
      return res.json({ message: "Invalid credentials" });
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
    res.status(200);
    res.json({ message: error.message });
  }
};

//getusers

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}, "username"); // Retrieve only usernames
    res.status(200);
    res.json(users);
  } catch (err) {
    res.status(500);
    res.json({ message: err.message });
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
      res.status(200);
      return res.json({ message: "Invalid or expired OTP" });
    }

    res.status(200);
    return res.json({ message: "User verified successfully!" });
  } catch (err) {
    res.status(500);
    res.json({ message: err.message });
  }
};

exports.getUser = async (req, res) => {
  const { token } = req.query;
  try {
    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    const userId = decoded.id;

    const user = await User.findOne({ _id: userId });
    res.status(200);
    res.json(user);
  } catch (err) {
    res.status(500);
    res.json({ message: err.message });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(200).json({ message: "User not found" });
    }

    const otp = crypto.randomInt(100000, 999999).toString();

    user.resetotp = otp;
    await user.save();

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    const mailOptions = {
      from: process.env.SMTP_USER,
      to: email,
      subject: "Password Reset",
      html: `<p>Use this OTP: <strong>${otp}</strong> to reset your password. Use the link: <a href="http://localhost:5173/reset-password">Reset Password</a></p>`,
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: "Reset email sent successfully!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { otp, newPassword } = req.body;

    const user = await User.findOne({ resetotp: otp });
    if (!user) {
      return res.status(400).json({ error: "Invalid or expired token" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    user.password = hashedPassword;
    user.resetotp = null;
    await user.save();

    res.status(200).json({ message: "Password reset successfully!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};
