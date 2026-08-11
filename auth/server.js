// Authentication server

const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const session = require("express-session");
const { CosmosClient } = require("@azure/cosmos");

require("dotenv").config();

const app = express();
const PORT = 3000;


// Cosmos DB connection
// This will be used when the Cosmos DB information is ready
let usersContainer = null;

if (process.env.COSMOS_ENDPOINT && process.env.COSMOS_KEY) {

    const cosmosClient = new CosmosClient({
        endpoint: process.env.COSMOS_ENDPOINT,
        key: process.env.COSMOS_KEY
    });

    const database = cosmosClient.database(
        process.env.COSMOS_DATABASE
    );

    usersContainer = database.container(
        process.env.COSMOS_CONTAINER
    );
}


// Allow frontend requests
app.use(
    cors({
        origin: true,
        credentials: true
    })
);

app.use(express.json());


// Session setup
app.use(
    session({
        secret: process.env.SESSION_SECRET || "student-project-secret",
        resave: false,
        saveUninitialized: false
    })
);

app.use(passport.initialize());
app.use(passport.session());


// Temporary user list
// We will replace this with Cosmos DB
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
                name: profile.displayName,
                email: profile.emails
                    ? profile.emails[0].value
                    : ""
            };

            return done(null, googleUser);
        }
    )
);


// Save Google user in session
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

    // Save safe user information in session
    req.session.user = {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email
    };

    console.log("Registered user:", newUser);

    res.status(201).json({
        message: "User registered successfully",
        user: req.session.user
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

    // Save safe user information in session
    req.session.user = {
        id: user.id,
        name: user.name,
        email: user.email
    };

    res.json({
        message: "Login successful",
        user: req.session.user
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
        res.redirect(
            "http://localhost:5500/frontend/index.html"
        );
    }
);


// Check login status
app.get("/auth/status", (req, res) => {

    const user = req.user || req.session.user;

    if (!user) {
        return res.json({
            loggedIn: false
        });
    }

    res.json({
        loggedIn: true,
        user: {
            name: user.name,
            email: user.email
        }
    });
});


// Logout user
app.post("/logout", (req, res) => {

    req.logout(() => {

        req.session.destroy(() => {

            res.json({
                message: "Logout successful"
            });
        });
    });
});


// Show users for testing
app.get("/users", (req, res) => {
    res.json(users);
});


// Start server
app.listen(PORT, () => {
    console.log(`Auth server running on http://localhost:${PORT}`);
});