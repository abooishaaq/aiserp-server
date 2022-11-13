# auth

## `/api/me`

### `GET`

#### response

info about the current user

## `/api/login`

### `POST`

body:
```ts
{ token: string }
```
-   authorization: `Bearer <token>`
-   body contains the token from the firebase
-   if authorization is valid it is deleted and the new token is set
-   else the body's token is verified and a new jwt is generated and send back

## `/api/logout`

### `POST`

-   authorization: `Bearer <token>`
-   deletes the token's session from the database
