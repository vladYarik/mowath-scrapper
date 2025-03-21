import { Cheerio } from "cheerio"
import { connectDB } from "./db"
import * as cheerio from 'cheerio'
import axios from "axios"
import { fetchPage } from "./api"
import { Movie } from "./schemas/movie.schema"
import { attr, val } from "cheerio/dist/commonjs/api/attributes"

interface ITorrent{
    size:number
    title:string
    magnet:string
    torrentLink:string
    poster?:string
    jenres:string[]
    description:string
    release:string
    actors:string
}

const parseSize = (str) => {
    const regex = /([\d.]+)\s*([A-Za-z]+)/;
    const match = str.match(regex)
    let size = 0
    if(match && match[0]){
        if(match[2] === 'GB'){
            size = parseFloat(match[1]) * 1024
        }else if(match[2] === 'MB'){
            size = match[1]
        }
        return size
    }else{
        return null
    }
}

const filterTorrents = (list:ITorrent[]):ITorrent[] => {
    const filtered:ITorrent[] = Object.values(
        list.reduce((acc,item) => {
            if(!acc[item.title] || item.size < acc[item.title].size){
                acc[item.title] = item
            }
            return acc
        },{})
    )
    return filtered
}

const getMovieInfoByScenarios = async (data,scenarios) => {
    let filmInfo = ''
    const $ = cheerio.load(data)
    for(let i in scenarios){
        const descrRoot = $(`b:contains("${scenarios[i]}")`).parent().html()
        let res = null
        if(descrRoot){
            const regexp = new RegExp(`${scenarios[i].trim()}:*\s*(?:<[^>]+>\s*)*\s*([^<]+)`)
            res = descrRoot.match(regexp)
        }
        if(res){
            filmInfo = res[1].trim()
        }
    }
    return filmInfo
}


const addFullInfo = async (list:ITorrent[]):Promise<ITorrent[]> => {
    const listWithPosters:ITorrent[] = []
    for(let i in list){
        const url = list[i].torrentLink
        if(!url && url.length === 0){
            listWithPosters.push(list[i])
        }else{
            const {data} = await axios.get('https://rutor.info' + url)
            const $2 = cheerio.load(data)
            const imgUrl = $2('#details tbody tr').eq(0).find('td').eq(1).find('img').attr('src')
            const getJenresArr = (elem) => {
                if($2(elem).next().prop('tagName') === 'A'){
                    return [$2(elem).text().trim()].concat(getJenresArr($2(elem).next()))
                }
                else{
                    return [$2(elem).text().trim()]
                } 
            }
            const jenres = getJenresArr($2('b:contains("Жанр")')).slice(1)
            const movieDescr = await getMovieInfoByScenarios(data,['Описание','О фильме'])
            const movieActors = await getMovieInfoByScenarios(data,['Актеры','В ролях'])
            const releaseYear = await getMovieInfoByScenarios(data,['Год выхода','Год выпуска'])
            const form = await getMovieInfoByScenarios(data,['Формат'])
            const substring = ['Matroska','mkv','Матроска']
            const f = $2('body').text().toUpperCase().includes('MKV') || $2('body').text().toLowerCase().includes('matroska') || $2('body').text().toLowerCase().includes('матроска');
            // && substring.some(substring => form.includes(substring))
            
            if(imgUrl  && f){
                listWithPosters.push({...list[i],poster:imgUrl,jenres:jenres,description:movieDescr,actors:movieActors,release:releaseYear})
            }else{
                
            }
            
        }
    }
    return listWithPosters
}
const ser = async (page:number) => {
    await connectDB()
    
    const html = await fetchPage(page)
    const $ = cheerio.load(html)
    const table = $('#index table tbody tr') 
    const rows:ITorrent[] = []

    table.each((index,elem) => {
        if(index === 0){
            return
        }
        const mainInfo = $(elem).find('td').eq(1)
        let sizeInfo = $(elem).find('td').eq(2).text()
        if ($(elem).find('td').eq(2).find('img').length > 0) {
            sizeInfo = $(elem).find('td').eq(3).text()
        }

        const magnet_dirty = $(mainInfo).find('a').eq(1).attr('href')
        const urlParams = new URLSearchParams(magnet_dirty.split('?')[1]);
        const magnet = urlParams.get('xt').split(':').pop();

        const title = $(mainInfo).find('a').eq(2).text()
        const torrentLink = $(mainInfo).find('a').eq(2).attr('href')
        const size = parseSize(sizeInfo)
        let shortTitle = title.split('/')[0] || ''
        rows.push({
            title:shortTitle,
            size:size,
            magnet:magnet,
            torrentLink:torrentLink,
            poster:'',
            jenres:[],
            description:'',
            release:'',
            actors:''
        })
    })

    const filteredTorrents:ITorrent[] = rows
    const movies = await addFullInfo(filteredTorrents)

    for(let i in movies){
        try{
            const elem = movies[i]
            const movie = new Movie({
                size:elem.size,
                title:elem.title,
                poster:elem.poster,
                magnet:elem.magnet,
                jenres:elem.jenres,
                description:elem.description,
                release:elem.release,
                actors:elem.actors
            })
            const save = await movie.save()
            console.log('Succesfuly saved')
        }catch(e){
            'Error saving'
        }
    }
}
const start = async (start:number,end:number) => {
    for(let i = start; i < end; i++){
        await ser(i)
    }
}
start(1,2)
