const db = require('../database');

test('Verificar conexión con SQL Server', async () => {
    try {
        await db.authenticate();
        expect(true).toBe(true);
    } catch (error) {
        throw new Error('Error de conexión: ' + error.message);
    }
});