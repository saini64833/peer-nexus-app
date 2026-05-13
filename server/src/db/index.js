import mongoose from "mongoose";
import { DB_NAME } from "../constant.js";

const connectDB = async () => {
  try {
    console.log("MONGO URI:", process.env.MONGO_URI);

    const connectionInstance = await mongoose.connect(
      process.env.MONGO_URI,
      {
        dbName: DB_NAME,
      }
    );

    console.log(
      `MongoDB connected!! HOST: ${connectionInstance.connection.host}`
    );
  } catch (error) {
    console.log("Mongoose connection failed!!", error.message);
    process.exit(1);
  }
};

export default connectDB;