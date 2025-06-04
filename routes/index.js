import { Router } from "express";
import bcrypt from "bcrypt";
import getConnection from '../config/mysql.js';
import jwt from "jsonwebtoken";


const router = Router();

router.get('/', async (req, res) => {
    let connection;
    try {
        connection = await getConnection();
        const [rows] = await connection.query(`
            SELECT 
                m.nombre,
                m.foto,
                c.fecha ,
                c.motivo
            FROM cita c
            JOIN Expediente e ON c.idExpediente = e.id
            JOIN Mascota m ON e.idMascota = m.id
        `);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    } finally {
        if (connection) connection.release();
    }

});
router.get('/formMAscota/especie', async (req, res) => {
    let connection;
    try {
        connection = await getConnection();
        const [rows] = await connection.query(`
            SELECT 
                *
            FROM especie
        `);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    } finally {
        if (connection) connection.release();
    }
});

router.get('/formMAscota/raza/:especieId', async (req, res) => {
    let connection;
    try {
        connection = await getConnection();
        const [rows] = await connection.query(`
            SELECT * 
            FROM raza 
            WHERE idEspecie = ?
        `, [req.params.especieId]);

        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    } finally {
        if (connection) connection.release();
    }
});

router.get('/formMAscota/estados', async (req, res) => {
    let connection;
    try {
        connection = await getConnection();
        const [rows] = await connection.query(`SELECT * FROM estado`);

        if (!rows || rows.length === 0) {
            return res.status(404).json({ message: "No se encontraron estados" });
        }

        res.json(rows);
    } catch (error) {
        console.error("Error en /formMAscota/estados:", error);
        res.status(500).json({
            error: error.message,
            details: error
        });
    } finally {
        if (connection) connection.release();
    }
});
router.get('/formMAscota/municipios/:estadoId', async (req, res) => {
    let connection;
    try {
        connection = await getConnection();
        const [rows] = await connection.query(`
            SELECT * 
            FROM municipio 
            WHERE idEstado = ?
        `, [req.params.estadoId]);

        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    } finally {
        if (connection) connection.release();
    }
});

router.get('/formMAscota/colonias/:municipioId', async (req, res) => {
    let connection;
    try {
        connection = await getConnection();
        const [rows] = await connection.query(`
            SELECT * 
            FROM colonia 
            WHERE idMunicipio = ?
        `, [req.params.municipioId]);

        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    } finally {
        if (connection) connection.release();
    }
});
router.get('/formMAscota/cliente/:curp', async (req, res) => {
    let connection;
    try {
        connection = await getConnection();
        const [rows] = await connection.query(`
            SELECT 1 FROM cliente WHERE curp = ? LIMIT 1
        `, [req.params.curp]);

        res.json({ existe: rows.length > 0 });
    } catch (error) {
        res.status(500).json({ error: error.message });
    } finally {
        if (connection) connection.release();
    }
});


