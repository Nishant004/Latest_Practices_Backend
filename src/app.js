import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"

const app= express();


app.use(cors({

    origin: process.env.CORS_ORIGIN,
    credentials:true,
    //ready npm cors doc
}))

app.use(express.json({
    limit:"16kb"}))
app.use(express.urlencoded({
    extended:true,limit:'16kb'}))
//extended obj ke under bhi obj dekta hai
app.use(express.static("public"))
app.use(cookieParser())




//routes
import userRouter from "./router/user.Routers.js"

//routes declaration
app.use("/api/v1/users" , userRouter)


export default app

// export {app}