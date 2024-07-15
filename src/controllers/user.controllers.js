
import asyncHandler from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from '../utils/cloudinary.js'
import { ApiResponse } from "../utils/ApiResponse.js"
import { jwt } from "jsonwebtoken"

const generateAccessAndRefreshTokens = async(userId)=>{
    try {

        const user = await User.findById(userId)
        const accessToken =  user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()
        

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave:false })

        return {accessToken,refreshToken}

        
    } catch (error) {
        throw new ApiError(500,"Something went wrong while generating refresh and access Token")
    }
}

const registerUser = asyncHandler(async(req,res)=>{
    //get user details from frontend
    //validation - not empty
    //check is user already exist:username , email
    //check for images, check for avatar
    //upload them to cloudinary ,avatar
    //create user object - create entry in db
    //remove password and refresh token field from response 
    //check for user creation 
    //return response


    const {username,email,fullName,password}=req.body
    console.log("email",email,"passowrd",password)

    // if (fullName == ""){
    //     throw new ApiError(400,"fullname is required")
    // }

    if (
        [username,email,fullName,password].some((field)=> field?.trim()==="")
    ){
        throw new ApiError(400,"All fields are required")
    }

    const existedUser = await User.findOne({
        $or:[{ username },{ email }]
    })
    if (existedUser){
        throw new ApiError(409,"User with email or usermane already exist")
    }
  
    console.log(req.files?.avatar[0]?.path)
    
    const avatarLocalPath = req.files?.avatar[0]?.path;
    
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;

    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length >0){
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    if (!avatarLocalPath){
        throw new ApiError(400,"Avatar file is required1")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!avatar){
        throw new ApiError(400,"Avatar file is required2 to cloudinary")
    }
    

    const user = await User.create({
        username:username.toLowerCase(),
        avatar:avatar.url,
        coverImage:coverImage?.url||"",
        email,
        fullName,
        password,
        
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )
    if(!createdUser){
        throw new ApiError(500,"Something went wrong while registering new user")
    }

    return res.status(201).json(
           new  ApiResponse(200,createdUser,"User registered Successfully")
    )
      


     


    // return res.status(200).json({
    //     message: "ok"
    // })
})

const loginUser= asyncHandler(async(req,res)=>{
    //request body --> get user details 
    //login through  --> username || email 
    //validation  -->  username || email || password
    //create  -->  check for Token 
    //create  --> check and refresh token field are same from Db
    //send cookie


    const {email,username,password} = req.body
    console.log(email)
 

     //(!(email || username))
    if (!email && !username){
        throw new ApiError(400,"username or email is required")
 
    }

    const user = await User.findOne({
        $or:[{username},{email}]
    })

    if (!user){
         throw new ApiError(404,"User does not exist")
    }
     //isPasswordCorrect(password) --> password from user
    const isPasswordValid = await user.isPasswordCorrect(password)
    if (!isPasswordValid){
        throw new ApiError(401,"Password does not match")
   }
   

    const {accessToken,refreshToken}=await generateAccessAndRefreshTokens(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options ={
        httpOnly:true,
        secure:true,
    }
     
        
    return res.status(200)
    .cookie("accessToken" ,accessToken,options)
    .cookie("refreshToken" ,refreshToken,options)
    .json(
        new ApiResponse(200,
        {
            user:loggedInUser,accessToken,refreshToken
        },
    "User logged In Successfully"
    )
    )


})

const logoutUser = asyncHandler(async(req,res)=>{

    await User.findByIdAndUpdate(
        req.user._id,
        {
          $set:
          {
            refreshToken:undefined
          }
        },
        {
            new:true
        }
    )

    const options ={
        httpOnly:true,
        secure:true,
    }
    return res.status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(new ApiResponse(200,{},"User logged Out"
        
    ))


})

const refreshAccessToken = asyncHandler(async(req,res)=>
{
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken
    //! 
    if (!incomingRefreshToken){
        throw new ApiError(401,"unauthorized request")
    }

  try {
      const decodedToken = jwt.verify(
          incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET
      )
  
      const user = await User.findById(decodedToken?._id)
  
      if (!user){
          throw new ApiError(401,"Invalid refresh token")
      }
  
      if (incomingRefreshToken!== user?.refreshToken){
          throw new ApiError(401,"Refresh token is expired or used")
      }
      
      const options ={
          httpOnly:true,
          secure:true,
      }
       
      const {accessToken,newRefreshToken}=await generateAccessAndRefreshTokens(user._id)
  
      return res.status(200)
      .cookie("accessToken", accessToken,options)
      .cookie("refreshToken",newRefreshToken,options)
      .json(
          new ApiResponse(
              200,{
                  accessToken,refreshToken : newRefreshToken
              },
              "Access Token refreshed"
          )
      )
  
  } catch (error) {
    throw new ApiError(401,error?.message||"Invalid refresh token")
    
  }


})


const changeCurrentPassword = asyncHandler(async(req,res)=>{
  const {oldPassword,newPassword } = req.body

    // {,confPassword}
    //    if (!(newPassword ===confPassword)) {
    //          throw new ApiError(400,"Password does not Matched")
    //    }

   //req.user?.id
   
   const user = await User.findById(req.user?._id)
   const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

   if (!isPasswordCorrect){
    throw new ApiError(400,"invalid password")
   }

   user.password= newPassword
   await user.save({validateBeforeSave:false})


   return res
   .status(200)
   .json(new ApiResponse
    (
        200,{},"Password change Successfully"
    )
   )





})

const getCurrentUser = asyncHandler(async(req,res)=>{
    return res
    .status(200)
    .json(200,req.user,"Current User fetched successfully")
})

const updateAccountDetails = asyncHandler(async(req,res)=>{
       
    const {email,fullName} =req.body

    if(!(fullName || email)){
        throw new ApiError(400,"All fields are required")
    }

    const user = User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                //fullName:fullName
                //email:email
                fullName,
                email
            }
        },
        {new:true}
    ).select("-password")
    
    return res
    .status(200)
    .json(new ApiResponse(200,user,"Account details updated successfully"))
})


const updateUserAvatar = asyncHandler(async(req,res)=>{
     
   const avaterLocalPath = req.file?.path

   if(!avaterLocalPath){
    throw new ApiError(400,"Avatar file is missing")
   }

   const avatar = await uploadOnCloudinary(avaterLocalPath)

   if  (!avatar.url){
    throw new ApiError(400,"Error while uploading on avatar")
   }

   const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
        $set:{
            avatar: avatar.url
        }
    },
    {new:true}
   )
   .select("-password")

   return res
   .status(200)
   .json(
       new ApiResponse(200,user,"Avatar updated Successfully")
   )

})

const updateUserCoverImage = asyncHandler(async(req,res)=>{
     
    const coverImageLocalPath = req.file?.path
 
    if(!coverImageLocalPath){
     throw new ApiError(400,"CoverImage file is missing")
    }
 
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)
 
    if  (!coverImage.url){
     throw new ApiError(400,"Error while uploading on coverImage")
    }
 
    const user = await User.findByIdAndUpdate(
     req.user?._id,
     {
         $set:{
            coverImage: coverImage.url
         }
     },
     {new:true}
    )
    .select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200,user,"CoverImage updated Successfully")
    )
 
 })

// export default {registerUser};

export {registerUser,loginUser,logoutUser,refreshAccessToken,changeCurrentPassword,getCurrentUser,updateAccountDetails,updateUserAvatar,updateUserCoverImage}