const mongoose = require("mongoose");
const Listing = require("../models/listing.js");
const { data } = require("./data.js");

const MONGO_URL = "mongodb://127.0.0.1:27017/wanderlust";

async function main() {
    await mongoose.connect(MONGO_URL);
    console.log("connected to DB");
}

main()
    .then(async () => {
        await Listing.deleteMany({});
        await Listing.insertMany(data);

        console.log("Data was initialized");

        await mongoose.connection.close();
    })
    .catch((err) => {
        console.log(err);
    });