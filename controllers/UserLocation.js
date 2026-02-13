const redisClient = require("../startup/redisClient"); // Import Redis client

// Add or Update User Location with FCM Token
exports.updateUserLocation = async (userId, longitude, latitude, address, fcmToken) => {
    try {
      // Use Redis Multi for atomic operations
      const multi = redisClient.multi();
  
      // Step 1: Remove old geolocation if exists
      multi.zRem("user_locations", userId);
  
      // Step 2: Add new geolocation
      multi.geoAdd("user_locations", {
        longitude,
        latitude,
        member: userId,
      });
  
      // Step 3: Update user metadata (e.g., address, FCM token)
      if (address) {
        multi.hSet(`user_data:${userId}`, "address", address);
      }
      if (fcmToken) {
        multi.hSet(`user_data:${userId}`, "fcmToken", fcmToken);
      }
  
      // Execute all commands atomically
      const results = await multi.exec();
  
      console.log(`Updated location, address, and FCM token for user ${userId}`, results);
    } catch (err) {
      console.error("Error updating location and metadata:", err);
      throw err; // Re-throw error for further handling
    }
};

// Fetch Users Within Radius and Matching Address (with FCM tokens)
exports.getUsersInRadius = async (longitude, latitude, radius, addressMatch) => {
    try {
      // Step 1: Filter users by address
      const allKeys = await redisClient.keys("user_data:*"); // Get all user data keys
      const matchingUsers = [];
  
      for (const key of allKeys) {
        const userAddress = await redisClient.hGet(key, "address");
        if (userAddress && userAddress.includes(addressMatch)) {
          const userId = key.split(":")[1]; // Extract userId from key
          matchingUsers.push(userId);
        }
      }
  
      if (matchingUsers.length === 0) {
        return []; // No users matched the address
      }
  
      // Step 2: Filter the matching users by radius
      const usersInRadius = [];
      for (const userId of matchingUsers) {
        const userLocation = await redisClient.geoPos("user_locations", userId);
        if (userLocation && userLocation[0]) {
          const [userLongitude, userLatitude] = userLocation[0];
          const distance = haversineDistance(
            { lat: latitude, lon: longitude },
            { lat: userLatitude, lon: userLongitude }
          );
          if (distance <= radius) {
            // Fetch the FCM token for the user
            const fcmToken = await redisClient.hGet(`user_data:${userId}`, "fcmToken");
            usersInRadius.push({ userId, fcmToken });
          }
        }
      }
      return usersInRadius;
    } catch (err) {
      console.error("Error fetching users:", err);
      return []; // Return an empty array on error
    }
  };

// Helper function to calculate haversine distance
function haversineDistance(coord1, coord2) {
  const toRadians = (deg) => (deg * Math.PI) / 180;
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(coord2.lat - coord1.lat);
  const dLon = toRadians(coord2.lon - coord1.lon);
  const lat1 = toRadians(coord1.lat);
  const lat2 = toRadians(coord2.lat);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in kilometers
}
