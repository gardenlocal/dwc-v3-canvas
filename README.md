# Distributed Web of Care: Client and Server

This repository holds both the server and the client for DWC v2. After cloning this repository, the installation instructions below for getting the prototype running:

## For server

```
cd server
npm install
npm run dev
```

This will start the server. If it's the first time you are installing it, the server will create a database and populate it with the `admin` user. The password for the default `admin` user is `dwc!`.

## For client

```
cd client
npm install
npm run start
```

This will start the frontend. Make sure the server is running when starting the frontend, otherwise you will not be able to register / login.
If you login as `admin`, you have access to the entire garden map of all users in the `Admin Garden` tab.
Regular users have access to their garden sections.

**We are in the process of re-writing this frontend prototype in PIXI.js, so this setup is temporary.**