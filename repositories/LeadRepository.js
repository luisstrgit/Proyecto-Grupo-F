const Lead = require('../models/Lead');

class LeadRepository {
    // Guardamos un nuevo lead en nuestra base de datos FocusCRM
    async crear(datos) {
        return await Lead.create(datos);
    }

    // Traemos todos los leads (para cargar nuestra tabla principal del HTML)
    async obtenerTodos() {
        return await Lead.findAll();
    }

    // Actualizamos datos (Ej: cuando cambiamos el interés o lo pasamos a ficha)
    async actualizar(id, datos) {
        await Lead.update(datos, { where: { id: id } });
        return await Lead.findByPk(id);
    }
}

module.exports = new LeadRepository();