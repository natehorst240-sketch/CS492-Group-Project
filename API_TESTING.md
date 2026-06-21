# API Testing Checklist

Start the application with `npm start`, then use Postman or another API client.

## 1. Health check

`GET http://localhost:3000/api/health`

## 2. Register a user

`POST http://localhost:3000/api/auth/register`

```json
{
  "email": "test@example.com",
  "password": "Test123!",
  "first_name": "Test",
  "last_name": "User"
}
```

## 3. Log in

`POST http://localhost:3000/api/auth/login`

```json
{
  "email": "test@example.com",
  "password": "Test123!"
}
```

## 4. List books

`GET http://localhost:3000/api/books`

Search example:

`GET http://localhost:3000/api/books?search=Matilda`

## 5. Add an item to the cart

`POST http://localhost:3000/api/cart`

```json
{
  "user_id": 1,
  "book_id": 1,
  "quantity": 2
}
```

## 6. View a cart

`GET http://localhost:3000/api/cart/1`

## Existing submitted features

Book CRUD/catalog and order-management/order-tracking testing remain documented by their existing code and pages. They were not replaced when the implementation-guide material was added.