router.post("/formMAscota/registro", async (req, res) => {
    let connection;
    try {
        connection = await getConnection();
        await connection.beginTransaction();

        const curp = req.body.curpRegistrado || req.body.Curp;

        if (req.body.curpRegistrado) {
            const [mascotaResult] = await connection.query(`
                INSERT INTO mascota (nombre, raza, fechaNacimineto, idDuenio, foto, peso, sexo)
                VALUES (?, ?, ?, ?, ?, ?, ?);
            `, [req.body.nombreMascota, req.body.raza, req.body.fecha, curp, req.body.nombreImagen, req.body.peso, req.body.Sexo]);

            const idMascota = mascotaResult.insertId;

            await connection.query(`
                INSERT INTO expediente (idMascota, descripcion, fecha_creacion)
                VALUES (?, ?, CURRENT_DATE());
            `, [idMascota, req.body.detalles]);

            await connection.commit();
            return res.json({ mensaje: "Mascota registrada exitosamente", idMascota });
        }

        const saltRounds = 8;
        const hashedPassword = await bcrypt.hash(req.body.password, saltRounds);

        const [personaResult] = await connection.query(`
            INSERT INTO persona (nombre, apellidoPaterno, apellidoMaterno, telefono)
            VALUES (?, ?, ?, ?);
        `, [req.body.nombre, req.body.apellidoP, req.body.ApellidoM, req.body.Telefono]);
        const idPersona = personaResult.insertId;

        const [direccionResult] = await connection.query(`
            INSERT INTO direccion (calle, numeroExterior, idColonia, numeroInterior, codigoPostal, referencias)
            VALUES (?, ?, ?, ?, ?, ?);
        `, [req.body.Calle, req.body.numero, req.body.Colonia, req.body.numeroInt, req.body.cp, req.body.referencias]);
        const idDireccion = direccionResult.insertId;

        const [usuarioResult] = await connection.query(`
            INSERT INTO usuario (email, username, password, idperfil)
            VALUES (?, ?, ?, ?);
        `, [req.body.Email, req.body.username, hashedPassword, 2]);
        const idUsuario = usuarioResult.insertId;

        const [clienteResult] = await connection.query(`
            INSERT INTO cliente (curp, idDireccion, idPersona, idEmpresa, idUsuario)
            VALUES (?, ?, ?, ?, ?);
        `, [curp, idDireccion, idPersona, 1, idUsuario]);
        const idDuenio = clienteResult.insertId;

        const [mascotaResult] = await connection.query(`
            INSERT INTO mascota (nombre, raza, fechaNacimineto, idDuenio, foto, peso, sexo)
            VALUES (?, ?, ?, ?, ?, ?, ?);
        `, [req.body.nombreMascota, req.body.raza, req.body.fecha, idDuenio, req.body.nombreImagen, req.body.peso, req.body.Sexo]);

        const idMascota = mascotaResult.insertId;

        await connection.query(`
            INSERT INTO expediente (idMascota, descripcion, fecha_creacion)
            VALUES (?, ?, CURRENT_DATE());
        `, [idMascota, req.body.detalles]);

        await connection.commit();
        res.json({ mensaje: "Registro exitoso", nombreImagen: req.body.nombreImagen, idMascota });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error("Error en el registro:", error);
        res.status(500).json({ error: "Error interno del servidor." });
    } finally {
        if (connection) connection.release();
    }
});

router.get("/mascotas/listado", async (req, res) => {
    let connection;
    try {
        connection = await getConnection();
        const [rows] = await connection.query(`
            SELECT 
                m.id, m.nombre AS nombreMascota, 
                e.nombre AS especie, r.nombre AS raza, 
                YEAR(CURDATE()) - YEAR(m.fechaNacimineto) AS edad, 
                m.peso, m.sexo, p.nombre AS duenioNombre
            FROM mascota m
            JOIN raza r ON m.raza = r.id
            JOIN especie e ON r.idEspecie = e.id
            JOIN cliente c ON m.idDuenio = c.curp
            JOIN persona p ON c.idPersona = p.id
        `);

        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    } finally {
        if (connection) connection.release();
    }
});


router.get("/mascotas/detalle/:id", async (req, res) => {
    let connection;
    try {
        connection = await getConnection();
        const [rows] = await connection.query(`
            SELECT 
                m.nombre AS nombreMascota, 
                m.foto, 
                e.nombre AS especie, 
                r.nombre AS raza, 
                YEAR(CURDATE()) - YEAR(m.fechaNacimineto) AS edad, 
                m.peso, 
                m.sexo, 
                p.nombre AS duenioNombre, 
                p.telefono
            FROM mascota m
            JOIN raza r ON m.raza = r.id
            JOIN especie e ON r.idEspecie = e.id
            JOIN cliente c ON m.idDuenio = c.curp
            JOIN persona p ON c.idPersona = p.id
            WHERE m.id = ?;
        `, [req.params.id]);

        if (rows.length === 0) {
            return res.status(404).json({ error: "Mascota no encontrada" });
        }

        res.json(rows[0]); // 🔹 Enviar los datos de la mascota
    } catch (error) {
        res.status(500).json({ error: error.message });
    } finally {
        if (connection) connection.release();
    }
});

router.get("/mascotas/ultimaCons/:idMascota", async (req, res) => {
    let connection;
    try {
        connection = await getConnection();
        const [rows] = await connection.query(`
            SELECT 
                c.fecha AS ultimaConsulta
            FROM cita c
            LEFT JOIN consulta cons ON c.id = cons.idCita
            LEFT JOIN expediente exp ON c.idExpediente = exp.id
            WHERE exp.idMascota = ?
            ORDER BY c.fecha DESC
            LIMIT 1;
        `, [req.params.idMascota]);

        if (rows.length === 0) {
            return res.status(404).json({ error: "Historial no encontrado" });
        }

        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    } finally {
        if (connection) connection.release();
    }
});

