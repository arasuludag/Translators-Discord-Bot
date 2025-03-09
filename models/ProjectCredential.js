const mongoose = require("mongoose");

const ProjectCredentialSchema = new mongoose.Schema({
  // Project name (exact match required)
  projectName: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  // Verification code/password ("additional info")
  verificationCode: {
    type: String,
    required: true,
    trim: true
  },
  // Optional: Expiration date for the credentials
  expirationDate: {
    type: Date,
    default: null
  },
  // Who created this credential
  createdBy: {
    type: String,
    required: true
  },
  // Username of who created this credential
  createdByUsername: {
    type: String,
    required: true
  },
  // When the credential was created
  createdAt: {
    type: Date,
    default: Date.now
  },
  // When the credential was last updated
  updatedAt: {
    type: Date,
    default: Date.now
  },
  // How many times this credential has been used
  usageCount: {
    type: Number,
    default: 0
  },
  // Log of users who have used this credential
  usageLog: [{
    userId: String,
    username: String,
    timestamp: {
      type: Date,
      default: Date.now
    },
    success: Boolean,
    failureReason: String
  }]
});

// Update the updatedAt field before saving
ProjectCredentialSchema.pre("save", function(next) {
  this.updatedAt = Date.now();
  next();
});

// Method to check if the credential is expired
ProjectCredentialSchema.methods.isExpired = function() {
  if (!this.expirationDate) return false;
  return new Date() > this.expirationDate;
};

// Method to log a usage attempt
ProjectCredentialSchema.methods.logUsage = function(userId, username, success, failureReason = "") {
  this.usageLog.push({
    userId,
    username,
    timestamp: new Date(),
    success,
    failureReason
  });
  
  if (success) {
    this.usageCount += 1;
  }
};

// Method to verify credentials
ProjectCredentialSchema.statics.verifyCredentials = async function(projectName, verificationCode) {
  const credential = await this.findOne({ projectName });
  
  if (!credential) {
    return {
      success: false,
      reason: "project_not_found",
      message: "Project not found"
    };
  }
  
  if (credential.isExpired()) {
    return {
      success: false,
      reason: "expired",
      message: "Credentials have expired"
    };
  }
  
  if (credential.verificationCode !== verificationCode) {
    return {
      success: false,
      reason: "invalid_code",
      message: "Invalid verification code"
    };
  }
  
  return {
    success: true,
    credential
  };
};

module.exports = mongoose.model("ProjectCredential", ProjectCredentialSchema); 