const AddmeRequest = require("./AddmeRequest");

/**
 * Get all pending addme requests
 * @returns {Promise<Array>} Array of pending requests
 */
async function getPendingRequests() {
  try {
    return await AddmeRequest.find({ status: "pending" }).sort({ createdAt: -1 });
  } catch (error) {
    console.error("Error getting pending requests:", error);
    return [];
  }
}

/**
 * Get all requests by a specific user
 * @param {String} userId - Discord user ID
 * @returns {Promise<Array>} Array of user's requests
 */
async function getUserRequests(userId) {
  try {
    return await AddmeRequest.find({ userId }).sort({ createdAt: -1 });
  } catch (error) {
    console.error(`Error getting requests for user ${userId}:`, error);
    return [];
  }
}

/**
 * Get all requests for a specific project
 * @param {String} projectName - Project name
 * @returns {Promise<Array>} Array of project requests
 */
async function getProjectRequests(projectName) {
  try {
    return await AddmeRequest.find({ projectName }).sort({ createdAt: -1 });
  } catch (error) {
    console.error(`Error getting requests for project ${projectName}:`, error);
    return [];
  }
}

/**
 * Approve a pending request
 * @param {String} requestId - MongoDB _id of the request
 * @param {String} reviewerId - Discord user ID of the reviewer
 * @returns {Promise<Object>} Updated request document
 */
async function approveRequest(requestId, reviewerId) {
  try {
    const request = await AddmeRequest.findById(requestId);
    if (!request) {
      throw new Error("Request not found");
    }
    
    request.status = "approved";
    request.reviewedBy = reviewerId;
    await request.save();
    return request;
  } catch (error) {
    console.error(`Error approving request ${requestId}:`, error);
    throw error;
  }
}

/**
 * Reject a pending request
 * @param {String} requestId - MongoDB _id of the request
 * @param {String} reviewerId - Discord user ID of the reviewer
 * @param {String} reason - Reason for rejection
 * @returns {Promise<Object>} Updated request document
 */
async function rejectRequest(requestId, reviewerId, reason) {
  try {
    const request = await AddmeRequest.findById(requestId);
    if (!request) {
      throw new Error("Request not found");
    }
    
    request.status = "rejected";
    request.reviewedBy = reviewerId;
    request.rejectionReason = reason;
    await request.save();
    return request;
  } catch (error) {
    console.error(`Error rejecting request ${requestId}:`, error);
    throw error;
  }
}

/**
 * Get request statistics
 * @returns {Promise<Object>} Statistics object
 */
async function getRequestStats() {
  try {
    const total = await AddmeRequest.countDocuments();
    const pending = await AddmeRequest.countDocuments({ status: "pending" });
    const approved = await AddmeRequest.countDocuments({ status: "approved" });
    const rejected = await AddmeRequest.countDocuments({ status: "rejected" });
    
    const manualRequests = await AddmeRequest.countDocuments({ requestType: "manual" });
    const sassRequests = await AddmeRequest.countDocuments({ requestType: "sass" });
    
    return {
      total,
      pending,
      approved,
      rejected,
      manualRequests,
      sassRequests
    };
  } catch (error) {
    console.error("Error getting request statistics:", error);
    return {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      manualRequests: 0,
      sassRequests: 0
    };
  }
}

module.exports = {
  getPendingRequests,
  getUserRequests,
  getProjectRequests,
  approveRequest,
  rejectRequest,
  getRequestStats
}; 