// Authentication server

const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const session = require("express-session");
require("dotenv").config();

const app = express();
const PORT = 3000;

// Allow frontend requests
app.use(cors());
app.use(express.json());

// Session setup
app.use(
    session({
        secret: "student-project-secret",
        resave: false,
        saveUninitialized: false
    })
);

app.use(passport.initialize());
app.use(passport.session());


// Temporary user list
// Later we will replace this with a real database
const users = [];


// Google login setup
passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: "http://localhost:3000/auth/google/callback"
        },

        (accessToken, refreshToken, profile, done) => {

            const googleUser = {
                id: profile.id,
                name: profile.displayName
            };

            return done(null, googleUser);
        }
    )
);


// Save user in session
passport.serializeUser((user, done) => {
    done(null, user);
});

passport.deserializeUser((user, done) => {
    done(null, user);
});


// Test route
app.get("/", (req, res) => {
    res.send("Authentication server is running");
});


// Register user
app.post("/register", async (req, res) => {

    const { name, email, password } = req.body;

    // Check if fields are missing
    if (!name || !email || !password) {
        return res.status(400).json({
            message: "Please complete all fields"
        });
    }

    // Check if email already exists
    const existingUser = users.find(
        user => user.email === email
    );

    if (existingUser) {
        return res.status(400).json({
            message: "User already exists"
        });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = {
        id: users.length + 1,
        name: name,
        email: email,
        passwordHash: hashedPassword
    };

    users.push(newUser);

    console.log("Registered user:", newUser);

    res.status(201).json({
        message: "User registered successfully"
    });
});


// Login user
app.post("/login", async (req, res) => {

    const { email, password } = req.body;

    // Check if fields are missing
    if (!email || !password) {
        return res.status(400).json({
            message: "Please enter email and password"
        });
    }

    // Find user
    const user = users.find(
        user => user.email === email
    );

    if (!user) {
        return res.status(401).json({
            message: "Invalid email or password"
        });
    }

    // Compare password with saved hash
    const passwordMatch = await bcrypt.compare(
        password,
        user.passwordHash
    );

    if (!passwordMatch) {
        return res.status(401).json({
            message: "Invalid email or password"
        });
    }

    res.json({
        message: "Login successful",
        name: user.name,
        email: user.email
    });
});


// Start Google login
app.get(
    "/auth/google",
    passport.authenticate("google", {
        scope: ["profile", "email"]
    })
);


// Google callback
app.get(
    "/auth/google/callback",

    passport.authenticate("google", {
        failureRedirect: "/"
    }),

    (req, res) => {
        res.send(
            `Google login successful. Welcome ${req.user.name}`
        );
    }
);


// Show users for testing
app.get("/users", (req, res) => {
    res.json(users);
});


// Start server
app.listen(PORT, () => {
    console.log(`Auth server running on http://localhost:${PORT}`);
});