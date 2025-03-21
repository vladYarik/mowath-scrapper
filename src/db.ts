import mongoose from "mongoose"

const uri = 'mongodb://localhost:27017/Mowath'

export async function connectDB() {
    try{
        const db = await mongoose.connect(uri,{
            
        })
        console.log('DB connected.')
        return db
    }catch(e){  
        return null
        console.log('Error connecting to DB')
    }
}