import mongoose, { ConnectOptions } from "mongoose";

const MAX_RETRIES = 3;
const RETRY_INTERVAL = 5000; // 5 seconds

class DatabaseConnection {
  private retryCount: number;
  private isConnected: boolean;

  constructor() {
    this.retryCount = 0;
    this.isConnected = false;

    // Mongoose config
    mongoose.set("strictQuery", true);

    // Events
    mongoose.connection.on("connected", () => {
      console.log("✅ MongoDB connected successfully.");
      this.isConnected = true;
    });

    mongoose.connection.on("error", (error: Error) => {
      console.error("❌ MongoDB connection error:", error);
      this.isConnected = false;
    });

    mongoose.connection.on("disconnected", () => {
      console.log("⚠️ MongoDB Disconnected.");
      this.isConnected = false;
      this.handleDisconnection();
    });

    // Graceful shutdown
    process.on("SIGTERM", this.handleAppTermination.bind(this));
  }

  public async connect(): Promise<void> {
    try {
      if (!process.env.MONGO_URI) {
        throw new Error("❌ MongoDB URI is not defined in .env");
      }

      const connectionOptions: ConnectOptions = {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        family: 4,
      };

      if (process.env.NODE_ENV === "development") {
        mongoose.set("debug", true);
      }

      await mongoose.connect(process.env.MONGO_URI, connectionOptions);
      this.retryCount = 0;
    } catch (error: any) {
      console.error(error.message);
      await this.handleConnectionError();
    }
  }

  private async handleConnectionError(): Promise<void> {
    if (this.retryCount < MAX_RETRIES) {
      this.retryCount++;
      console.log(
        `🔄 Retrying connection attempt ${this.retryCount} of ${MAX_RETRIES}`
      );
      await new Promise((resolve) => setTimeout(resolve, RETRY_INTERVAL));
      return this.connect();
    } else {
      console.error(
        `❌ Failed to connect to MongoDB after ${MAX_RETRIES} attempts.`
      );
      process.exit(1);
    }
  }

  private async handleDisconnection(): Promise<void> {
    if (!this.isConnected) {
      console.log("⚠️ Attempting to reconnect to MongoDB...");
      await this.connect();
    }
  }

  private async handleAppTermination(): Promise<void> {
    try {
      await mongoose.connection.close();
      console.log("🛑 MongoDB connection closed due to app termination.");
      process.exit(0);
    } catch (error) {
      console.error("❌ Error during database disconnection:", error);
      process.exit(1);
    }
  }

  public getConnectionStatus(): {
    isConnected: boolean;
    readyState: number;
    host: string;
    name: string;
  } {
    return {
      isConnected: this.isConnected,
      readyState: mongoose.connection.readyState,
      host: mongoose.connection?.host ?? "Unknown",
      name: mongoose.connection?.name ?? "Unknown",
    };
  }
}

const dbConnection = new DatabaseConnection();

export default dbConnection.connect.bind(dbConnection);
export const getDBStatus = dbConnection.getConnectionStatus.bind(dbConnection);
