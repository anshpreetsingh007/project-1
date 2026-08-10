// Authentication server

const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");

const app = express();
const PORT = 3000;

// Allow frontend requests
app.use(cors());
app.use(express.json());


// Temporary user list
// Later we will replace this with a real database
const users = [];


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

    // Find user by email
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


// Show users for testing
app.get("/users", (req, res) => {
    res.json(users);
});


// Start server
app.listen(PORT, () => {
    console.log(`Auth server running on http://localhost:${PORT}`);
});