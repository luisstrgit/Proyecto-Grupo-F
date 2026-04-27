const LeadRepository = require('../repositories/LeadRepository');
const Lead = require('../models/Lead');
const sequelize = require('../database');

describe('Pruebas CRUD - FocusCRM Final', () => {
    beforeAll(async () => { 
        await sequelize.sync(); 
    });
    afterAll(async () => { 
        await sequelize.close(); 
    });

    test('Debe insertar un registro básico', async () => {
        // Limpiamos primero por seguridad
        await Lead.destroy({ where: { nombre: "Test" } });

        const datosLead = {
            nombre: "Luis Miguel",
            dni: "65465465", // Asegúrate que este campo exista en tu tabla
            interes: "alto",
            telefono: "9888899888",
            canalIngreso: "virtual"
        };

        const creado = await LeadRepository.crear(datosLead);
        expect(creado.id).toBeDefined();
        
        // Limpieza final
       // await Lead.destroy({ where: { id: creado.id } });
    });
});