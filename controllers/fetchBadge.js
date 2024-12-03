const redisClient = require('../startup/redisClient'); // Import Redis client

// Function to get previous badge data for a user
exports.getUserBadgeData = async (userId) => {
    try {
        const userKey = `user:${userId}`;  // Define Redis key
    
        // Use promise-based Redis method for cleaner handling
        let userData = await redisClient.hGetAll(userKey);
    
        // If no data exists, initialize with default values
        if (!userData || Object.keys(userData).length === 0) {
          console.log('No data found for user, initializing with default values.');
          return {
            noti: 0
          };
        }

        userData = Object.fromEntries(Object.entries(userData).map(([key, value]) => [key, parseInt(value)]));
    
        // Return existing user data
        return userData;
    
      } catch (err) {
        console.error('Error fetching user data:', err);
        return { bins: []};
      }
};
