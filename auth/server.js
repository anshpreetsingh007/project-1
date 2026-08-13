// Authentication server

const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const session = require("express-session");
const jwt = require("jsonwebtoken");
const { CosmosClient } = require("@azure/cosmos");
const { TableClient } = require("@azure/data-tables");

require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;


// Frontend and backend URLs
const FRONTEND_URL =
    process.env.FRONTEND_URL ||
    "http://localhost:5500";

const BACKEND_URL =
    process.env.BACKEND_URL ||
    "http://localhost:3000";

const isProduction =
    process.env.NODE_ENV === "production";


// Create authentication token
function createToken(user) {

    return jwt.sign(
        {
            id: user.id,
            name: user.name,
            email: user.email
        },
        process.env.SESSION_SECRET || "student-project-secret",
        {
            expiresIn: "1h"
        }
    );
}


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


// Azure Table Storage connection
const tableClient = TableClient.fromConnectionString(
    process.env.AZURE_TABLE_CONNECTION_STRING,
    process.env.AZURE_TABLE_NAME
);


// Trust Azure reverse proxy in production
if (isProduction) {
    app.set("trust proxy", 1);
}


// Allow frontend requests
app.use(
    cors({
        origin: [
            "http://localhost:5500",
            "https://blue-bush-041249b0f.7.azurestaticapps.net"
        ],
        credentials: true
    })
);

app.use(express.json());


// Session setup
app.use(
    session({
        secret: process.env.SESSION_SECRET || "student-project-secret",
        resave: false,
        saveUninitialized: false,

        cookie: {
            secure: isProduction,
            sameSite: isProduction
                ? "none"
                : "lax"
        }
    })
);

app.use(passport.initialize());
app.use(passport.session());


// Google login setup
passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,

            callbackURL:
                `${BACKEND_URL}/auth/google/callback`
        },

        async (accessToken, refreshToken, profile, done) => {

            try {

                const email = profile.emails
                    ? profile.emails[0].value.toLowerCase()
                    : "";

                const googleUser = {
                    id: profile.id,
                    name: profile.displayName,
                    email: email
                };

                // Save Google user in Azure Table Storage
                if (email) {

                    try {

                        await tableClient.getEntity(
                            "users",
                            email
                        );

                    } catch (error) {

                        if (error.statusCode === 404) {

                            const newGoogleUser = {
                                partitionKey: "users",
                                rowKey: email,
                                name: profile.displayName,
                                email: email,
                                googleId: profile.id,
                                authProvider: "google"
                            };

                            await tableClient.createEntity(
                                newGoogleUser
                            );

                            console.log(
                                "Google user saved in Azure Table Storage:",
                                email
                            );

                        } else {
                            throw error;
                        }
                    }
                }

                return done(null, googleUser);

            } catch (error) {

                console.error(
                    "Google login error:",
                    error
                );

                return done(error, null);
            }
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

    try {

        const { name, email, password } = req.body;

        // Check if fields are missing
        if (!name || !email || !password) {
            return res.status(400).json({
                message: "Please complete all fields"
            });
        }

        const normalizedEmail = email.toLowerCase();

        // Email is used as the RowKey
        const rowKey = normalizedEmail;

        // Check if email contains invalid Table Storage key characters
        if (
            rowKey.includes("/") ||
            rowKey.includes("\\") ||
            rowKey.includes("#") ||
            rowKey.includes("?")
        ) {
            return res.status(400).json({
                message: "Email contains unsupported characters"
            });
        }

        // Check if user already exists
        try {

            await tableClient.getEntity(
                "users",
                rowKey
            );

            return res.status(400).json({
                message: "User already exists"
            });

        } catch (error) {

            if (error.statusCode !== 404) {
                throw error;
            }
        }

        // Hash the password
        const hashedPassword =
            await bcrypt.hash(password, 10);

        // Create user profile
        const newUser = {
            partitionKey: "users",
            rowKey: rowKey,
            name: name,
            email: normalizedEmail,
            passwordHash: hashedPassword,
            authProvider: "email"
        };

        // Save user in Azure Table Storage
        await tableClient.createEntity(newUser);

        // Save safe user information in session
        req.session.user = {
            id: rowKey,
            name: name,
            email: normalizedEmail
        };

        const token =
            createToken(req.session.user);

        console.log(
            "Registered user in Azure Table Storage:",
            normalizedEmail
        );

        res.status(201).json({
            message: "User registered successfully",
            user: req.session.user,
            token: token
        });

    } catch (error) {

        console.error("Register error:", error);

        res.status(500).json({
            message: "Could not register user"
        });
    }
});


// Login user
app.post("/login", async (req, res) => {

    try {

        const { email, password } = req.body;

        // Check if fields are missing
        if (!email || !password) {
            return res.status(400).json({
                message: "Please enter email and password"
            });
        }

        const normalizedEmail = email.toLowerCase();

        let user;

        // Find user in Azure Table Storage
        try {

            user = await tableClient.getEntity(
                "users",
                normalizedEmail
            );

        } catch (error) {

            if (error.statusCode === 404) {
                return res.status(401).json({
                    message: "Invalid email or password"
                });
            }

            throw error;
        }

        // Compare password with saved hash
        const passwordMatch =
            await bcrypt.compare(
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
            id: user.rowKey,
            name: user.name,
            email: user.email
        };

        const token =
            createToken(req.session.user);

        res.json({
            message: "Login successful",
            user: req.session.user,
            token: token
        });

    } catch (error) {

        console.error("Login error:", error);

        res.status(500).json({
            message: "Could not login"
        });
    }
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

        const token =
            createToken(req.user);

        if (isProduction) {
            res.redirect(
                `${FRONTEND_URL}/#token=${encodeURIComponent(token)}`
            );
        } else {
            res.redirect(
                `${FRONTEND_URL}/frontend/index.html#token=${encodeURIComponent(token)}`
            );
        }
    }
);


// Check login status
app.get("/auth/status", (req, res) => {

    const authHeader =
        req.headers.authorization;

    if (
        authHeader &&
        authHeader.startsWith("Bearer ")
    ) {

        const token =
            authHeader.substring(7);

        try {

            const decoded =
                jwt.verify(
                    token,
                    process.env.SESSION_SECRET ||
                    "student-project-secret"
                );

            return res.json({
                loggedIn: true,
                user: {
                    name: decoded.name,
                    email: decoded.email
                }
            });

        } catch (error) {

            return res.json({
                loggedIn: false
            });
        }
    }


    // Keep existing session authentication
    const user =
        req.user || req.session.user;

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


// Start server
app.listen(PORT, () => {
    console.log(
        `Auth server running on port ${PORT}`
    );
});