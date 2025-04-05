import express from "express"
import dotenv from "dotenv"
import morgan from "morgan"
import {rateLimit} from "express-rate-limit";
import helmet from "helmet";
import hpp from "hpp"
import cookieParser from "cookie-parser"
import cors from "cors"
import connectDb from "./db/db.ts"
dotenv.config()
const app= express();

const PORT=process.env.PORT || 3000;

// global rate limiting 
const limiter = rateLimit({
    windowMs:15*60*1000,
    max:100,
    message:"Too many request from this IP, please try again later",
})

// because mongosanitize was not working for me i created my own custom sanitizer
function sanitizeObject(obj: any) {
  for (const key in obj) {
    if (key.startsWith("$") || key.includes(".")) {
      delete obj[key];
    } else if (typeof obj[key] === "object") {
      sanitizeObject(obj[key]);
    }
  }
}
function mongoSanitizeCustom(req: any, res: any, next: any) {
  if (req.body) sanitizeObject(req.body);
  if (req.query) sanitizeObject(req.query);
  if (req.params) sanitizeObject(req.params);
  next();
}
//security middlewares
app.use("/api",limiter)
app.use(helmet());
app.use(hpp())
app.use(mongoSanitizeCustom)

// logging middleware (only for development)

if(process.env.NODE_ENV==='developement'){
    app.use(morgan("dev"));
}

//body parsing middlewars
app.use(express.json({limit:"10kb"}))
app.use(express.urlencoded({extended:true,limit:"100kb"}));
app.use(cookieParser());

//cors

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-with",
      "device-remeber-token",
      "Access-Control-Allow-Origin",
      "Origin",
      "Accept",
    ],
  })
);

// API routes

app.get("/", (_, res) => {
  res.send("Hello word");
});






//Global Error Handler 
app.use((err:any, req:any, res:any, next:any) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    status: "error",
    message: err.message || "Internal server error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

// 404 Route Handler (Always at the bottom)
app.use((req, res) => {
  res.status(404).json({
    status: "error",
    message: "Route not found",
  });
});


connectDb().then(()=>{
  console.log("Connection done")
})



// Server start
app.listen(PORT, () => {
  console.log(
    `Server is running on port ${PORT} in ${process.env.NODE_ENV} mode`
  );
});

