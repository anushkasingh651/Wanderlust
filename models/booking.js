const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
    {
        listing: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Listing",
            required: true
        },

        guest: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        checkIn: {
            type: Date,
            required: true
        },

        checkOut: {
            type: Date,
            required: true
        },

        guests: {
            type: Number,
            required: true,
            min: 1,
            max: 20
        },

        totalPrice: {
            type: Number,
            required: true,
            min: 0
        },

        status: {
            type: String,
            enum: ["confirmed", "cancelled"],
            default: "confirmed"
        },

        createdAt: {
            type: Date,
            default: Date.now
        }
    }
);

module.exports = mongoose.model("Booking", bookingSchema);