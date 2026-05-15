import "./env.js";

import connectionDB from "./db/index.js";
import { app } from "./app.js";

connectionDB()
  .then(() => {
    app.listen(process.env.PORT || 8080, () => {
      console.log(
        `server is running at port: ${process.env.PORT || 8080}`
      );
    });
  })
  .catch((error) => {
    console.log("mongodb connection failed!!", error);
  });