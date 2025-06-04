import express from "express";
import { dirname, join } from 'path';
import { fileURLToPath } from "url";
import indexRoutes from './routes/index.js'
import morgan from 'morgan';
import cors from 'cors';



const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


const __dirname = dirname(fileURLToPath(import.meta.url));

app.use(morgan('dev'));
app.use(cors(
    {
        origin:['http://127.0.0.1:4000','http://localhost:4000']
    }
))

app.use(indexRoutes);

app.listen(3000);
console.log('Server is listening on port', 3000);