import mongoose from "mongoose";

const movieSchema = new mongoose.Schema({
    title:String,
    size:Number,
    magnet:String,
    poster:String,
    jenres:Array<String>,
    description:String,
    release:String,
    actors:String,
})

export const Movie = mongoose.model('Movie',movieSchema);