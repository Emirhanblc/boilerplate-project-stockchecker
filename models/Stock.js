const mongoose = require('mongoose');

const StockSchema = new mongoose.Schema({
  stock: { type: String, required: true, uppercase: true },
  likes: { type: [String], default: [] } // Hash'lenmiş IP adresleri dizisi
});

module.exports = mongoose.model('Stock', StockSchema);