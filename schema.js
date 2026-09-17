const Joi = require("joi");

// ==================================================
// LISTING VALIDATION
// ==================================================

const listingSchema = Joi.object({

    listing: Joi.object({

        title: Joi.string()
            .trim()
            .required()
            .messages({
                "string.empty":
                    "Title cannot be empty.",
                "any.required":
                    "Title is required."
            }),

        description: Joi.string()
            .trim()
            .required()
            .messages({
                "string.empty":
                    "Description cannot be empty.",
                "any.required":
                    "Description is required."
            }),

        location: Joi.string()
            .trim()
            .required()
            .messages({
                "string.empty":
                    "Location cannot be empty.",
                "any.required":
                    "Location is required."
            }),

        country: Joi.string()
            .trim()
            .required()
            .messages({
                "string.empty":
                    "Country cannot be empty.",
                "any.required":
                    "Country is required."
            }),

        price: Joi.number()
            .required()
            .min(0)
            .messages({
                "number.base":
                    "Price must be a number.",
                "number.min":
                    "Price cannot be negative.",
                "any.required":
                    "Price is required."
            }),

        propertyType: Joi.string()
            .valid(
                "Apartment",
                "Villa",
                "House",
                "Hotel",
                "Cabin",
                "Farmhouse",
                "Other"
            )
            .required()
            .messages({
                "any.only":
                    "Please select a valid property type.",
                "any.required":
                    "Property type is required."
            }),

        maxGuests: Joi.number()
            .integer()
            .min(1)
            .max(20)
            .required()
            .messages({
                "number.base":
                    "Maximum guests must be a number.",
                "number.integer":
                    "Maximum guests must be a whole number.",
                "number.min":
                    "There must be at least 1 guest.",
                "number.max":
                    "Maximum guests cannot exceed 20.",
                "any.required":
                    "Maximum guests is required."
            }),

        bedrooms: Joi.number()
            .integer()
            .min(0)
            .max(20)
            .required()
            .messages({
                "number.integer":
                    "Bedrooms must be a whole number.",
                "number.min":
                    "Bedrooms cannot be negative.",
                "number.max":
                    "Bedrooms cannot exceed 20.",
                "any.required":
                    "Bedrooms are required."
            }),

        beds: Joi.number()
            .integer()
            .min(0)
            .max(30)
            .required()
            .messages({
                "number.integer":
                    "Beds must be a whole number.",
                "number.min":
                    "Beds cannot be negative.",
                "number.max":
                    "Beds cannot exceed 30.",
                "any.required":
                    "Beds are required."
            }),

        bathrooms: Joi.number()
            .min(0)
            .max(20)
            .required()
            .messages({
                "number.min":
                    "Bathrooms cannot be negative.",
                "number.max":
                    "Bathrooms cannot exceed 20.",
                "any.required":
                    "Bathrooms are required."
            }),

        amenities: Joi.array()
            .items(
                Joi.string().trim()
            )
            .default([]),

        checkInTime: Joi.string()
            .allow("")
            .default(""),

        checkOutTime: Joi.string()
            .allow("")
            .default("")

    }).required()
});

// ==================================================
// REVIEW VALIDATION
// ==================================================

const reviewSchema = Joi.object({

    review: Joi.object({

        rating: Joi.number()
            .required()
            .min(1)
            .max(5)
            .messages({
                "number.base":
                    "Rating must be a number.",
                "number.min":
                    "Rating must be at least 1.",
                "number.max":
                    "Rating cannot exceed 5.",
                "any.required":
                    "Rating is required."
            }),

        comment: Joi.string()
            .trim()
            .required()
            .min(1)
            .messages({
                "string.empty":
                    "Review comment cannot be empty.",
                "any.required":
                    "Review comment is required."
            })

    }).required()
});

// ==================================================
// EXPORT
// ==================================================

module.exports = {
    listingSchema,
    reviewSchema
};