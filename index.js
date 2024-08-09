import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import ejs from "ejs";
import env from "dotenv";
import bcrypt from "bcrypt";

import { dirname } from "path";
import { fileURLToPath } from "url";
const __dirname = dirname(fileURLToPath(import.meta.url));


const app = express();
const port = 3000;
const saltRounds = 12;
env.config();

const db = new pg.Client({
    user: process.env.USER_NAME,
    host: process.env.HOST,
    database: process.env.DATABASE,
    password: process.env.DBPASSWORD,
    port: process.env.DBPORT,
});
db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

app.get("/", (req, res) => {
    res.redirect("/register");
});

app.get("/register", (req, res) => {
    res.sendFile(__dirname + "/public/register.html");
});

app.post("/register", async (req, res) => {
    const username = req.body.username;
    const email = req.body.email;
    const password = req.body.password;

    try {
        const emailCheck = await db.query("SELECT * FROM users WHERE email = $1", [email]);
        if (emailCheck.rows.length > 0) {
            res.send("Email already exists!");
        } else {
            bcrypt.hash(password, saltRounds, async (err, hash) => {
                if(err) {
                    console.log("Some errors while hashing: " + err);
                } else {
                    await db.query("INSERT INTO users (username, email, password) VALUES ($1 ,$2 ,$3)", [username, email, hash]);
                    res.send("Register başarılı");
                }
            })
        }
    } catch (error) {
        console.log(err);
    }
})

app.get("/login", (req, res) => {
    res.sendFile(__dirname + "/public/login.html");
})

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
