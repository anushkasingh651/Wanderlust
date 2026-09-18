require("dotenv").config();

const express = require("express");
const app = express();

const mongoose = require("mongoose");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");

const session = require("express-session");
const { MongoStore } = require("connect-mongo");
const flash = require("connect-flash");

const passport = require("passport");
const LocalStrategy = require("passport-local");


const multer = require("multer");
const axios = require("axios");

const cloudinary = require("./config/cloudinary.js");
const openai = require("./config/openai.js");


// ==================================================
// MODELS
// ==================================================

const Listing = require("./models/listing.js");
const Review = require("./models/review.js");
const User = require("./models/user.js");
const Booking = require("./models/booking.js");


// ==================================================
// UTILITIES
// ==================================================

const ExpressError =
    require("./utils/ExpressError.js");

const wrapAsync =
    require("./utils/wrapAsync.js");


// ==================================================
// VALIDATION
// ==================================================

const {
    listingSchema,
    reviewSchema
} = require("./schema.js");


// ==================================================
// MIDDLEWARE
// ==================================================

const {
    isLoggedIn,
    isOwner
} = require("./middleware.js");


// ==================================================
// MONGODB
// ==================================================

//const MONGO_URL =
    //"mongodb://127.0.0.1:27017/wanderlust";

const dbURL= process.env.ATLASDB_URL;    


async function main() {

    await mongoose.connect(dbURL);

}


// ==================================================
// START DATABASE
// ==================================================

main()
    .then(() => {

        console.log(
            "Connected to MongoDB"
        );

    })
    .catch((err) => {

        console.log(
            "MongoDB connection error:",
            err
        );

    });


// ==================================================
// APP CONFIGURATION
// ==================================================

app.engine(
    "ejs",
    ejsMate
);

app.set(
    "view engine",
    "ejs"
);

app.set(
    "views",
    path.join(
        __dirname,
        "views"
    )
);


// ==================================================
// BODY PARSER
// ==================================================

app.use(
    express.urlencoded({
        extended: true
    })
);

app.use(
    express.json()
);


// ==================================================
// METHOD OVERRIDE
// ==================================================

app.use(
    methodOverride("_method")
);


// ==================================================
// STATIC FILES
// ==================================================

app.use(
    express.static(
        path.join(
            __dirname,
            "public"
        )
    )
);

const store = MongoStore.create({
    mongoUrl: dbURL,
    touchAfter: 24 * 60 * 60,
    crypto: {
        secret:
            process.env.SESSION_SECRET ||
            "mysupersecretecode"
    }
});

store.on("error", function (e) {
    console.log("SESSION STORE ERROR:", e);
});


// ==================================================
// SESSION
// ==================================================

const sessionOptions = {

    secret:
        process.env.SESSION_SECRET ||
        "mysupersecretecode",

    resave: false,

    saveUninitialized: false,

    cookie: {

        expires:
            new Date(
                Date.now() +
                1000 *
                60 *
                60 *
                24 *
                7
            ),

        maxAge:
            1000 *
            60 *
            60 *
            24 *
            7,

        httpOnly: true

    }

};


app.use(
    session(sessionOptions)
);


// ==================================================
// FLASH
// ==================================================

app.use(
    flash()
);



// ==================================================
// PASSPORT
// ==================================================

app.use(
    passport.initialize()
);

app.use(
    passport.session()
);


// ==================================================
// PASSPORT LOCAL STRATEGY
// ==================================================

passport.use(
    new LocalStrategy(
        User.authenticate()
    )
);


passport.serializeUser(
    User.serializeUser()
);


passport.deserializeUser(
    User.deserializeUser()
);


// ==================================================
// GLOBAL VARIABLES
// ==================================================

app.use(
    (req, res, next) => {

        res.locals.currentUser =
            req.user;

        res.locals.success =
            req.flash("success");

        res.locals.error =
            req.flash("error");

        res.locals.info =
            req.flash("info");

        next();

    }
);


// ==================================================
// VALIDATE LISTING
// ==================================================

const validateListing =
    (req, res, next) => {

        const {
            error
        } =
            listingSchema.validate(
                req.body
            );

        if (error) {

            const message =
                error.details
                    .map(
                        el => el.message
                    )
                    .join(", ");

            throw new ExpressError(
                message,
                400
            );

        }

        next();

    };


// ==================================================
// VALIDATE REVIEW
// ==================================================

const validateReview =
    (req, res, next) => {

        const {
            error
        } =
            reviewSchema.validate(
                req.body
            );

        if (error) {

            const message =
                error.details
                    .map(
                        el => el.message
                    )
                    .join(", ");

            throw new ExpressError(
                message,
                400
            );

        }

        next();

    };


