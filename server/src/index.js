import connectionDB from "./db/index.js";
import dotenv from "dotenv";
import { app } from "./app.js";

dotenv.config({ path: "./.env" });
connectionDB()
  .then(() => {
    app.listen(process.env.PORT, () => {
      console.log(`server is running at port:${process.env.PORT}`);
    });
  })
  .catch((error) => {
    console.log("mongodb connection failed!!", error);
  });