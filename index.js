const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv'); // Wczytywanie zmiennych środowiskowych
const userRoutes = require('./routes/users');  // Trasy użytkowników
const orderRoutes = require('./routes/orders'); // Trasy zamówień
const itemRoutes = require('./routes/items');  // Trasy przedmiotów

dotenv.config(); // Załaduj zmienne z pliku .env

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/zadanie-api';

// 📌 Sprawdzenie, czy zmienne środowiskowe zostały załadowane poprawnie
if (!process.env.JWT_SECRET) {
    console.error("❌ Błąd: Brak JWT_SECRET w pliku .env");
    process.exit(1); // Zatrzymujemy serwer, jeśli nie ma kluczowej zmiennej
}

// 📌 Połączenie z MongoDB
mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => {
        console.error('❌ MongoDB connection error:', err.message);
        process.exit(1);
    });

// 📌 Middleware
app.use(cors()); // Obsługa CORS (umożliwia dostęp API z innych domen)
app.use(express.json()); // Obsługa JSON w requestach

// 📌 Rejestracja tras API
app.use('/api/users', userRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/items', itemRoutes);  // Dodano trasy przedmiotów

// 📌 Logowanie dostępnych tras
console.log("✅ Dostępne trasy API:");
console.log("👉 POST    /api/users/register  - Rejestracja użytkownika");
console.log("👉 POST    /api/users/login     - Logowanie użytkownika");
console.log("👉 GET     /api/users           - Pobierz wszystkich użytkowników (admin)");
console.log("👉 GET     /api/users/:id       - Pobierz użytkownika po ID");
console.log("👉 PUT     /api/users/:id       - Aktualizuj użytkownika");
console.log("👉 DELETE  /api/users/:id       - Usuń użytkownika");
console.log("👉 POST    /api/orders          - Dodaj zamówienie");
console.log("👉 GET     /api/orders          - Pobierz wszystkie zamówienia");
console.log("👉 GET     /api/orders/:id      - Pobierz zamówienie po ID");
console.log("👉 PUT     /api/orders/:id      - Aktualizuj zamówienie");
console.log("👉 DELETE  /api/orders/:id      - Usuń zamówienie");
console.log("👉 POST    /api/items           - Dodaj przedmiot");
console.log("👉 GET     /api/items           - Pobierz wszystkie przedmioty");
console.log("👉 GET     /api/items/:id       - Pobierz przedmiot po ID");
console.log("👉 PUT     /api/items/:id       - Aktualizuj przedmiot");
console.log("👉 DELETE  /api/items/:id       - Usuń przedmiot");

// 📌 Obsługa nieznanych tras (404 Not Found)
app.use((req, res, next) => {
    res.status(404).json({ message: '❌ Trasa nie istnieje' });
});

// 📌 Globalna obsługa błędów
app.use((err, req, res, next) => {
    console.error('🔥 Błąd serwera:', err.message);
    res.status(err.status || 500).json({ message: err.message || 'Wewnętrzny błąd serwera' });
});

// 📌 Uruchomienie serwera
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