// ==================================================
// MULTER
// ==================================================

const storage =
    multer.memoryStorage();


const upload =
    multer({

        storage,

        limits: {

            fileSize:
                5 * 1024 * 1024

        },

        fileFilter:
            (req, file, cb) => {

                const allowedTypes = [

                    "image/jpeg",
                    "image/jpg",
                    "image/png",
                    "image/webp"

                ];

                if (
                    allowedTypes.includes(
                        file.mimetype
                    )
                ) {

                    cb(
                        null,
                        true
                    );

                } else {

                    cb(
                        new ExpressError(
                            "Only JPG, JPEG, PNG and WEBP images are allowed.",
                            400
                        )
                    );

                }

            }

    });


// ==================================================
// CLOUDINARY UPLOAD
// ==================================================

async function uploadToCloudinary(
    buffer
) {

    return new Promise(
        (
            resolve,
            reject
        ) => {

            const stream =
                cloudinary
                    .uploader
                    .upload_stream(

                        {
                            folder:
                                "wanderlust/listings",

                            resource_type:
                                "image"
                        },

                        (
                            error,
                            result
                        ) => {

                            if (error) {

                                reject(
                                    error
                                );

                            } else {

                                resolve(
                                    result
                                );

                            }

                        }

                    );

            stream.end(buffer);

        }
    );

}


// ==================================================
// CLOUDINARY DELETE
// ==================================================

async function deleteFromCloudinary(
    publicId
) {

    if (!publicId) {

        return;

    }

    try {

        await cloudinary
            .uploader
            .destroy(
                publicId
            );

    } catch (error) {

        console.log(
            "Cloudinary delete error:",
            error.message
        );

    }

}


// ==================================================
// GEOCODING
// ==================================================

async function getCoordinates(
    location,
    country
) {

    try {

        if (
            !location ||
            !country
        ) {

            return null;

        }

        const query =
            `${location}, ${country}`;


        console.log(
            "Geocoding:",
            query
        );


        const response =
            await axios.get(

                "https://nominatim.openstreetmap.org/search",

                {

                    params: {

                        q: query,

                        format: "json",

                        limit: 1

                    },

                    headers: {

                        "User-Agent":
                            "Wanderlust-Travel-App/1.0"

                    },

                    timeout: 10000

                }

            );


        if (
            !response.data ||
            response.data.length === 0
        ) {

            console.log(
                "No coordinates found."
            );

            return null;

        }


        const longitude =
            Number(
                response.data[0].lon
            );

        const latitude =
            Number(
                response.data[0].lat
            );


        if (
            !Number.isFinite(
                longitude
            ) ||
            !Number.isFinite(
                latitude
            )
        ) {

            return null;

        }


        const coordinates = [

            longitude,

            latitude

        ];


        console.log(
            "Coordinates:",
            coordinates
        );


        return coordinates;

    } catch (error) {

        console.log(
            "Geocoding error:",
            error.message
        );

        return null;

    }

}


// ==================================================
// WEATHER
// ==================================================
async function getWeather(latitude, longitude) {

    try {

        console.log("WEATHER REQUEST:");
        console.log("Latitude:", latitude);
        console.log("Longitude:", longitude);

        if (
            !Number.isFinite(latitude) ||
            !Number.isFinite(longitude)
        ) {

            console.log(
                "WEATHER ERROR: Invalid coordinates"
            );

            return null;

        }

        const response = await axios.get(
            "https://api.open-meteo.com/v1/forecast",
            {
                params: {
                    latitude: latitude,
                    longitude: longitude,

                    daily: [
                        "weather_code",
                        "temperature_2m_max",
                        "temperature_2m_min",
                        "precipitation_probability_max",
                        "wind_speed_10m_max"
                    ].join(","),

                    timezone: "auto",

                    forecast_days: 7
                },

                timeout: 15000
            }
        );

        console.log(
            "WEATHER STATUS:",
            response.status
        );

        console.log(
            "WEATHER DATA RECEIVED:",
            Boolean(response.data)
        );

        return response.data;

    } catch (error) {

        console.log(
            "================================"
        );

        console.log(
            "WEATHER API ERROR"
        );

        console.log(
            "Message:",
            error.message
        );

        if (error.response) {

            console.log(
                "Status:",
                error.response.status
            );

            console.log(
                "Response:",
                error.response.data
            );

        }

        console.log(
            "================================"
        );

        return null;
    }
}

