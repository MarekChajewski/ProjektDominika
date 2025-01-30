const mongoose = require('mongoose');

const ItemSchema = new mongoose.Schema({
    name: { type: String, required: true },        // Nazwa przedmiotu
    price: { type: Number, required: true },       // Cena przedmiotu
    description: { type: String },                 // Opis przedmiotu (opcjonalnie)
    stock: { type: Number, required: true },       // Ilość dostępnych sztuk
}, { timestamps: true });

module.exports = mongoose.model('Item', ItemSchema);