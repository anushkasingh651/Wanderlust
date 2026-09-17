const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const listingSchema = new Schema({

    // ==================================================
    // BASIC INFORMATION
    // ==================================================

    title: {
        type: String,
        required: true,
        trim: true
    },

    description: {
        type: String,
        required: true,
        trim: true
    },


    // ==================================================
    // IMAGE
    // ==================================================

    image: {
        url: {
            type: String,
            default: ""
        },

        filename: {
            type: String,
            default: ""
        }
    },


    // ==================================================
    // PRICE
    // ==================================================

    price: {
        type: Number,
        required: true,
        min: 0
    },


    // ==================================================
    // LOCATION
    // ==================================================

    location: {
        type: String,
        required: true,
        trim: true
    },

    country: {
        type: String,
        required: true,
        trim: true
    },


    // ==================================================
    // PROPERTY TYPE
    // ==================================================

    propertyType: {
        type: String,

        enum: [
            "Apartment",
            "Villa",
            "House",
            "Hotel",
            "Cabin",
            "Farmhouse",
            "Other"
        ],

        default: "Other"
    },


    // ==================================================
    // PROPERTY CAPACITY
    // ==================================================

    maxGuests: {
        type: Number,
        min: 1,
        max: 20,
        default: 2
    },

    bedrooms: {
        type: Number,
        min: 0,
        default: 0
    },

    beds: {
        type: Number,
        min: 0,
        default: 0
    },

    bathrooms: {
        type: Number,
        min: 0,
        default: 0
    },


    // ==================================================
    // AMENITIES
    // ==================================================

    amenities: {
        type: [String],
        default: []
    },


    // ==================================================
    // CHECK-IN / CHECK-OUT
    // ==================================================

    checkInTime: {
        type: String,
        default: ""
    },

    checkOutTime: {
        type: String,
        default: ""
    },


    // ==================================================
    // OWNER
    // ==================================================

    owner: {
        type: Schema.Types.ObjectId,
        ref: "User"
    },


    // ==================================================
    // REVIEWS
    // ==================================================

    reviews: [
        {
            type: Schema.Types.ObjectId,
            ref: "Review"
        }
    ],


    // ==================================================
    // GEOLOCATION
    //
    // MongoDB GeoJSON format:
    //
    // [longitude, latitude]
    //
    // Example Delhi:
    //
    // [77.2090, 28.6139]
    // ==================================================

    geometry: {

        type: {
            type: String,

            enum: ["Point"],

            default: "Point"
        },

        coordinates: {

            type: [Number],

            default: [0, 0]
        }
    }

});


// ==================================================
// GEO INDEX
// ==================================================

listingSchema.index({
    geometry: "2dsphere"
});


module.exports =
    mongoose.model("Listing", listingSchema);