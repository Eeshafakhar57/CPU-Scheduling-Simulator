const mongoose = require("mongoose");

const ProcessSetSchema = new mongoose.Schema({
    processes: [{ processId: String, arrivalTime: Number, burstTime: Number, priority: Number }],
}, { timestamps: true });

module.exports = mongoose.model("ProcessSet", ProcessSetSchema);

