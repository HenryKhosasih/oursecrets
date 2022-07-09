require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require("mongoose-find-or-create");

const app = express();
let port = 3000;

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));

app.use(
	session({
		secret: process.env.ENCRYPTION_STRING,
		resave: false,
		saveUninitialized: false,
		cookie: { maxAge: 86400 }, // 1 day
	})
);

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/userDB");

const userSchema = new mongoose.Schema({
	username: String,
	password: String,
	googleId: String,
	secrets: [String],
});

// hashing and salting in mongodb
userSchema.plugin(passportLocalMongoose);
// create if not found
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

// simplified Passport/Passport-Local Configuration
passport.use(User.createStrategy());
// use static serialize and deserialize of model for passport session support
passport.serializeUser(function (user, done) {
	done(null, user.id);
});
passport.deserializeUser(function (id, done) {
	User.findById(id, function (err, user) {
		done(err, user);
	});
});

passport.use(
	new GoogleStrategy(
		{
			clientID: process.env.CLIENT_ID,
			clientSecret: process.env.CLIENT_SECRET,
			callbackURL: "http://localhost:3000/auth/google/secrets",
			userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
		},
		function (accessToken, refreshToken, profile, cb) {
			console.log(profile);
			User.findOrCreate({ googleId: profile.id }, function (err, user) {
				return cb(err, user);
			});
		}
	)
);

app.get("/", function (req, res) {
	res.render("home");
});

app.get(
	"/auth/google",
	// google authentication
	passport.authenticate("google", { scope: ["profile"] })
);

app.get(
	"/auth/google/secrets",
	// local authentication
	passport.authenticate("google", { failureRedirect: "/login" }),
	function (req, res) {
		res.redirect("/secrets");
	}
);

app.get("/register", function (req, res) {
	res.render("register");
});

app.get("/login", function (req, res) {
	res.render("login");
});

app.get("/secrets", function (req, res) {
	User.find({ secrets: { $ne: null } }, function (err, foundUsers) {
		if (err) {
			console.log(err);
		} else {
			res.render("secrets", { usersWithSecrets: foundUsers });
		}
	});
});

app.get("/submit", function (req, res) {
	if (req.isAuthenticated()) {
		res.render("submit");
	} else {
		res.redirect("/login");
	}
});

app.get("/logout", function (req, res) {
	req.logout(function (err) {
		if (err) {
			return next(err);
		}
		res.redirect("/");
	});
});

app.post("/register", function (req, res) {
	User.register(
		{ username: req.body.username },
		req.body.password,
		function (err, user) {
			if (err) {
				console.log(err);
				res.redirect("/register");
			} else {
				passport.authenticate("local")(req, res, function () {
					res.redirect("/secrets");
				});
			}
		}
	);
});

app.post("/login", function (req, res) {
	const user = new User({
		username: req.body.username,
		password: req.body.password,
	});

	req.login(user, function (err) {
		if (err) {
			console.log(err);
		} else {
			passport.authenticate("local")(req, res, function () {
				res.redirect("/secrets");
			});
		}
	});
});

app.post("/submit", function (req, res) {
	const submittedSecret = req.body.secret;
	User.updateOne(
		{ _id: req.user.id },
		{ $push: { secrets: submittedSecret } },
		function (err) {
			if (err) {
				console.log(err);
			} else {
				res.redirect("/secrets");
			}
		}
	);
});

app.use((req, res, next) => {
	res.status(404).render("notfound");
});

app.listen(port, function () {
	console.log(`OurSecrets app is listening in port ${port}`);
});
