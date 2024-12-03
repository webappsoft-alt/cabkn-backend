const redis = require('redis');

const redisClient = redis.createClient({
    socket: {
        host: '127.0.0.1', // or the appropriate host
        port: 6379,
    }
});

redisClient.connect()
    .then(() => console.log('Redis client connected.'))
    .catch(err => console.error('Redis connection error:', err));


module.exports = redisClient;
