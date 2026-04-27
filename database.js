require('dotenv').config();

const { Sequelize } = require('sequelize');



const sequelize = new Sequelize(

    process.env.DB_NAME,

    process.env.DB_USER,

    process.env.DB_PASS,

    {

        host: 'localhost',

        port: 56719,

        dialect: 'mssql',

        dialectOptions: {

            options: {

                trustServerCertificate: true,

                encrypt: false,

                connectTimeout: 30000

            }

        },

        logging: false

    }

);



module.exports = sequelize;