router.get("/enfermedad/cronica/:idMascota", async (req, res) => {
    let connection;
    try {
        connection = await getConnection();
        const [rows] = await connection.query(`
            SELECT  e.nombre AS enfermedad
            FROM enfermedad e
            JOIN consulta cons ON e.idConsulta = cons.id
            JOIN cita c ON cons.idCita = c.id
            WHERE c.idExpediente = (
                SELECT id FROM expediente WHERE idMascota = ?
            ) AND e.estatus = 1;
        `, [req.params.idMascota]);

        if (!rows.length) {
            return res.status(404).json({ error: "No hay enfermedades activas registradas para esta mascota." });
        }

        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    } finally {
        if (connection) connection.release();
    }
});

router.get("/mascotas/vacuna/:idMascota", async (req, res) => {
    let connection;
    try {
        connection = await getConnection();
        const [rows] = await connection.query(`
            SELECT nombreVac AS nombre, fechaAplicion AS fecha, fechaProx AS proxima_dosis, laboratorio AS lab
            FROM vacuna
            WHERE idExpediente = (
                SELECT id FROM expediente WHERE idMascota = ?
            )
            ORDER BY fechaAplicion DESC
            LIMIT 1;
        `, [req.params.idMascota]);

        if (!rows.length) {
            return res.status(404).json({ error: "No hay vacunas registradas para esta mascota." });
        }

        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    } finally {
        if (connection) connection.release();
    }
});

router.get("/mascotas/desparasitacion/:idMascota", async (req, res) => {
    let connection;
    try {
        connection = await getConnection();
        const [rows] = await connection.query(`
            SELECT medicamento, fechaAplicacion AS fecha, fechaProx AS proxima_dosis, s.nombre as tipo
            FROM desparacitacion
            join tipodes s on idTipoDes = s.id
            WHERE idExpediente = (
                SELECT id FROM expediente WHERE idMascota = ?
            )
            ORDER BY fechaAplicacion DESC
            LIMIT 1;
        `, [req.params.idMascota]);

        if (!rows.length) {
            return res.status(404).json({ error: "No hay registros de desparasitación para esta mascota." });
        }

        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    } finally {
        if (connection) connection.release();
    }
});

router.get("/mascotas/vacunas/:idMascota", async (req, res) => {
    let connection;
    try {
        connection = await getConnection();
        const [rows] = await connection.query(`
            SELECT nombreVac, fechaAplicion AS fecha, fechaProx AS proxima_dosis, lote, laboratorio, notas
            FROM vacuna
            WHERE idExpediente = (
                SELECT id FROM expediente WHERE idMascota = ?
            )
            ORDER BY fechaAplicion DESC;
        `, [req.params.idMascota]);

        if (!rows.length) {
            return res.status(404).json({ error: "No hay vacunas registradas para esta mascota." });
        }

        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    } finally {
        if (connection) connection.release();
    }
});

router.get("/mascotas/desparasitaciones/:idMascota", async (req, res) => {
    let connection;
    try {
        connection = await getConnection();
        const [rows] = await connection.query(`
            SELECT medicamento, fechaAplicacion AS fecha, fechaProx AS proxima_dosis, s.nombre as tipo, lote, notas
            FROM desparacitacion
            join tipodes s on idTipoDes = s.id
            WHERE idExpediente = (
                SELECT id FROM expediente WHERE idMascota = 1
            )
            ORDER BY fechaAplicacion DESC;
        `, [req.params.idMascota]);

        if (!rows.length) {
            return res.status(404).json({ error: "No hay registros de desparasitación para esta mascota." });
        }

        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    } finally {
        if (connection) connection.release();
    }
});

router.post("/login", async (req, res) => {
    let connection;
    try {
        const { email, password } = req.body;
        connection = await getConnection();
        
        const [rows] = await connection.query(`
            SELECT id, email, password, idperfil FROM usuario WHERE email = ?
        `, [email]);

        if (rows.length === 0) {
            return res.status(401).json({ message: "Usuario no encontrado" });
        }

        const user = rows[0];

        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.status(401).json({ message: "Contraseña incorrecta" });
        }

        // Generar JWT token con el idperfil
        const token = jwt.sign(
            { id: user.id, email: user.email, idperfil: user.idperfil },
            "your_secret_key", 
            { expiresIn: "1h" }
        );

        res.json({ token });
    } catch (error) {
        console.error("Error en login:", error);
        res.status(500).json({ error: "Error interno del servidor." });
    } finally {
        if (connection) connection.release();
    }
});

export default router;