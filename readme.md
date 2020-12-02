# UPI 2.0 Backend
A miniature UPI system with its own user registration system, account handling, and data entry system. This was initially developed for a task-based challenge for Freecharge with `Node JS` for the server and `MongoDB` for the database.

## Tech Stack Used

Library: `Node`, `Express`

Database: `MongoDB`

## Documentation

### Quick Start

Clone the Repo: git clone `https://github.com/theWellHopeErr/freecharge-backend-challenge`

Change Directory: `cd freecharge-backend-challenge`

### Install Dependencies

Using yarn: `yarn install`

### Setup env

Create .env file with following

    - PORT=3000
    - NODE_ENV=development
    - DB_URL={MONGO_ClUSTER_URL}
    - SECRET_KEYPORT={SECRET_STRING}

### Run App

Run App: `yarn run dev`

## Endpoints

### POST `/register`

To register a new user

`{ "name": String, "username": String, "password": String }`

### POST `/login`

To log in as a user

`{ "username": String, "password": String }`

Returns a JWT

#### Set the JWT as bearer to use authorized endpoints

### GET `/account`

_Authorized Endpoint_

Returns Account Details

### POST `/upload`

_Authorized Endpoint_

Upload CSV File with key as `csvfile`

Returns Updated Account Details
