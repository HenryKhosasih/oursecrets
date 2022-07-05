const express = require("express");
const ejs = require("ejs");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");

const app = express();
let port = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.set("view engine", "ejs");

mongoose.connect("mongodb://localhost:27017/userDB");

const userSchema = {
	email: String,
	password: String,
};

const User = mongoose.model("User", userSchema);

app.get("/", function (req, res) {
	res.render("home");
});

app.get("/register", function (req, res) {
	res.render("register");
});

app.get("/login", function (req, res) {
	res.render("login");
});

app.post("/register", function (req, res) {
	const newUser = new User({
		email: req.body.username,
		password: req.body.password,
	});

	newUser.save(function (err) {
		if (!err) {
			res.render("secrets");
		} else {
			console.log(err);
		}
	});
});

app.post("/login", function (req, res) {
	const username = req.body.username;
	const password = req.body.password;
	User.findOne({ email: username }, function (err, foundUser) {
		if (!err) {
			if (foundUser && foundUser.password == password) {
				res.render("secrets");
			} else {
				console.log("User not found or wrong password.");
			}
		} else {
			console.log(err);
		}
	});
});

app.listen(port, function () {
	console.log(`OurSecrets app is listening in port ${port}`);
});