// ==================================================
// WEATHER DESCRIPTION
// ==================================================

function getWeatherDescription(
    code
) {

    const weatherCodes = {

        0:
            "☀️ Clear sky",

        1:
            "🌤️ Mainly clear",

        2:
            "⛅ Partly cloudy",

        3:
            "☁️ Overcast",

        45:
            "🌫️ Fog",

        48:
            "🌫️ Rime fog",

        51:
            "🌦️ Light drizzle",

        53:
            "🌦️ Moderate drizzle",

        55:
            "🌧️ Dense drizzle",

        56:
            "🌧️ Freezing drizzle",

        57:
            "🌧️ Dense freezing drizzle",

        61:
            "🌦️ Slight rain",

        63:
            "🌧️ Moderate rain",

        65:
            "🌧️ Heavy rain",

        66:
            "🌧️ Light freezing rain",

        67:
            "🌧️ Heavy freezing rain",

        71:
            "🌨️ Slight snow",

        73:
            "🌨️ Moderate snow",

        75:
            "❄️ Heavy snow",

        77:
            "❄️ Snow grains",

        80:
            "🌦️ Slight rain showers",

        81:
            "🌧️ Moderate rain showers",

        82:
            "⛈️ Violent rain showers",

        85:
            "🌨️ Slight snow showers",

        86:
            "❄️ Heavy snow showers",

        95:
            "⛈️ Thunderstorm",

        96:
            "⛈️ Thunderstorm with slight hail",

        99:
            "⛈️ Thunderstorm with heavy hail"

    };


    return (
        weatherCodes[code] ||
        "🌤️ Weather"
    );

}


// ==================================================
// HOME
// ==================================================

app.get(
    "/",
    (req, res) => {

        res.redirect(
            "/listing"
        );

    }
);


// ==================================================
// LISTINGS
// ==================================================

app.get(
    "/listing",

    wrapAsync(
        async (req, res) => {

            const {

                location,

                minPrice,

                maxPrice,

                guests,

                propertyType,

                sort

            } = req.query;


            const filter = {};


// --------------------------------------------------
// LOCATION
// --------------------------------------------------

            if (
                location &&
                location.trim() !== ""
            ) {

                filter.$or = [

                    {

                        location: {

                            $regex:
                                location.trim(),

                            $options:
                                "i"

                        }

                    },

                    {

                        country: {

                            $regex:
                                location.trim(),

                            $options:
                                "i"

                        }

                    }

                ];

            }


// --------------------------------------------------
// PRICE
// --------------------------------------------------

            if (
                minPrice ||
                maxPrice
            ) {

                filter.price = {};


                if (minPrice) {

                    const minimum =
                        Number(
                            minPrice
                        );


                    if (
                        Number.isFinite(
                            minimum
                        ) &&
                        minimum >= 0
                    ) {

                        filter.price.$gte =
                            minimum;

                    }

                }


                if (maxPrice) {

                    const maximum =
                        Number(
                            maxPrice
                        );


                    if (
                        Number.isFinite(
                            maximum
                        ) &&
                        maximum >= 0
                    ) {

                        filter.price.$lte =
                            maximum;

                    }

                }


                if (
                    Object.keys(
                        filter.price
                    ).length === 0
                ) {

                    delete filter.price;

                }

            }


// --------------------------------------------------
// GUESTS
// --------------------------------------------------

            if (guests) {

                const guestCount =
                    Number(
                        guests
                    );


                if (
                    Number.isInteger(
                        guestCount
                    ) &&
                    guestCount >= 1 &&
                    guestCount <= 20
                ) {

                    filter.maxGuests = {

                        $gte:
                            guestCount

                    };

                }

            }


// --------------------------------------------------
// PROPERTY TYPE
// --------------------------------------------------

            const allowedPropertyTypes = [

                "Apartment",
                "Villa",
                "House",
                "Hotel",
                "Cabin",
                "Farmhouse",
                "Other"

            ];


            if (
                propertyType &&
                allowedPropertyTypes.includes(
                    propertyType
                )
            ) {

                filter.propertyType =
                    propertyType;

            }


// --------------------------------------------------
// QUERY
// --------------------------------------------------

            let query =
                Listing.find(
                    filter
                );


// --------------------------------------------------
// SORT
// --------------------------------------------------

            switch (sort) {

                case "price-low":

                    query =
                        query.sort({
                            price: 1
                        });

                    break;


                case "price-high":

                    query =
                        query.sort({
                            price: -1
                        });

                    break;


                case "newest":

                    query =
                        query.sort({
                            _id: -1
                        });

                    break;


                default:

                    query =
                        query.sort({
                            _id: -1
                        });

            }


            const allListings =
                await query;


            console.log(
                "FILTER:",
                filter
            );


            console.log(
                "LISTINGS FOUND:",
                allListings.length
            );


            res.render(
                "listing/index",
                {

                    allListings,

                    filters:
                        req.query

                }
            );

        }
    )
);


