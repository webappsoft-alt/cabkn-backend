# inDriveBackend Socket.IO Events Documentation

This document outlines the Socket.IO events used in the inDriveBackend application.

## Important Note
Postman's WebSocket support is limited for Socket.IO. For complete testing of Socket.IO events, tools like [Socket.IO Client](https://socket.io/docs/v4/client-api/) or custom code is recommended.

## Connection

First, connect to WebSocket:
```
ws://localhost:5400
```

## Events

### Authentication
```json
// Event: authenticate
// Emit this event to authenticate the connection
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2N2ZkMDY4MzhmN2EwYzBiOTFjODYzNmYiLCJ0eXBlIjoicmlkZXIiLCJpYXQiOjE3NDcyMDYyNTh9.9uzX8Mqf0FVN0cA-gWRmnqRfj8AS9X-ZSdxIdIvxWU8"
}

// Response: authenticated
// Server will emit this event upon successful authentication
{
  "userId": "67fd06838f7a0c0b91c8636f"
}
```

### Messaging
```json
// Event: send-message
// Send a private message to another user
{
  "recipientId": "recipient_user_id",
  "messageText": "Hello, how are you?",
  "name": "Sender Name"
}

// Event: send-group-message
// Send a message to a group conversation
{
  "conversationId": "conversation_id",
  "messageText": "Hello everyone!",
  "user": {
    "_id": "user_id",
    "name": "User Name"
  }
}

// Event: seen-msg
// Mark messages from a specific user as seen
{
  "recipientId": "user_id"
}

// Event: seen-group-msg
// Mark messages in a group conversation as seen
{
  "conversationId": "conversation_id"
}
```

### Location
```json
// Event: location-sent
// Send location updates
{
  "lat": 37.7749,
  "lng": -122.4194,
  "to_id": "recipient_user_id",
  "order": "order_id"
}
```

### Ride Requests (Customer)
```json
// Event: send-request-customer
// Customer sends a ride request
{
  "start_lat": 37.7749,
  "start_lng": -122.4194,
  "start_address": "Start Address",
  "end_lat": 37.7833,
  "end_lng": -122.4167,
  "end_address": "End Address",
  "price": 25.50,
  "type": "ride",
  "bookingtype": "live",
  "distance": 5.2,
  "paymentType": "paid"
}

// Event: delete-request-customer
// Customer cancels a ride request
{
  "requestId": "request_id"
}

// Event: cancel-order-customer
// Customer cancels an ongoing order
{
  "orderId": "order_id",
  "reason": "Changed my mind"
}

// Event: tip-order-customer
// Customer gives a tip
{
  "orderId": "order_id",
  "amount": 5
}
```

### Ride Management (Rider)
```json
// Event: update-request-rider
// Rider accepts or rejects a ride request
{
  "requestId": "request_id",
  "status": "accepted" // or "rejected"
}

// Event: send-alert-rider
// Rider sends arrival alert
{
  "orderId": "order_id"
}

// Event: reminder-alert-rider
// Rider sends ride reminder
{
  "orderId": "order_id"
}

// Event: send-payment-alert-rider
// Rider requests payment
{
  "orderId": "order_id"
}

// Event: pick-rider
// Rider starts the ride
{
  "orderId": "order_id"
}

// Event: update-order-rider
// Rider completes or cancels a ride
{
  "orderId": "order_id",
  "status": "completed" // or "cancelled"
}
```

### Customer Responses
```json
// Event: update-request-customer
// Customer responds to rider's request
{
  "requestId": "request_id",
  "orderId": "order_id",
  "status": "accepted" // or "rejected"
}
```

### Admin Operations
```json
// Event: update-order-admin
// Admin assigns an order to a rider
{
  "to_id": "rider_id",
  "orderId": "order_id"
}

// Event: admin-cancel-order
// Admin cancels an order
{
  "orderId": "order_id",
  "reason": "client" // or other reason
}
```

## Listening for Events

When working with Socket.IO, you'll also need to listen for these events from the server:

1. `recieved-message` - New private message received
2. `send-group-message` - New group message received
3. `seen-msg` - Message seen confirmation
4. `location-recieved` - Location update received
5. `recieve-request-rider` - New ride request (for riders)
6. `filter-request-rider` - Request to filter out a ride
7. `update-request-customer` - Ride request update (for customers)
8. `update-request-rider` - Ride request update (for riders)
9. `receive-alert-customer` - Alert received (for customers)
10. `receive-payment-alert-customer` - Payment request (for customers)
11. `cancel-order-customer` - Order cancellation (for customers)
12. `cancel-order-rider` - Order cancellation (for riders)
13. `admin-cancel-order-customer` - Admin cancelled order (for customers)
14. `admin-cancel-order-rider` - Admin cancelled order (for riders)
15. `tip-order-rider` - Tip received (for riders)
16. `pick-customer` - Ride started notification (for customers)
17. `update-order-customer` - Order update (for customers) 