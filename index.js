import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
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

// Redirecting to register page.
app.get("/", (req, res) => {
    res.redirect("/register");
});

app.get("/register", (req, res) => {
    if(user) { // If user has logged in,
        res.redirect("/Blogs");
    } else {
        res.render("register.ejs", {ERROR: "", USERNAME: "", EMAIL: ""});
    }
});

//Evaluating register post request.
app.post("/register", async (req, res) => {
    const username = req.body.username;
    const email = req.body.email;
    const password = req.body.password;

    try {
        const emailCheck = await db.query("SELECT * FROM users WHERE email = $1", [email]);
        if (emailCheck.rows.length > 0) {  // Checking that given email has already exist or not.
            res.render("register.ejs", {ERROR: "Email already exists!", USERNAME: username, EMAIL: ""});
        } else {
            const usernameCheck = await db.query("SELECT * FROM users WHERE username = $1", [username]);
            if(usernameCheck.rows.length > 0) { // Checking that given username has already exist or not.
                res.render("register.ejs", {ERROR: "Please choose another username.", USERNAME: "", EMAIL: email});
            } else { // If everything is true,
                bcrypt.hash(password, saltRounds, async (err, hash) => { // Hashing the givven password
                    if(err) {
                        console.log("Some errors while hashing: " + err);
                    } else {
                        await db.query("INSERT INTO users (username, email, password) VALUES ($1 ,$2 ,$3)", [username, email, hash]); // Storing the password in the database.
                        const result = await db.query("SELECT * FROM users WHERE email= $1", [email]);
                        user = result.rows[0];
                        res.redirect("/Blogs");
                    }
                })
            }
        }
    } catch (error) {
        console.log(err);
    }
});

app.get("/login", (req, res) => {
    if(user) { // If user has already logged in,
        res.redirect("/Blogs");
    } else {
        res.render("login.ejs", {ERROR: "", EMAIL: ""});
    }
});

// Evaluating the login post request.
app.post("/login", async(req, res) => {
    const email = req.body.email;
    const password = req.body.password;

    try {
        const emailCheck = await db.query("SELECT * FROM users WHERE email = $1", [email]);
        if (emailCheck.rows.length === 0) { // Checking that given email has exist or not.
            res.render("login.ejs", {ERROR: "User does not exist. Please register!", EMAIL:""});
        } else {
            const result = await db.query("SELECT * FROM users WHERE email = $1", [email]);
            user = result.rows[0]
            const hash = user.password;
            
            bcrypt.compare(password, hash, (err, result) => { // Comparing the given password and the actual password of the account.
                if(err) {
                    console.log("Error while comparing passwords: " + err);
                } else {
                    if(result) {
                        res.redirect("/Blogs");
                    } else {
                        user = "";
                        res.render("login.ejs", {ERROR: "Wrong Password!", EMAIL: email});
                    }
                }
            })
        }
    } catch (err) {
        console.log("Some server side error: " + err);
    }
});

app.get("/Blogs", async (req, res) => {
    if(user) {
        const blogs = await db.query("SELECT * FROM blogs ORDER BY id DESC");

        res.render("blogs.ejs", {DATA: blogs.rows, USERNAME: user.username, BUTTON: "My Blogs"}); // Rendering all the blogs in the database.
    } else {
        res.redirect("/login");
    }
});

app.get("/myBlogs", async (req, res) => {
    if(user) {
        const blogs = await db.query("SELECT * FROM blogs WHERE user_id=$1 ORDER BY id DESC", [user.id]); 

        res.render("blogs.ejs", {DATA: blogs.rows, USERNAME: user.username, BUTTON: "Blogs"});// Rendering blogs which has written by the user from database. 
    } else {
        res.redirect("/login");
    }
});

app.get("/logout", (req, res) => {
    user = "";
    res.redirect("/login");
})

// Creating a post.
app.get("/create", (req, res) => { 
    if(user) {
        res.sendFile(__dirname + "/public/new.html");
    } else {
        res.redirect("/login");
    }
    
});

// Evaluating the create post request.
app.post("/create", async (req, res) => {
    const title = req.body.title;
    const content = req.body.content;

    // Adding the post to database.
    await db.query("INSERT INTO blogs (user_id, username, content, title) VALUES ($1, $2, $3, $4)", 
        [user.id, user.username, content, title]
    );

    res.redirect("/Blogs");
});

// Evaluating the edit request.
app.post("/edit", (req, res) => {
    if(user) {
        const title = req.body.title;
        const content = req.body.content;
        const id = req.body.BlogId;

        res.render("edit.ejs", {TITLE: title, CONTENT: content, ID: id});
    } else {
        res.redirect("/login");
    }
})

// Evaluating the edit post request.
app.post("/editPost", async (req, res) => {
    const title = req.body.title;
    const content = req.body.content;
    const id = parseInt(req.body.blogId);
    try {
        await db.query("UPDATE blogs SET content = $1, title = $2 WHERE id = $3;", [content, title, id]); // Changing the post.
        res.redirect("/myBlogs");
    } catch (error) {
        console.log(error);
    }
});

// Deleting a post.
app.post("/delete", async (req, res) => {
    const id = req.body.id;
    try {
        await db.query("DELETE FROM blogs WHERE id = $1", [id]); // Deleting the post from database.

        res.redirect("/myBlogs");
    } catch (error) {
        console.log("Error while deleting blog: " + error);
    }
});

// Catching possible 404 errors.
app.get('*', function(req, res){
    if(user) {
        res.status(404).render("notFound.ejs", {USER: true});
    } else {
    res.status(404).render("notFound.ejs", {USER: false});
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});