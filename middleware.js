const ExpressError = require("./utils/ExpressError.js");
const Listing = require("./models/listing.js");


// ===============================
// LOGIN CHECK
// ===============================

const isLoggedIn = (req, res, next) => {

    if (!req.isAuthenticated()) {

        req.session.returnTo =
            req.originalUrl;

        req.flash(
            "error",
            "You must be logged in to continue."
        );

        return res.redirect("/login");
    }

    next();
};


// ===============================
// OWNER CHECK
// ===============================

const isOwner = async (req, res, next) => {

    const { id } = req.params;

    const listing =
        await Listing.findById(id);

    if (!listing) {

        throw new ExpressError(
            "Listing not found",
            404
        );
    }

    if (
        !listing.owner ||
        listing.owner.toString() !==
        req.user._id.toString()
    ) {

        req.flash(
            "error",
            "You don't have permission to do that."
        );

        return res.redirect(
            `/listing/${id}`
        );
    }

    next();
};


module.exports = {
    isLoggedIn,
    isOwner
};