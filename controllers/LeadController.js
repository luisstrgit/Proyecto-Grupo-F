const LeadService = require('../services/LeadService');

const crearLead = async (req, res) => {
    try {
        const nuevoLead = await LeadService.registrarNuevoLead(req.body);
        // Nuestro servidor responde con 201 Created si todo sale bien
        res.status(201).json(nuevoLead);
    } catch (error) {
        // Respondemos con 400 Bad Request si la validación falla (ej. falta DNI)
        res.status(400).json({ error: error.message });
    }
};

const obtenerLeads = async (req, res) => {
    try {
        const leads = await LeadService.listarLeads();
        res.status(200).json(leads);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const actualizarLead = async (req, res) => {
    try {
        const leadActualizado = await LeadService.actualizarLead(req.params.id, req.body);
        res.status(200).json(leadActualizado);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

module.exports = { crearLead, obtenerLeads, actualizarLead };