// ==================================================
// NEW LISTING
// ==================================================

app.get(
    "/listing/new",

    isLoggedIn,

    (req, res) => {

        res.render(
            "listing/new"
        );

    }
);


// ==================================================
// CREATE LISTING
// ==================================================

app.post(
    "/listing",

    isLoggedIn,

    upload.single("image"),

    validateListing,

    wrapAsync(
        async (req, res) => {

            const listing =
                new Listing(
                    req.body.listing
                );


            listing.owner =
                req.user._id;


// --------------------------------------------------
// GEOCODING
// --------------------------------------------------

            const coordinates =
                await getCoordinates(

                    listing.location,

                    listing.country

                );


            if (coordinates) {

                listing.geometry = {

                    type:
                        "Point",

                    coordinates

                };

            }


// --------------------------------------------------
// IMAGE
// --------------------------------------------------

            if (req.file) {

                const result =
                    await uploadToCloudinary(
                        req.file.buffer
                    );


                listing.image = {

                    url:
                        result.secure_url,

                    filename:
                        result.public_id

                };

            }


            await listing.save();


            req.flash(
                "success",
                "New listing created successfully!"
            );


            res.redirect(
                `/listing/${listing._id}`
            );

        }
    )
);


// ==================================================
// SHOW LISTING
// ==================================================

app.get(
    "/listing/:id",

    wrapAsync(
        async (req, res) => {

            const listing =
                await Listing

                    .findById(
                        req.params.id
                    )

                    .populate({

                        path:
                            "reviews",

                        populate: {

                            path:
                                "author"

                        }

                    })

                    .populate(
                        "owner"
                    );


            if (!listing) {

                throw new ExpressError(
                    "Listing not found",
                    404
                );

            }


// --------------------------------------------------
// COORDINATES
// --------------------------------------------------

            let coordinates =
                listing.geometry &&
                listing.geometry.coordinates;


            let validCoordinates =

                Array.isArray(
                    coordinates
                ) &&

                coordinates.length === 2 &&

                Number.isFinite(
                    Number(
                        coordinates[0]
                    )
                ) &&

                Number.isFinite(
                    Number(
                        coordinates[1]
                    )
                ) &&

                !(
                    Number(
                        coordinates[0]
                    ) === 0 &&

                    Number(
                        coordinates[1]
                    ) === 0
                );


// --------------------------------------------------
// REPAIR OLD LISTINGS
// --------------------------------------------------

            if (!validCoordinates) {

                const repairedCoordinates =
                    await getCoordinates(

                        listing.location,

                        listing.country

                    );


                if (
                    repairedCoordinates
                ) {

                    listing.geometry = {

                        type:
                            "Point",

                        coordinates:
                            repairedCoordinates

                    };


                    await listing.save();


                    coordinates =
                        repairedCoordinates;


                    validCoordinates =
                        true;

                }

            }


// --------------------------------------------------
// WEATHER
// --------------------------------------------------

            let weather = null;


            if (validCoordinates) {

                const longitude =
                    Number(
                        coordinates[0]
                    );


                const latitude =
                    Number(
                        coordinates[1]
                    );


                weather =
                    await getWeather(
                        latitude,
                        longitude
                    );

            }


// --------------------------------------------------
// RENDER
// --------------------------------------------------

            res.render(

                "listing/show",

                {

                    listing,

                    weather,

                    coordinates:
                        validCoordinates
                            ? coordinates
                            : null,

                    getWeatherDescription

                }

            );

        }
    )
);


// ==================================================
// EDIT LISTING
// ==================================================

app.get(
    "/listing/:id/edit",

    isLoggedIn,

    isOwner,

    wrapAsync(
        async (req, res) => {

            const listing =
                await Listing.findById(
                    req.params.id
                );


            if (!listing) {

                throw new ExpressError(
                    "Listing not found",
                    404
                );

            }


            res.render(
                "listing/edit",
                {
                    listing
                }
            );

        }
    )
);


// ==================================================
// UPDATE LISTING
// ==================================================

