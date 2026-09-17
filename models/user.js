const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const passportLocalMongoose = require("passport-local-mongoose");

const userSchema = new Schema({

    // ==========================================
    // EMAIL
    // ==========================================

    email: {
        type: String,
        required: true
    },


    // ==========================================
    // WISHLIST
    // ==========================================

    wishlist: [
        {
            type: Schema.Types.ObjectId,
            ref: "Listing"
        }
    ]

});


// ==============================================
// PASSPORT LOCAL MONGOOSE
// ==============================================

const passportPlugin =
    passportLocalMongoose.default || passportLocalMongoose;

userSchema.plugin(passportPlugin);


// ==============================================
// MODEL
// ==============================================

module.exports =
    mongoose.model("User", userSchema);