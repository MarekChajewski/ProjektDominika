const express = require('express');
const Joi = require('joi');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const router = express.Router();
const User = require('../models/User');

dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";

// 📌 Schemat walidacji użytkownika
const userSchema = Joi.object({
    firstName: Joi.string().min(2).max(30).required(),
    lastName: Joi.string().min(2).max(30).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    role: Joi.string().valid('user', 'admin').optional() // 🔹 Walidacja ról
});

// 📌 Middleware autoryzacji JWT
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

// 📌 1️⃣ Pobranie wszystkich użytkowników (tylko admin)
router.get('/', authenticate, isAdmin, async (req, res, next) => {
    try {
        const users = await User.find().select('-password');
        res.json(users);
    } catch (error) {
        next(error);
    }
});

// 📌 2️⃣ Pobranie jednego użytkownika (admin lub właściciel konta)
router.get('/:id', authenticate, async (req, res, next) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: "Nieprawidłowy identyfikator użytkownika" });
        }

        const user = await User.findById(req.params.id).select('-password');
        if (!user) return res.status(404).json({ message: 'Użytkownik nie znaleziony' });

        if (req.user.id !== req.params.id && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Brak dostępu' });
        }

        res.json(user);
    } catch (error) {
        next(error);
    }
});

// 📌 3️⃣ Rejestracja użytkownika (brak haszowania hasła)
router.post('/register', async (req, res, next) => {
    try {
        const { error } = userSchema.validate(req.body);
        if (error) return res.status(400).json({ message: error.details[0].message });

        const { firstName, lastName, email, password, role } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ message: "Użytkownik z tym emailem już istnieje" });

        const newUser = new User({ firstName, lastName, email, password, role: role || 'user' });
        await newUser.save();

        res.status(201).json({ message: "Rejestracja zakończona sukcesem" });
    } catch (error) {
        next(error);
    }
});

// 📌 4️⃣ Logowanie użytkownika (sprawdzanie hasła bez haszowania)
router.post('/login', async (req, res, next) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: "Nieprawidłowy email lub hasło" });

        // 🔹 Sprawdzanie hasła bez haszowania
        if (user.password !== password) {
            return res.status(400).json({ message: "Nieprawidłowy email lub hasło" });
        }

        const token = jwt.sign({ id: user._id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '1h' });

        res.json({ token });
    } catch (error) {
        next(error);
    }
});

// 📌 5️⃣ Aktualizacja użytkownika (admin lub właściciel konta)
router.put('/:id', authenticate, async (req, res, next) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: "Nieprawidłowy identyfikator użytkownika" });
        }

        if (req.user.id !== req.params.id && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Brak uprawnień' });
        }

        const updatedUser = await User.findByIdAndUpdate(req.params.id, req.body, { new: true }).select('-password');
        res.json(updatedUser);
    } catch (error) {
        next(error);
    }
});

// 📌 6️⃣ Usunięcie użytkownika (tylko admin)
router.delete('/:id', authenticate, isAdmin, async (req, res, next) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: "Nieprawidłowy identyfikator użytkownika" });
        }

        const deletedUser = await User.findByIdAndDelete(req.params.id);
        if (!deletedUser) return res.status(404).json({ message: 'Użytkownik nie znaleziony' });

        res.json({ message: 'Użytkownik usunięty' });
    } catch (error) {
        next(error);
    }
});

module.exports = router;