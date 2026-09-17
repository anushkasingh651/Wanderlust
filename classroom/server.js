const express = require("express");
const session = require("express-session");
const flash = require("connect-flash");
const path = require("path");

const app = express();


// -------------------------
// View Engine
// -------------------------

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));


// -------------------------
// Express Session
// -------------------------

app.use(
    session({
        secret: "mySecretKey123",
        resave: false,
        saveUninitialized: false
    })
);


// -------------------------
// Connect Flash
// -------------------------

app.use(flash());


// -------------------------
// Import Routes
// -------------------------

const users = require("./routes/users.js");
const posts = require("./routes/post.js");

app.use("/users", users);
app.use("/posts", posts);


// -------------------------
// Test Route
// -------------------------

app.get("/test", (req, res) => {
    res.send("Test is working!!");
});


// -------------------------
// Login - Create Session
// -------------------------

app.get("/login", (req, res) => {

    req.session.username = "Anushka";

    req.flash("info", "You have successfully logged in!!");

    res.send("Session created! Username stored in session.");
});


// -------------------------
// Profile - Read Session
// -------------------------

app.get("/page", (req, res) => {

    if (!req.session.username) {
        return res.send("Please login first.");
    }

    const messages = {
        info: req.flash("info")
    };

    res.render("page", {
        username: req.session.username,
        messages: messages
    });
});


// -------------------------
// Logout - Destroy Session
// -------------------------

app.get("/logout", (req, res) => {

    req.session.destroy((err) => {

        if (err) {
            return res.status(500).send("Could not logout");
        }

        res.send("Logged out successfully!");
    });
});


// -------------------------
// Start Server
// -------------------------

app.listen(3000, () => {
    console.log("Server is running on http://localhost:3000");
});