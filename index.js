import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import ejs from "ejs";
import { dirname } from "path";
import { fileURLToPath } from "url";
const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

app.get("/", (req, res) => {
    res.redirect("/register");
});

app.get("/register", (req, res) => {
    res.sendFile(__dirname + "/public/register.html");
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
