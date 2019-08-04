var express = require('express');
var router = express.Router();
const multer = require('multer');
var faker = require("faker");
var bcrypt = require('bcryptjs');

var globalConfig = require("../globalConfig");
var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, globalConfig.storageLocation);
    },
    filename: function (req, file, cb) {
        let filename = file.originalname.split(',');
        let fileId = faker.random.uuid();
        file['filename'] = fileId + filename[filename.length - 1];
        cb(null, file.filename);
    }
});

var upload = multer({
    storage: storage
});
var autoController = require('../controller/auth.controller');
var dataController = require('../controller/data.controller');
var middleware = require('../services/middleware.service');
/* GET users listing. */
router.get('/', function (req, res, next) {
    res.json({
        result: 'yea it works'
    });
});

router.post('/register', middleware.validatetoken, autoController.register);
router.post('/getsecurityPermission', middleware.validatetoken, autoController.getsecurityPermission);
router.post('/changesecurityPermission', middleware.validatetoken, autoController.changesecurityPermission);
router.post('/login', autoController.login);
router.post('/logout', middleware.validatetoken, autoController.logout);
router.post('/getloggeInUserInfo', autoController.getLoggedInUserInfo);
router.post('/insert', middleware.validatetoken, dataController.insert);
router.post('/update', middleware.validatetoken, dataController.update);
router.post('/delete', middleware.validatetoken, dataController.deleteData);
router.post('/addrelation', middleware.validatetoken, dataController.addRelationData);
router.post('/getrelation', middleware.validatetoken, dataController.getRelationData);
router.post('/getByQuery', middleware.validatetoken, dataController.getDataByQuery);
router.post('/uploadFile', middleware.validatetoken, upload.single('file'), dataController.uploadFile);
router.post('/getFile', middleware.validatetoken, dataController.getFile);
router.post('/deleteFile', middleware.validatetoken, dataController.deleteFile);
router.post('/getFeatures', middleware.validatetoken, dataController.getFeatures);
router.post('/generatePdf', middleware.validatetoken, dataController.generatePdf);
router.post('/updateUserInfo', middleware.validatetoken, dataController.updatePassword);
router.post('/sendMail', middleware.validatetoken, dataController.sendMail);
router.post('/getanonymouseToken', dataController.getanonymousToken);
/**
 * account activation handler
 */
router.post('/accountVerification', (req, res, next) => {
    let key = req.body.verificationKey;
    // var tablename = req.body.table;
    // var data = req.body.data;
    AppCache.get(key, (error, result) => {
        if (error) {
            console.log(error);
            res.status(200).json({
                status: false,
                message: error
            });
        } else {
            if (!result) {
                res.status(200).json({
                    status: false,
                    message: "User activation failed"
                });
            }
            else if(typeof(result) !="string" && result.password =="pending"){
                res.status(200).json({
                    status: false,
                    message: "User is already activated"
                });
            }
            else if (result == "active") {
                res.status(200).json({
                    status: false,
                    message: "User is already activated"
                });
            } else {
                tables[origin]['user'].updateOne({
                        _id: key
                    }, {
                        "active": true
                    },
                    (err, response) => {
                        if (err) {
                            res.status(200).json({
                                status: false,
                                message: "User Activation failed due to error"
                            });
                        }
                        if (response.ok) {
                            AppCache.del(key); // removing the key from cache
                            AppCache.set(key, {
                                password: "pending"
                            }, 60 * globalConfig.activationLinkTimeout); // here 60 means 60 seconds that is 1 minute
                            res.status(200).json({
                                status: true,
                                message: "User Activation succesfull"
                            });
                        }
                    }
                );
            }
        }
    })
});

/**
 * account activation handler
 */
router.post('/setPassword', (req, res, next) => {
    let key = req.body.verificationKey;
    let password = req.body.password;
    // var tablename = req.body.table;
    // var data = req.body.data;
    AppCache.get(key, (error, result) => {
        if (error) {
            console.log(error);
            res.status(500).json({
                status: false,
                message: error
            });
        } else {
            if (!result) {
                res.status(500).json({
                    status: false,
                    message: "Password setting failed"
                });
            } else if (result.password == "pending") {
                bcrypt.genSalt(10, function (err, salt) {
                    bcrypt.hash(password, salt, function (err, hash) {
                        if (!err) {
                            tables[origin]['user'].updateOne({
                                    _id: key
                                }, {
                                    "password": hash
                                },
                                (errr, response) => {
                                    if (errr){
                                        res.status(200).json({
                                            status: false,
                                            message: "Password setting error."
                                        });
                                    }
                                    if (response.ok) {
                                        AppCache.del(key); // removing the key from cache
                                        res.status(200).json({
                                            status: true,
                                            message: "Password setting succesfull"
                                        });
                                    }
                                });
                        }
                    });
                });
            } else {

                res.status(500).json({
                    status: false,
                    message: "Sorry you are not permitted to set password"
                });
            }
        }
    })
});

router.post('/validateToken', middleware.validatetoken, (req, res) => {
    res.status(200).send({
        result: true,
        message: 'Login successfull',
        userInfo: req.userInfo
    });
});
module.exports = router;