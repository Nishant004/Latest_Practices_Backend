import mongoose , { Schema } from "mongoose";
import { refreshAccessToken } from "../controllers/user.controllers";

const subscriptionSchema = new Schema({

    subscrber :{
        //one who is subscribing
        type:Schema.Types.ObjectId, 
        ref:"User"
    },
    channel:{
        //one to whom "subscriber" is subcribing 
        type:Schema.Types.ObjectId, 
        ref:"User"
    },
},{timestamps:true})


export const Subscription = mongoose.model("Subscription",subscriptionSchema)