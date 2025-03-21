import axios from "axios";


export async function fetchPage(page:number) {
    try {
      // Загружаем HTML страницы
      const url = `https://rutor.info/browse/${page}/1/0/0`
      const {data} = await axios.get(url);
      return data;
    } catch (error) {
      console.error('Ошибка загрузки страницы:', error);
      return null
    }
  }