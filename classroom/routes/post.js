const express = require("express");

const router = express.Router();

router.get("/", (req, res) => {
    res.send("Posts route is working!");
});

router.get("/:id", (req, res) => {
    res.send(`Post ID: ${req.params.id}`);
});

module.exports = router;