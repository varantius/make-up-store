const express = require('express');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const config = require('./config/database');
const { homedir } = require('os');
const bodyParser = require('body-parser');
const session = require('express-session');
var expressValidator = require('express-validator');
const fileUpload = require('express-fileupload');
var passport = require('passport');

var lingua  = require('lingua');

//connect to db
async function startdb() {
    await mongoose.connect(config.database);
}
startdb();
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'Connection error:'));
db.once('open', function() {
    console.log('Connected to MongoDB');
});

//init app
const app = express();

//view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

//set public folder
app.use(express.static(path.join(__dirname,'public')));

// Set global errors variable
app.locals.errors = null;

// Lingua configuration
app.use(lingua(app, {
    defaultLocale: 'uk',
    path: __dirname + '/i18n',
}));

// Get Page Model
var Page = require('./models/page');

// Get all pages to pass to header.ejs
Page.find({}).sort({sorting: 1}).exec(function (err, pages) {
    if (err) {
        console.log(err);
    } else {
        app.locals.pages = pages;
    }
});

// Get Category Model
var Category = require('./models/category');

// Get all categories to pass to header.ejs
Category.find(function (err, categories) {
    if (err) {
        console.log(err);
    } else {
        app.locals.categories = categories;
    }
});

// Express fileUpload middleware
app.use(fileUpload());

//body parser middleware
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))

// parse application/json
app.use(bodyParser.json())

// Express Session middleware
app.use(session({
    secret: 'keyboard cat',
    resave: true,
    saveUninitialized: true
//  cookie: { secure: true }
}));

// Express Validator middleware
app.use(expressValidator({
    errorFormatter: function (param, msg, value) {
        var namespace = param.split('.')
                , root = namespace.shift()
                , formParam = root;

        while (namespace.length) {
            formParam += '[' + namespace.shift() + ']';
        }
        return {
            param: formParam,
            msg: msg,
            value: value
        };
    },
    customValidators: {
        isImage: function (value, filename) {
            var extension = (path.extname(filename)).toLowerCase();
            switch (extension) {
                case '.jpg':
                    return '.jpg';
                case '.jpeg':
                    return '.jpeg';
                case '.png':
                    return '.png';
                case '':
                    return '.jpg';
                default:
                    return false;
            }
        }
    }
}));

//express messages middleware
app.use(require('connect-flash')());
app.use(function (req, res, next) {
  res.locals.messages = require('express-messages')(req, res);
  next();
});

// Passport Config
require('./config/passport')(passport);
// Passport Middleware
app.use(passport.initialize());
app.use(passport.session());

app.get('*', function(req,res,next) {

    res.locals.cart = req.session.cart;
    res.locals.user = req.user || null;
    next();
 });

// Set routes 
var pages = require('./routes/pages.js');
var products = require('./routes/products.js');
var cart = require('./routes/cart.js');
var users = require('./routes/users.js');
var adminPages = require('./routes/admin_pages.js');
var adminCategories = require('./routes/admin_categories.js');
var adminProducts = require('./routes/admin_products.js');
// const {I18n} = require("i18n");

app.use('/admin/pages', adminPages);
app.use('/admin/categories', adminCategories);
app.use('/admin/products', adminProducts);
app.use('/products', products);
app.use('/cart', cart);
app.use('/users', users);
app.use('/', pages);

 //start the server
const port = 3000;
app.listen(port, function() {
    console.log('Server started on port ' + port)
})