app.put(
    "/listing/:id",

    isLoggedIn,

    isOwner,

    upload.single("image"),

    validateListing,

    wrapAsync(
        async (req, res) => {

            const listing =
                await Listing.findById(
                    req.params.id
                );


            if (!listing) {

                throw new ExpressError(
                    "Listing not found",
                    404
                );

            }


            listing.set(
                req.body.listing
            );


// --------------------------------------------------
// RE-GEOCODE
// --------------------------------------------------

            const coordinates =
                await getCoordinates(

                    listing.location,

                    listing.country

                );


            if (coordinates) {

                listing.geometry = {

                    type:
                        "Point",

                    coordinates

                };

            }


// --------------------------------------------------
// NEW IMAGE
// --------------------------------------------------

            if (req.file) {

                const oldPublicId =
                    listing.image &&
                    listing.image.filename;


                const result =
                    await uploadToCloudinary(
                        req.file.buffer
                    );


                listing.image = {

                    url:
                        result.secure_url,

                    filename:
                        result.public_id

                };


                await deleteFromCloudinary(
                    oldPublicId
                );

            }


            await listing.save();


            req.flash(
                "success",
                "Listing updated successfully!"
            );


            res.redirect(
                `/listing/${req.params.id}`
            );

        }
    )
);


// ==================================================
// DELETE LISTING
// ==================================================

app.delete(
    "/listing/:id",

    isLoggedIn,

    isOwner,

    wrapAsync(
        async (req, res) => {

            const listing =
                await Listing.findById(
                    req.params.id
                );


            if (!listing) {

                throw new ExpressError(
                    "Listing not found",
                    404
                );

            }


// --------------------------------------------------
// DELETE BOOKINGS
// --------------------------------------------------

            await Booking.deleteMany({

                listing:
                    listing._id

            });


// --------------------------------------------------
// DELETE REVIEWS
// --------------------------------------------------

            await Review.deleteMany({

                _id: {

                    $in:
                        listing.reviews

                }

            });


// --------------------------------------------------
// REMOVE FROM WISHLISTS
// --------------------------------------------------

            await User.updateMany(

                {

                    wishlist:
                        listing._id

                },

                {

                    $pull: {

                        wishlist:
                            listing._id

                    }

                }

            );


// --------------------------------------------------
// DELETE IMAGE
// --------------------------------------------------

            await deleteFromCloudinary(

                listing.image &&
                listing.image.filename

            );


// --------------------------------------------------
// DELETE LISTING
// --------------------------------------------------

            await Listing.findByIdAndDelete(
                listing._id
            );


            req.flash(
                "success",
                "Listing deleted successfully!"
            );


            res.redirect(
                "/listing"
            );

        }
    )
);


// ==================================================
// ADD TO WISHLIST
// ==================================================

app.post(
    "/listing/:id/wishlist",

    isLoggedIn,

    wrapAsync(
        async (req, res) => {

            const listing =
                await Listing.findById(
                    req.params.id
                );


            if (!listing) {

                throw new ExpressError(
                    "Listing not found",
                    404
                );

            }


            const alreadySaved =
                req.user.wishlist.some(

                    id =>
                        id.toString() ===
                        listing._id.toString()

                );


            if (!alreadySaved) {

                req.user.wishlist.push(
                    listing._id
                );


                await req.user.save();


                req.flash(
                    "success",
                    "Added to your wishlist ❤️"
                );

            } else {

                req.flash(
                    "info",
                    "This property is already in your wishlist."
                );

            }


            res.redirect(
                `/listing/${listing._id}`
            );

        }
    )
);


// ==================================================
// REMOVE FROM WISHLIST
// ==================================================

app.delete(
    "/listing/:id/wishlist",

    isLoggedIn,

    wrapAsync(
        async (req, res) => {

            await User.findByIdAndUpdate(

                req.user._id,

                {

                    $pull: {

                        wishlist:
                            req.params.id

                    }

                }

            );


            req.flash(
                "success",
                "Removed from your wishlist."
            );


            res.redirect(
                `/listing/${req.params.id}`
            );

        }
    )
);


// ==================================================
// DASHBOARD
// ==================================================

app.get(
    "/dashboard",

    isLoggedIn,

    wrapAsync(
        async (req, res) => {

            const user =
                await User

                    .findById(
                        req.user._id
                    )

                    .populate(
                        "wishlist"
                    );


            const myListings =
                await Listing.find({

                    owner:
                        req.user._id

                });


            const bookings =
                await Booking

                    .find({

                        guest:
                            req.user._id

                    })

                    .populate(
                        "listing"
                    )

                    .sort({

                        createdAt:
                            -1

                    });


            res.render(

                "users/dashboard",

                {

                    user,

                    myListings,

                    wishlist:
                        user.wishlist,

                    bookings

                }

            );

        }
    )
);


