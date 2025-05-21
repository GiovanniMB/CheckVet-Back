import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const pool = mysql.createPool(
{
  host: process.env.host,
  database: process.env.database,
  user: process.env.user,
  password: process.env.password,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});


const getConnection = async () => 
{
  try 
  {
    const connection = await pool.getConnection();
    return connection;
  } catch (error) 
  {
    throw error; 
  }
};

export default getConnection;