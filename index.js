import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import ejs from "ejs";
import env from "dotenv";
import bcrypt from "bcrypt";

import { dirname } from "path";
import { fileURLToPath } from "url";
const __dirname = dirname(fileURLToPath(import.meta.url));

env.config();
const app = express();
const port = 3000;
const saltRounds = parseInt(process.env.SALTROUNDS);


let user = "";
let blogs = []

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
    if(user) {
        res.redirect("/blogs");
    } else {
        res.sendFile(__dirname + "/public/register.html");
    }
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
});

app.get("/login", (req, res) => {
    if(user) {
        res.redirect("/blogs");
    } else {
        res.sendFile(__dirname + "/public/login.html");
    }
});

app.post("/login", async(req, res) => {
    const email = req.body.email;
    const password = req.body.password;

    try {
        const emailCheck = await db.query("SELECT * FROM users WHERE email = $1", [email]);
        if (emailCheck.rows.length === 0) {
            res.send("User does not exist. Please register!");
        } else {
            const result = await db.query("SELECT * FROM users WHERE email = $1", [email]);
            user = result.rows[0]
            const hash = user.password;
            
            bcrypt.compare(password, hash, (err, result) => {
                if(err) {
                    console.log("Error while comparing passwords: " + err);
                } else {
                    if(result) {
                        res.redirect("/blogs");
                    } else {
                        user = "";
                        res.redirect("/login");
                    }
                }
            })
        }
    } catch (err) {
        console.log("Some server side error: " + err);
    }
});

app.get("/blogs", async (req, res) => {
    if(user) {
        const blogs = await db.query("SELECT * FROM blogs");

        res.render("blogs.ejs", {DATA: blogs.rows, USERNAME: user.username});
    } else {
        res.redirect("/login");
    }
});

app.get("/logout", (req, res) => {
    user = "";
    res.redirect("/login");
})

app.get("/create", (req, res) => {
    res.sendFile(__dirname + "/public/new.html");
});

app.post("/create", async (req, res) => {
    const title = req.body.title;
    const content = req.body.content;

    await db.query("INSERT INTO blogs (user_id, username, content, title) VALUES ($1, $2, $3, $4)", 
        [user.id, user.username, content, title]
    );

    res.redirect("/blogs");
})

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
