const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },  // Powiązanie z użytkownikiem
    items: [
        {
            itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },  // Powiązanie z przedmiotem
            quantity: { type: Number, required: true } // Ilość zamówionych sztuk
        }
    ],
    amount: { type: Number, required: true },  // Kwota zamówienia
    status: { type: String, enum: ['pending', 'shipped', 'delivered'], default: 'pending' }  // Status zamówienia
}, { timestamps: true });

module.exports = mongoose.model('Order', OrderSchema);