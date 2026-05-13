import dotenv from "dotenv";
dotenv.config();

import connectionDB from "./db/index.js";
import { app } from "./app.js";

connectionDB()
  .then(() => {
    app.listen(process.env.PORT || 8080, () => {
      console.log(`server is running at port:${process.env.PORT}`);
    });
  })
  .catch((error) => {
    console.log("mongodb connection failed!!", error);
  });