const express = require('express');
const Item = require('../models/Item');  // Importujemy model przedmiotu
const router = express.Router();

// 🔹 Pobierz wszystkie przedmioty
router.get('/', async (req, res) => {
    try {
        const items = await Item.find();
        res.json(items);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// 🔹 Dodaj nowy przedmiot
router.post('/', async (req, res) => {
    const { name, price, description, stock } = req.body;
    const newItem = new Item({ name, price, description, stock });

    try {
        const savedItem = await newItem.save();
        res.status(201).json(savedItem);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// 🔹 Pobierz przedmiot po ID
router.get('/:id', async (req, res) => {
    try {
        const item = await Item.findById(req.params.id);
        if (!item) return res.status(404).json({ message: 'Przedmiot nie znaleziony' });
        res.json(item);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// 🔹 Zaktualizuj przedmiot
router.put('/:id', async (req, res) => {
    try {
        const updatedItem = await Item.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updatedItem) return res.status(404).json({ message: 'Przedmiot nie znaleziony' });
        res.json(updatedItem);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// 🔹 Usuń przedmiot
router.delete('/:id', async (req, res) => {
    try {
        const deletedItem = await Item.findByIdAndDelete(req.params.id);
        if (!deletedItem) return res.status(404).json({ message: 'Przedmiot nie znaleziony' });
        res.json({ message: 'Przedmiot usunięty' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;