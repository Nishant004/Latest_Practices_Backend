// require('dotenv').config({path:"../env"})
// import mongoose from "mongoose";
// import { DB_NAME } from "./constants";

import dotenv from "dotenv";

import connectDB from "./db/index.js";

import app from "./app.js"

dotenv.config({
    path:'../env'
})

connectDB()
.then(()=>{
    app.listen(process.env.PORT||8000,()=>{
        console.log(`Server is running on ${process.env.PORT}`);
    })
})
.catch((error)=>{
     console.log("MONGO DB CONNECTION FAIL !!!",error)
})







// import express from "express"

// const app = express()

// ( async ()=>{
//     try{
//         await mongoose.connect(`${process.env.MONGO_URL}/${DB_NAME}`)
//         app.on("error",(error)=>{
//             console.log("ERROR: NOT ABLE TO TALK TO DATA_BASE",error)
//             throw error
//         }) 

//         app.listen(process.env.PORT,()=>{
//             console.log(`App is list on port ${process.env.PORT}`);
//         })

//     }
//     catch(error){
//         console.log("ERROR",error)
//         throw error
//     }
// })()