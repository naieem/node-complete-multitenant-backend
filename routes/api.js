var express = require('express');
var router = express.Router();
const multer = require('multer');
var faker = require("faker");

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
router.post('/accountVerification', (req, res,next) => {
    let key = req.body.verificationKey;
    var tablename = req.body.table;
    var data = req.body.data;
    AppCache.get(key, (error, result) => {
        if (error) {
            console.log(error);
            res.status(500).json({
                status: false,
                message: error
            });
        } else {
            if(!result){
                res.status(500).json({
                    status: false,
                    message: "User activation failed"
                }); 
            }
            else if(result =="active"){
                res.status(500).json({
                    status: false,
                    message: "User is already activated"
                }); 
            }else{
                tables[origin][tablename].updateOne({
                    _id: data._id
                  },
                  data,
                  (err, response) => {
                    if (err) return reject(err);
            
                    if (response.ok)
                    res.status(200).json({
                        status: true,
                        itemId: data._id,
                        message: "User Activation succesfull"
                      });
                  }
                );
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