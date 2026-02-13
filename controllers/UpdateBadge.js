const redisClient = require('../startup/redisClient'); // Import Redis client

exports.updateBadgeCount = async (userId, updateData) => {
    try {
      const userKey = `user:${userId}`;  // Redis key pattern

       // Use promise-based Redis method for cleaner handling
       let userData = await redisClient.hGetAll(userKey);

       userData = Object.fromEntries(Object.entries(userData).map(([key, value]) => [key, parseInt(value)]));

    
       // If no data exists, initialize with default values
       if (!userData || Object.keys(userData).length === 0) {
         userData = {
          noti: 0
         };
       }

      for (const [key, value] of Object.entries(updateData)) {
        userData[key] = value; // Replace existing values with new ones
      }

      await redisClient.hSet(userKey, userData);
    } catch (error) {
      console.error('Error updating badge count:', error);
    }
  };