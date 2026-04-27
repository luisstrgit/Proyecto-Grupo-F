const LeadRepository = require('../repositories/LeadRepository');

class LeadService {
    async registrarNuevoLead(datos) {
        // Regla de negocio de nuestro equipo: Nombre y DNI son obligatorios
        if (!datos.nombre || !datos.dni) {
            throw new Error("El Nombre y el DNI son obligatorios en nuestro FocusCRM");
        }
        
        // Si desde el Frontend no nos envían fecha de próxima llamada, asignamos la de mañana
        if (!datos.proximaLlamada) {
            const manana = new Date();
            manana.setDate(manana.getDate() + 1);
            datos.proximaLlamada = manana.toISOString().split('T')[0];
        }

        return await LeadRepository.crear(datos);
    }

    async listarLeads() {
        return await LeadRepository.obtenerTodos();
    }

    async actualizarLead(id, datos) {
        return await LeadRepository.actualizar(id, datos);
    }
}

module.exports = new LeadService();