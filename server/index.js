const express = require("express");
const app = express();
const config = require("./config");
const cors = require("cors");
const bodyParser = require("body-parser");
const cookieParser = require('cookie-parser')
const session = require('express-session');

const routes = [
    "users",
    "session",
];

app.use(cors({
    origin: ["http://localhost:3000"],
    methods: ["GET", "POST"],
    credentials: true
}));
 app.use(cookieParser())
app.use(bodyParser.json());

app.use(
    session({
        name: "cookie123",
        key: "userId",
        secret: "randomsecret",
        resave: false,
        saveUninitialized: false,
        cookie: {
            expires: 24 * 60 * 60,
        },
    })
);

    app.use(express.static('public'));

app.get("/", (req, res) => res.send("This is the server page"))

routes.forEach((route) => app.use(`/${route}`, require(`./routes/${route}`)));
//app.use("/users", require("./routes/users"))
app.listen(config.port, () => {
    console.log(`Server listening on port no ${config.port}`);
});