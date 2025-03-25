const mongoose = require("mongoose");

const ProjectRequestSchema = new mongoose.Schema({
  // Discord user ID who made the request
  userId: {
    type: String,
    required: true,
  },
  // Discord username who made the request
  username: {
    type: String,
    required: true,
  },
  // Project name requested
  projectName: {
    type: String,
    required: true,
  },
  // Verification code provided by the user
  verificationCode: {
    type: String,
    default: "",
  },
  // Request type: "manual" or "sass"
  requestType: {
    type: String,
    enum: ["manual", "sass"],
    required: true,
  },
  // Discord interaction ID
  interactionId: {
    type: String,
    required: true,
  },
  // Status of the request: "pending", "approved", "rejected"
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  },
  // Reason for rejection if status is "rejected"
  rejectionReason: {
    type: String,
    default: "",
  },
  // Discord user ID who approved/rejected the request
  reviewedBy: {
    type: String,
    default: "",
  },
  // Timestamps for when the request was created and updated
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update the updatedAt field before saving
ProjectRequestSchema.pre("save", function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("ProjectRequest", ProjectRequestSchema); 