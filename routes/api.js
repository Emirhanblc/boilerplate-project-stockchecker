'use strict';
const crypto = require('crypto');
const Stock = require('../models/Stock');

// 1. IP Adresini Hash'leme (Gizlilik & KVKK uyumu: IP açık metin tutulmaz)
function hashIP(ip) {
  return crypto.createHash('sha256').update(ip || '0.0.0.0').digest('hex');
}

// 2. freeCodeCamp Borsa Proxy API'sinden anlık veri çekme
async function getStockQuote(symbol) {
  const url = `https://stock-price-checker-proxy.freecodecamp.rocks/v1/stock/${symbol}/quote`;
  const response = await fetch(url);
  const data = await response.json();

  const currentPrice = data.latestPrice !== undefined
    ? data.latestPrice
    : (data.price !== undefined ? data.price : 0);

  return {
    stock: data.symbol || symbol.toUpperCase(),
    price: currentPrice
  };
}

// 3. Veritabanından hisseyi bulma, like ekleme ve toplam beğeni sayısını döndürme
async function handleStockData(symbol, like, clientIP) {
  symbol = symbol.toUpperCase();
  let stockRecord = await Stock.findOne({ stock: symbol });

  if (!stockRecord) {
    stockRecord = new Stock({ stock: symbol, likes: [] });
  }

  // Eğer like=true geldiyse ve bu IP daha önce beğenmediyse ekle
  if (like === 'true' || like === true) {
    const hashedIP = hashIP(clientIP);
    if (!stockRecord.likes.includes(hashedIP)) {
      stockRecord.likes.push(hashedIP);
    }
  }

  await stockRecord.save();
  return stockRecord.likes.length;
}

module.exports = function (app) {
  app.route('/api/stock-prices').get(async function (req, res) {
    try {
      const { stock, like } = req.query;
      const clientIP = req.ip || req.headers['x-forwarded-for'];

      // Senaryo 1: Tek Hisse Sorgusu (örn: ?stock=GOOG)
      if (typeof stock === 'string') {
        const quote = await getStockQuote(stock);
        const totalLikes = await handleStockData(stock, like, clientIP);

        return res.json({
          stockData: {
            stock: quote.stock,
            price: quote.price,
            likes: totalLikes
          }
        });
      }

      // Senaryo 2: İki Hisse Karşılaştırması (örn: ?stock=GOOG&stock=MSFT)
      if (Array.isArray(stock) && stock.length === 2) {
        const [quote1, quote2] = await Promise.all([
          getStockQuote(stock[0]),
          getStockQuote(stock[1])
        ]);

        const [likes1, likes2] = await Promise.all([
          handleStockData(stock[0], like, clientIP),
          handleStockData(stock[1], like, clientIP)
        ]);

        return res.json({
          stockData: [
            { stock: quote1.stock, price: quote1.price, rel_likes: likes1 - likes2 },
            { stock: quote2.stock, price: quote2.price, rel_likes: likes2 - likes1 }
          ]
        });
      }

      return res.status(400).json({ error: 'Geçersiz sorgu parametresi' });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Sunucu veya harici API hatası' });
    }
  });
};