const express = require('express');
const mongoose = require('mongoose');
const Joi = require('joi');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const Order = require('../models/Order');
const Item = require('../models/Item');  // Model przedmiotu
const User = require('../models/User');

dotenv.config();
const router = express.Router();

// 📌 Sekret dla JWT
const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";

// 📌 Middleware autoryzacji (ochrona tras)
const authenticate = (req, res, next) => {
    const token = req.header('Authorization');
    if (!token) return res.status(401).json({ message: 'Brak tokenu, autoryzacja odmówiona' });

    try {
        const decoded = jwt.verify(token.replace('Bearer ', ''), JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ message: 'Nieprawidłowy token' });
    }
};

// 📌 Middleware sprawdzania roli admina
const isAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Brak uprawnień (tylko admin)' });
    }
    next();
};

// 📌 Schemat walidacji zamówienia
const orderSchema = Joi.object({
    userId: Joi.string().required(),
    items: Joi.array().items(Joi.object({
        itemId: Joi.string().required(),      // Przedmiot
        quantity: Joi.number().min(1).required()  // Ilość przedmiotu
    })).min(1).required(),
    amount: Joi.number().min(1).required(),
    status: Joi.string().valid('pending', 'shipped', 'delivered').default('pending')
});

// 📌 1️⃣ Pobranie wszystkich zamówień (admin - wszystkie, użytkownik - tylko swoje)
router.get('/', authenticate, async (req, res, next) => {
    try {
        const orders = req.user.role === 'admin'
            ? await Order.find().populate('userId', 'firstName lastName email').populate('items.itemId')
            : await Order.find({ userId: req.user.id }).populate('userId', 'firstName lastName email').populate('items.itemId');
        res.json(orders);
    } catch (err) {
        next(err);
    }
});

// 📌 2️⃣ Pobranie zamówienia po ID (admin - wszystko, użytkownik - tylko swoje)
router.get('/:id', authenticate, async (req, res, next) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: "Nieprawidłowy identyfikator zamówienia" });
        }

        const order = await Order.findById(req.params.id).populate('userId', 'firstName lastName email').populate('items.itemId');
        if (!order) return res.status(404).json({ message: 'Zamówienie nie znalezione' });

        if (req.user.role !== 'admin' && order.userId.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Brak uprawnień do tego zamówienia' });
        }

        res.json(order);
    } catch (err) {
        next(err);
    }
});

// 📌 3️⃣ Dodanie nowego zamówienia (tylko użytkownicy)
router.post('/', authenticate, async (req, res, next) => {
    try {
        const { error } = orderSchema.validate(req.body);
        if (error) return res.status(400).json({ message: error.details[0].message });

        // Sprawdzenie, czy użytkownik istnieje
        const user = await User.findById(req.body.userId);
        if (!user) return res.status(404).json({ message: 'Użytkownik nie znaleziony' });

        // Użytkownik może tylko tworzyć zamówienia dla siebie
        if (req.body.userId !== req.user.id) {
            return res.status(403).json({ message: 'Możesz tworzyć zamówienia tylko dla siebie' });
        }

        // Sprawdzenie dostępności przedmiotów i aktualizacja stanu magazynowego
        let totalAmount = 0;
        for (let i = 0; i < req.body.items.length; i++) {
            const item = await Item.findById(req.body.items[i].itemId);
            if (!item) return res.status(404).json({ message: 'Przedmiot nie znaleziony' });

            if (item.stock < req.body.items[i].quantity) {
                return res.status(400).json({ message: `Brak wystarczającej ilości przedmiotu ${item.name}` });
            }

            totalAmount += item.price * req.body.items[i].quantity;

            // Zmniejszenie stanu magazynowego przedmiotu
            item.stock -= req.body.items[i].quantity;
            await item.save();
        }

        // Tworzenie nowego zamówienia
        const newOrder = new Order({
            userId: req.body.userId,
            items: req.body.items,
            amount: totalAmount
        });

        await newOrder.save();
        res.status(201).json(newOrder);
    } catch (err) {
        next(err);
    }
});

// 📌 4️⃣ Aktualizacja zamówienia (admin - wszystko, użytkownik - tylko swoje)
router.put('/:id', authenticate, async (req, res, next) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: "Nieprawidłowy identyfikator zamówienia" });
        }

        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ message: 'Zamówienie nie znalezione' });

        if (req.user.role !== 'admin' && order.userId.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Brak uprawnień do edycji tego zamówienia' });
        }

        const updatedOrder = await Order.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(updatedOrder);
    } catch (err) {
        next(err);
    }
});

// 📌 5️⃣ Usunięcie zamówienia (admin - wszystko, użytkownik - tylko swoje)
router.delete('/:id', authenticate, async (req, res, next) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: "Nieprawidłowy identyfikator zamówienia" });
        }

        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ message: 'Zamówienie nie znalezione' });

        if (req.user.role !== 'admin' && order.userId.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Brak uprawnień do usunięcia tego zamówienia' });
        }

        await Order.findByIdAndDelete(req.params.id);
        res.json({ message: 'Zamówienie usunięte' });
    } catch (err) {
        next(err);
    }
});

module.exports = router;