// ==================================================
// CREATE REVIEW
// ==================================================

app.post(
    "/listing/:id/reviews",

    isLoggedIn,

    validateReview,

    wrapAsync(
        async (req, res) => {

            const listing =
                await Listing.findById(
                    req.params.id
                );


            if (!listing) {

                throw new ExpressError(
                    "Listing not found",
                    404
                );

            }


            const newReview =
                new Review(
                    req.body.review
                );


            newReview.author =
                req.user._id;


            await newReview.save();


            listing.reviews.push(
                newReview._id
            );


            await listing.save();


            req.flash(
                "success",
                "Review added successfully!"
            );


            res.redirect(
                `/listing/${listing._id}`
            );

        }
    )
);


// ==================================================
// DELETE REVIEW
// ==================================================

app.delete(
    "/listing/:id/reviews/:reviewId",

    isLoggedIn,

    wrapAsync(
        async (req, res) => {

            const review =
                await Review.findById(
                    req.params.reviewId
                );


            if (!review) {

                throw new ExpressError(
                    "Review not found",
                    404
                );

            }


            if (
                review.author.toString() !==
                req.user._id.toString()
            ) {

                req.flash(
                    "error",
                    "You can only delete your own review."
                );


                return res.redirect(
                    `/listing/${req.params.id}`
                );

            }


            await Review.findByIdAndDelete(
                req.params.reviewId
            );


            await Listing.findByIdAndUpdate(

                req.params.id,

                {

                    $pull: {

                        reviews:
                            req.params.reviewId

                    }

                }

            );


            req.flash(
                "success",
                "Review deleted successfully!"
            );


            res.redirect(
                `/listing/${req.params.id}`
            );

        }
    )
);


// ==================================================
// BOOKING PAGE
// ==================================================

app.get(
    "/listing/:id/reserve",

    isLoggedIn,

    wrapAsync(
        async (req, res) => {

            const listing =
                await Listing.findById(
                    req.params.id
                );


            if (!listing) {

                throw new ExpressError(
                    "Listing not found",
                    404
                );

            }


            res.render(

                "booking/reserve",

                {

                    listing

                }

            );

        }
    )
);


// ==================================================
// CREATE BOOKING
// ==================================================

app.post(
    "/listing/:id/reserve",

    isLoggedIn,

    wrapAsync(
        async (req, res) => {

            const {

                checkIn,

                checkOut,

                guests

            } = req.body;


            const listing =
                await Listing.findById(
                    req.params.id
                );


            if (!listing) {

                throw new ExpressError(
                    "Listing not found",
                    404
                );

            }


            const startDate =
                new Date(
                    checkIn
                );


            const endDate =
                new Date(
                    checkOut
                );


            const guestCount =
                Number(
                    guests
                );


// --------------------------------------------------
// VALIDATE DATES
// --------------------------------------------------

            if (

                Number.isNaN(
                    startDate.getTime()
                ) ||

                Number.isNaN(
                    endDate.getTime()
                )

            ) {

                throw new ExpressError(
                    "Please provide valid dates.",
                    400
                );

            }


            if (
                endDate <= startDate
            ) {

                throw new ExpressError(
                    "Check-out must be after check-in.",
                    400
                );

            }


// --------------------------------------------------
// VALIDATE GUESTS
// --------------------------------------------------

            if (

                !Number.isInteger(
                    guestCount
                ) ||

                guestCount < 1

            ) {

                throw new ExpressError(
                    "Please provide a valid number of guests.",
                    400
                );

            }


            if (
                guestCount >
                listing.maxGuests
            ) {

                throw new ExpressError(

                    `This property allows a maximum of ${listing.maxGuests} guests.`,

                    400

                );

            }


// --------------------------------------------------
// CHECK BOOKING OVERLAP
// --------------------------------------------------

            const overlappingBooking =
                await Booking.findOne({

                    listing:
                        listing._id,

                    status:
                        "confirmed",

                    checkIn: {

                        $lt:
                            endDate

                    },

                    checkOut: {

                        $gt:
                            startDate

                    }

                });


            if (overlappingBooking) {

                throw new ExpressError(

                    "This property is already booked for the selected dates.",

                    400

                );

            }


// --------------------------------------------------
// CALCULATE NIGHTS
// --------------------------------------------------

            const millisecondsPerDay =

                1000 *
                60 *
                60 *
                24;


            const nights =
                Math.ceil(

                    (
                        endDate -
                        startDate
                    ) /

                    millisecondsPerDay

                );


            const totalPrice =

                nights *
                listing.price;


// --------------------------------------------------
// CREATE BOOKING
// --------------------------------------------------

            const booking =
                new Booking({

                    listing:
                        listing._id,

                    guest:
                        req.user._id,

                    checkIn:
                        startDate,

                    checkOut:
                        endDate,

                    guests:
                        guestCount,

                    totalPrice,

                    status:
                        "confirmed"

                });


            await booking.save();


            req.flash(
                "success",
                "Booking confirmed successfully!"
            );


            res.redirect(

                `/listing/${listing._id}/confirmation/${booking._id}`

            );

        }
    )
);


