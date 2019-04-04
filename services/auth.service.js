var bcrypt = require('bcryptjs');
var jwt = require('jsonwebtoken');
var globalConfig = require('../globalConfig');
var personModel = require('../tables/core/person.table');
var tokenStorage = require('./tokenStorage.service');
var secret = '751d88b0-e5e2-4627-90e5-06839eff73b0';
var tokenExpiryTime = globalConfig.tokenExpiryTime * 60; //  minute

module.exports = {
    register: register,
    login: login,
    getLoggedInUserInfo: getLoggedInUserInfo,
    validateToken: validateToken,
    logout: logout
}

/**
 * registering new user to the database
 * creating user table information first and then adding information to the person table
 * @param {*} userInfo
 * @param {*} personInfo
 */
function register(userInfo, personInfo) {
    return new Promise(function(resolve, reject) {
        findUserByEmail(userInfo.username)
            .then(function(response) {
                if (response) {
                    resolve({ status: false, message: 'user already exists with this username' });
                } else {
                    tables[origin]['user']
                        .create(userInfo, function(err, result) {
                            if (err)
                                reject(err);
                            else {
                                tables[origin]['person'].create(personInfo, function(error, personInfo) {
                                    if (error)
                                        reject(error);
                                    else {
                                        resolve({
                                            status: true,
                                            result: personInfo
                                        });
                                    }
                                });
                            }
                        });
                }
            })
            .catch(function(error) {
                reject(error);
            });
    });
}
/**
 * login user according to given criteria
 * @param {*} criteria {username,password}
 */
function login(username, password) {
    var userCriteria = {
        username: username
    }
    return new Promise(function(resolve, reject) {
        tables[origin]['user']
            .find(userCriteria, function(err, docs) {
                if (err)
                    reject(err);
                if (docs && docs.length) {
                    bcrypt
                        .compare(password, docs[0].password, function(errr, res) {
                            if (errr)
                                reject(errr);
                            if (res) {
                                tables[origin]['person']
                                    .find({
                                        user_id: docs[0]._id
                                    }, function(error, personData) {
                                        if (personData && personData.length) {
                                            resolve({
                                                token: generateToken(personData[0]),
                                                personInfo: personData[0]
                                            });
                                        } else {
                                            resolve({ status: false, message: 'no person found with this user' });
                                        }
                                    });
                            } else {
                                resolve({ status: false, message: 'sorry username or password did not match' });
                            }
                        });
                } else {
                    resolve({ status: false, message: 'sorry user found with your given criteria' });
                }
            })
    });
}

function generateToken(personData) {
    var payload = {
        personId: personData._id,
        userId: personData.user_id,
        roles: personData.roles
    }
    return jwt.sign(payload, secret, {
        expiresIn: tokenExpiryTime // expires in 5 mins
    });
}
/**
 * find user by username into user table
 * @param {*} username
 */
function findUserByEmail(username) {
    return new Promise(function(resolve, reject) {
        var criteria = {
            username: username
        }
        tables[origin]['user'].find(criteria, function(err, docs) {
            if (err)
                reject(err);
            if (docs && docs.length)
                resolve(true);
            resolve(false);
        });
    });
}

/**
 * get logged in users information
 * @param {*} req
 * @param {*} res
 */
function getLoggedInUserInfo(request) {
    return new Promise(function(resolve, reject) {

        validateToken(request.headers.authorization)
            .then(function(result) {
                if (result) {

                    tables[origin]['person']
                        .find({
                            _id: result.personId
                        }, function(error, personInfo) {
                            if (error)
                                reject(error);
                            resolve(personInfo[0]);
                        });
                }
            })
            .catch(function(err) {

                reject({ status: false, message: 'You are not authorized to see this information' });
            });
    });
}

function validateToken(token) {
    return new Promise(function(resolve, reject) {
        jwt
            .verify(token, secret, function(err, decoded) {
                if (err)
                    reject(err);
                resolve(decoded);
            });
    });
}

function logout(request) {
    return new Promise((resolve, reject) => {
        if (request.headers && request.headers.authorization) {
            tokenStorage.storeExpiredToken(request.headers.authorization);
            resolve({
                status: true,
                message: 'logout successfull'
            });
        } else {
            reject({
                status: false
            });
        }
    });
}