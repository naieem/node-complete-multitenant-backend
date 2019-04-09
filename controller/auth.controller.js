var bcrypt = require('bcryptjs');
var faker = require('faker');
var authService = require('../services/auth.service');
var _ = require('lodash');
module.exports = {
    register: register,
    login: login,
    getLoggedInUserInfo: getLoggedInUserInfo,
    logout: logout,
    getsecurityPermission: getsecurityPermission,
    changesecurityPermission: changesecurityPermission
}

/**
 * Register new user
 * @param {*} req
 * @param {*} res
 */
function register(req, res) {
    let roles = req.body.roles;
    let roleFound = false;
    if (req.body.roles && req.body.roles.length) {
        tables[origin]['role'].find((err, allroles) => {
            if (!err) {

                roles.forEach(role => {
                    let roli = _.find(allroles, function(o) {
                        return o.rolename == role;
                    });
                    if (roli)
                        roleFound = true;
                    else
                        roleFound = false;
                });
                if (roleFound) {
                    tables[origin]['rolemap'].find({
                        $and: [{
                            rolename: {
                                $in: roles
                            }
                        }, {
                            parents: {
                                $in: req.userInfo.roles
                            }
                        }]
                    }, (error, hierarchy) => {

                        if (!error) {
                            if (hierarchy && hierarchy.length) {
                                doUserRegistration(req, res);
                            } else {
                                sendErrorMessage(res, "Rolemap not found for " + req.userInfo.roles);
                            }
                        } else {
                            sendErrorMessage(res, error);
                        }
                    });
                } else {
                    sendErrorMessage(res, "Expected Role not Found");
                }
            } else {
                sendErrorMessage(res, err);
            }
        });
    }

}
/**
 * Start user registration after all the checking that user role map is ok for registration
 * @param {*} req
 * @param {*} res
 */
function doUserRegistration(req, res) {
    var userId = faker
        .random
        .uuid();
    req.body.created_at = new Date();
    req.body._id = userId;
    bcrypt.genSalt(10, function(err, salt) {
        bcrypt
            .hash(req.body.password, salt, function(err, hash) {
                req.body.password = hash;
                var userInfo = req.body;
                req.body.personInfo['_id'] = faker.random.uuid();
                req.body.personInfo['user_id'] = userId;
                req.body.personInfo['roles'] = req.body.roles;
                authService
                    .register(userInfo, req.body.personInfo, req)
                    .then(function(result) {
                        res
                            .status(200)
                            .send(result);
                    })
                    .catch(function(error) {
                        res
                            .status(500)
                            .send(error);
                    });
            });
    });
}
/**
 * sending error response for all functions
 * @param {*} response
 * @param {*} message
 */
function sendErrorMessage(response, message) {
    response
        .status(200)
        .send({ status: false, message: message });
}
/**
 * logged in users
 * @param {*} req
 * @param {*} res
 */
function login(req, res) {
    authService
        .login(req.body.username, req.body.password)
        .then(function(result) {
            res
                .status(200)
                .send(result);
        })
        .catch(function(err) {
            res
                .status(500)
                .send(err);
        });
}
/**
 * get logged in users information
 * @param {*} req
 * @param {*} res
 */
function getLoggedInUserInfo(req, res) {
    authService
        .getLoggedInUserInfo(req)
        .then(function(result) {

            res
                .status(200)
                .send({ status: true, data: result });
        })
        .catch(function(error) {
            res
                .status(403)
                .send(error);
        });
}

/**
 * function to call on logout endpoint call
 * @param {*} req
 * @param {*} res
 */
function logout(req, res) {
    authService
        .logout(req)
        .then((result) => {
            res
                .status(200)
                .send(result);
        })
        .catch((err) => {
            res
                .status(500)
                .send(err);
        });
}
/**
 * getting the security permission information
 * @param {*} req 
 * @param {*} res 
 */
function getsecurityPermission(req, res) {
    authService.getsecurityPermission(req).then((result) => {
        res.status(200).send(result);
    }).catch((err) => {
        res.status(200).send(err);
    });
}
/**
 * changing security permission information
 * @param {*} req 
 * @param {*} res 
 */
function changesecurityPermission(req, res) {
    authService.changesecurityPermission(req).then((result) => {
        res.status(200).send(result);
    }).catch((err) => {
        res.status(200).send(err);
    });
}