// ==================================================
// BOOKING CONFIRMATION
// ==================================================

app.get(
    "/listing/:id/confirmation/:bookingId",

    isLoggedIn,

    wrapAsync(
        async (req, res) => {

            const booking =
                await Booking

                    .findById(
                        req.params.bookingId
                    )

                    .populate(
                        "listing"
                    )

                    .populate(
                        "guest"
                    );


            if (!booking) {

                throw new ExpressError(
                    "Booking not found",
                    404
                );

            }


            if (
                booking.guest._id.toString() !==
                req.user._id.toString()
            ) {

                throw new ExpressError(
                    "You are not authorized to view this booking.",
                    403
                );

            }


            res.render(

                "booking/confirmation",

                {

                    booking

                }

            );

        }
    )
);


// ==================================================
// CANCEL BOOKING
// ==================================================

app.delete(
    "/booking/:bookingId/cancel",

    isLoggedIn,

    wrapAsync(
        async (req, res) => {

            const booking =
                await Booking.findById(
                    req.params.bookingId
                );


            if (!booking) {

                throw new ExpressError(
                    "Booking not found",
                    404
                );

            }


            if (
                booking.guest.toString() !==
                req.user._id.toString()
            ) {

                throw new ExpressError(
                    "You are not authorized to cancel this booking.",
                    403
                );

            }


            booking.status =
                "cancelled";


            await booking.save();


            req.flash(
                "success",
                "Booking cancelled successfully."
            );


            res.redirect(
                `/listing/${booking.listing}`
            );

        }
    )
);


// ==================================================
// 🤖 AI TRAVEL ASSISTANT PAGE
// ==================================================

app.get(
    "/ai-travel",

    isLoggedIn,

    (req, res) => {

        res.render(
            "ai/travel"
        );

    }
);


// ==================================================
// 🤖 AI TRAVEL PLANNER
// ==================================================

app.post(
    "/ai-travel",

    isLoggedIn,

    wrapAsync(
        async (req, res) => {

            const {

                destination,

                days,

                budget,

                travelers,

                interests

            } = req.body;


// --------------------------------------------------
// VALIDATE INPUT
// --------------------------------------------------

            if (

                !destination ||

                !days ||

                !budget ||

                !travelers ||

                !interests

            ) {

                req.flash(

                    "error",

                    "Please fill all travel details."

                );


                return res.redirect(
                    "/ai-travel"
                );

            }


            const numberOfDays =
                Number(days);


            const numberOfTravelers =
                Number(travelers);


            const totalBudget =
                Number(budget);


            if (

                !Number.isInteger(
                    numberOfDays
                ) ||

                numberOfDays < 1 ||

                numberOfDays > 30

            ) {

                req.flash(
                    "error",
                    "Days must be between 1 and 30."
                );


                return res.redirect(
                    "/ai-travel"
                );

            }


            if (

                !Number.isInteger(
                    numberOfTravelers
                ) ||

                numberOfTravelers < 1 ||

                numberOfTravelers > 20

            ) {

                req.flash(
                    "error",
                    "Travelers must be between 1 and 20."
                );


                return res.redirect(
                    "/ai-travel"
                );

            }


            if (

                !Number.isFinite(
                    totalBudget
                ) ||

                totalBudget < 500

            ) {

                req.flash(
                    "error",
                    "Please enter a valid travel budget."
                );


                return res.redirect(
                    "/ai-travel"
                );

            }


// --------------------------------------------------
// AI PROMPT
// --------------------------------------------------

            const prompt = `

You are an expert travel planning assistant.

Create a practical and realistic travel itinerary.

TRIP DETAILS:

Destination:
${destination}

Number of days:
${numberOfDays}

Number of travelers:
${numberOfTravelers}

Total budget:
₹${totalBudget}

Interests:
${interests}


Create the response using the following structure:


TRIP OVERVIEW

Destination:
Duration:
Travelers:
Estimated Budget:


DAY-BY-DAY ITINERARY


For every day:

Day 1

Morning:
Afternoon:
Evening:
Food suggestion:


Continue this format for all ${numberOfDays} days.


BUDGET BREAKDOWN

Accommodation:
Food:
Transportation:
Activities:
Miscellaneous:


TRAVEL TIPS

Give 5 practical travel tips.


IMPORTANT RULES:

1. Keep the itinerary realistic.

2. Try to stay within the provided budget.

3. Prices must be treated as estimates.

4. Do not claim that a specific hotel or attraction is currently available.

5. Do not invent exact booking availability.

6. Mention that prices and opening hours should be verified.

7. Make the itinerary easy to read.

8. Consider the number of travelers.

9. Consider the user's interests.

10. Avoid unnecessary long explanations.

`;


// --------------------------------------------------
// CALL OPENAI
// --------------------------------------------------

            const completion =

                await openai
                    .chat
                    .completions
                    .create({

                        model:
                            "gpt-5.6",

                        messages: [

                            {

                                role:
                                    "system",

                                content:
                                    "You are a helpful, practical and concise travel planning assistant."

                            },

                            {

                                role:
                                    "user",

                                content:
                                    prompt

                            }

                        ]

                    });


// --------------------------------------------------
// GET RESPONSE
// --------------------------------------------------

            const itinerary =

                completion
                    .choices[0]
                    .message
                    .content;


            if (!itinerary) {

                throw new ExpressError(

                    "AI could not generate an itinerary.",

                    500

                );

            }


// --------------------------------------------------
// RENDER RESULT
// --------------------------------------------------

            res.render(

                "ai/result",

                {

                    itinerary,

                    destination,

                    days:
                        numberOfDays,

                    budget:
                        totalBudget,

                    travelers:
                        numberOfTravelers,

                    interests

                }

            );

        }
    )
);


