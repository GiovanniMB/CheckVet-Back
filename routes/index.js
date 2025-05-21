import { Router } from "express";
import getConnection from '../config/mysql.js';

const router =Router();

router.get('/', async (req,res)=>
{
    let connection;
    try 
    {
        connection = await getConnection();
        const [rows] = await connection.query(`
            SELECT 
                m.nombre,
                m.foto,
                c.fecha ,
                c.motivo
            FROM citas c
            JOIN Expediente e ON c.expediente_id = e.id
            JOIN Mascota m ON e.idMascota = m.id
        `);
        res.json(rows);
    } catch (error) 
    {
        res.status(500).json({ error: error.message });
    } finally 
    {
        if (connection) connection.release();
    }

});

export default router;