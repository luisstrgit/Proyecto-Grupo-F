const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const Lead = sequelize.define('Lead', {
    nombre: { type: DataTypes.STRING, allowNull: false },
    dni: { type: DataTypes.STRING, unique: true, allowNull: false },
    telefono: { type: DataTypes.STRING },
    correo: { type: DataTypes.STRING },
    canalIngreso: { type: DataTypes.STRING },
    interes: { type: DataTypes.STRING },
    proximaLlamada: { type: DataTypes.DATE },
    enFicha: { type: DataTypes.BOOLEAN, defaultValue: false },
    producto: { type: DataTypes.STRING },
    precio: { type: DataTypes.STRING },
    fechaPago: { type: DataTypes.DATE },
    descalificado: { type: DataTypes.BOOLEAN, defaultValue: false }
}, {
    tableName: 'Leads',
    timestamps: false // 🚩 CAMBIA ESTO A FALSE
});

module.exports = Lead;