// ==================================================
// SIGNUP PAGE
// ==================================================

app.get(
    "/signup",

    (req, res) => {

        res.render(
            "users/signup"
        );

    }
);


// ==================================================
// SIGNUP
// ==================================================

app.post(
    "/signup",

    wrapAsync(
        async (req, res) => {

            const {

                username,

                email,

                password

            } = req.body;


            const newUser =
                new User({

                    username,

                    email

                });


            const registeredUser =
                await User.register(

                    newUser,

                    password

                );


            req.login(
                registeredUser,

                (err) => {

                    if (err) {

                        return res.redirect(
                            "/login"
                        );

                    }


                    req.flash(
                        "success",
                        "Welcome to Wanderlust!"
                    );


                    res.redirect(
                        "/listing"
                    );

                }

            );

        }
    )
);


// ==================================================
// LOGIN PAGE
// ==================================================

app.get(
    "/login",

    (req, res) => {

        res.render(
            "users/login"
        );

    }
);


// ==================================================
// LOGIN
// ==================================================

app.post(

    "/login",

    passport.authenticate(

        "local",

        {

            failureRedirect:
                "/login",

            failureFlash:
                true

        }

    ),

    (req, res) => {

        req.flash(
            "success",
            "Welcome back!"
        );


        res.redirect(
            "/listing"
        );

    }

);


// ==================================================
// LOGOUT
// ==================================================

app.get(
    "/logout",

    (req, res, next) => {

        req.logout(
            (err) => {

                if (err) {

                    return next(err);

                }


                req.flash(
                    "success",
                    "You have been logged out."
                );


                res.redirect(
                    "/listing"
                );

            }
        );

    }
);


// ==================================================
// 404
// ==================================================

app.use(

    (req, res, next) => {

        next(

            new ExpressError(

                "Page Not Found",

                404

            )

        );

    }

);


// ==================================================
// ERROR HANDLER
// ==================================================

app.use(

    (err, req, res, next) => {

        console.log(
            "ERROR:",
            err
        );


        if (
            err instanceof
            multer.MulterError
        ) {

            if (
                err.code ===
                "LIMIT_FILE_SIZE"
            ) {

                return res
                    .status(400)
                    .render(

                        "error.ejs",

                        {

                            message:
                                "Image size must be 5MB or less."

                        }

                    );

            }


            return res
                .status(400)
                .render(

                    "error.ejs",

                    {

                        message:
                            err.message

                    }

                );

        }


        const {

            statusCode = 500,

            message =
                "Something went wrong."

        } = err;


        res.status(
            statusCode
        );


        res.render(

            "error.ejs",

            {

                message

            }

        );

    }

);


// ==================================================
// SERVER
// ==================================================

const PORT = process.env.PORT || 8080;

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running on port ${PORT}`);
});